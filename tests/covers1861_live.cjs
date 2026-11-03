"use strict";
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict"),
  { chromium } = require(process.env.ROWANVALE_PLAYWRIGHT || "playwright");
const BASE = process.env.ROWANVALE_TEST_URL || "http://localhost:8188",
  ROOT = path.resolve(__dirname, ".."),
  OUT = require("./evidence-path.cjs").dir,
  K = "mindforge.momentum.data";
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const b = await chromium.launch({
      executablePath: process.env.ROWANVALE_BROWSER || undefined,
      headless: true,
    }),
    c = await b.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    }),
    p = await c.newPage(),
    errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  await p.goto(BASE + "/api/launch", { waitUntil: "domcontentloaded" });
  await p.waitForURL("**/index.html?build=" + require("./evidence-path.cjs").version);
  await p.locator("#authSkipIntro").click();
  await p.evaluate((k) => {
    const d = JSON.parse(localStorage.getItem(k));
    d.settings.coverArtwork1861 = { enabled: true };
    d.settings.online185 = { automaticArtwork: false, autoSync: false };
    d.settings.rv18 = { ...d.settings.rv18, startView: "media" };
    d.backlog = [
      {
        id: "real-game",
        type: "Game",
        title: "Celeste",
        metadata184: { year: 2018 },
      },
      {
        id: "real-film",
        type: "Movie",
        title: "Spirited Away",
        metadata184: { year: 2001 },
      },
      {
        id: "real-anime",
        type: "Anime",
        title: "Cowboy Bebop",
        metadata184: { year: 1998 },
      },
      {
        id: "real-tv",
        type: "Show",
        title: "Breaking Bad",
        metadata184: { year: 2008 },
      },
      {
        id: "real-book",
        type: "Book",
        title: "Pride and Prejudice",
        book: { author: "Jane Austen", year: 1813 },
      },
    ].map((x) => ({ ...x, status: "Want to Try" }));
    localStorage.setItem(k, JSON.stringify(d));
  }, K);
  await p.reload({ waitUntil: "domcontentloaded" });
  await p.evaluate(() =>
    document.querySelector(".nav-item[data-view=media]").click(),
  );
  const checks = [];
  for (const id of [
    "real-game",
    "real-film",
    "real-anime",
    "real-tv",
    "real-book",
  ]) {
    const node = p.locator("[data-item=" + id + "] [data-rv-cover]");
    await node.scrollIntoViewIfNeeded();
    await p.waitForFunction(
      (id) => {
        const i = document.querySelector(
          "[data-item=" + id + "] [data-rv-cover] img",
        );
        return i?.complete && i.naturalWidth > 0 && !i.hidden;
      },
      id,
      { timeout: 65000 },
    );
    checks.push(
      await node.evaluate((el, id) => {
        const i = el.querySelector("img");
        return {
          id,
          pass: true,
          src: i.src,
          width: i.naturalWidth,
          height: i.naturalHeight,
          credit: el.querySelector(".rv-cover-credit")?.href,
        };
      }, id),
    );
  }
  await p.evaluate(() => scrollTo(0, 0));
  await p.screenshot({
    path: path.join(OUT, "live-five-format-artwork.png"),
    fullPage: true,
  });
  assert.deepEqual(errors, []);
  const data = await p.evaluate((k) => JSON.parse(localStorage.getItem(k)), K);
  for (const x of data.backlog) assert.ok(x.metadata184.artworkSourceUrl);
  fs.writeFileSync(
    path.join(OUT, "live-covers-results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        version: require("./evidence-path.cjs").version,
        checks,
        errors,
        mode: "Genuine internet provider responses and genuine image pixels; no provider or image mocks. No TMDB/IGDB keys, no manual artwork search, metadata backfill disabled.",
      },
      null,
      2,
    ),
  );
  console.log(JSON.stringify(checks, null, 2));
  await c.close();
  await b.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
