(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./living-core"));
  else root.RVEnrichmentCore = factory(root.RVLivingCore);
})(globalThis, (C) => {
  "use strict";
  const normalize = (x) => C.norm(String(x || "").replace(/[™®©]/g, ""));
  function isbn(v) {
    v = String(v || "")
      .replace(/[-\s]/g, "")
      .toUpperCase();
    if (/^\d{9}[\dX]$/.test(v)) {
      const t = "978" + v.slice(0, 9);
      let s = 0;
      for (let i = 0; i < 12; i++) s += Number(t[i]) * (i % 2 ? 3 : 1);
      return t + ((10 - (s % 10)) % 10);
    }
    return /^\d{13}$/.test(v) ? v : "";
  }
  function facts(x) {
    const m = C.meta(x);
    return {
      type: x.type || "Game",
      title: C.text(x.title, 150),
      year: C.num(m.year || x.releaseYear, 2200),
      author: C.text(m.author, 300),
      creators: C.text(m.creators || x.developer, 500),
      platforms: C.text(m.platforms || x.platform, 400),
      edition: C.text(m.edition || x.edition, 300),
      isbn: isbn(x.book?.isbn || m.isbn),
      provider: m.provider || "",
      sourceId: String(m.sourceId || x.book?.workId || x.watch?.sourceId || ""),
      artwork: m.artworkBrokenAt
        ? ""
        : C.safeImage(m.artwork || x.watch?.cover || x.background_image),
      description: C.text(m.description, 6000),
      manual: C.arr(m.manualFields),
    };
  }
  function fingerprint(x) {
    const f = facts(x);
    return JSON.stringify([
      x.id,
      f.type,
      normalize(f.title),
      f.year,
      normalize(f.author || f.creators),
      f.platforms,
      f.edition,
      f.isbn,
      f.sourceId,
    ]);
  }
  function score(item, candidate) {
    const a = facts(item),
      b = facts({ ...candidate, metadata184: candidate }),
      reasons = [];
    let n = 0,
      strong = false,
      blocked = false,
      creatorMatch = false,
      platformMatch = false,
      yearMatch = false;
    const titleMatch =
      normalize(a.title) === normalize(b.title) ||
      String(candidate.alternativeTitles || "")
        .split(",")
        .some((t) => normalize(t) === normalize(a.title));
    if (a.type !== b.type)
      return {
        candidate,
        score: 0,
        strong: false,
        reasons: ["Different media format"],
        blocked: true,
      };
    if (a.sourceId && a.provider === b.provider && a.sourceId === b.sourceId) {
      n = 1;
      strong = true;
      reasons.push("Same provider record ID");
    } else if (a.isbn && b.isbn && a.isbn === b.isbn) {
      n = 1;
      strong = true;
      reasons.push("Exact ISBN / edition");
    } else {
      if (titleMatch) {
        n = 0.58;
        reasons.push("Exact title or alternate title");
      } else {
        const aw = new Set(normalize(a.title).split(" ")),
          bw = new Set(normalize(b.title).split(" "));
        n =
          (0.3 * [...aw].filter((w) => bw.has(w)).length) /
          Math.max(1, new Set([...aw, ...bw]).size);
        reasons.push("Title similarity only");
      }
      if (a.year && b.year) {
        if (a.year === b.year) {
          n += 0.18;
          yearMatch = true;
          reasons.push("Matching release year");
        } else {
          n -= 0.4;
          blocked = true;
          reasons.push("Release year differs");
        }
      }
      const ac = normalize(a.author || a.creators),
        bc = normalize(b.author || b.creators);
      if (ac && bc) {
        if (ac === bc || bc.includes(ac) || ac.includes(bc)) {
          n += 0.25;
          creatorMatch = true;
          reasons.push("Matching author / creator");
        } else {
          n -= 0.5;
          blocked = true;
          reasons.push("Author / creator differs");
        }
      }
      if (a.platforms && b.platforms) {
        const ap = normalize(a.platforms),
          bp = normalize(b.platforms);
        if (ap.split(" ").some((w) => w.length > 1 && bp.includes(w))) {
          n += 0.13;
          platformMatch = true;
          reasons.push("Matching platform");
        } else {
          n -= 0.4;
          blocked = true;
          reasons.push("Platform differs");
        }
      }
      if (a.isbn && b.isbn && a.isbn !== b.isbn) {
        n -= 0.45;
        blocked = true;
        reasons.push("Different ISBN / edition");
      }
      strong =
        titleMatch &&
        !blocked &&
        (a.type === "Book"
          ? creatorMatch
          : yearMatch && (a.type !== "Game" || platformMatch || creatorMatch));
    }
    return {
      candidate,
      score: Math.max(0, Math.min(1, n)),
      strong,
      reasons,
      blocked,
    };
  }
  function rank(item, candidates) {
    const r = C.arr(candidates)
      .map((c) => score(item, c))
      .sort((a, b) => b.score - a.score);
    const best = r[0],
      second = r[1];
    return {
      ranked: r,
      automatic:
        !!best &&
        best.strong &&
        !best.blocked &&
        best.score >= 0.75 &&
        (!second || best.score - second.score >= 0.12),
      best: best || null,
    };
  }
  function missing(x) {
    const f = facts(x);
    return (
      (!f.artwork && !f.manual.includes("artwork")) ||
      (!f.description && !f.manual.includes("description"))
    );
  }
  function deterministic(x) {
    if (x.metadata184?.artworkBrokenAt) return null;
    const f = facts(x);
    if (f.type !== "Book" || f.manual.includes("artwork") || f.artwork)
      return null;
    const id = C.num(x.book?.coverId, 999999999),
      code = f.isbn;
    if (!id && !code) return null;
    return {
      type: "Book",
      title: x.title,
      provider: "Open Library",
      sourceId: x.book?.workId || "",
      sourceUrl: x.book?.workId
        ? "https://openlibrary.org/works/" + x.book.workId
        : code
          ? "https://openlibrary.org/isbn/" + code
          : "https://openlibrary.org",
      artwork:
        "https://covers.openlibrary.org/b/" +
        (code ? "isbn/" + code : "id/" + id) +
        "-L.jpg?default=false",
      isbn: code,
      cacheAllowed: true,
      attribution:
        "Cover: Open Library. Original rights holders retain their rights.",
    };
  }
  function newJob(x, at = Date.now()) {
    return {
      id: "art:" + x.id,
      itemId: x.id,
      fingerprint: fingerprint(x),
      state: "queued",
      attempts: 0,
      nextAt: at,
      createdAt: at,
      updatedAt: at,
    };
  }
  function enqueue(queue, items, at = Date.now(), force = false) {
    const map = new Map(C.arr(queue).map((j) => [j.itemId, j]));
    for (const x of items) {
      if (!C.TYPES.includes(x.type || "Game") || (!missing(x) && !force))
        continue;
      const old = map.get(x.id),
        key = fingerprint(x);
      if (
        !old ||
        old.fingerprint !== key ||
        force ||
        (["unavailable", "failed"].includes(old.state) &&
          at - (old.updatedAt || 0) > 7 * 86400000)
      )
        map.set(x.id, newJob(x, at));
    }
    const ids = new Set(items.map((x) => x.id));
    return [...map.values()].filter((j) => ids.has(j.itemId));
  }
  function retry(job, error, at = Date.now()) {
    job.attempts++;
    job.updatedAt = at;
    job.error = C.text(error.message || error, 240);
    if (error.status === 401 || error.status === 403 || error.status === 412) {
      job.state = "setup-needed";
      job.nextAt = 0;
      return;
    }
    if (error.status === 404 || job.attempts >= 3) {
      job.state = "failed";
      job.nextAt = at + 7 * 86400000;
      return;
    }
    job.state = "retry";
    job.nextAt =
      at +
      Math.max(
        (Number(error.retryAfter) || 0) * 1000,
        [3000, 15000, 60000][Math.min(2, job.attempts - 1)],
      );
  }
  return {
    normalize,
    isbn,
    facts,
    fingerprint,
    score,
    rank,
    missing,
    deterministic,
    newJob,
    enqueue,
    retry,
  };
});
