/* Read-only local health checks. No workspace, journal or account data leaves this device. */
const RVHealth = (() => {
  "use strict";
  const esc = (value) =>
    String(value ?? "").replace(
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
  const bytes = (value) =>
    Number.isFinite(value)
      ? value < 1048576
        ? (value / 1024).toFixed(1) + " KB"
        : (value / 1048576).toFixed(1) + " MB"
      : "Not reported";
  function shellStatus() {
    return new Promise((resolve) => {
      const worker = navigator.serviceWorker?.controller;
      if (!worker) {
        resolve({
          state: "unchecked",
          text: "This page has no active offline worker. Open Rowanvale through its local launcher and reload after installation.",
        });
        return;
      }
      const channel = new MessageChannel();
      let finished = false;
      const done = (result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        channel.port1.close();
        resolve(result);
      };
      const timer = setTimeout(
        () =>
          done({
            state: "unchecked",
            text: "The installed worker did not answer. Offline availability has not been verified. Reload through the local launcher to check the current build.",
          }),
        2500,
      );
      channel.port1.onmessage = (event) => {
        const result = event.data;
        if (
          result?.type !== "ROWANVALE_HEALTH_RESULT" ||
          !Array.isArray(result.missing) ||
          !Number.isInteger(result.total) ||
          result.total < 1
        )
          return;
        if (
          !String(result.cacheName).includes(
            "v" + window.ROWANVALE_VERSION + "-",
          )
        ) {
          done({
            state: "attention",
            text: "An earlier app shell is controlling this page. Relaunch Rowanvale before relying on the new build offline.",
          });
          return;
        }
        if (result.missing.length)
          done({
            state: "attention",
            text:
              result.missing.length +
              " of " +
              result.total +
              " app files are missing from the offline cache. Keep the local server running and relaunch to repair installation.",
          });
        else
          done({
            state: "ready",
            text:
              "The active worker verified all " +
              result.total +
              " bundled app files in its offline cache. Saved screens and bundled directories can open without the server.",
            total: result.total,
          });
      };
      try {
        worker.postMessage({ type: "ROWANVALE_HEALTH_CHECK" }, [channel.port2]);
      } catch {
        done({
          state: "unchecked",
          text: "This browser could not query its offline worker. Offline availability has not been verified.",
        });
      }
    });
  }
  async function inspect(data, loadIssue) {
    const result = { shell: await shellStatus(), storage: {}, backup: {} };
    try {
      const raw = localStorage.getItem("mindforge.momentum.data");
      result.storage.workspaceBytes =
        raw === null ? null : new Blob([raw]).size;
      result.storage.state = loadIssue
        ? "attention"
        : document.body.hasAttribute("data-save-blocked")
          ? "attention"
          : raw === null
            ? "unchecked"
            : "ready";
      result.storage.text = loadIssue
        ? "Your saved workspace needs recovery. Automatic saving is paused to protect the original file."
        : document.body.hasAttribute("data-save-blocked")
          ? "The last save failed. Keep your form open and review the recovery tools below."
          : raw === null
            ? "No saved workspace was found in this browser."
            : "The saved workspace can be read. This does not guarantee room for the next save.";
    } catch {
      result.storage.state = "attention";
      result.storage.text =
        "Browser storage is inaccessible. Keep this page open and download a backup if possible.";
    }
    try {
      const estimate = await navigator.storage?.estimate?.();
      if (estimate) {
        result.storage.usage = estimate.usage;
        result.storage.quota = estimate.quota;
      }
    } catch {}
    try {
      result.storage.persistent = await navigator.storage?.persisted?.();
    } catch {}
    const stamp = data?.settings?.rv172?.lastPackExport,
      time = Date.parse(stamp);
    result.backup.recorded =
      Number.isFinite(time) && time <= Date.now() + 60000;
    result.backup.text = result.backup.recorded
      ? "Artwork backup download requested " +
        new Date(time).toLocaleString() +
        ". Check the downloaded ZIP exists before depending on it."
      : "No artwork backup download date is recorded. A JSON backup may exist; Rowanvale does not track its download date.";
    result.backup.state =
      result.backup.recorded && Date.now() - time < 7 * 86400000
        ? "recorded"
        : "attention";
    return result;
  }
  function card(label, state, title, copy, extra = "") {
    return `<article class="rv-health-card" data-health-state="${state}"><span class="rv-health-label">${label}</span><h3>${title}</h3><p>${esc(copy)}</p>${extra}</article>`;
  }
  function mount(root, data, options = {}) {
    root.querySelector("#rvHealthPanel")?.remove();
    const panel = document.createElement("section");
    panel.id = "rvHealthPanel";
    panel.className = "rv-health panel";
    panel.setAttribute("aria-labelledby", "rvHealthTitle");
    panel.innerHTML =
      '<header class="rv-health-heading"><div><span class="eyebrow">YOUR DEVICE · YOUR DATA</span><h2 id="rvHealthTitle">A little peace of mind.</h2><p>Check your local storage, offline files and backup record. These checks stay on this device.</p></div><button class="button button-quiet" type="button" data-health-refresh>Refresh checks</button></header><div class="rv-health-results" role="status" aria-live="polite">Checking this browser…</div><div class="rv-health-footer"><button class="button button-primary" type="button" data-health-tools>Review backup & recovery tools ↓</button><details><summary>What works offline?</summary><p>Your saved workspace and bundled directories work locally. New online searches, account sync and remote images need their services. Selected artwork needs its local cache or server. Browser eviction, private browsing and clearing site data can remove local files. An on-device snapshot is not an external backup.</p></details></div>';
    const anchor = root.querySelector(".rv172-data,.hb12-safety-hero");
    if (anchor) anchor.before(panel);
    else root.prepend(panel);
    let ticket = 0;
    async function refresh() {
      const mine = ++ticket,
        button = panel.querySelector("[data-health-refresh]");
      button.disabled = true;
      const result = await inspect(data, options.loadIssue);
      if (!panel.isConnected || mine !== ticket) return;
      const s = result.storage;
      const usage = `<dl><div><dt>Workspace JSON</dt><dd>${bytes(s.workspaceBytes)}</dd></div><div><dt>Browser origin estimate</dt><dd>${bytes(s.usage)} / ${bytes(s.quota)}</dd></div><div><dt>Eviction protection</dt><dd>${s.persistent === true ? "Granted" : s.persistent === false ? "Not granted" : "Not reported"}</dd></div></dl><small>Origin estimates include caches and other browser storage. They are not the remaining localStorage allowance or disk space.</small>`;
      panel.querySelector(".rv-health-results").innerHTML =
        card(
          "LOCAL SAVING",
          s.state,
          s.state === "ready"
            ? "Saved file readable"
            : s.state === "attention"
              ? "Saving needs attention"
              : "Not verified",
          s.text,
          usage,
        ) +
        card(
          "OFFLINE INSTALLATION",
          result.shell.state,
          result.shell.state === "ready"
            ? "App files verified"
            : result.shell.state === "attention"
              ? "Installation needs attention"
              : "Not verified",
          result.shell.text,
        ) +
        card(
          "BACKUP RECORD",
          result.backup.state,
          result.backup.recorded
            ? "Check your downloaded copy"
            : "Keep an external copy",
          result.backup.text,
          "<small>Dates record an app action, not a verified download or successful restore. Test a copy before you need it.</small>",
        );
      button.disabled = false;
    }
    panel.querySelector("[data-health-refresh]").onclick = refresh;
    panel.querySelector("[data-health-tools]").onclick = () => {
      const target = root.querySelector(
        options.loadIssue
          ? '[data-action="rv151-raw-recovery"]'
          : '.hb12-safety-hero [data-action="export"]',
      );
      target?.scrollIntoView({ block: "center", behavior: "auto" });
      target?.focus({ preventScroll: true });
    };
    refresh();
  }
  return { mount };
})();
