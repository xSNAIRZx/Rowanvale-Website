# Design system and customization architecture

## Canonical model

The existing workspace object owns settings, profile and savedLooks. There is no second durable settings database. yourworld18.js contains a typed field registry (category, path, input type, bounds, allowed values, label, default and progressive-disclosure flag). The registry drives rendering, search, validation and theme-file allowlisting. Core app.js supplies the existing renderers and transactional save function through a small adapter.

Drafts clone only settings/profile/savedLooks. The commit adapter replaces those records while retaining games, quests, workouts, friends and other collections. Existing localStorage rollback remains authoritative. A captured serialized storage revision detects cross-tab changes. Undo holds one prior personalization snapshot in memory and refuses to overwrite a subsequently changed snapshot. Reload ends the undo session.

## Tokens and styles

Themes define bg, surface, text, muted, accent and font. They feed --bg, --panel, --text, --muted, --accent, --accent-rgb and the existing --hb12-* / --rv173-* compatibility tokens. --hb12-bg matters for older low-stimulation selectors. --rv18-ink chooses dark or light button text against the accent. --rv18-heading and --rv18-shadow control heading font and depth. New token ownership is cleared before core applySettings, preventing stale overrides when returning to classic themes.

The stylesheet is a compatibility layer for the existing app, not a full removal of historical CSS. New controls live under .rv18-studio; theme overrides are gated by .rv18-theme. Profile colors remain scoped to the existing --orbit-* tokens. Page styles under settings.rv162 intentionally override only one page.

Ten original presets pair backgrounds, surfaces, text, accent and type. Typography uses local system, Trebuchet, Georgia or Consolas with fallbacks. No font is fetched from a theme import. Custom palettes require text and secondary text contrast of at least 4.5:1 against both canvas and surface. This check does not certify every historical component's contrast.

## Preview and responsive rules

Previews reuse spacePage/hb12MyDay with temporary cloned data restored in a finally block. An iframe allows same-origin DOM access for styling, but has no script permission. Preview content is inert. Actual 1000px/390px layouts are scaled to fit; preview reloads are debounced 160ms. Desktop uses category/form/preview columns; medium screens move preview below the form; narrow screens stack controls and use a two-column category selector. The save bar is sticky on desktop and in normal flow on mobile.

## Media and effects

Images: PNG/JPEG/WebP/GIF, at most 900 KB input and 16 megapixels, decoded into a canvas and resized to at most 1600px. GIF becomes a still. Gallery output must be below 430 KB; other output below 1 MB to agree with legacy loader limits. Six gallery images maximum; captions 80 characters, link labels 42 characters and 12 links maximum. SVG is rejected.

Audio: MP3/WAV/OGG, 1 MB input maximum, signature check and browser metadata decode with a bounded timeout. Audio is local, manual-play, and has an error message if playback later fails. Native controls supply pause and volume. No external embed script runs.

Effects use 16 deterministic decorative elements and CSS animation. Low stimulation, OS reduced motion and app reduced motion suppress them. No cursor follower, automatic audio, unrestricted CSS, scripts or remote font execution is introduced.

Theme files are {format:"rowanvale-theme",version:1,appearance:{"settings.path":value}}. Files are limited to 100 KB. Unknown paths, invalid enums/colors/URLs/types and malformed JSON are refused. Export includes only allowed appearance and comfort values, never personal media or identity.
