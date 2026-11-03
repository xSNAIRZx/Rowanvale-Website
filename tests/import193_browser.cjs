"use strict";
const { chromium } = require("./browser-runtime.cjs"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const K = "mindforge.momentum.data",
  out = path.resolve(__dirname, "../docs/evidence/19.3.0");
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.ROWANVALE_BROWSER ||
      "C:/Program Files/Google/Chrome/Application/chrome.exe",
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    });
    await context.route("https://**/*", (r) => r.abort());
    const page = await context.newPage(),
      errors = [],
      checks = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    const saved = () =>
        page.evaluate((k) => JSON.parse(localStorage.getItem(k)), K),
      nav = (view) =>
        page.evaluate(
          (view) =>
            document
              .querySelector('.nav-item[data-view="' + view + '"]')
              .click(),
          view,
        ),
      upload = (items) =>
        page.locator("#libraryFile").setInputFiles({
          name: "library.json",
          mimeType: "application/json",
          buffer: Buffer.from(
            JSON.stringify({ format: "vytron-personal-library", items }),
          ),
        });
    await page.goto(process.env.ROWANVALE_TEST_URL || "http://localhost:8290");
    await page.locator("#authSkipIntro").click();
    await page.evaluate((k) => {
      const d = JSON.parse(localStorage.getItem(k));
      d.settings.online185.automaticArtwork = false;
      d.settings.coverArtwork1861 = { enabled: false };
      d.backlog = [
        {
          id: "b1",
          type: "Book",
          title: "Shared Title",
          status: "On Hold",
          metadata184: { author: "One", isbn: "9781234567890" },
        },
        {
          id: "m1",
          type: "Movie",
          title: "Shared Title",
          status: "Want to Try",
        },
      ];
      localStorage.setItem(k, JSON.stringify(d));
    }, K);
    await page.reload();
    await nav("media");
    await page.keyboard.press("Control+k");
    await page.locator("#commandSearch").fill("Books Directory");
    assert.match(
      await page.locator("#commandResults").innerText(),
      /Books Directory/,
    );
    await page.locator("#commandSearch").fill("Shared Title");
    assert.match(await page.locator("#commandResults").innerText(), /BOOK/);
    await page
      .locator("#commandResults button")
      .filter({ hasText: "BOOK" })
      .click();
    assert.match(
      await page.locator("#living-dialog").innerText(),
      /Shared Title/,
    );
    await page.locator("#living-dialog [data-close]").first().click();
    checks.push(
      "Global search includes new routes and opens exact typed saved item",
    );
    const items = [
      {
        type: "Book",
        title: "Shared Title",
        status: "On Hold",
        metadata184: { author: "One", isbn: "9781234567891" },
      },
      { type: "Movie", title: "Shared Title", status: "Dropped" },
      { type: "Anime", title: "Offline Series", status: "Dropped" },
    ];
    const before = await saved();
    await upload(items);
    await page.locator(".import193-dialog").waitFor();
    assert.equal(await page.locator('[data-row="1"]').inputValue(), "skip");
    await page.locator('[data-i193="close"]').first().click();
    assert.deepEqual(await saved(), before);
    checks.push(
      "Cancel review changes nothing; possible duplicates default to skip",
    );
    await upload(items);
    await page.locator('[data-i193="apply"]').click();
    await page.locator(".import193-dialog").waitFor({ state: "detached" });
    let state = await saved();
    assert.equal(state.backlog.length, 4);
    assert.equal(
      state.backlog.find((x) => x.title === "Offline Series").status,
      "Dropped",
    );
    assert.equal(state.backlog.find((x) => x.id === "b1").status, "On Hold");
    assert.equal(state.xp, before.xp);
    checks.push(
      "Different edition and dropped anime added, existing records and XP preserved",
    );
    await upload(items);
    assert.equal(await page.locator('[data-i193="apply"]').isDisabled(), true);
    await page.locator('[data-i193="close"]').first().click();
    checks.push("Same file reimport is idempotent by default");
    await page.locator('[data-import193="undo"]').click();
    assert.equal((await saved()).backlog.length, 2);
    checks.push("Undo removes only added titles");
    await upload([
      { title: "Retained draft", type: "Game", status: "Backlog" },
    ]);
    const committed = await saved();
    await page.evaluate(() => {
      window.savedSet = Storage.prototype.setItem;
      Storage.prototype.setItem = function () {
        throw Error("QuotaExceededError");
      };
    });
    await page.locator('[data-i193="apply"]').click();
    assert.match(
      await page.locator("#import193-error").innerText(),
      /could not be saved/,
    );
    assert.deepEqual(await saved(), committed);
    await page.evaluate(() => (Storage.prototype.setItem = window.savedSet));
    await page.locator('[data-i193="apply"]').click();
    assert.equal((await saved()).backlog.length, 3);
    checks.push(
      "Failed save retains review, rolls back all data, then retries once",
    );
    await page.reload();
    await nav("media");
    await page.locator('[data-import193="undo"]').click();
    assert.equal((await saved()).backlog.length, 2);
    checks.push("Undo survives reload");
    await page
      .locator("#libraryFile")
      .setInputFiles({
        name: "watchlist.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          "Date,Name,Year,Letterboxd URI\n2026-01-01,Unwatched Film,2020,https://letterboxd.com/film/example/",
        ),
      });
    assert.match(
      await page.locator(".import193-rows").innerText(),
      /Want to Try/,
    );
    await page.locator('[data-i193="apply"]').click();
    await page.reload();
    await nav("media");
    assert.equal(
      (await saved()).backlog.find((x) => x.title === "Unwatched Film").watch
        .year,
      2020,
    );
    await page.locator('[data-import193="undo"]').click();
    assert.equal((await saved()).backlog.length, 2);
    checks.push(
      "Real CSV watchlist import remains planned, carries metadata and undoes after reload",
    );
    await upload([
      { title: "Invalid", type: "Book", book: "bad", rating: 999 },
    ]);
    assert.equal(await page.locator(".import193-dialog").count(), 0);
    assert.equal((await saved()).backlog.length, 2);
    checks.push(
      "Malformed nested JSON rejected before review without data changes",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await upload(items);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 2,
      ),
    );
    assert.ok(
      await page
        .locator(".import193-dialog")
        .evaluate((e) => e.scrollWidth <= e.clientWidth + 2),
    );
    await page.screenshot({ path: path.join(out, "import-review-mobile.png") });
    checks.push("Import review fits390px");
    assert.deepEqual(errors, []);
    checks.push("No page errors");
    fs.writeFileSync(
      path.join(out, "import-results.json"),
      JSON.stringify({ date: new Date().toISOString(), checks }, null, 2),
    );
    console.log(checks.length + " import/search browser checks passed");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
