"use strict";
const fs = require("fs"),
  path = require("path"),
  assert = require("node:assert/strict"),
  { chromium } = require("./browser-runtime.cjs");
const BASE = process.env.ROWANVALE_TEST_URL || "http://localhost:8185",
  ROOT = path.resolve(__dirname, ".."),
  OUT = require("./evidence-path.cjs").dir,
  K = "mindforge.momentum.data";
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const browser = await chromium.launch({
      executablePath: process.env.ROWANVALE_BROWSER || undefined,
      headless: true,
    }),
    checks = [],
    errors = [];
  let context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
      serviceWorkers: "block",
    }),
    page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  const searches = new Map(),
    details = new Map(),
    image = fs.readFileSync(path.join(ROOT, "app/assets/icon-192.png")),
    providers = [
      {
        name: "Open Library",
        ready: true,
        kinds: ["Book"],
        reachability: "Reachable",
      },
      { name: "IGDB", ready: true, kinds: ["Game"], reachability: "Reachable" },
      {
        name: "TMDB",
        ready: true,
        kinds: ["Movie", "Show", "Anime"],
        reachability: "Reachable",
      },
    ];
  let healthCalls = 0,
    statusFails = false;
  await page.route("https://**/*", (r) =>
    r.fulfill({ status: 200, contentType: "image/png", body: image }),
  );
  await page.route("**/api/metadata/status", (r) => {
    healthCalls++;
    return statusFails ? r.abort() : r.fulfill({ json: { providers } });
  });
  await page.route("**/api/connectivity", (r) =>
    r.fulfill({ json: { providers } }),
  );
  await page.route("**/api/metadata/search?**", (r) => {
    const u = new URL(r.request().url()),
      title = u.searchParams.get("q"),
      type = u.searchParams.get("type"),
      count = (searches.get(title) || 0) + 1;
    searches.set(title, count);
    if (title === "Retry Game" && count === 1)
      return r.fulfill({
        status: 429,
        json: { error: "Provider cooling down", retryAfter: 1 },
      });
    if (title === "Unavailable Book")
      return r.fulfill({ json: { results: [] } });
    const base = {
      title,
      type,
      year: 2020,
      provider:
        type === "Book" ? "Open Library" : type === "Game" ? "IGDB" : "TMDB",
      sourceId:
        type === "Book"
          ? "OL" + (900 + searches.size) + "W"
          : String(900 + searches.size),
      author: type === "Book" ? "Writer" : "",
      platforms: type === "Game" ? "PC" : "",
      description: "A verified fixture synopsis for " + title,
      genres: "adventure, cozy",
      artwork:
        "https://covers.openlibrary.org/b/id/" +
        (900 + searches.size) +
        "-L.jpg",
      cacheAllowed: true,
    };
    const results =
      title === "Ambiguous Book"
        ? [
            { ...base, author: "First Writer", sourceId: "OL800W" },
            { ...base, author: "Second Writer", sourceId: "OL801W" },
          ]
        : [base];
    for (const x of results) details.set(x.sourceId, x);
    return r.fulfill({ json: { results } });
  });
  await page.route("**/api/metadata/details?**", (r) => {
    const u = new URL(r.request().url());
    return r.fulfill({
      json: { result: details.get(u.searchParams.get("id")) || {} },
    });
  });
  const saved = () =>
      page.evaluate((k) => JSON.parse(localStorage.getItem(k)), K),
    nav = async (v) =>
      page.evaluate(
        (v) => document.querySelector(".nav-item[data-view=" + v + "]").click(),
        v,
      );
  async function check(name, f) {
    try {
      await f();
      checks.push({ name, pass: true });
      console.log("PASS " + name);
    } catch (e) {
      checks.push({ name, pass: false, error: e.message });
      fs.writeFileSync(
        path.join(OUT, "connectivity-browser-results.json"),
        JSON.stringify({ checks, errors }, null, 2),
      );
      await page.screenshot({
        path: path.join(OUT, "connectivity-failure.png"),
        fullPage: true,
      });
      throw e;
    }
  }
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator("#authSkipIntro").click();
  const fixtures = ["Game", "Book", "Movie", "Show", "Anime"].map(
    (type, i) => ({
      id: "auto-" + i,
      type,
      title: "Automatic " + type,
      status: "Want to Try",
      createdAt: "2026-10-24",
      ...(type === "Book"
        ? { book: { author: "Writer", year: 2020 } }
        : {
            metadata184: { year: 2020, platforms: type === "Game" ? "PC" : "" },
          }),
    }),
  );
  await check(
    "Opening an online library automatically enriches all five supported formats",
    async () => {
      await page.evaluate(
        ({ K, fixtures }) => {
          const d = JSON.parse(localStorage.getItem(K));
          d.settings.online185 = { automaticArtwork: true, autoSync: false };
          d.backlog = fixtures;
          localStorage.setItem(K, JSON.stringify(d));
        },
        { K, fixtures },
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await nav("space");
      await page.waitForFunction(
        (k) =>
          JSON.parse(localStorage.getItem(k)).backlog.every(
            (x) => x.metadata184?.artwork && x.metadata184?.description,
          ),
        K,
        { timeout: 25000 },
      );
      await page.waitForFunction(
        () =>
          document.querySelectorAll(".rvp-featured .rvp-art img").length === 5,
        {},
        { timeout: 10000 },
      );
      for (const x of fixtures) assert.equal(searches.get(x.title), 1, x.title);
    },
  );
  await check(
    "Repeated reconnect signals do not duplicate completed artwork requests",
    async () => {
      const before = Object.fromEntries(searches);
      await page.evaluate(() => {
        for (let i = 0; i < 8; i++) dispatchEvent(new Event("online"));
      });
      await page.waitForTimeout(600);
      assert.deepEqual(Object.fromEntries(searches), before);
    },
  );
  async function add(type, title, author = "Writer") {
    await nav("media");
    await page.locator("[data-living=add]").first().click();
    await page
      .locator("#living-search-form select[name=kind]")
      .selectOption(type);
    await page.locator("#living-search-form input[name=query]").fill(title);
    await page.locator("[data-living=manual]").click();
    const f = page.locator("#living-edit-form");
    await f.locator("[name=title]").fill(title);
    await f.locator("[name=author]").fill(author);
    await f.locator("[name=year]").fill("2020");
    if (type === "Game") await f.locator("[name=edition]").fill("PC");
    await f.locator("[type=submit]").click();
    await page.locator("#living-dialog").waitFor({ state: "detached" });
  }
  await check(
    "Adding offline media persists a pending job and reconnecting resumes it safely",
    async () => {
      await context.setOffline(true);
      await add("Book", "Offline Book");
      await page.waitForFunction(() =>
        JSON.parse(
          localStorage.getItem("rowanvale.enrichment185") || "[]",
        ).some((j) => j.state === "queued"),
      );
      assert.equal(searches.get("Offline Book"), undefined);
      await context.setOffline(false);
      await page.waitForFunction(
        (k) =>
          JSON.parse(localStorage.getItem(k)).backlog.find(
            (x) => x.title === "Offline Book",
          )?.metadata184?.artwork,
        K,
        { timeout: 15000 },
      );
      assert.equal(searches.get("Offline Book"), 1);
    },
  );
  await check(
    "Ambiguous identities are held for review instead of taking the first cover",
    async () => {
      await add("Book", "Ambiguous Book", "");
      await page.waitForFunction(
        () =>
          JSON.parse(
            localStorage.getItem("rowanvale.enrichment185") || "[]",
          ).some((j) => j.state === "review"),
        {},
        { timeout: 15000 },
      );
      const x = (await saved()).backlog.find(
        (x) => x.title === "Ambiguous Book",
      );
      assert.ok(!x.metadata184?.artwork);
      await page.evaluate(() => RVConnect.open());
      await page.locator("[data-rvc=approve]").first().click();
      await page.waitForFunction(
        (k) =>
          !!JSON.parse(localStorage.getItem(k)).backlog.find(
            (x) => x.title === "Ambiguous Book",
          )?.metadata184?.artwork,
        K,
      );
      assert.equal(
        (await saved()).backlog.find((x) => x.title === "Ambiguous Book").book
          .author,
        "First Writer",
      );
      await page.locator("[data-rvc=close]").click();
      await page.locator("#rvc-dialog").waitFor({ state: "detached" });
    },
  );
  await check(
    "No-result lookups are negatively cached across repeated reconnects",
    async () => {
      await add("Book", "Unavailable Book");
      await page.waitForFunction(
        () =>
          JSON.parse(
            localStorage.getItem("rowanvale.enrichment185") || "[]",
          ).some((j) => j.state === "unavailable"),
        {},
        { timeout: 15000 },
      );
      await page.evaluate(() => {
        for (let i = 0; i < 6; i++) dispatchEvent(new Event("online"));
      });
      await page.waitForTimeout(500);
      assert.equal(searches.get("Unavailable Book"), 1);
    },
  );
  await check(
    "A temporary rate limit is retried with backoff and then saved",
    async () => {
      await add("Game", "Retry Game");
      await page.waitForFunction(
        (k) =>
          !!JSON.parse(localStorage.getItem(k)).backlog.find(
            (x) => x.title === "Retry Game",
          )?.metadata184?.artwork,
        K,
        { timeout: 20000 },
      );
      assert.equal(searches.get("Retry Game"), 2);
      const q = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("rowanvale.enrichment185")),
      );
      const id = (await saved()).backlog.find(
        (x) => x.title === "Retry Game",
      ).id;
      assert.equal(q.find((j) => j.itemId === id)?.attempts, 1);
    },
  );
  await check(
    "Existing manual descriptions and custom artwork are not replaced by background jobs",
    async () => {
      const d = await saved(),
        x = d.backlog.find((x) => x.title === "Automatic Book");
      await page.evaluate(
        ({ K, id }) => {
          const d = JSON.parse(localStorage.getItem(K)),
            x = d.backlog.find((x) => x.id === id);
          x.metadata184 = {
            ...x.metadata184,
            description: "MY PROTECTED DESCRIPTION",
            artwork:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5RkAAAAASUVORK5CYII=",
            manualFields: ["artwork", "description"],
          };
          localStorage.setItem(K, JSON.stringify(d));
        },
        { K, id: x.id },
      );
      await page.reload({ waitUntil: "domcontentloaded" });
      await nav("space");
      await page.waitForTimeout(500);
      const b = (await saved()).backlog.find((b) => b.id === x.id);
      assert.equal(b.metadata184.description, "MY PROTECTED DESCRIPTION");
      assert.match(b.metadata184.artwork, /^data:/);
      assert.equal(searches.get("Automatic Book"), 1);
    },
  );
  await check(
    "Actual reachability failure is shown even when the browser reports online",
    async () => {
      statusFails = true;
      await page.evaluate(() => RVConnect.check({ probe: true }));
      const state = await page.evaluate(() => RVConnect.snapshot());
      assert.equal(state.network.status, "unreachable");
      assert.equal(await page.evaluate(() => navigator.onLine), true);
      statusFails = false;
      await page.evaluate(() => RVConnect.check({ probe: true }));
      assert.equal(
        (await page.evaluate(() => RVConnect.snapshot())).network.status,
        "reachable",
      );
    },
  );
  await check(
    "Connectivity settings persist and every displayed account action has a real handler",
    async () => {
      await page.evaluate(() => RVConnect.open());
      await page.locator("#rvc-preferences [name=automaticArtwork]").uncheck();
      await page.locator("#rvc-preferences [type=submit]").click();
      assert.equal((await saved()).settings.online185.automaticArtwork, false);
      await page
        .locator("#rvc-config [name=url]")
        .fill("https://example.supabase.co");
      await page.locator("#rvc-config [name=key]").fill("sb_secret_forbidden");
      await page.locator("#rvc-config [type=submit]").click();
      assert.match(await page.locator("#rvc-message").innerText(), /Secret/);
      assert.equal(
        await page.evaluate(() =>
          localStorage.getItem("mindforge.account.config"),
        ),
        null,
      );
      await page.screenshot({
        path: path.join(OUT, "connectivity-desktop.png"),
        fullPage: true,
      });
      await page.locator("[data-rvc=close]").click();
    },
  );
  await context.close();
  // The following flows run the bundled real Supabase SDK against deterministic HTTP responses.
  context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    serviceWorkers: "block",
  });
  page = await context.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (d) => d.accept());
  const uid = "4199a2d4-72ab-44ca-b7c3-bdca907d2b69",
    host = "rowanvale-test.supabase.co",
    email = "qa@example.test",
    token =
      "eyJhbGciOiJIUzI1NiJ9." +
      Buffer.from(
        JSON.stringify({
          sub: uid,
          role: "authenticated",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url") +
      ".qa",
    user = { id: uid, email, aud: "authenticated", role: "authenticated" },
    session = {
      access_token: token,
      refresh_token: "qa-refresh",
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      expires_in: 3600,
      token_type: "bearer",
      user,
    };
  let remote = null,
    rpcCalls = 0,
    authCalls = 0,
    permissionFail = false;
  await page.route("https://**/*", async (r) => {
    const u = new URL(r.request().url());
    if (u.hostname !== host) return r.abort();
    if (u.pathname === "/auth/v1/user") {
      authCalls++;
      return r.fulfill({ json: user });
    }
    if (u.pathname === "/auth/v1/token") return r.fulfill({ json: session });
    if (u.pathname === "/auth/v1/logout") return r.fulfill({ json: {} });
    if (u.pathname === "/rest/v1/mindforge_saves") {
      assert.equal(u.searchParams.get("user_id"), "eq." + uid);
      return r.fulfill({ json: remote ? [remote] : [] });
    }
    if (u.pathname === "/rest/v1/rpc/rowanvale_compare_and_save") {
      rpcCalls++;
      const body = r.request().postDataJSON();
      assert.equal(body.p_user_id, uid);
      assert.equal(r.request().headers().authorization, "Bearer " + token);
      assert.ok(r.request().headers()["x-client-info"].includes("supabase-js"));
      if (permissionFail)
        return r.fulfill({
          status: 403,
          json: {
            code: "42501",
            message: "Permission denied by private row policy",
          },
        });
      if (body.p_expected_version !== (remote?.version || 0))
        return r.fulfill({
          status: 409,
          json: { code: "40001", message: "Cloud version changed" },
        });
      remote = {
        version: (remote?.version || 0) + 1,
        data: body.p_data,
        updated_at: new Date().toISOString(),
      };
      return r.fulfill({ json: { version: remote.version } });
    }
    return r.fulfill({
      status: 404,
      json: { message: "Unknown test endpoint" },
    });
  });
  await page.route("**/api/metadata/status", (r) =>
    r.fulfill({ json: { providers } }),
  );
  await page.route("**/api/connectivity", (r) =>
    r.fulfill({ json: { providers } }),
  );
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.locator("#authSkipIntro").click();
  await page.evaluate(
    ({ K, session, host }) => {
      const d = JSON.parse(localStorage.getItem(K));
      d.settings.online185 = { automaticArtwork: false, autoSync: false };
      localStorage.setItem(K, JSON.stringify(d));
      localStorage.setItem(
        "mindforge.account.config",
        JSON.stringify({
          url: "https://" + host,
          key: "sb_publishable_qa_test",
        }),
      );
      localStorage.setItem(
        "sb-rowanvale-test-auth-token",
        JSON.stringify(session),
      );
    },
    { K, session, host },
  );
  await page.reload({ waitUntil: "domcontentloaded" });
  await nav("space");
  await check(
    "The bundled real account SDK verifies a session and saves through the versioned RPC",
    async () => {
      await page.waitForFunction(
        () => RVConnect.snapshot().cloud.status === "ready",
        {},
        { timeout: 15000 },
      );
      await page.evaluate(() => RVConnect.open());
      await page.locator("[data-rvc=save-cloud]").click();
      await page.waitForFunction(
        () => RVConnect.snapshot().cloud.status === "synced",
      );
      assert.equal(rpcCalls, 1);
      assert.equal(remote.version, 1);
      assert.ok(authCalls >= 1);
      assert.equal(remote.data.data.profile.name, "Guest Explorer");
      await page.locator("[data-rvc=close]").click();
      await page.locator("#rvc-dialog").waitFor({ state: "detached" });
    },
  );
  await check(
    "Offline profile edits resume cloud sync after reconnect without duplicate writes",
    async () => {
      await page.evaluate(() => RVConnect.open());
      await page.locator("#rvc-preferences [name=autoSync]").check();
      await page.locator("#rvc-preferences [type=submit]").click();
      await page.locator("[data-rvc=close]").click();
      await page.locator("#rvc-dialog").waitFor({ state: "detached" });
      await page.waitForTimeout(1200);
      const before = rpcCalls;
      await context.setOffline(true);
      await page.locator("[data-rvp=edit]").click();
      await page
        .locator('#rvp-editor [data-rvp-field="profile.bio"]')
        .fill("A profile edit made offline.");
      await page
        .locator("#rvp-editor")
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      await page.locator("#rvp-editor").waitFor({ state: "detached" });
      assert.equal(rpcCalls, before);
      await context.setOffline(false);
      await page.evaluate(() => {
        for (let i = 0; i < 5; i++) dispatchEvent(new Event("online"));
      });
      await page.waitForFunction(
        () =>
          RVConnect.snapshot().cloud.status === "synced" &&
          !RVConnect.snapshot().cloud.pending,
        {},
        { timeout: 15000 },
      );
      assert.equal(rpcCalls, before + 1);
      assert.equal(
        remote.data.data.profile.bio,
        "A profile edit made offline.",
      );
    },
  );
  await check(
    "Concurrent cloud changes stop at a conflict without replacing local edits",
    async () => {
      await page.locator("[data-rvp=edit]").click();
      remote = {
        ...remote,
        version: remote.version + 1,
        data: {
          ...remote.data,
          data: {
            ...remote.data.data,
            profile: {
              ...remote.data.data.profile,
              name: "Remote changed name",
            },
          },
        },
      };
      await page
        .locator('#rvp-editor [data-rvp-field="profile.bio"]')
        .fill("A new local edit alongside remote changes.");
      await page
        .locator("#rvp-editor")
        .getByRole("button", { name: "Apply changes", exact: true })
        .click();
      await page.locator("#rvp-editor").waitFor({ state: "detached" });
      await page.waitForFunction(
        () => RVConnect.snapshot().cloud.status === "conflict",
        {},
        { timeout: 10000 },
      );
      assert.equal((await saved()).profile.name, "Guest Explorer");
      assert.ok((await saved()).profile.bio.includes("new local edit"));
      assert.equal(remote.data.data.profile.name, "Remote changed name");
    },
  );
  await check(
    "Permission errors never show a successful sync and never clear local data",
    async () => {
      permissionFail = true;
      await page.evaluate(() => RVConnect.flushCloud(true, "local"));
      assert.equal(
        (await page.evaluate(() => RVConnect.snapshot())).cloud.status,
        "error",
      );
      assert.ok((await saved()).profile.bio.includes("new local edit"));
      assert.equal(remote.data.data.profile.name, "Remote changed name");
    },
  );
  assert.deepEqual(errors, []);
  fs.writeFileSync(
    path.join(OUT, "connectivity-browser-results.json"),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        checks,
        errors,
        externalEvidence:
          "Metadata and Supabase HTTP endpoints are mocked. The bundled Supabase SDK and application lifecycle execute normally. No live user credentials or backend were supplied.",
      },
      null,
      2,
    ),
  );
  await browser.close();
  console.log(
    checks.length +
      " connectivity and actual-SDK integration workflows passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
