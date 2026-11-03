# Data Health and measured performance — Beta 19

Backups & Data now opens with a read-only health panel. It reads the existing saved workspace, asks the browser for its origin storage estimate when supported, and asks the active service worker to verify every file in that worker's bundled app shell. A network connection alone never produces an offline-ready result. A worker for an earlier app version, an unanswered query, or a missing cached asset produces an explicit unverified/attention state.

Storage figures distinguish workspace JSON bytes from the browser's estimate for all origin storage. The latter includes caches and is not the localStorage quota or remaining disk space. Eviction protection is reported, not requested automatically. A readable file is not a promise that the next write will succeed.

The existing artwork-backup timestamp is presented as a download request, not proof that the file reached disk or was successfully restored. JSON download dates were not historically tracked and are not invented. The panel directs users to the existing backup controls; a protected corrupt workspace instead directs them to download its original bytes. No personal records are transmitted by these checks, and refreshing does not modify workspace bytes.

## Validation

`tests/health19_browser.cjs` exercises nine actual Chrome workflows: no worker while online; read-only checks and honest backup status; existing recovery control focus; unavailable estimates and blocked storage; 320-pixel layout; corrupt-file preservation and recovery; complete active-worker shell verification; a deliberately missing cached stylesheet; and offline reload with the network/local server unreachable. Evidence is in `evidence/19.0.0/health19-results.json` and `health19-desktop-offline.png`.

## Performance observations

`tests/performance19.cjs` measured three fresh browser contexts on this Windows PC with 2,000 synthetic media records, a local server, external requests blocked and service workers disabled. It verifies the search returns the expected single result. Navigation and search timings include two animation frames. The machine was not CPU/network throttled.

| Operation | Observed range | Median |
| --- | --- | --- |
| Cold app shell until local-entry control | 239–321 ms | 262 ms |
| Reload with 2,000 saved records | 470–577 ms | 471 ms |
| Open media library | 84–103 ms | 86 ms |
| Search 2,000 saved records | 16–19 ms | 17 ms |

These baseline observations do not justify a speculative rendering rewrite. They are not performance guarantees for other devices, large cover images, third-party providers or much larger datasets. Exact results and environment are retained in `evidence/19.0.0/performance-baseline.json`; rerun the script after significant library changes. No heap-leak soak or battery profiling was performed.

## Limits

An app-shell check proves cached file availability at that instant, not future immunity to browser eviction. Remote artwork, fresh provider searches, cloud sync and account services remain separate from the local app shell. Cached artwork has its existing bounded policy; the health panel does not claim every cover is available offline. Browser and platform coverage for this addition is automated Chrome on Windows, including a narrow viewport, not physical mobile devices, Safari or Firefox.
