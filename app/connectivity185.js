/* Online lifecycle: durable metadata jobs, one worker, verified service state and safe private sync. */
const RVConnect = (() => {
  "use strict";
  const C = RVLivingCore,
    E = RVEnrichmentCore,
    N = RVConnectionCore,
    K = "rowanvale.enrichment185",
    SK = "rowanvale.sync185",
    META = "rowanvale.enrichment185.limits",
    escape = (x) =>
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
    started = false,
    queue = [],
    providers = [],
    busy = false,
    abort = null,
    timer = null,
    checkTimer = null,
    cloudTimer = null,
    client = null,
    clientKey = "",
    subscription = null,
    initFlight = new N.SingleFlight(),
    healthFlight = new N.SingleFlight(),
    sync = null,
    cloudUser = null,
    cloudState = {
      status: "not-configured",
      message: "Cloud synchronization is not configured.",
    },
    network = { status: "checking", message: "Checking the local server…" },
    artState = { status: "idle", message: "Automatic artwork is starting." },
    lastProbe = 0,
    stopped = false,
    needsScan = false,
    forceItems = new Set(),
    priority = { visible: [], featured: [], nearby: [] },
    firstRequestAt = 0,
    firstArtworkAt = 0,
    startAt = 0;
  const options = () => ({
      ...{ automaticArtwork: false, autoSync: false },
      ...C.obj(ctx?.data().settings.online185),
      automaticArtwork:
        ctx?.data().settings.coverArtwork1861?.enabled !== false &&
        !!ctx?.data().settings.online185?.automaticArtwork,
    }),
    items = () => C.arr(ctx?.data().backlog),
    qread = () => {
      try {
        const v = JSON.parse(localStorage.getItem(K) || "[]");
        return Array.isArray(v)
          ? v.filter(
              (j) =>
                j &&
                typeof j.itemId === "string" &&
                typeof j.fingerprint === "string",
            )
          : [];
      } catch {
        return [];
      }
    };
  function qsave() {
    try {
      localStorage.setItem(K, JSON.stringify(queue));
      return true;
    } catch (e) {
      artState = {
        status: "storage-blocked",
        message:
          "The artwork queue could not be saved. Free browser storage before retrying.",
      };
      paint();
      return false;
    }
  }
  function pending() {
    return queue.filter((j) => ["queued", "retry", "working"].includes(j.state))
      .length;
  }
  function paint() {
    document
      .querySelectorAll("[data-rvc-summary]")
      .forEach((el) => (el.innerHTML = summary()));
    const list = document.getElementById("rvc-jobs");
    if (list) list.innerHTML = jobList();
    const cloud = document.getElementById("rvc-cloud-state");
    if (cloud) cloud.textContent = cloudState.message;
    document.dispatchEvent(
      new CustomEvent("rowanvale:connection-state", { detail: snapshot() }),
    );
  }
  function snapshot() {
    return {
      network: { ...network },
      artwork: {
        ...artState,
        pending: pending(),
        firstRequestMs: firstRequestAt
          ? Math.round(firstRequestAt - startAt)
          : null,
        firstArtworkMs: firstArtworkAt
          ? Math.round(firstArtworkAt - startAt)
          : null,
        review: queue.filter((j) => j.state === "review").length,
      },
      providers: structuredClone(providers),
      cloud: {
        ...cloudState,
        email: cloudUser?.email || "",
        userId: cloudUser?.id || "",
      },
    };
  }
  function summary() {
    return `<div class="rvc-status-grid" data-rvc-summary-content><article><span class="rvc-dot ${network.status === "reachable" ? "is-ready" : ""}"></span><div><b>${network.status === "reachable" ? "Local service ready" : network.status === "offline" ? "Offline · local first" : "Connection needs attention"}</b><p>${escape(network.message)}</p></div></article><article><span class="rvc-dot ${artState.status === "active" ? "is-ready" : ""}"></span><div><b>Saved-item metadata</b><p>${escape(artState.message)}${pending() ? " " + pending() + " pending." : ""}</p></div></article><article><span class="rvc-dot ${cloudState.status === "synced" ? "is-ready" : ""}"></span><div><b>Private cloud copy</b><p>${escape(cloudState.message)}</p></div></article></div>`;
  }
  async function json(
    path,
    { signal, method = "GET", body, headers = {} } = {},
  ) {
    const r = await fetch(path, {
      method,
      body,
      signal: signal || AbortSignal.timeout(12000),
      cache: "no-store",
      headers: { Accept: "application/json", ...headers },
    });
    let v;
    try {
      v = await r.json();
    } catch {
      throw Error("The service returned an unreadable response.");
    }
    if (!r.ok)
      throw Object.assign(Error(v.error || "The request failed."), {
        status: r.status,
        retryAfter: v.retryAfter || Number(r.headers.get("retry-after")) || 0,
      });
    return v;
  }
  function active() {
    return started && ctx?.active() && !stopped;
  }
  function enqueue(force = false) {
    if (!active()) return;
    if (busy) {
      needsScan = true;
      return;
    }
    queue = E.enqueue(qread(), items(), Date.now(), force);
    for (const id of forceItems) {
      const item = items().find((x) => x.id === id);
      if (item) {
        queue = queue.filter((j) => j.itemId !== id);
        queue.push(E.newJob(item));
      }
    }
    forceItems.clear();
    if (qsave()) paint();
    schedule();
  }
  function schedule(ms = 250) {
    clearTimeout(timer);
    if (
      !active() ||
      !options().automaticArtwork ||
      network.status !== "reachable"
    )
      return;
    timer = setTimeout(() => pump().catch(failed), ms);
  }
  function failed(e) {
    artState = { status: "error", message: C.text(e.message || e, 220) };
    paint();
  }
  const sleep = (ms, signal) =>
    new Promise((ok, no) => {
      const t = setTimeout(ok, ms);
      signal?.addEventListener(
        "abort",
        () => {
          clearTimeout(t);
          no(new DOMException("Cancelled", "AbortError"));
        },
        { once: true },
      );
    });
  function limits() {
    try {
      return JSON.parse(localStorage.getItem(META) || "{}");
    } catch {
      return {};
    }
  }
  function quota() {
    let v = limits();
    if (!v.start || Date.now() - v.start > 3600000)
      v = { start: Date.now(), used: 0 };
    return v;
  }
  function countRequest() {
    const v = quota();
    v.used++;
    localStorage.setItem(META, JSON.stringify(v));
  }
  function providerReady(type) {
    return providers.some((p) => p.ready && p.kinds.includes(type));
  }
  async function chosenDetail(type, base, signal) {
    if (
      !base?.sourceId ||
      !["Open Library", "IGDB", "TMDB", "Steam"].includes(base.provider)
    )
      return base;
    const v = await json(
      "/api/metadata/details?type=" +
        encodeURIComponent(type) +
        "&provider=" +
        encodeURIComponent(base.provider) +
        "&id=" +
        encodeURIComponent(base.sourceId),
      { signal },
    );
    return {
      ...base,
      ...Object.fromEntries(
        Object.entries(v.result || {}).filter(([, v]) => v !== "" && v !== 0),
      ),
      type,
    };
  }
  async function work(job, signal) {
    let x = items().find((x) => x.id === job.itemId);
    if (!x) {
      job.state = "removed";
      return;
    }
    if (E.fingerprint(x) !== job.fingerprint) {
      job.state = "superseded";
      return;
    }
    if (
      document.querySelector("dialog[open]") ||
      document.querySelector("#viewRoot input:focus,#viewRoot textarea:focus")
    ) {
      job.state = "queued";
      job.nextAt = Date.now() + 3000;
      return;
    }
    const before = E.fingerprint(x),
      facts = E.facts(x),
      direct = E.deterministic(x);
    if (direct) {
      if (
        !ctx.mutate((d) => {
          const target = d.backlog.find((x) => x.id === job.itemId);
          if (target && E.fingerprint(target) === before)
            C.applyMetadata(target, direct);
        })
      ) {
        throw Error("The selected artwork could not be saved.");
      }
      x = items().find((x) => x.id === job.itemId);
      job.fingerprint = E.fingerprint(x);
      ctx.artworkUpdated?.(job.itemId);
    }
    if (!E.missing(x)) {
      job.state = "complete";
      job.updatedAt = Date.now();
      return;
    }
    if (!providerReady(facts.type)) {
      job.state = "setup-needed";
      job.error =
        "Configure a supported " + facts.type + " source to enrich this story.";
      return;
    }
    const v = quota();
    if (!RVArtworkQueue.permitted(job, priority, v)) {
      job.state = "queued";
      job.nextAt = v.start + 3600000;
      job.budgetDeferred = true;
      artState = {
        status: "limited",
        message:
          "The background lookup budget is paused until " +
          new Date(job.nextAt).toLocaleTimeString() +
          ". Known cover IDs still display immediately.",
      };
      return;
    }
    delete job.budgetDeferred;
    if (!firstRequestAt) firstRequestAt = performance.now();
    if (RVArtworkQueue.rank(job.itemId, priority) === 3) countRequest();
    let candidates;
    if (
      facts.sourceId &&
      ["Open Library", "IGDB", "TMDB", "Steam"].includes(facts.provider)
    ) {
      candidates = [
        await chosenDetail(
          facts.type,
          {
            type: facts.type,
            ...C.meta(x),
            sourceId: facts.sourceId,
            provider: facts.provider,
            title: x.title,
          },
          signal,
        ),
      ];
    } else {
      const query = x.type === "Book" && facts.isbn ? facts.isbn : x.title;
      const result = await json(
        "/api/metadata/search?type=" +
          encodeURIComponent(facts.type) +
          "&q=" +
          encodeURIComponent(query.slice(0, 120)),
        { signal },
      );
      candidates = result.results;
    }
    const ranked = E.rank(x, candidates);
    job.updatedAt = Date.now();
    if (!ranked.best) {
      job.state = "unavailable";
      job.error =
        "No reliable match was returned. You can choose one manually.";
      return;
    }
    if (!ranked.automatic) {
      job.state = "review";
      job.candidates = ranked.ranked.slice(0, 4).map((r) => ({
        candidate: C.sanitizeMetadata(r.candidate),
        type: r.candidate.type,
        score: r.score,
        reasons: r.reasons,
      }));
      job.error =
        "A match needs your confirmation. No automatic changes were made.";
      return;
    }
    const best = await chosenDetail(facts.type, ranked.best.candidate, signal),
      current = items().find((x) => x.id === job.itemId);
    if (!current || E.fingerprint(current) !== job.fingerprint) {
      job.state = "superseded";
      return;
    }
    if (document.querySelector("dialog[open]")) {
      job.state = "queued";
      job.nextAt = Date.now() + 3000;
      return;
    }
    if (
      current?.metadata184?.artworkBrokenAt &&
      best.artwork === current.metadata184.previousArtwork
    )
      best.artwork = "";
    const ok = ctx.mutate((d) => {
      const target = d.backlog.find((x) => x.id === job.itemId);
      if (target && E.fingerprint(target) === job.fingerprint)
        C.applyMetadata(target, best);
    });
    if (!ok)
      throw Error(
        "The metadata could not be saved. Your previous library is intact.",
      );
    job.state =
      best.artwork || !current?.metadata184?.artworkBrokenAt
        ? "complete"
        : "unavailable";
    job.fingerprint = E.fingerprint(items().find((x) => x.id === job.itemId));
    job.error =
      job.state === "unavailable"
        ? "The provider returned the same unavailable cover. Choose a different image manually."
        : "";
    delete job.candidates;
    if (!firstArtworkAt && best.artwork) firstArtworkAt = performance.now();
    ctx.artworkUpdated?.(job.itemId);
    document.dispatchEvent(
      new CustomEvent("rowanvale:media-enriched", {
        detail: { itemId: job.itemId },
      }),
    );
  }
  async function runWorker() {
    queue = qread();
    for (const j of queue) if (j.state === "working") j.state = "queued";
    const signal = abort.signal;
    let done = 0;
    const visited = new Set();
    while (true) {
      const job = RVArtworkQueue.select(
        queue.filter((j) => !visited.has(j.id)),
        priority,
        Date.now(),
        quota(),
      );
      if (!job) break;
      visited.add(job.id);
      if (
        !active() ||
        !options().automaticArtwork ||
        network.status !== "reachable" ||
        signal.aborted ||
        done >= 24
      )
        break;
      if (job.budgetDeferred && RVArtworkQueue.rank(job.itemId, priority) < 3)
        job.nextAt = Date.now();
      job.state = "working";
      qsave();
      try {
        await work(job, signal);
        done++;
      } catch (e) {
        if (e.name === "AbortError") {
          job.state = "queued";
          job.nextAt = Date.now() + 3000;
          break;
        }
        E.retry(job, e);
      } finally {
        job.updatedAt = Date.now();
        if (!qsave()) break;
        paint();
      }
      await sleep(1300, signal);
    }
  }
  async function pump() {
    if (
      busy ||
      !active() ||
      !options().automaticArtwork ||
      network.status !== "reachable"
    )
      return;
    if (
      document.querySelector(
        "dialog[open],#viewRoot input:focus,#viewRoot textarea:focus",
      )
    ) {
      artState = {
        status: "waiting",
        message:
          "Waiting for your current editor to close before updating artwork.",
      };
      paint();
      schedule(4000);
      return;
    }
    busy = true;
    abort = new AbortController();
    artState = {
      status: "active",
      message: "Checking your shelves for reliable matches.",
    };
    paint();
    try {
      if (navigator.locks)
        await navigator.locks.request(
          "rowanvale-artwork185",
          { ifAvailable: true },
          async (lock) => {
            if (lock) await runWorker();
          },
        );
      else await runWorker();
    } catch (e) {
      if (e.name !== "AbortError") failed(e);
    } finally {
      busy = false;
      if (needsScan) {
        needsScan = false;
        enqueue();
      }
      const waiting = queue.filter((j) =>
        ["queued", "retry"].includes(j.state),
      );
      if (
        artState.status !== "limited" &&
        artState.status !== "storage-blocked"
      )
        artState = {
          status: "idle",
          message: queue.some((j) => j.state === "review")
            ? "Some matches need your review. Confirm them in Connectivity."
            : "Your available artwork jobs have been checked.",
        };
      paint();
      ctx.artworkUpdated?.();
      const next = Math.min(...waiting.map((j) => j.nextAt || Date.now()));
      if (Number.isFinite(next))
        schedule(Math.max(500, Math.min(3600000, next - Date.now())));
    }
  }
  async function check({ probe = false } = {}) {
    if (!active()) return;
    return healthFlight.run(async () => {
      if (!navigator.onLine) {
        network = {
          status: "offline",
          message:
            "Your saved profile and shelves are available. Pending work will resume when services can be reached.",
        };
        paint();
        return;
      }
      try {
        const v = await json("/api/metadata/status");
        providers = v.providers || [];
        network = {
          status: "reachable",
          message:
            "The local server answered. Provider readiness is checked separately.",
        };
        enqueue();
        if (probe || Date.now() - lastProbe > 60000) {
          lastProbe = Date.now();
          const services = await json("/api/connectivity");
          providers = services.providers || providers;
          network.message =
            "Local server verified at " + new Date().toLocaleTimeString() + ".";
        }
        for (const j of queue)
          if (
            j.state === "setup-needed" &&
            providerReady(items().find((x) => x.id === j.itemId)?.type || "")
          ) {
            j.state = "queued";
            j.nextAt = Date.now();
          }
        qsave();
        enqueue();
        await initCloud();
        if (options().autoSync) await flushCloud(false);
        ctx.recoverServices();
      } catch (e) {
        network = {
          status: "unreachable",
          message:
            e.message ||
            "The local server could not be reached. Local edits remain safe.",
        };
      } finally {
        paint();
      }
    });
  }
  async function initCloud() {
    return initFlight.run(async () => {
      const cfg = ctx.accountConfig();
      if (!cfg.url || !cfg.key) {
        subscription?.unsubscribe();
        client = null;
        clientKey = "";
        cloudUser = null;
        cloudState = {
          status: "not-configured",
          message:
            "Configure your own Supabase project to enable a private cloud copy.",
        };
        return null;
      }
      let safe;
      try {
        safe = N.configuration(cfg.url, cfg.key);
      } catch (e) {
        cloudState = { status: "setup-needed", message: e.message };
        paint();
        return null;
      }
      const key = safe.url + "|" + safe.key;
      if (client && clientKey === key) return client;
      if (!window.supabase?.createClient) {
        cloudState = {
          status: "setup-needed",
          message:
            "The bundled account library could not be loaded. Check the application files.",
        };
        return null;
      }
      subscription?.unsubscribe();
      client = window.supabase.createClient(safe.url, safe.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      });
      clientKey = key;
      let saved = {};
      try {
        saved = JSON.parse(localStorage.getItem(SK) || "{}");
      } catch {
        saved = {};
      }
      sync = N.createSync({
        client,
        getData: ctx.data,
        replace: ctx.replace,
        canReplace: () =>
          !document.querySelector(
            "dialog[open],#viewRoot input:focus,#viewRoot textarea:focus",
          ),
        validate: ctx.validate,
        readState: () => saved,
        writeState: (v) => localStorage.setItem(SK, JSON.stringify(v)),
        onState: (v) => {
          cloudState = v;
          paint();
        },
      });
      try {
        await sync.authenticate();
        cloudUser =
          (await N.timeout(client.auth.getSession())).data?.session?.user ||
          null;
        cloudState = {
          ...sync.snapshot(),
          status: cloudUser ? "ready" : "signed-out",
          message: cloudUser
            ? "Account verified. Private cloud synchronization is available."
            : "Sign in to your configured cloud account.",
        };
        subscription = client.auth.onAuthStateChange((event, session) => {
          cloudUser = session?.user || null;
          ctx.cloudLegacy(
            client,
            cloudUser,
            session ? "Signed in" : "Signed out",
          );
          setTimeout(() => {
            if (!session) {
              sync?.signedOut();
              cloudState = { ...sync.snapshot() };
              paint();
            } else {
              paint();
              if (options().autoSync) flushCloud(false).catch(() => {});
            }
          }, 0);
        }).data.subscription;
        ctx.cloudLegacy(client, cloudUser, cloudState.message);
        return client;
      } catch (e) {
        client = null;
        cloudUser = null;
        clientKey = "";
        cloudState = { status: "error", message: e.message };
        paint();
        return null;
      }
    });
  }
  async function flushCloud(explicit = false, resolution = "") {
    if (!active()) return;
    if (!navigator.onLine || network.status !== "reachable") {
      cloudState = {
        ...cloudState,
        status: "pending",
        message:
          "Your local changes are safe. Cloud work is waiting for the connection.",
      };
      paint();
      return;
    }
    if (!(await initCloud()) || !sync) return;
    try {
      await sync.flush({ explicit, resolution });
      cloudState = sync.snapshot();
      if (cloudState.pending && options().autoSync) scheduleCloud();
    } catch (e) {
      cloudState = sync.snapshot();
    } finally {
      paint();
    }
  }
  function scheduleCloud() {
    clearTimeout(cloudTimer);
    if (!options().autoSync || !active()) return;
    cloudTimer = setTimeout(() => flushCloud(false), 1000);
  }
  function changed() {
    if (!active()) return;
    if (sync) {
      try {
        sync.pending();
      } catch (e) {
        cloudState = {
          status: "error",
          message:
            "Your local changes are saved, but the cloud queue could not be persisted: " +
            e.message,
        };
        paint();
      }
    }
    clearTimeout(checkTimer);
    checkTimer = setTimeout(() => {
      enqueue();
      scheduleCloud();
    }, 400);
  }
  function start() {
    if (started) {
      if (active() && network.status !== "reachable" && navigator.onLine)
        check().catch(failed);
      return;
    }
    startAt = performance.now();
    started = true;
    stopped = false;
    queue = qread();
    for (const j of queue) if (j.state === "working") j.state = "queued";
    if (!options().automaticArtwork)
      artState = {
        status: "disabled",
        message:
          "Saved-item metadata backfill is off. Page covers have their own setting.",
      };
    addEventListener("online", () => {
      stopped = false;
      check({ probe: true });
    });
    addEventListener("offline", () => {
      abort?.abort();
      clearTimeout(timer);
      network = {
        status: "offline",
        message:
          "Offline. Your local profile, edits and shelves remain available.",
      };
      paint();
    });
    document.addEventListener("rowanvale:artwork-failed", (e) => {
      const x = items().find((x) => x.id === e.detail.itemId);
      if (
        !x ||
        C.arr(C.meta(x).manualFields).includes("artwork") ||
        x.metadata184?.artworkBrokenAt
      )
        return;
      if (
        ctx.mutate((d) => {
          const row = d.backlog.find((y) => y.id === x.id);
          row.metadata184 = {
            ...row.metadata184,
            previousArtwork: E.facts(row).artwork,
            artwork: "",
            artworkBrokenAt: Date.now(),
          };
        })
      ) {
        forceItems.add(x.id);
        enqueue();
      }
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden && Date.now() - lastProbe > 60000) check();
    });
    addEventListener("storage", (e) => {
      if (e.key === K) {
        if (!busy) {
          queue = qread();
          paint();
        } else needsScan = true;
      }
      if (e.key === "mindforge.account.config") {
        client = null;
        clientKey = "";
        subscription?.unsubscribe();
        check({ probe: true });
      }
    });
    check().catch(failed);
  }
  const b = (label, a, extra = "") =>
    `<button type="button" class="rvp-button" data-rvc="${a}" ${extra}>${label}</button>`;
  function jobList() {
    return (
      queue
        .filter((j) =>
          ["review", "failed", "unavailable", "setup-needed", "retry"].includes(
            j.state,
          ),
        )
        .slice(0, 30)
        .map((j) => {
          const x = items().find((x) => x.id === j.itemId);
          return `<article class="rvc-job"><header><b>${escape(x?.title || "Removed story")}</b><span>${escape(j.state.replaceAll("-", " "))}</span></header><p>${escape(j.error || "")}</p>${
            j.state === "review"
              ? `<div class="rvc-candidates">${C.arr(j.candidates)
                  .map(
                    (r, i) =>
                      `<div>${r.candidate.artwork ? `<img src="${escape(r.candidate.artwork)}" alt="Candidate cover" loading="lazy" referrerpolicy="no-referrer">` : ""}<div><b>${escape(r.candidate.title)}</b><p>${escape(r.candidate.author || r.candidate.creators || "")} · ${r.candidate.year || "Year unknown"}</p><small>${escape(r.reasons.join(" · "))}</small><button type="button" class="rvp-button" data-rvc="approve" data-job="${escape(j.itemId)}" data-choice="${i}">Use this confirmed match</button></div></div>`,
                  )
                  .join("")}</div>`
              : ""
          }${b("Choose artwork manually", "manual", `data-item="${escape(j.itemId)}"`)}</article>`;
        })
        .join("") ||
      '<p class="rvc-muted">No matches need your attention. Correct any cover from its story details whenever you want.</p>'
    );
  }
  function panel() {
    const cfg = ctx.accountConfig(),
      o = options();
    return `<div class="rvc-panel"><header><div><span class="rvp-kicker">ACCOUNT, MEDIA & CONNECTIVITY</span><h2>Connected when it counts.</h2><p>Local work stays safe while services reconnect.</p></div>${b("Close", "close")}</header><div data-rvc-summary>${summary()}</div><section><h3>Your connection settings</h3><form id="rvc-preferences"><label class="rvp-check"><input name="automaticCovers" type="checkbox" ${ctx.data().settings.coverArtwork1861?.enabled !== false ? "checked" : ""}> Automatically load matched covers on every media page</label><p>Games, books, films, TV and anime load as you browse, including unsaved directory entries. Account-free public cover sources are included. Personal cover choices are preserved.</p><p data-cover-summary role="status"></p><button type="button" class="rvp-button" data-rvc="retry-covers">Retry unavailable covers</button><label class="rvp-check"><input name="automaticArtwork" type="checkbox" ${o.automaticArtwork ? "checked" : ""}> Also backfill saved-item descriptions and metadata while online</label><p>Only media titles, formats and relevant identifiers go to providers. High-confidence matches are saved automatically. Uncertain matches wait for your confirmation; custom artwork and manual text are protected. Visible shelves and featured media load first, within provider rate limits. Additional background lookups are limited to twelve stories an hour.</p><label class="rvp-check"><input name="autoSync" type="checkbox" ${o.autoSync ? "checked" : ""}> Automatically sync my private workspace with my signed-in cloud account</label><p>This includes your saved profile, library, notes, wellness records, XP and preferences. It is separate from shared-profile snapshots. A first-time account binding and conflicting edits always require review.</p><button type="submit" class="rvp-button is-primary">Save connection preferences</button></form><div class="rvp-action-row">${b("Check & reconnect", "reconnect")}${b("Retry failed artwork jobs", "retry")}${b("Pause current artwork work", "pause")}${b("Check all saved artwork", "verify-images")}</div><p id="rvc-message" role="status"></p></section><section><h3>Metadata sources</h3><div id="rvc-provider-list">${providerList()}</div><p class="rvc-muted">Private API credentials belong in the local server’s .env file. Existing opt-outs remain respected. See the included provider setup guide.</p></section><section><h3>Your private cloud account</h3><p id="rvc-cloud-state" role="status">${escape(cloudState.message)}</p><form id="rvc-config"><label>Supabase project URL<input type="url" name="url" value="${escape(cfg.url || "")}" placeholder="https://your-project.supabase.co"></label><label>Publishable or anon key<input type="password" name="key" value="${escape(cfg.key || "")}" autocomplete="off"></label><button type="submit" class="rvp-button">Save account configuration</button></form><form id="rvc-sign-in"><label>Email for your configured cloud account<input name="email" type="email" required autocomplete="email" value="${escape(cloudUser?.email || "")}"></label><button type="submit" class="rvp-button">Send sign-in link</button></form><div class="rvp-action-row">${b("Save private cloud copy", "save-cloud")}${b("Restore private cloud copy", "restore-cloud")}${b("Resolve using this device", "keep-local")}${b("Sign out of cloud", "signout")}</div><p class="rvc-muted">Cloud storage requires the included SQL migration and your own Supabase project. Cloud authentication is separate from the local device profile. Steam, Xbox, PlayStation and Discord entries remain honest local shortcuts.</p></section><section><h3>Artwork matches to review</h3><div id="rvc-jobs">${jobList()}</div></section></div>`;
  }
  function providerList() {
    return providers.length
      ? providers
          .map(
            (p) =>
              `<article class="rvc-provider"><div><b>${escape(p.name)}</b><p>${escape(p.kinds.join(" · "))}</p></div><span>${p.reachability ? escape(p.reachability) : p.ready ? "Configured" : "Setup needed"}</span></article>`,
          )
          .join("")
      : "<p>Sources will appear after the local server answers.</p>";
  }
  function note(m, error = false) {
    const e = document.getElementById("rvc-message");
    if (e) {
      e.textContent = m;
      e.classList.toggle("is-error", error);
    }
  }
  function open() {
    document.getElementById("rvc-dialog")?.remove();
    const d = document.createElement("dialog");
    d.id = "rvc-dialog";
    d.className = "rvc-dialog";
    d.innerHTML = panel();
    document.body.append(d);
    d.addEventListener("close", () => d.remove());
    d.showModal();
    check({ probe: true })
      .then(() => {
        const p = d.querySelector("#rvc-provider-list");
        if (p) p.innerHTML = providerList();
      })
      .catch((e) => note(e.message, true));
    d.querySelector("#rvc-preferences").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      if (
        !ctx.mutate((x) => {
          x.settings.coverArtwork1861 = { enabled: f.has("automaticCovers") };
          x.settings.online185 = {
            ...x.settings.online185,
            automaticArtwork: f.has("automaticArtwork"),
            autoSync: f.has("autoSync"),
          };
          if (x.living184)
            x.living184.preferences.online = f.has("automaticArtwork");
        })
      ) {
        note(
          "Preferences could not be saved. Your earlier choices are unchanged.",
          true,
        );
        return;
      }
      RVCovers.changed();
      if (!options().automaticArtwork) {
        abort?.abort();
        artState = { status: "disabled", message: "Automatic artwork is off." };
      } else {
        stopped = false;
        enqueue();
      }
      if (options().autoSync) scheduleCloud();
      paint();
      note("Connection preferences saved.");
    };
    d.querySelector("#rvc-config").onsubmit = async (e) => {
      e.preventDefault();
      try {
        const f = new FormData(e.target),
          url = String(f.get("url")).trim(),
          key = String(f.get("key")).trim();
        const cfg =
          url || key ? N.configuration(url, key) : { url: "", key: "" };
        ctx.saveAccountConfig(cfg);
        subscription?.unsubscribe();
        client = null;
        clientKey = "";
        await initCloud();
        paint();
        note(
          cloudState.status === "error"
            ? cloudState.message
            : "Configuration saved. Account sign-in is a separate step.",
          cloudState.status === "error",
        );
      } catch (e) {
        note(e.message, true);
      }
    };
    d.querySelector("#rvc-sign-in").onsubmit = async (e) => {
      e.preventDefault();
      const email = new FormData(e.target).get("email");
      try {
        const c = await initCloud();
        if (!c) throw Error(cloudState.message);
        const r = await N.timeout(
          c.auth.signInWithOtp({
            email,
            options: { emailRedirectTo: location.origin + location.pathname },
          }),
        );
        if (r.error) throw r.error;
        note(
          "The configured service accepted the sign-in request. Check your email.",
        );
      } catch (e) {
        note(e.message, true);
      }
    };
    d.onclick = async (e) => {
      const control = e.target.closest("[data-rvc]");
      if (!control) return;
      const a = control.dataset.rvc;
      control.disabled = true;
      try {
        if (a === "close") {
          d.close();
          return;
        }
        if (a === "reconnect") {
          stopped = false;
          await check({ probe: true });
          const p = d.querySelector("#rvc-provider-list");
          if (p) p.innerHTML = providerList();
        }
        if (a === "retry") {
          queue = qread();
          for (const j of queue)
            if (["failed", "unavailable", "setup-needed"].includes(j.state)) {
              j.state = "queued";
              j.nextAt = Date.now();
              j.attempts = 0;
            }
          qsave();
          stopped = false;
          schedule();
        }
        if (a === "pause") {
          stopped = true;
          abort?.abort();
          clearTimeout(timer);
          artState = {
            status: "paused",
            message:
              "Artwork work is paused. Choose Check & reconnect to resume.",
          };
          paint();
        }
        if (a === "manual") {
          d.close();
          RVLiving.findArtwork(control.dataset.item);
        }
        if (a === "approve") {
          const job = queue.find((j) => j.itemId === control.dataset.job),
            x = items().find((x) => x.id === job?.itemId),
            candidate = job?.candidates?.[Number(control.dataset.choice)];
          if (!x || !candidate)
            throw Error("This match is no longer available.");
          const fingerprint = E.fingerprint(x),
            chosen = await chosenDetail(x.type, candidate.candidate);
          if (
            E.fingerprint(items().find((y) => y.id === x.id) || x) !==
            fingerprint
          )
            throw Error(
              "This story changed while loading its details. Review the new version.",
            );
          if (
            !ctx.mutate((v) => {
              const target = v.backlog.find((y) => y.id === job.itemId);
              if (!target || E.fingerprint(target) !== fingerprint)
                throw Error("This story changed. Reopen its match.");
              C.applyMetadata(target, chosen);
            })
          ) {
            throw Error("The match could not be saved.");
          }
          job.state = "complete";
          job.fingerprint = E.fingerprint(
            items().find((y) => y.id === job.itemId),
          );
          job.updatedAt = Date.now();
          delete job.candidates;
          qsave();
          paint();
          ctx.refresh();
          note("Your confirmed match is saved.");
        }
        if (a === "retry-covers") {
          RVCovers.retry();
          note("Matching covers are being checked again.");
        }
        if (a === "save-cloud") await flushCloud(true);
        if (a === "restore-cloud") {
          if (
            confirm(
              "Replace this device’s workspace with your private cloud copy? Export a backup first if you may need the current copy.",
            )
          )
            await flushCloud(true, "remote");
        }
        if (a === "keep-local") {
          if (
            confirm(
              "Save this device’s current workspace over the cloud copy? The server retains recent versions in private history.",
            )
          )
            await flushCloud(true, "local");
        }
        if (a === "signout") {
          if (client) {
            const r = await N.timeout(client.auth.signOut());
            if (r.error) throw r.error;
            cloudUser = null;
            sync?.signedOut();
            cloudState = sync?.snapshot() || {
              status: "signed-out",
              message: "Signed out. Local data was kept.",
            };
            ctx.cloudLegacy(client, null, "Signed out");
            paint();
          }
        }
        if (a === "verify-images") await verifyImages();
      } catch (e) {
        note(e.message, true);
      } finally {
        if (control.isConnected) control.disabled = false;
      }
    };
  }
  async function verifyImages() {
    const covers = items()
      .filter(
        (x) =>
          E.facts(x).artwork &&
          !C.arr(C.meta(x).manualFields).includes("artwork"),
      )
      .slice(0, 80);
    let checked = 0,
      broken = 0;
    note("Checking selected artwork…");
    for (const x of covers) {
      if (!navigator.onLine) break;
      try {
        await new Promise((ok, no) => {
          const img = new Image(),
            t = setTimeout(() => no(Error("Image timed out.")), 6000);
          img.onload = () => {
            clearTimeout(t);
            ok();
          };
          img.onerror = () => {
            clearTimeout(t);
            no(Error("Image unavailable."));
          };
          img.src = E.facts(x).artwork;
        });
      } catch {
        broken++;
        if (
          ctx.mutate((d) => {
            const target = d.backlog.find((y) => y.id === x.id);
            if (
              target?.metadata184?.artwork &&
              !C.arr(target.metadata184.manualFields).includes("artwork")
            ) {
              target.metadata184.previousArtwork = target.metadata184.artwork;
              target.metadata184.artwork = "";
              target.metadata184.artworkBrokenAt = Date.now();
            }
          })
        ) {
          forceItems.add(x.id);
        }
      }
      checked++;
    }
    note(checked + " covers checked; " + broken + " need a fresh match.");
    enqueue();
  }
  function pause() {
    abort?.abort();
    clearTimeout(timer);
    clearTimeout(cloudTimer);
  }
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-rvc-open]")) open();
    if (e.target.closest("[data-profile185-editor]")) {
      if (typeof RV18 !== "undefined" && !RV18.canUseSpecialized()) return;
      RVProfile.openEditor();
    }
  });
  return {
    bind(c) {
      ctx = c;
    },
    start,
    prioritize(next) {
      priority = next;
      if (!busy) enqueue();
    },
    changed,
    check,
    enqueue,
    summary,
    snapshot,
    open,
    initCloud,
    flushCloud,
    user: () => cloudUser,
    client: () => client,
    pause,
  };
})();
