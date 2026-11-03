# Migration and rollback — 18.4

## Preserve your data

1. In the old app, export a workspace JSON backup and a portable artwork ZIP backup if you use offline covers. Keep both outside the app folder.
2. Stop the old server and keep its extracted folder. Extract 18.4 to a separate folder.
3. Keep **http://localhost:8080**, the same browser and the same browser profile. Opening a file URL, using 127.0.0.1 instead of localhost, changing port or changing browsers creates a different browser-storage origin.
4. Copy optional provider configuration to app/.env in the new folder. Do not overwrite the supplied example or public JavaScript with credentials.
5. Launch 18.4 and confirm the version. Review your XP, theme, profile, library and progress. Import your backup if you intentionally changed origin or browser.

## What migrates

The legacy storage key `mindforge.momentum.data` stays in use. Schema 6 adds Living World preferences, sessions, reward settings, stable reward identities and a permanent XP event registry. Existing collections, achievements, themes, profile settings, inline artwork, notes and original XP balances are retained. Historical XP events are marked historical so migration does not retract an old balance. The opening balance accounts for XP without surviving older event records.

18.3 previously truncated its ledger at 2,000 events. Already discarded historical events cannot be reconstructed from an app ZIP. 18.4 preserves all surviving event keys and stops that truncation. New reversible milestones are linked to their qualifying activity; removing or correcting it reconciles the associated award. Achievements already earned remain in history.

The migration does not silently fetch artwork or send mood records. Online title lookup, mood use and reminders have separate opt-in preferences. Existing standalone game/Book/Watch tools retain their prior behavior; new shared tools use the new preferences.

Invalid existing record collections or unsupported Living World schemas are protected from overwriting. Failed storage writes restore the last committed workspace and leave the current form open. Concurrent edits to an open shared-library record are rejected instead of silently replacing the newer record.

## Offline artwork and backups

The existing private cache stays under `.rowanvale/artwork` in your Windows user folder unless ROWANVALE_DATA_DIR is explicitly configured. New shared-library cover references participate in portable ZIP export and cache cleanup protection. JSON stores references to disk artwork; it does not embed those files. Inline custom uploads travel in JSON.

## Roll back

Stop 18.4, start the preserved 18.3 folder, and restore your **pre-upgrade** backup when needed. Do not rely on the old application's importer to preserve new 18.4-only data. Keep a separate 18.4 backup before rolling back.

## Source history

To recover a full development checkout from the included bundle, run `git clone Rowanvale_18.4.0_Development.bundle Rowanvale-development`, then select `development/18.4-living-world`. The preserved 18.3 baseline is the earlier commit.
