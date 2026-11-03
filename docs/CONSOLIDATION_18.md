# Customization audit and consolidation

Baseline: the complete organized 17.4.1 source in work/header-1741, not the original 17.2.6 download. A 91-check regression run passed before modifications. Development took place on branch rowanvale-18-your-world in a separate copied repository. The original archive and earlier builds remain unchanged.

CUSTOMIZATION_INVENTORY.json records static setting references and input IDs across the legacy modules. Static references alone do not prove an editor is active; the following behavior review guided consolidation.

| Existing feature / locations | Stored data | Decision in 18 |
|---|---|---|
| Core Theme Studio, RV16 pack cards, RV161 Design Lab, old Studio tabs | settings.theme/accent/uiFont/uiDensity/uiCorners/uiBackdrop | One Appearance registry/editor; classic values retained; contextual theme button routes here |
| Design Lab preview/snapshot vs direct change controls | Same settings + legacy look records | Staged real-renderer preview, one Save/Discard/Undo path |
| RV16 saved looks | savedLooks[].settings | Same array retained; new typed theme18 payload; old look compatibility |
| Core profile fields and Orbit Canvas editor | profile.*; settings.space* | One Profile & Identity category; existing renderer retained |
| Simple vs advanced old panels | settings.editorMode and same profile | Progressive disclosure, not a separate profile copy; old preference preserved |
| App/profile shared custom wallpaper | settings.customWallpaper | Preserve old image; additive copy to rv18.backgroundImage on first save; separate thereafter |
| Global layout and dashboard presets | homeLayout/dayLayout/dayWidgets, rv162.dayPreset/sizes | My Space canonical fields; existing on-card move/hide actions edit same arrays |
| Overview card toggles | settings.showWidgets | Retained in My Space |
| Page-by-page room styles | settings.rv162.pages | Retained separately under Advanced: genuinely page-scoped, independently saved |
| Sidebar pin editor and open groups | liltwood.sidebar.v14 | Reuse existing pinned editor, no duplicate key or pin editor |
| Sidebar collapse preference | settings.sidebarCollapsed | Same preference in My Space and contextual collapse button |
| Navigation emphasis | settings.navigationPriority | Retained advanced My Space preference |
| Reading comfort / reduced motion / progress controls | settings.calmInterface/reducedMotion/lowStimulation/etc. | One Comfort category; contextual header toggles retain same existing fields |
| Calm View | settings.rv17calm.quiet | Retained contextual page switch; distinct from reading comfort; independently regression-tested |
| Collection grid/list/sort/artwork | settings.libraryView/librarySort; backlog/art cache | Same preferences, existing operational editor retained; no second collection store |
| Fitness, nutrition, routines | fitnessLogs/foodLogs/waterLogs/workoutPlans and goals | Existing module workflows preserved; shared themes and page-specific style controls apply |
| Quiet Room timer, intention and sessions | quietIntention/focusLog/wellnessSessions | Retained operational controls; global comfort applies |
| Guestbook, badges, Top 8, gallery | guestbook/achievements/friends and space arrays | Stored data retained; profile section ordering/visibility controls consolidated |
| Backup/import/export panels | existing workspace key, local art cache | Data category links to the existing full backup/recovery destination |
| Catalog/account/habit/rights panels | catalogEndpoint, account config, habits | Unique panels retained under Advanced; save independently and are explicitly labeled |
| Header vs sidebar destinations/search | Existing route actions | Keep the 17.4.1 split and one visible global search; 32 header checks pass |

The old renderer/helper functions and historical CSS remain where shared dependencies still use them. They are not all deleted. Removed visible duplicate Studio mounts do not delete saved fields. Some contextual operational controls remain by design (for example, sorting a collection or moving a dashboard card).

Confirmed issues repaired during this audit: new saved-look records were incompatible with legacy load filtering; new profile range/media limits initially exceeded loader limits; light-theme canvas inherited an older low-stimulation rule; returning to classic themes retained inline token overrides; a discard after a cross-tab conflict could have started from stale in-memory data. Tests cover these corrections.
