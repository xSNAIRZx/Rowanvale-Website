/* Rowanvale public entry point.
 *
 * The desktop build runs on app/server.js (node:http + node:fs). That process cannot
 * run on Workers, but almost everything it serves is a static file, so this Worker
 * hands those straight to the asset binding and keeps only the small differences:
 *
 *  - /api/*  the Node server proxies RAWG, Open Food Facts, artwork caching and
 *            metadata lookups from a local process with local disk. There is no
 *            equivalent here and no API key is configured, so these answer 503 in
 *            the same shape the client already handles when the sources are down.
 *            Every collection, journal and profile stays in the browser.
 *  - /sw.js and /version.json must never be served from an HTTP cache, otherwise a
 *    fleet of browsers can pin an old service worker to the new deployment.
 */

const NO_STORE_PATHS = new Set(['/sw.js', '/version.json']);

const json = (status, body) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });

function withNoStore(response) {
  const headers = new Headers(response.headers);
  headers.set('cache-control', 'no-store, must-revalidate');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
      return json(503, {
        error:
          'Live data services are not part of this public build. Your games, journals and profile stay in this browser.',
        offline: true,
      });
    }

    const response = await env.ASSETS.fetch(request);

    if (NO_STORE_PATHS.has(url.pathname) && response.ok) {
      return withNoStore(response);
    }

    return response;
  },
};
