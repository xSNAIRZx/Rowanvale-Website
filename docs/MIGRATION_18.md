# Upgrade safely to Rowanvale 18

1. In the copy you actually use, export a JSON workspace backup. Also export the ZIP artwork backup if transferring cached artwork to another computer.
2. Keep the old folder. Extract the complete new Clean App ZIP into a different folder.
3. Stop the previous local server. Run START_ROWANVALE_WINDOWS.bat in the new folder. Node.js 18+ is required; validation used Node 26 and Chrome on Windows.
4. Use the same browser profile and exactly the same origin, normally http://localhost:8080. Verify 18.0.0 in the header. A folder change does not change browser storage, but a hostname, port or browser-profile change does.
5. If coming from file:/// or a different origin, import the JSON backup in Data & Backups. Restore the artwork ZIP where needed. Never clear browser data as an update step.
6. If the old version remains visible, ensure the old server has stopped and reload once the new service worker activates. Your backups remain the recovery path.

The canonical workspace key remains mindforge.momentum.data and schemaVersion remains 5. Settings, profile and savedLooks stay in their existing records. New preferences are additive under settings.rv18; the first successful personalization save stamps version 1. Old appearance is retained until an explicit choice/save.

On that first save, a valid legacy customWallpaper that also served as the app background is copied to the new app-background field. The existing profile wallpaper is retained. Subsequent profile changes no longer change the app background. This is an additive, save-time migration; opening Settings alone does not rewrite the workspace.

Saved looks keep their legacy settings and may additionally contain a validated version-1 theme18 configuration. The loader preserves both forms. Backups include the same records. Theme-only exports intentionally exclude identity, gallery and local audio.

A failed save preserves the last committed workspace. The draft remains available to retry or discard. If another tab changed storage, saving is refused; Discard loads that newer data. Avoid editing the same workspace in multiple tabs during an upgrade.

Downgrading: close 18, run your preserved older folder and restore your pre-upgrade backup if needed. Older versions do not understand every 18-only preference. Do not use an older version to overwrite your only current backup.
