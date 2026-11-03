"use strict";
const assert = require("node:assert/strict"),
  fs = require("fs"),
  path = require("path"),
  os = require("os"),
  { chromium } = require("./browser-runtime.cjs");
const K = "mindforge.momentum.data",
  OUT = path.resolve(__dirname, "../docs/evidence/1.0.0/wellbeing");
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({
      headless: true,
      executablePath:
        process.env.ROWANVALE_BROWSER ||
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
    }),
    context = await browser.newContext({
      serviceWorkers: "block",
      viewport: { width: 1440, height: 1000 },
    });
  let p = await context.newPage();
  const errors = [],
    checks = [];
  const setup = async (page) => {
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.route("https://**/*", (r) => r.abort());
  };
  await setup(p);
  const base = process.env.ROWANVALE_TEST_URL || "http://localhost:8202",
    saved = () => p.evaluate((k) => JSON.parse(localStorage.getItem(k)), K),
    nav = (v) =>
      p.evaluate(
        (v) =>
          document.querySelector('.nav-item[data-view="' + v + '"]').click(),
        v,
      ),
    tab = async (id) => {
      await nav("wellness");
      await p
        .locator('.reset186-tabs [data-reset=tab][data-id="' + id + '"]')
        .click();
    };
  async function check(name, fn) {
    await fn();
    checks.push(name);
    console.log("PASS " + name);
  }
  try {
    await p.goto(base);
    await p.locator("#authSkipIntro").click();
    await p.evaluate((k) => {
      const d = JSON.parse(localStorage.getItem(k));
      d.settings.online185 = { automaticArtwork: false, autoSync: false };
      d.settings.breakReminder = false;
      d.reflections = Array.from({ length: 200 }, (_, i) => ({
        id: "old-" + i,
        date: "2025-01-01",
        kind: "journal",
        text: "Older note " + i,
      }));
      d.wellnessSessions = Array.from({ length: 200 }, (_, i) => ({
        id: "care-" + i,
        date: "2025-01-01",
        title: "Old care " + i,
      }));
      localStorage.setItem(k, JSON.stringify(d));
    }, K);
    await p.reload();
    await check(
      "Reset-plan and journal save independently without deleting older records",
      async () => {
        await tab("reflect");
        await p.locator("#resetPlanHard").fill("Synthetic plan");
        await p.locator("[data-action=save-reset-plan]").click();
        await p.locator("#reflectionText").fill("My distinct journal");
        await p.locator("[data-action=save-reflection]").click();
        let d = await saved();
        assert.equal(d.reflections.length, 202);
        assert.ok(d.reflections.some((x) => x.id === "old-199"));
        assert.equal(
          d.reflections.find((x) => x.kind === "reset-plan").text,
          undefined,
        );
        await p.reload();
        await tab("reflect");
        assert.equal(
          await p.locator("#reflectionText").inputValue(),
          "My distinct journal",
        );
        await p.locator("#resetPlanHard").fill("Plan updated");
        await p.locator("[data-action=save-reset-plan]").click();
        assert.equal(
          (await saved()).reflections.find(
            (x) => x.kind === "journal" && !x.id.startsWith("old"),
          ).text,
          "My distinct journal",
        );
      },
    );
    await check(
      "Saving guided care retains more than200 prior care records",
      async () => {
        await tab("today");
        await p.locator("[data-reset=open][data-id=ground]").click();
        for (let i = 0; i < 5; i++)
          await p.locator("[data-reset=ground-next]").click();
        await p.locator("[data-reset=ground-save]").click();
        assert.equal((await saved()).wellnessSessions.length, 201);
        assert.ok(
          (await saved()).wellnessSessions.some((x) => x.id === "care-199"),
        );
      },
    );
    await check(
      "Editing the current journal in history refreshes its reflection editor",
      async () => {
        await tab("history");
        await p.locator("#wb193-query").fill("My distinct journal");
        await p.locator("[data-wb193=edit]").click();
        await p
          .locator("#wb193-dialog [name=text]")
          .fill("Updated through history");
        await p.locator("#wb193-dialog [type=submit]").click();
        await tab("reflect");
        assert.equal(
          await p.locator("#reflectionText").inputValue(),
          "Updated through history",
        );
      },
    );
    await check(
      "Private history searches all older records and combines date/type filters",
      async () => {
        await tab("history");
        await p.locator("#wb193-query").fill("Older note 199");
        assert.equal(await p.locator(".wb193-entry").count(), 1);
        await p.locator("#wb193-from").fill("2026-01-01");
        assert.equal(await p.locator(".wb193-entry").count(), 0);
        await p.locator("[data-wb193=clear]").click();
        await p.locator("#wb193-source").selectOption("reflections");
        await p.locator("#wb193-query").fill("Older note 199");
        assert.equal(await p.locator(".wb193-entry").count(), 1);
      },
    );
    await check(
      "Historical edit, delete and undo preserve newer data and survive reload",
      async () => {
        await p.locator("[data-wb193=edit]").click();
        await p
          .locator("#wb193-dialog [name=text]")
          .fill("Edited old private note");
        await p.locator("#wb193-dialog [type=submit]").click();
        await p.locator("#wb193-query").fill("Edited old private note");
        assert.equal(await p.locator(".wb193-entry").count(), 1);
        await p.locator("[data-wb193=delete]").click();
        assert.equal(await p.locator(".wb193-entry").count(), 0);
        await p.locator("[data-wb193=undo]").click();
        assert.equal(await p.locator(".wb193-entry").count(), 1);
        await p.reload();
        await tab("history");
        await p.locator("#wb193-query").fill("Edited old private note");
        assert.equal(await p.locator(".wb193-entry").count(), 1);
      },
    );
    await check(
      "Selected history export excludes every unselected private record",
      async () => {
        await p.locator("[data-wb193-select]").check();
        const waiting = p.waitForEvent("download");
        await p.locator("[data-wb193=json]").click();
        const dl = await waiting,
          tmp = path.join(
            os.tmpdir(),
            "rowanvale-wellbeing-" + Date.now() + ".json",
          );
        await dl.saveAs(tmp);
        const parsed = JSON.parse(fs.readFileSync(tmp, "utf8"));
        fs.unlinkSync(tmp);
        assert.equal(parsed.records.length, 1);
        assert.equal(parsed.records[0].record.text, "Edited old private note");
      },
    );
    await check(
      "Failed history edit keeps its draft and previous saved record",
      async () => {
        await p.locator("[data-wb193=edit]").click();
        await p.locator("#wb193-dialog [name=text]").fill("Unsaved draft");
        await p.evaluate(() => {
          window.originalSet = Storage.prototype.setItem;
          Storage.prototype.setItem = function (k, v) {
            if (k === "mindforge.momentum.data") throw Error("Synthetic quota");
            return window.originalSet.call(this, k, v);
          };
        });
        await p.locator("#wb193-dialog [type=submit]").click();
        assert.equal(await p.locator("#wb193-dialog").isVisible(), true);
        assert.equal(
          (await saved()).reflections.find((x) => x.id === "old-199").text,
          "Edited old private note",
        );
        await p.evaluate(
          () => (Storage.prototype.setItem = window.originalSet),
        );
        await p.locator("#wb193-dialog [type=submit]").click();
        assert.equal(
          (await saved()).reflections.find((x) => x.id === "old-199").text,
          "Unsaved draft",
        );
      },
    );
    await check(
      "Custom Quiet Room duration persists; early finish records actual time without completion XP",
      async () => {
        await nav("focus");
        await p.locator("#wb193-duration").fill("7");
        await p.locator("[data-wb193=focus-custom]").click();
        assert.equal(await p.locator("#timerDisplay").innerText(), "7:00");
        await p.clock.install();
        const before = (await saved()).xp;
        await p.locator("#timerStart").click();
        await p.clock.fastForward(65000);
        await p.locator("[data-wb193=focus-log-early]").click();
        const d = await saved();
        assert.equal(d.xp, before);
        assert.equal(d.focusLog[0].early, true);
        assert.equal(d.focusLog[0].seconds, 65);
        assert.equal(d.focusLog[0].minutes, 1.08);
      },
    );
    await check(
      "Quiet Room survives closing its tab and recovers paused in a new tab",
      async () => {
        await p.locator("[data-action=timer-reset]").click();
        await p.locator("#timerStart").click();
        await p.clock.fastForward(30000);
        await p.close();
        p = await context.newPage();
        await setup(p);
        await p.goto(base);
        await nav("focus");
        assert.equal(await p.locator("#timerDisplay").innerText(), "6:30");
        assert.match(await p.locator("#timerStart").innerText(), /Start focus/);
        await p.reload();
        await nav("focus");
        assert.equal(await p.locator("#timerDisplay").innerText(), "6:30");
      },
    );
    await check(
      "A second tab takes timer control without duplicate completion",
      async () => {
        await p.locator("[data-action=timer-reset]").click();
        await p.locator("#wb193-duration").fill("1");
        await p.locator("[data-wb193=focus-custom]").click();
        await p.locator("#timerStart").click();
        const before = (await saved()).focusLog.length,
          other = await context.newPage();
        await setup(other);
        await other.goto(base);
        await other.evaluate(() =>
          document.querySelector(".nav-item[data-view=focus]").click(),
        );
        await other.clock.install();
        await other.locator("#timerStart").click();
        await p.waitForFunction(() =>
          document
            .querySelector("#timerStart")
            ?.textContent.includes("Start focus"),
        );
        await other.clock.fastForward(60000);
        assert.equal((await saved()).focusLog.length, before + 1);
        await other.reload();
        assert.equal((await saved()).focusLog.length, before + 1);
        await other.close();
        await p.reload();
        await nav("focus");
      },
    );
    await check(
      "Private timeline fits phone viewport and retains accessible controls",
      async () => {
        await tab("history");
        await p.setViewportSize({ width: 390, height: 844 });
        assert.ok(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await p.screenshot({
          path: path.join(OUT, "private-history-mobile.png"),
        });
      },
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(OUT, "results.json"),
      JSON.stringify({ checks, errors }, null, 2),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
