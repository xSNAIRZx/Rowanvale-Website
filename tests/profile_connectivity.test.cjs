"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  P = require("../app/profile-core"),
  E = require("../app/enrichment-core"),
  N = require("../app/connection-core");
const data = () => ({
  profile: { name: "Ada", username: "ada", bio: "My chosen bio" },
  settings: {
    theme: "rowan",
    appearanceMode: "light",
    spaceAccent: "#6f9e89",
    spaceFont: "serif",
  },
  backlog: [],
  achievements: [],
  xp: 0,
});
const book = (id = "b") => ({
    id,
    type: "Book",
    title: "A Book",
    status: "Want to Try",
    book: { author: "Writer", pages: 200, progress: 0 },
  }),
  candidate = (v = {}) => ({
    type: "Book",
    title: "A Book",
    author: "Writer",
    provider: "Open Library",
    sourceId: "OL123W",
    artwork: "https://covers.openlibrary.org/b/id/1-L.jpg",
    ...v,
  });
test("profile presets modify profile appearance without changing app appearance", () => {
  const d = data(),
    before = {
      theme: d.settings.theme,
      appearanceMode: d.settings.appearanceMode,
    };
  for (const id of Object.keys(P.PRESETS)) {
    P.applyPreset(d, id);
    assert.equal(P.config(d).preset, id);
    assert.deepEqual(
      { theme: d.settings.theme, appearanceMode: d.settings.appearanceMode },
      before,
    );
  }
  assert.throws(() => P.applyPreset(d, "unknown"));
});
test("legacy profile layout, fonts, section visibility and selected favorites survive", () => {
  const d = data();
  d.settings.spaceLayout = "neon";
  d.settings.spaceOrder = ["links", "games", "about"];
  d.settings.hiddenSpaceSections = ["games"];
  d.profile.favoriteGames = "A Book";
  d.backlog = [book()];
  const c = P.config(d);
  assert.equal(c.preset, "vibrant");
  assert.equal(c.font, "serif");
  assert.ok(c.hidden.includes("featured"));
  assert.equal(c.order[0], "links");
  assert.equal(P.featured(d)[0].id, "b");
});
test("profile remains meaningful with zero stories and never invents achievements", () => {
  const d = data();
  assert.deepEqual(P.stats(d), {
    total: 0,
    active: 0,
    finished: 0,
    formats: 0,
  });
  assert.deepEqual(P.featured(d), []);
  assert.deepEqual(d.achievements, []);
});
test("profile stats and featured selection span all five formats", () => {
  const d = data();
  d.backlog = ["Game", "Book", "Movie", "Show", "Anime"].map((type, i) => ({
    id: String(i),
    title: type,
    type,
    status: i === 0 ? "Finished" : "In Progress",
  }));
  d.settings.profile185 = { featured: ["4", "1"] };
  assert.equal(P.stats(d).formats, 5);
  assert.equal(P.stats(d).finished, 1);
  assert.deepEqual(
    P.featured(d).map((x) => x.type),
    ["Anime", "Book"],
  );
});
test("shared profiles are disabled by default", () => {
  assert.throws(() => P.publicSnapshot(data()), /private/);
  const d = data();
  d.settings.profile185 = { privacy: { enabled: "false" } };
  assert.throws(() => P.publicSnapshot(d), /private/);
});
test("shared snapshot never includes secrets, private notes, wellness, pinboard or email", () => {
  const d = data();
  d.profile.email = "private@example.test";
  d.profile.anthemAudio = "private-audio";
  d.moodLog = [{ mood: "SENSITIVE" }];
  d.guestbook = [{ text: "PRIVATE PIN" }];
  d.backlog = [
    {
      ...book(),
      note: "SECRET REVIEW",
      metadata184: {
        description: "private synopsis",
        artwork: "/api/artwork/file/" + "a".repeat(64) + ".jpg",
      },
    },
  ];
  d.connections = {
    spotify: { clientId: "PRIVATE ID", refreshToken: "PRIVATE TOKEN" },
  };
  d.settings.profile185 = { privacy: { enabled: true } };
  const s = P.publicSnapshot(d),
    raw = JSON.stringify(s);
  for (const secret of [
    "private@example",
    "SENSITIVE",
    "PRIVATE PIN",
    "SECRET REVIEW",
    "PRIVATE TOKEN",
    "PRIVATE ID",
    "private-audio",
    "private synopsis",
  ])
    assert.ok(!raw.includes(secret), secret);
  assert.equal(s.collection, undefined);
  assert.equal(s.activity, undefined);
  assert.equal(s.links, undefined);
  assert.equal(s.featured.length, 1);
});
test("each additional shared section needs an explicit boolean choice", () => {
  const d = data();
  d.settings.spaceLinks = [{ label: "My site", url: "https://example.test" }];
  d.settings.spaceTopFriends = ["f"];
  d.friends = [
    { id: "f", name: "Friend", email: "secret@example.test", note: "secret" },
  ];
  d.settings.profile185 = {
    privacy: { enabled: true, connections: true, crew: true, stats: true },
  };
  const s = P.publicSnapshot(d);
  assert.equal(s.links.length, 1);
  assert.deepEqual(s.crew, [{ name: "Friend" }]);
  assert.equal(s.stats.total, 0);
  assert.ok(!JSON.stringify(s).includes("secret"));
});
test("manual cover removal and broken covers use a fallback without exposing an invalid URL", () => {
  const x = book();
  x.background_image = "https://images.igdb.com/a.jpg";
  x.metadata184 = { artwork: "", manualFields: ["artwork"] };
  assert.equal(P.artwork(x), "");
  x.metadata184 = {
    artwork: "https://covers.openlibrary.org/b/id/1-L.jpg",
    artworkBrokenAt: 1,
  };
  assert.equal(P.artwork(x), "");
});
test("profile validation rejects invalid usernames, schemes, oversized featured lists and low-contrast text is corrected", () => {
  const d = data();
  d.profile.username = "bad handle";
  assert.throws(() => P.validateDraft(d), /username/);
  d.profile.username = "valid_user";
  d.settings.spaceLinks = [{ url: "javascript:alert(1)" }];
  assert.throws(() => P.validateDraft(d), /HTTPS/);
  d.settings.spaceLinks = [];
  d.settings.profile185 = {
    featured: Array.from({ length: 13 }, (_, i) => String(i)),
  };
  assert.throws(() => P.validateDraft(d), /twelve/);
  assert.ok(P.contrast(P.readable("#ffffff", "#faf8f1"), "#faf8f1") >= 4.5);
  assert.ok(P.contrast(P.readable("#000000", "#11262b"), "#11262b") >= 4.5);
});
test("title-only lookups never silently choose the first cover", () => {
  const x = { id: "m", title: "Dune", type: "Movie" };
  assert.equal(
    E.rank(x, [
      { title: "Dune", type: "Movie", year: 1984 },
      { title: "Dune", type: "Movie", year: 2021 },
    ]).automatic,
    false,
  );
});
test("exact title and author resolve a unique book automatically", () => {
  const r = E.rank(book(), [
    candidate(),
    candidate({ title: "Another Book", author: "Other" }),
  ]);
  assert.equal(r.automatic, true);
  assert.ok(r.best.reasons.includes("Matching author / creator"));
});
test("conflicting years, formats, creators, ISBNs and platforms prevent automatic matching", () => {
  for (const [x, c] of [
    [
      { ...book(), book: { author: "Writer", year: 2000 } },
      candidate({ year: 2020 }),
    ],
    [book(), candidate({ type: "Movie" })],
    [book(), candidate({ author: "Someone Else" })],
    [
      { ...book(), book: { isbn: "9781234567897" } },
      candidate({ isbn: "9789876543217" }),
    ],
    [
      {
        id: "g",
        type: "Game",
        title: "A Game",
        platform: "Switch",
        metadata184: { year: 2020 },
      },
      { type: "Game", title: "A Game", year: 2020, platforms: "PlayStation 5" },
    ],
  ])
    assert.equal(E.rank(x, [c]).automatic, false);
});
test("provider IDs and normalized ISBNs beat fuzzy title matching", () => {
  const x = {
    ...book(),
    metadata184: { provider: "Open Library", sourceId: "OL123W" },
  };
  assert.equal(
    E.rank(x, [candidate({ title: "A Book: Another Language" })]).automatic,
    true,
  );
  assert.equal(E.isbn("0-306-40615-2"), "9780306406157");
  const b = { ...book(), book: { isbn: "0306406152" } };
  assert.equal(
    E.rank(b, [
      candidate({ isbn: "9780306406157", title: "Different edition title" }),
    ]).automatic,
    true,
  );
});
test("equal-confidence matches require explicit review", () =>
  assert.equal(
    E.rank(book(), [candidate(), candidate({ sourceId: "OL456W" })]).automatic,
    false,
  ));
test("known ISBNs generate edition-specific covers ahead of aggregate cover IDs", () => {
  const x = book();
  x.book.isbn = "0306406152";
  x.book.coverId = 123;
  assert.match(E.deterministic(x).artwork, /isbn\/9780306406157/);
  x.metadata184 = { manualFields: ["artwork"] };
  assert.equal(E.deterministic(x), null);
});
test("persistent jobs deduplicate reconnects and survive JSON round-trips", () => {
  const x = book();
  let q = E.enqueue([], [x]);
  q = E.enqueue(JSON.parse(JSON.stringify(q)), [x]);
  assert.equal(q.length, 1);
  q[0].state = "review";
  assert.equal(E.enqueue(q, [x])[0].state, "review");
  x.title = "Changed";
  assert.equal(E.enqueue(q, [x])[0].state, "queued");
});
test("missing matches are negatively cached; transient retries and rate limits are bounded", () => {
  const x = book();
  let q = E.enqueue([], [x], 0);
  q[0].state = "unavailable";
  q[0].updatedAt = 100;
  assert.equal(E.enqueue(q, [x], 200)[0].state, "unavailable");
  const j = E.newJob(x);
  E.retry(j, { status: 429, retryAfter: 90, message: "rate" }, 0);
  assert.equal(j.nextAt, 90000);
  E.retry(j, { message: "offline" }, 100000);
  E.retry(j, { message: "offline" }, 120000);
  assert.equal(j.state, "failed");
  const auth = E.newJob(x);
  E.retry(auth, { status: 412, message: "key required" });
  assert.equal(auth.state, "setup-needed");
});
test("public-key validation rejects privileged JWT and new secret key formats", () => {
  const jwt = (role) =>
    "e30." +
    Buffer.from(JSON.stringify({ role })).toString("base64url") +
    ".sig";
  assert.throws(() => N.publicKey(jwt("service_role")), /privileged/);
  assert.throws(() => N.publicKey("sb_secret_123"), /Secret/);
  assert.equal(N.publicKey(jwt("anon")), jwt("anon"));
  assert.throws(
    () => N.configuration("http://project.test", "public"),
    /HTTPS/,
  );
  assert.throws(
    () => N.configuration("https://project.test/path", "public"),
    /origin/,
  );
});
test("single-flight prevents concurrent duplicate work and permits a later retry", async () => {
  const gate = new N.SingleFlight();
  let calls = 0;
  const f = () =>
    new Promise((r) =>
      setTimeout(() => {
        calls++;
        r(1);
      }, 5),
    );
  await Promise.all([gate.run(f), gate.run(f), gate.run(f)]);
  assert.equal(calls, 1);
  await gate.run(f);
  assert.equal(calls, 2);
});
function cloud({
  remote = null,
  saved = {},
  userId = "user-a",
  delay = 0,
  canReplace = () => true,
} = {}) {
  let workspace = {
      schemaVersion: 6,
      profile: { name: "Ada" },
      settings: {},
      backlog: [],
    },
    write = null,
    calls = 0,
    replaces = 0,
    state = {};
  const client = {
    auth: {
      getSession: async () => ({
        data: {
          session: {
            user: { id: userId },
            expires_at: Date.now() / 1000 + 1000,
          },
        },
      }),
      refreshSession: async () => ({
        data: { session: { user: { id: userId } } },
      }),
      getUser: async () => ({ data: { user: { id: userId } } }),
    },
    from: () => ({
      select: () => ({
        eq: (field, id) => {
          assert.equal(id, userId);
          return { maybeSingle: async () => ({ data: remote }) };
        },
      }),
    }),
    rpc: async (name, args) => {
      calls++;
      assert.equal(name, "rowanvale_compare_and_save");
      assert.equal(args.p_user_id, userId);
      write = args;
      if (delay) await new Promise((r) => setTimeout(r, delay));
      return { data: { version: (remote?.version || 0) + 1 } };
    },
  };
  const sync = N.createSync({
    client,
    getData: () => workspace,
    canReplace,
    replace: (v) => {
      workspace = v;
      replaces++;
    },
    validate: (v) => v.data || v,
    digest: async (v) => N.stable(v),
    readState: () => saved,
    writeState: (s) => (state = s),
  });
  return {
    sync,
    client,
    get workspace() {
      return workspace;
    },
    get write() {
      return write;
    },
    get calls() {
      return calls;
    },
    get replaces() {
      return replaces;
    },
    get state() {
      return state;
    },
    setRemote: (r) => (remote = r),
  };
}
test("automatic cloud sync requires a first-time account binding", async () => {
  const c = cloud();
  await c.sync.flush();
  assert.equal(c.calls, 0);
  assert.equal(c.sync.snapshot().status, "review-needed");
  await c.sync.flush({ explicit: true });
  assert.equal(c.calls, 1);
  assert.equal(c.write.p_expected_version, 0);
  assert.equal(c.state.owner, "user-a");
});
test("cloud saves share one flight, retain queued edits and send the verified actor ID", async () => {
  const c = cloud({ saved: { owner: "user-a" }, delay: 10 });
  await Promise.all([c.sync.flush(), c.sync.flush(), c.sync.flush()]);
  assert.equal(c.calls, 1);
  assert.equal(c.state.pending, false);
});
test("a first sync never overwrites an existing different cloud copy automatically", async () => {
  const c = cloud({
    remote: {
      version: 3,
      data: {
        schemaVersion: 6,
        profile: { name: "Remote" },
        settings: {},
        backlog: [],
      },
    },
  });
  await c.sync.flush({ explicit: true });
  assert.equal(c.sync.snapshot().status, "conflict");
  assert.equal(c.calls, 0);
  assert.equal(c.replaces, 0);
});
test("both changed copies stop at conflict; explicit local resolution uses the current version", async () => {
  const c = cloud({
    saved: { owner: "user-a", version: 1, cleanHash: "old" },
    remote: {
      version: 2,
      data: { profile: { name: "Remote" }, settings: {}, backlog: [] },
    },
  });
  await c.sync.flush();
  assert.equal(c.sync.snapshot().status, "conflict");
  assert.equal(c.calls, 0);
  await c.sync.flush({ explicit: true, resolution: "local" });
  assert.equal(c.calls, 1);
  assert.equal(c.write.p_expected_version, 2);
});
test("a clean local workspace accepts a verified newer cloud copy", async () => {
  const local = {
    schemaVersion: 6,
    profile: { name: "Ada" },
    settings: {},
    backlog: [],
  };
  const c = cloud({
    saved: { owner: "user-a", version: 1, cleanHash: N.stable(local) },
    remote: {
      version: 2,
      data: {
        schemaVersion: 6,
        profile: { name: "Remote" },
        settings: {},
        backlog: [],
      },
    },
  });
  await c.sync.flush();
  assert.equal(c.replaces, 1);
  assert.equal(c.workspace.profile.name, "Remote");
  assert.equal(c.calls, 0);
});
test("explicit restore validates and replaces only after the read succeeds", async () => {
  const c = cloud({
    remote: {
      version: 3,
      data: { profile: { name: "Restored" }, settings: {}, backlog: [] },
    },
  });
  await c.sync.flush({ explicit: true, resolution: "remote" });
  assert.equal(c.workspace.profile.name, "Restored");
  assert.equal(c.state.version, 3);
});
test("account switching cannot automatically upload the previous account workspace", async () => {
  const c = cloud({
    userId: "user-b",
    saved: { owner: "user-a", version: 1, cleanHash: "old" },
  });
  await c.sync.flush();
  assert.equal(c.calls, 0);
  assert.equal(c.sync.snapshot().status, "review-needed");
});
test("permission failures never display a successful cloud receipt", async () => {
  const c = cloud({ saved: { owner: "user-a" } });
  c.client.rpc = async () => ({
    error: { code: "42501", message: "Permission denied" },
  });
  await assert.rejects(() => c.sync.flush(), /Permission denied|./);
  assert.equal(c.sync.snapshot().status, "error");
  assert.equal(c.state.lastSync, undefined);
});
test("compare-and-save conflicts and missing migrations leave the local copy intact", async () => {
  const c = cloud({ saved: { owner: "user-a" } });
  c.client.rpc = async () => ({ error: { code: "40001", message: "changed" } });
  await c.sync.flush();
  assert.equal(c.sync.snapshot().status, "conflict");
  assert.equal(c.workspace.profile.name, "Ada");
  const m = cloud({ remote: { data: { profile: { name: "old" } } } });
  await assert.rejects(() => m.sync.flush());
  assert.equal(m.sync.snapshot().status, "setup-needed");
});
test("authentication errors and expired sessions do not remove local edits", async () => {
  const c = cloud({ saved: { owner: "user-a" } });
  c.client.auth.getSession = async () => ({ data: { session: null } });
  await c.sync.flush();
  assert.equal(c.sync.snapshot().status, "signed-out");
  assert.equal(c.calls, 0);
  c.client.auth.getSession = async () => ({
    data: { session: { expires_at: 0 } },
  });
  c.client.auth.getUser = async () => ({ error: Error("Session revoked") });
  await assert.rejects(() => c.sync.flush(), /Session revoked/);
  assert.equal(c.workspace.profile.name, "Ada");
});
test("Spotify renewal is deduplicated and retains rotated refresh tokens", async () => {
  let stored = {
      accessToken: "old",
      refreshToken: "refresh",
      clientId: "client",
      expiresAt: 0,
    },
    calls = 0;
  const s = N.createOAuthSession({
    load: () => stored,
    store: (v) => (stored = v),
    fetcher: async () => {
      calls++;
      return new Response(
        JSON.stringify({
          access_token: "new",
          refresh_token: "rotated",
          expires_in: 3600,
        }),
        { status: 200 },
      );
    },
  });
  assert.deepEqual(await Promise.all([s.token(), s.token(), s.token()]), [
    "new",
    "new",
    "new",
  ]);
  assert.equal(calls, 1);
  assert.equal(stored.refreshToken, "rotated");
});
test("revoked Spotify grants require reconnection; temporary outages retain credentials", async () => {
  for (const permanent of [true, false]) {
    let stored = { refreshToken: "r", clientId: "c", expiresAt: 0 },
      error = "";
    const s = N.createOAuthSession({
      load: () => stored,
      store: (v) => (stored = v),
      onError: (v) => (error = v),
      fetcher: async () => {
        if (!permanent) throw Error("Network interrupted");
        return new Response(JSON.stringify({ error: "invalid_grant" }), {
          status: 400,
        });
      },
    });
    assert.equal(await s.token(), "");
    assert.ok(error);
    assert.equal(stored === null, permanent);
  }
});
test("Spotify Retry-After cooldown prevents immediate repeated token requests", async () => {
  let stored = { refreshToken: "r", clientId: "c", expiresAt: 0 },
    calls = 0;
  const s = N.createOAuthSession({
    load: () => stored,
    store: (v) => (stored = v),
    now: () => 1000,
    fetcher: async () => {
      calls++;
      return new Response("{}", {
        status: 429,
        headers: { "retry-after": "90" },
      });
    },
  });
  await s.token();
  await s.token();
  assert.equal(calls, 1);
  assert.equal(stored.retryAt, 91000);
});
test("matching a game requires actual platform or creator evidence, not merely a supplied field", () => {
  const x = {
    id: "g",
    type: "Game",
    title: "Game",
    metadata184: { year: 2020, platforms: "PC", author: "Studio" },
  };
  assert.equal(
    E.rank(x, [{ type: "Game", title: "Game", year: 2020 }]).automatic,
    false,
  );
});
test("concurrent identical provider searches share a single upstream request", async () => {
  const { createMetadataService } = require("../app/metadata-service");
  let calls = 0;
  const s = createMetadataService({
    env: {},
    fetcher: async () => {
      calls++;
      await new Promise((r) => setTimeout(r, 5));
      return new Response(
        JSON.stringify({ docs: [{ title: "Book", key: "/works/OL1W" }] }),
      );
    },
  });
  await Promise.all([
    s.search("Book", "one title"),
    s.search("Book", "one title"),
    s.search("Book", "one title"),
  ]);
  assert.equal(calls, 1);
});
test("public media snapshots exclude device-only cached artwork URLs at the source", () => {
  const d = data();
  d.settings.profile185 = { privacy: { enabled: true } };
  d.backlog = [
    {
      ...book(),
      metadata184: { artwork: "/api/artwork/file/" + "a".repeat(64) + ".jpg" },
    },
  ];
  assert.ok(!JSON.stringify(P.publicSnapshot(d)).includes("/api/artwork"));
});

test("newer cloud data waits for an active editor, then restores after the draft closes", async () => {
  const local = {
    schemaVersion: 6,
    profile: { name: "Ada" },
    settings: {},
    backlog: [],
  };
  let editing = true;
  const c = cloud({
    canReplace: () => !editing,
    saved: { owner: "user-a", version: 1, cleanHash: N.stable(local) },
    remote: { version: 2, data: { ...local, profile: { name: "Remote" } } },
  });
  await c.sync.flush();
  assert.equal(c.replaces, 0);
  assert.equal(c.sync.snapshot().status, "waiting");
  editing = false;
  await c.sync.flush();
  assert.equal(c.replaces, 1);
  assert.equal(c.workspace.profile.name, "Remote");
});
