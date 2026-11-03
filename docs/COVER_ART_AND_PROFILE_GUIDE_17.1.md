# Rowanvale 17.1 · Cover Art & Profile Studio

## What is available now

Rowanvale 17.1 keeps its **4,010-game searchable offline text catalog**. The catalog does **not** include actual cover art for all 4,010 games. Forcing artwork automatically can yield wrong editions, consume substantial storage, or violate upstream redistribution terms.

- **Offline immediately:** custom covers uploaded as PNG/JPG/WebP are resized and saved to the local Rowanvale data, and included in the normal JSON backup.
- **Online-only until cached:** selected HTTPS artwork links from game metadata or links you set manually. These require internet as ordinary external image links.
- **Save offline on this PC:** when the selected cover comes from the supported game artwork hosts, choose **Make chosen cover available offline** in the Artwork Manager. Rowanvale downloads the image into `~/.rowanvale/artwork` (on Windows, under the user's home directory). It will work without internet while the local Rowanvale Node server is running. Supported hosts: Steam artwork (`steamstatic.com`, `steamusercontent.com`, `steamcdn-a.akamaihd.net`), RAWG images (`media.rawg.io`), and IGDB images (`images.igdb.com`). No broad, arbitrary URL fetching is allowed for security.
- **Missing:** honest placeholders. The new Cover Availability block in **Collection** counts offline, online-only and missing images among games **you have saved**, not all games in the 4,010-title archive.

### How to add a cover and take it offline

1. Launch `START_ROWANVALE_WINDOWS.bat` and open Rowanvale.
2. In **Discover** or **Collection**, choose a game's **Cover / Add art** control.
3. Upload a picture you have the right to use, OR use optional **Search available catalogs** and manually confirm the correct game and edition, OR paste a direct HTTPS image URL.
4. Uploaded art is already offline. For an online image from a supported game-art provider, **reopen the same artwork manager** and choose **Make chosen cover available offline**. The local Node server must have internet for the initial download.
5. Check **Collection → Cover availability**. This reports your saved game's coverage.

Disk-cache files do **not** travel inside the app's JSON backup. For moving computers, separately copy your `.rowanvale/artwork` folder along with your JSON backup, or use your own uploaded images. Do not redistribute artwork unless permitted by its rights holder/provider. Up to 4,500 cached images (and 2 GiB total) are supported as a capacity ceiling, **not a promise of available covers**. Downloading every cover automatically is deliberately not included.

## Personal profile features (Myspace + modern bio-page inspiration)

Already included and preserved from earlier builds: five Orbit layouts, wallpapers/banner/avatar, editable status and bio, Top 8 locally featured friends, friend roster, guestbook/wall, personal anthem link, 12 social links, six gallery images, profile badges, section order, share-card links, personal exports, custom themes, and appearance effects.

**New in 17.1:** a compact **Your Orbit → Profile Spotlight** supporting Classic, Modern, and Minimal style, your own welcome message, selected anthem link, chosen social links, status, bio and Top 8 display. Edit it directly on the Orbit page using **Personalize this card**. It saves with ordinary Rowanvale data and respects existing settings.

No fake public visitor counts, automatically playing copyrighted music, simulated Discord online presence, or remotely hosted public accounts. Guestbook entries are local by design. Rowanvale does not copy guns.lol branding, assets or code.

Sources of inspiration and feature verification: Myspace's documented Top 8, blogs, comments and profile personalization; guns.lol customization guides for banners, widgets, color, audio and profile layouts. See official help sites for original details.

## Limits and privacy

Cover lookup requires an available optional metadata provider and internet. Not every platform/title/edition has a matching image; the user approves each selected result. The local disk cache serves files on the current PC via `/api/artwork/file/…`, does not expose an upload endpoint, limits file type/size, rejects unapproved hosts, and requires same-origin intent headers for downloads. The server listens on loopback by default. Under a hosted/public Rowanvale deployment this personal disk cache should be disabled or given per-user authentication before being enabled.

For further beta testing: actual Windows OS scaling, external provider reachability, Edge/Firefox, screen readers, long-term disk usage, and genuine multi-device sync are not yet verified.
