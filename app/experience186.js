/* Route names are canonical; visible artwork is patched without replacing the page. */
const RVExperience = (() => {
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
  const labels = {
    myday: "My Day",
    dashboard: "Overview",
    media: "Games & Media",
    discover: "Discover Games",
    backlog: "Game Collection",
    books: "Books Directory",
    watch: "Watch Room",
    fan: "Fan Lounge",
    quests: "Quests",
    fitness: "Movement",
    focus: "Quiet Room",
    wellness: "Reset Studio",
    resources: "Offline Guides",
    clubhouse: "Clubhouse",
    friends: "Friends",
    connections: "Connections",
    space: "Your Orbit",
    customize: "Settings",
    safety: "Backups & Data",
    updates: "Help & Updates",
  };
  let ctx,
    view = "",
    observer = null,
    priorityTimer = null,
    rootObserver = null;
  const extraBooks = [
    {
      title: "The Blue Castle",
      author: "L. M. Montgomery",
      year: 1926,
      genres: "Rediscovered classics",
      sourceUrl: "https://www.gutenberg.org/ebooks/67979",
    },
    {
      title: "The Book of Tea",
      author: "Kakuzo Okakura",
      year: 1906,
      genres: "Art & reflection",
      sourceUrl: "https://www.gutenberg.org/ebooks/769",
    },
    {
      title: "The Enchanted April",
      author: "Elizabeth von Arnim",
      year: 1922,
      genres: "Rediscovered classics",
      sourceUrl: "https://www.gutenberg.org/ebooks/16389",
    },
  ];
  for (const book of extraBooks)
    if (
      !window.RV_BOOK_STARTERS.some(
        (x) =>
          C.norm(x.title) === C.norm(book.title) &&
          C.norm(x.author) === C.norm(book.author),
      )
    )
      window.RV_BOOK_STARTERS.push(book);
  const trailItems = [
    {
      type: "Game",
      title: "Celeste",
      year: 2018,
      author: "Maddy Makes Games",
      sourceUrl: "https://store.steampowered.com/app/504230/Celeste/",
    },
    {
      type: "Game",
      title: "Hollow Knight",
      year: 2017,
      author: "Team Cherry",
      sourceUrl: "https://store.steampowered.com/app/367520/Hollow_Knight/",
    },
    ...extraBooks.map((x) => ({ ...x, type: "Book" })),
    {
      type: "Movie",
      title: "WALL-E",
      year: 2008,
      sourceUrl: "https://www.pixar.com/wall-e",
    },
  ];
  function discover(d) {
    return `<section class="rv186-discovery"><span class="eyebrow">DISCOVERY TRAILS</span><h2>Follow a different kind of curiosity.</h2><p>Small, deliberate starting points. These are editorial selections, not predictions about your wellbeing.</p><div class="rv186-trails">${[
      [
        "A world worth wandering",
        [1, 5],
        "Atmospheric worlds, on a screen or on a shelf.",
      ],
      ["A new beginning", [0, 2], "A mountain to climb, a life to rediscover."],
      ["A quieter page", [3, 4], "Art, observation and a change of scene."],
    ]
      .map(
        ([title, ids, copy]) =>
          `<article class="rv186-trail"><h3>${title}</h3><p>${copy}</p><ul>${ids
            .map((i) => {
              const x = trailItems[i],
                saved = d.backlog.find(
                  (v) =>
                    v.type === x.type && C.norm(v.title) === C.norm(x.title),
                );
              return `<li><b>${E(x.title)}</b><small>${E(x.type)} · ${x.year}${x.author ? " · " + E(x.author) : ""}</small><div><button type="button" class="button button-quiet" data-exp-trail="${i}">${saved ? "Open saved story" : "Review & add"}</button> <a href="${E(x.sourceUrl)}" rel="noopener noreferrer" target="_blank">Source ↗</a></div></li>`;
            })
            .join("")}</ul></article>`,
      )
      .join(
        "",
      )}</div><p class="small-note">Titles and source links only; no provider artwork is bundled. Review metadata before adding. The complete games, books, film, TV and anime directories remain available below.</p></section>`;
  }
  function nodes() {
    return [
      ...document.querySelectorAll(
        "#viewRoot [data-item],#viewRoot [data-rvp=story][data-id]",
      ),
    ].filter((el) => el.dataset.item || el.dataset.id);
  }
  function updatePriority() {
    if (!ctx || !document.body.classList.contains("signed-in")) return;
    const visible = [],
      nearby = [];
    for (const el of nodes()) {
      const id = el.dataset.item || el.dataset.id,
        r = el.getBoundingClientRect();
      if (
        r.bottom > 0 &&
        r.top < innerHeight &&
        r.right > 0 &&
        r.left < innerWidth
      )
        visible.push(id);
      else if (r.bottom > -innerHeight && r.top < innerHeight * 2)
        nearby.push(id);
    }
    RVConnect.prioritize({
      visible: [...new Set(visible)],
      nearby: [...new Set(nearby)],
      featured: P.featured(ctx.data()).map((x) => x.id),
    });
  }
  function schedulePriority() {
    clearTimeout(priorityTimer);
    priorityTimer = setTimeout(updatePriority, 120);
  }
  function patchArtwork(d, id) {
    for (const el of nodes()) {
      const itemId = el.dataset.item || el.dataset.id;
      if (id && id !== itemId) continue;
      const item = d.backlog.find((x) => x.id === itemId);
      if (!item) continue;
      const src = P.artwork(item),
        holder = el.querySelector(".rvp-art,.living-cover");
      if (!holder) continue;
      let img = holder.querySelector("img");
      if (!src) {
        if (img) img.hidden = true;
        continue;
      }
      if (!img) {
        img = document.createElement("img");
        img.loading = "lazy";
        img.decoding = "async";
        img.referrerPolicy = "no-referrer";
        img.alt = "Cover of " + item.title;
        img.dataset[
          holder.classList.contains("rvp-art") ? "rvpImage" : "livingArt"
        ] = "";
        img.addEventListener("error", () => {
          img.hidden = true;
          document.dispatchEvent(
            new CustomEvent("rowanvale:artwork-failed", {
              detail: { itemId: item.id, src },
            }),
          );
        });
        holder.append(img);
      }
      if (img.getAttribute("src") !== src) {
        img.hidden = false;
        img.classList.add("rv186-saved-art");
        img.src = src;
        holder.classList.remove("living-art-failed", "rvp-image-unavailable");
      }
    }
    const status = document.querySelector("[data-exp-art-status]");
    if (status) {
      const s = RVConnect.snapshot();
      status.textContent =
        s.artwork.message +
        (s.artwork.pending ? " " + s.artwork.pending + " pending." : "");
    }
  }
  function mount(id, d) {
    view = id;
    document.body.dataset.rv186View = id;
    document.title = (labels[id] || "Rowanvale") + " · Rowanvale 1.1.0";
    for (const b of document.querySelectorAll(
      "#appSidebar .nav-item[data-view]",
    )) {
      const label = labels[b.dataset.view],
        text = b.querySelector(".nav-label");
      if (label && text) {
        text.textContent = label;
        b.title = label;
      }
    }
    const title = document.getElementById("pageTitle");
    if (title) title.textContent = labels[id] || "Rowanvale";
    const main = document.getElementById("viewRoot");
    if (!main) return;
    if (id === "media") {
      const anchor = main.querySelector(".living-tabs");
      if (anchor) {
        const active = d.backlog
          .filter((x) =>
            ["In Progress", "Currently Playing"].includes(x.status),
          )
          .slice(0, 3);
        if (active.length && !main.querySelector(".rv186-resume-strip"))
          anchor.insertAdjacentHTML(
            "afterend",
            `<div class="rv186-resume-strip" aria-label="Continue your stories">${active.map((x) => `<button type="button" data-exp-story="${E(x.id)}">${P.artwork(x) ? `<img src="${E(P.artwork(x))}" alt="" loading="eager" decoding="async">` : '<span aria-hidden="true">↗</span>'}<span><b>${E(x.title)}</b><small>${E(x.type)} · Continue your story</small></span></button>`).join("")}</div>`,
          );
        if (!main.querySelector("[data-exp-art-status]"))
          anchor.insertAdjacentHTML(
            "afterend",
            '<div class="rv186-art-status"><span data-exp-art-status role="status"></span><button class="button button-quiet" type="button" data-rvc-open>Artwork connection details ↗</button></div>',
          );
      }
    }
    observer?.disconnect();
    observer = new IntersectionObserver(schedulePriority, {
      rootMargin: "100% 0px",
    });
    nodes().forEach((el) => observer.observe(el));
    rootObserver?.disconnect();
    rootObserver = new MutationObserver((records) => {
      if (
        records.some(
          (r) =>
            r.type === "childList" &&
            [...r.addedNodes].some(
              (x) =>
                x.nodeType === 1 &&
                (x.matches?.("[data-item],[data-rvp=story]") ||
                  x.querySelector?.("[data-item],[data-rvp=story]")),
            ),
        )
      ) {
        observer.disconnect();
        nodes().forEach((el) => observer.observe(el));
        schedulePriority();
      }
    });
    rootObserver.observe(main, { childList: true, subtree: true });
    updatePriority();
    patchArtwork(d);
  }
  document.addEventListener(
    "error",
    (e) => {
      if (!e.target.matches?.("[data-living-art]")) return;
      const card = e.target.closest("[data-item]");
      if (card)
        document.dispatchEvent(
          new CustomEvent("rowanvale:artwork-failed", {
            detail: { itemId: card.dataset.item, src: e.target.src },
          }),
        );
    },
    true,
  );
  document.addEventListener("click", (e) => {
    const story = e.target.closest("[data-exp-story]");
    if (story) RVLiving.openStory(story.dataset.expStory);
    const trail = e.target.closest("[data-exp-trail]");
    if (trail) {
      const x = trailItems[Number(trail.dataset.expTrail)];
      if (!x) return;
      const saved = ctx
        .data()
        .backlog.find(
          (v) => v.type === x.type && C.norm(v.title) === C.norm(x.title),
        );
      if (saved) RVLiving.openStory(saved.id);
      else RVLiving.draftStory(x);
    }
  });
  document.addEventListener("rowanvale:connection-state", () => {
    if (ctx) patchArtwork(ctx.data());
  });
  addEventListener("scroll", schedulePriority, { passive: true });
  addEventListener("resize", schedulePriority, { passive: true });
  return {
    labels,
    bind(c) {
      ctx = c;
    },
    mount,
    patchArtwork,
    discover,
    extraBooks,
  };
})();
