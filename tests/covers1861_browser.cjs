"use strict";
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict"),
  { chromium } = require(process.env.ROWANVALE_PLAYWRIGHT || "playwright");
const ROOT = path.resolve(__dirname, ".."),
  OUT = path.join(ROOT, "docs/evidence/19.3.0"),
  BASE = process.env.ROWANVALE_TEST_URL || "http://localhost:8188",
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
    checks = [],
    errors = [],
    requests = [];
  p.setDefaultTimeout(18000);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  await c.route("https://**/*", (r) =>
    r.fulfill({
      body: fs.readFileSync(path.join(ROOT, "app/assets/icon-192.png")),
      contentType: "image/png",
    }),
  );
  let pending = false;
  await c.route("**/api/artwork/resolve", (r) => {
    const input = r.request().postDataJSON();
    requests.push(input.items);
    return r.fulfill({
      json: {
        results: input.items.map((x) => ({
          state: pending ? "pending" : "ready",
          artwork: pending
            ? undefined
            : "https://upload.wikimedia.org/wikipedia/en/test/" +
              encodeURIComponent(x.title) +
              "_cover.png",
          sourceUrl:
            "https://en.wikipedia.org/wiki/" + encodeURIComponent(x.title),
          fileUrl:
            "https://en.wikipedia.org/wiki/File:" +
            encodeURIComponent(x.title) +
            "_cover.png",
          provider: "Wikipedia cover/poster",
          attribution:
            "QA controlled cover response; original rights retained.",
          cacheAllowed: false,
        })),
      },
    });
  });
  await p.goto(BASE, { waitUntil: "domcontentloaded" });
  await p.locator("#authSkipIntro").click();
  const nav = (id) =>
      p.evaluate(
        (id) =>
          document.querySelector(".nav-item[data-view=" + id + "]").click(),
        id,
      ),
    saved = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), K);
  async function check(name, fn) {
    try {
      await fn();
      checks.push({ name, pass: true });
      console.log("PASS " + name);
    } catch (e) {
      await p.screenshot({
        path: path.join(OUT, "covers-failure.png"),
        fullPage: true,
      });
      throw e;
    }
  }
  async function hasImage(selector) {
    const box = p.locator(selector).first();
    await box.scrollIntoViewIfNeeded();
    await p.waitForFunction(
      (sel) =>
        [...document.querySelectorAll(sel + " img")].some(
          (i) => i.complete && i.naturalWidth > 0 && !i.hidden,
        ),
      selector,
    );
  }
  await check(
    "Opening Discover automatically loads unsaved game covers without saving or clicking lookup",
    async () => {
      await nav("discover");
      await hasImage(".game-card [data-rv-cover]");
      assert.equal((await saved()).backlog.length, 0);
      assert.ok(requests.flat().some((x) => x.type === "Game"));
    },
  );
  await check(
    "Opening Books Directory loads actual images for entries without a cover ID",
    async () => {
      await nav("books");
      await hasImage(".media-book-art[data-rv-cover]");
      assert.equal((await saved()).backlog.length, 0);
      assert.ok(requests.flat().some((x) => x.type === "Book"));
    },
  );
  for (const type of ["Movie", "Show", "Anime"])
    await check(
      "Fan Lounge automatically loads unsaved " +
        type +
        " artwork on category changes",
      async () => {
        await nav("fan");
        await p.locator("#fan-format").selectOption(type);
        await hasImage(".fan-cover[data-rv-cover]");
        assert.equal((await saved()).backlog.length, 0);
        assert.ok(requests.flat().some((x) => x.type === type));
      },
    );
  await check(
    "All five saved formats receive persisted covers and credits without metadata credentials",
    async () => {
      await p.evaluate((k) => {
        const d = JSON.parse(localStorage.getItem(k));
        d.backlog = ["Game", "Book", "Movie", "Show", "Anime"].map(
          (type, i) => ({
            id: "covers-" + i,
            type,
            title: "Saved " + type,
            status: "Want to Try",
            note: "PRIVATE REVIEW TOKEN SECRET",
            metadata184: { year: 2001 },
            ...(type === "Book"
              ? { book: { author: "QA Author", year: 2001 } }
              : {}),
          }),
        );
        d.settings.coverArtwork1861 = { enabled: true };
        d.settings.online185 = { automaticArtwork: false, autoSync: false };
        localStorage.setItem(k, JSON.stringify(d));
      }, K);
      await p.reload({ waitUntil: "domcontentloaded" });
      await nav("media");
      await p.waitForFunction(
        (k) =>
          JSON.parse(localStorage.getItem(k)).backlog.every(
            (x) => x.metadata184.artwork && x.metadata184.artworkSourceUrl,
          ),
        K,
      );
      assert.equal((await saved()).xp, 0);
      assert.equal(JSON.stringify(requests).includes("PRIVATE REVIEW"), false);
      assert.equal(JSON.stringify(requests).includes("TOKEN SECRET"), false);
    },
  );
  await check(
    "The same saved covers render in Your Orbit and the legacy Watch Room and game gallery",
    async () => {
      for (const [id, selector] of [
        ["space", ".rvp-art[data-rv-cover]"],
        ["watch", ".watch-poster[data-rv-cover]"],
        ["backlog", ".rv172-art[data-rv-cover]"],
      ]) {
        await nav(id);
        await hasImage(selector);
      }
      await nav("books");
      await p.locator("#media-book-query").fill("Saved Book");
      await hasImage(".media-book-art[data-rv-cover]");
    },
  );
  await check(
    "Saved cover URLs survive reload and display without another resolver request",
    async () => {
      await nav("media");
      await p.waitForTimeout(400);
      const before = requests.length;
      await p.reload({ waitUntil: "domcontentloaded" });
      await nav("media");
      await hasImage(".living-cover[data-rv-cover]");
      await p.waitForTimeout(500);
      assert.equal(requests.length, before);
    },
  );
  await check(
    "Disabling automatic covers persists and prevents new title lookups",
    async () => {
      await p.evaluate(() => RVConnect.open());
      await p.locator("#rvc-preferences [name=automaticCovers]").uncheck();
      await p.locator("#rvc-preferences [type=submit]").click();
      await p.locator("[data-rvc=close]").click();
      const before = requests.length;
      await p.evaluate((k) => {
        const d = JSON.parse(localStorage.getItem(k));
        d.backlog.unshift({
          id: "off",
          type: "Movie",
          title: "A not-yet-looked-up title",
          status: "Want to Try",
        });
        localStorage.setItem(k, JSON.stringify(d));
      }, K);
      await p.reload({ waitUntil: "domcontentloaded" });
      await nav("media");
      await p.waitForTimeout(1000);
      assert.equal(requests.length, before);
      assert.equal((await saved()).settings.coverArtwork1861.enabled, false);
    },
  );
  await check(
    "Re-enabling covers starts the pending page lookup without refreshing",
    async () => {
      await p.evaluate(() => RVConnect.open());
      await p.locator("#rvc-preferences [name=automaticCovers]").check();
      await p.locator("#rvc-preferences [type=submit]").click();
      await p.locator("[data-rvc=close]").click();
      await p.waitForFunction(
        (k) =>
          !!JSON.parse(localStorage.getItem(k)).backlog.find(
            (x) => x.id === "off",
          ).metadata184?.artwork,
        K,
      );
    },
  );
  await check(
    "Protected custom artwork and deliberate removal never trigger automatic replacements",
    async () => {
      const art =
        "data:image/png;base64," +
        fs
          .readFileSync(path.join(ROOT, "app/assets/icon-192.png"))
          .toString("base64");
      await p.evaluate(
        ({ K, art }) => {
          const d = JSON.parse(localStorage.getItem(K));
          d.backlog.unshift(
            {
              id: "custom",
              type: "Movie",
              title: "Custom protected title",
              metadata184: { manualFields: ["artwork"], artwork: art },
            },
            {
              id: "removed",
              type: "Game",
              title: "Intentionally empty cover",
              metadata184: { manualFields: ["artwork"], artwork: "" },
            },
          );
          localStorage.setItem(K, JSON.stringify(d));
        },
        { K, art },
      );
      await p.reload({ waitUntil: "domcontentloaded" });
      await nav("media");
      await p.waitForTimeout(700);
      assert.ok(
        (await saved()).backlog
          .find((x) => x.id === "custom")
          .metadata184.artwork.startsWith("data:image/"),
      );
      assert.equal(
        (await saved()).backlog.find((x) => x.id === "removed").metadata184
          .artwork,
        "",
      );
      assert.equal(
        requests
          .flat()
          .some((x) =>
            ["Custom protected title", "Intentionally empty cover"].includes(
              x.title,
            ),
          ),
        false,
      );
    },
  );
  await check(
    "Pending secondary-source results are polled and displayed automatically",
    async () => {
      pending = true;
      await p.evaluate((k) => {
        const d = JSON.parse(localStorage.getItem(k));
        d.backlog.unshift({
          id: "pending",
          type: "Show",
          title: "Secondary-source fixture",
        });
        localStorage.setItem(k, JSON.stringify(d));
      }, K);
      await p.reload({ waitUntil: "domcontentloaded" });
      await nav("media");
      await p.waitForFunction(() =>
        document.querySelector(
          "[data-item=pending] [data-cover-state-message]",
        ),
      );
      await p.waitForTimeout(600);
      pending = false;
      await p.waitForFunction(
        (k) =>
          !!JSON.parse(localStorage.getItem(k)).backlog.find(
            (x) => x.id === "pending",
          ).metadata184?.artwork,
        K,
      );
      await hasImage("[data-item=pending] [data-rv-cover]");
    },
  );
  await check(
    "A returning internet connection resumes covers without duplicate saved records",
    async () => {
      await c.setOffline(true);
      await p.evaluate(() =>
        RVLiving.draftStory({ type: "Movie", title: "Offline cover fixture" }),
      );
      await p.locator("#living-edit-form [type=submit]").click();
      const before = (await saved()).backlog.length;
      await c.setOffline(false);
      await p.waitForFunction(
        (k) =>
          !!JSON.parse(localStorage.getItem(k)).backlog.find(
            (x) => x.title === "Offline cover fixture",
          ).metadata184?.artwork,
        K,
      );
      assert.equal((await saved()).backlog.length, before);
    },
  );
  await check(
    "Broken pre-existing saved and unsaved cover URLs automatically fall through to the resolver",
    async () => {
      await c.route(
        "https://covers.openlibrary.org/b/id/999999991-L.jpg**",
        (r) => r.fulfill({ status: 404, body: "missing" }),
      );
      await p.evaluate((k) => {
        const d = JSON.parse(localStorage.getItem(k));
        d.backlog.unshift({
          id: "broken-old",
          type: "Book",
          title: "Broken old saved cover",
          book: { coverId: 999999991 },
        });
        localStorage.setItem(k, JSON.stringify(d));
      }, K);
      await p.reload({ waitUntil: "domcontentloaded" });
      await nav("media");
      await hasImage("[data-item=broken-old] [data-rv-cover]");
      await p.waitForFunction(
        (k) =>
          JSON.parse(localStorage.getItem(k))
            .backlog.find((x) => x.id === "broken-old")
            .metadata184?.artwork?.includes("upload.wikimedia.org"),
        K,
      );
      await p.evaluate(() => {
        const x = {
          type: "Book",
          title: "Broken old unsaved cover",
          coverId: 999999991,
        };
        document
          .getElementById("viewRoot")
          .insertAdjacentHTML(
            "afterbegin",
            `<div id="broken-unsaved" style="height:240px;width:180px;position:relative" ${RVCovers.mark(x)}><img src="${RVCovers.source(x)}"></div>`,
          );
        RVCovers.mount();
      });
      await hasImage("#broken-unsaved");
      assert.ok(
        requests.flat().some((x) => x.title === "Broken old unsaved cover"),
      );
      assert.equal(
        (await saved()).backlog.filter(
          (x) => x.title === "Broken old unsaved cover",
        ).length,
        0,
      );
    },
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(OUT, "covers-browser-results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks,
        errors,
        networkRequests: requests.length,
        note: "Controlled provider/image responses. Genuine live image checks are recorded separately.",
      },
      null,
      2,
    ),
  );
  await c.close();
  await b.close();
  console.log(checks.length + " automatic-cover browser workflows passed.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
