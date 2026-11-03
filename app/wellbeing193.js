/* A private, searchable history over existing records. All writes use the app's atomic save. */
const RVWellbeing193 = (() => {
  "use strict";
  const C = RVWellbeingCore,
    E = (s) =>
      String(s ?? "").replace(
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
    filters = { query: "", from: "", to: "", source: "all" },
    limit = 50,
    shown = [],
    selected = new Set(),
    lastUndo = null,
    editing = null,
    focusBridge = null;
  const selectionKey = (r) => r.key + "|" + r.fingerprint;
  const btn = (label, a, extra = "") =>
    `<button type="button" class="button button-quiet" data-wb193="${a}" ${extra}>${label}</button>`;
  function history(data) {
    return `<section class="wb193-history" aria-label="Private history"><div class="reset186-subhead"><span class="reset186-kicker">YOUR PRIVATE TIMELINE</span><h2>Your private history.</h2><p>Search, edit or export the entries you choose. Private cloud sync includes them when enabled; shared profiles never do.</p></div><div class="wb193-filters"><label>Search your words<input id="wb193-query" type="search" value="${E(filters.query)}" placeholder="A word, mood, title or note"></label><label>Record type<select id="wb193-source"><option value="all">All private history</option>${Object.entries(
      C.groups,
    )
      .map(
        ([k, v]) =>
          `<option value="${k}" ${filters.source === k ? "selected" : ""}>${v}</option>`,
      )
      .join(
        "",
      )}</select></label><label>From<input id="wb193-from" type="date" value="${E(filters.from)}"></label><label>Through<input id="wb193-to" type="date" value="${E(filters.to)}"></label></div><div class="wb193-toolbar">${btn("Clear filters", "clear")}${btn("Select matching entries", "select-all")}${btn("Clear selection", "select-none")}${btn("Undo last history change", "undo", lastUndo ? "" : "disabled")}<span id="wb193-selection" role="status"></span></div><div class="wb193-export"><strong>Export selected private entries</strong><p>Downloaded files contain private notes in readable form. Choose where to keep them and who can access them.</p>${btn("Download JSON", "json")}${btn("Download CSV", "csv")}</div><p id="wb193-status" role="status"></p><div id="wb193-results">${results(data)}</div></section>`;
  }
  function results(data) {
    shown = C.filter(C.rows(data), filters);
    const visible = shown.slice(0, limit);
    return `<p class="wb193-count">${shown.length} matching ${shown.length === 1 ? "entry" : "entries"} · ${C.rows(data).length} total</p>${visible.map((r, i) => `<article class="wb193-entry"><label class="wb193-select"><input type="checkbox" data-wb193-select="${i}" ${selected.has(selectionKey(r)) ? "checked" : ""}><span class="sr-only">Select ${E(r.label)} ${E(r.date)}</span></label><div><span class="eyebrow">${E(r.label)} · <time>${E(r.date || "Date not recorded")}</time></span><h3>${E(r.title)}</h3><p>${E(r.text || "A moment saved without a note.")}</p>${r.record.minutes ? `<small>${E(r.record.minutes)} minutes${r.record.early ? " · ended early" : ""}</small>` : ""}${r.record.seconds ? `<small>${E(r.record.seconds)} seconds</small>` : ""}<div class="living-actions">${btn("View / edit", "edit", `data-index="${i}"`)}${btn("Delete", "delete", `data-index="${i}"`)}</div></div></article>`).join("") || '<div class="wb193-empty"><h3>No entries match.</h3><p>Your other records are still saved. Try another word or clear the date filters.</p></div>'}${shown.length > limit ? btn("Show 50 more", "more") : ""}`;
  }
  function status(text, error = false) {
    const e = document.getElementById("wb193-status");
    if (e) {
      e.textContent = text;
      e.classList.toggle("wb193-error", error);
    }
  }
  function refresh() {
    const e = document.getElementById("wb193-results");
    if (e) e.innerHTML = results(ctx.data());
    selectionStatus();
    const undo = document.querySelector("[data-wb193=undo]");
    if (undo) undo.disabled = !lastUndo;
  }
  function selectionStatus() {
    const matches = shown.filter((r) => selected.has(selectionKey(r)));
    const e = document.getElementById("wb193-selection");
    if (e) e.textContent = matches.length + " selected in these results";
    document
      .querySelectorAll("[data-wb193=json],[data-wb193=csv]")
      .forEach((b) => (b.disabled = !matches.length));
  }
  function change(row, operation) {
    let next;
    const ok = ctx.mutate((d) => {
      next = operation(d, row);
    });
    if (!ok) {
      status("Not saved. Your earlier history remains intact.", true);
      return false;
    }
    lastUndo = next;
    RVReset.historyChanged?.(row);
    selected.clear();
    refresh();
    return true;
  }
  function openEdit(row) {
    document.getElementById("wb193-dialog")?.remove();
    editing = row;
    const d = document.createElement("dialog");
    d.id = "wb193-dialog";
    d.className = "modal wb193-dialog";
    d.setAttribute("aria-labelledby", "wb193-dialog-title");
    d.innerHTML = `<form><h2 id="wb193-dialog-title">${E(row.label)} · ${E(row.date)}</h2><p>Edits preserve the record’s date, duration and earned XP.</p>${C.editable(
      row.source,
      row.record,
    )
      .map(
        (f) =>
          `<label>${E(f.label)}<textarea name="${E(f.key)}" maxlength="${f.max}" rows="3">${E(f.value)}</textarea></label>`,
      )
      .join(
        "",
      )}<p id="wb193-edit-status" role="status"></p><footer>${btn("Cancel", "close")}<button type="submit" class="button button-primary">Save entry</button></footer></form>`;
    document.body.append(d);
    d.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      try {
        const values = Object.fromEntries(new FormData(e.target));
        if (change(editing, (data, row) => C.edit(data, row, values))) {
          d.close();
          status("Entry saved.");
        } else
          d.querySelector("#wb193-edit-status").textContent =
            "Could not save. Your draft is still here; retry when storage is available.";
      } catch (error) {
        d.querySelector("#wb193-edit-status").textContent = error.message;
      }
    });
    d.addEventListener(
      "close",
      () => {
        d.remove();
        document.querySelector("#wb193-query")?.focus({ preventScroll: true });
      },
      { once: true },
    );
    d.showModal();
  }
  function download(format) {
    const rows = shown.filter((r) => selected.has(selectionKey(r)));
    if (!rows.length) return;
    const text =
        format === "json"
          ? JSON.stringify(C.exportJSON(rows), null, 2)
          : C.exportCSV(rows),
      url = URL.createObjectURL(
        new Blob([text], {
          type:
            format === "json" ? "application/json" : "text/csv;charset=utf-8",
        }),
      );
    const a = document.createElement("a");
    a.href = url;
    a.download = "Rowanvale-private-history." + format;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    status(
      rows.length +
        " selected entries exported. Keep this private file somewhere safe.",
    );
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest("[data-wb193]");
    if (!b) return;
    try {
      const a = b.dataset.wb193,
        row = shown[Number(b.dataset.index)];
      if (a === "edit") openEdit(row);
      if (a === "close") document.getElementById("wb193-dialog")?.close();
      if (
        a === "delete" &&
        confirm(
          "Delete this private entry? Earned XP stays. You can undo the latest history change during this visit.",
        )
      ) {
        if (change(row, C.remove)) status("Entry deleted. Undo is available.");
      }
      if (a === "undo" && lastUndo) {
        if (ctx.mutate((d) => C.undo(d, lastUndo))) {
          lastUndo = null;
          refresh();
          status("History change undone.");
        } else status("Undo could not be saved. Try again.", true);
      }
      if (a === "clear") {
        filters = { query: "", from: "", to: "", source: "all" };
        limit = 50;
        ctx.render();
      }
      if (a === "select-all") {
        shown.forEach((r) => selected.add(selectionKey(r)));
        refresh();
      }
      if (a === "select-none") {
        selected.clear();
        refresh();
      }
      if (a === "more") {
        limit += 50;
        refresh();
      }
      if (a === "json" || a === "csv") download(a);
      if (a === "focus-custom")
        focusBridge?.duration(
          Number(document.getElementById("wb193-duration").value),
        );
      if (a === "focus-log-early") focusBridge?.early();
    } catch (error) {
      status(error.message, true);
    }
  });
  document.addEventListener("input", (e) => {
    if (e.target.id === "wb193-query") {
      filters.query = e.target.value;
      limit = 50;
      refresh();
    }
  });
  document.addEventListener("change", (e) => {
    if (e.target.matches("[data-wb193-select]")) {
      const row = shown[Number(e.target.dataset.wb193Select)];
      if (row)
        e.target.checked
          ? selected.add(selectionKey(row))
          : selected.delete(selectionKey(row));
      selectionStatus();
    }
    const map = {
      "wb193-source": "source",
      "wb193-from": "from",
      "wb193-to": "to",
    };
    if (map[e.target.id]) {
      filters[map[e.target.id]] = e.target.value;
      limit = 50;
      refresh();
    }
  });
  function focusTools() {
    const panel = document.querySelector(".timer-panel");
    if (!panel || panel.querySelector(".wb193-focus-tools") || !focusBridge)
      return;
    const div = document.createElement("div");
    div.className = "wb193-focus-tools";
    div.innerHTML = `<label>Custom focus length (1–240 minutes)<input id="wb193-duration" type="number" min="1" max="240" step="1" value="${focusBridge.current?.() || 25}"></label>${btn("Use this duration", "focus-custom")}${btn("Save elapsed time & finish", "focus-log-early")}<small>Early finishes record actual time without awarding completion XP. Active sessions recover paused after you close the tab.</small>`;
    panel.append(div);
  }
  return {
    bind(c) {
      ctx = c;
    },
    history,
    mount() {
      if (document.getElementById("wb193-results")) selectionStatus();
      focusTools();
    },
    focus(c) {
      focusBridge = c;
      focusTools();
    },
  };
})();
