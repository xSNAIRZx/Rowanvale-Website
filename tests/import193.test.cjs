const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../app/import-core193.js");
const file = (items) =>
  JSON.stringify({ format: "vytron-personal-library", items });
test("paused and dropped survive normalization for every media type", () => {
  for (const type of ["Game", "Book", "Show", "Anime", "Movie"])
    for (const status of ["On Hold", "Dropped"])
      assert.equal(
        C.parse(file([{ title: "A", type, status }]))[0].status,
        status,
      );
});
test("CSV handles multiline, comma, quote and BOM without silent loss", () => {
  const r = C.parse(
    '\uFEFFTitle,Type,Note\r\n"One, two",Movie,"Line one\nLine ""two"""',
    "library.csv",
  );
  assert.equal(r[0].title, "One, two");
  assert.equal(r[0].note, 'Line one\nLine "two"');
  assert.throws(() => C.csv('A,B\n"missing,end'), /unclosed/);
  assert.throws(() => C.csv("A,B\nx,y,z"), /number/);
});
test("Goodreads and Letterboxd adapters retain dates and edition identifiers", () => {
  const b = C.parse(
    "Title,Author,ISBN13,Exclusive Shelf,Date Read,My Rating\nA,B,9781234567890,read,2025/01/02,4",
    "goodreads.csv",
  )[0];
  assert.equal(b.type, "Book");
  assert.equal(b.metadata184.isbn, "9781234567890");
  assert.equal(b.media193.diary[0].date, "2025-01-02");
  assert.equal(b.rating, 8);
  const m = C.parse(
    "Name,Year,Letterboxd URI,Watched Date,Rating\nFilm,2020,https://letterboxd.com/film/film,2025-02-03,3.5",
    "diary.csv",
  )[0];
  assert.equal(m.type, "Movie");
  assert.equal(m.rating, 7);
});
test("same title is reviewed, distinct editions are not silently dropped", () => {
  const existing = [
    {
      id: "old",
      title: "Book",
      type: "Book",
      metadata184: { isbn: "9781234567890" },
    },
  ];
  const rows = C.review(
    [
      { title: "Book", type: "Book", metadata184: { isbn: "9781234567891" } },
      { title: "Book", type: "Book" },
    ],
    existing,
    "key",
  );
  assert.equal(rows[0].action, "add");
  assert.equal(rows[0].matches[0].relation, "release");
  assert.equal(rows[1].action, "skip");
});
test("file provenance skips repeated imports and review never mutates sources", () => {
  const items = C.parse(file([{ title: "Title", status: "Dropped" }])),
    before = JSON.stringify(items),
    rows = C.review(items, [], "sha"),
    added = C.prepare(rows, [], "batch");
  assert.equal(JSON.stringify(items), before);
  assert.equal(C.review(items, added, "sha")[0].action, "skip");
  assert.equal(added[0].status, "Dropped");
  assert.ok(added[0].id);
});
test("invalid records and statuses reject the entire file rather than filtering", () => {
  assert.throws(
    () => C.parse(file([{ title: "A" }, { title: "" }])),
    /Record 2/,
  );
  assert.throws(
    () => C.parse(file([{ title: "A", status: "Mystery" }])),
    /Unknown status/,
  );
  assert.throws(
    () => C.parse(file(Array.from({ length: 5001 }, () => ({ title: "A" })))),
    /5,000/,
  );
});

test("watchlists stay planned and Goodreads zero remains unrated", () => {
  const m = C.parse(
    "Date,Name,Year,Letterboxd URI\n2026-01-01,Unwatched title,2020,https://letterboxd.com/film/foo/",
    "watchlist.csv",
  )[0];
  assert.equal(m.status, "Want to Try");
  const b = C.parse(
    "Title,Author,Exclusive Shelf,My Rating\nBook,Writer,read,0",
    "goodreads.csv",
  )[0];
  assert.equal(b.rating, undefined);
});
test("malformed nested records and invalid quoted CSV fail before review", () => {
  assert.throws(
    () =>
      C.parse(
        file([
          {
            title: "Invalid",
            type: "Book",
            book: "not-an-object",
            rating: 999,
          },
        ]),
      ),
    /invalid book/,
  );
  assert.throws(
    () => C.parse(file([{ title: "Invalid", rating: 999 }])),
    /invalid rating/,
  );
  assert.throws(
    () => C.parse('Name,Type\n"Movie"oops,Movie', "generic.csv"),
    /quoted CSV/,
  );
});
test("CSV ratings and years appear in both unified and Watch Room metadata", () => {
  const m = C.parse(
    "Name,Year,Letterboxd URI,Rating\nFilm,2020,https://letterboxd.com/film/foo/,4",
    "ratings.csv",
  )[0];
  assert.equal(m.metadata184.rating, 8);
  assert.equal(m.watch.rating, 8);
  assert.equal(m.watch.year, 2020);
});

test("CSV dates never silently truncate invalid suffixes", () =>
  assert.throws(
    () =>
      C.parse(
        "Title,Author,Exclusive Shelf,Date Read\nBook,Writer,read,2025/01/02garbage",
        "goodreads.csv",
      ),
    /dates must/,
  ));
