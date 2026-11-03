"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict");
const BASE = process.env.ROWANVALE_TEST_URL || "http://localhost:8188";
const headers = {
  Origin: BASE,
  "Content-Type": "application/json",
  "X-Rowanvale-Intent": "resolve-artwork",
};
test("automatic artwork API rejects cross-origin and malformed requests", async () => {
  let r = await fetch(BASE + "/api/artwork/resolve", {
    method: "POST",
    headers: { ...headers, Origin: "https://example.test" },
    body: JSON.stringify({ items: [] }),
  });
  assert.equal(r.status, 403);
  r = await fetch(BASE + "/api/artwork/resolve", {
    method: "POST",
    headers,
    body: "{",
  });
  assert.equal(r.status, 400);
});
test("automatic artwork endpoint validates categories and batch size before network work", async () => {
  for (const items of [
    [{ type: "Audio", title: "Invalid" }],
    Array.from({ length: 17 }, () => ({ type: "Movie", title: "Fixture" })),
  ]) {
    const r = await fetch(BASE + "/api/artwork/resolve", {
      method: "POST",
      headers,
      body: JSON.stringify({ items }),
    });
    assert.equal(r.status, 400);
  }
});
test("cover service and metadata implementation files remain private", async () => {
  for (const name of ["cover-service1861.js", "metadata-service.js", ".env"])
    assert.equal((await fetch(BASE + "/" + name)).status, 404);
});
test("the fresh-build launch page bypasses the old shell without clearing saved data", async () => {
  const r = await fetch(BASE + "/api/launch"),
    s = await r.text();
  assert.equal(r.status, 200);
  assert.match(r.headers.get("content-type"), /text\/html/);
  assert.ok(s.includes("</script>"));
  assert.match(s, /reg\.unregister/);
  assert.ok(!/localStorage\.clear|caches\.delete/.test(s));
  assert.match(s, /build=1\.0\.0/);
});
