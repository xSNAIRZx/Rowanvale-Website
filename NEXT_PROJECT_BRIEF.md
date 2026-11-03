# ROWANVALE — REDESIGN + FULL HOSTED WEBSITE

## Read this first

Implement both projects against the enclosed real Beta 19.3.0 code. This is an implementation assignment, not a request for another generic plan or a mock website. The code is the working baseline. A private owner hosting gateway is implemented in hosting/server.cjs; production deployment and the visual redesign remain pending. README.md describes the current gateway and its limits. Preserve the current local desktop edition as a separately runnable build.

The user approved a full website including server-powered features. They also selected the original comprehensive redesign brief below. Retain its Checkpoint 1: inspect the source, present three genuinely different creative directions, and STOP for the user's choice before visual implementation. You may inventory hosting needs and prepare reversible tests before that choice. Do not infer a chosen design from this handoff.

## Source of truth

- Enclosed source: repository root (app/, backend/, hosting/, tests/, docs/, launcher and package manifests). npm run build generates build/Rowanvale_19.3.0/ and its BUILD_MANIFEST.json.
- GitHub: https://github.com/xSNAIRZx/Rowanvale-Website
- Historical upstream baseline reference: 7308493f8960f06f019c9e6bc02337b16b60acbd (not verified as part of this repository history). Use the checked-out repository commit as the current source reference.
- This remains a BETA / PRE-RELEASE. No stable-release claim.
- User's original brief is preserved below. Where its product assumptions conflict with actual code, verify and explain the conflict; use actual source as evidence.

## Required hosting extension to the original brief

1. Deliver the real interactive app at an HTTPS URL, with server-powered catalog searches, barcode lookup, artwork resolution/storage and ZIP artwork/workspace backup/restore. A landing page or static shell with failed API calls is not completion.
2. The current server is Node CommonJS with filesystem-backed artwork and ZIP helpers. Prefer retaining Node on a host supporting persistent private storage unless there is a concrete reason to port. A Worker-only host requires a genuine port of the filesystem, request handling, persistent storage and ZIP behavior. Do not claim these work merely because static HTML deployed.
3. Current `app/server.js` explicitly allows local hostnames and disables artwork routes when HOST is not 127.0.0.1. Setting HOST=0.0.0.0 alone DOES NOT make a complete production app. Replace local-only assumptions through an explicit hosted configuration, preserving local defaults. Use a configured origin/host allowlist, trusted proxy handling, HTTPS-aware origin/CSRF checks, bounded uploads, provider rate limits/timeouts and private cache boundaries. Never broadly remove protections to make deployment pass.
4. Browser collections, journals, fitness and profile data remain local by default. localStorage on localhost does not transfer to a hosted origin. Provide a clear migration flow using the existing JSON export/import and artwork/workspace pack tools. No automatic upload of private records, no clearing browser storage, no fabricated migration success. Explain that each device/browser has separate data unless optional existing cloud sync is configured.
5. A public application must never share one writable global artwork/workspace directory between unrelated visitors. Choose explicit isolation: authenticated owner-scoped hosted storage or browser-private durable storage plus server resolution, preserving export/import capabilities. Backups, uploads, cleanup and file reads must enforce that boundary. Test two distinct users/visitors for cross-user access. Hosted social accounts/live friendship were a later project; do not expand into a social network here.
6. Provider credentials stay server-side. Optional RAWG, TMDB, IGDB and recipe-service keys must be supplied by the owner through host secrets. No secrets in browser assets, Git, screenshots or exported backups. Public no-key provider fallbacks may be used where already supported. Missing provider credentials must produce honest availability status with local directories still usable. Do not invent credentials or bypass provider terms.
7. Keep the existing PWA offline after a successful visit. API failures must retain local search, saved content and editing. Cache only intended public app assets and explicitly selected private artwork; never cache login responses or private server data into a shared cache. Avoid service-worker update loops and destructive launch behavior on the hosted origin.
8. Keep existing optional Supabase integration compatible, with owner-configured project and callback URLs. Load the bundled SDK lazily when configured. Hosting the frontend does not itself create cross-device sync or accounts. Configure any Spotify/OAuth redirects explicitly if that integration is enabled.
9. Preserve server-only source and .env protection. Use an explicit public-asset allowlist or sanitized build directory rather than serving the whole repository as static content. Do not publish docs/evidence/test fixtures/runtime data as web assets. Source may be in the repository; secrets and runtime data may not.
10. Add documented reproducible deployment files for the selected host, secret-name template without values, persistent-storage configuration, health checks, backup/restore operations and a rollback route. A Dockerfile is appropriate for a Node container host; do not assume container-local storage survives redeployment without a persistent volume. If deployment access is unavailable, deliver the tested deployment-ready code and state the exact blocker without claiming a live site.
11. Hosting audience must be explicit. Publishing the repository does not publish a running website. Confirm the intended website audience before widening access to private server records; do not confuse GitHub visibility with app access.

## Mandatory integration inventory

Inspect all routes in app/server.js and supporting modules, including:
- /api/health, /api/launch, /api/connectivity
- /api/games, /api/books/search, /api/watch/search
- /api/metadata/status, /api/metadata/search, /api/metadata/details
- /api/resources/*, /api/recipes, /api/exercises, /api/barcode
- /api/artwork/resolve, /api/artwork/cache, /api/artwork/file/*
- /api/artwork/stats, /api/artwork/verify, /api/artwork/cleanup
- /api/workshop/export and /api/workshop/import

This list is a starting point, not proof of exhaustiveness. Trace frontend callers, request headers and expected response formats before changing them. Preserve status codes, recovery behavior and selected-artwork backup compatibility.

## Baseline features to protect

The latest revision added reviewed JSON/CSV library imports; provider-qualified media identity and historical reward preservation; season/episode diaries; book editions/copies/rereads; guest access checks for group nights; recoverable structured workout drafts; nutrition corrections; searchable private wellbeing history; durable Quiet Room sessions. Read docs/QA_BETA_193.md, docs/IMPORT_193.md, docs/TRAINING_193.md and docs/MEDIA_DEPTH_19.3.md. Keep paused/dropped statuses, unknown nutrition, legacy journal recovery, stable Repeat targeting, atomic save rollback, cross-tab protection and offline recovery.

## Verification baseline and new acceptance tests

The recorded prior build passed 163 Node tests, 7 catalog assertions and 23 browser suites. These are prior results, not proof that your changes pass. Install pinned development dependencies with npm ci and rerun relevant checks. Node >=18 is declared; use a currently supported LTS for hosted deployment and verify compatibility. Browser tests may require ROWANVALE_BROWSER pointing at an installed Chrome, or a matching Playwright browser.

Required commands: npm run check; npm run test:browser; npm run format:check; npm run catalog:audit; npm run build. Preserve meaningful existing tests and adapt assumptions explicitly for hosted mode. Never silence a failing test simply to claim success.

Add hosted-mode tests for host/proxy/origin checks, actual API response contracts, two-user artwork/backup isolation, quota/timeout failure recovery, old-save JSON round-trip, localhost-to-HTTPS migration, ZIP export/import, credential absence, provider failures, service-worker update and offline restart. Separate mocked contract tests from live-provider verification and report unverified integrations honestly.

Apply the original visual/accessibility/performance requirements below. Treat budgets as measured acceptance criteria, not promises. If a budget is unmet, report the measurement and propose a concrete remedy; do not fake compliance. Deliver complete source files in the workspace and a downloadable release, not only code fragments in chat.

---

# ORIGINAL REDESIGN BRIEF — PRESERVED VERBATIM

# ROLE

You are a four-person studio working as one mind:
1. ART DIRECTOR: owns taste, brand feel, and the "would someone screenshot this?" test.
2. PRODUCT DESIGNER: owns information architecture, flows, and removing things.
3. DESIGN-SYSTEMS ENGINEER: owns tokens, components, theming, and the CSS architecture.
4. FRONT-END LEAD: owns vanilla JS integration, performance, accessibility, and zero-regression delivery.

You have shipped consumer apps people describe as "calm," "personal," and "somehow expensive-feeling." You are opinionated, you cut ruthlessly, and you never decorate without a reason.

# THE MISSION

Give "Rowanvale" a HUGE, cohesive facelift: a complete visual and navigational redesign that makes a sprawling, patched-together app feel like one hand-crafted product made by one person with great taste. The result should be unmistakably a different app at first glance, yet every saved byte of user data and every working feature must survive.

# THE PRODUCT (ground truth, verify against the attached code)

- **Name / tagline:** Rowanvale, "Play. Grow. Unwind." Current version 19.3.0.
- **What it is:** a local-first, vanilla HTML/CSS/JS PWA (no framework, no required server, static-hosting friendly, manifest + offline). One home for: a game/media collection, books, movies/anime/TV, quests with XP and levels, fitness and food logging, a focus space ("Quiet Room"), a wellbeing space ("Reset Studio"), friends/clubhouse (local only), and a personal profile page ("Your Orbit") with customizable themes.
- **Emotional brief:** warm, cozy, unhurried, personal. A softer place to play, grow, and unwind. The feeling of a well-lit room you love, not a dashboard. NOT a loud gamer HUD, NOT a clinical wellness tracker, NOT a SaaS admin panel.
- **Audience:** someone who games, reads, watches, and is also trying to look after themselves, who wants all of it in one private place that feels like theirs.
- **Existing themes (must survive as first-class):** Forest Dusk (`rowan`), Afterglow (`afterglow`), Redline (`redline`), Dreamscape (`indigo`), Moss Glow (`moss`), plus appearance modes theme / light / dark / system, a Comfortable-reading mode, a Focus (declutter) mode, a Keep-things-still (reduce motion) option, and a Workspace density setting (roomy / balanced / compact).
- **Existing information architecture:** five areas, Today, Games & Media, Balance, People, Studio, with about 25 views (myday, dashboard, media, books, discover, watch, fan, backlog, quests, fitness, focus, wellness, resources, clubhouse, friends, connections, space, customize, safety, updates).

# KNOWN PROBLEMS (fix all of them)

1. **CSS archaeology:** about 45 stacked stylesheets of version patches (rowanvale16 to 1725, release1727, polish1730, navigation1740, header1741, yourworld18, watch181, fan182, media183, living184, profile185, connectivity185, experience186, covers1861, health19, wellbeing193, training193, import193...) with overrides fighting each other.
2. **Navigation overload:** five area buttons plus a flyout, grouped sidebar sections, pinned shortcuts, a sidebar filter, a utility rail, a wayfinder bar, Ctrl K, Pulse Deck, a Quick Portal dialog, and a mobile bar. That is about 10 ways to say "go somewhere."
3. **Topbar clutter:** about 10 controls (Workspace, Appearance, Comfortable, level pill, Pulse Deck, Undo, Focus, date, avatar, account menu), several duplicated in the account menu.
4. **Naming drift:** Today / My Day / Home base; Collection / Library / Backlog; Quiet Room / Focus; Your Orbit / Space / Personal Canvas.
5. **Icons are text glyphs** (☀ ⌂ ♧ ✦ ◈ ✳), several reused for different destinations.
6. **No consistent component language:** cards, buttons, inputs, and dialogs vary screen to screen. Weak hierarchy, uneven spacing, visual noise.
7. **Legacy leftovers:** storage key `mindforge.momentum.data`, key `vytron.device.profile`, function `vytronSignInFallback`, class prefixes `hb11`/`hb12`/`hb13`/`rv173`/`lw`. Do not break them. Wrap them.

# TASTE RULES (the part most designers skip)

**Every visual decision must serve "play, grow, unwind."** Before proposing anything, write one sentence defining the feeling, then judge every choice against it.

**Banned (the generic AI-app look):**
- Purple-to-blue gradient hero blobs, glowing neon borders everywhere, glassmorphism on every surface, and emoji used as icons.
- Default system-font-only typography with no point of view, and Inter-on-white with a blue button.
- Identical rounded cards in a uniform grid with a tiny icon and a title, repeated 12 times.
- Decorative motion with no meaning, and gradients used to hide weak layout.
- Gamification that nags: streak-shaming, urgency badges, red notification dots as pressure, guilt copy.

**Required:**
- ONE signature element that makes the app recognizable (a shape language, a texture, an illustration motif, a type treatment, a light effect). Name it and use it consistently.
- A real type pairing with personality, self-hosted, subset, and `font-display: swap`. Include a fallback stack metrically matched to avoid layout shift.
- Strong hierarchy: each screen has exactly one hero focus, a clear secondary tier, and quiet tertiary UI. If everything is emphasized, nothing is.
- Generous negative space. Calm is mostly what you remove.
- Cover-art-forward content: game, book, and film art should be the star, with UI chrome receding.
- Empty states, loading states, and error states that feel designed and warm, not afterthoughts.
- Copy voice: gentle, plain, a little warm, never cutesy, never guilt-inducing. Rewrite UI microcopy where it helps.

# HARD CONSTRAINTS (violating any is a failed delivery)

1. **ZERO DATA LOSS.** Existing localStorage keys and data shapes must keep working exactly. Never change what is saved or how it is read without a versioned, idempotent, tested migration. Provide a one-time pre-migration backup step that reuses the app's existing export.
2. **JS HOOKS PRESERVED.** Keep every element `id`, `data-view`, `data-action`, `data-close-dialog`, `data-hint`, `data-rv-area`, and `data-nav-section` that `app.js` and the other scripts depend on. If a hook must change, list it in a "Hook change log" and update every script that uses it. Before deleting any markup or class, search the JS for references. Prove it.
3. **VANILLA.** No React, Vue, or Tailwind runtime. A build step (esbuild or Vite) for bundling and minifying is allowed. Source stays readable, and output runs from any static host and works offline.
4. **LOCAL-FIRST AND PRIVATE.** No new network calls, trackers, or CDN dependencies. Fonts and icons are self-hosted. The Supabase vendor script loads lazily, only when the user sets up a connection.
5. **ACCESSIBILITY IS A FEATURE.** WCAG 2.2 AA minimum in every theme and mode, visible focus rings, full keyboard operation, `prefers-reduced-motion` plus the in-app "Keep things still" setting, 44px touch targets, skip link that targets `#viewRoot` after sign-in, `aria-current="page"` on active nav, and visible labels that match accessible names.
6. **PERFORMANCE BUDGET.** Under 150 KB CSS pre-gzip in one layered cascade (`@layer reset, tokens, base, layout, components, themes, utilities`). Critical CSS inlined. No layout shift. Interaction latency under 100 ms. No more than 3 render-blocking requests.
7. **CALM BY DESIGN.** See taste rules. This is a product value, not a style preference.

# WORKING METHOD

**First, adapt to your environment.** If you can read and run files, actually inspect the attached code, run searches, and test. If you cannot run code, say so once, then reason carefully from the files shown, and label anything unverified as an assumption. Never claim you tested something you didn't.

**If anything critical is missing** (for example `app.js`, the theme CSS, or how views render), list exactly what you need in one message, then proceed with clearly labeled assumptions for everything else. Do not ask more than one round of questions.

## PHASE 0: Inventory and risk map (no opinions yet)
- List every view, dialog, and component you found, and how each is rendered (static HTML vs JS-generated).
- List every localStorage key and the shape you can infer.
- List the JS-to-DOM contract: IDs, data attributes, and selectors that scripts rely on. Mark each "must keep."
- Map the CSS: which stylesheets own which areas, the 10 most-overridden selectors, and dead rules you can safely remove.
- Output: a compact risk table (what could break, how to prevent it).

## PHASE 1: Honest teardown
- What already works and should be protected, what is cluttered, what is inconsistent, and the single biggest visual opportunity.
- Keep this to one screen of reading.

## PHASE 2: Creative direction  (CHECKPOINT 1: wait for my pick)
Propose THREE genuinely different directions. Not three palettes of the same idea. For each:
- Name and a one-line feeling.
- Palette (roles, not just colors), type pairing (with real font names that are free and self-hostable), shape language, texture or light, motion personality, and the signature element.
- A text mock of the Today screen layout, plus how it flexes across two of the five themes.
- Risks and what it costs to build.
Then recommend one and say why it fits "play, grow, unwind" better than the others. I will reply with a pick or a blend. Do not build before that.

## PHASE 3: Design system
- Tokens: color roles (surface 0-3, border, text, muted, accent, accent-contrast, success, warning, danger, focus), type scale, spacing scale, radii, elevation, blur, motion durations and easings, z-index layers.
- Re-express all five themes plus light, dark, and system as pure token swaps (no per-component theme overrides). Provide contrast results for every text/background pair per theme.
- Components with states (default, hover, active, focus-visible, disabled, loading, error): buttons, icon buttons, inputs, selects, textareas, toggles, radios, checkboxes, chips, tabs, cards, list rows, dialogs, toasts, progress and XP bars, badges, avatars, nav items, tooltips, empty states, skeletons.
- One SVG icon sprite in a single stroke weight using `currentColor`, with a distinct icon for every destination. Provide the sprite and a mapping from every old glyph to its new icon.
- The layered CSS architecture and the build setup.

## PHASE 4: Shell and navigation
- ONE navigation model: sidebar on desktop (collapsible to icons), bottom bar on mobile, five areas, one name per destination, one icon per destination.
- Topbar reduced to: page title/breadcrumb, Search (Ctrl K), Undo, one "Display" menu (density, appearance, comfort, focus), and the account menu.
- One command palette that replaces Pulse Deck, Quick Portal, the sidebar filter, and the wayfinder bar. Include recent places, quick actions (log a workout, add a quest, add to collection), and keyboard hints.
- Real `<a href="#/view">` links so back/forward, deep links, and middle-click work, while keeping `data-view` behavior intact for the JS.
- Provide a "naming decisions" table: old names, then the one chosen name.

## PHASE 5: Key screens (layout idea first, then complete code)
Sign-in and onboarding (collapse to Create / Continue / Guest, with a calm 3-step create), Today, Collection, Discover (cover-art-forward), Games & Media hub, Quest Circuit (satisfying but gentle XP and level feedback), Fitness, Quiet Room, Reset Studio (include a visible, non-intrusive crisis-resource link such as 988 for US users, since the in-app guide says it is not an emergency service), Profile Studio and Your Orbit, Friends and Clubhouse, and the Data & Backup screen.
Every screen needs designed empty, loading, and error states, and mobile and desktop layouts.

## PHASE 6: Motion and delight
- A motion spec: durations, easings, and what each animation communicates (page transitions, hover and press, XP gain, quest completion, theme switch, dialog open and close).
- Everything degrades to instant or a simple fade under reduced motion. No motion is required to understand state.

## PHASE 7: Verification and delivery
- Run, or rigorously walk through, this checklist and report pass/fail with evidence: responsive at 360, 768, 1280, and 1920 px; contrast AA in all themes and modes; keyboard-only run through the top 5 tasks; screen reader names for nav and dialogs; no console errors; no missing hooks (a grep report of every preserved selector); data migration test (old save loads, round-trips, and re-exports identically); cold-load and CSS size numbers; offline load works.
- Deliver a **migration map**: old stylesheet, then where its rules moved or why they were deleted.
- Deliver a **rollback plan**: how to revert to the current build in under 5 minutes.
- Deliver a **do-this-next list**: what I should test by hand first, ranked.

# DELIVERY FORMAT

- Work phase by phase. End each phase with: files changed, what to test, risks, and the next phase.
- Output COMPLETE, copy-paste-ready files with the file name and its path. No "..." or "rest unchanged" inside a file I'm supposed to paste. If a file is too large for one message, split it into numbered parts that concatenate cleanly, and tell me the order.
- Keep prose tight. Lead with decisions and results, not process narration. Use tables for mappings and checklists.
- Be opinionated. If something I'm asking for makes the product worse, say so plainly and offer the better option. If two things conflict, tell me which you chose and why.
- Never invent data, library versions, or test results.

# DEFINITION OF DONE

A first-time visitor says "this feels like a real, beautiful product." A returning user opens it and everything they saved is there, every feature works, and the app feels calmer and faster. A developer opens the repo and finds ONE token file, ONE component layer, ONE icon sprite, ONE nav model, and ONE name for every place.

# START NOW

Begin with Phase 0, then Phase 1, then Phase 2, and stop at Checkpoint 1 for my choice. Open your first message with a one-sentence statement of the feeling you are designing for.