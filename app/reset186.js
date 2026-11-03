/* Reset Studio composes the existing saved-care tools with a new focused session experience. */
const RVReset = (() => {
  "use strict";
  const C = RVLivingCore,
    T = RVResetCore,
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
  const KEY = "rowanvale.reset186.session",
    tabs = [
      ["today", "Start here"],
      ["rest", "Breathing & rest"],
      ["ground", "Grounding"],
      ["reflect", "Reflection"],
      ["tools", "Care toolkit"],
      ["history", "Your history"],
    ];
  let ctx,
    tab = "today",
    length = "all",
    session = null,
    timer = null,
    dialog = null,
    groundStep = 0,
    groundDone = new Set(),
    groundId = "",
    sound = false,
    audio = null,
    lastPhase = -1,
    lastFocus = null,
    storageError = "",
    drafts = {};
  try {
    session = T.restore(JSON.parse(localStorage.getItem(KEY) || "null"));
  } catch {}
  function persist() {
    try {
      if (session) {
        const value = { ...session };
        if (value.status === "running")
          value.elapsed = value.duration - T.remaining(value);
        localStorage.setItem(KEY, JSON.stringify(value));
      } else localStorage.removeItem(KEY);
      storageError = "";
    } catch {
      storageError =
        "Session recovery could not be saved. Your workspace is unchanged.";
    }
  }
  function take(root, selector) {
    return root.querySelector(selector)?.outerHTML || "";
  }
  function byTitle(root, text) {
    return (
      [...root.querySelectorAll("section")].find((x) =>
        x.querySelector("h2,h3")?.textContent.includes(text),
      )?.outerHTML || ""
    );
  }
  const btn = (label, action, id = "", extra = "") =>
    `<button type="button" class="button button-quiet" data-reset="${action}" data-id="${id}" ${extra}>${label}</button>`;
  function tools() {
    const options = [
      [
        "breathe",
        "01",
        "A softer rhythm",
        "Guided breathing, at your own pace.",
        "1–5 min",
      ],
      [
        "rest",
        "02",
        "Beyond the screen",
        "Rest your eyes and release a little tension.",
        "1–3 min",
      ],
      [
        "ground",
        "03",
        "Find the room",
        "A flexible five-senses grounding sequence.",
        "1–3 min",
      ],
      [
        "reflect",
        "04",
        "Set something down",
        "A private note, without needing the right words.",
        "5 min",
      ],
    ];
    return `<div class="reset186-tools">${options
      .filter(
        (x) => length === "all" || (length === "5" ? true : x[0] !== "reflect"),
      )
      .map(
        ([id, n, title, copy, time]) =>
          `<button type="button" class="reset186-tool tool-${id}" data-reset="${id === "reflect" ? "tab" : "open"}" data-id="${id}"><span>${n} / ${time}</span><i aria-hidden="true">${{ breathe: "◌", rest: "☼", ground: "✧", reflect: "〰" }[id]}</i><h3>${title}</h3><p>${copy}</p><b>${id === "reflect" ? "Open reflection" : "Make a little space"} ↗</b></button>`,
      )
      .join("")}</div>`;
  }
  function view(d, legacy) {
    const t = document.createElement("template");
    t.innerHTML = legacy;
    const root = t.content;
    const check = take(root, ".wellness-checkin"),
      journal =
        root.querySelector("#reflectionText")?.closest("section")?.outerHTML ||
        "",
      after = byTitle(root, "Gaming has an aftercare"),
      recent = C.arr(d.wellnessSessions).slice(0, 20);
    const resume = session
      ? `<div class="reset186-resume"><span>A moment you started · ${session.kind === "rest" ? "Screen rest" : "Gentle breathing"} · ${Math.ceil(T.remaining(session) / 1000)} seconds remaining</span>${btn(session.status === "complete" ? "Review finished moment" : "Continue your moment", "resume")}</div>`
      : "";
    const body =
      tab === "today"
        ? `${resume}<div class="reset186-intro"><div><span class="reset186-kicker">NO PERFECT WAY TO ARRIVE</span><h2>What would feel<br>a little lighter?</h2><p>Choose one moment. You can change your mind, adapt a step, or leave whenever you like.</p><div class="reset186-time" aria-label="Time available">${[
            ["all", "Any time"],
            ["1", "One minute"],
            ["2", "Two minutes"],
            ["5", "Five minutes"],
          ]
            .map(([v, label]) =>
              btn(label, "length", v, `aria-pressed="${length === v}"`),
            )
            .join(
              "",
            )}</div></div><div class="reset186-sun" aria-hidden="true"><i></i><span>ONE SMALL<br>PAUSE.</span></div></div>${tools()}<details class="reset186-checkin"><summary>How are you arriving? <span>Optional private check-in ↗</span></summary>${check}</details>`
        : tab === "rest"
          ? `${resume}<div class="reset186-subhead"><span class="reset186-kicker">LOWER THE VOLUME</span><h2>A moment with fewer demands.</h2><p>Follow a gentle prompt, or simply rest. Nothing starts until you choose.</p></div>${tools()
              .replace(/<button[^>]+data-id="ground"[\s\S]*?<\/button>/, "")
              .replace(/<button[^>]+data-id="reflect"[\s\S]*?<\/button>/, "")}`
          : tab === "ground"
            ? `<div class="reset186-subhead"><span class="reset186-kicker">COME BACK TO THE ROOM</span><h2>A place to begin again.</h2><p>Notice what is around you. Skip any sense or movement that does not suit you.</p>${btn("Start sensory grounding", "open", "ground")}</div>${take(root, ".body-scan-card")}`
            : tab === "reflect"
              ? `<div class="reset186-subhead"><span class="reset186-kicker">PRIVATE FIELD NOTES</span><h2>Give the thought somewhere to land.</h2><p>Your words stay in your private workspace. They are included if you choose private cloud sync; shared profiles never include them.</p></div><div class="reset186-reflections">${journal}${take(root, ".reset-plan-card")}${take(root, ".thought-untangler")}${after}</div>`
              : tab === "tools"
                ? `<div class="reset186-subhead"><span class="reset186-kicker">SMALL WAYS TO CARE</span><h2>Make the next hour kinder.</h2></div>${take(root, ".reset-lane-studio")}${take(root, ".wellness-game-bridge")}${take(root, ".game-care-plan")}${byTitle(root, "Tiny care menu")}<div class="reset186-legacy-mini">${take(root, ".kindness-tool")}${take(root, ".body-tool")}</div>`
                : RVWellbeing193.history(d) +
                  `<div class="reset186-history">${btn("Clear mood & care history", "clear-history")}</div>`;
    return `<section class="reset186" aria-label="Reset Studio"><header class="reset186-header"><div><span class="reset186-kicker">ROWANVALE / A QUIETER CORNER</span><h1>Reset Studio<span>Make space for yourself.</span></h1></div><span class="reset186-private">PRIVATE · OPTIONAL · YOUR PACE</span></header><nav class="reset186-tabs" aria-label="Reset Studio areas">${tabs.map(([id, label]) => btn(label, "tab", id, `aria-current="${tab === id ? "page" : "false"}"`)).join("")}</nav><div class="reset186-body">${body}</div><footer>Everyday rest and reflection. Adapt anything, skip anything. <button type="button" class="subtle-link" data-view="resources">Explore support guides ↗</button></footer></section>`;
  }
  function showError(message) {
    const el = dialog?.querySelector("[data-reset-status]");
    if (el) el.textContent = message;
    else ctx.toast(message, "error");
  }
  function chime() {
    if (!sound) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === "suspended") return;
      const o = audio.createOscillator(),
        g = audio.createGain();
      o.frequency.value = 420;
      g.gain.setValueAtTime(0.035, audio.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.5);
      o.connect(g);
      g.connect(audio.destination);
      o.start();
      o.stop(audio.currentTime + 0.5);
    } catch {
      sound = false;
      showError("Sound is unavailable. The visual session still works.");
    }
  }
  function close() {
    if (session?.status === "running") T.pause(session);
    persist();
    clearInterval(timer);
    timer = null;
    dialog?.close();
  }
  function frame(title, body) {
    lastFocus = document.activeElement;
    dialog = document.createElement("dialog");
    dialog.id = "reset186-session";
    dialog.className = "reset186-session";
    dialog.setAttribute("aria-labelledby", "reset186-session-title");
    dialog.innerHTML = `<header><span class="reset186-kicker">A MOMENT FOR YOU</span><button type="button" class="button button-quiet" data-reset="close" aria-label="Close guided session">✕</button></header><h2 id="reset186-session-title">${title}</h2>${body}<p data-reset-status role="status"></p>`;
    document.body.append(dialog);
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      close();
    });
    dialog.addEventListener("close", () => {
      clearInterval(timer);
      dialog.remove();
      dialog = null;
      lastFocus?.focus();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.key !== "Tab") return;
      const stops = [
        ...dialog.querySelectorAll(
          "button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),a[href]",
        ),
      ].filter((el) => !el.hidden && el.getClientRects().length);
      const first = stops[0],
        last = stops.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    });
    dialog.showModal();
  }
  function open(kind) {
    if (dialog) return;
    if (kind === "ground") {
      groundStep = 0;
      groundDone = new Set();
      groundId = crypto.randomUUID();
      frame("Find the room.", `<div id="reset186-ground"></div>`);
      paintGround();
      return;
    }
    session = T.create(
      kind,
      length === "1" ? 60 : length === "5" ? 300 : 120,
      Date.now(),
      crypto.randomUUID(),
    );
    persist();
    openTimer();
  }
  function openTimer() {
    if (dialog || !session) return;
    frame(
      session.kind === "rest" ? "Beyond the screen." : "A softer rhythm.",
      `<p class="reset186-session-copy">${session.kind === "rest" ? "Look at a comfortable distance, soften your shoulders, or simply sit. Move only if it feels comfortable." : "Breathe naturally. The rhythm is optional; skip it if it feels uncomfortable."}</p><label class="reset186-duration">Length<select data-reset-duration><option value="60">One minute</option><option value="120">Two minutes</option><option value="180">Three minutes</option><option value="300">Five minutes</option></select></label><div class="reset186-breath" data-phase="0"><span data-reset-phase aria-live="polite" aria-atomic="true"></span><strong data-reset-clock></strong></div><div class="reset186-session-actions">${btn("Start", "toggle")}${btn("Restart", "restart")}${btn("Save this moment", "save", "", "hidden")}</div><label class="reset186-sound"><input type="checkbox" data-reset-sound> Optional gentle chime</label><p class="reset186-private-note">Leaving this tab pauses the session. Recovery never starts sound automatically.</p>`,
    );
    dialog.querySelector("[data-reset-duration]").value = String(
      session.duration / 1000,
    );
    sound = false;
    lastPhase = -1;
    tick();
    timer = setInterval(tick, 250);
  }
  function tick() {
    if (!session || !dialog || !dialog.querySelector("[data-reset-clock]"))
      return;
    const previous = session.status;
    T.tick(session);
    const phase = T.phase(session);
    dialog.querySelector("[data-reset-clock]").textContent =
      Math.ceil(T.remaining(session) / 1000) + "s";
    const phaseText =
      session.status === "complete"
        ? "A little room, made."
        : session.status === "running"
          ? phase.label
          : session.status === "paused"
            ? "Paused · resume when ready"
            : "Ready when you are";
    if (dialog.querySelector("[data-reset-phase]").textContent !== phaseText)
      dialog.querySelector("[data-reset-phase]").textContent = phaseText;
    dialog.querySelector(".reset186-breath").dataset.phase = String(phase.step);
    dialog.querySelector(".reset186-breath").dataset.running =
      session.status === "running";
    const toggle = dialog.querySelector("[data-reset=toggle]");
    toggle.textContent =
      session.status === "running"
        ? "Pause"
        : session.status === "paused"
          ? "Resume"
          : "Start";
    toggle.hidden = session.status === "complete";
    dialog.querySelector("[data-reset=save]").hidden =
      session.status !== "complete";
    dialog.querySelector("[data-reset-duration]").disabled =
      session.status === "running";
    if (session.status === "running" && phase.step !== lastPhase) {
      lastPhase = phase.step;
      chime();
    }
    if (previous !== session.status) {
      persist();
      if (session.status === "complete") chime();
    }
    if (storageError) showError(storageError);
  }
  const senses = [
    [
      "5",
      "things you can see",
      "Notice a color, a shape, or a point of light.",
    ],
    [
      "4",
      "things you can feel",
      "Notice comfortable contact: a sleeve, a chair, or the floor.",
    ],
    [
      "3",
      "sounds you can hear",
      "Nearby or far away. Silence can be something to notice too.",
    ],
    [
      "2",
      "things you can smell",
      "Or remember a familiar scent. Skip this if you prefer.",
    ],
    [
      "1",
      "thing you can taste",
      "Or notice one neutral sensation. There is no required answer.",
    ],
  ];
  function paintGround() {
    const x = senses[groundStep];
    dialog.querySelector("#reset186-ground").innerHTML =
      `<div class="reset186-ground-number">${x[0]}</div><h3>${x[1]}</h3><p>${x[2]}</p><p class="reset186-kicker">STEP ${groundStep + 1} OF 5 · ${groundDone.size} NOTICED</p><div class="reset186-session-actions">${btn("Previous", "ground-prev", "", groundStep ? "" : "disabled")}${btn("Skip this sense", "ground-skip")}${btn("Noticed · next", "ground-next")}</div>`;
    dialog.querySelector("[data-reset=ground-next]")?.focus();
  }
  function finishGround() {
    dialog.querySelector("#reset186-ground").innerHTML =
      `<div class="reset186-ground-number">✧</div><h3>Back in your own time.</h3><p>You noticed ${groundDone.size} of five senses. Adapting or skipping is always okay.</p>${btn("Save this moment", "ground-save")}${btn("Leave without saving", "close")}`;
  }
  function log(id, title, kind, seconds) {
    if (ctx.data().wellnessSessions.some((x) => x.id === id)) return true;
    return ctx.mutate((d) => {
      d.wellnessSessions.unshift({
        id,
        title,
        kind,
        seconds,
        date: new Date().toISOString(),
      });
    });
  }
  function action(a, id) {
    if (a === "tab") {
      tab = id;
      ctx.render();
    }
    if (a === "length") {
      length = id;
      ctx.render();
    }
    if (a === "open") open(id);
    if (a === "resume") openTimer();
    if (a === "close") close();
    if (a === "toggle") {
      if (session.status === "running") T.pause(session);
      else T.resume(session);
      persist();
      tick();
    }
    if (a === "restart") {
      session = T.create(
        session.kind,
        session.duration / 1000,
        Date.now(),
        crypto.randomUUID(),
      );
      persist();
      tick();
    }
    if (a === "save") {
      if (session.status !== "complete") return;
      if (
        !log(
          "reset:" + session.id,
          session.kind === "rest" ? "A screen-rest moment" : "Gentle breathing",
          "guided-" + session.kind,
          session.duration / 1000,
        )
      ) {
        showError("Could not save. Keep this session open and retry.");
        return;
      }
      session = null;
      persist();
      close();
      ctx.render();
      ctx.toast("A moment saved in your private workspace.", "success");
    }
    if (a === "ground-prev") {
      groundStep = Math.max(0, groundStep - 1);
      paintGround();
    }
    if (a === "ground-next" || a === "ground-skip") {
      if (a === "ground-next") groundDone.add(groundStep);
      if (groundStep < 4) {
        groundStep++;
        paintGround();
      } else finishGround();
    }
    if (a === "ground-save") {
      if (log("ground:" + groundId, "Five-senses grounding", "grounding", 0)) {
        close();
        ctx.render();
      } else showError("Could not save. Your previous history is intact.");
    }
    if (a === "clear-history") clearHistory();
  }
  function clearHistory() {
    if (
      confirm(
        "Clear your mood check-ins, care moments and private reflections? Games, XP and quests will remain.",
      )
    ) {
      if (
        ctx.mutate((d) => {
          d.moodLog = [];
          d.wellnessSessions = [];
          d.reflections = [];
        })
      ) {
        drafts = {};
        ctx.render();
        ctx.toast("Care history cleared.", "success");
      }
    }
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-reset]");
    if (b) {
      e.preventDefault();
      action(b.dataset.reset, b.dataset.id);
    }
  });
  document.addEventListener("change", async (e) => {
    if (e.target.matches("[data-reset-duration]")) {
      session = T.create(
        session.kind,
        Number(e.target.value),
        Date.now(),
        crypto.randomUUID(),
      );
      persist();
      tick();
    }
    if (e.target.matches("[data-reset-sound]")) {
      sound = e.target.checked;
      if (sound) {
        try {
          audio =
            audio || new (window.AudioContext || window.webkitAudioContext)();
          await audio.resume();
          chime();
        } catch {
          sound = false;
          e.target.checked = false;
          showError("Sound is unavailable.");
        }
      }
    }
  });
  document.addEventListener("input", (e) => {
    if (
      e.target.closest(".reset186") &&
      e.target.id &&
      !e.target.id.startsWith("wb193-")
    )
      drafts[e.target.id] = e.target.value;
  });
  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("[data-action]")?.dataset.action;
      if (a?.startsWith("clear-")) drafts = {};
    },
    true,
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden && session?.status === "running") {
      T.pause(session);
      persist();
      tick();
    }
  });
  addEventListener("beforeunload", () => persist());
  return {
    bind(c) {
      ctx = c;
      RVWellbeing193.bind(c);
    },
    view,
    mount() {
      RVWellbeing193.mount();
      for (const [id, value] of Object.entries(drafts)) {
        const el = document.getElementById(id);
        if (el?.closest(".reset186")) el.value = value;
      }
    },
    historyChanged(row) {
      if (row?.source !== "reflections") return;
      const ids = {
        text: "reflectionText",
        hard: "resetPlanHard",
        wait: "resetPlanWait",
        support: "resetPlanSupport",
        thought: "reframeThought",
        evidence: "reframeEvidence",
        alternative: "reframeAlternative",
      };
      for (const [key, id] of Object.entries(ids))
        if (Object.hasOwn(row.record, key) && drafts[id] === row.record[key])
          delete drafts[id];
    },
    show(id) {
      tab = id;
    },
    open,
    pause() {
      if (session?.status === "running") T.pause(session);
      persist();
      tick();
    },
    session: () => session,
  };
})();
