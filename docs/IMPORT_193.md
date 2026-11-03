# Reviewed local library imports

Open **Review library import** in Your Library, or the existing import action in Game Collection. Files stay in your browser. Supported inputs are Rowanvale personal-library JSON, Goodreads library CSV, Letterboxd diary CSV, and generic CSV with `Title`, `Type`, optional `Status`, `Note`, `Author`, `ISBN`, `Year`, `Provider`, `SourceId`, `Rating`.

Generic Type is Game, Movie, Show, Anime or Book. CSV ratings use 0–5 and are converted to Rowanvale's 0–10 scale. Supported statuses include the normal game/library states, On Hold and Dropped. Blank status means Backlog for games or Want to Try for other formats. Unsupported statuses, malformed rows and invalid dates reject the file with an explanation. Imports are limited to 12 MB and 5,000 records per review; larger files are rejected, never silently truncated.

Review every candidate before saving. Exact identifiers and possible same-title matches default to Skip. Separate ISBN editions are retained as separate candidates. **Add separately** is explicit; no existing title or field is overwritten. The review shows incoming status, identifiers, notes and rating. Custom shelf definitions from library exports are not imported in this additive flow; full workspace backups preserve those definitions.

The whole selected batch saves once. If saving fails, the old workspace remains stored and the review stays open for retry. Historical imports do not award completion XP. Re-importing the same file defaults to skipping its previously added rows. Cancel changes nothing.

**Undo last library import** removes only the most recent batch, provided every added title remains unchanged. If a title was edited, undo refuses to discard those changes; remove unwanted titles individually. A later successful import replaces the previous batch's undo point. The undo record travels in a full workspace backup. This is an additive importer, not a continuous sync or a field-merging engine.

Unknown source dates remain unknown. No viewing, reading, or episode activity is invented from summary progress. Generic CSV does not import an episode ledger. Rowanvale JSON carries supported detailed history. Imported exports may contain private notes; manually share only the records you intend to share.
