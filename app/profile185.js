/* Rowanvale profile view and editor. It reuses the existing profile/settings records. */
const RVProfile = (() => {
  "use strict";
  const P = RVProfileCore,
    C = RVLivingCore,
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
      ),
    LABEL = {
      Game: "Games",
      Book: "Books",
      Movie: "Movies",
      Show: "TV",
      Anime: "Anime",
    },
    ICON = { Game: "⌘", Book: "▤", Movie: "▷", Show: "▣", Anime: "✧" };
  let ctx,
    activeTab = "overview",
    search = "",
    format = "All",
    order = "recent",
    limit = 24,
    editor = null,
    draft = null,
    base = null,
    selectionQuery = "",
    lastFocus = null;
  const button = (text, action, id = "", extra = "") =>
      `<button type="button" class="rvp-button" data-rvp="${action}" data-id="${E(id)}" ${extra}>${text}</button>`,
    route = (text, view) =>
      `<button type="button" class="rvp-button" data-view="${view}">${text}</button>`;
  const sectionName = {
    about: "About",
    featured: "Top shelf",
    continue: "In your rotation",
    collections: "Your shelves",
    activity: "Recent chapters",
    links: "Around the web",
    crew: "Featured people",
    gallery: "Postcards",
    anthem: "Your soundtrack",
    wall: "Private pinboard",
    badges: "Earned milestones",
  };
  function image(src, alt, cls = "") {
    return src
      ? `<img class="${cls}" src="${E(src)}" alt="${E(alt)}" loading="lazy" decoding="async" referrerpolicy="no-referrer" data-rvp-image>`
      : "";
  }
  function tile(x, compact = false) {
    const m = C.meta(x),
      src = P.artwork(x);
    return `<button type="button" class="rvp-media ${compact ? "is-compact" : ""}" data-rvp="story" data-id="${E(x.id)}" aria-label="Open ${E(x.title)}"><span ${RVCovers.mark(x)} class="rvp-art" data-kind="${E(x.type || "Game")}"><span aria-hidden="true">${ICON[x.type] || "✦"}</span>${image(src, "Cover of " + x.title)}<span class="rvp-art-label">${E(LABEL[x.type || "Game"])}</span></span><span class="rvp-media-title">${E(x.title)}</span><span class="rvp-media-subtitle">${E(m.author || m.creators || x.status || "On your shelf")}</span></button>`;
  }
  function header(title, kicker, more = "") {
    return `<div class="rvp-section-head"><div><span class="rvp-kicker">${E(kicker)}</span><h2>${E(title)}</h2></div>${more}</div>`;
  }
  function empty(
    title,
    copy,
    action = "library",
    label = "Find your next story",
  ) {
    return `<div class="rvp-empty"><span aria-hidden="true">✧</span><div><h3>${E(title)}</h3><p>${E(copy)}</p>${button(label, action)}</div></div>`;
  }
  function view(d, options = {}) {
    const cfg = P.config(d),
      p = d.profile || {},
      r = P.rows(d),
      stats = P.stats(d),
      featured = P.featured(d),
      avatar = C.safeImage(d.settings.spaceCustomAvatar),
      banner = C.safeImage(d.settings.spaceCustomBanner),
      name = p.name || "Rowanvale Explorer",
      handle = p.username ? "@" + p.username : "Your corner of Rowanvale",
      preview = options.preview === true;
    const tab = preview ? "overview" : activeTab;
    if (preview) cfg.hidden = [...cfg.hidden, "wall"];
    const style = `--rvp-accent:${cfg.accent};--rvp-on-accent:${P.contrast(cfg.accent, "#102b2a") >= P.contrast(cfg.accent, "#ffffff") ? "#102b2a" : "#ffffff"};--rvp-accent-text-dark:${P.readable(cfg.accent, "#11262b")};--rvp-accent-text-light:${P.readable(cfg.accent, "#faf8f1")};--rvp-banner-color:${cfg.background};--rvp-radius:${cfg.radius}px;--rvp-font:${{ serif: "Georgia,serif", system: "system-ui,sans-serif", rounded: '"Trebuchet MS",sans-serif', mono: "Consolas,monospace" }[cfg.font]};`;
    return RVProfileLayout.render({
      d,
      cfg,
      stats,
      style,
      tab,
      preview,
      button,
      image,
      content:
        tab === "overview"
          ? overview(d, cfg, featured)
          : tab === "collection"
            ? collection(d)
            : tab === "activity"
              ? activity(d)
              : connections(d),
    });
  }

  function overview(d, cfg, featured) {
    const r = P.rows(d),
      active = r
        .filter((x) => ["Currently Playing", "In Progress"].includes(x.status))
        .slice(0, 4),
      p = d.profile || {},
      s = d.settings || {};
    const sections = {
      about: () =>
        `<section class="rvp-about">${header("Between the lines", "THE PERSON BEHIND THE SHELVES")}<p class="rvp-bio">${E(p.bio || "A space to collect stories, find a new favorite, and make room for what you love.")}</p>${
          p.interests
            ? `<div class="rvp-tags">${String(p.interests)
                .split(/[,·]/)
                .map((x) => x.trim())
                .filter(Boolean)
                .slice(0, 10)
                .map((t) => `<span>${E(t)}</span>`)
                .join("")}</div>`
            : ""
        }${p.quote ? `<blockquote>${E(p.quote)}</blockquote>` : ""}</section>`,
      featured: () =>
        `<section class="rvp-featured">${header("The defining collection", "TOP SHELF", button("Choose featured", "featured"))}${featured.length ? `<div class="rvp-shelf">${featured.map((x) => tile(x)).join("")}</div>` : empty("Leave a little room for wonder.", "Your favorite games, books and films will give this space its own character. Start with one you love.", "library")}</section>`,
      continue: () =>
        active.length
          ? `<section class="rvp-rotation">${header("The chapter I’m in.", "YOUR CURRENT ROTATION")}<div class="rvp-rotation-grid">${active
              .map((x) => {
                const m = C.meta(x),
                  n =
                    x.type === "Book"
                      ? C.num(x.book?.progress)
                      : C.num(x.watch?.episodes),
                  max =
                    x.type === "Book"
                      ? C.num(x.book?.pages)
                      : C.num(x.watch?.totalEpisodes);
                return `<article>${tile(x, true)}<p>${E(x.status)}</p>${max ? `<progress value="${Math.min(n, max)}" max="${max}" aria-label="Progress for ${E(x.title)}"></progress><small>${n} / ${max} ${x.type === "Book" ? "pages" : "episodes"}</small>` : ""}</article>`;
              })
              .join("")}</div></section>`
          : "",
      collections: () =>
        r.length
          ? `<section class="rvp-collections">${header("Five ways to find a world.", "FIND YOUR CORNER")}<div class="rvp-collection-links">${Object.entries(
              LABEL,
            )
              .map(([type, label]) => {
                const a = r.filter((x) => (x.type || "Game") === type);
                return `<button type="button" data-rvp="format" data-id="${type}"><span>${ICON[type]}</span><strong>${label}</strong><small>${a.length} ${a.length === 1 ? "story" : "stories"}</small></button>`;
              })
              .join("")}</div></section>`
          : "",
      activity: () => (P.activities(d).length ? activity(d, true) : ""),
      links: () =>
        C.arr(s.spaceLinks).length || p.profileLink
          ? `<section class="rvp-links">${header("Around the web", "OTHER CORNERS OF MY WORLD")}${linkMarkup(d)}</section>`
          : "",
      crew: () => {
        const friends = C.arr(s.spaceTopFriends)
          .map((id) => C.arr(d.friends).find((f) => f.id === id))
          .filter(Boolean);
        return friends.length
          ? `<section class="rvp-crew">${header("Good company.", "PEOPLE I CHOOSE TO FEATURE")}<div class="rvp-people">${friends.map((f) => `<article><span>${E(f.name?.slice(0, 1) || "✦")}</span><b>${E(f.name)}</b><small>${E(f.platform || "Local roster")}</small></article>`).join("")}</div><p class="rvp-muted">Featured from your private roster. Presence and follower counts are not synced.</p></section>`
          : "";
      },
      gallery: () => {
        const pics = C.arr(s.spaceGallery)
          .filter((g) => C.safeImage(g.image))
          .slice(0, 6);
        return pics.length
          ? `<section class="rvp-gallery">${header("A few little postcards.", "YOUR GALLERY")}<div>${pics.map((g) => `<figure>${image(C.safeImage(g.image), g.caption || "Personal gallery image")}<figcaption>${E(g.caption)}</figcaption></figure>`).join("")}</div></section>`
          : "";
      },
      anthem: () =>
        p.anthemTitle || p.anthemUrl || p.anthemAudio
          ? `<section class="rvp-anthem">${header("The soundtrack to this corner.", "ON REPEAT")}<div class="rvp-soundtrack"><span class="rvp-record" aria-hidden="true">♫</span><div><h3>${E(p.anthemTitle || "Your local anthem")}</h3><p>${E(p.anthemArtist || "")}</p>${C.safeLink(p.anthemUrl) ? `<a href="${E(p.anthemUrl)}" target="_blank" rel="noopener noreferrer">Open anthem ↗</a>` : ""}${/^data:audio\/(mpeg|wav|ogg);base64,[a-z0-9+/=]+$/i.test(p.anthemAudio || "") && p.anthemAudio.length < 1500000 ? `<audio controls preload="none" ${s.rv18?.mute ? "muted" : ""} src="${E(p.anthemAudio)}" aria-label="Play your uploaded anthem"></audio>` : ""}</div></div></section>`
          : "",
      wall: () =>
        `<section class="rvp-pinboard"><details><summary>Private pinboard <span>Notes stay on this device</span></summary><form id="guestbookForm"><label for="guestbookInput">A recommendation or a little reminder</label><textarea id="guestbookInput" maxlength="240" rows="2"></textarea><button type="submit" class="rvp-button">Pin note</button></form>${C.arr(
          d.guestbook,
        )
          .slice(0, 8)
          .map(
            (n) =>
              `<article><p>${E(n.text)}</p><button type="button" class="rvp-button" data-action="space-delete-note" data-id="${E(n.id)}" aria-label="Remove note">Remove</button></article>`,
          )
          .join("")}</details></section>`,
      badges: () =>
        C.arr(d.achievements).length
          ? `<section class="rvp-badges">${header("Milestones, earned at your pace.", "REAL MOMENTS")}<div>${C.arr(
              d.achievements,
            )
              .slice(-6)
              .reverse()
              .map(
                (a) =>
                  `<article><span aria-hidden="true">✦</span><b>${E(a.name)}</b><small>${E(a.desc)}</small></article>`,
              )
              .join("")}</div></section>`
          : "",
    };
    return `<div class="rvp-overview">${cfg.order
      .filter((id) => !cfg.hidden.includes(id))
      .map((id) => sections[id]?.() || "")
      .join("")}</div>`;
  }
  function collection(d) {
    const all = P.rows(d).filter(
      (x) =>
        (format === "All" || (x.type || "Game") === format) &&
        (!search ||
          C.norm(
            [x.title, C.meta(x).author, C.meta(x).genres].join(" "),
          ).includes(C.norm(search))),
    );
    all.sort((a, b) =>
      order === "title"
        ? a.title.localeCompare(b.title)
        : String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
    );
    return `<section>${header("All the worlds on your shelves.", "YOUR COLLECTION")}<div class="rvp-filters"><label>Search your media<input id="rvp-library-query" type="search" value="${E(search)}" placeholder="A title, author or genre"></label><label>Format<select id="rvp-library-format"><option>All</option>${Object.entries(
      LABEL,
    )
      .map(
        ([v, l]) =>
          `<option value="${v}" ${format === v ? "selected" : ""}>${l}</option>`,
      )
      .join(
        "",
      )}</select></label><label>Sort<select id="rvp-library-sort"><option value="recent" ${order === "recent" ? "selected" : ""}>Recent first</option><option value="title" ${order === "title" ? "selected" : ""}>Title A–Z</option></select></label></div><div id="rvp-media-results"><p class="rvp-muted" role="status">Showing ${Math.min(limit, all.length)} of ${all.length} stories</p><div class="rvp-media-grid">${
      all
        .slice(0, limit)
        .map((x) => tile(x))
        .join("") ||
      empty(
        "Room for another world.",
        "Your shelves grow naturally as you save stories.",
        "library",
      )
    }</div>${all.length > limit ? button("Show 24 more", "more") : ""}</div></section>`;
  }
  function activity(d, small = false) {
    const a = P.activities(d);
    return `<section class="rvp-activity">${header("Your recent chapters.", "ACTIVITY", small ? button("View all activity", "tab", "activity") : "")}<ol>${
      a
        .slice(0, small ? 5 : 30)
        .map(
          (x) =>
            `<li><span aria-hidden="true">${ICON[x.type] || "✦"}</span><div><b>${E(x.title)}</b><p>${E(x.label)}</p></div><time datetime="${E(x.date)}">${new Date(x.date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</time></li>`,
        )
        .join("") ||
      "<li><p>Small moments become a story. Your saved media and sessions will appear here.</p></li>"
    }</ol></section>`;
  }
  function linkMarkup(d) {
    const a = C.arr(d.settings.spaceLinks).filter((l) => C.safeLink(l.url));
    if (C.safeLink(d.profile.profileLink))
      a.push({ label: "My website", url: d.profile.profileLink });
    return `<div class="rvp-web-links">${a.map((l) => `<a href="${E(l.url)}" target="_blank" rel="noopener noreferrer"><span>${E(l.label || new URL(l.url).hostname)}</span><small>${E(new URL(l.url).hostname)} ↗</small></a>`).join("")}</div>`;
  }
  function connections(d) {
    return `<section>${header("Stay connected, on your terms.", "YOUR CONNECTIONS")}${linkMarkup(d)}<div class="rvp-connect-summary" id="rvp-connect-summary">${window.RVConnect ? RVConnect.summary() : "<p>Connection tools are starting…</p>"}</div><div class="rvp-action-row">${button("Connectivity & accounts", "connect")}${route("Platform shortcuts", "connections")}${route("Your private friends roster", "friends")}</div></section>`;
  }
  function owned(d) {
    const s = d.settings;
    return {
      profile: structuredClone(d.profile),
      settings: Object.fromEntries(
        [
          "spaceAccent",
          "spaceFont",
          "spaceCorner",
          "spaceMotion",
          "spaceCustomAvatar",
          "spaceCustomBanner",
          "customWallpaper",
          "spaceLinks",
          "spaceGallery",
          "spaceOrder",
          "hiddenSpaceSections",
          "spaceTopFriends",
          "profile185",
        ].map((k) => [k, structuredClone(s[k] ?? null)]),
      ),
    };
  }
  function editorShell() {
    return `<form id="rvp-editor-form"><header class="rvp-editor-head"><div><span class="rvp-kicker">PROFILE STUDIO · ONLY YOUR PROFILE</span><h2>Make this corner yours.</h2><p>Changes stay in this preview until you apply them.</p></div><button type="button" class="rvp-icon-button" data-rvp-edit="cancel" aria-label="Close profile editor">×</button></header><div class="rvp-editor-layout"><div class="rvp-editor-controls"><nav aria-label="Profile editor categories">${[
      ["identity", "Identity"],
      ["appearance", "Appearance"],
      ["featured", "Featured media"],
      ["sections", "Sections"],
      ["privacy", "Sharing & privacy"],
    ]
      .map(
        ([id, l]) =>
          `<button type="button" data-rvp-edit="category" data-id="${id}" aria-current="${editor.category === id ? "page" : "false"}">${l}</button>`,
      )
      .join(
        "",
      )}</nav><div id="rvp-editor-fields">${fields()}</div></div><section class="rvp-preview-panel" aria-label="Live profile preview"><div class="rvp-preview-toolbar"><b>Live preview</b><label>Preview lighting<select id="rvp-preview-lighting"><option value="inherit">Current app mode</option><option value="light">Light</option><option value="dark">Dark</option></select></label><label>Preview size<select id="rvp-preview-size"><option value="desktop">Desktop</option><option value="mobile">Mobile</option></select></label></div><div class="rvp-preview-viewport" id="rvp-preview-viewport"><div id="rvp-preview-content" inert>${view(draft, { preview: true })}</div></div></section></div><footer class="rvp-editor-footer"><p id="rvp-editor-status" role="status">Your current profile is saved. Preview changes before applying.</p><div>${button("Reset profile style", "unused").replace('data-rvp="unused"', 'data-rvp-edit="reset"')}<button type="button" class="rvp-button" data-rvp-edit="cancel">Cancel</button><button type="submit" class="rvp-button is-primary">Apply changes</button></div></footer></form>`;
  }
  const field = (label, key, value, type = "text", max = 200) =>
    `<label>${label}<${type === "textarea" ? 'textarea rows="4"' : 'input type="' + type + '"'} data-rvp-field="${key}" ${type !== "textarea" ? `value="${E(value)}"` : ""} maxlength="${max}">${type === "textarea" ? E(value) + "</textarea>" : ""}</label>`;
  function fields() {
    const p = draft.profile,
      s = draft.settings,
      c = P.config(draft);
    if (editor.category === "identity")
      return `<h3>The person behind the shelves.</h3>${field("Display name", "profile.name", p.name, "text", 60)}${field("Username (letters, numbers, underscores)", "profile.username", p.username, "text", 40)}${field("A few words under your name", "profile.tagline", p.tagline, "text", 140)}${field("Pronouns · optional", "profile.pronouns", p.pronouns, "text", 40)}${field("Your current status", "profile.status", p.status, "text", 90)}${field("Bio", "profile.bio", p.bio, "textarea", 700)}${field("Interests · separate with commas", "profile.interests", p.interests, "text", 180)}${field("A favorite quote", "profile.quote", p.quote, "text", 160)}<div class="rvp-upload-row"><label>Avatar<input type="file" data-rvp-upload="avatar" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="rvp-button" data-rvp-edit="remove-image" data-id="avatar">Use default avatar</button></div><div class="rvp-upload-row"><label>Banner<input type="file" data-rvp-upload="banner" accept="image/png,image/jpeg,image/webp"></label><button type="button" class="rvp-button" data-rvp-edit="remove-image" data-id="banner">Use scenic banner</button></div>${field("Avatar symbol (used without a photo)", "profile.avatarEmoji", p.avatarEmoji, "text", 12)}<details><summary>Links, soundtrack & gallery</summary>${field("Personal website · HTTPS", "profile.profileLink", p.profileLink, "url", 1000)}${C.arr(
        s.spaceLinks,
      )
        .map(
          (l, i) =>
            `<div class="rvp-link-editor">${field("Link label", "link." + i + ".label", l.label, "text", 42)}${field("HTTPS link", "link." + i + ".url", l.url, "url", 1000)}<button type="button" class="rvp-button" data-rvp-edit="remove-link" data-id="${i}">Remove link</button></div>`,
        )
        .join(
          "",
        )}<button type="button" class="rvp-button" data-rvp-edit="add-link" ${C.arr(s.spaceLinks).length >= 12 ? "disabled" : ""}>Add a social link</button>${field("Anthem title", "profile.anthemTitle", p.anthemTitle, "text", 120)}${field("Anthem artist", "profile.anthemArtist", p.anthemArtist, "text", 120)}${field("Anthem link · HTTPS", "profile.anthemUrl", p.anthemUrl, "url", 1000)}<label>Local anthem · MP3, WAV or OGG · up to 1 MB<input type="file" data-rvp-upload="audio" accept="audio/mpeg,audio/wav,audio/ogg"></label><button type="button" class="rvp-button" data-rvp-edit="remove-image" data-id="audio">Remove local audio</button><h4>Gallery</h4>${C.arr(
        s.spaceGallery,
      )
        .map(
          (g, i) =>
            `<div class="rvp-gallery-editor">${image(C.safeImage(g.image), g.caption || "Gallery photo")}${field("Caption", "gallery." + i, g.caption, "text", 80)}<button type="button" class="rvp-button" data-rvp-edit="remove-gallery" data-id="${i}">Remove picture</button></div>`,
        )
        .join(
          "",
        )}<label>Add a gallery picture · up to six<input type="file" data-rvp-upload="gallery" accept="image/png,image/jpeg,image/webp" ${C.arr(s.spaceGallery).length >= 6 ? "disabled" : ""}></label></details><p class="rvp-muted">Images are kept in your local workspace. Upload PNG, JPEG or WebP under 900 KB. Profile edits do not publish anything online.</p>`;
    if (editor.category === "appearance")
      return `<h3>One world. Your atmosphere.</h3><div class="rvp-presets">${Object.entries(
        P.PRESETS,
      )
        .map(
          ([id, t]) =>
            `<button type="button" data-rvp-edit="preset" data-id="${id}" aria-pressed="${c.preset === id}"><span style="background:${t.background};--swatch:${t.accent}"><i></i></span><b>${t.name}</b></button>`,
        )
        .join(
          "",
        )}</div>${field("Profile accent", "settings.spaceAccent", s.spaceAccent || c.accent, "color")}${field("Banner background", "settings.profile185.background", c.background, "color")}<label>Profile lighting<select data-rvp-field="settings.profile185.lighting">${[
        ["inherit", "Follow app appearance"],
        ["light", "Light"],
        ["dark", "Dark"],
        ["system", "Follow system"],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${c.lighting === v ? "selected" : ""}>${l}</option>`,
        )
        .join(
          "",
        )}</select></label><label>Typography<select data-rvp-field="settings.spaceFont">${["serif", "system", "rounded", "mono"].map((v) => `<option ${c.font === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Spacing<select data-rvp-field="settings.profile185.density">${["compact", "comfortable", "spacious"].map((v) => `<option ${c.density === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Card surfaces<select data-rvp-field="settings.profile185.cardStyle">${["clean", "outlined", "glass"].map((v) => `<option ${c.cardStyle === v ? "selected" : ""}>${v}</option>`).join("")}</select></label><label>Media presentation<select data-rvp-field="settings.profile185.mediaStyle">${[
        ["posters", "Posters"],
        ["compact", "Compact covers"],
        ["list", "Reading list"],
      ]
        .map(
          ([v, l]) =>
            `<option value="${v}" ${c.mediaStyle === v ? "selected" : ""}>${l}</option>`,
        )
        .join(
          "",
        )}</select></label><label>Corner softness <input type="range" data-rvp-field="settings.spaceCorner" min="8" max="32" value="${c.radius}"></label><label class="rvp-check"><input type="checkbox" data-rvp-field="settings.profile185.motion" ${c.motion ? "checked" : ""}> Subtle profile motion</label><p class="rvp-muted">Reduced motion from your app or operating system always takes priority. Your accent is adjusted for readable text; the chosen color remains visible in decorative details. Global appearance stays unchanged.</p>`;
    if (editor.category === "featured") {
      const selected = new Set(c.featured),
        r = P.rows(draft).filter(
          (x) =>
            !selectionQuery || C.norm(x.title).includes(C.norm(selectionQuery)),
        );
      return `<h3>Keep your favorite worlds close.</h3><p>Choose up to twelve stories in any supported format. With no selection, favorites or your recent shelves are featured automatically.</p><label>Find a story<input id="rvp-feature-query" type="search" value="${E(selectionQuery)}"></label><p id="rvp-feature-count">${selected.size} of 12 selected</p><div id="rvp-feature-options">${
        r
          .slice(0, 30)
          .map(
            (x) =>
              `<label class="rvp-feature-option"><input type="checkbox" data-rvp-feature="${E(x.id)}" ${selected.has(x.id) ? "checked" : ""}><span>${E(x.title)}</span><small>${E(LABEL[x.type] || "Games")}</small></label>`,
          )
          .join("") ||
        "<p>Add stories to your library before choosing featured media.</p>"
      }</div><button class="rvp-button" type="button" data-rvp-edit="auto-feature">Use automatic featured shelf</button>`;
    }
    if (editor.category === "sections")
      return `<h3>A layout with room to breathe.</h3><p>Hidden sections keep all their data. Empty optional sections stay tucked away automatically.</p><div class="rvp-section-editor">${c.order.map((id, i) => `<div><label class="rvp-check"><input type="checkbox" data-rvp-section="${id}" ${c.hidden.includes(id) ? "" : "checked"}> ${sectionName[id]}</label><button class="rvp-icon-button" type="button" data-rvp-edit="move" data-id="${id}" data-step="-1" aria-label="Move ${sectionName[id]} up" ${i === 0 ? "disabled" : ""}>↑</button><button class="rvp-icon-button" type="button" data-rvp-edit="move" data-id="${id}" data-step="1" aria-label="Move ${sectionName[id]} down" ${i === c.order.length - 1 ? "disabled" : ""}>↓</button></div>`).join("")}</div>`;
    return `<h3>Choose what leaves your device.</h3><p>Your working profile stays private. A shared snapshot is a separate file you export and choose to share; Rowanvale does not host a public profile or create follower counts.</p><label class="rvp-check"><input type="checkbox" data-rvp-field="settings.profile185.privacy.enabled" ${c.privacy.enabled ? "checked" : ""}> Enable shared-profile snapshots</label><p>The shared file contains your name, avatar, tagline and featured media. Choose any additional sections below. Private notes, email, cloud keys, account tokens, mood logs, fitness logs and your pinboard are never included.</p>${[
      ["about", "Bio, pronouns, quote & interests"],
      ["collection", "Your full media collection (up to 2,000 titles)"],
      ["activity", "Recent media activity"],
      ["connections", "Selected website & social links"],
      ["crew", "Featured friends’ display names"],
      ["gallery", "Gallery pictures & captions"],
      ["anthem", "Anthem link and title (no local audio file)"],
      ["badges", "Earned achievement descriptions"],
      ["stats", "Media collection statistics"],
    ]
      .map(
        ([id, l]) =>
          `<label class="rvp-check"><input type="checkbox" data-rvp-field="settings.profile185.privacy.${id}" ${c.privacy[id] ? "checked" : ""}> ${l}</label>`,
      )
      .join(
        "",
      )}<p class="rvp-muted">Only your selected featured items are shared when full collection visibility is off. Review the preview before exporting. Cached server image paths are not shared as private local URLs.</p>`;
  }
  function openEditor(category = "identity") {
    if (editor?.dialog?.open) return;
    lastFocus = document.activeElement;
    draft = structuredClone(ctx.data());
    base = owned(ctx.data());
    draft.settings.profile185 = {
      ...P.config(draft),
      ...draft.settings.profile185,
      privacy: { ...P.config(draft).privacy },
    };
    editor = { category, dialog: document.createElement("dialog") };
    const d = editor.dialog;
    d.id = "rvp-editor";
    d.className = "rvp-editor";
    d.innerHTML = editorShell();
    document.body.append(d);
    d.showModal();
    wireEditor();
    d.addEventListener("cancel", (e) => {
      e.preventDefault();
      closeEditor();
    });
    d.addEventListener("close", () => {
      d.remove();
      editor = null;
      draft = null;
      lastFocus?.isConnected && lastFocus.focus();
    });
  }
  function closeEditor() {
    if (!editor) return;
    editor.dialog.close();
  }
  function status(text, error = false) {
    const e = document.getElementById("rvp-editor-status");
    if (e) {
      e.textContent = text;
      e.classList.toggle("is-error", error);
    }
  }
  function redrawPreview() {
    const root = document.getElementById("rvp-preview-content");
    if (!root) return;
    const v = structuredClone(draft),
      mode = document.getElementById("rvp-preview-lighting")?.value;
    if (mode && mode !== "inherit") v.settings.profile185.lighting = mode;
    root.innerHTML = view(v, { preview: true });
  }
  function rerenderFields() {
    const root = document.getElementById("rvp-editor-fields");
    if (root) root.innerHTML = fields();
    redrawPreview();
  }
  function setField(path, value) {
    const a = path.split(".");
    if (a[0] === "profile") {
      draft.profile[a[1]] = value;
      return;
    }
    if (a[0] === "link") {
      draft.settings.spaceLinks[Number(a[1])][a[2]] = value;
      return;
    }
    if (a[0] === "gallery") {
      draft.settings.spaceGallery[Number(a[1])].caption = value;
      return;
    }
    if (a[0] !== "settings") return;
    let o = draft.settings;
    for (const k of a.slice(1, -1)) o = o[k] || (o[k] = {});
    o[a.at(-1)] = value;
  }
  async function upload(file, kind) {
    if (!file) return;
    if (kind === "audio") {
      if (
        file.size > 1000000 ||
        !["audio/mpeg", "audio/wav", "audio/ogg"].includes(file.type)
      )
        throw Error("Choose MP3, WAV or OGG audio under 1 MB.");
      draft.profile.anthemAudio = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(Error("The audio file could not be read."));
        r.readAsDataURL(file);
      });
      return;
    }
    if (
      file.size > 900000 ||
      !["image/png", "image/jpeg", "image/webp"].includes(file.type)
    )
      throw Error("Choose a PNG, JPEG or WebP below 900 KB.");
    const url = URL.createObjectURL(file),
      img = new Image();
    try {
      await new Promise((ok, no) => {
        img.onload = ok;
        img.onerror = () => no(Error("The image could not be decoded."));
        img.src = url;
      });
      if (img.naturalWidth * img.naturalHeight > 16000000)
        throw Error("This image is too large to process safely.");
      const w = kind === "avatar" ? 400 : kind === "banner" ? 1600 : 1000,
        h = kind === "avatar" ? 400 : kind === "banner" ? 700 : 1000,
        scale = Math.min(1, w / img.naturalWidth, h / img.naturalHeight),
        canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const value = canvas.toDataURL("image/jpeg", 0.82);
      if (value.length > 550000) throw Error("Choose a smaller image.");
      if (kind === "gallery") {
        draft.settings.spaceGallery = C.arr(draft.settings.spaceGallery);
        if (draft.settings.spaceGallery.length >= 6)
          throw Error("Your gallery already has six pictures.");
        draft.settings.spaceGallery.push({
          id: crypto.randomUUID(),
          image: value,
          caption: "",
        });
      } else
        draft.settings[
          kind === "avatar" ? "spaceCustomAvatar" : "spaceCustomBanner"
        ] = value;
    } finally {
      URL.revokeObjectURL(url);
    }
  }
  function wireEditor() {
    const d = editor.dialog;
    let previewDelay;
    d.querySelector("form").onsubmit = (e) => {
      e.preventDefault();
      try {
        P.validateDraft(draft);
        if (JSON.stringify(owned(ctx.data())) !== JSON.stringify(base))
          throw Error(
            "Your profile changed while this editor was open. Close it and reopen before applying.",
          );
        const next = structuredClone(draft);
        if (!ctx.commitProfile(next))
          throw Error(
            "Changes could not be saved. Your earlier profile is safe; keep this preview open and retry.",
          );
        base = owned(ctx.data());
        d.close();
        ctx.toast("Your profile is saved on this device.", "success");
      } catch (e) {
        status(e.message, true);
      }
    };
    d.addEventListener("input", (e) => {
      const el = e.target;
      if (el.dataset.rvpField) {
        setField(
          el.dataset.rvpField,
          el.type === "checkbox"
            ? el.checked
            : el.type === "range"
              ? Number(el.value)
              : el.value,
        );
        clearTimeout(previewDelay);
        previewDelay = setTimeout(redrawPreview, 80);
        status("Preview updated. Apply to save your profile.");
      }
      if (el.id === "rvp-feature-query") {
        selectionQuery = el.value;
        const focus = el.selectionStart;
        rerenderFields();
        const input = d.querySelector("#rvp-feature-query");
        input.focus();
        input.setSelectionRange(focus, focus);
      }
    });
    d.addEventListener("change", async (e) => {
      const el = e.target;
      try {
        if (el.dataset.rvpUpload) {
          status("Preparing your upload…");
          d.querySelector(".rvp-editor-footer [type=submit]").disabled = true;
          await upload(el.files[0], el.dataset.rvpUpload);
          rerenderFields();
          status("Upload ready in your preview. Apply to keep it.");
        }
        if (el.dataset.rvpFeature) {
          const ids = new Set(P.config(draft).featured);
          if (el.checked && ids.size >= 12) {
            el.checked = false;
            throw Error("Choose up to twelve stories.");
          }
          el.checked
            ? ids.add(el.dataset.rvpFeature)
            : ids.delete(el.dataset.rvpFeature);
          draft.settings.profile185.featured = [...ids];
          d.querySelector("#rvp-feature-count").textContent =
            ids.size + " of 12 selected";
          redrawPreview();
        }
        if (el.dataset.rvpSection) {
          const hidden = new Set(P.config(draft).hidden);
          el.checked
            ? hidden.delete(el.dataset.rvpSection)
            : hidden.add(el.dataset.rvpSection);
          draft.settings.profile185.hidden = [...hidden];
          draft.settings.hiddenSpaceSections = [...hidden].map((x) =>
            x === "featured" ? "games" : x,
          );
          redrawPreview();
        }
        if (el.id === "rvp-preview-lighting") redrawPreview();
        if (el.id === "rvp-preview-size")
          d.querySelector("#rvp-preview-viewport").dataset.size = el.value;
      } catch (e) {
        status(e.message, true);
      } finally {
        const submit = d.querySelector(".rvp-editor-footer [type=submit]");
        if (submit) submit.disabled = false;
      }
    });
    d.addEventListener("click", (e) => {
      const b = e.target.closest("[data-rvp-edit]");
      if (!b) return;
      const a = b.dataset.rvpEdit,
        id = b.dataset.id;
      if (a === "cancel") {
        closeEditor();
        return;
      }
      if (a === "category") {
        editor.category = id;
        d.querySelectorAll("[data-rvp-edit=category]").forEach((x) =>
          x.setAttribute(
            "aria-current",
            x.dataset.id === id ? "page" : "false",
          ),
        );
        rerenderFields();
        return;
      }
      if (a === "preset") P.applyPreset(draft, id);
      if (a === "reset") {
        for (const k of [
          "spaceAccent",
          "spaceFont",
          "spaceCorner",
          "spaceMotion",
        ])
          delete draft.settings[k];
        draft.settings.profile185 = {
          ...draft.settings.profile185,
          preset: "rowan",
          style: "landscape",
          background: P.PRESETS.rowan.background,
          cardStyle: "clean",
          mediaStyle: "posters",
          density: "comfortable",
          lighting: "inherit",
          motion: false,
        };
        P.applyPreset(draft, "rowan");
      }
      if (a === "auto-feature") draft.settings.profile185.featured = [];
      if (a === "move") {
        const order = P.config(draft).order,
          i = order.indexOf(id),
          j = i + Number(b.dataset.step);
        if (j >= 0 && j < order.length)
          [order[i], order[j]] = [order[j], order[i]];
        draft.settings.profile185.order = order;
        draft.settings.spaceOrder = order.map((x) =>
          x === "featured" ? "games" : x,
        );
      }
      if (a === "remove-image") {
        if (id === "audio") delete draft.profile.anthemAudio;
        else
          delete draft.settings[
            id === "avatar" ? "spaceCustomAvatar" : "spaceCustomBanner"
          ];
      }
      if (a === "add-link") {
        draft.settings.spaceLinks = C.arr(draft.settings.spaceLinks);
        if (draft.settings.spaceLinks.length < 12)
          draft.settings.spaceLinks.push({ label: "", url: "" });
      }
      if (a === "remove-link") draft.settings.spaceLinks.splice(Number(id), 1);
      if (a === "remove-gallery")
        draft.settings.spaceGallery.splice(Number(id), 1);
      rerenderFields();
      status("Preview updated. Apply to save your profile.");
    });
    d.addEventListener("close", () => clearTimeout(previewDelay), {
      once: true,
    });
  }
  function legacySharedMarkup(s) {
    const a = s.appearance || P.PRESETS.rowan,
      style = `--rvp-accent:${P.color(a.accent, "#dcaa72")};--rvp-on-accent:${P.contrast(P.color(a.accent, "#dcaa72"), "#102b2a") >= P.contrast(P.color(a.accent, "#dcaa72"), "#ffffff") ? "#102b2a" : "#ffffff"};--rvp-accent-text-dark:${P.readable(P.color(a.accent, "#dcaa72"), "#11262b")};--rvp-accent-text-light:${P.readable(P.color(a.accent, "#dcaa72"), "#faf8f1")};--rvp-banner-color:${P.color(a.background, "#102b2d")};--rvp-radius:${Math.max(8, Math.min(32, Number(a.radius) || 22))}px;--rvp-font:${{ serif: "Georgia,serif", system: "system-ui,sans-serif", rounded: '"Trebuchet MS",sans-serif', mono: "Consolas,monospace" }[a.font] || "Georgia,serif"};`,
      media = (x) =>
        `<article class="rvp-media"><span class="rvp-art" data-kind="${E(x.type)}"><span aria-hidden="true">${ICON[x.type] || "✦"}</span>${image(C.safeImage(x.artwork), "Cover of " + x.title)}<span class="rvp-art-label">${E(LABEL[x.type] || "Media")}</span></span><h3 class="rvp-media-title">${E(x.title)}</h3><p class="rvp-media-subtitle">${E(x.author || x.status || "")}</p>${x.sourceUrl ? `<a href="${E(C.safeLink(x.sourceUrl))}" rel="noopener noreferrer" target="_blank">Source ↗</a>` : ""}${x.attribution ? `<small>${E(x.attribution)}</small>` : ""}</article>`;
    return `<main class="rvp-profile rvp-shared" data-rvp-mode="${["light", "dark", "system"].includes(a.lighting) ? a.lighting : "dark"}" data-rvp-style="${E(a.style || "landscape")}" data-rvp-density="${E(a.density || "comfortable")}" data-rvp-cards="${E(a.cardStyle || "clean")}" data-rvp-media="${E(a.mediaStyle || "posters")}" style="${E(style)}"><header class="rvp-hero"><div class="rvp-landscape">${image(C.safeImage(s.banner), "", "rvp-custom-banner")}<span class="rvp-worldmark">ROWANVALE / SHARED PROFILE SNAPSHOT</span></div><div class="rvp-identity"><div class="rvp-avatar">${C.safeImage(s.avatar) ? image(s.avatar, s.name + " avatar") : E(s.avatarSymbol || "✦")}</div><div class="rvp-name"><p>${s.username ? "@" + E(s.username) : "A corner of Rowanvale"}</p><h1>${E(s.name)}</h1><p>${E(s.tagline || "")}</p></div></div>${s.stats ? `<p class="rvp-profile-meta">${C.num(s.stats.total)} stories · ${C.num(s.stats.active)} in progress · ${C.num(s.stats.finished)} completed</p>` : ""}</header><div class="rvp-content">${s.about ? `<section class="rvp-about">${header("A little about me", "THE PERSON BEHIND THE SHELVES")}<p class="rvp-bio">${E(s.about.bio || "")}</p><p>${E(s.about.interests || "")}</p>${s.about.quote ? `<blockquote>${E(s.about.quote)}</blockquote>` : ""}</section>` : ""}<section>${header("The worlds I keep close", "TOP SHELF")}<div class="rvp-shelf">${C.arr(s.featured).map(media).join("") || "<p>A little room for the next favorite.</p>"}</div></section>${s.collection ? `<section id="collection">${header("On my shelves", "MEDIA COLLECTION")}<div class="rvp-media-grid">${s.collection.map(media).join("")}</div></section>` : ""}${s.activity ? `<section class="rvp-activity">${header("Recent chapters", "SHARED MEDIA ACTIVITY")}<ol>${s.activity.map((x) => `<li><div><b>${E(x.title)}</b><p>${E(x.label)}</p></div><time>${E(String(x.date).slice(0, 10))}</time></li>`).join("")}</ol></section>` : ""}${s.links?.length ? `<section>${header("Around the web", "SELECTED LINKS")}<div class="rvp-web-links">${s.links.map((l) => `<a href="${E(C.safeLink(l.url))}" rel="noopener noreferrer" target="_blank">${E(l.label)} ↗</a>`).join("")}</div></section>` : ""}${s.crew?.length ? `<section>${header("Good company", "FEATURED PEOPLE")}<p>${s.crew.map((x) => E(x.name)).join(" · ")}</p></section>` : ""}${s.gallery?.length ? `<section class="rvp-gallery">${header("Postcards", "GALLERY")}<div>${s.gallery.map((g) => `<figure>${image(C.safeImage(g.image), g.caption)}<figcaption>${E(g.caption)}</figcaption></figure>`).join("")}</div></section>` : ""}${s.anthem ? `<section>${header("On repeat", "SOUNDTRACK")}<h3>${E(s.anthem.title)}</h3><p>${E(s.anthem.artist)}</p>${C.safeLink(s.anthem.url) ? `<a href="${E(s.anthem.url)}" rel="noopener noreferrer" target="_blank">Open anthem ↗</a>` : ""}</section>` : ""}${s.badges?.length ? `<section class="rvp-badges">${header("Milestones", "EARNED MOMENTS")}<div>${s.badges.map((x) => `<article><b>${E(x.name)}</b><small>${E(x.description)}</small></article>`).join("")}</div></section>` : ""}</div><footer class="rvp-footnote">A static snapshot, deliberately shared. It has no live presence, private notes or account access.</footer></main>`;
  }
  function sharedMarkup(s) {
    const template = document.createElement("template");
    template.innerHTML = legacySharedMarkup(s);
    const root = template.content.firstElementChild,
      oldHeader = root.querySelector(".rvp-hero"),
      landscape = oldHeader.querySelector(".rvp-landscape").outerHTML,
      identity = oldHeader.querySelector(".rvp-identity").outerHTML,
      stats = oldHeader.querySelector(".rvp-profile-meta")?.outerHTML || "",
      content = root.querySelector(".rvp-content").outerHTML,
      footer = root.querySelector(".rvp-footnote").outerHTML;
    root.classList.add("rvp-atlas");
    root.innerHTML =
      '<header class="rvp-masthead"><span class="rvp-edition">✦ ROWANVALE / PERSONAL ATLAS</span><span>SHARED SNAPSHOT</span></header><div class="rvp-atlas-layout"><aside class="rvp-passport">' +
      landscape +
      '<div class="rvp-passport-body">' +
      identity +
      stats +
      '<p class="rvp-passport-note">Made of the worlds you choose.</p></div></aside><div class="rvp-atlas-canvas"><div class="rvp-chapter-heading"><span>A DELIBERATELY SHARED CORNER</span><p>A life in stories.<br>A world of my own.</p></div>' +
      content +
      footer +
      "</div></div>";
    return root.outerHTML;
  }
  function normalizedSnapshot() {
    const s = P.publicSnapshot(ctx.data());
    for (const list of [s.featured, s.collection || []])
      for (const x of list)
        if (x.artwork?.startsWith("/api/")) {
          const original = P.rows(ctx.data()).find((r) => r.id === x.id)
            ?.metadata184?.originalArtwork;
          x.artwork = C.safeImage(original) || "";
        }
    return s;
  }
  function sharedPreview() {
    let snapshot;
    try {
      snapshot = normalizedSnapshot();
    } catch (e) {
      ctx.toast(e.message);
      openEditor("privacy");
      return;
    }
    document.getElementById("rvp-shared-preview")?.remove();
    const d = document.createElement("dialog");
    d.id = "rvp-shared-preview";
    d.className = "rvp-shared-preview";
    d.innerHTML = `<header><div><h2>What other people will see</h2><p>This preview contains only the fields selected for sharing.</p></div><button type="button" class="rvp-button" data-preview-close>Close</button></header><div>${sharedMarkup(snapshot)}</div><footer><button type="button" class="rvp-button is-primary" data-export-confirm>Export this snapshot</button></footer>`;
    document.body.append(d);
    d.querySelector("[data-preview-close]").onclick = () => d.close();
    d.querySelector("[data-export-confirm]").onclick = () =>
      exportProfile(snapshot);
    d.addEventListener("close", () => d.remove());
    d.showModal();
  }
  async function exportProfile(snapshot = null) {
    try {
      snapshot = snapshot || normalizedSnapshot();
      const sheets = await Promise.all(
        ["./profile185.css", "./experience186.css"].map((file) => fetch(file)),
      );
      if (sheets.some((r) => !r.ok))
        throw Error(
          "The export styles are unavailable. Reconnect the local server and retry.",
        );
      let css = (await Promise.all(sheets.map((r) => r.text()))).join("\n");
      const html =
        '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src data: https:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'"><title>' +
        E(snapshot.name) +
        " · Rowanvale</title><style>body{margin:0;background:#102126}body>main{max-width:1180px;margin:30px auto;padding:20px}" +
        css.replaceAll("./assets/rowanvale-valley.webp", "") +
        "</style></head><body>" +
        sharedMarkup(snapshot) +
        "</body></html>";
      const blob = new Blob([html], { type: "text/html;charset=utf-8" }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download =
        "Rowanvale_Profile_" +
        String(snapshot.username || snapshot.name).replace(
          /[^a-z0-9_-]/gi,
          "_",
        ) +
        ".html";
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      const footer = document.querySelector("#rvp-shared-preview>footer");
      if (footer) {
        footer.querySelector(".rvp-export-fallback")?.remove();
        const help = document.createElement("details");
        help.className = "rvp-export-fallback";
        help.innerHTML =
          '<summary>Download blocked? Copy the prepared profile HTML</summary><p>Select the HTML below and save it as a .html file, or use Copy HTML. Only the selected shared fields are included.</p><button type="button" class="rvp-button">Copy HTML</button><label>Prepared profile HTML<textarea readonly rows="5" aria-label="Prepared shared profile HTML"></textarea></label><p role="status"></p>';
        help.querySelector("textarea").value = html;
        help.querySelector("button").onclick = async () => {
          try {
            await navigator.clipboard.writeText(html);
            help.querySelector("[role=status]").textContent =
              "Profile HTML copied.";
          } catch {
            const area = help.querySelector("textarea");
            area.focus();
            area.select();
            help.querySelector("[role=status]").textContent =
              "Clipboard access is unavailable. Press Ctrl+C to copy the selected HTML.";
          }
        };
        footer.append(help);
      }
      ctx.toast(
        "Profile export prepared. If your browser blocks downloads, use the copy option in this preview.",
      );
      return html;
    } catch (e) {
      ctx.toast(e.message, "error");
    }
  }
  function action(a, id) {
    if (a === "tab") {
      activeTab = id;
      ctx.render();
    }
    if (a === "edit") openEditor("identity");
    if (a === "customize") openEditor("appearance");
    if (a === "privacy") openEditor("privacy");
    if (a === "featured") openEditor("featured");
    if (a === "shared" || a === "export") sharedPreview();
    if (a === "library") ctx.go("media");
    if (a === "connect") RVConnect.open();
    if (a === "global-appearance") {
      ctx.go("customize");
      RV18.setCategory("appearance");
      ctx.render();
    }
    if (a === "story") RVLiving.openStory(id);
    if (a === "more") {
      limit += 24;
      ctx.render();
    }
    if (a === "format") {
      format = id;
      activeTab = "collection";
      ctx.render();
    }
  }
  function mount() {
    const root = document.querySelector("#viewRoot .rvp-profile");
    if (!root) return;
    root.onclick = (e) => {
      const b = e.target.closest("[data-rvp]");
      if (b) action(b.dataset.rvp, b.dataset.id);
    };
    root.addEventListener(
      "error",
      (e) => {
        if (e.target.matches?.("[data-rvp-image]")) {
          e.target.hidden = true;
          e.target.parentNode.classList.add("rvp-image-unavailable");
        }
      },
      true,
    );
    root.addEventListener(
      "load",
      (e) => {
        if (e.target.matches?.("[data-rvp-image]"))
          e.target.classList.add("is-loaded");
      },
      true,
    );
    let delay;
    root.querySelector("#rvp-library-query")?.addEventListener("input", (e) => {
      search = e.target.value;
      limit = 24;
      clearTimeout(delay);
      delay = setTimeout(() => {
        const el = root.querySelector("#rvp-media-results"),
          t = document.createElement("template");
        t.innerHTML = collection(ctx.data());
        el.innerHTML = t.content.querySelector("#rvp-media-results").innerHTML;
      }, 100);
    });
    for (const [id, set] of [
      ["format", (v) => (format = v)],
      ["sort", (v) => (order = v)],
    ])
      root
        .querySelector("#rvp-library-" + id)
        ?.addEventListener("change", (e) => {
          set(e.target.value);
          limit = 24;
          const el = root.querySelector("#rvp-media-results"),
            t = document.createElement("template");
          t.innerHTML = collection(ctx.data());
          el.innerHTML =
            t.content.querySelector("#rvp-media-results").innerHTML;
        });
  }
  document.addEventListener(
    "error",
    (e) => {
      if (!e.target.matches?.("[data-rvp-image]")) return;
      e.target.hidden = true;
      e.target.parentNode.classList.add("rvp-image-unavailable");
      const item = e.target.closest("[data-rvp=story]");
      if (item && !e.target.closest("#rvp-editor"))
        document.dispatchEvent(
          new CustomEvent("rowanvale:artwork-failed", {
            detail: { itemId: item.dataset.id, src: e.target.src },
          }),
        );
      if (e.target.parentNode.classList.contains("rvp-avatar"))
        e.target.parentNode.textContent = "✦";
    },
    true,
  );
  document.addEventListener(
    "load",
    (e) => {
      if (e.target.matches?.("[data-rvp-image]"))
        e.target.classList.add("is-loaded");
    },
    true,
  );
  addEventListener("beforeunload", (e) => {
    if (
      editor &&
      draft &&
      JSON.stringify(owned(draft)) !== JSON.stringify(base)
    ) {
      e.preventDefault();
      e.returnValue = "";
    }
  });
  return {
    bind(c) {
      ctx = c;
    },
    view,
    mount,
    openEditor,
    sharedPreview,
    exportProfile,
    sharedMarkup,
  };
})();
