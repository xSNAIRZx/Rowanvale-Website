# Titles and naming audit — 18.6

## Application names

One route registry now sets current page titles and sidebar labels without changing stable route IDs. Screens and contextual copy still use purposeful headings rather than repeating the same page title everywhere.

| Previous inconsistency | Current name or behavior |
| --- | --- |
| Book Directory / Books Directory | Books Directory |
| My profile / Your Orbit | Your Orbit; Personal Atlas names the new profile experience |
| Discover / Discover games | Discover Games |
| Collection / My collection for the game-only route | Game Collection; All media remains the mixed-format profile tab |
| Fitness & Movement / Movement | Movement |
| Reset & wellbeing / Reset Studio | Reset Studio |
| Data & Beta / Backups & data | Backups & Data |
| Update Center / Help & updates | Help & Updates |
| Profile Studio label leading to global settings | Settings; Profile Studio remains the actual profile-edit dialog |
| 18.4 banner in the current media hub | Your media / A world of possibilities |
| ROWANVALE 11 on the quick portal | ROWANVALE / QUICK PORTAL |
| VYTRON Local Index display attribution | Rowanvale Local Index; compatibility variable names are retained |
| hearthbyte personal/community/friends/shortlist filenames | rowanvale filenames |
| 17.2 private backup filename | 18.6 private backup filename |

Existing user-defined handles, display names, custom collection titles, storage keys, import schemas and provider IDs were not renamed. This prevents a copy cleanup from breaking recovery or personal choices.

## Every bundled catalog title was structurally scanned

The executable audit tests/catalog-audit186.cjs inspects all current entries: **3,996 merged games, 110 books and 2,198 film/TV/anime entries**. There are no blank titles, control-character titles, spacing warnings or over-limit title warnings in these bundled arrays. See evidence/18.6/catalog-title-audit.json for full groups/counts and baseline/catalog-title-audit-before.json for the pre-cleanup result.

The earlier extension already removed repeated extension names during merging. Fourteen repeated base game cards still remained: Persona 5 Royal, NieR: Automata, Hollow Knight, Celeste, Dead Cells, Core Keeper, Project Zomboid, Euro Truck Simulator 2, Cities: Skylines II, Street Fighter 6, Mortal Kombat 1, Inscryption, Firewatch and Papers, Please. These now consolidate into one bundled card, retain the first display title and combine tags. The pure index helper keeps records with different known years, provider IDs or editions separate and is never applied to saved user records.

Twenty-eight shared-title groups in the film/TV/anime directory are intentionally retained. Examples include Casino Royale (1967/2006), Metropolis (1927 film/2001 anime) and distinct Wizard of Oz adaptations. Matching a title string alone is not evidence that a work should be deleted or merged.

This is a structural audit, not a claim that all 6,304 catalog entries were individually checked against a live authority. Existing game seeds do not uniformly provide authoritative IDs. The public structured directory keeps its original Wikidata sources/CC0 provenance. Uncertain entries and editions still need source review; personal title corrections require a deliberate edit.

## Source checks and additions

The three new book title/author/year records were checked against their source catalog pages: [The Blue Castle, L. M. Montgomery, 1926](https://www.gutenberg.org/ebooks/67979), [The Book of Tea, Kakuzo Okakura, 1906](https://www.gutenberg.org/ebooks/769), [The Enchanted April, Elizabeth von Arnim, 1922](https://www.gutenberg.org/ebooks/16389). Only concise bibliographic facts and links are added; no book text or third-party cover is bundled.

Discovery trail game facts use [Celeste's Steam page](https://store.steampowered.com/app/504230/Celeste/) and [Hollow Knight's Steam page](https://store.steampowered.com/app/367520/Hollow_Knight/). The film trail links to [Pixar's WALL-E page](https://www.pixar.com/wall-e). These are editorial starting points, not recommendations inferred from private wellness data.

The audit also exposed anime films in a category previously searched only through TMDB TV. Anime searches now cover both animated TV and films; prefixed movie IDs prevent film/series collisions while preserving existing numeric TV IDs. Identified anime films use film completion. Official endpoint references: [movie search](https://developer.themoviedb.org/reference/search-movie), [TV search](https://developer.themoviedb.org/reference/search-tv). Live credential-dependent TMDB requests remain unverified without a supplied token.
