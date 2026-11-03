(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RVTrainingCore = factory();
})(globalThis, () => {
  "use strict";
  const copy = (x) => JSON.parse(JSON.stringify(x)),
    id = () => globalThis.crypto.randomUUID(),
    text = (x, n = 100) =>
      String(x ?? "")
        .trim()
        .slice(0, n);
  const nullable = (x, max) =>
    x === null || x === "" || x === undefined
      ? null
      : Number.isFinite(Number(x)) && Number(x) >= 0 && Number(x) <= max
        ? Number(x)
        : NaN;
  const state = (d) =>
    d.training193 || {
      version: 1,
      unit: "kg",
      restSeconds: 60,
      routines: [],
      draft: null,
    };
  function validateExercises(exercises) {
    if (!Array.isArray(exercises) || exercises.length > 64)
      throw Error("A workout may have up to 64 exercises.");
    const ids = new Set();
    for (const exercise of exercises) {
      if (
        !exercise ||
        typeof exercise.id !== "string" ||
        ids.has(exercise.id) ||
        typeof exercise.name !== "string" ||
        exercise.name.length > 100 ||
        !Array.isArray(exercise.sets) ||
        exercise.sets.length > 128
      )
        throw Error("Invalid workout exercise.");
      ids.add(exercise.id);
      const setIds = new Set();
      for (const set of exercise.sets) {
        if (
          !set ||
          typeof set.id !== "string" ||
          setIds.has(set.id) ||
          typeof set.done !== "boolean" ||
          ["weightKg", "reps", "seconds"].some(
            (key) => set[key] !== null && typeof set[key] !== "number",
          ) ||
          !Number.isFinite(nullable(set.weightKg, 2000) ?? 0) ||
          !Number.isFinite(nullable(set.reps, 10000) ?? 0) ||
          !Number.isFinite(nullable(set.seconds, 86400) ?? 0) ||
          (set.reps !== null && !Number.isInteger(set.reps)) ||
          (set.seconds !== null && !Number.isInteger(set.seconds))
        )
          throw Error("Invalid workout set.");
        setIds.add(set.id);
      }
    }
  }
  function validate(d) {
    const s = d.training193;
    if (s !== undefined) {
      if (
        !s ||
        s.version !== 1 ||
        !["kg", "lb"].includes(s.unit) ||
        !Number.isInteger(s.restSeconds) ||
        s.restSeconds < 0 ||
        s.restSeconds > 3600 ||
        !Array.isArray(s.routines)
      )
        throw Error("Invalid structured workout settings.");
      const ids = new Set();
      for (const routine of s.routines) {
        if (
          !routine ||
          typeof routine.id !== "string" ||
          ids.has(routine.id) ||
          typeof routine.name !== "string"
        )
          throw Error("Invalid workout routine.");
        ids.add(routine.id);
        validateExercises(routine.exercises);
      }
      if (s.draft !== null) {
        const w = s.draft;
        if (
          !w ||
          typeof w.id !== "string" ||
          !w.id ||
          typeof w.title !== "string" ||
          w.title.length > 100 ||
          !Number.isFinite(w.startedAt) ||
          w.startedAt < 0 ||
          !Number.isFinite(w.restUntil || 0)
        )
          throw Error("Invalid workout draft.");
        validateExercises(w.exercises);
      }
    }
    for (const log of d.fitnessLogs || [])
      if (log.training193) {
        if (log.training193.version !== 1)
          throw Error("Unsupported workout history version.");
        validateExercises(log.training193.exercises);
      }
  }
  function ensure(d) {
    if (!d.training193) d.training193 = copy(state(d));
    return d.training193;
  }
  function newSet() {
    return { id: id(), weightKg: null, reps: null, seconds: null, done: false };
  }
  function start(d, routineId) {
    const s = ensure(d);
    if (s.draft) throw Error("Resume or discard your current workout first.");
    const routine = routineId
      ? s.routines.find((r) => r.id === routineId)
      : null;
    if (routineId && !routine)
      throw Error("That routine is no longer available.");
    s.draft = {
      id: id(),
      title: routine?.name || "My workout",
      startedAt: Date.now(),
      restUntil: 0,
      exercises: copy(routine?.exercises || []).map((e) => ({
        ...e,
        id: id(),
        sets: e.sets.map((set) => ({ ...set, id: id(), done: false })),
      })),
    };
    return s.draft;
  }
  function addExercise(draft, name = "") {
    if (draft.exercises.length >= 64)
      throw Error("This workout already has 64 exercises.");
    draft.exercises.push({ id: id(), name: text(name), sets: [newSet()] });
  }
  function addSet(exercise) {
    if (exercise.sets.length >= 128)
      throw Error("This exercise already has 128 sets.");
    const last = exercise.sets.at(-1);
    exercise.sets.push({
      ...newSet(),
      weightKg: last?.weightKg ?? null,
      reps: last?.reps ?? null,
      seconds: last?.seconds ?? null,
    });
  }
  function summary(exercises) {
    const sets = exercises.flatMap((e) => e.sets).filter((s) => s.done);
    return {
      sets: sets.length,
      reps: sets.reduce((n, s) => n + (s.reps || 0), 0),
      seconds: sets.reduce((n, s) => n + (s.seconds || 0), 0),
      volumeKg: sets.reduce((n, s) => n + (s.weightKg || 0) * (s.reps || 0), 0),
    };
  }
  function previous(d, name) {
    const key = text(name).toLocaleLowerCase();
    if (!key) return null;
    for (const log of [...(d.fitnessLogs || [])].sort(
      (a, b) => Date.parse(b.date) - Date.parse(a.date),
    )) {
      const matching = log.training193?.exercises.filter(
        (e) => text(e.name).toLocaleLowerCase() === key,
      );
      if (matching?.length)
        return {
          date: log.date,
          exercise: { ...matching[0], sets: matching.flatMap((e) => e.sets) },
        };
    }
    return null;
  }
  function progression(d) {
    const groups = new Map();
    for (const log of [...(d.fitnessLogs || [])]
      .filter((x) => x.training193)
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))) {
      const inSession = new Map();
      for (const e of log.training193.exercises) {
        const key = text(e.name).toLocaleLowerCase();
        if (!groups.has(key)) groups.set(key, { name: e.name, sessions: [] });
        if (!inSession.has(key)) inSession.set(key, []);
        inSession.get(key).push(e);
      }
      for (const [key, exercises] of inSession)
        groups
          .get(key)
          .sessions.push({ date: log.date, ...summary(exercises) });
    }
    return [...groups.values()].map((g) => ({
      ...g,
      latest: g.sessions[0],
      previous: g.sessions[1] || null,
    }));
  }
  function finish(d, minutes) {
    const s = ensure(d),
      draft = s.draft;
    if (!draft) return null;
    validateExercises(draft.exercises);
    const title = text(draft.title);
    if (!title) throw Error("Name your workout before finishing.");
    const done = draft.exercises.filter((e) => e.sets.some((s) => s.done));
    if (!done.length)
      throw Error("Mark at least one set complete before finishing.");
    for (const exercise of done) {
      if (!text(exercise.name)) throw Error("Name each completed exercise.");
      for (const set of exercise.sets.filter((s) => s.done))
        if (!(set.reps > 0 || set.seconds > 0))
          throw Error("Completed sets need reps or a duration.");
    }
    const duration = Number(minutes);
    if (!Number.isInteger(duration) || duration < 1 || duration > 600)
      throw Error("Choose a duration of 1–600 whole minutes.");
    const recordId = "training-" + draft.id;
    if ((d.fitnessLogs || []).some((log) => log.id === recordId)) {
      s.draft = null;
      return null;
    }
    const log = {
      id: recordId,
      title,
      activity: "Strength",
      minutes: duration,
      effort: "Steady",
      note: "Structured workout · " + summary(done).sets + " completed sets",
      date: new Date().toISOString(),
      training193: {
        version: 1,
        exercises: done.map((e) => ({
          ...copy(e),
          name: text(e.name),
          sets: e.sets.filter((set) => set.done),
        })),
      },
    };
    (d.fitnessLogs ??= []).unshift(log);
    s.draft = null;
    return log;
  }
  function saveRoutine(d, logId) {
    const log = (d.fitnessLogs || []).find((log) => log.id === logId);
    if (!log?.training193)
      throw Error("That structured workout is no longer available.");
    const s = ensure(d);
    if (s.routines.some((r) => r.sourceId === logId))
      throw Error("This workout already has a saved routine.");
    const routine = {
      id: id(),
      sourceId: logId,
      name: text(log.title),
      exercises: copy(log.training193.exercises).map((e) => ({
        ...e,
        sets: e.sets.map((set) => ({ ...set, done: false })),
      })),
    };
    s.routines.push(routine);
    return routine;
  }
  const displayWeight = (kg, unit) =>
    kg == null ? "" : Number((unit === "lb" ? kg / 0.45359237 : kg).toFixed(2));
  const storeWeight = (value, unit) => {
    const n = nullable(value, unit === "lb" ? 4409 : 2000);
    return n === null ? null : unit === "lb" ? n * 0.45359237 : n;
  };
  return {
    state,
    validate,
    validateExercises,
    ensure,
    copy,
    newSet,
    start,
    addExercise,
    addSet,
    summary,
    previous,
    progression,
    finish,
    saveRoutine,
    displayWeight,
    storeWeight,
  };
});
