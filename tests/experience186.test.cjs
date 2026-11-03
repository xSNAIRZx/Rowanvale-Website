"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  T = require("../app/reset-core186"),
  Q = require("../app/artwork-queue186"),
  { createMetadataService } = require("../app/metadata-service");
test("guided sessions use deadlines rather than interval counts", () => {
  const s = T.create("breathe", 60, 100, "s");
  T.resume(s, 100);
  assert.equal(T.remaining(s, 35100), 25000);
  T.tick(s, 60100);
  assert.equal(s.status, "complete");
  assert.equal(T.remaining(s, 60100), 0);
});
test("pause and resume preserve elapsed time without counting a long break", () => {
  const s = T.create("rest", 120, 0, "x");
  T.resume(s, 1000);
  T.pause(s, 31000);
  assert.equal(s.elapsed, 30000);
  assert.equal(T.remaining(s, 200000), 90000);
  T.resume(s, 200000);
  assert.equal(T.remaining(s, 210000), 80000);
});
test("recovery never resumes a timer or sound automatically", () => {
  const s = T.restore({
    ...T.create("breathe", 60, 0, "r"),
    elapsed: 12000,
    status: "running",
    deadline: 60000,
  });
  assert.equal(s.status, "paused");
  assert.equal(T.remaining(s, 999999), 48000);
});
test("corrupt and oversized session recovery is rejected", () => {
  for (const s of [
    null,
    {},
    { id: "x", kind: "breathe", duration: 1000 },
    { id: "x", kind: "rest", duration: 99999999 },
  ])
    assert.equal(T.restore(s), null);
});
test("breathing phase follows elapsed time and pauses in place", () => {
  const s = T.create("breathe", 60, 0, "p");
  T.resume(s, 0);
  assert.equal(T.phase(s, 4100).step, 1);
  T.pause(s, 8100);
  assert.equal(T.phase(s, 900000).step, 2);
});
test("visible work is selected before a large earlier background queue", () => {
  const jobs = Array.from({ length: 100 }, (_, i) => ({
    id: "" + i,
    itemId: "" + i,
    state: "queued",
    nextAt: 0,
    createdAt: i,
  }));
  assert.equal(
    Q.select(jobs, { visible: ["99"], featured: ["90"] }, 100, {
      start: 0,
      used: 12,
    }).itemId,
    "99",
  );
});
test("featured and nearby work has priority while preserving stable background order", () => {
  const jobs = ["background", "near", "featured"].map((id, i) => ({
    id,
    itemId: id,
    state: "queued",
    createdAt: i,
  }));
  assert.equal(
    Q.select(jobs, { featured: ["featured"], nearby: ["near"] }, 10, {
      start: 0,
      used: 0,
    }).itemId,
    "featured",
  );
});
test("interactive artwork is not blocked by the separate twelve-story bulk budget", () => {
  const j = { itemId: "visible" };
  assert.equal(Q.permitted(j, { visible: ["visible"] }, { used: 12 }), true);
  assert.equal(Q.permitted(j, { visible: [] }, { used: 12 }), false);
});
test("a formerly budget-deferred visible item becomes immediately eligible", () => {
  const j = {
    id: "j",
    itemId: "v",
    state: "queued",
    budgetDeferred: true,
    nextAt: 3600000,
  };
  assert.equal(
    Q.select([j], { visible: ["v"] }, 100, { start: 0, used: 12 }),
    j,
  );
});
test("visible priority never bypasses Retry-After or an ambiguous match review", () => {
  const jobs = [
    { id: "r", itemId: "v", state: "retry", nextAt: 1000 },
    { id: "review", itemId: "v", state: "review", nextAt: 0 },
  ];
  assert.equal(
    Q.select(jobs, { visible: ["v"] }, 500, { start: 0, used: 12 }),
    null,
  );
});
test("legacy numeric anime IDs keep TV details while film IDs use the movie endpoint", async () => {
  const urls = [],
    service = createMetadataService({
      env: { TMDB_READ_TOKEN: "test" },
      now: () => Date.now() + urls.length * 2000,
      fetcher: async (u) => {
        urls.push(String(u));
        return new Response(
          JSON.stringify({
            id: 129,
            title: "Spirited Away",
            name: "Example series",
            overview: "Description",
            poster_path: "/poster.jpg",
            release_date: "2001-07-20",
            genres: [{ name: "Animation" }],
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    });
  const film = await service.details("Anime", "TMDB", "movie:129");
  assert.equal(film.result.sourceId, "movie:129");
  assert.ok(urls[0].includes("/movie/129"));
  await service.details("Anime", "TMDB", "129");
  assert.ok(urls[1].includes("/tv/129"));
});
test("anime searches include animated films and series without mixing their provider identities", async () => {
  const urls = [],
    service = createMetadataService({
      env: { TMDB_READ_TOKEN: "test" },
      now: () => Date.now() + urls.length * 2000,
      fetcher: async (u) => {
        urls.push(String(u));
        return new Response(
          JSON.stringify({
            results: [
              {
                id: 129,
                title: "Spirited Away",
                name: "Animated series",
                genre_ids: [16],
                release_date: "2001-07-20",
                poster_path: "/p.jpg",
              },
            ],
          }),
          { headers: { "content-type": "application/json" } },
        );
      },
    });
  const r = await service.search("Anime", "Spirited Away");
  assert.ok(r.results.some((x) => x.sourceId === "129"));
  assert.ok(r.results.some((x) => x.sourceId === "movie:129"));
  assert.equal(urls.length, 2);
});

test("visible artwork keeps the current shelf order ahead of old queue order", () => {
  const jobs = ["last", "first"].map((id, i) => ({
    id,
    itemId: id,
    state: "queued",
    createdAt: i,
  }));
  assert.equal(
    Q.select(jobs, { visible: ["first", "last"] }, 10, { start: 0, used: 12 })
      .itemId,
    "first",
  );
});
test("identified anime films use a single film completion instead of season/episode awards", () => {
  const C = require("../app/living-core"),
    x = {
      id: "anime-film",
      type: "Anime",
      title: "Spirited Away",
      status: "Want to Try",
      metadata184: { provider: "TMDB", sourceId: "movie:129" },
    },
    d = C.migrate({
      xp: 0,
      xpEvents: [],
      settings: {},
      backlog: [x],
      achievements: [],
    });
  assert.equal(C.isFilm(x), true);
  C.progress(d, x.id, { finished: true, progress: 0 });
  assert.equal(d.xp, d.living184.rewards.movie);
  const xp = d.xp;
  C.progress(d, x.id, { finished: true });
  assert.equal(d.xp, xp);
  assert.ok(!d.xpEvents.some((e) => /:s1:/.test(e.key)));
});

test("bundled title deduplication combines repeated game cards and their tags", () => {
  const I = require("../app/title-index186"),
    a = [
      { name: "Celeste", tags: ["Platformer"] },
      { name: "celeste", tags: ["Indie"] },
    ],
    out = I.dedupe(a);
  assert.equal(out.length, 1);
  assert.deepEqual(out[0].tags, ["Platformer", "Indie"]);
  assert.equal(out[0].name, "Celeste");
  assert.equal(a.length, 2);
});
test("same-title remakes, provider records and editions stay separate", () => {
  const I = require("../app/title-index186");
  for (const field of ["year", "sourceId", "edition"]) {
    const values = field === "year" ? [1967, 2006] : ["first", "second"];
    assert.equal(
      I.dedupe(values.map((v) => ({ name: "Same title", [field]: v }))).length,
      2,
    );
  }
});

test("an identified anime film earns the film milestone rather than a series milestone", () => {
  const C = require("../app/living-core"),
    x = {
      id: "film-badge",
      type: "Anime",
      title: "Spirited Away",
      metadata184: { provider: "TMDB", sourceId: "movie:129" },
    },
    d = C.migrate({
      xp: 0,
      xpEvents: [],
      settings: {},
      backlog: [x],
      achievements: [],
    });
  C.progress(d, x.id, { finished: true });
  C.achievements(d);
  assert.ok(d.achievements.some((x) => x.id === "living-movie-night"));
  assert.ok(!d.achievements.some((x) => x.id === "living-series-completed"));
});
