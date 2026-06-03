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
