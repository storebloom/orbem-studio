# Export / Import

Orbem Studio includes a built-in Export / Import tool that lets you back up your entire game or migrate it to a different WordPress site.

## Accessing Export / Import

Navigate to **Orbem Studio** → **Export / Import** in your WordPress admin dashboard.

**Required capability:** `manage_options` (Administrator role)

---

## Exporting Your Game

Click **Export Game** to download a JSON file containing:

- All game posts (all 13 `explore-*` post types) with their post meta
- All referenced images from the media library (their URLs are included so they can be re-imported)
- All Game Options (global settings such as starting area, main character, HUD configuration, etc.)
- Custom CSS

**The export file is named:**
```
orbem-game-{site-name}-{YYYY-MM-DD}.json
```

### What is Exported

| Data | Included |
|------|----------|
| All `explore-*` posts (published) | Yes |
| Post meta for each object | Yes |
| Featured images | URL included |
| All image URLs referenced in meta | URL list included |
| Game Options (all `explore_*` settings) | Yes |
| `explore_game_page` option | No (intentionally excluded on import to avoid overwriting your page setup) |
| Custom CSS (`explore_custom_css`) | Yes |
| Player progress (user meta) | No |
| WordPress users | No |

---

## Exporting for itch.io

Click **Download itch.io Zip** to get a `.zip` containing a single `index.html`.

**The export file is named:**
```
orbem-itch-{site-name}-{YYYY-MM-DD}.zip
```

### How it is built

1. The plugin requests your live game page (**Game Options → Page For Game**) over HTTP as a logged-out visitor, so the file contains exactly what a player sees — no admin bar and no Dev Mode markup
2. Every relative URL in the markup is rewritten to an absolute URL on your site
3. Stylesheets and scripts hosted on your site are read from disk and inlined into the page (only `.css` and `.js` files inside the WordPress root are ever inlined; third-party assets such as Google Sign-In stay as external `<script src>`)
4. The result is wrapped in a complete HTML document and zipped as `index.html`

### Uploading to itch.io

1. Create or edit your project on itch.io
2. Set **Kind of project** to **HTML**
3. Upload the zip and tick **This file will be played in the browser**

### Notes

- Images, audio, video and all REST/save-progress calls still point at your WordPress site, so it must stay online and the game page must stay published
- Requires the PHP `zip` extension (`ZipArchive`) and a working loopback HTTP request to your own site
- Re-export after changing game content — the file is a snapshot of the page at export time

---

## Exporting for Steam (Windows)

Click **Build Windows Game** to download a Windows desktop version of your game, ready to upload to Steam.

**The export file is named:**
```
orbem-steam-win-{site-name}-{YYYY-MM-DD}.zip
```

### How it works

A packaged Electron app is just the official Electron runtime with the app in `resources/app/` and the executable renamed — so nothing is compiled on your server. The plugin:

1. Downloads the official Electron Windows runtime from the Electron project's GitHub releases (about 150 MB) and verifies it against the release's `SHASUMS256.txt`
2. Caches it in `wp-content/uploads/orbem-studio-steam/` — this happens **once**, not per export
3. Builds the same standalone `index.html` used by the itch.io export
4. Copies the cached runtime, then writes `resources/app/{package.json, main.js, index.html, icon.png}` into the copy, removes `resources/default_app.asar`, and renames `electron.exe` to your game's name
5. Adds `STEAM-README.txt` with Steamworks submission steps
6. Streams the result to your browser and deletes the temp copy

The first build takes as long as the download; every build after it takes seconds.

### Uploading to Steam

Enter your **App ID** on the export screen once (Depot ID is optional — Steam's usual App ID + 1 is used if you leave it blank). Every build then ships with its upload scripts already filled in:

```
YourGame.exe            the game
resources/app/          your game files
upload_to_steam.bat     one click uploader
steam_build/            generated app_build.vdf + depot_build.vdf
STEAM-README.txt        the steps, written for this specific build
```

Extract the zip, double click `upload_to_steam.bat`, and enter your Steam username. It downloads `steamcmd` from Valve on first run, and Steam Guard prompts interactively.

**Builds start in preview mode.** `app_build.vdf` ships with `"preview" "1"`, so the first run reports what *would* upload without publishing anything. Change it to `"0"` when the preview looks right, then run the `.bat` again.

`steam_build/`, `steamcmd/`, the `.bat` and the readme are all excluded from the depot, so they never reach players.

Two steps stay manual, because Valve exposes no API for them: setting the launch executable under **Installation → General**, and the store page and review submission.

If you build without an App ID set, the scripts ship with a placeholder and the `.bat` refuses to run with an explanation rather than failing confusingly.

### Branding the executable

The `.exe` is renamed to your game, and `main.js` sets the window and taskbar icon from your **site icon**. But the icon embedded *in the executable file* and its Windows version strings still say Electron — rewriting those needs `rcedit`, a Windows-only tool the plugin cannot run.

If that matters, run `rcedit` against the `.exe` yourself after extracting the zip. Players launching through the Steam client see your store artwork, so this is mostly cosmetic.

### Notes

- **Windows only.**
- **The game needs an internet connection.** Images, audio, video and saved progress load from your WordPress site, so it must stay online and the game page must stay published.
- **Not code signed.** Windows SmartScreen may warn on first launch outside Steam; code signing is a separate certificate purchase.
- **No Steamworks SDK.** Achievements, cloud saves and the overlay need the SDK wired into `main.js`.
- Requires the PHP `zip` extension, outbound HTTPS to `github.com`, and roughly 300 MB of free disk (cached runtime plus the temporary build).
- When a plugin update pins a newer Electron version, the new runtime downloads automatically and the previous one is deleted. **Clear cached runtime** on the export screen is only for recovering from a corrupted download.
- Steamworks IDs are stored in the `orbem_steam_app_id` and `orbem_steam_depot_id` options
- The Electron version is pinned in the plugin and filterable via `orbem_studio_electron_version`; the download URL via `orbem_studio_electron_url`.

---

## Importing a Game

1. Click **Choose File** and select a previously exported `.json` file
2. Click **Import Game**

The importer will:

1. **Import all game options** — overwrites existing settings, except `explore_game_page` which is left unchanged
2. **Import all posts** — only creates posts that do not already exist (matched by `post_name` + `post_type`); existing posts are never deleted or overwritten
3. **Download and re-host all images** — each image URL found in the export is downloaded from the source site and uploaded to your media library; all meta values are updated to point to the new local URLs
4. **Import Custom CSS** — overwrites existing custom CSS if present in the file

### Notes

- The importer sets `memory_limit` to 512 MB and removes the time limit to handle large game exports
- If an image cannot be downloaded (e.g., the source site is offline), that image is skipped and the meta value retains the original URL
- Running the import multiple times is safe — duplicate posts are never created

---

## Use Cases

### Backup Before Major Changes

Export your game before restructuring areas or missions so you can restore if needed.

### Migrate to a New Site

1. Export from your development or staging site
2. Install Orbem Studio on the new site
3. Import the JSON file
4. Update **Game Options** → **Page For Game** to point to a page on the new site

### Duplicate a Game

Import the same export file into two different WordPress installations to create independent copies of the same game.

---

## Related Documentation

- **[Global Options](global-options.md)** - The settings that are exported/imported
- **[Getting Started](getting-started.md)** - Setting up a fresh installation
