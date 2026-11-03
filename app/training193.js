const RVTraining = (() => {
  "use strict";
  const C = RVTrainingCore,
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
    panel,
    draft = null,
    baseline = "",
    dirty = false,
    message = "",
    timer,
    historyLimit = 8;
  const btn = (label, action, extra = "") =>
    `<button type="button" class="button button-quiet" data-training="${action}" ${extra}>${label}</button>`;
  const current = () => C.state(ctx.data()),
    raw = () => JSON.stringify(current().draft || null);
  function status(text, error = false) {
    message = text;
    const el = panel?.querySelector("[data-training-status]");
    if (el) {
      el.textContent = text;
      el.classList.toggle("training-error", error);
    }
  }
  function transaction(fn) {
    try {
      const ok = ctx.mutate(fn);
      if (!ok) {
        status(
          "Not saved. Your previous data is intact. Keep this page open and retry.",
          true,
        );
        return false;
      }
      return true;
    } catch (e) {
      status(e.message, true);
      return false;
    }
  }
  function persist() {
    if (raw() !== baseline) {
      status(
        "This workout changed in another tab. Your edits are still here. Reload the saved draft before making more changes.",
        true,
      );
      dirty = true;
      return false;
    }
    if (
      !transaction((d) => {
        C.validateExercises(draft?.exercises || []);
        C.ensure(d).draft = C.copy(draft);
      })
    ) {
      dirty = true;
      return false;
    }
    baseline = raw();
    dirty = false;
    status("Workout draft saved on this device.");
    return true;
  }
  function previous(name) {
    const old = C.previous(ctx.data(), name);
    if (!old) return "No previous completed sets for this exercise.";
    const unit = current().unit;
    return (
      "Last time · " +
      new Date(old.date).toLocaleDateString() +
      ": " +
      old.exercise.sets
        .map((s) =>
          [
            s.weightKg == null
              ? ""
              : C.displayWeight(s.weightKg, unit) + " " + unit,
            s.reps ? s.reps + " reps" : "",
            s.seconds ? s.seconds + " sec" : "",
          ]
            .filter(Boolean)
            .join(" × "),
        )
        .join(" · ")
    );
  }
  function exercises() {
    return draft.exercises
      .map(
        (exercise, i) =>
          `<fieldset class="training-exercise" data-exercise="${E(exercise.id)}"><legend>Exercise ${i + 1}</legend><div class="training-exercise-heading"><label>Exercise name<input data-training-field="name" value="${E(exercise.name)}" maxlength="100" placeholder="Your movement, e.g. Dumbbell row"></label>${btn("Remove exercise", "remove-exercise", `data-id="${E(exercise.id)}"`)}</div><p class="training-previous">${E(previous(exercise.name))}</p><div class="training-set-list">${exercise.sets.map((set, j) => `<div class="training-set" data-set="${E(set.id)}"><b>Set ${j + 1}</b><label>Weight (${current().unit})<input type="number" min="0" max="${current().unit === "lb" ? 4409 : 2000}" step="any" data-training-field="weight" value="${C.displayWeight(set.weightKg, current().unit)}" placeholder="Optional"></label><label>Reps<input type="number" min="0" max="10000" step="1" data-training-field="reps" value="${set.reps ?? ""}" placeholder="Reps"></label><label>Seconds<input type="number" min="0" max="86400" step="1" data-training-field="seconds" value="${set.seconds ?? ""}" placeholder="Or duration"></label><label class="training-complete"><input type="checkbox" data-training-field="done" ${set.done ? "checked" : ""}> Done</label>${btn("×", "remove-set", `data-exercise-id="${E(exercise.id)}" data-id="${E(set.id)}" aria-label="Remove set ${j + 1}"`)}</div>`).join("")}</div>${btn("＋ Add set", "add-set", `data-id="${E(exercise.id)}"`)}</fieldset>`,
      )
      .join("");
  }
  function history() {
    const logs = ctx.data().fitnessLogs.filter((log) => log.training193),
      total = C.summary(logs.flatMap((log) => log.training193.exercises));
    return `<section class="training-history"><div class="training-section-heading"><div><h3>Your training record</h3><p>${logs.length} workouts · ${total.sets} completed sets. These are your recorded activities, not a score.</p></div></div>${
      logs
        .slice(0, historyLimit)
        .map((log) => {
          const summary = C.summary(log.training193.exercises);
          return `<article><details><summary><span><b>${E(log.title)}</b><small>${E(new Date(log.date).toLocaleDateString())} · ${log.minutes} min · ${summary.sets} sets</small></span></summary>${log.training193.exercises.map((exercise) => `<div class="training-history-exercise"><b>${E(exercise.name)}</b><p>${exercise.sets.map((s) => [s.weightKg == null ? "" : C.displayWeight(s.weightKg, current().unit) + " " + current().unit, s.reps ? s.reps + " reps" : "", s.seconds ? s.seconds + " sec" : ""].filter(Boolean).join(" × ")).join(" · ")}</p></div>`).join("")}<p>Recorded external-load volume: ${C.displayWeight(summary.volumeKg, current().unit)} ${current().unit} × reps. Bodyweight and timed sets are not included.</p></details>${btn(current().routines.some((r) => r.sourceId === log.id) ? "Routine saved" : "Save as routine", "save-routine", `data-id="${E(log.id)}" ${current().routines.some((r) => r.sourceId === log.id) ? "disabled" : ""}`)}</article>`;
        })
        .join("") ||
      "<p>Your first completed workout will appear here. Quick movement logs remain in Activity history below.</p>"
    }${logs.length > historyLimit ? btn("Show more workouts", "more") : ""}</section>`;
  }
  function paint() {
    if (!panel?.isConnected) return;
    const s = current();
    panel.innerHTML = `<header class="training-heading"><div><span class="eyebrow">MOVEMENT · YOUR OWN PACE</span><h2>One set at a time.</h2><p>Track exercises, reps, weight or time. Everything saves locally; quick movement logging stays available below.</p></div>${!draft ? btn("＋ Start a workout", "start") : ""}</header><div class="training-settings"><label>Weight unit<select data-training-setting="unit"><option value="kg" ${s.unit === "kg" ? "selected" : ""}>kg</option><option value="lb" ${s.unit === "lb" ? "selected" : ""}>lb</option></select></label><label>Rest after a set<select data-training-setting="restSeconds">${[0, 30, 60, 90, 120, 180, 300].map((n) => `<option value="${n}" ${s.restSeconds === n ? "selected" : ""}>${n ? n + " seconds" : "Off"}</option>`).join("")}</select></label><small>Rest is a silent, optional timer. Adjust or skip it whenever you want.</small></div><p class="training-status ${dirty ? "training-error" : ""}" role="status" data-training-status>${E(message || (draft ? "Saved workout draft ready to resume." : "No workout in progress."))}</p>${draft ? `<section class="training-draft"><div class="training-draft-heading"><label>Workout name<input data-training-field="title" maxlength="100" value="${E(draft.title)}"></label><div class="training-rest"><span data-training-rest></span>${btn("Skip rest", "skip-rest")}</div></div><p class="small-note">Changes save as you type. Mark sets done to include them when you finish. Blank weight is allowed; completed sets need reps or seconds.</p>${exercises()}<div class="training-actions">${btn("＋ Add exercise", "add-exercise")}${btn("Retry save", "retry")}${btn("Reload saved draft", "reload")}</div><div class="training-finish"><label>Minutes spent<input type="number" min="1" max="600" step="1" id="trainingMinutes" value="${Math.max(1, Math.min(600, Math.floor((Date.now() - draft.startedAt) / 60000)))}"></label>${btn("Finish & save workout", "finish")}${btn("Discard draft", "discard")}</div></section>` : `<section class="training-routines"><h3>Your structured routines</h3>${s.routines.length ? s.routines.map((r) => `<article><div><b>${E(r.name)}</b><small>${r.exercises.length} exercises · reuse your own previous plan</small></div>${btn("Start routine", "routine", `data-id="${E(r.id)}"`)}${btn("Remove", "remove-routine", `data-id="${E(r.id)}"`)}</article>`).join("") : "<p>Finish a workout, then save it as a routine. Existing written routines are still available below, with their notes intact.</p>"}</section>`}${history()}<details class="training-progression"><summary>Exercise trends · your recorded history</summary><p>Compare completed set counts and external-load volume. Different movements, ranges, and effort are not directly comparable; more is not automatically better.</p>${
      C.progression(ctx.data())
        .slice(0, 40)
        .map(
          (g) =>
            `<article><b>${E(g.name)}</b><p>${g.sessions.length} recorded sessions · latest ${g.latest.sets} sets, ${C.displayWeight(g.latest.volumeKg, current().unit)} ${current().unit} × reps${g.previous ? " · previous " + g.previous.sets + " sets, " + C.displayWeight(g.previous.volumeKg, current().unit) + " " + current().unit + " × reps" : " · no earlier session to compare"}</p></article>`,
        )
        .join("") || "<p>Complete a workout to begin your history.</p>"
    }</details>`;
    tick();
  }
  function tick() {
    const el = panel?.querySelector("[data-training-rest]");
    if (!el) return;
    const seconds = Math.max(
      0,
      Math.ceil(((draft?.restUntil || 0) - Date.now()) / 1000),
    );
    el.textContent = seconds
      ? "Rest · " +
        Math.floor(seconds / 60) +
        ":" +
        String(seconds % 60).padStart(2, "0")
      : "Ready when you are";
  }
  function input(event) {
    const el = event.target;
    if (!el.matches("[data-training-field]") || !draft) return;
    const field = el.dataset.trainingField,
      exercise = draft.exercises.find(
        (e) => e.id === el.closest("[data-exercise]")?.dataset.exercise,
      ),
      set = exercise?.sets.find(
        (s) => s.id === el.closest("[data-set]")?.dataset.set,
      );
    if (field === "title") draft.title = el.value.slice(0, 100);
    else if (field === "name" && exercise)
      exercise.name = el.value.slice(0, 100);
    else if (set) {
      if (field === "weight")
        set.weightKg = C.storeWeight(el.value, current().unit);
      else if (field === "done") {
        set.done = el.checked;
        if (set.done && current().restSeconds)
          draft.restUntil = Date.now() + current().restSeconds * 1000;
      } else set[field] = el.value === "" ? null : Number(el.value);
    }
    dirty = true;
    persist();
    tick();
  }
  function change(event) {
    const el = event.target;
    if (el.matches("[data-training-setting]")) {
      if (dirty && !persist()) return;
      const key = el.dataset.trainingSetting,
        value = key === "unit" ? el.value : Number(el.value);
      if (
        transaction((d) => {
          C.ensure(d)[key] = value;
          C.validate(d);
        })
      )
        paint();
    }
    if (el.dataset.trainingField === "name") {
      const e = draft?.exercises.find(
        (x) => x.id === el.closest("[data-exercise]")?.dataset.exercise,
      );
      if (e)
        el.closest("fieldset").querySelector(".training-previous").textContent =
          previous(e.name);
    }
  }
  function action(event) {
    const button = event.target.closest("[data-training]");
    if (!button) return;
    const a = button.dataset.training,
      id = button.dataset.id;
    try {
      if (a === "start" || a === "routine") {
        if (transaction((d) => C.start(d, a === "routine" ? id : undefined))) {
          draft = C.copy(current().draft);
          baseline = raw();
          message = "Workout draft saved on this device.";
          paint();
        }
        return;
      }
      if (a === "reload") {
        if (
          dirty &&
          !confirm(
            "Discard unsaved edits and reopen the last saved workout draft?",
          )
        )
          return;
        draft = C.copy(current().draft);
        baseline = raw();
        dirty = false;
        message = "Saved draft reopened.";
        paint();
        return;
      }
      if (a === "retry") {
        persist();
        return;
      }
      if (a === "more") {
        historyLimit += 8;
        paint();
        return;
      }
      if (a === "save-routine") {
        if (transaction((d) => C.saveRoutine(d, id))) {
          message = "Routine saved locally.";
          paint();
        }
        return;
      }
      if (a === "remove-routine") {
        if (
          !confirm(
            "Remove this saved structured routine? Completed workouts are kept.",
          )
        )
          return;
        if (
          transaction((d) => {
            const s = C.ensure(d);
            s.routines = s.routines.filter((r) => r.id !== id);
          })
        ) {
          message = "Routine removed. Completed history is kept.";
          paint();
        }
        return;
      }
      if (!draft) return;
      if (a === "finish") {
        if (!persist()) return;
        let record;
        const minutes = Number(panel.querySelector("#trainingMinutes").value);
        if (
          transaction((d) => {
            record = C.finish(d, minutes);
            if (record && record.minutes >= 5)
              RVLivingCore.award(
                d,
                Math.min(30, 10 + Math.floor(record.minutes / 15) * 5),
                "Movement: " + record.title,
                "fitness:" + record.id,
                "Fitness",
                { kind: "log", collection: "fitnessLogs", id: record.id },
              );
          })
        ) {
          draft = null;
          baseline = raw();
          dirty = false;
          message =
            "Workout saved. Your completed sets are in training history.";
          paint();
          ctx.render?.();
        }
        return;
      }
      if (a === "discard") {
        if (
          !confirm(
            "Discard this in-progress workout? Completed history and routines are kept.",
          )
        )
          return;
        if (raw() !== baseline) {
          status(
            "This workout changed in another tab. Reload the saved draft first.",
            true,
          );
          return;
        }
        if (
          transaction((d) => {
            C.ensure(d).draft = null;
          })
        ) {
          draft = null;
          baseline = raw();
          dirty = false;
          message = "Draft discarded. Completed history is kept.";
          paint();
        }
        return;
      }
      if (a === "add-exercise") C.addExercise(draft);
      if (a === "add-set") {
        const exercise = draft.exercises.find((e) => e.id === id);
        if (exercise) C.addSet(exercise);
      }
      if (a === "remove-exercise") {
        if (!confirm("Remove this exercise and its draft sets?")) return;
        draft.exercises = draft.exercises.filter((e) => e.id !== id);
      }
      if (a === "remove-set") {
        const exercise = draft.exercises.find(
          (e) => e.id === button.dataset.exerciseId,
        );
        if (exercise) exercise.sets = exercise.sets.filter((s) => s.id !== id);
      }
      if (a === "skip-rest") draft.restUntil = 0;
      dirty = true;
      persist();
      paint();
    } catch (e) {
      status(e.message, true);
    }
  }
  function mount(root) {
    root.querySelector("#training193")?.remove();
    const saved = current().draft;
    if (!dirty) {
      draft = C.copy(saved);
      baseline = raw();
    }
    panel = document.createElement("section");
    panel.id = "training193";
    panel.className = "training193 panel";
    const target = root.querySelector(".rv-fitness-jump");
    if (target) target.after(panel);
    else root.prepend(panel);
    panel.addEventListener("input", input);
    panel.addEventListener("change", change);
    panel.addEventListener("click", action);
    paint();
    clearInterval(timer);
    timer = setInterval(() => {
      if (!panel?.isConnected) {
        clearInterval(timer);
        return;
      }
      tick();
    }, 1000);
  }
  window.addEventListener("beforeunload", (e) => {
    if (dirty) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  return {
    bind(value) {
      ctx = value;
    },
    mount,
  };
})();
window.RVTraining = RVTraining;
