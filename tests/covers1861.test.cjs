"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  os = require("node:os"),
  path = require("node:path"),
  C = require("../app/living-core"),
  {
    createCoverService,
    fileImage,
    descriptor,
    key,
  } = require("../app/cover-service1861");
const item = (over = {}) => ({
  type: "Game",
  title: "Known Game",
  year: 2018,
  ...over,
});
const page = (over = {}) => ({
  title: "Known Game (video game)",
  description: "2018 video game",
  pageimage: "Known_Game_cover.png",
  thumbnail: {
    source:
      "https://upload.wikimedia.org/wikipedia/en/a/a0/Known_Game_cover.png",
    width: 400,
    height: 600,
  },
  pageprops: { wikibase_item: "Q123", page_image: "Known_Game_cover.png" },
  ...over,
});
test("matched media posters are accepted with source/file attribution", () => {
  const p = fileImage(page(), item());
  assert.equal(p.state, "ready");
  assert.match(p.fileUrl, /File:/);
  assert.equal(p.cacheAllowed, false);
});
test("an exact canonical entity outranks a different local release year", () => {
  assert.equal(fileImage(page(), item({ year: 2019 }), "Q123").state, "ready");
  assert.equal(fileImage(page(), item({ year: 2019 })), null);
});
test("a mismatched entity or disambiguation page never provides an automatic poster", () => {
  assert.equal(fileImage(page(), item(), "Q999"), null);
  assert.equal(
    fileImage(page({ pageprops: { disambiguation: "" } }), item()),
    null,
  );
});
test("logos and screenshots are rejected even on the correct media article", () => {
  for (const name of [
    "Known_Game_logo.png",
    "Known_Game_screenshot.jpg",
    "Known_Game_cosplay.jpg",
  ])
    assert.equal(fileImage(page({ pageimage: name }), item(), "Q123"), null);
});
test("only exact Wikimedia image hosts are accepted by the public source", () => {
  for (const src of [
    "http://upload.wikimedia.org/a.jpg",
    "https://upload.wikimedia.org.evil.test/a.jpg",
    "https://127.0.0.1/a.jpg",
  ])
    assert.equal(
      fileImage(
        page({ thumbnail: { source: src, width: 400, height: 600 } }),
        item(),
      ),
      null,
    );
});
test("game articles cannot supply covers to movie records", () => {
  assert.equal(fileImage(page(), item({ type: "Movie" })), null);
});
test("book matches require matching supplied author evidence", () => {
  const p = page({
    title: "A Novel",
    description: "1900 novel by Jane Writer",
    extract: "A Novel is a book by Jane Writer.",
    pageimage: "A_Novel_first_edition.jpg",
  });
  assert.ok(
    fileImage(
      p,
      item({
        type: "Book",
        title: "A Novel",
        year: 1900,
        author: "Jane Writer",
      }),
    ),
  );
  assert.equal(
    fileImage(
      p,
      item({
        type: "Book",
        title: "A Novel",
        year: 1900,
        author: "Other Author",
      }),
    ),
    null,
  );
});
test("an authenticated source identity can use a non-free lead poster with a spelled-out filename", () => {
  const p = page({
    title: "500 Days of Summer",
    description: "2009 film",
    pageimage: "Five_hundred_days_of_summer.jpg",
    pageprops: {
      wikibase_item: "Q154935",
      page_image: "Five_hundred_days_of_summer.jpg",
    },
  });
  assert.ok(
    fileImage(
      p,
      item({ type: "Movie", title: "(500) Days of Summer", year: 2009 }),
      "Q154935",
    ),
  );
});
test("old and new artwork hosts pass the shared image validator without accepting lookalikes", () => {
  for (const host of [
    "upload.wikimedia.org",
    "thumb.wikimedia.org",
    "static.tvmaze.com",
    "covers.openlibrary.org",
  ])
    assert.ok(C.safeImage("https://" + host + "/cover.jpg"));
  assert.equal(
    C.safeImage("https://static.tvmaze.com.evil.test/cover.jpg"),
    "",
  );
});
test("artwork source credits survive the actual workspace metadata sanitizer", () => {
  const m = C.sanitizeMetadata({
    artwork: "https://upload.wikimedia.org/cover.jpg",
    artworkProvider: "Wikipedia",
    artworkSourceUrl: "https://en.wikipedia.org/wiki/File:Cover.jpg",
    artworkAttribution: "Original rights retained.",
  });
  assert.equal(m.artworkProvider, "Wikipedia");
  assert.match(m.artworkSourceUrl, /File:/);
  assert.equal(m.artworkAttribution, "Original rights retained.");
});
test("malformed, oversized and unsupported lookup requests are rejected", async () => {
  const s = createCoverService();
  await assert.rejects(s.resolve(Array(17).fill(item())), /sixteen/);
  await assert.rejects(
    s.resolve([{ type: "Audio", title: "Anything" }]),
    /valid/,
  );
  await assert.rejects(
    s.resolve([{ type: "Game", title: "x".repeat(181) }]),
    /valid/,
  );
});
test("descriptor allowlist never forwards private notes, email or tokens", () => {
  const v = descriptor({
    ...item(),
    note: "PRIVATE",
    email: "PRIVATE",
    token: "PRIVATE",
  });
  assert.equal(JSON.stringify(v).includes("PRIVATE"), false);
});
const fixture = () => {
  let calls = 0;
  return {
    get calls() {
      return calls;
    },
    fetcher: async (url) => {
      calls++;
      const u = new URL(url);
      return new Response(JSON.stringify({ query: { pages: [page()] } }), {
        headers: { "content-type": "application/json" },
      });
    },
  };
};
test("concurrent identical lookups share one source request", async () => {
  const f = fixture(),
    s = createCoverService({ fetcher: f.fetcher });
  const [a, b] = await Promise.all([s.resolve([item()]), s.resolve([item()])]);
  assert.equal(f.calls, 1);
  assert.equal(a.results[0].state, "ready");
  assert.equal(b.results[0].state, "ready");
});
test("a multi-item page lookup batches titles and preserves response order", async () => {
  let calls = 0;
  const s = createCoverService({
    fetcher: async () => {
      calls++;
      return new Response(
        JSON.stringify({
          query: {
            pages: [
              page(),
              page({
                title: "Another Game (video game)",
                pageimage: "Another_Game_cover.png",
              }),
            ],
          },
        }),
      );
    },
  });
  const r = await s.resolve([item(), item({ title: "Another Game" })]);
  assert.equal(calls, 1);
  assert.equal(r.results[0].matchedTitle, "Known Game (video game)");
  assert.equal(r.results[1].matchedTitle, "Another Game (video game)");
});
test("successful URL/credit results persist across a service restart", async () => {
  const f = fixture(),
    dir = fs.mkdtempSync(path.join(os.tmpdir(), "rowanvale-covers-")),
    cacheFile = path.join(dir, "index.json");
  const a = createCoverService({ fetcher: f.fetcher, cacheFile });
  await a.resolve([item()]);
  await new Promise((r) => setTimeout(r, 250));
  const b = createCoverService({
    fetcher: () => {
      throw Error("Cache was not reused");
    },
    cacheFile,
  });
  const result = await b.resolve([item()]);
  assert.equal(result.results[0].cached, true);
  assert.equal(result.results[0].state, "ready");
});
test("source failures remain explicit and are not reported as loaded covers", async () => {
  const s = createCoverService({
    fetcher: async () => {
      throw Error("Offline");
    },
  });
  const r = await s.resolve([item()]);
  assert.equal(r.results[0].state, "error");
  assert.match(r.results[0].reason, /could not be reached/);
  assert.equal(r.results[0].artwork, undefined);
});
