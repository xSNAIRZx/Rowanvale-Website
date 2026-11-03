/* Regression guard for the "site can't be reached" report.
 *
 * A returning browser that holds a redirected or failed ./index.html in the app-shell
 * cache used to replay it for every navigation, which Chrome renders as
 * net::ERR_FAILED with no network error. This serves dist/, plants exactly those bad
 * cache entries and checks that navigation still reaches the real page.
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..', 'dist');
const PORT = 8327;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
  const relative = url === '/' ? 'index.html' : url.replace(/^\/+/, '');
  const file = path.join(ROOT, relative);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[path.extname(file)] || 'application/octet-stream',
    'cache-control': 'no-cache',
  });
  fs.createReadStream(file).pipe(res);
});

const results = [];
const check = async (name, fn) => {
  try {
    await fn();
    results.push({ name, pass: true });
    console.log(`PASS ${name}`);
  } catch (error) {
    results.push({ name, pass: false, error: error.message });
    console.log(`FAIL ${name} — ${error.message}`);
  }
};

const ORIGIN = `http://127.0.0.1:${PORT}/`;

(async () => {
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.ROWANVALE_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    const failures = [];
    page.on('requestfailed', request => failures.push(`${request.url()} ${request.failure()?.errorText}`));

    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
      if (!navigator.serviceWorker.controller) {
        await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
      }
    });

    const poisoned = async kind => page.evaluate(async kind => {
      const names = await caches.keys();
      const shell = names.find(name => name.startsWith('hearthbyte-play-connect-reset-'));
      if (!shell) throw new Error('no app-shell cache registered');
      const cache = await caches.open(shell);
      const response =
        kind === 'redirect' ? Response.redirect(location.origin + '/', 307) : new Response('boom', { status: 500 });
      await cache.put('./index.html', response);
      return { shell, status: response.status, ok: response.ok };
    }, kind);

    await check('shell cache present before poisoning', async () => {
      const names = await page.evaluate(() => caches.keys());
      if (!names.some(name => name.startsWith('hearthbyte-play-connect-reset-'))) {
        throw new Error(`no shell cache: ${JSON.stringify(names)}`);
      }
    });

    await check('navigation survives a redirected cached shell', async () => {
      const planted = await poisoned('redirect');
      if (planted.ok) throw new Error('poison entry should not be ok');
      await page.reload({ waitUntil: 'domcontentloaded' });
      const title = await page.title();
      if (!/rowanvale/i.test(title)) throw new Error(`reload landed on ${JSON.stringify(page.url())} (${title})`);
    });

    await check('navigation survives an error cached shell', async () => {
      const planted = await poisoned('error');
      if (planted.ok) throw new Error('poison entry should not be ok');
      await page.reload({ waitUntil: 'domcontentloaded' });
      const title = await page.title();
      if (!/rowanvale/i.test(title)) throw new Error(`reload landed on ${JSON.stringify(page.url())} (${title})`);
    });

    await check('no failed navigation requests recorded', async () => {
      const navigations = failures.filter(entry => !/favicon/.test(entry));
      if (navigations.length) throw new Error(navigations.join(', '));
    });

    await check('navigation still renders with the network offline', async () => {
      await page.evaluate(async () => {
        await navigator.serviceWorker.ready;
      });
      await context.setOffline(true);
      try {
        await page.reload({ waitUntil: 'domcontentloaded' });
        if (!/rowanvale/i.test(await page.title())) throw new Error('offline reload did not render the cached shell');
      } finally {
        await context.setOffline(false);
      }
    });

    await check('shell repaired after the guard ran', async () => {
      await page.evaluate(async () => {
        const names = await caches.keys();
        const shell = names.find(name => name.startsWith('hearthbyte-play-connect-reset-'));
        const cache = await caches.open(shell);
        await cache.delete('./index.html');
        await cache.add('./index.html');
      });
      await page.reload({ waitUntil: 'domcontentloaded' });
      if (!/rowanvale/i.test(await page.title())) throw new Error('repaired reload failed');
    });
  } finally {
    await browser.close();
    server.close();
  }
  const failed = results.filter(result => !result.pass);
  console.log(JSON.stringify({ total: results.length, passed: results.length - failed.length, failed: failed.length }));
  process.exit(failed.length ? 1 : 0);
})();
