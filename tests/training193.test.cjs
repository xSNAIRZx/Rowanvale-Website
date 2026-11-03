"use strict";
const test = require("node:test"),
  assert = require("node:assert/strict"),
  C = require("../app/training-core193");
test("repeated exercise blocks count as one session in progress comparisons", () => {
  const d = workspace(),
    draft = sample(d);
  C.addExercise(draft, "ROW");
  Object.assign(draft.exercises[1].sets[0], {
    weightKg: 10,
    reps: 10,
    done: true,
  });
  C.finish(d, 12);
  const progress = C.progression(d)[0];
  assert.equal(progress.sessions.length, 1);
  assert.equal(progress.latest.sets, 2);
  assert.equal(C.previous(d, "row").exercise.sets.length, 2);
});
const workspace = () => ({
  fitnessLogs: [],
  workoutPlans: [
    {
      id: "legacy",
      name: "My old plan",
      moves: "Squats 2×8; rest when needed",
    },
  ],
});
function sample(d) {
  const draft = C.start(d);
  C.addExercise(draft, "Row");
  Object.assign(draft.exercises[0].sets[0], {
    weightKg: 20,
    reps: 8,
    done: true,
  });
  return draft;
}
test("draft preserves structured sets and legacy routine notes through JSON roundtrip", () => {
  const d = workspace();
  sample(d);
  C.validate(d);
  const next = JSON.parse(JSON.stringify(d));
  assert.equal(next.training193.draft.exercises[0].sets[0].reps, 8);
  assert.equal(next.workoutPlans[0].moves, "Squats 2×8; rest when needed");
});
test("finish is idempotent, includes only completed sets and retains existing history", () => {
  const d = workspace();
  d.fitnessLogs = Array.from({ length: 600 }, (_, i) => ({ id: "old-" + i }));
  const draft = sample(d);
  C.addSet(draft.exercises[0]);
  const log = C.finish(d, 12);
  assert.equal(log.training193.exercises[0].sets.length, 1);
  assert.equal(d.fitnessLogs.length, 601);
  assert.equal(C.finish(d, 12), null);
  assert.equal(d.fitnessLogs.length, 601);
});
test("invalid completion keeps draft recoverable without adding a log", () => {
  const d = workspace(),
    draft = sample(d);
  draft.exercises[0].sets[0].reps = null;
  assert.throws(() => C.finish(d, 12), /reps or a duration/);
  assert.ok(d.training193.draft);
  assert.equal(d.fitnessLogs.length, 0);
  draft.exercises[0].sets[0].seconds = 30;
  assert.ok(C.finish(d, 12));
});
test("canonical weight survives unit preference changes and previous values sort by date", () => {
  assert.ok(
    Math.abs(C.storeWeight(C.displayWeight(20, "lb"), "lb") - 20) < 0.003,
  );
  const d = workspace();
  sample(d);
  const first = C.finish(d, 12);
  first.date = "2026-01-01";
  sample(d);
  const second = C.finish(d, 12);
  second.date = "2026-01-02";
  d.fitnessLogs.reverse();
  assert.equal(C.previous(d, " row ").date, "2026-01-02");
  assert.equal(C.progression(d)[0].sessions.length, 2);
});
test("saved structured routines start independently and never overwrite written routines", () => {
  const d = workspace();
  sample(d);
  const log = C.finish(d, 12),
    routine = C.saveRoutine(d, log.id);
  assert.throws(() => C.saveRoutine(d, log.id), /already/);
  const draft = C.start(d, routine.id);
  assert.equal(draft.exercises[0].sets[0].done, false);
  draft.exercises[0].sets[0].reps = 10;
  assert.equal(routine.exercises[0].sets[0].reps, 8);
  assert.equal(d.workoutPlans.length, 1);
});
test("malformed imports reject bad set types, fractional reps, duplicate IDs and unknown schemas", () => {
  for (const mutate of [
    (d) => (d.training193.version = 2),
    (d) => (d.training193.draft.exercises[0].sets[0].reps = "8"),
    (d) => (d.training193.draft.exercises[0].sets[0].reps = 1.5),
    (d) =>
      d.training193.draft.exercises[0].sets.push({
        ...d.training193.draft.exercises[0].sets[0],
      }),
  ]) {
    const d = workspace();
    sample(d);
    mutate(d);
    assert.throws(() => C.validate(d));
  }
});
test("one draft at a time and bounded exercise capacity protect resumable state", () => {
  const d = workspace(),
    draft = sample(d);
  assert.throws(() => C.start(d), /Resume or discard/);
  while (draft.exercises.length < 64) C.addExercise(draft);
  assert.throws(() => C.addExercise(draft), /64 exercises/);
  assert.equal(draft.exercises.length, 64);
});
