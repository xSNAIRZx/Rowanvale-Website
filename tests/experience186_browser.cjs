"use strict";
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict"),
  { chromium } = require("./browser-runtime.cjs");
const ROOT = path.resolve(__dirname, ".."),
  OUT = require("./evidence-path.cjs").dir,
  BASE = process.env.ROWANVALE_TEST_URL || "http://localhost:8186",
  K = "mindforge.momentum.data";
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({
      executablePath: process.env.ROWANVALE_BROWSER || undefined,
      headless: true,
    }),
    results = [],
    errors = [];
  let context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    }),
    page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.route("https://**/*", (r) => r.abort());
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await check("The new sign-in presentation fits a small phone", async () => {
    await page.setViewportSize({ width: 320, height: 850 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 2,
      ),
      false,
    );
    assert.match(
      await page.locator("#authTitle").innerText(),
      /A life in stories/,
    );
    await page.screenshot({
      path: path.join(OUT, "sign-in-mobile.png"),
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
  });
  await check(
    "The complete three-step onboarding creates and restores a named local workspace",
    async () => {
      await page.locator("#authGetStarted").click();
      await page.locator("#onboardName").fill("QA Rowan");
      await page.locator("#onboardTagline").fill("A world of my own.");
      await page.locator("#authWizardNext").click();
      await page.locator("#onboardReduceMotion").check();
      await page.locator("#authWizardNext").click();
      await page.locator("#authWizardFinish").click();
      await page.waitForFunction(() =>
        document.body.classList.contains("signed-in"),
      );
      assert.equal(
        (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), K))
          .profile.name,
        "QA Rowan",
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      assert.equal(
        (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)), K))
          .profile.name,
        "QA Rowan",
      );
    },
  );
  await page.evaluate(() => {
    RVConnect.pause();
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: "domcontentloaded" });
  await page.locator("#authSkipIntro").click();
  await page.evaluate((k) => {
    const d = JSON.parse(localStorage.getItem(k));
    d.settings.online185 = { automaticArtwork: false, autoSync: false };
    localStorage.setItem(k, JSON.stringify(d));
  }, K);
  await page.reload({ waitUntil: "domcontentloaded" });
  async function check(name, fn) {
    try {
      await fn();
      results.push({ name, pass: true });
      console.log("PASS " + name);
    } catch (e) {
      await page.screenshot({
        path: path.join(OUT, "experience-failure.png"),
        fullPage: true,
      });
      throw e;
    }
  }
  const nav = async (id) =>
      page.evaluate(
        (id) =>
          document.querySelector('.nav-item[data-view="' + id + '"]').click(),
        id,
      ),
    saved = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), K);
  const routes = {
    myday: "My Day",
    dashboard: "Overview",
    media: "Games & Media",
    discover: "Discover Games",
    backlog: "Game Collection",
    books: "Books Directory",
    watch: "Watch Room",
    fan: "Fan Lounge",
    quests: "Quests",
    fitness: "Movement",
    focus: "Quiet Room",
    wellness: "Reset Studio",
    resources: "Offline Guides",
    clubhouse: "Clubhouse",
    friends: "Friends",
    connections: "Connections",
    space: "Your Orbit",
    customize: "Settings",
    safety: "Backups & Data",
    updates: "Help & Updates",
  };
  for (const [id, label] of Object.entries(routes))
    await check("Route and title: " + label, async () => {
      await nav(id);
      assert.equal(await page.title(), label + " · Rowanvale " + require("./evidence-path.cjs").version);
      assert.equal(
        await page
          .locator('.nav-item[data-view="' + id + '"] .nav-label')
          .textContent(),
        label,
      );
      assert.ok((await page.locator("#viewRoot").innerText()).length > 50);
      assert.ok(await page.locator("#viewRoot h1,#viewRoot h2").count());
    });
  for (const width of [320, 768, 1440])
    await check(
      "Every destination fits a " + width + "px viewport",
      async () => {
        await page.setViewportSize({ width, height: 1000 });
        for (const id of Object.keys(routes)) {
          await nav(id);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 2,
            ),
            false,
            id + " overflow",
          );
        }
        await nav("wellness");
        await page.screenshot({
          path: path.join(OUT, "reset-" + width + ".png"),
          fullPage: true,
        });
      },
    );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await nav("wellness");
  await check(
    "All six Reset Studio areas preserve their working tools",
    async () => {
      for (const id of [
        "today",
        "rest",
        "ground",
        "reflect",
        "tools",
        "history",
      ]) {
        await page
          .locator(".reset186-tabs [data-reset=tab][data-id=" + id + "]")
          .click();
        assert.ok(
          (await page.locator(".reset186-body").innerText()).length > 60,
          id,
        );
      }
      await page.locator(".reset186-tabs [data-id=reflect]").click();
      assert.equal(await page.locator("#reflectionText").count(), 1);
      assert.equal(await page.locator("#resetPlanHard").count(), 1);
      await page.locator(".reset186-tabs [data-id=ground]").click();
      assert.equal(await page.locator(".body-scan-card").count(), 1);
    },
  );
  await check(
    "Reflection drafts survive section changes and save to existing private records",
    async () => {
      await page.locator(".reset186-tabs [data-id=reflect]").click();
      await page.locator("#reflectionText").fill("PRIVATE RESET QA NOTE");
      await page.locator(".reset186-tabs [data-id=today]").click();
      await page.locator(".reset186-tabs [data-id=reflect]").click();
      assert.equal(
        await page.locator("#reflectionText").inputValue(),
        "PRIVATE RESET QA NOTE",
      );
      await page.locator("[data-action=save-reflection]").click();
      assert.ok(
        (await saved()).reflections.some(
          (x) => x.text === "PRIVATE RESET QA NOTE",
        ),
      );
    },
  );
  await check(
    "Guided grounding permits skipped senses and saves exactly once",
    async () => {
      await page.locator(".reset186-tabs [data-id=ground]").click();
      await page
        .locator(".reset186-body [data-reset=open][data-id=ground]")
        .click();
      await page.locator("#reset186-session [data-reset=ground-skip]").click();
      for (let i = 0; i < 4; i++)
        await page
          .locator("#reset186-session [data-reset=ground-next]")
          .click();
      assert.match(
        await page.locator("#reset186-ground").innerText(),
        /4 of five senses/,
      );
      const before = (await saved()).wellnessSessions.length;
      await page.locator("[data-reset=ground-save]").click();
      assert.equal((await saved()).wellnessSessions.length, before + 1);
      assert.equal(await page.locator("#reset186-session").count(), 0);
    },
  );
  await check(
    "The guided reset dialog fits a phone, traps keyboard focus and respects reduced motion",
    async () => {
      await page.locator(".reset186-tabs [data-id=today]").click();
      await page.setViewportSize({ width: 320, height: 850 });
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.locator("[data-reset=open][data-id=rest]").click();
      assert.equal(
        await page
          .locator("#reset186-session")
          .evaluate((el) => el.scrollWidth > el.clientWidth + 2),
        false,
      );
      for (let i = 0; i < 8; i++) {
        await page.keyboard.press("Tab");
        assert.equal(
          await page
            .locator("#reset186-session")
            .evaluate((el) => el.contains(document.activeElement)),
          true,
        );
      }
      assert.equal(
        await page
          .locator(".reset186-breath")
          .evaluate((el) => getComputedStyle(el).transitionDuration),
        "0s",
      );
      await page.screenshot({
        path: path.join(OUT, "reset-session-mobile.png"),
      });
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#reset186-session").count(), 0);
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.emulateMedia({ reducedMotion: "no-preference" });
    },
  );
  await page.clock.install({ time: new Date("2026-10-25T23:00:00Z") });
  await check(
    "Breathing sessions start, pause, resume and finish using elapsed time",
    async () => {
      await page.locator(".reset186-tabs [data-id=today]").click();
      await page.locator('[data-reset=length][data-id="1"]').click();
      await page.locator("[data-reset=open][data-id=breathe]").click();
      assert.equal(
        await page.locator("[data-reset-duration]").inputValue(),
        "60",
      );
      assert.equal(await page.locator("[data-reset-sound]").isChecked(), false);
      await page.locator("[data-reset=toggle]").click();
      await page.clock.fastForward(10000);
      await page.locator("[data-reset=toggle]").click();
      const left = await page.locator("[data-reset-clock]").textContent();
      await page.clock.fastForward(20000);
      assert.equal(
        await page.locator("[data-reset-clock]").textContent(),
        left,
      );
      await page.locator("[data-reset=toggle]").click();
      await page.clock.fastForward(60000);
      assert.equal(await page.locator("[data-reset=save]").isVisible(), true);
      assert.equal(
        await page.evaluate(() => RVReset.session().status),
        "complete",
      );
      await page.screenshot({
        path: path.join(OUT, "reset-session-desktop.png"),
      });
    },
  );
  await check(
    "A failed care-session save preserves the completed session for retry",
    async () => {
      await page.evaluate((k) => {
        window.qaStorageSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (key === k) throw Error("QA quota");
          return window.qaStorageSet.call(this, key, value);
        };
      }, K);
      await page.locator("[data-reset=save]").click();
      assert.equal(await page.locator("#reset186-session[open]").count(), 1);
      assert.match(
        await page.locator("[data-reset-status]").textContent(),
        /Could not save/,
      );
      await page.evaluate(
        () => (Storage.prototype.setItem = window.qaStorageSet),
      );
      const before = (await saved()).wellnessSessions.length;
      await page.locator("[data-reset=save]").click();
      assert.equal((await saved()).wellnessSessions.length, before + 1);
    },
  );
  await check(
    "Screen rest survives closing and reload without resuming automatically",
    async () => {
      await page.locator("[data-reset=open][data-id=rest]").click();
      await page.locator("[data-reset=toggle]").click();
      await page.clock.fastForward(10000);
      await page.locator("#reset186-session [data-reset=close]").click();
      await page.reload({ waitUntil: "domcontentloaded" });
      await nav("wellness");
      assert.equal(
        await page.evaluate(() => RVReset.session().status),
        "paused",
      );
      await page.locator("[data-reset=resume]").click();
      assert.equal(
        await page.locator("[data-reset=toggle]").textContent(),
        "Resume",
      );
      await page.locator("#reset186-session [data-reset=close]").click();
    },
  );
  await check(
    "Discovery trails open a reviewable real title without silently adding it",
    async () => {
      await nav("media");
      await page.locator("[data-living=tab][data-id=explore]").click();
      assert.equal(await page.locator(".rv186-trail").count(), 3);
      const before = (await saved()).backlog.length;
      await page.locator('[data-exp-trail="2"]').click();
      assert.equal(
        await page.locator("#living-edit-form [name=title]").inputValue(),
        "The Blue Castle",
      );
      assert.equal(
        await page.locator("#living-edit-form [name=author]").inputValue(),
        "L. M. Montgomery",
      );
      assert.equal((await saved()).backlog.length, before);
      await page.keyboard.press("Escape");
    },
  );
  await check(
    "Three sourced book additions appear in the actual Books Directory",
    async () => {
      await nav("books");
      for (const title of [
        "The Blue Castle",
        "The Book of Tea",
        "The Enchanted April",
      ]) {
        await page.locator("#media-book-query").fill(title);
        await page.waitForTimeout(120);
        assert.ok(
          (await page.locator("#media-book-results").innerText()).includes(
            title,
          ),
        );
      }
    },
  );
  for (const mode of ["light", "dark", "system"])
    await check(
      "Reset Studio and Personal Atlas support " + mode + " appearance",
      async () => {
        await page.evaluate(
          ({ K, mode }) => {
            const d = JSON.parse(localStorage.getItem(K));
            d.settings.appearanceMode = mode;
            localStorage.setItem(K, JSON.stringify(d));
          },
          { K, mode },
        );
        await page.reload({ waitUntil: "domcontentloaded" });
        for (const id of ["space", "wellness"]) {
          await nav(id);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 2,
            ),
            false,
          );
          assert.equal(
            await page
              .locator(id === "space" ? ".rvp-atlas" : ".reset186")
              .count(),
            1,
          );
        }
        await page.screenshot({
          path: path.join(OUT, "reset-" + mode + ".png"),
        });
      },
    );
  await context.close();
  context = await browser.newContext({
    // This fixture tests visible-title priority, not a fixed library-header height.
    // Smart Shelf controls add space above the grid in Beta 19. Keep the first
    // card inside the viewport; otherwise auto-featured book 0 correctly wins
    // over nearby (off-screen) book 40.
    viewport: { width: 1440, height: 1600 },
    serviceWorkers: "block",
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  const requests = [],
    png = fs.readFileSync(path.join(ROOT, "app/assets/icon-192.png"));
  await page.route("https://**/*", (r) =>
    r.fulfill({ body: png, contentType: "image/png" }),
  );
  const providers = [
    {
      name: "Open Library",
      ready: true,
      kinds: ["Book"],
      reachability: "Reachable",
    },
  ];
  await page.route("**/api/metadata/status", (r) =>
    r.fulfill({ json: { providers } }),
  );
  await page.route("**/api/connectivity", async (r) => {
    await new Promise((ok) => setTimeout(ok, 6000));
    try {
      await r.fulfill({ json: { providers } });
    } catch {}
  });
  await page.route("**/api/metadata/search?**", async (r) => {
    const title = new URL(r.request().url()).searchParams.get("q");
    requests.push({ title, at: Date.now() });
    await r.fulfill({
      json: {
        results: [
          {
            title,
            type: "Book",
            author: "QA Author",
            year: 2000,
            provider: "Open Library",
            description: "A verified-response fixture synopsis.",
            artwork:
              "https://covers.openlibrary.org/b/id/100-L.jpg?default=false",
          },
        ],
      },
    });
  });
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator("#authSkipIntro").click();
  await page.evaluate((k) => {
    const d = JSON.parse(localStorage.getItem(k));
    d.backlog = Array.from({ length: 41 }, (_, i) => ({
      id: "priority-" + i,
      title: "Priority book " + i,
      type: "Book",
      status: "Want to Try",
      createdAt: new Date(Date.UTC(2026, 9, 25, 0, i)).toISOString(),
      book: { author: "QA Author", year: 2000 },
      metadata184: { author: "QA Author", year: 2000 },
    }));
    d.settings.online185 = { automaticArtwork: true, autoSync: false };
    d.settings.rv18 = { ...d.settings.rv18, startView: "media" };
    localStorage.setItem(k, JSON.stringify(d));
    localStorage.setItem(
      "rowanvale.enrichment185.limits",
      JSON.stringify({ start: Date.now(), used: 12 }),
    );
    localStorage.removeItem("rowanvale.enrichment185");
  }, K);
  requests.length = 0;
  await page.reload({ waitUntil: "domcontentloaded" });
  await check(
    "Visible artwork starts before slow probes and despite an exhausted bulk budget",
    async () => {
      assert.ok(
        await page.locator('[data-item="priority-40"]').evaluate((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.top < innerHeight &&
            r.bottom > 0 &&
            r.left < innerWidth &&
            r.right > 0
          );
        }),
        "Priority book 40 must actually be visible for this queue-priority fixture",
      );
      await page.waitForFunction(
        () => RVConnect.snapshot().artwork.firstRequestMs !== null,
        {},
        { timeout: 5000 },
      );
      assert.ok(
        (await page.evaluate(
          () => RVConnect.snapshot().artwork.firstRequestMs,
        )) < 2500,
      );
      assert.equal(requests[0].title, "Priority book 40");
      await page.waitForFunction(
        (k) =>
          JSON.parse(localStorage.getItem(k)).backlog.find(
            (x) => x.id === "priority-40",
          ).metadata184.artwork,
        K,
      );
    },
  );
  await check(
    "Arriving cover art patches the existing page without replacing its root",
    async () => {
      await page.evaluate(() => {
        window.qaMediaRoot = document.querySelector(".living184");
      });
      await page.waitForFunction(() =>
        document
          .querySelector('[data-item="priority-40"] .living-cover img')
          ?.getAttribute("src")
          ?.includes("covers.openlibrary.org"),
      );
      assert.equal(
        await page.evaluate(
          () => window.qaMediaRoot === document.querySelector(".living184"),
        ),
        true,
      );
      await page.screenshot({ path: path.join(OUT, "artwork-priority.png") });
    },
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(OUT, "experience-browser-results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        results,
        errors,
        artwork: {
          firstRequestMs: await page.evaluate(
            () => RVConnect.snapshot().artwork.firstRequestMs,
          ),
          requests: requests.slice(0, 10),
        },
      },
      null,
      2,
    ),
  );
  await context.close();
  await browser.close();
  console.log(results.length + " whole-app and 18.6 browser workflows passed.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
