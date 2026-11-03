# Start here — Rowanvale 18.5.0 RC

## Preserve your existing worlds

Export a portable artwork ZIP backup from the previous Rowanvale before upgrading. Stop the old server. Extract this release into a separate folder and run START_ROWANVALE_WINDOWS.bat. Use http://localhost:8080 and your existing browser profile: browser storage belongs to the origin, not the program folder. A different port, 127.0.0.1 instead of localhost, another browser or incognito uses separate storage.

Your local profile is separate from a verified cloud identity. Continue locally without creating an account. The existing library, Books Directory, Watch Room, Fan Lounge, quests, wellness, fitness, XP ledger and JSON/portable backups remain available.

## Your profile

Open People → My profile (Your Orbit). The default scenic banner is bundled; no upload is needed. Overview groups your real shelves, reading/playing/watching progress and optional personal content. All media provides search, type filters, sorting and 24-item pages. Activity contains media events; Connections links to supported account tools and your local roster.

Choose Edit profile or Customize. Profile Studio has Identity, Appearance, Featured media, Sections and Sharing & privacy categories. Preview desktop or mobile and light/dark/system without saving. Apply changes commits the profile; Cancel discards the draft. Reset profile style resets only profile styling. Appearance choices include Rowanvale, Minimal, Cinematic, Vibrant, Cozy and Midnight, accent/background, font, density, corner radius, cards, poster/list presentation and motion. Choose up to twelve featured titles; show/hide and reorder sections.

Avatar, banner, gallery and existing anthem controls use your existing local profile fields. Uploaded images are decoded and resized before saving. Storage errors keep the editor open and your previous saved profile intact. Close other editing tabs before applying to avoid conflicting drafts.

Global app appearance is separate: open Appearance settings and choose Color mode → Light, Dark or System. Profile customization does not change the app theme.

## Online artwork

New profiles enable automatic missing-artwork/details lookup. Existing 18.3/18.4 online opt-outs are retained. Change the preference in Connections → Account & connectivity. It sends individual media titles/types and relevant identifiers to configured providers, not notes or wellness records.

Books can use Open Library immediately. Games need IGDB credentials for broad coverage; movies/TV/anime need TMDB credentials. Background work is limited to twelve stories per hour, one worker, provider spacing and bounded retries. Keep the app open for background work. Strong ID matches or exact identities with supporting author/year/platform evidence can save automatically. Title-only or conflicting matches wait in Artwork matches to review. Confirm edition page counts yourself.

Reconnect checks actual services and resumes safe pending work. Automatic jobs preserve custom images and manual descriptions. Use Find artwork in story details for a correction. Check all saved artwork detects broken provider images; custom uploads remain yours. Missing results are cached rather than retried endlessly. Completed metadata is not periodically replaced just because it is old: use reviewed manual refresh for an intentional update.

## Sharing and cloud are separate

Your profile stays private on this device. Enable shared-profile snapshots and choose visible fields before using Shared preview. Preview shows the exact allowlisted content. Export produces static HTML, with no workspace scripts, account access, private reviews, wellness data, keys, tokens or pinboard. If the browser blocks the file, expand the prepared HTML copy option, copy it, and save as a .html file in a text editor. External covers still require internet; device-only cached image paths are removed.

Private cloud sync is optional and off by default. It stores the whole private workspace, including sensitive notes, in your own configured Supabase account. Install the included migration first; see SETUP_AND_LIMITS_18.5.md. A first account binding and conflicting edits require an explicit choice. Do not resolve a conflict before exporting a backup if you may need both versions.

## Delivery fallback

The ZIP and extracted folder contain the same verified build. If an attachment link fails, open the extracted folder beside this guide and run the launcher. SHA256SUMS_18.5.txt and Verification_18.5.json accompany the release. They verify file delivery independently of an expired sandbox URL. No cloud storage upload was performed.
