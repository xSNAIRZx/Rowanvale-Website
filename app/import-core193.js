/* Reviewed, additive library imports. Existing records are never overwritten. */
(function (root, factory) {
  const api = factory(
    typeof module === "object" && module.exports
      ? require("./media193-core.js")
      : root.RVMedia193Core,
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RVImport193Core = api;
})(globalThis, (M) => {
  "use strict";
  const clone = (x) => JSON.parse(JSON.stringify(x)),
    types = ["Game", "Movie", "Show", "Anime", "Book"];
  function csv(text) {
    text = text.replace(/^\uFEFF/, "");
    const rows = [];
    let row = [],
      value = "",
      quoted = false,
      closed = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (closed && ![",", "\n", "\r"].includes(c))
        throw Error("Unexpected text after a quoted CSV field.");
      if (c === '"') {
        if (quoted && text[i + 1] === '"') {
          value += '"';
          i++;
        } else if (!value || quoted) {
          if (quoted) closed = true;
          quoted = !quoted;
        } else throw Error("Unexpected quote in CSV.");
      } else if (c === "," && !quoted) {
        row.push(value);
        value = "";
        closed = false;
      } else if ((c === "\n" || c === "\r") && !quoted) {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(value);
        if (row.some((x) => x.trim())) rows.push(row);
        row = [];
        value = "";
        closed = false;
      } else value += c;
    }
    if (quoted) throw Error("CSV has an unclosed quote.");
    row.push(value);
    if (row.some((x) => x.trim())) rows.push(row);
    if (!rows.length) throw Error("The CSV is empty.");
    const headers = rows.shift().map((x) =>
      x
        .replace(/^\uFEFF/, "")
        .trim()
        .toLowerCase(),
    );
    if (new Set(headers).size !== headers.length)
      throw Error("CSV column names must be unique.");
    return rows.map((r, i) => {
      if (r.length !== headers.length)
        throw Error("CSV row " + (i + 2) + " has the wrong number of columns.");
      return Object.fromEntries(headers.map((h, n) => [h, r[n].trim()]));
    });
  }
  function status(value, type) {
    const v = String(value || "").trim(),
      map = {
        "to-read": "Want to Try",
        "currently-reading": "In Progress",
        read: "Finished",
        watchlist: "Want to Try",
        watched: "Finished",
        paused: "On Hold",
        dropped: "Dropped",
      };
    let s = map[v.toLowerCase()] || v;
    if (!s) s = type === "Game" ? "Backlog" : "Want to Try";
    if (type === "Game")
      s =
        {
          "Want to Try": "Wishlist",
          "In Progress": "Currently Playing",
          Finished: "Completed",
        }[s] || s;
    else
      s =
        {
          Wishlist: "Want to Try",
          Backlog: "Want to Try",
          "Currently Playing": "In Progress",
          Completed: "Finished",
        }[s] || s;
    if (
      ![
        "Wishlist",
        "Backlog",
        "Currently Playing",
        "Completed",
        "Want to Try",
        "In Progress",
        "Finished",
        "On Hold",
        "Dropped",
      ].includes(s)
    )
      throw Error(
        'Unknown status "' + v + '". Use a supported status before importing.',
      );
    return s;
  }
  function parse(text, name = "library.json") {
    let raw, items;
    if (/\.csv$/i.test(name)) {
      items = csv(text).map((r) => {
        const letterboxd = "letterboxd uri" in r,
          goodreads = "exclusive shelf" in r;
        const type = letterboxd ? "Movie" : goodreads ? "Book" : r.type;
        if (!types.includes(type))
          throw Error(
            "Generic CSV requires Type: Game, Movie, Show, Anime or Book.",
          );
        const code = (r.isbn13 || r.isbn || "").replace(/^="(.*)"$/, "$1");
        const item = {
          title: r.title || r.name,
          type,
          status:
            r.status ||
            r["exclusive shelf"] ||
            (letterboxd
              ? "watched date" in r
                ? "Finished"
                : "Want to Try"
              : ""),
          note: r.note || r.review || "",
          metadata184: {
            author: r.author || "",
            year: Number(r.year) || 0,
            isbn: code,
            provider: letterboxd
              ? "Letterboxd"
              : goodreads
                ? "Goodreads"
                : r.provider || "",
            sourceId: r["letterboxd uri"] || r["book id"] || r.sourceid || "",
          },
        };
        if (r.rating || r["my rating"]) {
          const rating = Number(r.rating || r["my rating"]);
          if (!Number.isFinite(rating) || rating < 0 || rating > 5)
            throw Error("CSV ratings must be between 0 and 5.");
          if (!goodreads || rating !== 0) item.rating = rating * 2;
        }
        if (type === "Book")
          item.book = {
            author: r.author || "",
            isbn: code,
            pages: Number(r["number of pages"] || r.pages) || 0,
            progress: 0,
          };
        const date = r["watched date"] || r["date read"];
        if (date) {
          const d = date.replaceAll("/", "-");
          if (!/^\d{4}-\d{2}-\d{2}$/.test(d))
            throw Error("CSV history dates must use YYYY-MM-DD or YYYY/MM/DD.");
          M.date(d);
          item.media193 = {
            diary: [
              {
                id: globalThis.crypto.randomUUID(),
                date: d,
                kind: type === "Book" ? "Read" : "Watched",
                note: item.note,
                rating: item.rating ?? null,
              },
            ],
          };
        }
        if (item.rating !== undefined) {
          item.metadata184.rating = item.rating;
          if (item.book) item.book.rating = item.rating;
        }
        if (["Movie", "Show", "Anime"].includes(type))
          item.watch = { ...item.metadata184 };
        return item;
      });
    } else {
      try {
        raw = JSON.parse(text);
      } catch {
        throw Error("The file is not valid JSON.");
      }
      if (raw.format !== "vytron-personal-library" || !Array.isArray(raw.items))
        throw Error(
          "Choose a Rowanvale library JSON, Goodreads CSV, Letterboxd CSV, or a generic library CSV.",
        );
      items = raw.items;
    }
    if (!items.length || items.length > 5000)
      throw Error(
        "Import between 1 and 5,000 records at a time. Nothing was imported.",
      );
    return items.map((source, i) => {
      if (
        !source ||
        typeof source !== "object" ||
        Array.isArray(source) ||
        typeof source.title !== "string" ||
        !source.title.trim() ||
        source.title.length > 500
      )
        throw Error("Record " + (i + 1) + " needs a valid title.");
      const item = clone(source);
      item.type = item.type || "Game";
      if (!types.includes(item.type))
        throw Error("Record " + (i + 1) + " has an unsupported type.");
      item.title = item.title.trim();
      item.status = status(item.status, item.type);
      validateFields(item, i + 1);
      M.validate(item.media193);
      delete item.id;
      delete item.import193;
      delete item.rewardIdentity184;
      return item;
    });
  }
  function validateFields(item, row) {
    const fail = (field) => {
      throw Error("Record " + row + " has invalid " + field + ".");
    };
    for (const key of ["book", "watch", "metadata184", "providerIds"])
      if (
        item[key] !== undefined &&
        (!item[key] ||
          typeof item[key] !== "object" ||
          Array.isArray(item[key]))
      )
        fail(key);
    for (const key of ["note", "source", "sourceId", "gameId"])
      if (item[key] !== undefined && typeof item[key] !== "string") fail(key);
    if (
      item.rating !== undefined &&
      item.rating !== null &&
      (!Number.isFinite(item.rating) || item.rating < 0 || item.rating > 10)
    )
      fail("rating");
    for (const key of ["book", "watch"]) {
      const meta = item[key] || {};
      for (const field of key === "book"
        ? ["pages", "progress"]
        : ["season", "episodes", "totalEpisodes", "seriesTotalEpisodes"])
        if (
          meta[field] !== undefined &&
          (!Number.isInteger(meta[field]) ||
            meta[field] < 0 ||
            meta[field] > 100000)
        )
          fail(key + "." + field);
      for (const field of ["author", "isbn", "provider", "sourceId", "status"])
        if (meta[field] !== undefined && typeof meta[field] !== "string")
          fail(key + "." + field);
    }
    for (const field of [
      "author",
      "isbn",
      "provider",
      "sourceId",
      "title",
      "genres",
      "description",
      "cover",
      "edition",
    ])
      if (
        item.metadata184?.[field] !== undefined &&
        typeof item.metadata184[field] !== "string"
      )
        fail("metadata184." + field);
  }
  function review(items, existing, fileKey) {
    return items.map((item, index) => {
      const matches = existing
        .map((x) => ({
          id: x.id,
          title: x.title,
          relation:
            x.import193?.sourceKey === fileKey + ":" + index
              ? "exact"
              : M.compare(item, x),
        }))
        .filter((x) => x.relation !== "distinct");
      const prior = items
        .slice(0, index)
        .some((x) => ["exact", "possible"].includes(M.compare(item, x)));
      return {
        item,
        index,
        sourceKey: fileKey + ":" + index,
        matches,
        prior,
        action:
          matches.some((x) => ["exact", "possible"].includes(x.relation)) ||
          prior
            ? "skip"
            : "add",
      };
    });
  }
  function fingerprint(item) {
    const x = clone(item);
    delete x.cover;
    delete x.coverData;
    return JSON.stringify(x);
  }
  function prepare(rows, existing, token) {
    const added = [];
    for (const row of rows) {
      if (row.action !== "add") continue;
      const item = clone(row.item);
      item.id = globalThis.crypto.randomUUID();
      item.import193 = { token, sourceKey: row.sourceKey };
      M.ensure(item);
      added.push(item);
    }
    return added;
  }
  return { parse, csv, status, review, prepare, fingerprint };
});
