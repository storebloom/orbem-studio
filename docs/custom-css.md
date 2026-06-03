# Custom CSS

Orbem Studio includes a Custom CSS editor that lets you apply additional styles to the game page without modifying any plugin or theme files.

## Accessing the Custom CSS Editor

Navigate to **Orbem Studio** → **Custom CSS** in your WordPress admin dashboard.

**Required capability:** `edit_posts`

---

## Editor Features

The editor is powered by WordPress's built-in CodeMirror integration and provides:

- **CSS syntax highlighting**
- **Line numbers**
- **Auto-closing brackets**
- **Bracket matching**
- **Active line highlighting**
- **Line wrapping**

---

## How It Works

CSS entered here is stored in the `explore_custom_css` WordPress option. It is output inside a `<style>` tag in the `<head>` of your game page via the `wp_head` action — it applies **only** to the page designated as your game page in **Game Options → Page For Game**.

---

## Writing Custom CSS

The game page is rendered inside a `<div>` with the class `.game-container`. Most game UI elements are scoped within this container. For example:

```css
/* Change the HUD health bar color */
.hud-bar.health .bar-fill {
    background-color: #e74c3c;
}

/* Style the storage menu */
.storage-menu {
    background-color: rgba(0, 0, 0, 0.85);
    border-radius: 8px;
}

/* Override cutscene dialogue font */
.cutscene-dialogue {
    font-family: 'Georgia', serif;
    font-size: 18px;
}
```

---

## Saving Changes

Click **Save Changes** at the bottom of the Custom CSS page to apply your styles.

---

## Export / Import

Custom CSS is included when you export your game and is restored when you import it. See the [Export / Import](export-import.md) documentation for details.

---

## Related Documentation

- **[Global Options](global-options.md)** - Visual styling options (borders, colors, icons)
- **[Export / Import](export-import.md)** - Backup and migration including custom CSS
