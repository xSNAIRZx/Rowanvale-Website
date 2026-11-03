> Historical 18.3 documentation. For the current release, see START_HERE_18.4.0.md, QA_REPORT_18.4.0.md and KNOWN_ISSUES_18.4.md.

# Remaining issues and release-candidate scope

No claim is made that every legacy button or external integration has been exhaustively certified.

- Medium: historical CSS still exists. New theme tokens cover shared chrome, panels and the new studio, but all combinations of legacy page styles/profile templates and custom themes have not been visually certified. Custom palette contrast validation is not a full WCAG audit. No screen-reader audit was performed.
- Medium: the existing portable HTML profile export remains a simplified static snapshot. It is not a faithful export of every 18-only effect, audio control or section-layout setting. Workspace JSON backups preserve those records. Review a profile export before sharing it.
- Medium: independently saved Advanced panels (page styles, account setup, habits, providers) are retained legacy components. The studio labels this distinction. Do not treat their immediate-save operations as part of a staged global draft.
- Medium: application data remains bounded by browser storage quota. Images and audio are deliberately small; this is not a large media-hosting platform. Save failures retain prior records and show an error.
- Low: Simple and Advanced mode choice and the one-step undo history are session UI state. Reload retains saved personalization, not the unsaved draft or undo history.
- Low: the scaled desktop preview has small text; switch to mobile preview or visit the full page to inspect reading size. On phones separate Edit settings / Show preview tabs and a sticky save bar avoid scrolling through both panels.
- Deferred capabilities: video backgrounds, unrestricted custom CSS/JavaScript, external font uploads, cursor effects and public profile hosting. GIF uploads become still images. Existing Fitness routines and module/page styling are retained; a new drag-to-arrange Fitness dashboard was not implemented.

Validation limits: automated Chrome on Windows, synthetic accounts/data, no authenticated Spotify/Steam/cloud services, no Safari/Firefox/macOS/Linux/device-lab runs. Provider transformations and offline failures were tested, not third-party service availability. An interrupted browser process mid-write was not forcibly killed; storage exceptions and real restart were tested. Long-duration animation/battery profiling and a memory-leak soak were not performed.

18.2: the offline directory is partial, metadata is not an availability/age-rating guarantee, and comparisons are session-only. Guest labels are not authenticated accounts. Portable plans are independent copies without merging/live syncing. Schedules use host local time; guests in other timezones must interpret it themselves. Limits and later hosted features are documented in FAN_LOUNGE.md.
