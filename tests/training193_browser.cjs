"use strict";
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { chromium } = require("./browser-runtime.cjs");
const BASE = process.env.ROWANVALE_TEST_URL || "http://localhost:8193",
  K = "mindforge.momentum.data";
const SHOTS = path.resolve(__dirname, "../docs/evidence/19.3.0");
fs.mkdirSync(SHOTS, { recursive: true });
(async () => {
  const browser = await chromium.launch({
      executablePath: process.env.ROWANVALE_BROWSER || undefined,
      headless: true,
    }),
    results = [],
    errors = [];
  try {
    const c = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 1440, height: 1000 },
    });
    await c.route("https://**/*", (r) => r.abort());
    const p = await c.newPage();
    p.setDefaultTimeout(12000);
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept());
    const saved = () =>
        p.evaluate((k) => JSON.parse(localStorage.getItem(k)), K),
      go = () =>
        p.evaluate(() =>
          document.querySelector(".nav-item[data-view=fitness]").click(),
        ),
      click = (a) =>
        p
          .locator('[data-training="' + a + '"]')
          .first()
          .click();
    const check = async (name, fn) => {
      await fn();
      results.push({ name, pass: true });
      console.log("PASS " + name);
    };
    await p.goto(BASE);
    await p.locator("#authSkipIntro").click();
    await go();
    await check(
      "Structured draft autosaves individual sets and resumes after reload",
      async () => {
        await click("start");
        await click("add-exercise");
        await p.locator("[data-training-field=name]").fill("Dumbbell row");
        await p.locator("[data-training-field=weight]").fill("20");
        await p.locator("[data-training-field=reps]").fill("8");
        await p.locator("[data-training-field=done]").check();
        const set = (await saved()).training193.draft.exercises[0].sets[0];
        assert.equal(set.weightKg, 20);
        assert.equal(set.reps, 8);
        assert.equal(set.done, true);
        assert.ok((await saved()).training193.draft.restUntil > Date.now());
        await p.reload();
        await go();
        assert.equal(
          await p.locator("[data-training-field=name]").inputValue(),
          "Dumbbell row",
        );
        assert.equal(
          await p.locator("[data-training-field=done]").isChecked(),
          true,
        );
      },
    );
    await check(
      "Units retain canonical weight and optional rest can be skipped",
      async () => {
        await p.locator("[data-training-setting=unit]").selectOption("lb");
        assert.equal(
          await p.locator("[data-training-field=weight]").inputValue(),
          "44.09",
        );
        assert.equal(
          (await saved()).training193.draft.exercises[0].sets[0].weightKg,
          20,
        );
        await click("skip-rest");
        assert.equal((await saved()).training193.draft.restUntil, 0);
        await p.locator("[data-training-setting=unit]").selectOption("kg");
      },
    );
    await check(
      "Failed autosave keeps saved bytes intact and supports explicit retry",
      async () => {
        const before = await p.evaluate((k) => localStorage.getItem(k), K);
        await p.evaluate((k) => {
          const set = Storage.prototype.setItem;
          window.restoreTrainingStorage = () =>
            (Storage.prototype.setItem = set);
          Storage.prototype.setItem = function (key, value) {
            if (key === k)
              throw new DOMException("Quota", "QuotaExceededError");
            return set.call(this, key, value);
          };
        }, K);
        await p
          .locator("[data-training-field=title]")
          .fill("My recovered session");
        assert.equal(
          await p.evaluate((k) => localStorage.getItem(k), K),
          before,
        );
        assert.match(
          await p.locator("[data-training-status]").innerText(),
          /Not saved/,
        );
        assert.equal(
          await p.locator("[data-training-field=title]").inputValue(),
          "My recovered session",
        );
        await p.evaluate(() => window.restoreTrainingStorage());
        await click("retry");
        assert.equal(
          (await saved()).training193.draft.title,
          "My recovered session",
        );
      },
    );
    await check(
      "Finish saves once, updates history and creates reusable structured routines",
      async () => {
        await p.locator("#trainingMinutes").fill("12");
        await click("finish");
        let d = await saved();
        assert.equal(d.training193.draft, null);
        assert.equal(d.fitnessLogs.filter((x) => x.training193).length, 1);
        assert.equal(d.fitnessLogs[0].training193.exercises[0].sets[0].reps, 8);
        await p.reload();
        await go();
        assert.equal(
          (await saved()).fitnessLogs.filter((x) => x.training193).length,
          1,
        );
        await click("save-routine");
        assert.equal((await saved()).training193.routines.length, 1);
        await click("routine");
        assert.equal(
          await p.locator("[data-training-field=done]").isChecked(),
          false,
        );
        assert.match(
          await p.locator(".training-previous").innerText(),
          /20 kg × 8 reps/,
        );
        await p.locator("[data-training-field=reps]").fill("10");
        await p.locator("[data-training-field=done]").check();
        await p.locator("#trainingMinutes").fill("12");
        await click("finish");
        await p.locator(".training-progression summary").click();
        assert.match(
          await p.locator(".training-progression").innerText(),
          /2 recorded sessions/,
        );
        await p
          .locator("#training193")
          .screenshot({ path: path.join(SHOTS, "training193-history.png") });
      },
    );
    await check("Structured workout layout fits a 320px viewport", async () => {
      await p.setViewportSize({ width: 320, height: 900 });
      await click("start");
      await click("add-exercise");
      assert.equal(
        await p.evaluate(
          () => document.documentElement.scrollWidth > innerWidth + 2,
        ),
        false,
      );
      await p
        .locator("#training193")
        .screenshot({ path: path.join(SHOTS, "training193-mobile.png") });
      await click("discard");
      await p.setViewportSize({ width: 1440, height: 1000 });
    });
    await check(
      "Unsaved draft cannot overwrite another tab and can reload the saved replacement",
      async () => {
        await click("start");
        await p.evaluate((k) => {
          const set = Storage.prototype.setItem;
          window.restoreTrainingStorage = () =>
            (Storage.prototype.setItem = set);
          Storage.prototype.setItem = function (key, value) {
            if (key === k)
              throw new DOMException("Quota", "QuotaExceededError");
            return set.call(this, key, value);
          };
        }, K);
        await p
          .locator("[data-training-field=title]")
          .fill("Unsaved local title");
        await p.evaluate(() => window.restoreTrainingStorage());
        const second = await c.newPage();
        await second.goto(BASE);
        await second.evaluate((k) => {
          const d = JSON.parse(localStorage.getItem(k));
          d.training193.draft.title = "Saved from second tab";
          localStorage.setItem(k, JSON.stringify(d));
        }, K);
        await p.waitForFunction(
          () =>
            JSON.parse(localStorage.getItem("mindforge.momentum.data"))
              .training193.draft.title === "Saved from second tab",
        );
        await click("retry");
        assert.match(
          await p.locator("[data-training-status]").innerText(),
          /changed in another tab/,
        );
        assert.equal(
          (await saved()).training193.draft.title,
          "Saved from second tab",
        );
        await click("reload");
        assert.equal(
          await p.locator("[data-training-field=title]").inputValue(),
          "Saved from second tab",
        );
        await click("discard");
        await second.close();
      },
    );
    await check(
      "Repeat always copies the visible dated session and remains after filtering",
      async () => {
        await p.evaluate((k) => {
          const d = JSON.parse(localStorage.getItem(k));
          d.fitnessLogs = [
            {
              id: "older",
              title: "Backdated walk",
              activity: "Walking",
              minutes: 15,
              date: "2026-10-20T12:00:00Z",
            },
            {
              id: "newer",
              title: "Recent strength",
              activity: "Strength",
              minutes: 20,
              date: "2026-10-30T12:00:00Z",
            },
          ];
          localStorage.setItem(k, JSON.stringify(d));
        }, K);
        await p.reload();
        await go();
        const first = p.locator(".fitness-log-row").first();
        assert.equal(
          await first
            .locator("[data-action=rv162-fitness-repeat]")
            .getAttribute("data-id"),
          "newer",
        );
        await first.locator("[data-action=rv162-fitness-repeat]").click();
        assert.equal((await saved()).fitnessLogs[0].title, "Recent strength");
        await p.locator("#rvFitnessHistoryFilter").selectOption("Walking");
        assert.equal(
          await p
            .locator("[data-action=rv162-fitness-repeat]")
            .getAttribute("data-id"),
          "older",
        );
      },
    );
    await check(
      "Adding at former movement, food, water, routine and recipe limits never drops existing records",
      async () => {
        await p.evaluate((k) => {
          const d = JSON.parse(localStorage.getItem(k));
          d.fitnessLogs = Array.from({ length: 500 }, (_, i) => ({
            id: "old-" + i,
            title: "Old " + i,
            activity: "Walking",
            minutes: 15,
            date: "2026-10-20T12:00:00Z",
          }));
          d.foodLogs = Array.from({ length: 2000 }, (_, i) => ({
            id: "food-" + i,
            name: "Old food",
            day: "2000-01-01",
            servings: 1,
            calories: 1,
          }));
          d.waterLogs = Array.from({ length: 2000 }, (_, i) => ({
            id: "water-" + i,
            day: "2000-01-01",
            ml: 250,
          }));
          d.savedRecipes = Array.from({ length: 100 }, (_, i) => ({
            id: "recipe-" + i,
            title: "Old recipe " + i,
            ingredients: [],
            instructions: "Keep me",
          }));
          d.workoutPlans = Array.from({ length: 80 }, (_, i) => ({
            id: "plan-" + i,
            name: "Plan " + i,
            moves: "Keep these notes",
          }));
          localStorage.setItem(k, JSON.stringify(d));
        }, K);
        await p.reload();
        await go();
        await p
          .locator("[data-action=fitness-log-open]")
          .filter({ visible: true })
          .first()
          .click();
        await p.locator("#fitnessTitle").fill("At capacity");
        await p.locator("#fitnessLogForm [type=submit]").click();
        assert.equal((await saved()).fitnessLogs.length, 501);
        assert.ok((await saved()).fitnessLogs.some((x) => x.id === "old-499"));
        await p.locator('[data-action=water-add][data-amount="250"]').click();
        assert.equal((await saved()).waterLogs.length, 2001);
        await p.locator("[data-action=food-open]").click();
        await p.locator("#foodName").fill("Still retained");
        await p.locator("#foodLogForm [type=submit]").click();
        assert.equal((await saved()).foodLogs.length, 2001);
        await p.locator("[data-action=plan-open]").click();
        await p.locator("#planName").fill("New plan");
        await p.locator("#planMoves").fill("New notes");
        await p.locator("#workoutPlanForm [type=submit]").click();
        assert.equal((await saved()).workoutPlans.length, 81);
        await c.route("**/api/recipes?*", (r) =>
          r.fulfill({
            json: {
              results: [
                {
                  id: "new-recipe",
                  title: "New recipe",
                  ingredients: ["beans"],
                  instructions: "Cook thoroughly",
                  url: "https://www.themealdb.com/",
                },
              ],
              source: "Test fixture",
            },
          }),
        );
        await p.locator("#recipeQuery").fill("beans");
        await p.locator("#recipeSearchForm [type=submit]").click();
        await p
          .locator('[data-action=recipe-save][data-id="new-recipe"]')
          .click();
        assert.equal((await saved()).savedRecipes.length, 101);
        assert.ok(
          (await saved()).savedRecipes.some((x) => x.id === "recipe-99"),
        );
      },
    );
    await check(
      "Unknown barcode nutrients remain unknown and direct food edits keep the same record",
      async () => {
        await c.route("**/api/barcode?*", (r) =>
          r.fulfill({
            json: {
              found: true,
              product: {
                name: "Partial label",
                per100g: { calories: 100, protein: null, carbs: 20, fat: null },
              },
            },
          }),
        );
        await p.locator("[data-action=barcode-open]").click();
        await p.locator("#barcodeCode").fill("1234567890123");
        await p.locator("#barcodeForm [type=submit]").click();
        await p.locator("#foodLogDialog[open]").waitFor();
        assert.equal(await p.locator("#foodProtein").inputValue(), "");
        await p.locator("#foodServings").fill("2");
        await p.locator("#foodLogForm [type=submit]").click();
        let food = (await saved()).foodLogs.find(
          (x) => x.name === "Partial label",
        );
        assert.equal(food.calories, 200);
        assert.equal(food.protein, null);
        const id = food.id;
        await p
          .locator('[data-action=food-edit][data-id="' + id + '"]')
          .click();
        await p.locator("#foodServings").fill("3");
        await p.locator("#foodLogForm [type=submit]").click();
        food = (await saved()).foodLogs.find((x) => x.id === id);
        assert.equal(food.calories, 300);
        assert.equal(food.protein, null);
        assert.equal(
          (await saved()).foodLogs.filter((x) => x.id === id).length,
          1,
        );
        assert.match(
          await p.locator(".hb-nutri-summary").innerText(),
          /Known subtotal/,
        );
      },
    );
    await check(
      "Workout draft resumes and finishes with the network and local server unreachable",
      async () => {
        const offline = await browser.newContext();
        await offline.route("https://**/*", (r) => r.abort());
        const q = await offline.newPage();
        q.on("pageerror", (e) => errors.push(e.message));
        q.on("dialog", (d) => d.accept());
        await q.goto(BASE);
        await q.locator("#authSkipIntro").click();
        await q.evaluate(async () => {
          await navigator.serviceWorker.ready;
          if (!navigator.serviceWorker.controller)
            await new Promise((r) =>
              navigator.serviceWorker.addEventListener("controllerchange", r, {
                once: true,
              }),
            );
        });
        await q.evaluate(() =>
          document.querySelector(".nav-item[data-view=fitness]").click(),
        );
        await q.locator("[data-training=start]").click();
        await q.locator("[data-training=add-exercise]").click();
        await q.locator("[data-training-field=name]").fill("Timed stretch");
        await q.locator("[data-training-field=seconds]").fill("30");
        await q.locator("[data-training-field=done]").check();
        await offline.setOffline(true);
        await q.reload({ waitUntil: "domcontentloaded" });
        await q.evaluate(() =>
          document.querySelector(".nav-item[data-view=fitness]").click(),
        );
        assert.equal(
          await q.locator("[data-training-field=seconds]").inputValue(),
          "30",
        );
        await q.locator("#trainingMinutes").fill("5");
        await q.locator("[data-training=finish]").click();
        assert.equal(
          await q.evaluate(
            (k) =>
              JSON.parse(localStorage.getItem(k)).fitnessLogs.filter(
                (x) => x.training193,
              ).length,
            K,
          ),
          1,
        );
        await offline.close();
      },
    );
    assert.deepEqual(errors, []);
    const out = path.resolve(__dirname, "../docs/evidence/19.3.0");
    fs.mkdirSync(out, { recursive: true });
    await go();
    await p.screenshot({
      path: path.join(out, "training193-desktop.png"),
      fullPage: true,
    });
    fs.writeFileSync(
      path.join(out, "training193-results.json"),
      JSON.stringify(
        { date: new Date().toISOString(), results, errors },
        null,
        2,
      ),
    );
    await c.close();
    console.log(results.length + " training and nutrition workflows passed.");
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
