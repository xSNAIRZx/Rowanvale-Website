# Rowanvale redesign — Phases 0–2

**The feeling we are designing for:** *a well-lit room you return to — warm, quiet, and unmistakably yours.*

Everything below is measured from the checked-out source (Beta 19.3.0), not from memory. Nothing has been redesigned yet; this is the Checkpoint 1 brief and it ends with three directions and one recommendation for your pick.

---

## Phase 0 — Inventory and risk map

### Size of the thing we are reskinning

| Fact | Measured |
| --- | --- |
| Stylesheets loaded by `index.html` | **37** (38 `.css` files on disk) |
| CSS payload | **723 KB** raw, **141 KB** gzip (budget in the brief: 150 KB pre-gzip, in one cascade) |
| Script tags / JS files | **52** / 60 |
| JS payload | **2.77 MB** raw |
| Largest single files | `catalog-extra.js` 1.17 MB, `offline-directory182.js` 419 KB, `app.js` 418 KB, `styles.css` 355 KB |
| Views (`data-view`) | **20**: myday, dashboard, media, books, discover, watch, fan, backlog, quests, fitness, focus, wellness, resources, clubhouse, friends, connections, space, customize, safety, updates |
| Areas (`data-rv-area`) | **5**: today, games, balance, people, studio |
| Dialogs in the shell | **14** `<dialog>` elements |
| Element ids in `index.html` | **178** |
| Distinct simple CSS selectors | **1,467**, of which **67** are redefined in more than three sheets |

### Where the CSS fights itself

| Selector | Sheets that redefine it |
| --- | --- |
| `.button` | 17 |
| `.eyebrow` | 11 |
| `.topbar` | 10 |
| `.nav-item`, `.hb12-wayfinder` | 8 each |
| `.nav-label`, `.main-area`, `.game-card`, `.panel`, `.hb12-widget` | 7 each |
| `.button-primary`, `.shell-progress`, `.command-launch`, `.small-note` | 6 each |

These are not refinements; they are successive patches winning by load order. That is why the app has no single component language today.

### Media and data contract (must survive untouched)

| Storage key | Meaning |
| --- | --- |
| `mindforge.momentum.data` | The whole workspace: collections, journals, quests, fitness, wellbeing, settings, themes |
| `vytron.device.profile` | Local display-name profile |
| `hearthbyte.beta.checks.v12` | Beta checklist state |
| `vytron.communityGames` | Legacy community list |
| `PROFILE_KEY`, `ACCOUNT_CONFIG_KEY`, `QUIET_DURABLE_KEY`, `HB12_SNAPSHOT_KEY` | Module-level constants resolving into the keys above |

Rule for every phase: **the shape of `mindforge.momentum.data` does not change.** Any change is a versioned, idempotent migration with a pre-migration export.

### Hook contract (must keep)

178 ids, 11 distinct `data-action` values, 20 `data-view` values, 5 `data-rv-area` values, `data-nav-section`, `data-close-dialog`, `data-hint`, `data-onboard-step`, `data-onboard-theme`. `app.js` and the versioned layers bind to these by id and attribute. A redesign is CSS plus shell markup plus new tokens — **not** a rewrite of the view renderers. Every id we touch gets grep-verified against `app.js`.

### There are about eleven ways to navigate

1. Five area buttons + their flyout 2. Grouped sidebar sections (5 groups, 20 destinations) 3. Pinned shortcuts + pin editor 4. Sidebar filter input 5. Utility rail (Search / Quick / Backups / Help) 6. Wayfinder bar 7. Ctrl K command palette 8. Pulse Deck 9. Quick Portal dialog 10. Mobile bottom bar + "More" hub 11. "Need a hand?" guide launcher.

Three of those say "quick actions" (Pulse, rail Quick, account menu). Four say "go somewhere" (sidebar, wayfinder, command, hub). That is the single largest source of visual noise.

### Risk table

| Risk | Why it bites | Prevention |
| --- | --- | --- |
| Touching a hook while restyling the shell | A renamed id silently kills a feature; no error | Grep every removed/changed id and attribute against all 60 JS files before deleting |
| Stacking a 38th stylesheet | The current 141 KB gzip cascade is already the problem | One new layered cascade; old sheets removed in a declared order with a migration map |
| Ghost rules from removed markup | Dead selectors keep the file over budget and mislead later edits | Delete by file, verify with the selector diff, keep the map in docs |
| Theme drift | Five themes × two modes = 10 surfaces; patch-style overrides explode that | Themes as pure token swaps only; no per-component theme rules |
| Migration panic | Users with real collections and journals in browser storage | `mindforge.momentum.data` untouched; export/import proven by an old-save round-trip test |
| Service worker caching the old world | A stale SW serves dead CSS forever | Bump the SW cache name in lockstep with each asset change |
| Data loss on sign-in / route | `#view` links need the existing `data-view` behaviour preserved | Real `<a href="#/view">` plus interception that still calls the existing view switch |

---

## Phase 1 — Honest teardown

**What already works and should be protected**

The product is genuinely broad: 20 real views, offline PWA, artwork pipeline, JSON/CSV import, backups, five themes with appearance modes, comfort/focus/calm toggles. The catalogue data (1.17 MB of local titles) is an actual asset. The tone in the copy is often already right ("a small timestamp to orient you — no streaks or daily pressure"). The auth gate's two-column scene is the most designed screen in the app.

**What is cluttered**

Navigation (eleven entry points), the topbar (workspace menu, level pill, Pulse Deck, Undo, divider, date, avatar, account menu — with the account menu repeating four of them), and a wayfinder bar that exists only to explain the sidebar.

**What is inconsistent**

The glyph-icon set (⌂ ♧ ☾ ✦ ◈ ✳ ♜ ⌁ ◷), reused across different meanings — ♧ means both Games & Media and People; ✦ means collection, quests, profile, and the account menu. Cards, buttons, inputs and dialogs each have several competing looks decided by which patch loaded last.

**Naming drift**

Today / My Day / Home base are **three destinations and three names** for what feels like one idea (`myday` and `dashboard` both exist). Collection / Library / Backlog are three names for one. Quiet Room / Focus, Your Orbit / Space / Personal Canvas — same.

**The single biggest visual opportunity**

Cover art. The app already resolves game, book and film artwork, then buries it inside dense cards with heavy chrome. Making artwork the loudest thing on the screen — and letting every other surface recede into one calm material — is the difference between "dashboard" and "a room with your things in it".

---

## Phase 2 — Three directions

Same product, same hooks, same data. Three different rooms.

### Direction A — Lamplight Library

*Feeling: the hour after dinner, one lamp on, everything else soft.*

- **Palette roles** (five themes recolor only the lamp and the ground): ground `#171310`, surface-1 `#201B17`, surface-2 `#2A231D`, hairline `#3A3129` at 1px, ink `#F2E9DC`, muted `#B9A996`, lamp `#E9B96E` (Forest Dusk), success `#8FA97A`, focus ring `#FFD79A`.
- **Type** — Fraunces (display, optical size axis on) + Work Sans (UI). Self-hosted, subset, `swap`, metric-matched fallbacks.
- **Shape** — small, slightly irregular radii (14/10/6); no pills except status; 1px warm hairlines instead of shadows; one soft drop shadow reserved for the hero.
- **Light** — the signature: **a single warm lamp pool.** Each screen has one radial light behind its hero, painted with a layered `radial-gradient` at low opacity. Content sits *in* the light; the edges of the screen fall off to ground. No glass, no neon.
- **Motion** — 140 ms ease-out for hover, 220 ms for dialogs, a 400 ms lamp-fade on theme switch. Nothing loops.
- **Signature element** — **the lamp pool + hairline shelf.** Cards read as objects resting on a shelf: hairline top edge catching light, art hanging above the label.

```text
┌──────────────┬───────────────────────────────────────────────────────────┐
│ Rowanvale    │  Today                                    ⌕  Display  ◐  │
│ PLAY·GROW·   ├───────────────────────────────────────────────────────────┤
│              │                                                           │
│ ▸ Today      │        ╭─ lamp pool ─────────────────────────────╮        │
│ ▸ Play       │        │  Good evening.                          │        │
│ ▸ Balance    │        │  Three things are waiting, and none      │        │
│ ▸ People     │        │  of them are in a hurry.                │        │
│ ▸ Studio     │        │                                         │        │
│              │        │  ┌────────┐  QUEST · 2 of 5              │        │
│ ── shortcuts │        │  │  art   │  Water the plants           │        │
│ ▸ Quiet Room │        │  └────────┘  ▓▓▓▓▓▓░░░░  gentle pace   │        │
│ ▸ Collection │        ╰─────────────────────────────────────────╯        │
│              │                                                           │
│ ───────────  │  ON YOUR SHELF                                            │
│ Your place   │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                       │
│ LVL 7  ▓▓▓░  │  │art │ │art │ │art │ │art │ │art │  ← art leads, label  │
└──────────────┴──┴────┘ └────┘ └────┘ └────┘ └────┘     is a caption ────┘
```

**Same layout, two themes:** *Forest Dusk* — ground #171310, lamp #E9B96E, hairline warm brown. *Dreamscape* — ground #14121C, lamp #B4A2F2, hairline indigo-grey. Identical geometry, identical type; only the light changes. *Redline* keeps the same structure with an ember lamp (#E2705A) and a hotter hairline, which is how a theme can feel "louder" without new layout rules.

- **Risk / cost** — the lamp pool must be built from gradients that stay cheap on low-end GPUs and respect `prefers-reduced-transparency`; contrast on hairline-adjacent muted text across five lamps needs a computed audit. Medium cost, low risk.
- **Why it fits** — literally "a well-lit room you love"; cover art hangs like prints; the calm comes from removing chrome, not from adding decoration.

### Direction B — Paper Atlas

*Feeling: a clothbound field guide you inherited, annotated in your own hand.*

- **Palette roles** — paper `#F4EFE4`, ink `#1E1A15`, rule `#D8CFBE`, accent `#7A5C3E` (umber), secondary `#4B6B5A`. Light-first by default, dark mode is "night atlas" (deep navy paper `#161A20`, cream ink).
- **Type** — Literata (text) + Archivo (labels, small caps, numbered margins). All labels are letterspaced caps at 11–12 px with a hairline underline.
- **Shape** — square corners everywhere, 1px rules as the main separator, section numbers in the left margin (`01`, `02`…), zero shadows except one "lifted plate" for the active hero.
- **Texture** — a paper grain from CSS noise (`feTurbulence` as an inline data-URI, or a tiny tiling PNG at 6% opacity), plus a printed margin rule.
- **Motion** — 180 ms, linear-ish, no bounce; content "sets" rather than slides.
- **Signature element** — **the numbered atlas plate**: every screen is a plate with a ruled margin, a plate number, and a one-line caption under the hero.

```text
┌────────────┬──────────────────────────────────────────────────────────────┐
│  ROWANVALE │                                                                │
│ ─────────  │                                              03 / TODAY       │
│  01 TODAY  │  ──────────────────────────────────────────────────────────── │
│  02 PLAY   │  TODAY                                                        │
│  03 BALANCE│  Wednesday · one lamp, no hurry                               │
│  04 PEOPLE │  ──────────────────────────────────────────────────────────── │
│  05 STUDIO │                                                                │
│            │   ┌──────────────┐   IN THE MARGIN                            │
│  ─────────  │   │              │   02 · Water the plants                │
│  ⌕ SEARCH  │   │     art      │   ─────────────────────                │
│  ◐ DISPLAY │   │              │   04 · Finish the chapter              │
│            │   └──────────────┘   ─────────────────────                │
│            │   Plate 1 · Continue   07 · Stretch for five minutes       │
│            │   ───────────────────────────────────────────────────────────  │
│            │   YOUR SHELF                                          SEE ALL  │
│            │   ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐                  │
│            │   └────┘ └────┘ └────┘ └────┘ └────┘ └────┘                  │
└────────────┴──────────────────────────────────────────────────────────────┘
```

**Two themes:** light paper (default) and "night atlas" dark. This direction is the least faithful to five *existing* colour themes because it wants a paper ground; Mapping Redline onto paper fights the messenger, so Redline becomes a red-ink variant rather than an ember glow.

- **Risk / cost** — highest data-culture risk: five existing themes must all become paper variants, which is a bigger token job than Direction A. Editorial layouts also lose some density that the Library and Quest screens currently rely on. High cost, medium risk.

### Direction C — Night Garden

*Feeling: the greenhouse at 9pm, breathing, growing, nothing asking for a number.*

- **Palette roles** — soil `#10150F`, leaf `#1B2A1E`, moss `#2E4433`, sprout `#9CC48B`, bloom `#E8B4C8`, moon `#DDE6D5`, ink `#EDF2E7`, focus `#B8E0A8`.
- **Type** — Instrument Serif (display, generous sizes) + Manrope (UI). Very high contrast between a big serif headline and quiet geometric UI.
- **Shape** — asymmetric organic radii (28 / 10 / 4), soft dotted texture, no lines as separators — space separates instead.
- **Motion** — a slow ambient "breathing" scale/hue on the hero glow (8 s), 120 ms interactions, everything instant under reduced motion. Level-ups grow a stem rather than popping a badge.
- **Signature element** — **the growing stem**: a thin stroke in the left rail with a leaf at each milestone, which also becomes the progress indicator on quest and level surfaces.

```text
┌───────────────┬──────────────────────────────────────────────────────────┐
│ Rowanvale     │   Today                                    ⌕   ◐   ◔     │
│               ├──────────────────────────────────────────────────────────┤
│  ◉ Today      │      ( (  soft glow, slowly breathing  ) )               │
│  ◉ Play       │                                                          │
│  ◉ Balance    │         Good evening.                                    │
│  ◉ People     │         Nothing here is in a hurry.                      │
│  ◉ Studio     │                                                          │
│               │       ╭─────────────╮   Water the plants                │
│    │          │       │             │   2 of 5 · at your pace          │
│    │          │       │     art     │                                  │
│    ├─ leaf    │       ╰─────────────╯   A small thing. It counts.       │
│    │          │                                                          │
│    ├─ leaf    │   In your world                                           │
│    │          │   ╭─────╮ ╭─────╮ ╭─────╮ ╭─────╮                        │
│    ●          │   ╰─────╯ ╰─────╯ ╰─────╯ ╰─────╯                        │
└───────────────┴──────────────────────────────────────────────────────────┘
```

**Two themes:** Moss Glow (green ground, sprout bloom) and Afterglow (plum ground, bloom pink). This direction makes the five existing themes feel *most* distinct, because each is a different plant in the same greenhouse.

- **Risk / cost** — the ambient motion and organic shapes are the hardest to keep accessible and the fastest to date; "calm" can tip into decorative. Medium–high cost, medium–high risk.

---

## Recommendation: A — Lamplight Library

It wins on the brief's own test. "A well-lit room you love, not a dashboard" is literally a light metaphor, and a single lamp pool is one idea that can govern every screen without inventing decoration. It is also the cheapest to make *cohesive*: matte surfaces plus hairlines plus one light source replaces dozens of competing panel, card and gradient recipes, so the 37-sheet cascade can actually collapse. It keeps cover art as the hero (direction B's ruled margins compete with art; C's organic shapes soften the art's edges). And it themes cleanly — five themes become five lamps, not five layouts, which is the only way "pure token swaps" survives ten theme/mode combinations.

Directions B and C are not worse, they're different products: B is for someone who wants to *read* their app, C is for someone who wants to *feel* it. A blend is easy — B's ruled margin and plate numbers graft onto A's layout, and C's stem works as A's progress indicator.

## Naming decisions (proposed, applies to whichever direction)

| Today | Chosen name |
| --- | --- |
| My Day / Home base (`myday`, `dashboard`) | **Today** — one name; `dashboard` becomes the Today screen's lower half, view id unchanged |
| Collection / Library / Backlog | **Collection** (`backlog` id unchanged) |
| Quiet Room / Focus | **Quiet Room** |
| Your Orbit / Space / Personal Canvas | **Your Orbit** |
| Games & Media Hub | **Play** (area) with **Collection**, **Discover**, **Shelf** inside |
| Pulse Deck / Quick Portal / rail Quick / account quick actions | **⌘K palette**, one surface, with quick actions inside it |
| Wayfinder bar | removed (the palette and breadcrumb replace it) |

## Nav model (one)

Sidebar on desktop (collapsible to icons) → mobile top tabs, five areas, one icon per destination from a single SVG sprite. Topbar: title/breadcrumb · ⌕ · Display · account. Ctrl K palette absorbs Pulse Deck, Quick Portal, the sidebar filter and the wayfinder. Real `<a href="#/view">` links that still dispatch the existing `data-view` path.

## After your pick

Order of work, each with a runnable checkpoint: **3** tokens + component layer (new cascade, old sheets retired by written map) → **4** shell/nav/palette → **5** screens in priority order (Today, Collection, Discover, Quest Circuit, Quiet Room, Reset Studio, Data & Backup) → **6** motion + empty/loading/error states → **7** verification (360/768/1280/1920, AA contrast per theme, keyboard pass, hook grep report, old-save round-trip, cold-load and CSS byte count, offline).

---

## Built in this pass (Lamplight 19.4, direction A + C)

| File | Change |
| --- | --- |
| `app/lamplight.css` | **New.** The Lamplight cascade: tokens (lamp, ground, hairline, leaf), ten theme/mode token blocks, the type pairing, shell, component layer, lamp pool, stem progress, and the retirement of four duplicate navigation entry points. 30 KB raw / 5.6 KB gzip. |
| `app/assets/fonts/fraunces-latin.woff2`, `worksans-latin.woff2` | **New, self-hosted.** Latin subsets (67 KB + 50 KB), `font-display:swap`, with metric-matched fallback faces. No CDN. |
| `app/index.html` | One added `<link>` for `lamplight.css`, loaded last. No markup removed, no id or hook changed. |
| `app/server.js` | `.woff2` added to the static MIME map (fonts would otherwise 404). |
| `app/sw.js` | Cache name bumped and both font files added to the app shell so offline installs get the new type and the redesign is not served from a stale cache. |

Hidden, not deleted: the wayfinder bar, the utility rail, the Pulse Deck trigger, the sidebar filter and the section flyout. Every id and handler survives, so they can be restored by removing five selectors. The remaining entry points are the sidebar, Ctrl K, the topbar, the mobile bar and the account menu.

Still to do before this is the finished redesign: the genuinely layered cascade (retiring the old sheets one by one with the migration map), the SVG icon sprite replacing the glyph set, the Today/Collection/Discover screen layouts, and designed empty/loading/error states.
