"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../app/wellbeing-core193.js");
const fixture = () => ({
  reflections: [
    {
      date: "2025-01-01",
      kind: "reset-plan",
      hard: "hard thing",
      text: "Recovered old journal",
    },
    { date: "2025-01-02", kind: "journal", text: "A good book" },
  ],
  moodLog: [{ date: "2025-01-02", mood: "Okay" }],
  wellnessSessions: [],
  focusLog: [],
  playLog: [],
});
test("Private timeline includes legacy misplaced journal text without changing records", () => {
  const d = fixture(),
    before = JSON.stringify(d),
    rows = C.rows(d);
  assert.equal(rows.length, 3);
  assert.match(
    rows.find((r) => r.record.kind === "reset-plan").text,
    /Recovered old journal/,
  );
  assert.equal(JSON.stringify(d), before);
});
test("Search, dates and categories combine without interpreting mood", () => {
  assert.equal(
    C.filter(C.rows(fixture()), {
      query: "BOOK",
      from: "2025-01-02",
      to: "2025-01-02",
      source: "reflections",
    }).length,
    1,
  );
  assert.equal(C.filter(C.rows(fixture()), { from: "2026-01-01" }).length, 0);
});
test("Edit preserves metadata and stale writes are rejected", () => {
  const d = fixture(),
    r = C.rows(d).find((r) => r.record.kind === "journal"),
    op = C.edit(d, r, { text: "Changed" });
  assert.equal(d.reflections[1].date, "2025-01-02");
  assert.throws(() => C.edit(d, r, { text: "Stale" }), /changed/);
  C.undo(d, op);
  assert.equal(d.reflections[1].text, "A good book");
  assert.throws(() => C.edit(d, r, { xp: "999" }), /Invalid/);
});
test("Deletion can be undone without losing unrelated new entries", () => {
  const d = fixture(),
    r = C.rows(d)[0],
    op = C.remove(d, r);
  d.reflections.unshift({ date: "2025-02-01", text: "New" });
  C.undo(d, op);
  assert.ok(d.reflections.some((x) => x.text === "New"));
  assert.ok(d.reflections.some((x) => x.text === "A good book"));
});
test("Export includes exactly chosen records, and CSV prevents formula execution", () => {
  const d = fixture();
  d.reflections[1].text = "=DANGEROUS()";
  const selected = C.rows(d).filter((r) => r.record.kind === "journal");
  const json = C.exportJSON(selected);
  assert.equal(json.records.length, 1);
  assert.equal(json.format, "rowanvale-private-history");
  d.playLog = [{ date: "2025-03-01", title: "=DANGEROUS()" }];
  assert.match(C.exportCSV(C.rows(d)), /"'=DANGEROUS\(\)"/);
});
test("Large histories are not truncated during read, edit or export", () => {
  const d = {
    reflections: Array.from({ length: 500 }, (_, i) => ({
      id: String(i),
      date: "2025-01-01",
      text: "Note " + i,
    })),
  };
  assert.equal(C.rows(d).length, 500);
  C.edit(d, C.rows(d)[0], { text: "Edited" });
  assert.equal(d.reflections.length, 500);
  assert.equal(C.exportJSON(C.rows(d)).records.length, 500);
});
