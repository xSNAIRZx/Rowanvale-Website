# Whole-app audit and implementation plan — 18.6

## Baseline and executed plan

The supplied 18.5 ZIP matched SHA-256 0a66f18c5401758974fa199f8b0d2ec6c008b234230bce596eee6291225130ac. All 230 manifest hashes and archive CRCs verified before extraction into a separate work folder. The baseline passed 75 Node tests, 64 browser workflows and seven existing book-catalog assertions. Baseline route headings/screenshots/test output are retained under evidence/18.6/baseline/.

Inspection covered the actual plain-JavaScript architecture, legacy route/decorator layers, local/cloud identity, optional Supabase/Spotify, metadata server, artwork safety, five-format library, global/profile theme ownership, existing Reset tools and test harnesses.

Priorities executed: (1) unblock visible artwork from probes/bulk quotas; (2) replace the profile composition while reusing safe edits/privacy; (3) restructure Reset Studio and build recoverable guided sessions; (4) align route/export naming and audit catalogs; (5) add small sourced discovery improvements; (6) run regressions, inspect screenshots and package independently.

## All twenty destinations reviewed

| Destination | Existing purpose and audit result | 18.6 handling |
| --- | --- | --- |
| My Day | Onboarding continuation, habits, recent work, quick discovery | Retained; complete onboarding/reload tested, naming/theme/navigation reviewed |
| Overview | XP, current activity and next actions | Retained; migration/XP regression and responsive route checks |
| Games & Media | Five-format library, suggestions, artwork, sessions, journey | Priority art, in-place updates, resume strip, discovery trails; existing tools regressed |
| Discover Games | Searchable merged game index and filters | Fourteen repeated base cards consolidated, source branding fixed; existing discovery preserved |
| Game Collection | Saved game filters, statuses and shelves | Canonical name, retained actions and export filename correction |
| Books Directory | Offline starters, live lookup, reading progress | Three sourced additions; canonical plural name; existing pagination/progress tested |
| Watch Room | Films, anime, TV and viewing diary | Retained; completion/undo tests; central matcher gains distinct anime-film identities |
| Fan Lounge | Local fan interests and directory | Retained; navigation, headings and responsive route inspection |
| Quests | Tasks, repeats, templates, XP | Retained; ledger/idempotency regressions and responsive route checks |
| Movement | Workouts, logs, nutrition, hydration | Canonical title, preserved logging/forms; route/theme inspection |
| Quiet Room | Focus timer, notes and sessions | Retained; route controls and integration inspected |
| Reset Studio | Previously 24 headings on one long page | Six clear areas, new guided session/grounding UI, old tools retained in appropriate areas |
| Offline Guides | Local support/resource directory | Retained; useful access from Reset Studio |
| Clubhouse | Local plans and quest kits | Retained; route and responsive inspection |
| Friends | Private roster and saved handles | Retained; honest local scope and export naming |
| Connections | Platform shortcuts, Spotify and private cloud | Existing SDK tests retained; cloud restoration defers around active editors |
| Your Orbit | Identity, personal media, edits and sharing | New passport rail/editorial canvas; customization and snapshots use updated structure |
| Settings | Global/profile appearance, comfort, data and accounts | Clear Settings name, retained settings categories and light/dark/system tests |
| Backups & Data | JSON/artwork backups and recovery | Canonical name and versioned export filenames; archive/restore regressions |
| Help & Updates | Version/help and local diagnostics | Canonical name/version, retained diagnostics and actual configuration limits |

All twenty routes were opened in a real browser and checked at 320, 768 and 1440 pixels. Existing deeper functional regressions remain alongside new profile/Reset/artwork tests. This is not a claim that every legacy button or external service was exhaustively certified; see QA_REPORT_18.6.md.

## Decisions and preserved boundaries

No framework migration, fabricated backend, filler catalogs or automatic renaming of personal records. There are five library categories; existing music is an anthem/local audio/optional Spotify playback, not an album catalog. Friends, platform handles and pinboard remain local. Public profiles are safe static snapshots, not a newly invented hosted social network.

New pure modules isolate priority scheduling, guided-session state and title-index deduplication. New DOM components reuse established save callbacks and fields. Metadata results check record identity and protect manual edits. Image patching does not replace route state. The source and final package retain older releases' documentation explicitly as history.
