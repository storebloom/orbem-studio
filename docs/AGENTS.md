---
audience: ai
scope: project
priority: high
---

# AI Agent Context

This document provides essential context for AI assistants (Cursor, Claude, Copilot, etc.) working on the Orbem Studio codebase.

## Project Overview

Orbem Studio is a WordPress plugin for building browser-based games. It provides custom post types, REST APIs, and a frontend game engine.

- **PHP**: 8.1+ required
- **WordPress**: 6.6+ minimum
- **Package Manager**: pnpm is preferred (though npm will still work)

```bash
# Use pnpm for dependency installation
pnpm install
```

## JavaScript Dependencies (Critical)

**Do NOT install individual `@wordpress/*` packages.** The only JS build dependency needed is `@wordpress/scripts`, which provides all WordPress packages at runtime.

### How It Works

1. `@wordpress/scripts` compiles JS files and generates `*.asset.php` files listing dependencies
2. WordPress core registers all `@wordpress/*` scripts globally (e.g., `wp-element`, `wp-components`)
3. The `autoRegisterAssets()` method in `inc/class-plugin.php` reads the asset files and registers scripts with the correct dependencies
4. WordPress automatically enqueues the required `@wordpress/*` scripts when our scripts load

### What NOT to Do

```bash
# DON'T do this - these packages are provided by WordPress core
pnpm add @wordpress/element
pnpm add @wordpress/components
pnpm add @wordpress/i18n
pnpm add @wordpress/data
```

### What TO Do

Just import them directly in your JS files:

```javascript
import { useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
```

The build system handles the rest.

## WordPress Local Environment

This project uses `@wordpress/env` for local development. Configuration is in `.wp-env.json`.

### Commands

| Command | Description |
|---------|-------------|
| `pnpm run env:start` | Start the local WordPress environment |
| `pnpm run env:stop` | Stop the environment |
| `pnpm run env:shell` | Open a bash shell in the container |
| `pnpm run env:destroy` | Completely remove the environment |
| `pnpm run wp` | Run WP-CLI commands |
| `pnpm run composer` | Run Composer inside the container |

### Ports

- Development site: `http://localhost:8000`
- Test site: `http://localhost:8008`

### Theme

The environment expects a theme at `../../themes/miropelia` relative to this plugin directory.

## PHP Patterns

### DocBlock Hooks

Instead of manually calling `add_action()` or `add_filter()`, use DocBlock annotations. The `Plugin_Base` class automatically registers hooks based on method docblocks.

```php
/**
 * Enqueue admin scripts.
 *
 * @action admin_enqueue_scripts
 */
public function enqueueAdminAssets(): void {
    // This method is automatically hooked to admin_enqueue_scripts
}

/**
 * Modify the template.
 *
 * @filter template_include
 */
public function customTemplate($template): string {
    return $template;
}
```

You can also specify priority:

```php
/**
 * @action init, 20
 */
```

### Coding Standards

- Use **snake_case** for PHP variables (WordPress standard)
- Run `pnpm run lint-php` to check for issues
- Run `pnpm run format-php` to auto-fix

## Build Commands

| Command | Description |
|---------|-------------|
| `pnpm run build` | Production build |
| `pnpm run watch` | Development build with file watching |
| `pnpm run watch:hot` | Hot module replacement |
| `pnpm run lint-js` | Lint JavaScript files |
| `pnpm run format-js` | Auto-fix JavaScript issues |
| `pnpm run format` | Format both JS and PHP |

### File Locations

- Source JS: `assets/src/js/`
- Source SCSS: `assets/src/sass/`
- Built assets: `assets/build/`

## Code Style Guidelines

### General

- Use strict equality (`===` and `!==`) instead of loose equality
- Prefer early returns over deep nesting
- Use `true ===` and `false ===` for explicit boolean checks (WordPress convention)

### JavaScript

- Prettier with 4-space indentation and single quotes
- Import SCSS directly in JS files (e.g., `import '../sass/admin.scss'`)

### PHP

- WordPress Coding Standards (WPCS) enforced via PHPCS
- DocBlocks required for all functions and methods
