"use strict";
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict"),
  { chromium } = require(process.env.ROWANVALE_PLAYWRIGHT || "playwright");
const BASE = process.env.ROWANVALE_TEST_URL || "http://localhost:8188",
  ROOT = path.resolve(__dirname, ".."),
  K = "mindforge.momentum.data",
  OUT = require("./evidence-path.cjs").dir;
(async () => {
  const b = await chromium.launch({
      executablePath: process.env.ROWANVALE_BROWSER || undefined,
      headless: true,
    }),
    c = await b.newContext({ viewport: { width: 1200, height: 900 } }),
    p = await c.newPage();
  const old = fs.readFileSync(
    path.join(ROOT, "tests/fixtures/sw186.js"),
    "utf8",
  );
  await c.route("**/sw.js", (r) =>
    r.fulfill({ body: old, contentType: "application/javascript" }),
  );
  await p.goto(BASE);
  await p.locator("#authSkipIntro").click();
  await p.evaluate(async (k) => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((r) =>
        navigator.serviceWorker.addEventListener("controllerchange", r, {
          once: true,
        }),
      );
    const d = JSON.parse(localStorage.getItem(k));
    d.profile.bio = "KEEP MY EXISTING BIO";
    d.settings.coverArtwork1861 = { enabled: false };
    d.settings.online185 = { automaticArtwork: false, autoSync: false };
    localStorage.setItem(k, JSON.stringify(d));
    const name = (await caches.keys()).find((x) =>
      x.includes("v18.6.0-rowanvale"),
    );
    if (!name) throw Error("Old app worker was not installed");
    const cache = await caches.open(name);
    await cache.put(
      new URL("./index.html", location.href),
      new Response(
        "<html><head><title>STALE ROWANVALE SHELL</title></head><body>Old cached shell</body></html>",
        { headers: { "Content-Type": "text/html" } },
      ),
    );
    const user = await caches.open("user-private-cache-probe");
    await user.put("/user-cache-probe", new Response("keep"));
  }, K);
  await p.reload();
  assert.equal(await p.title(), "STALE ROWANVALE SHELL");
  await c.unroute("**/sw.js");
  await p.goto(BASE + "/api/launch");
  await p.waitForURL("**/index.html?build=" + require("./evidence-path.cjs").version);
  await p.waitForFunction(() => document.body.classList.contains("signed-in"));
  assert.match(await p.title(), /19\.3\.0/);
  assert.equal(
    await p.evaluate((k) => JSON.parse(localStorage.getItem(k)).profile.bio, K),
    "KEEP MY EXISTING BIO",
  );
  assert.equal(await p.evaluate(() => typeof RVCovers), "object");
  assert.equal(
    await p.evaluate(async () =>
      (await caches.keys()).includes("user-private-cache-probe"),
    ),
    true,
  );
  fs.writeFileSync(
    path.join(OUT, "launch-upgrade-results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks: [
          {
            name: "A stale 18.6 service-worker shell is bypassed by the new launcher while saved profile data and unrelated caches survive",
            pass: true,
          },
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS stale-shell upgrade preserves saved workspace and opens the current build",
  );
  await c.close();
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
