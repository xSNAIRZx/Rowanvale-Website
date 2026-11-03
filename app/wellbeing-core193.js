/* Private history transformations: no network, inference, or automatic retention pruning. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RVWellbeingCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";
  const groups = {
    reflections: "Reflection",
    moodLog: "Check-in",
    wellnessSessions: "Care moment",
    focusLog: "Focus session",
    playLog: "Play note",
  };
  const fields = {
    reflections: {
      text: ["Journal text", 12000],
      hard: ["What feels hard", 2000],
      wait: ["What can wait", 2000],
      support: ["Support", 2000],
      thought: ["Thought", 2000],
      evidence: ["What I noticed", 2000],
      alternative: ["Another perspective", 2000],
    },
    moodLog: {
      mood: ["Mood", 80],
      emotion: ["Emotion", 160],
      energy: ["Energy", 160],
      stress: ["Stress", 160],
      need: ["Need", 300],
      note: ["Private note", 4000],
    },
    wellnessSessions: { title: ["Moment", 300], note: ["Private note", 4000] },
    focusLog: { note: ["Private note", 4000] },
    playLog: { title: ["Title", 300], note: ["Private note", 4000] },
  };
  const clone = (x) => JSON.parse(JSON.stringify(x));
  function day(value) {
    const s = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    const d = new Date(s);
    return Number.isFinite(d.getTime())
      ? [
          d.getFullYear(),
          String(d.getMonth() + 1).padStart(2, "0"),
          String(d.getDate()).padStart(2, "0"),
        ].join("-")
      : "";
  }
  function editable(source, record) {
    const list = fields[source] || {};
    return Object.entries(list)
      .filter(
        ([key]) =>
          source !== "reflections" ||
          (key === "text" &&
            (!record.kind ||
              record.kind === "journal" ||
              Object.hasOwn(record, "text"))) ||
          Object.hasOwn(record, key),
      )
      .map(([key, [label, max]]) => ({
        key,
        label,
        max,
        value: String(record[key] ?? ""),
      }));
  }
  function rows(data) {
    return Object.entries(groups)
      .flatMap(([source, label]) =>
        (Array.isArray(data[source]) ? data[source] : []).map(
          (record, index) => {
            const kind = record.kind || "",
              text = editable(source, record)
                .filter((f) => f.value)
                .map((f) => f.label + ": " + f.value)
                .join("\n");
            return {
              key: source + ":" + index,
              source,
              index,
              record: clone(record),
              fingerprint: JSON.stringify(record),
              date: day(record.date || record.createdAt),
              label:
                kind === "reset-plan"
                  ? "Small reset plan"
                  : kind === "thought-reframe"
                    ? "Thought reflection"
                    : label,
              text,
              title: record.title || record.mood || label,
            };
          },
        ),
      )
      .sort((a, b) => b.date.localeCompare(a.date) || a.index - b.index);
  }
  function filter(
    rows,
    { query = "", from = "", to = "", source = "all" } = {},
  ) {
    const q = query.trim().toLocaleLowerCase();
    return rows.filter(
      (r) =>
        (source === "all" || r.source === source) &&
        (!from || r.date >= from) &&
        (!to || r.date <= to) &&
        (!q ||
          (r.label + " " + r.title + " " + r.text)
            .toLocaleLowerCase()
            .includes(q)),
    );
  }
  function locate(data, row) {
    if (!Object.hasOwn(groups, row.source) || !Array.isArray(data[row.source]))
      throw Error("This record is unavailable. Refresh the history.");
    const list = data[row.source],
      index = list.findIndex((x) => JSON.stringify(x) === row.fingerprint);
    if (index < 0)
      throw Error("This record changed. Reopen it before editing.");
    return { list, index, record: list[index] };
  }
  function edit(data, row, values) {
    const { list, index, record } = locate(data, row),
      allowed = editable(row.source, record),
      next = clone(record);
    for (const [key, value] of Object.entries(values)) {
      const field = allowed.find((f) => f.key === key);
      if (!field || typeof value !== "string" || value.length > field.max)
        throw Error("Invalid or overly long history field.");
      next[key] = value;
    }
    list[index] = next;
    return {
      source: row.source,
      index,
      before: clone(record),
      after: clone(next),
    };
  }
  function remove(data, row) {
    const { list, index, record } = locate(data, row);
    list.splice(index, 1);
    return { source: row.source, index, before: clone(record), after: null };
  }
  function undo(data, operation) {
    const list = data[operation.source];
    if (!Array.isArray(list))
      throw Error("History changed. Undo is unavailable.");
    if (operation.after) {
      const index = list.findIndex(
        (x) => JSON.stringify(x) === JSON.stringify(operation.after),
      );
      if (index < 0)
        throw Error(
          "That entry changed again. Undo would overwrite newer edits.",
        );
      list[index] = clone(operation.before);
    } else {
      if (
        list.some((x) => JSON.stringify(x) === JSON.stringify(operation.before))
      )
        throw Error("That entry is already present.");
      list.splice(
        Math.min(operation.index, list.length),
        0,
        clone(operation.before),
      );
    }
  }
  function exportJSON(rows) {
    return {
      format: "rowanvale-private-history",
      version: 1,
      exportedAt: new Date().toISOString(),
      records: rows.map((r) => ({
        category: r.source,
        record: clone(r.record),
      })),
    };
  }
  function csvCell(value) {
    let s = String(value ?? "");
    if (/^[\s]*[=+@-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  }
  function exportCSV(rows) {
    return [
      ["Date", "Category", "Title", "Private notes", "Minutes", "Seconds"],
      ...rows.map((r) => [
        r.date,
        r.label,
        r.title,
        r.text,
        r.record.minutes ?? "",
        r.record.seconds ?? "",
      ]),
    ]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
  }
  return {
    groups,
    editable,
    rows,
    filter,
    edit,
    remove,
    undo,
    exportJSON,
    exportCSV,
    day,
  };
});
