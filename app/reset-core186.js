/* Timestamp-based, testable guided-session state. No private reflection text lives here. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.RVResetCore = factory();
})(globalThis, () => {
  "use strict";
  function create(kind, seconds = 120, at = Date.now(), id = "reset-" + at) {
    return {
      id,
      kind: kind === "rest" ? "rest" : "breathe",
      duration: Math.max(30, Math.min(600, Number(seconds) || 120)) * 1000,
      elapsed: 0,
      deadline: 0,
      status: "ready",
      createdAt: at,
    };
  }
  function remaining(s, at = Date.now()) {
    return Math.max(
      0,
      s.status === "running" ? s.deadline - at : s.duration - s.elapsed,
    );
  }
  function pause(s, at = Date.now()) {
    if (s.status === "running") {
      s.elapsed = Math.min(s.duration, s.duration - remaining(s, at));
      s.deadline = 0;
      s.status = s.elapsed >= s.duration ? "complete" : "paused";
    }
    return s;
  }
  function resume(s, at = Date.now()) {
    if (["ready", "paused"].includes(s.status)) {
      s.deadline = at + s.duration - s.elapsed;
      s.status = "running";
    }
    return s;
  }
  function tick(s, at = Date.now()) {
    if (s.status === "running" && remaining(s, at) <= 0) {
      s.elapsed = s.duration;
      s.deadline = 0;
      s.status = "complete";
    }
    return s;
  }
  function restore(value) {
    if (
      !value ||
      !["breathe", "rest"].includes(value.kind) ||
      !Number.isFinite(value.duration) ||
      value.duration < 30000 ||
      value.duration > 600000 ||
      typeof value.id !== "string"
    )
      return null;
    const s = {
      ...value,
      elapsed: Math.max(
        0,
        Math.min(value.duration, Number(value.elapsed) || 0),
      ),
      deadline: 0,
    };
    s.status =
      value.status === "complete"
        ? "complete"
        : value.status === "ready"
          ? "ready"
          : "paused";
    return s;
  }
  function phase(s, at = Date.now()) {
    if (s.kind === "rest") return { label: "Let your eyes rest", step: 0 };
    const elapsed = Math.max(0, s.duration - remaining(s, at)),
      step = Math.floor(elapsed / 4000) % 3;
    return {
      label: [
        "Breathe in gently",
        "Breathe out slowly",
        "Rest in your own rhythm",
      ][step],
      step,
    };
  }
  return { create, remaining, pause, resume, tick, restore, phase };
});
