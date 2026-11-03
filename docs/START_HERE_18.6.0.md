# Start here — Rowanvale 18.6.0 RC

## Upgrade without losing your collection

Export a portable artwork ZIP backup from the previous copy. Stop its server, extract this build separately and run START_ROWANVALE_WINDOWS.bat. Use the same browser profile and http://localhost:8080. Browser storage belongs to that origin; another port, 127.0.0.1, incognito or another browser has different storage. Do not delete the old folder or private artwork directory. Copy any private app/.env provider configuration yourself into the new app folder; secrets are intentionally absent from this distribution.

The existing schema and storage key mindforge.momentum.data are retained. The new profile uses the established profile/settings fields. The Reset timer's local recovery record contains only session type/timing/status, not reflection text. Previously earned XP and library records are not renamed by the catalog cleanup.

To roll back, stop 18.6 and launch the preserved old folder on the same origin, or restore the portable backup if necessary. Export a new backup before any rollback. Keep separate copies rather than running two versions at the same time.

## Find the new experiences

**People → Your Orbit:** the Personal Atlas puts identity and navigation in a passport rail; the right canvas showcases your actual collection. All media still searches/pages thousands of records. Edit profile and Customize open the existing safe preview/Apply/Cancel journey with the new layout. Six presets, uploads, featured choices, section visibility/order and independent lighting remain functional. Global Settings controls the overall app, separately.

**Balance → Reset Studio:** Start here offers time choices and a small tool menu. Breathing & rest opens guided sessions; Grounding includes a flexible sensory sequence and your existing body scan; Reflection includes the journal, soft-landing plan, thought reflection and post-game note; Care toolkit preserves the earlier practical exercises and game-care plan; Your history shows private records.

Guided sessions require an explicit Start. Pause, resume, restart and duration changes are real controls. Leaving the tab or closing the session pauses it; reload recovers it paused. Sound is off for every newly opened session and only activates when you choose the optional chime. A completed session is recorded only when you choose Save this moment. Grounding steps can be skipped. These are everyday rest/reflection tools, not treatment or assessment.

**Games & Media → Discovery trails:** three sourced cross-media starting points open a reviewable add form, or the saved story if you already have it. Nothing is added silently. Books Directory now includes The Blue Castle, The Book of Tea and The Enchanted April with verified source links in the naming report.

## Get artwork promptly

Open Connections → Account & connectivity. Automatic artwork is on for new profiles; earlier explicit opt-outs are retained. When enabled, the current library shelf and featured items have priority. Already saved cover URLs render immediately. Eligible missing art starts after the local metadata service answers, without waiting for slow provider probes/cloud setup. Results update images in place rather than replacing the page.

Open Library needs no key. Broad game coverage requires IGDB credentials; movies, TV and anime require TMDB credentials. See SETUP_AND_LIMITS_18.6.md. No program can retrieve an authenticated provider's posters without configuration, and unknown titles may need review. A fast start is not a guarantee that every network image arrives instantly.

Exact IDs and sufficiently supported matches can apply automatically. Ambiguous identities wait for confirmation. Custom artwork/manual descriptions stay protected. The worker is single-flight, respects provider spacing/Retry-After and keeps bulk work at twelve additional stories per hour. Keep the application open for continued work. Broken provider covers can be queued for repair.

## Privacy, sharing and cloud

The app is local by default. Shared profiles remain deliberately exported allowlisted HTML snapshots; wellness text, private reviews, tokens and the pinboard are excluded. Preview the shared result before exporting. If the browser blocks the download, the prepared HTML copy fallback remains available.

Optional private cloud sync includes the whole private workspace, including care notes. It is separate from public sharing and off until enabled. Existing 18.5 cloud setup remains compatible; no new SQL migration is required for 18.6 if that setup was already completed. New/older setups must apply the included private-sync SQL. Automatic remote restoration now waits while an editor is open. Conflicting copies still require a deliberate choice.

## File delivery

The fresh ZIP, extracted folder, SHA256SUMS_18.6.txt and Verification_18.6.json are beside this guide. If clicking the ZIP fails, run the extracted folder directly; it is already verified on disk. No old sandbox URL or unperformed cloud upload is relied on. A supported connected file destination can be used for a separate cloud delivery if needed.
