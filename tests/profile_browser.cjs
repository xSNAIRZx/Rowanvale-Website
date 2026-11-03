"use strict";
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict"),
  { chromium } = require("./browser-runtime.cjs");
const BASE = process.env.ROWANVALE_TEST_URL || "http://localhost:8185",
  ROOT = path.resolve(__dirname, ".."),
  OUT = path.join(ROOT, "docs/evidence/19.3.0"),
  K = "mindforge.momentum.data";
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({
      executablePath: process.env.ROWANVALE_BROWSER || undefined,
      headless: true,
    }),
    context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    }),
    page = await context.newPage(),
    checks = [],
    errors = [];
  page.setDefaultTimeout(12000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  await page.route("https://**/*", (r) => r.abort());
  await page.route("**/api/connectivity", (r) =>
    r.fulfill({
      json: {
        providers: [
          {
            name: "Open Library",
            ready: true,
            kinds: ["Book"],
            reachability: "Reachable",
          },
          {
            name: "TMDB",
            ready: false,
            kinds: ["Movie", "Show", "Anime"],
            reachability: "Setup needed",
          },
        ],
      },
    }),
  );
  const saved = () =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k)), K),
    nav = async (v) =>
      page.evaluate(
        (v) => document.querySelector(".nav-item[data-view=" + v + "]").click(),
        v,
      ),
    profile = () => page.locator("#viewRoot>.rvp-profile"),
    edit = () => page.locator("#rvp-editor");
  async function check(name, fn) {
    try {
      await fn();
      checks.push({ name, pass: true });
      console.log("PASS " + name);
    } catch (e) {
      checks.push({ name, pass: false, error: e.message });
      fs.writeFileSync(
        path.join(OUT, "profile-browser-results.json"),
        JSON.stringify({ checks, errors }, null, 2),
      );
      await page.screenshot({
        path: path.join(OUT, "profile-failure.png"),
        fullPage: true,
      });
      throw e;
    }
  }
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator("#authSkipIntro").click();
  await page.evaluate((k) => {
    const d = JSON.parse(localStorage.getItem(k));
    d.settings.online185 = { automaticArtwork: false, autoSync: false };
    localStorage.setItem(k, JSON.stringify(d));
  }, K);
  await page.reload({ waitUntil: "domcontentloaded" });
  await nav("space");
  await check(
    "Default profile is complete without artwork uploads, fake collections or unearned badges",
    async () => {
      assert.equal(await profile().count(), 1);
      assert.equal(await profile().locator(".rvp-landscape").count(), 1);
      assert.match(await profile().locator("h1").innerText(), /Guest/);
      assert.equal(await profile().locator(".rvp-badges").count(), 0);
      assert.equal(await profile().locator(".rvp-media").count(), 0);
      assert.ok(
        await profile()
          .getByText("Leave a little room for wonder.", { exact: true })
          .isVisible(),
      );
      await page.screenshot({
        path: path.join(OUT, "profile-default-desktop.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Profile preview changes do not save until Apply and Cancel discards the draft",
    async () => {
      const before = await page.evaluate((k) => localStorage.getItem(k), K);
      await profile().locator("[data-rvp=edit]").click();
      await edit()
        .locator('[data-rvp-field="profile.name"]')
        .fill("Unsaved Explorer");
      await page.waitForFunction(
        () =>
          document.querySelector("#rvp-preview-content h1").textContent ===
          "Unsaved Explorer",
      );
      assert.equal(
        await page.evaluate((k) => localStorage.getItem(k), K),
        before,
      );
      await edit().locator("[data-rvp-edit=cancel]").first().click();
      await edit().waitFor({ state: "detached" });
      assert.equal((await saved()).profile.name, "Guest Explorer");
    },
  );
  await check(
    "Six profile presets preview distinctly and never change global appearance",
    async () => {
      const before = (await saved()).settings;
      await profile().locator("[data-rvp=customize]").click();
      const styles = [];
      for (const preset of [
        "rowan",
        "minimal",
        "cinematic",
        "vibrant",
        "cozy",
        "midnight",
      ]) {
        await edit()
          .locator("[data-rvp-edit=preset][data-id=" + preset + "]")
          .click();
        styles.push(
          await edit()
            .locator("#rvp-preview-content .rvp-profile")
            .getAttribute("data-rvp-style"),
        );
      }
      assert.equal(new Set(styles).size, 6);
      assert.equal((await saved()).settings.theme, before.theme);
      assert.equal(
        (await saved()).settings.appearanceMode,
        before.appearanceMode,
      );
      await edit().locator("[data-rvp-edit=preset][data-id=cozy]").click();
      await edit()
        .locator('[data-rvp-field="settings.profile185.lighting"]')
        .selectOption("light");
      await edit()
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      await edit().waitFor({ state: "detached" });
      assert.equal((await saved()).settings.profile185.preset, "cozy");
      assert.equal((await saved()).settings.theme, before.theme);
      assert.equal(
        (await saved()).settings.appearanceMode,
        before.appearanceMode,
      );
    },
  );
  await check(
    "Profile identity, username, bio and appearance persist after a real reload",
    async () => {
      await profile().locator("[data-rvp=edit]").click();
      await edit()
        .locator('[data-rvp-field="profile.name"]')
        .fill("Avery Rowan");
      await edit()
        .locator('[data-rvp-field="profile.username"]')
        .fill("avery_rowan");
      await edit()
        .locator('[data-rvp-field="profile.bio"]')
        .fill("Books, faraway worlds, and a little room for something new.");
      await edit()
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      await edit().waitFor({ state: "detached" });
      await page.reload({ waitUntil: "domcontentloaded" });
      await nav("space");
      assert.equal(await profile().locator("h1").innerText(), "Avery Rowan");
      assert.ok((await profile().innerText()).includes("@avery_rowan"));
      assert.equal(await profile().getAttribute("data-rvp-mode"), "light");
      assert.equal(await profile().getAttribute("data-rvp-preset"), "cozy");
    },
  );
  await check(
    "Light, dark and system profile lighting work independently of the app",
    async () => {
      for (const mode of ["dark", "light", "system"]) {
        await profile().locator("[data-rvp=customize]").click();
        await edit()
          .locator('[data-rvp-field="settings.profile185.lighting"]')
          .selectOption(mode);
        await edit()
          .getByRole("button", { name: "Apply changes", exact: true })
          .click();
        await edit().waitFor({ state: "detached" });
        if (mode === "system")
          await page.emulateMedia({ colorScheme: "light" });
        const bg = await profile().evaluate(
          (el) => getComputedStyle(el).backgroundColor,
        );
        assert.equal(
          bg,
          mode === "dark" ? "rgb(17, 38, 43)" : "rgb(250, 248, 241)",
        );
      }
      await page.emulateMedia({ colorScheme: "dark" });
      assert.equal(
        await profile().evaluate((el) => getComputedStyle(el).backgroundColor),
        "rgb(17, 38, 43)",
      );
    },
  );
  const fixture = [
    ["Game", "Starlight Trail"],
    ["Book", "Pride and Prejudice"],
    ["Movie", "A Night at the Observatory"],
    ["Show", "The Long Way Home"],
    ["Anime", "Garden of Clouds"],
  ].map(([type, title], i) => ({
    id: "profile-" + i,
    title,
    type,
    status:
      i === 0 ? "Currently Playing" : i === 1 ? "In Progress" : "Want to Try",
    createdAt: "2026-10-24T12:00:00Z",
    note: "PRIVATE REVIEW NEVER SHARE",
    metadata184: {
      genres: "adventure, cozy",
      author: type === "Book" ? "Jane Austen" : "",
      artwork:
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5RkAAAAASUVORK5CYII=",
      manualFields: ["artwork"],
    },
    ...(type === "Book"
      ? { book: { pages: 300, progress: 75, author: "Jane Austen" } }
      : {}),
  }));
  const covers = await page.evaluate(
    (stories) =>
      stories.map((x, i) => {
        const canvas = document.createElement("canvas");
        canvas.width = 450;
        canvas.height = 650;
        const c = canvas.getContext("2d");
        const tones = [
          ["#203850", "#d7b77c"],
          ["#345c4d", "#eed6ab"],
          ["#2c345e", "#d7b4dc"],
          ["#5b3738", "#e9b78a"],
          ["#324a52", "#accbbe"],
        ][i];
        const g = c.createLinearGradient(0, 0, 450, 650);
        g.addColorStop(0, tones[0]);
        g.addColorStop(1, "#0c232b");
        c.fillStyle = g;
        c.fillRect(0, 0, 450, 650);
        c.strokeStyle = tones[1];
        c.globalAlpha = 0.35;
        for (let j = 0; j < 5; j++) {
          c.beginPath();
          c.arc(225, 240, 65 + j * 29, 0, Math.PI * 2);
          c.stroke();
        }
        c.globalAlpha = 1;
        c.fillStyle = tones[1];
        c.font = "20px sans-serif";
        c.fillText("ROWANVALE / QA ART", 35, 52);
        c.font = "34px Georgia";
        const words = x.title.split(" ");
        let line = "",
          y = 438;
        for (const word of words) {
          if (c.measureText(line + " " + word).width > 370) {
            c.fillText(line, 35, y);
            y += 45;
            line = word;
          } else line += (line ? " " : "") + word;
        }
        c.fillText(line, 35, y);
        c.font = "18px sans-serif";
        c.fillText("TEST FIXTURE · " + x.type.toUpperCase(), 35, 602);
        return canvas.toDataURL("image/jpeg", 0.85);
      }),
    fixture,
  );
  fixture.forEach((x, i) => (x.metadata184.artwork = covers[i]));
  await check(
    "A populated profile showcases all supported formats and existing profile content",
    async () => {
      await page.evaluate(
        ({ K, fixture }) => {
          const d = JSON.parse(localStorage.getItem(K));
          d.backlog = fixture;
          d.settings.profile185 = {
            ...d.settings.profile185,
            preset: "rowan",
            style: "landscape",
            featured: fixture.map((x) => x.id),
            lighting: "dark",
          };
          d.settings.spaceLinks = [
            { label: "My corner", url: "https://example.test" },
          ];
          d.profile.anthemTitle = "An evening soundtrack";
          d.profile.anthemUrl = "https://example.test/anthem";
          d.settings.spaceTopFriends = ["friend"];
          d.friends = [{ id: "friend", name: "Sam", platform: "Local friend" }];
          d.achievements = [
            {
              id: "earned",
              name: "An earned milestone",
              desc: "A real saved event.",
            },
          ];
          localStorage.setItem(K, JSON.stringify(d));
        },
        { K, fixture },
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await nav("space");
      assert.equal(
        await profile().locator(".rvp-featured .rvp-media").count(),
        5,
      );
      assert.ok(
        (await profile().innerText()).includes("An evening soundtrack"),
      );
      assert.ok((await profile().innerText()).includes("Sam"));
      assert.equal(await profile().locator(".rvp-badges article").count(), 1);
      await page.screenshot({
        path: path.join(OUT, "profile-populated-desktop.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Featured choices, section order and visibility save predictably",
    async () => {
      await profile().locator("[data-rvp=featured]").click();
      await edit().locator('[data-rvp-feature="profile-4"]').uncheck();
      await edit()
        .locator("[data-rvp-edit=category][data-id=sections]")
        .click();
      await edit().locator("[data-rvp-section=activity]").uncheck();
      await edit()
        .locator('[data-rvp-edit=move][data-id=featured][data-step="-1"]')
        .click();
      await edit()
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      await edit().waitFor({ state: "detached" });
      assert.equal(
        await profile().locator(".rvp-featured .rvp-media").count(),
        4,
      );
      assert.equal(await profile().locator(".rvp-activity").count(), 0);
      assert.equal((await saved()).settings.profile185.order[0], "featured");
    },
  );
  await check(
    "Shared preview respects visibility and the exported page contains no private workspace",
    async () => {
      await profile().locator("[data-rvp=shared]").click();
      assert.ok(await edit().isVisible());
      await edit()
        .locator('[data-rvp-field="settings.profile185.privacy.enabled"]')
        .check();
      await edit()
        .locator('[data-rvp-field="settings.profile185.privacy.connections"]')
        .check();
      await edit()
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      await edit().waitFor({ state: "detached" });
      await profile().locator("[data-rvp=shared]").click();
      const shared = page.locator("#rvp-shared-preview");
      assert.equal(await shared.locator(".rvp-media").count(), 4);
      assert.ok(!(await shared.innerText()).includes("PRIVATE REVIEW"));
      assert.ok(!(await shared.innerText()).includes("Sam"));
      assert.equal(await shared.locator("#collection").count(), 0);
      await shared.locator("[data-export-confirm]").click();
      await shared.locator(".rvp-export-fallback").waitFor();
      const html = await shared
        .locator(".rvp-export-fallback textarea")
        .inputValue();
      fs.writeFileSync(path.join(OUT, "shared-profile-safety-test.html"), html);
      for (const secret of [
        "PRIVATE REVIEW",
        "mindforge.momentum.data",
        "supabaseKey",
        "moodLog",
        "<script",
        "<form",
      ])
        assert.ok(!html.includes(secret), secret);
      assert.ok(html.includes("Avery Rowan"));
      await shared.locator("[data-preview-close]").click();
      await shared.waitFor({ state: "detached" });
    },
  );
  await check(
    "Private guestbook notes remain functional without appearing in the shared snapshot",
    async () => {
      const board = profile().locator(".rvp-pinboard");
      await board.locator("summary").click();
      await board.locator("#guestbookInput").fill("PRIVATE PINBOARD TEST");
      await board.locator("[type=submit]").click();
      assert.ok(
        (await saved()).guestbook.some(
          (x) => x.text === "PRIVATE PINBOARD TEST",
        ),
      );
      await profile().locator("[data-rvp=shared]").click();
      assert.ok(
        !(await page.locator("#rvp-shared-preview").innerText()).includes(
          "PRIVATE PINBOARD TEST",
        ),
      );
      await page.locator("[data-preview-close]").click();
    },
  );
  await check(
    "Failed storage writes keep the preview open and preserve the last saved identity",
    async () => {
      await profile().locator("[data-rvp=edit]").click();
      await edit()
        .locator('[data-rvp-field="profile.name"]')
        .fill("Must not save");
      const before = await page.evaluate((k) => localStorage.getItem(k), K);
      await page.evaluate(() => {
        window.oldSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function () {
          throw Error("Quota exceeded");
        };
      });
      await edit()
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      assert.equal(
        await page.evaluate((k) => localStorage.getItem(k), K),
        before,
      );
      assert.ok(await edit().isVisible());
      assert.match(
        await edit().locator("#rvp-editor-status").innerText(),
        /could not|safe/i,
      );
      await page.evaluate(() => (Storage.prototype.setItem = window.oldSet));
      await edit().locator("[data-rvp-edit=cancel]").first().click();
      await edit().waitFor({ state: "detached" });
    },
  );
  await check(
    "Uploaded avatars, banners and gallery images persist with the existing profile records",
    async () => {
      await profile().locator("[data-rvp=edit]").click();
      const png = fs.readFileSync(
        path.join(ROOT, "app/assets/rowanvale-valley.webp"),
      );
      for (const type of ["avatar", "banner"]) {
        await edit()
          .locator("[data-rvp-upload=" + type + "]")
          .setInputFiles({
            name: "photo.webp",
            mimeType: "image/webp",
            buffer: png,
          });
        await page.waitForFunction(() =>
          document
            .querySelector("#rvp-editor-status")
            .textContent.includes("Upload ready"),
        );
      }
      await edit().locator("details").first().locator("summary").click();
      await edit().locator("[data-rvp-upload=gallery]").setInputFiles({
        name: "gallery.webp",
        mimeType: "image/webp",
        buffer: png,
      });
      await page.waitForFunction(() =>
        document
          .querySelector("#rvp-editor-status")
          .textContent.includes("Upload ready"),
      );
      await edit()
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      await edit().waitFor({ state: "detached" });
      const d = await saved();
      assert.match(d.settings.spaceCustomAvatar, /^data:image\/jpeg/);
      assert.match(d.settings.spaceCustomBanner, /^data:image\/jpeg/);
      assert.equal(d.settings.spaceGallery.length, 1);
    },
  );
  await check(
    "The preview supports a mobile width and stays inside the dialog",
    async () => {
      await profile().locator("[data-rvp=customize]").click();
      await edit().locator("#rvp-preview-size").selectOption("mobile");
      await edit().locator("#rvp-preview-lighting").selectOption("light");
      assert.ok(
        await edit()
          .locator("#rvp-preview-viewport")
          .evaluate((el) => el.clientWidth <= 390),
      );
      await page.screenshot({
        path: path.join(OUT, "profile-studio-desktop.png"),
        fullPage: true,
      });
      await edit().locator("[data-rvp-edit=cancel]").first().click();
      await edit().waitFor({ state: "detached" });
    },
  );
  await check(
    "Small mobile, phone, tablet and desktop profile/editor layouts avoid horizontal overflow",
    async () => {
      for (const width of [320, 390, 768, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await nav("space");
        assert.equal(
          await page.locator(".hb11-context-tools").isVisible(),
          false,
        );
        assert.ok(
          !(await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth + 2,
          )),
          "profile " + width,
        );
        await profile().locator("[data-rvp=customize]").click();
        assert.ok(
          !(await edit().evaluate((el) => el.scrollWidth > el.clientWidth + 2)),
          "editor " + width,
        );
        if (width === 390)
          await page.screenshot({
            path: path.join(OUT, "profile-studio-mobile.png"),
            fullPage: true,
          });
        await edit().locator("[data-rvp-edit=cancel]").first().click();
        await edit().waitFor({ state: "detached" });
        if (width === 390)
          await page.screenshot({
            path: path.join(OUT, "profile-populated-mobile.png"),
            fullPage: true,
          });
      }
    },
  );
  await check(
    "A 2,000-item collection renders bounded pages, filters and searches responsively",
    async () => {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.evaluate((k) => {
        const d = JSON.parse(localStorage.getItem(k));
        d.backlog = Array.from({ length: 2000 }, (_, i) => ({
          id: "large-" + i,
          title: "Story " + String(i).padStart(4, "0"),
          type: ["Game", "Book", "Movie", "Show", "Anime"][i % 5],
          status: "Want to Try",
          createdAt: "2026-01-01",
        }));
        localStorage.setItem(k, JSON.stringify(d));
      }, K);
      await page.reload({ waitUntil: "domcontentloaded" });
      await nav("space");
      const start = Date.now();
      await profile().locator("[data-rvp=tab][data-id=collection]").click();
      assert.equal(
        await profile().locator(".rvp-media-grid .rvp-media").count(),
        24,
      );
      assert.ok(Date.now() - start < 2000);
      await profile().locator("[data-rvp=more]").click();
      assert.equal(
        await profile().locator(".rvp-media-grid .rvp-media").count(),
        48,
      );
      await profile().locator("#rvp-library-query").fill("Story 1999");
      await page.waitForFunction(
        () =>
          document.querySelectorAll(".rvp-media-grid .rvp-media").length === 1,
      );
      assert.ok(
        (await profile().locator(".rvp-media-grid").innerText()).includes(
          "1999",
        ),
      );
    },
  );
  await check(
    "Keyboard focus remains in the native editor and reduced motion removes animation",
    async () => {
      await nav("space");
      await profile().locator("[data-rvp=edit]").focus();
      await page.keyboard.press("Enter");
      assert.ok(await edit().isVisible());
      await page.keyboard.press("Tab");
      assert.ok(
        await edit().evaluate((el) => el.contains(document.activeElement)),
      );
      await page.keyboard.press("Escape");
      await edit().waitFor({ state: "detached" });
      await page.emulateMedia({ reducedMotion: "reduce" });
      assert.equal(
        await profile()
          .locator(".rvp-media")
          .first()
          .evaluate((el) => getComputedStyle(el).transitionDuration),
        "0s",
      );
    },
  );
  await check(
    "Global light, dark and system mode work with a saved custom theme",
    async () => {
      await nav("customize");
      await page
        .locator("[data-rv18-action=category][data-id=appearance]")
        .click();
      await page
        .locator('[data-rv18-field="settings.theme"]')
        .selectOption("rv18-forest");
      await page
        .locator('[data-rv18-field="settings.appearanceMode"]')
        .selectOption("light");
      await page.locator("[data-rv18-action=save]").click();
      await nav("space");
      assert.equal(
        await page.locator("body").getAttribute("data-appearance-resolved"),
        "light",
      );
      const light = await page.evaluate(() =>
        getComputedStyle(document.body).getPropertyValue("--hb12-bg"),
      );
      assert.ok(light.trim().startsWith("#"));
      await nav("customize");
      await page
        .locator("[data-rv18-action=category][data-id=appearance]")
        .click();
      await page
        .locator('[data-rv18-field="settings.appearanceMode"]')
        .selectOption("dark");
      await page.locator("[data-rv18-action=save]").click();
      await nav("space");
      assert.equal(
        await page.locator("body").getAttribute("data-appearance-resolved"),
        "dark",
      );
      assert.notEqual(
        await page.evaluate(() =>
          getComputedStyle(document.body).getPropertyValue("--hb12-bg"),
        ),
        light,
      );
      await nav("customize");
      await page
        .locator("[data-rv18-action=category][data-id=appearance]")
        .click();
      await page
        .locator('[data-rv18-field="settings.appearanceMode"]')
        .selectOption("system");
      await page.locator("[data-rv18-action=save]").click();
      await page.emulateMedia({ colorScheme: "light" });
      await nav("space");
      assert.equal(
        await page.locator("body").getAttribute("data-appearance-resolved"),
        "light",
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      assert.equal(
        await page.locator("html").getAttribute("data-initial-appearance"),
        "light",
      );
    },
  );
  await check(
    "The original global appearance editor and other Rowanvale views still render",
    async () => {
      for (const v of [
        "customize",
        "media",
        "books",
        "watch",
        "fan",
        "wellness",
        "fitness",
        "quests",
        "dashboard",
        "connections",
        "friends",
        "myday",
      ]) {
        await nav(v);
        assert.ok((await page.locator("#viewRoot").innerText()).length > 50);
      }
      assert.deepEqual(errors, []);
    },
  );
  fs.writeFileSync(
    path.join(OUT, "profile-browser-results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        browser: await browser.version(),
        checks,
        errors,
        exportEvidence:
          "Prepared HTML payload and copy fallback verified. Automated Chromium downloads are canceled by this environment; OS-level download delivery is not claimed.",
        fixtures:
          "Synthetic QA media and user data; screenshots are the running app.",
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(checks.length + " new profile browser workflows passed.");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
