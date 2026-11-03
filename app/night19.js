(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.RVNight19 = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  function analyse(plan) {
    const guests = new Set((plan.guests || []).map((g) => g.id));
    const candidates = (plan.candidates || []).map((c, index) => {
      const votes = Object.entries(c.votes || {})
        .filter(
          ([id, v]) => guests.has(id) && ["yes", "maybe", "no"].includes(v),
        )
        .map(([, v]) => v);
      const yes = votes.filter((v) => v === "yes").length,
        maybe = votes.filter((v) => v === "maybe").length,
        no = votes.filter((v) => v === "no").length;
      const access = [...guests].map(
        (id) => c.compatibility?.access?.[id] || "unknown",
      );
      return {
        index,
        title: String(c.title || ""),
        minutes: Math.max(0, Number(c.slot) || 0),
        yes,
        maybe,
        no,
        accessBlocked: access.some((v) => v === "no"),
        accessUnknown: access.filter((v) => v !== "yes" && v !== "no").length,
        score: yes * 2 + maybe,
        voted: votes.length,
        missing: Math.max(0, guests.size - votes.length),
      };
    });
    const ranked = [...candidates].sort(
      (a, b) =>
        b.score - a.score ||
        a.no - b.no ||
        b.voted - a.voted ||
        a.index - b.index,
    );
    let used = 0;
    const selected = [];
    const budget = Math.max(0, Number(plan.budget) || 0),
      gap = Math.max(0, Number(plan.breakMinutes) || 0);
    for (const c of ranked) {
      const cost = c.minutes + (selected.length ? gap : 0);
      if (
        c.score > 0 &&
        c.no === 0 &&
        !c.accessBlocked &&
        (!plan.requireConfirmedAccess || c.accessUnknown === 0) &&
        c.minutes > 0 &&
        used + cost <= budget
      ) {
        selected.push(c.index);
        used += cost;
      }
    }
    return {
      candidates,
      ranked,
      selected,
      minutes: used,
      budget,
      missingBallots: candidates.reduce((n, c) => n + c.missing, 0),
      totalBallots: candidates.length * guests.size,
    };
  }
  function localDate(value) {
    if (!/^\d{4}-\d\d-\d\dT\d\d:\d\d$/.test(value || ""))
      throw Error(
        "Set a date and time in Edit details before exporting a calendar event.",
      );
    const d = new Date(value),
      parts = value.match(/\d+/g).map(Number);
    if (
      !Number.isFinite(d.getTime()) ||
      d.getFullYear() !== parts[0] ||
      d.getMonth() + 1 !== parts[1] ||
      d.getDate() !== parts[2] ||
      d.getHours() !== parts[3] ||
      d.getMinutes() !== parts[4]
    )
      throw Error(
        "This local date or time is not valid. Edit the night details.",
      );
    return d;
  }
  const stamp = (d) =>
    d
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "");
  const escapeText = (v) =>
    String(v || "")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/\r\n|\r|\n/g, "\\n")
      .replace(/;/g, "\\;")
      .replace(/,/g, "\\,");
  function fold(line) {
    let out = "",
      bytes = 0;
    const encoder = new TextEncoder();
    for (const c of line) {
      const n = encoder.encode(c).length;
      if (bytes + n > 75) {
        out += "\r\n ";
        bytes = 1;
      }
      out += c;
      bytes += n;
    }
    return out;
  }
  function calendar(plan, now = new Date()) {
    const start = localDate(plan.when),
      chosen = (plan.candidates || []).filter((c) => c.chosen);
    if (!chosen.length)
      throw Error("Choose a lineup before exporting a calendar event.");
    if (
      chosen.some(
        (c) => !Number.isFinite(Number(c.slot)) || Number(c.slot) <= 0,
      )
    )
      throw Error(
        "Set planned minutes for every selected title before exporting.",
      );
    const minutes =
      chosen.reduce((n, c) => n + Number(c.slot), 0) +
      Math.max(0, chosen.length - 1) *
        Math.max(0, Number(plan.breakMinutes) || 0);
    const description = [
      plan.note || "",
      ...chosen.map((c) => c.title + " (" + c.slot + " min)"),
      "Includes " +
        (Number(plan.breakMinutes) || 0) +
        " minute breaks between picks.",
      "Manually shared Rowanvale plan; no live invitation or streaming link.",
    ]
      .filter(Boolean)
      .join("\n");
    const uid =
      String(plan.id || "night")
        .replace(/[^a-zA-Z0-9-]/g, "")
        .slice(0, 80) || "night";
    return (
      [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Rowanvale//Night Planner 19//EN",
        "CALSCALE:GREGORIAN",
        "BEGIN:VEVENT",
        "UID:" + uid + "@rowanvale.local",
        "DTSTAMP:" + stamp(now),
        "DTSTART:" + stamp(start),
        "DTEND:" + stamp(new Date(start.getTime() + minutes * 60000)),
        "SUMMARY:" + escapeText(plan.name),
        "LOCATION:" + escapeText(plan.location),
        "DESCRIPTION:" + escapeText(description),
        "END:VEVENT",
        "END:VCALENDAR",
      ]
        .map(fold)
        .join("\r\n") + "\r\n"
    );
  }
  return { analyse, localDate, calendar, fold };
});
