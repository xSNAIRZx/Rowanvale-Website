# Movement and food improvements

Movement keeps its quick manual activity log and written routines. A new optional structured workout panel adds named exercises, per-set reps, external weight or seconds, completion checkboxes, previous recorded values, kg/lb display, and a silent optional rest timer. Completed workouts can become reusable structured routines. Exercise history compares completed set counts and recorded external-load volume; it does not infer readiness, prescribe loads, or claim that more volume is better.

## Saving and compatibility

Draft changes save to the ordinary workspace as users type. A reload or offline restart resumes the saved draft. A failed write keeps the prior stored bytes, retains the edited form for retry, and shows an error. Another tab's replacement is not overwritten by a stale draft; the user can reopen the saved replacement. An unsaved draft triggers the browser's leave-page warning.

The added `training193` workspace object holds versioned preferences, structured routines and the draft. Completed entries remain in `fitnessLogs`, with their structured sets under `training193`, so existing activity history, deletion/undo and JSON backups keep working. Existing written `workoutPlans` and movement logs are retained. Weight is stored canonically in kilograms; changing the display unit does not rewrite recorded weight. Finish uses the draft ID to prevent duplicate completed records. New structured workout completion uses the existing witnessed movement XP ledger when eligible.

## Repairs

- **Wrong Repeat:** sorted history previously injected buttons using unsorted array positions. Buttons now use the actual displayed record ID and remain present after filtering/search/pagination.
- **Silent capacity loss:** adding beyond 500 movement logs, 2,000 food/water entries, 80 routines or 100 recipes no longer drops the last stored record. Browser quota failures follow the existing rollback/error path instead.
- **Unknown food values:** blank/missing nutrition now remains unknown rather than becoming a confirmed zero. Summaries distinguish known subtotals when entries lack values. Barcode results preserve missing values.
- **Food corrections:** diary entries can be edited directly while retaining their ID; the form converts saved totals back to per-serving amounts before recalculating. Confirmed zero remains valid; blank means unknown.

## Evidence

`tests/training193.test.cjs`: eight passing core tests cover draft serialization, legacy note preservation, idempotent completion, invalid completion, canonical units, previous values, routine isolation, import validation, bounded exercise/set size, and repeated exercise blocks counting as one session.

`tests/training193_browser.cjs`: ten passing Chrome workflows cover autosave/reload, units/rest, failed-write retry, finish/routines/history, 320px layout, cross-tab conflicts, Repeat identity, every former capacity limit, partial barcode nutrition and direct editing, and workout completion after an offline restart with the server unreachable. The suite uses synthetic data and mocked provider responses; it does not send private diary data to providers. Evidence and genuine screenshots are under `docs/evidence/19.3.0/`.

The existing nine-workflow `legacy_daily_browser.cjs` also passed after these changes.

## Limits

This is a manual local workout notebook, not a coach or medical service. It does not add exercise demonstration media, automatic exercise prescriptions, supersets, wearable integrations, nutrition recommendations, or camera barcode scanning. Legacy food values previously saved as zero cannot be retroactively distinguished from unknown. Structured completed sets can be reviewed; set-level editing of completed workouts is not included, although the existing session title/date/minutes/notes editor remains available. History initially shows eight workouts, with a Show more control. The rest timer uses a saved deadline and catches up when the page returns; it does not promise a background alarm. Failed unsaved edits cannot be guaranteed after forcibly closing the browser or device loss. Testing covered automated Chrome on Windows and a narrow viewport, not physical mobile devices or Safari/Firefox.
