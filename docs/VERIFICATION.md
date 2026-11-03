# Rowanvale 18.2 QA report

Tested in Chrome on Windows with synthetic data. `npm test` passed; final lounge/navigation changes were then checked with their targeted suites.

| Suite | Passed | Total |
|---|---:|---:|
|release1727/chrome-results.json|97|97|
|release1728/button-conversion.json|10|10|
|calm1729/results.json|20|20|
|navigation1740/results.json|41|41|
|header1741/results.json|32|32|
|yourworld18/results.json|84|84|
|yourworld18-extra/results.json|29|29|
|release1727/upgrade-results.json|6|6|
|Watch Room regression|46|46|
|Fan Lounge workflows|62|62|

**427 workflow checks passed.** In addition, 11 catalog unit checks, 11 portable-plan validation checks, resource tests and artwork archive tests passed.

New coverage: offline directory pagination/search/filter/save, cross-format comparison, mixed movie/game nights, guest vote replacement and removal, unknown durations, budget warnings and running order, personal shelves, download contents, independent import copies, malformed input, HTML escaping, quota rollback, stale-tab conflict protection, JSON workspace backup restoration, reload persistence, offline service-worker restart and offline voting. Responsive checks at widths 320, 390, 768 and 1440. Upgrade checks from packaged 18.1.0 to 18.2.0 retained existing records, profile and theme.

The first mixed-media test caught background game enrichment being mistaken for an external edit. The revision guard now permits writes that match the current in-memory workspace while still blocking different data from another tab; both paths passed.

Limits: no claim that every legacy button/state permutation is certified. No real iPhone/Android, Safari, Firefox, screen-reader, cross-timezone, multi-user hosted infrastructure or long-running load/soak testing. Offline metadata is a bounded snapshot and is not a guarantee of age ratings, streaming availability or completeness. Hosted friend accounts/live syncing are deferred by request.
