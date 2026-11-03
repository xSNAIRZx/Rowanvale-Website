/* Profile data is shared with the original profile editor; exports use an explicit allowlist. */
(function (root, factory) {
  if (typeof module === "object" && module.exports)
    module.exports = factory(require("./living-core"));
  else root.RVProfileCore = factory(root.RVLivingCore);
})(globalThis, (C) => {
  "use strict";
  const SECTIONS = [
    "about",
    "featured",
    "continue",
    "collections",
    "activity",
    "links",
    "crew",
    "gallery",
    "anthem",
    "wall",
    "badges",
  ];
  const PRESETS = {
    rowan: {
      name: "Rowanvale",
      accent: "#dcaa72",
      background: "#102b2d",
      style: "landscape",
      font: "serif",
      density: "comfortable",
      radius: 22,
    },
    minimal: {
      name: "Minimal",
      accent: "#79a999",
      background: "#17302c",
      style: "minimal",
      font: "system",
      density: "compact",
      radius: 12,
    },
    cinematic: {
      name: "Cinematic",
      accent: "#e7bb83",
      background: "#171e2a",
      style: "cinematic",
      font: "serif",
      density: "spacious",
      radius: 16,
    },
    vibrant: {
      name: "Vibrant",
      accent: "#c1a4fc",
      background: "#25243c",
      style: "gradient",
      font: "rounded",
      density: "comfortable",
      radius: 26,
    },
    cozy: {
      name: "Cozy",
      accent: "#d2a779",
      background: "#332a24",
      style: "paper",
      font: "serif",
      density: "spacious",
      radius: 28,
    },
    midnight: {
      name: "Midnight",
      accent: "#96c4db",
      background: "#101c2c",
      style: "night",
      font: "system",
      density: "comfortable",
      radius: 18,
    },
  };
  const color = (v, f) => (/^#[a-f0-9]{6}$/i.test(v || "") ? v : f);
  function luminance(c) {
    const a = [1, 3, 5]
      .map((i) => parseInt(c.slice(i, i + 2), 16) / 255)
      .map((x) => (x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  }
  function contrast(a, b) {
    const x = luminance(a),
      y = luminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }
  function readable(accent, bg) {
    if (contrast(accent, bg) >= 4.5) return accent;
    const target = luminance(bg) > 0.4 ? "#203a35" : "#f3ddbc";
    return target;
  }
  function config(d) {
    const s = d.settings || {},
      p = s.profile185 || {},
      preset = Object.hasOwn(PRESETS, p.preset)
        ? p.preset
        : { neon: "vibrant", scrapbook: "cozy", portfolio: "minimal" }[
            s.spaceLayout
          ] || "rowan",
      base = PRESETS[preset];
    const hidden = new Set(
      C.arr(s.hiddenSpaceSections)
        .map((x) => (x === "games" ? "featured" : x))
        .concat(C.arr(p.hidden)),
    );
    const rawOrder = C.arr(p.order).length
      ? p.order
      : C.arr(s.spaceOrder).map((x) => (x === "games" ? "featured" : x));
    return {
      preset,
      lighting: ["inherit", "light", "dark", "system"].includes(p.lighting)
        ? p.lighting
        : "inherit",
      accent: color(s.spaceAccent, base.accent),
      background: color(p.background, base.background),
      style: [
        "landscape",
        "minimal",
        "cinematic",
        "gradient",
        "paper",
        "night",
      ].includes(p.style)
        ? p.style
        : base.style,
      font: ["serif", "system", "rounded", "mono"].includes(s.spaceFont)
        ? s.spaceFont
        : base.font,
      density: ["compact", "comfortable", "spacious"].includes(p.density)
        ? p.density
        : base.density,
      radius: Math.max(8, Math.min(32, Number(s.spaceCorner) || base.radius)),
      cardStyle: ["clean", "outlined", "glass"].includes(p.cardStyle)
        ? p.cardStyle
        : "clean",
      mediaStyle: ["posters", "compact", "list"].includes(p.mediaStyle)
        ? p.mediaStyle
        : "posters",
      motion: s.spaceMotion !== "off" && !s.reducedMotion && p.motion === true,
      hidden: [...hidden].filter((x) => SECTIONS.includes(x)),
      order: [...new Set([...rawOrder, ...SECTIONS])].filter((x) =>
        SECTIONS.includes(x),
      ),
      featured: C.arr(p.featured)
        .filter((x) => typeof x === "string")
        .slice(0, 12),
      privacy: Object.fromEntries(
        Object.entries({
          enabled: false,
          about: true,
          collection: false,
          activity: false,
          connections: false,
          crew: false,
          gallery: false,
          anthem: false,
          badges: false,
          stats: false,
        }).map(([k, v]) => [
          k,
          typeof p.privacy?.[k] === "boolean" ? p.privacy[k] : v,
        ]),
      ),
    };
  }
  function applyPreset(d, id) {
    if (!Object.hasOwn(PRESETS, id))
      throw Error("Choose an available profile preset.");
    const p = PRESETS[id];
    d.settings = d.settings || {};
    d.settings.profile185 = {
      ...d.settings.profile185,
      preset: id,
      style: p.style,
      background: p.background,
      density: p.density,
    };
    Object.assign(d.settings, {
      spaceAccent: p.accent,
      spaceFont: p.font,
      spaceCorner: p.radius,
    });
    return d;
  }
  const rows = (d) =>
    C.arr(d.backlog).filter((x) => C.TYPES.includes(x.type || "Game"));
  function artwork(x) {
    if (typeof RVCovers !== "undefined") return RVCovers.source(x);
    const m = x?.metadata184 || {};
    if (m.artworkBrokenAt && !C.arr(m.manualFields).includes("artwork"))
      return "";
    if (C.arr(m.manualFields).includes("artwork"))
      return C.safeImage(m.artwork);
    return C.safeImage(
      m.artwork ||
        x?.watch?.cover ||
        x?.background_image ||
        (x?.book?.coverId
          ? "https://covers.openlibrary.org/b/id/" +
            C.num(x.book.coverId, 999999999) +
            "-M.jpg?default=false"
          : ""),
    );
  }
  function featured(d) {
    const r = rows(d),
      p = config(d);
    if (p.featured.length)
      return p.featured.map((id) => r.find((x) => x.id === id)).filter(Boolean);
    const named = String(d.profile?.favoriteGames || "")
      .split(",")
      .map(C.norm)
      .filter(Boolean);
    const f = r.filter(
      (x) =>
        x.favorite || C.meta(x).favorite || named.includes(C.norm(x.title)),
    );
    return (
      f.length
        ? f
        : r
            .filter((x) => !C.finished(x) && x.status !== "Dropped")
            .concat(r.filter(C.finished))
    ).slice(0, 8);
  }
  function activities(d) {
    const list = [];
    for (const x of rows(d)) {
      if (x.createdAt)
        list.push({
          id: "saved:" + x.id,
          itemId: x.id,
          title: x.title,
          type: x.type,
          date: x.createdAt,
          label: "Added to your shelves",
        });
      for (const h of C.arr(x.book?.sessions).slice(-5))
        list.push({
          id: "read:" + h.id,
          itemId: x.id,
          title: x.title,
          type: x.type,
          date: h.date,
          label: "Read to page " + C.num(h.page),
        });
      for (const h of C.arr(x.watch?.history).slice(0, 5))
        list.push({
          id: "watch:" + h.id,
          itemId: x.id,
          title: x.title,
          type: x.type,
          date: h.date,
          label: C.text(h.label, 140),
        });
    }
    for (const h of C.arr(d.playLog).slice(0, 20))
      list.push({
        id: "play:" + h.id,
        title: h.title,
        type: "Game",
        date: h.date,
        label: "Played a session",
      });
    return list
      .filter((x) => Number.isFinite(Date.parse(x.date)))
      .sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .slice(0, 40);
  }
  function stats(d) {
    const r = rows(d);
    return {
      total: r.length,
      active: r.filter((x) =>
        ["Currently Playing", "In Progress"].includes(x.status),
      ).length,
      finished: r.filter(C.finished).length,
      formats: new Set(r.map((x) => x.type || "Game")).size,
    };
  }
  function publicMedia(x) {
    const m = C.meta(x);
    return {
      id: C.text(x.id, 160),
      type: C.TYPES.includes(x.type) ? x.type : "Game",
      title: C.text(x.title, 150),
      status: C.text(x.status, 40),
      artwork: artwork(x).startsWith("/api/")
        ? C.safeImage(m.originalArtwork) || ""
        : artwork(x),
      year: C.num(m.year, 2200),
      author: C.text(m.author || m.creators, 300),
      sourceUrl: C.safeLink(m.artworkSourceUrl || m.sourceUrl),
      attribution: C.text(m.attribution || m.provider, 500),
    };
  }
  function publicSnapshot(d) {
    const cfg = config(d),
      p = d.profile || {},
      s = d.settings || {},
      privacy = cfg.privacy;
    if (!privacy.enabled)
      throw Error(
        "Your profile is private. Enable a shared snapshot in Privacy before exporting.",
      );
    const out = {
      format: "rowanvale-public-profile",
      version: 1,
      name: C.text(p.name, 60) || "Rowanvale Explorer",
      username: C.text(p.username, 40),
      tagline: C.text(p.tagline, 140),
      avatar: C.safeImage(s.spaceCustomAvatar),
      avatarSymbol: C.text(p.avatarEmoji, 12) || "✦",
      banner: C.safeImage(s.spaceCustomBanner),
      appearance: {
        ...cfg,
        featured: [],
        privacy: undefined,
        hidden: undefined,
        order: cfg.order.filter((x) => x !== "wall"),
      },
      featured: featured(d).map(publicMedia),
    };
    if (privacy.about)
      out.about = {
        bio: C.text(p.bio, 700),
        interests: C.text(p.interests, 180),
        pronouns: C.text(p.pronouns, 40),
        quote: C.text(p.quote, 160),
      };
    if (privacy.collection)
      out.collection = rows(d).slice(0, 2000).map(publicMedia);
    if (privacy.activity)
      out.activity = activities(d)
        .slice(0, 12)
        .map(({ title, type, date, label }) => ({ title, type, date, label }));
    if (privacy.connections)
      out.links = C.arr(s.spaceLinks)
        .filter((x) => C.safeLink(x.url))
        .slice(0, 12)
        .map((x) => ({ label: C.text(x.label, 42), url: C.safeLink(x.url) }))
        .concat(
          C.safeLink(p.profileLink)
            ? [{ label: "Website", url: C.safeLink(p.profileLink) }]
            : [],
        );
    if (privacy.crew)
      out.crew = C.arr(s.spaceTopFriends)
        .map((id) => C.arr(d.friends).find((x) => x.id === id))
        .filter(Boolean)
        .slice(0, 8)
        .map((x) => ({ name: C.text(x.name, 60) }));
    if (privacy.gallery)
      out.gallery = C.arr(s.spaceGallery)
        .filter((x) => C.safeImage(x.image))
        .slice(0, 6)
        .map((x) => ({
          image: C.safeImage(x.image),
          caption: C.text(x.caption, 80),
        }));
    if (privacy.anthem)
      out.anthem = {
        title: C.text(p.anthemTitle, 120),
        artist: C.text(p.anthemArtist, 120),
        url: C.safeLink(p.anthemUrl),
      };
    if (privacy.badges)
      out.badges = C.arr(d.achievements)
        .slice(-12)
        .map((x) => ({
          name: C.text(x.name, 100),
          description: C.text(x.desc, 200),
        }));
    if (privacy.stats) out.stats = stats(d);
    return out;
  }
  function validateDraft(d) {
    const p = d.profile || {},
      s = d.settings || {},
      cfg = config(d);
    if (!C.text(p.name, 60)) throw Error("Enter a display name.");
    if (p.username && !/^[a-zA-Z0-9_]{2,40}$/.test(p.username))
      throw Error(
        "Use 2–40 letters, numbers or underscores for your username.",
      );
    for (const k of [
      "spaceCustomAvatar",
      "spaceCustomBanner",
      "customWallpaper",
    ])
      if (s[k] && !C.safeImage(s[k]))
        throw Error("Choose a valid PNG, JPEG or WebP profile image.");
    for (const x of C.arr(s.spaceLinks))
      if (x.url && !C.safeLink(x.url))
        throw Error("Profile links must use HTTPS.");
    if (C.arr(s.profile185?.featured).length > 12)
      throw Error("Choose up to twelve featured stories.");
    return true;
  }
  return {
    C,
    SECTIONS,
    PRESETS,
    color,
    luminance,
    contrast,
    readable,
    config,
    applyPreset,
    rows,
    artwork,
    featured,
    activities,
    stats,
    publicMedia,
    publicSnapshot,
    validateDraft,
  };
});
