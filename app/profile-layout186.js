/* The profile's passport rail and editorial canvas share the existing data and editor. */
const RVProfileLayout = (() => {
  "use strict";
  const C = RVLivingCore,
    P = RVProfileCore,
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
  function render({
    d,
    cfg,
    stats,
    style,
    tab,
    preview,
    content,
    button,
    image,
  }) {
    const p = d.profile || {},
      name = p.name || "Rowanvale Explorer",
      avatar = C.safeImage(d.settings.spaceCustomAvatar),
      banner = C.safeImage(d.settings.spaceCustomBanner),
      rows = P.rows(d),
      counts = C.TYPES.map((type) => ({
        type,
        count: rows.filter((x) => (x.type || "Game") === type).length,
      })).filter((x) => x.count);
    return `<div class="rvp-profile rvp-atlas" data-rvp-mode="${cfg.lighting}" data-rvp-preset="${cfg.preset}" data-rvp-style="${cfg.style}" data-rvp-density="${cfg.density}" data-rvp-cards="${cfg.cardStyle}" data-rvp-media="${cfg.mediaStyle}" data-rvp-motion="${cfg.motion}" style="${E(style)}"><header class="rvp-masthead"><span class="rvp-edition">✦ ROWANVALE / PERSONAL ATLAS</span><span>${cfg.privacy.enabled ? "Shared snapshot enabled" : "PRIVATE COLLECTION"}</span></header><div class="rvp-atlas-layout"><aside class="rvp-passport rvp-hero"><div class="rvp-landscape">${image(banner, "", "rvp-custom-banner")}<span class="rvp-passport-stamp" aria-hidden="true">COLLECT<br>WONDER.</span></div><div class="rvp-passport-body"><div class="rvp-identity"><div class="rvp-avatar">${avatar ? image(avatar, name + " avatar") : E(p.avatarEmoji || name.slice(0, 1))}</div><div class="rvp-name"><p>${p.username ? "@" + E(p.username) : "A corner of Rowanvale"}${p.pronouns ? " · " + E(p.pronouns) : ""}</p><h1>${E(name)}</h1><p class="rvp-tagline">${E(p.tagline || "A life in stories. A world of your own.")}</p></div></div><p class="rvp-status"><i aria-hidden="true"></i>${E(p.status || "Exploring at my own pace.")}</p><div class="rvp-atlas-tally"><strong>${stats.total.toLocaleString()}</strong><span>worlds collected<br><b>${stats.active}</b> in progress · <b>${stats.finished}</b> completed</span></div>${counts.length ? `<div class="rvp-format-ribbon" aria-label="Collection formats">${counts.map((x) => `<span>${E(x.type === "Show" ? "TV" : x.type)} <b>${x.count}</b></span>`).join("")}</div>` : ""}${preview ? "" : `<div class="rvp-profile-actions">${button("Edit profile", "edit")}${button("Customize", "customize")}${button("Shared preview ↗", "shared")}</div>`}<nav class="rvp-tabs" aria-label="Profile sections">${[
      ["overview", "01", "My atlas"],
      ["collection", "02", "All media"],
      ["activity", "03", "Activity"],
      ["connections", "04", "Connections"],
    ]
      .map(([id, n, label]) =>
        button(
          `<small>${n}</small><span>${label}</span><i aria-hidden="true">↗</i>`,
          "tab",
          id,
          `aria-current="${tab === id ? "page" : "false"}"`,
        ),
      )
      .join(
        "",
      )}</nav>${preview ? "" : button("Sharing & privacy", "privacy")}<p class="rvp-passport-note">Made of the worlds you choose.<br>Kept on your terms.</p></div></aside><div class="rvp-atlas-canvas"><div class="rvp-chapter-heading"><span>${tab === "overview" ? "FIELD NOTES / YOUR ORBIT" : tab === "collection" ? "THE COLLECTION" : tab === "activity" ? "A TRAIL OF STORIES" : "GOOD COMPANY"}</span><p>${tab === "overview" ? "An atlas of everything<br>that stays with you." : tab === "collection" ? "Every world,<br>within reach." : tab === "activity" ? "Little moments.<br>Lasting chapters." : "Your people.<br>Your boundaries."}</p></div><div class="rvp-content">${content}</div>${preview ? "" : `<footer class="rvp-footnote">${button("Export shared profile", "export")}${button("Global appearance settings", "global-appearance")}</footer>`}</div></div></div>`;
  }
  return { render };
})();
