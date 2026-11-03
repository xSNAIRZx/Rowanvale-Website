# Start here: Rowanvale 18.6.1

Stop the previous Rowanvale server, then run START_ROWANVALE_WINDOWS.bat from this release. Keep the existing browser profile and http://localhost:8080 to retain your workspace. The launcher opens /api/launch to bypass the previous service-worker shell without deleting local data. Confirm 18.6.1 in the app footer. Export a backup before any upgrade.

Open Discover Games, Books Directory, Fan Lounge, Watch Room, Game Collection, Games & Media or Your Orbit. Matched covers start automatically while online, including cards you have not saved. Cached URLs display immediately. New images require provider lookup and download; visible cards receive priority, and scrolling/category changes continue the work. There is no promise of an instant cold download of thousands of titles.

Under Connections, the first preference, **Automatically load matched covers on every media page**, controls the new behavior. It defaults on. An explicit opt-out remains off across reloads. **Also backfill saved-item descriptions and metadata while online** is a separate, older feature. It can remain off while page covers load. No cloud account or private API key is required for the included public cover sources.

Custom uploaded/chosen artwork and deliberate cover removal stay protected. Source links identify matched public artwork. Automatic cover retrieval does not add catalog entries to your collection, award XP or transmit private notes.

If a card is empty, read its status. Loading/finding means work is in progress; offline resumes after reconnection. Unavailable means no reliable suitable image was returned; review means the work could not be chosen safely. Add the correct year/edition, use Find artwork for a deliberate selection, or retry unavailable covers from Connections. Optional TMDB/IGDB configuration can extend coverage; it is not required to make the built-in sources start.

If you still see the old build, stop its terminal/server and run this release's launcher. Open http://localhost:8080/api/launch in the same browser. Changing ports, localhost to 127.0.0.1, or browser profiles creates a different storage origin. Do not clear storage to fix artwork. Existing loaded remote URLs still require internet unless you explicitly cached eligible artwork through the existing private offline feature.

The book example in live QA uses authentic first-edition title-page art. Neither that example nor a generic work image certifies your particular edition's jacket. Some uncommon, ambiguous or unillustrated works remain without a confident cover. The app shows a usable status instead of inventing official art.

For rollback, stop this server and reopen your preserved prior release. Keep an exported backup and avoid running two builds against the same browser workspace at once.
