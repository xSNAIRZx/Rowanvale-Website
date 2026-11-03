/* One automatic artwork adapter for saved media and every visible catalog card. */
const RVCovers = (() => {
  "use strict";
  const C = RVLivingCore,
    STORE = "rowanvale.covers1861",
    E = (x) =>
      String(x ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
  let ctx,
    entries = new Map(),
    cache = {},
    observer = null,
    rootObserver = null,
    timer = null,
    busy = false,
    controller = null,
    online = navigator.onLine;
  try {
    const v = JSON.parse(localStorage.getItem(STORE) || "{}");
    if (v && typeof v === "object" && !Array.isArray(v)) cache = v;
  } catch {}
  function describe(x) {
    const m = C.meta(x),
      type = C.TYPES.includes(x.type) ? x.type : "Game";
    return {
      type,
      title: C.text(x.title || x.name, 180),
      year: C.num(
        m.year || x.year || String(x.released || "").slice(0, 4),
        2200,
      ),
      author: C.text(m.author || x.author || x.book?.author, 300),
      platforms: C.text(
        Array.isArray(m.platforms || x.platforms)
          ? (m.platforms || x.platforms).join(", ")
          : m.platforms || x.platforms,
        300,
      ),
      edition: C.text(m.edition || x.edition, 150),
      sourceId: C.text(m.sourceId || x.sourceId || x.workId, 120),
      provider: C.text(m.provider || x.provider, 60),
    };
  }
  const key = (x) => encodeURIComponent(JSON.stringify(describe(x))),
    enabled = () => ctx?.data().settings.coverArtwork1861?.enabled !== false;
  function own(x) {
    if (C.arr(x.metadata184?.manualFields).includes("artwork"))
      return { src: C.safeImage(x.metadata184.artwork), protected: true };
    if ((x.type || "Game") === "Game") {
      const covers = ctx?.data().settings.rv17?.covers || {},
        k = x.id ? "game:" + x.id : "",
        specific = k && Object.hasOwn(covers, k) ? covers[k] : null;
      if (specific) return { src: C.safeImage(specific.src), protected: true };
      const name = C.norm(x.title || x.name),
        legacy = covers[name];
      if (
        legacy &&
        (ctx?.data().backlog || []).filter(
          (v) => (v.type || "Game") === "Game" && C.norm(v.title) === name,
        ).length <= 1
      )
        return { src: C.safeImage(legacy.src), protected: true };
    }
    return null;
  }
  function source(x) {
    const chosen = own(x);
    if (chosen) return chosen.src;
    const m = x.metadata184 || {},
      hit = cache[key(x)],
      failed = hit?.failedArtwork;
    if (!m.artworkBrokenAt) {
      const saved = C.safeImage(
        m.artwork || x.watch?.cover || x.background_image,
      );
      if (saved && saved !== failed) return saved;
      if (x.book?.coverId || x.coverId) {
        const bookImage =
          "https://covers.openlibrary.org/b/id/" +
          C.num(x.book?.coverId || x.coverId, 999999999) +
          "-L.jpg?default=false";
        if (bookImage !== failed) return bookImage;
      }
    }
    return hit?.state === "ready" &&
      hit.until > Date.now() &&
      hit.artwork !== m.previousArtwork
      ? C.safeImage(hit.artwork)
      : "";
  }
  function mark(x) {
    if (!x || !String(x.title || x.name || "").trim()) return "";
    const k = key(x),
      old = entries.get(k);
    if (old) {
      if (
        x.id &&
        ctx?.data().backlog.some((v) => String(v.id) === String(x.id))
      )
        old.ids.add(String(x.id));
      old.sample = x;
    } else
      entries.set(k, {
        descriptor: describe(x),
        sample: x,
        ids: new Set(
          x.id && ctx?.data().backlog.some((v) => String(v.id) === String(x.id))
            ? [String(x.id)]
            : [],
        ),
        state: "queued",
      });
    while (entries.size > 2500) entries.delete(entries.keys().next().value);
    return `data-rv-cover="${E(k)}"`;
  }
  function saveCache() {
    try {
      const keys = Object.keys(cache);
      for (const k of keys.slice(0, Math.max(0, keys.length - 700)))
        delete cache[k];
      localStorage.setItem(STORE, JSON.stringify(cache));
    } catch {
      document
        .querySelectorAll("[data-cover-summary]")
        .forEach(
          (x) =>
            (x.textContent =
              "Covers can display, but the browser cache could not be saved."),
        );
    }
  }
  function holders(k) {
    return [...document.querySelectorAll("#viewRoot [data-rv-cover]")].filter(
      (x) => x.dataset.rvCover === k,
    );
  }
  function paint(k) {
    const entry = entries.get(k);
    if (!entry) return;
    const hit = cache[k],
      src = source(entry.sample);
    for (const box of holders(k)) {
      let img = box.querySelector("img");
      if (src) {
        if (!img) {
          img = document.createElement("img");
          img.className = "rv-cover1861-image";
          img.alt = "Artwork for " + entry.descriptor.title;
          img.decoding = "async";
          img.loading = "lazy";
          img.referrerPolicy = "no-referrer";
          box.append(img);
        }
        if (img.getAttribute("src") !== src) {
          img.hidden = false;
          img.src = src;
        }
        img.classList.add("rv-cover1861-image");
        img.style.objectFit = box.classList.contains("game-art")
          ? "contain"
          : hit?.width && hit?.height && hit.width / hit.height > 1.2
            ? "contain"
            : "cover";
        box.classList.add("rv-cover-ready");
        box.querySelector("[data-cover-state-message]")?.remove();
        if (hit?.sourceUrl) {
          img.title =
            (hit.attribution || hit.provider) +
            " · " +
            (hit.fileUrl || hit.sourceUrl);
          if (
            !box.closest("button") &&
            !box.querySelector(".rv-cover-credit")
          ) {
            const a = document.createElement("a");
            a.className = "rv-cover-credit";
            a.textContent = "Art source ↗";
            a.href = C.safeLink(hit.fileUrl || hit.sourceUrl);
            a.target = "_blank";
            a.rel = "noopener noreferrer";
            a.setAttribute(
              "aria-label",
              "Artwork source and credit for " + entry.descriptor.title,
            );
            box.append(a);
          }
        }
      } else {
        box.classList.remove("rv-cover-ready");
        let state = box.querySelector("[data-cover-state-message]");
        if (!state) {
          state = document.createElement("span");
          state.dataset.coverStateMessage = "";
          state.className = "rv-cover-state";
          box.append(state);
        }
        state.textContent = own(entry.sample)?.protected
          ? "Your cover choice"
          : !enabled()
            ? "Automatic lookup off"
            : !online
              ? "Offline"
              : hit?.state === "review"
                ? "Choose the right edition"
                : hit?.state === "unavailable"
                  ? "No matched cover"
                  : hit?.state === "error"
                    ? "Source unavailable · retry later"
                    : entry.state === "working"
                      ? "Loading artwork…"
                      : "Finding artwork…";
        state.title = hit?.reason || "Automatic poster/cover lookup";
      }
    }
  }
  function allPaint() {
    for (const k of entries.keys()) if (holders(k).length) paint(k);
    summary();
  }
  function summary() {
    const nodes = [...document.querySelectorAll("#viewRoot [data-rv-cover]")],
      loaded = nodes.filter(
        (x) => !!x.querySelector("img:not([hidden])"),
      ).length;
    document
      .querySelectorAll("[data-cover-summary]")
      .forEach(
        (x) =>
          (x.textContent = !enabled()
            ? "Automatic covers are off."
            : !online
              ? "Offline · saved artwork remains available."
              : nodes.length
                ? `${loaded} of ${nodes.length} visible-page artworks available${busy ? " · loading matched covers…" : "."}`
                : "Open a media page to load matching covers."),
      );
  }
  function priority(k) {
    let p = 3;
    for (const el of holders(k)) {
      const r = el.getBoundingClientRect();
      if (
        r.bottom > 0 &&
        r.top < innerHeight &&
        r.right > 0 &&
        r.left < innerWidth
      )
        return 0;
      if (r.bottom > -innerHeight && r.top < innerHeight * 2) p = 1;
      else p = Math.min(p, 2);
    }
    return p;
  }
  function eligible(k, e) {
    if (!holders(k).length || own(e.sample)?.protected || source(e.sample))
      return false;
    const hit = cache[k];
    return (
      !hit ||
      (hit.until <= Date.now() &&
        hit.state !== "ready" &&
        (hit.attempts || 0) < 3)
    );
  }
  const waitingSaves = new Map();
  function flush() {
    if (
      !ctx?.active() ||
      !enabled() ||
      document.querySelector(
        "dialog[open],#viewRoot input:focus,#viewRoot textarea:focus",
      )
    )
      return;
    for (const [k, result] of waitingSaves) {
      const e = entries.get(k);
      if (!e) {
        waitingSaves.delete(k);
        continue;
      }
      ctx.mutate((d) => {
        for (const id of e.ids) {
          const row = d.backlog.find((x) => String(x.id) === id);
          if (
            !row ||
            key(row) !== k ||
            own(row)?.protected ||
            (C.safeImage(row.metadata184?.artwork) &&
              !row.metadata184?.artworkBrokenAt)
          )
            continue;
          row.metadata184 = {
            ...row.metadata184,
            artwork: result.artwork,
            cacheAllowed: !!result.cacheAllowed,
            artworkBrokenAt: 0,
            previousArtwork: "",
            artworkProvider: C.text(result.provider, 80),
            artworkSourceUrl: C.safeLink(result.fileUrl || result.sourceUrl),
            artworkAttribution: C.text(result.attribution, 500),
          };
        }
      });

      waitingSaves.delete(k);
    }
  }
  function apply(k, result) {
    const e = entries.get(k);
    if (!e) return;
    if (result.state === "ready" && !C.safeImage(result.artwork))
      result = {
        state: "error",
        reason: "The source returned an unsupported image address.",
      };
    const existing = cache[k],
      attempts = result.state === "error" ? (existing?.attempts || 0) + 1 : 0;
    cache[k] = {
      ...result,
      failedArtwork: existing?.failedArtwork || "",
      attempts,
      until:
        Date.now() +
        (result.state === "ready"
          ? 30 * 86400000
          : result.state === "pending"
            ? 2000
            : result.state === "error"
              ? attempts >= 3
                ? 86400000
                : Math.max(30000, (Number(result.retryAfter) || 0) * 1000)
              : 86400000),
    };
    e.state = result.state;
    if (result.state === "ready" && C.safeImage(result.artwork) && e.ids.size)
      waitingSaves.set(k, result);
    paint(k);
  }
  async function pump() {
    if (busy || !ctx?.active() || !enabled() || !online) return;
    const jobs = [...entries]
      .filter(([k, e]) => eligible(k, e))
      .sort((a, b) => priority(a[0]) - priority(b[0]))
      .slice(0, 8);
    if (!jobs.length) {
      allPaint();
      const next = Math.min(
        ...[...entries]
          .filter(
            ([k]) =>
              holders(k).length &&
              ["error", "pending"].includes(cache[k]?.state) &&
              (cache[k].attempts || 0) < 3,
          )
          .map(([k]) => cache[k].until),
      );
      if (Number.isFinite(next)) schedule(Math.max(500, next - Date.now()));
      return;
    }
    busy = true;
    controller = new AbortController();
    jobs.forEach(([k, e]) => {
      e.state = "working";
      paint(k);
    });
    summary();
    try {
      const r = await fetch("/api/artwork/resolve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Rowanvale-Intent": "resolve-artwork",
        },
        body: JSON.stringify({
          items: jobs.map(([, e]) => e.descriptor),
          refresh: jobs.some(([, e]) => e.refresh),
        }),
        signal: AbortSignal.any([
          controller.signal,
          AbortSignal.timeout(65000),
        ]),
      });
      const v = await r.json();
      if (!r.ok) throw Error(v.error || "Artwork lookup failed.");
      if (!Array.isArray(v.results) || v.results.length !== jobs.length)
        throw Error("Artwork source returned an incomplete response.");
      if (enabled())
        jobs.forEach(([k, e], i) => {
          e.refresh = false;
          apply(k, v.results[i]);
        });
      flush();
      saveCache();
    } catch (e) {
      if (e.name !== "AbortError" && online) {
        for (const [k] of jobs) apply(k, { state: "error", reason: e.message });
        saveCache();
      } else for (const [, e] of jobs) e.state = "queued";
    } finally {
      busy = false;
      controller = null;
      allPaint();
      schedule(250);
    }
  }
  function schedule(ms = 100) {
    clearTimeout(timer);
    if (!ctx?.active() || !enabled() || !online) return;
    timer = setTimeout(() => pump(), ms);
  }
  function scan() {
    if (!ctx) return;
    observer?.disconnect();
    observer = new IntersectionObserver(() => schedule(), {
      rootMargin: "100% 0px",
    });
    for (const node of document.querySelectorAll("#viewRoot [data-rv-cover]")) {
      observer.observe(node);
      paint(node.dataset.rvCover);
    }
    schedule();
  }
  function mount() {
    scan();
    rootObserver?.disconnect();
    const root = document.getElementById("viewRoot");
    if (root) {
      rootObserver = new MutationObserver((rows) => {
        if (
          rows.some((r) =>
            [...r.addedNodes].some(
              (n) =>
                n.nodeType === 1 &&
                (n.matches?.("[data-rv-cover]") ||
                  n.querySelector?.("[data-rv-cover]")),
            ),
          )
        )
          scan();
      });
      rootObserver.observe(root, { childList: true, subtree: true });
    }
  }
  function retry() {
    for (const [k, v] of Object.entries(cache))
      if (v.state !== "ready") {
        delete cache[k];
        if (entries.has(k)) entries.get(k).refresh = true;
      }
    saveCache();
    scan();
  }
  document.addEventListener(
    "error",
    (e) => {
      const img = e.target;
      if (img.tagName !== "IMG") return;
      const box = img.closest("[data-rv-cover]");
      if (!box) return;
      img.hidden = true;
      const k = box.dataset.rvCover,
        entry = entries.get(k);
      if (!entry || own(entry.sample)?.protected) return;
      const old = cache[k] || {},
        failedResolvedImage = old.state === "ready" && old.artwork === img.src;
      box.classList.remove("rv-cover-ready");
      if (entry.ids.size && ctx?.active())
        ctx.mutate((d) => {
          for (const id of entry.ids) {
            const row = d.backlog.find((x) => String(x.id) === id);
            if (row && !own(row)?.protected)
              row.metadata184 = {
                ...row.metadata184,
                artwork: "",
                artworkBrokenAt: Date.now(),
                previousArtwork: img.src,
              };
          }
        });
      cache[k] = {
        ...old,
        state: "error",
        artwork: "",
        failedArtwork: img.src,
        reason: "The selected image did not load.",
        attempts: failedResolvedImage ? 3 : 0,
        until: failedResolvedImage ? Date.now() + 86400000 : 0,
      };
      paint(k);
      saveCache();
      schedule();
    },
    true,
  );
  document.addEventListener(
    "load",
    (e) => {
      if (e.target.tagName === "IMG" && e.target.closest("[data-rv-cover]")) {
        e.target.closest("[data-rv-cover]").classList.add("rv-cover-ready");
        summary();
      }
    },
    true,
  );
  addEventListener("online", () => {
    online = true;
    scan();
  });
  addEventListener("offline", () => {
    online = false;
    controller?.abort();
    clearTimeout(timer);
    allPaint();
  });
  document.addEventListener("close", () => setTimeout(flush, 0), true);
  document.addEventListener("focusout", () => setTimeout(flush, 0));
  return {
    bind(c) {
      ctx = c;
    },
    source,
    mark,
    key,
    describe,
    mount,
    retry,
    changed() {
      if (!enabled()) {
        controller?.abort();
        clearTimeout(timer);
      } else scan();
      allPaint();
    },
    summary: () => ({
      enabled: enabled(),
      busy,
      entries: entries.size,
      loaded: Object.values(cache).filter((x) => x.state === "ready").length,
    }),
    pause() {
      controller?.abort();
      clearTimeout(timer);
    },
  };
})();
