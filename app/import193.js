/* A local review step before an additive import; cancel never changes saved data. */
const RVImport193 = (() => {
  "use strict";
  let ctx;
  const C = RVImport193Core,
    E = (v) =>
      String(v ?? "").replace(
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
  function bind(value) {
    ctx = value;
  }
  function mount(view) {
    if (
      !["media", "backlog"].includes(view) ||
      document.getElementById("import193-tools")
    )
      return;
    const bar = document.createElement("div");
    bar.id = "import193-tools";
    bar.className = "import193-tools";
    bar.innerHTML =
      '<button type="button" class="button button-quiet" data-import193="open">Review library import</button><button type="button" class="button button-quiet" data-import193="undo">Undo last library import</button><span>Rowanvale JSON · Goodreads / Letterboxd CSV · stays on this device</span>';
    if (view === "backlog")
      bar.querySelector('[data-import193="open"]').remove();
    const anchor = document.querySelector(".living-library-tools");
    if (anchor) anchor.after(bar);
    else document.getElementById("viewRoot")?.append(bar);
    bar.addEventListener("click", (e) => {
      const action = e.target.closest("[data-import193]")?.dataset.import193;
      if (action === "open") document.getElementById("libraryFile")?.click();
      if (action === "undo") undo();
    });
    bar.querySelector('[data-import193="undo"]').disabled =
      !ctx.data().libraryImport193;
  }
  function undo() {
    const batch = ctx.data().libraryImport193;
    if (!batch) return;
    try {
      for (const record of batch.records) {
        const current = ctx.data().backlog.find((x) => x.id === record.id);
        if (!current || C.fingerprint(current) !== record.snapshot)
          throw Error(
            "An imported title has changed since import. Remove individual titles instead to keep those edits.",
          );
      }
      if (
        !confirm(
          "Remove the " +
            batch.records.length +
            " titles added by your last import? Existing titles will stay.",
        )
      )
        return;
      if (
        !ctx.mutate((d) => {
          const ids = new Set(batch.records.map((x) => x.id));
          d.backlog = d.backlog.filter((x) => !ids.has(x.id));
          delete d.libraryImport193;
        })
      )
        return;
      ctx.render();
      ctx.toast("Last library import undone.", "success");
    } catch (e) {
      ctx.toast(e.message, "error");
    }
  }
  async function open(file) {
    if (file.size > 12 * 1024 * 1024)
      throw Error("Library file is larger than 12 MB.");
    const text = await file.text(),
      items = C.parse(text, file.name),
      hash = [
        ...new Uint8Array(
          await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)),
        ),
      ]
        .map((v) => v.toString(16).padStart(2, "0"))
        .join(""),
      baseline = JSON.stringify(ctx.data().backlog),
      rows = C.review(items, ctx.data().backlog, hash);
    let page = 0;
    const d = document.createElement("dialog");
    d.className = "modal import193-dialog";
    d.setAttribute("aria-labelledby", "import193-title");
    document.body.append(d);
    d.addEventListener("close", () => d.remove());
    function paint() {
      const adding = rows.filter((x) => x.action === "add").length;
      d.innerHTML = `<div class="modal-head"><h2 id="import193-title">Review library import</h2><button type="button" class="icon-button" data-i193="close" aria-label="Close import">✕</button></div><p>${E(file.name)} · ${rows.length} titles. <strong>${adding} to add.</strong> Existing records stay unchanged. Matching titles are skipped until you choose “Add separately”. Different editions can remain separate.</p><p class="small-note">Paused and dropped statuses are preserved. Historical imports do not earn XP. Your latest import can be undone while its titles remain unchanged. Exported custom shelf definitions are not imported.</p><p role="alert" id="import193-error"></p><div class="import193-rows">${rows
        .slice(page * 25, page * 25 + 25)
        .map(
          (r) =>
            `<article><div><strong>${E(r.item.title)}</strong><p>${E(r.item.type)} · ${E(r.item.status)} · ${E(r.item.metadata184?.year || r.item.metadata184?.isbn || r.item.book?.isbn || "")}</p><small>${E(r.matches.map((m) => m.relation + " match: " + m.title).join("; ") || (r.prior ? "Similar record earlier in this file" : "No matching saved title"))}</small><details><summary>Incoming details</summary><p>${E(r.item.note || "No note")}</p><p>Rating: ${E(r.item.rating ?? "Unknown")} · Author: ${E(r.item.metadata184?.author || r.item.book?.author || "Unknown")}</p></details></div><label>Import choice<select data-row="${r.index}"><option value="skip" ${r.action === "skip" ? "selected" : ""}>Skip</option><option value="add" ${r.action === "add" ? "selected" : ""}>${r.matches.length || r.prior ? "Add separately" : "Add title"}</option></select></label></article>`,
        )
        .join(
          "",
        )}</div><div class="modal-actions"><button type="button" class="button button-quiet" data-i193="prev" ${page === 0 ? "disabled" : ""}>Previous</button><span>Page ${page + 1} / ${Math.ceil(rows.length / 25)}</span><button type="button" class="button button-quiet" data-i193="next" ${(page + 1) * 25 >= rows.length ? "disabled" : ""}>Next</button><button type="button" class="button button-quiet" data-i193="close">Cancel</button><button type="button" class="button button-primary" data-i193="apply" ${!adding ? "disabled" : ""}>Add ${adding} titles</button></div>`;
    }
    d.addEventListener("change", (e) => {
      if (e.target.matches("[data-row]")) {
        rows[Number(e.target.dataset.row)].action = e.target.value;
        const focus = e.target.dataset.row;
        paint();
        d.querySelector('[data-row="' + focus + '"]')?.focus();
      }
    });
    d.addEventListener("click", (e) => {
      const action = e.target.closest("[data-i193]")?.dataset.i193;
      if (action === "close") d.close();
      if (action === "prev") {
        page--;
        paint();
      }
      if (action === "next") {
        page++;
        paint();
      }
      if (action === "apply") {
        try {
          if (JSON.stringify(ctx.data().backlog) !== baseline)
            throw Error(
              "Your library changed while this review was open. Close and import again to review current matches.",
            );
          const added = C.prepare(
            rows,
            ctx.data().backlog,
            crypto.randomUUID(),
          );
          for (const item of added) {
            if (item.metadata184)
              item.metadata184 = RVLivingCore.sanitizeMetadata(
                item.metadata184,
              );
            if (item.type === "Game") {
              item.gameId = item.gameId || "local:" + item.id;
              item.providerIds =
                item.providerIds &&
                typeof item.providerIds === "object" &&
                !Array.isArray(item.providerIds)
                  ? item.providerIds
                  : {};
            }
          }
          if (
            !ctx.mutate((data) => {
              for (const item of added) RVLivingCore.mediaIdentity(data, item);
              data.backlog.push(...added);
              data.libraryImport193 = {
                version: 1,
                date: new Date().toISOString(),
                records: added.map((x) => ({
                  id: x.id,
                  snapshot: C.fingerprint(x),
                })),
              };
            })
          )
            throw Error(
              "The library could not be saved. Free device space and try again; nothing was imported.",
            );
          d.close();
          ctx.render();
          ctx.toast(
            "Added " +
              added.length +
              " titles. Existing records were preserved.",
            "success",
          );
        } catch (error) {
          d.querySelector("#import193-error").textContent = error.message;
        }
      }
    });
    paint();
    d.showModal();
  }
  return { bind, mount, open, undo };
})();
