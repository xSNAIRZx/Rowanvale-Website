"use strict";
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  C = require("./living-core"),
  E = require("./enrichment-core");
const TYPES = new Set(C.TYPES),
  norm = (x) =>
    String(x || "")
      .normalize("NFKC")
      .toLowerCase()
      .replace(/[_\s]+/g, " ")
      .trim();
function descriptor(v) {
  if (
    !v ||
    !TYPES.has(v.type) ||
    typeof v.title !== "string" ||
    !v.title.trim() ||
    v.title.length > 180
  )
    throw Object.assign(Error("Choose a valid media title and format."), {
      status: 400,
    });
  return {
    type: v.type,
    title: v.title.trim(),
    year: C.num(v.year, 2200),
    author: C.text(v.author, 300),
    platforms: C.text(v.platforms, 300),
    edition: C.text(v.edition, 150),
    sourceId: C.text(v.sourceId, 120),
    provider: C.text(v.provider, 60),
  };
}
const key = (v) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(descriptor(v)))
    .digest("hex");
const kinds = {
  Game: /\bvideo game\b/i,
  Book: /\b(novel|book|novella|short.story collection|poetry collection|memoir|autobiography)\b/i,
  Movie: /\bfilm\b/i,
  Show: /\b(television|tv|web|animated).*(series|show|program)|\bminiseries\b/i,
  Anime:
    /\banime\b|\b(animated|animation).*(film|series)|\bJapanese.*(film|series)\b/i,
};
const artName =
  /cover|box.?art|poster|key.?visual|promotional|title.?page|first.?edition|dust.?jacket|sleeve/i;
const artStem = (x) =>
  norm(x)
    .replace(/\bvol(?:ume)?\.?\s*\d+\b/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
function specificFile(file, title) {
  const t = artStem(title);
  return t.length >= 5 && artStem(file).includes(t);
}
function artworkFile(page, item, expectedQ = "") {
  const name = String(page.pageimage || "");
  if (
    /logo|screenshot|screencap|cosplay|premiere|cast_photo|portrait|map_of/i.test(
      name,
    )
  )
    return false;
  if (artName.test(name)) return true;
  if (
    expectedQ &&
    page.pageprops?.page_image === name &&
    page.thumbnail.width / page.thumbnail.height >= 0.45 &&
    page.thumbnail.width / page.thumbnail.height <= 1.12
  )
    return true;
  const ratio = (page.thumbnail?.width || 0) / (page.thumbnail?.height || 1),
    compact = (s) => norm(s).replace(/[^\p{L}\p{N}]/gu, "");
  const title = compact(item.title);
  return (
    ratio >= 0.45 &&
    ratio <= 1.12 &&
    title.length >= 4 &&
    compact(name).includes(title)
  );
}
function fileImage(page, item, expectedQ = "") {
  if (
    page.missing ||
    page.pageprops?.disambiguation !== undefined ||
    !page.thumbnail?.source ||
    !artworkFile(page, item, expectedQ)
  )
    return null;
  const description =
      page.description || page.pageprops?.["wikibase-shortdesc"] || "",
    evidence = description + " " + String(page.extract || "").slice(0, 600);
  if (!kinds[item.type].test(evidence)) return null;
  if (expectedQ && page.pageprops?.wikibase_item !== expectedQ) return null;
  const year = Number(
    description.match(/\b(18\d{2}|19\d{2}|20\d{2})\b/)?.[1] || 0,
  );
  if (!expectedQ && item.year && year && item.year !== year) return null;
  if (!expectedQ) {
    const title = norm(page.title.replace(/\s*\([^)]*\)\s*$/, ""));
    if (
      title !== norm(item.title) &&
      !page.requestedTitles?.includes(norm(item.title))
    )
      return null;
    if (
      item.type === "Game" &&
      /video game series|franchise/i.test(description) &&
      !specificFile(page.pageimage, item.title)
    )
      return null;
    if (
      item.author &&
      item.type === "Book" &&
      !norm(item.author)
        .split(/[^\p{L}]+/u)
        .filter((t) => t.length > 1)
        .every((t) => norm(evidence).includes(t))
    )
      return null;
  }
  let image;
  try {
    image = new URL(page.thumbnail.source);
    if (
      image.protocol !== "https:" ||
      !["upload.wikimedia.org", "thumb.wikimedia.org"].includes(
        image.hostname,
      ) ||
      image.username ||
      image.password ||
      image.port
    )
      return null;
    image.search = "";
  } catch {
    return null;
  }
  return {
    state: "ready",
    artwork: image.href,
    provider: "Wikipedia cover/poster",
    sourceUrl:
      "https://en.wikipedia.org/wiki/" +
      encodeURIComponent(page.title.replaceAll(" ", "_")),
    fileUrl:
      "https://en.wikipedia.org/wiki/File:" +
      encodeURIComponent(page.pageimage),
    attribution:
      "Cover/poster via Wikipedia; original rights holders retain their rights. See the linked file page for credit and reuse terms.",
    matchedTitle: page.title,
    sourceId: page.pageprops?.wikibase_item || "",
    year,
    width: page.thumbnail.width,
    height: page.thumbnail.height,
    cacheAllowed: false,
  };
}
function createCoverService({
  fetcher = globalThis.fetch,
  metadataService,
  cacheFile = "",
  now = Date.now,
  env = process.env,
} = {}) {
  const cache = new Map(),
    pending = new Map();
  const tails = new Map(),
    lastRequests = new Map(),
    secondary = new Map();
  let saveTimer = null,
    secondaryActive = 0;
  const secondaryWait = [];
  async function secondaryJob(fn) {
    if (secondaryActive >= 2) await new Promise((r) => secondaryWait.push(r));
    secondaryActive++;
    try {
      return await fn();
    } finally {
      secondaryActive--;
      secondaryWait.shift()?.();
    }
  }
  if (cacheFile)
    try {
      const raw = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      for (const [k, v] of Object.entries(raw))
        if (/^[a-f0-9]{64}$/.test(k) && v?.expires > now() && v.result)
          cache.set(k, v);
    } catch {}
  function persist() {
    if (!cacheFile) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        fs.mkdirSync(path.dirname(cacheFile), { recursive: true, mode: 0o700 });
        const tmp = cacheFile + ".tmp";
        fs.writeFileSync(
          tmp,
          JSON.stringify(
            Object.fromEntries(
              [...cache].filter(([, v]) => v.result.state !== "pending"),
            ),
          ),
          { mode: 0o600 },
        );
        fs.renameSync(tmp, cacheFile);
      } catch {
        /* Runtime cache failure never changes a user's saved workspace. */
      }
    }, 200);
    saveTimer.unref?.();
  }
  function remember(k, result) {
    cache.set(k, {
      expires:
        now() +
        (result.state === "ready"
          ? 30 * 86400000
          : result.state === "unavailable"
            ? 86400000
            : 60000),
      result,
    });
    while (cache.size > 2500) cache.delete(cache.keys().next().value);
    persist();
    return result;
  }
  async function request(base, params) {
    const url = new URL(base);
    if (
      !["en.wikipedia.org", "www.wikidata.org", "api.tvmaze.com"].includes(
        url.hostname,
      ) ||
      url.protocol !== "https:"
    )
      throw Error("Unsupported artwork source.");
    for (const [k, v] of Object.entries(params))
      url.searchParams.set(k, String(v));
    const run = (tails.get(url.hostname) || Promise.resolve())
      .catch(() => {})
      .then(async () => {
        const delay = Math.max(
          0,
          (lastRequests.get(url.hostname) || 0) + 500 - now(),
        );
        if (delay) await new Promise((r) => setTimeout(r, delay));
        lastRequests.set(url.hostname, now());
        let r;
        try {
          r = await fetcher(url, {
            headers: {
              Accept: "application/json",
              "User-Agent":
                "Rowanvale/1.0.0 (personal desktop media library)" +
                (env.ROWANVALE_CONTACT
                  ? " " + C.text(env.ROWANVALE_CONTACT, 100)
                  : ""),
            },
            redirect: "error",
            signal: AbortSignal.timeout(12000),
          });
        } catch {
          throw Error("The public cover source could not be reached.");
        }
        if (!r.ok)
          throw Object.assign(
            Error("The public cover source returned " + r.status + "."),
            {
              status: r.status,
              retryAfter: Number(r.headers.get("retry-after")) || 30,
            },
          );
        if (Number(r.headers.get("content-length") || 0) > 2500000)
          throw Error("Cover metadata exceeded its size limit.");
        const raw = await r.text();
        if (Buffer.byteLength(raw) > 2500000)
          throw Error("Cover metadata exceeded its size limit.");
        const v = JSON.parse(raw);
        if (v.error)
          throw Object.assign(
            Error(v.error.info || "The cover source is busy."),
            { retryAfter: 30 },
          );
        return v;
      });
    tails.set(
      url.hostname,
      run.then(
        () => {},
        () => {},
      ),
    );
    return run;
  }
  async function encyclopedia(items) {
    const qids = [
        ...new Set(
          items
            .map((x) => (/^Q\d+$/.test(x.sourceId) ? x.sourceId : ""))
            .filter(Boolean),
        ),
      ],
      titles = new Map(),
      canonical = new Map();
    if (qids.length) {
      const data = await request("https://www.wikidata.org/w/api.php", {
        action: "wbgetentities",
        format: "json",
        ids: qids.join("|"),
        props: "sitelinks",
        sitefilter: "enwiki",
        redirects: "yes",
        maxlag: 5,
      });
      for (const id of qids) {
        const redirect = Array.isArray(data.redirects)
          ? data.redirects.find((x) => x.from === id)?.to
          : null;
        const entity = data.entities?.[id] || data.entities?.[redirect],
          title = entity?.sitelinks?.enwiki?.title;
        if (title) {
          titles.set(id, title);
          canonical.set(id, entity.id || redirect || id);
        }
      }
    }
    const variants = new Map(),
      all = new Set();
    for (const x of items) {
      const linked = titles.get(x.sourceId);
      const suffixes =
        x.type === "Game"
          ? ["video game"]
          : x.type === "Book"
            ? ["novel", "book"]
            : x.type === "Movie"
              ? [x.year ? x.year + " film" : "film", "film"]
              : x.type === "Show"
                ? ["TV series", "television series"]
                : ["TV series", "anime", "film"];
      const options = linked
        ? [linked]
        : [x.title, ...suffixes.map((s) => x.title + " (" + s + ")")];
      variants.set(key(x), options);
      options.forEach((t) => all.add(t));
    }
    const pages = [],
      redirects = [];
    const list = [...all];
    for (let i = 0; i < list.length; i += 45) {
      const v = await request("https://en.wikipedia.org/w/api.php", {
        action: "query",
        format: "json",
        formatversion: 2,
        redirects: 1,
        titles: list.slice(i, i + 45).join("|"),
        prop: "pageimages|pageprops|description|extracts|images",
        imlimit: 30,
        exintro: 1,
        explaintext: 1,
        exchars: 600,
        piprop: "thumbnail|name",
        pilicense: "any",
        pithumbsize: 600,
        pilimit: 50,
        maxlag: 5,
      });
      pages.push(...(v.query?.pages || []));
      redirects.push(...(v.query?.redirects || []));
    }
    for (const page of pages)
      page.requestedTitles = redirects
        .filter((r) => norm(r.to) === norm(page.title))
        .map((r) => norm(r.from.replace(/\s*\([^)]*\)\s*$/, "")));
    const imageRequests = [];
    for (const x of items) {
      for (const page of pages) {
        if (
          !(variants.get(key(x)) || []).some(
            (t) =>
              norm(t) === norm(page.title) ||
              page.requestedTitles.includes(norm(x.title)),
          )
        )
          continue;
        for (const img of page.images || []) {
          const name = String(img.title || "").replace(/^File:/, "");
          if (
            specificFile(name, x.title) &&
            !fileImage(page, x, /^Q\d+$/.test(x.sourceId) ? x.sourceId : "")
          )
            imageRequests.push({ item: x, page, name });
        }
      }
    }
    if (imageRequests.length) {
      const names = [
        ...new Set(imageRequests.map((x) => "File:" + x.name)),
      ].slice(0, 30);
      const v = await request("https://en.wikipedia.org/w/api.php", {
        action: "query",
        format: "json",
        formatversion: 2,
        titles: names.join("|"),
        prop: "imageinfo",
        iiprop: "url",
        iiurlwidth: 600,
        maxlag: 5,
      });
      for (const file of v.query?.pages || []) {
        const info = file.imageinfo?.[0];
        if (!info) continue;
        for (const match of imageRequests.filter(
          (x) => norm("File:" + x.name) === norm(file.title),
        )) {
          pages.push({
            ...match.page,
            pageimage: match.name,
            thumbnail: {
              source: info.thumburl || info.url,
              width: info.thumbwidth || info.width,
              height: info.thumbheight || info.height,
            },
          });
        }
      }
    }
    const out = new Map();
    for (const x of items) {
      const expected =
        /^Q\d+$/.test(x.sourceId) && titles.has(x.sourceId)
          ? canonical.get(x.sourceId) || x.sourceId
          : "";
      const options = variants.get(key(x)),
        candidates = pages
          .filter((p) =>
            expected
              ? p.pageprops?.wikibase_item === expected
              : options.some((t) => norm(t) === norm(p.title)) ||
                p.requestedTitles?.includes(norm(x.title)) ||
                norm(p.title.replace(/\s*\([^)]*\)\s*$/, "")) === norm(x.title),
          )
          .map((p) => fileImage(p, x, expected))
          .filter(Boolean);
      const unique = new Map(
        candidates.map((v) => [v.sourceId || v.sourceUrl, v]),
      );
      if (unique.size === 1) out.set(key(x), [...unique.values()][0]);
      else
        out.set(key(x), {
          state: unique.size > 1 ? "review" : "unavailable",
          reason:
            unique.size > 1
              ? "More than one work has this title. Add a year or choose artwork."
              : "No reliably matched cover/poster was available from the public source.",
        });
    }
    return out;
  }
  async function primary(x) {
    if (["Show", "Anime"].includes(x.type)) {
      try {
        const v = await request("https://api.tvmaze.com/singlesearch/shows", {
          q: x.title,
        });
        if (
          norm(v.name) === norm(x.title) &&
          (!x.year ||
            Number(String(v.premiered || "").slice(0, 4)) === x.year) &&
          v.image?.original &&
          (x.type !== "Anime" ||
            (v.language === "Japanese" && (v.genres || []).includes("Anime")))
        ) {
          return {
            state: "ready",
            artwork: v.image.original,
            provider: "TVmaze",
            sourceUrl: v.url,
            attribution:
              "TV metadata via TVmaze (CC BY-SA); cover rights remain with the original owners.",
            matchedTitle: v.name,
            sourceId: String(v.id),
            year: Number(String(v.premiered || "").slice(0, 4)),
            cacheAllowed: false,
          };
        }
      } catch {}
    }
    if (!metadataService) return null;
    const ready = metadataService
      .status()
      .providers.some((p) => p.ready && p.kinds.includes(x.type));
    if (!ready) return null;
    try {
      let candidates;
      if (
        ["TMDB", "IGDB", "Open Library", "Steam"].includes(x.provider) &&
        x.sourceId
      ) {
        candidates = [
          (await metadataService.details(x.type, x.provider, x.sourceId))
            .result,
        ];
      } else
        candidates = (await metadataService.search(x.type, x.title)).results;
      const ranked = E.rank(
        {
          type: x.type,
          title: x.title,
          metadata184: { ...x },
          book: x.type === "Book" ? { author: x.author } : undefined,
        },
        candidates,
      );
      if (!ranked.automatic || !ranked.best?.candidate?.artwork) return null;
      const v = ranked.best.candidate;
      return {
        state: "ready",
        artwork: v.artwork,
        provider: v.provider,
        sourceUrl: v.sourceUrl,
        attribution: v.attribution,
        matchedTitle: v.title,
        sourceId: v.sourceId,
        year: v.year,
        cacheAllowed: v.cacheAllowed,
      };
    } catch {
      return null;
    }
  }
  async function resolve(input, { refresh = false } = {}) {
    if (!Array.isArray(input) || input.length > 16)
      throw Object.assign(
        Error("Resolve one to sixteen media items at a time."),
        { status: 400 },
      );
    if (pending.size > 64)
      throw Object.assign(Error("Cover lookups are busy. Retry shortly."), {
        status: 429,
      });
    const items = input.map(descriptor),
      results = new Map(),
      newItems = [];
    for (const x of items) {
      const k = key(x),
        hit = cache.get(k);
      if (hit && hit.expires > now() && !refresh)
        results.set(k, { ...hit.result, cached: true });
      else if (!pending.has(k) && !newItems.some((v) => key(v) === k))
        newItems.push(x);
    }
    if (newItems.length) {
      const work = (async () => {
        let wiki;
        try {
          wiki = await encyclopedia(newItems);
        } catch (e) {
          wiki = new Map(
            newItems.map((x) => [
              key(x),
              {
                state: "error",
                reason: e.message,
                retryAfter: e.retryAfter || 30,
              },
            ]),
          );
        }
        for (const x of newItems) {
          const k = key(x),
            result = wiki.get(k);
          if (result.state === "ready") remember(k, result);
          else if (!secondary.has(k)) {
            remember(k, {
              state: "pending",
              reason: "Checking another supported cover source.",
            });
            const task = secondaryJob(async () => {
              const p = await primary(x);
              remember(k, p || result);
            }).finally(() => secondary.delete(k));
            secondary.set(k, task);
            task.catch(() =>
              remember(k, {
                state: "error",
                reason: "The secondary cover source failed.",
                retryAfter: 30,
              }),
            );
          }
        }
      })();
      for (const x of newItems) pending.set(key(x), work);
      work
        .finally(() => {
          for (const x of newItems) pending.delete(key(x));
        })
        .catch(() => {});
    }
    await Promise.all([
      ...new Set(items.map((x) => pending.get(key(x))).filter(Boolean)),
    ]);
    return {
      results: items.map((x) => ({
        key: key(x),
        ...results.get(key(x)),
        ...(results.has(key(x))
          ? {}
          : cache.get(key(x))?.result || {
              state: "error",
              reason: "Cover resolution did not finish.",
            }),
      })),
      source:
        "Public matched covers/posters; original rights remain with their owners.",
    };
  }
  return { resolve };
}
module.exports = { createCoverService, descriptor, key, fileImage };
