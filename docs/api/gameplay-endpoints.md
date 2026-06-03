# Gameplay Endpoints

Player-facing REST API endpoints for game state management, progression, and interactions.

## Base URL

All endpoints are under: `/wp-json/orbemorder/v1/`

## Authentication

Most endpoints require authentication with `read` capability (any logged-in WordPress user). A few endpoints are public (`__return_true`). The nonce is passed as the `X-WP-Nonce` header and is available in the `OrbemOrder.orbemNonce` JavaScript global.

---

## Area Data

### POST `/area/`

Retrieve all rendered game data for a specific area. Returns pre-built HTML for map items, cutscenes, missions, characters, explainers, minigames, communication objects, and dev mode UI (admins only). Also updates the player's `current_location` user meta.

**Permission:** Public (open to all visitors)

**Request:**
```json
{
  "position": "level-1",
  "characters": ["trek"]
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `position` | string | Slug of the `explore-area` post to load |
| `characters` | array\|string | Optional. Slugs or IDs of crew characters currently in the party |

**Response:**
```json
{
  "success": true,
  "data": {
    "map-items": "<HTML>",
    "minigames": "<HTML>",
    "map-cutscenes": "<HTML>",
    "map-missions": "<HTML>",
    "map-characters": "<HTML>",
    "map-communicate": "<HTML>",
    "map-explainers": "<HTML>",
    "menu-explainers": "<HTML>",
    "fullscreen-explainers": "<HTML>",
    "map-abilities": "<HTML>",
    "explore-ability": [],
    "map-item-styles-scripts": "<HTML>",
    "start-top": "2500",
    "start-left": "3000",
    "area-height": "100%",
    "area-width": "100%",
    "start-direction": "down",
    "map-svg": false,
    "is-cutscene": "",
    "dev-mode": ""
  }
}
```

---

## Item Description

### POST `/get-item-description/`

Retrieve the post content for an item to display in a popup (e.g., storage or gear description).

**Permission:** Public (open to all visitors)

**Request:**
```json
{
  "id": 123
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | int | Post ID of an `explore-point`, `explore-weapon`, or `explore-gear` post |

**Response:**
```json
{
  "success": true,
  "data": "<p>Item description HTML...</p>"
}
```

If the item is already equipped in the player's gear, the response modifies button labels from "Equip" to "Unequip".

---

## Player State

### POST `/coordinates/`

Save the player character's current map coordinates.

**Permission:** Authenticated users (`read` capability)

**Request:**
```json
{
  "top": 2500,
  "left": 3000
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

Saves to user meta key `current_coordinates`.

---

### POST `/add-explore-points/`

Update a player's stat (health, mana, points, money, gear, weapons, or communication received).

**Permission:** Authenticated users

**Request:**
```json
{
  "type": "health",
  "amount": 75,
  "item": "health-potion",
  "reset": "false"
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | Stat type: `health`, `mana`, `point`, `money`, `gear`, `weapons`, or `communicate` |
| `amount` | int | New point value for this stat |
| `item` | string\|array | Item slug(s) used as position identifiers to track which locations have been collected |
| `reset` | string | `"true"` to reset health and mana to 100 before applying |

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

For `type: "communicate"`, saves to the `explore_received_communicates` user meta keyed by `amount` (cutscene/area ID).

---

### POST `/resetexplore/`

Delete all game progress for the authenticated player. Clears coordinates, location, points, enemies, missions, storage, magic, equipped items, drag positions, characters, materialized items, abilities, received communicates, and previous cutscene area.

**Permission:** Authenticated users

**Request:** (no body required)

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

---

## Inventory System

### POST `/save-storage-item/`

Add or remove an item from the player's storage inventory.

**Permission:** Authenticated users

**Request:**
```json
{
  "id": 123,
  "name": "health-potion",
  "type": "items",
  "value": 25,
  "remove": "false"
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | int | Post ID of the item |
| `name` | string | Item slug/name used as identifier |
| `type` | string | Storage category: `items`, `weapons`, or `gear` |
| `value` | int | Numerical value or effect of the item |
| `remove` | string | `"true"` to decrement or remove the item |

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

---

### POST `/equip-explore-item/`

Equip or unequip an item (weapon or gear) for the player.

**Permission:** Authenticated users

**Request:**
```json
{
  "itemid": 123,
  "type": "weapons",
  "amount": 10,
  "unequip": "false"
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `itemid` | int | Post ID of the item to equip |
| `type` | string | `weapons` or `gear` |
| `amount` | int | Effect value of the item |
| `unequip` | string | `"true"` to unequip the item |

**Response:**
```json
{
  "success": true,
  "data": "equipped123"
}
```

Saves to `explore_current_{type}` user meta.

---

### POST `/save-drag/`

Persist the drop position of a draggable item for the player.

**Permission:** Authenticated users

**Request:**
```json
{
  "top": 2200,
  "left": 2800,
  "slug": "movable-crate"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

Saves to `explore_drag_items` user meta keyed by item slug.

---

### POST `/save-materialized-item/`

Record that a hidden item has been revealed/materialized for the player in a specific area.

**Permission:** Authenticated users

**Request:**
```json
{
  "area": "level-1",
  "item": "hidden-sword"
}
```

`item` can also be an array of item slugs or IDs.

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

Appends to `explore_materialized_items` user meta, keyed by area slug.

---

## Mission System

### POST `/mission/`

Mark a mission as completed for the player.

**Permission:** Authenticated users

**Request:**
```json
{
  "mission": "defeat-boss"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

Appends the mission slug to `explore_missions` user meta.

---

## Character System

### POST `/add-character/`

Add a crew mate character to the player's character roster.

**Permission:** Authenticated users

**Request:**
```json
{
  "slug": "tech-specialist"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

Appends to `explore_characters` user meta.

---

### POST `/addspell/`

Add a magic/ability to the player's spell list, categorized by the `magic-type` taxonomy (`offense` or `defense`).

**Permission:** Authenticated users

**Request:**
```json
{
  "spellid": 456
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `spellid` | int | Post ID of the `explore-magic` post |

**Response:**
```json
{
  "success": true,
  "data": "Spell added"
}
```

Saves to `explore_magic` user meta under the `offense` or `defense` key.

---

### POST `/enable-ability/`

Unlock a special ability for the player (e.g., `transportation`).

**Permission:** Authenticated users

**Request:**
```json
{
  "slug": "transportation"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

Appends to `explore_abilities` user meta.

---

## Enemy System

### POST `/enemy/`

Record a defeated enemy so it no longer appears in the game.

**Permission:** Authenticated users

**Request:**
```json
{
  "health": 0,
  "position": "forest-troll"
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `health` | int | Must be `0` to record the enemy as defeated |
| `position` | string | Enemy post slug used as the identifier |

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

Appends to `explore_enemies` user meta.

---

## Cutscene System

### POST `/set-previous-cutscene-area/`

Store the area slug the player was in before a cutscene started, so the game can return them there after the cutscene ends.

**Permission:** Authenticated users

**Request:**
```json
{
  "cutscene": "starting-village"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

Saves to `explore_previous_cutscene_area` user meta.

---

## Settings

### POST `/save-settings/`

Save the player's audio preferences.

**Permission:** Authenticated users

**Request:**
```json
{
  "music": 80,
  "sfx": 100,
  "talking": 60
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `music` | int | Background music volume (0–100) |
| `sfx` | int | Sound effects volume (0–100) |
| `talking` | int | Dialogue/voice volume (0–100) |

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

Saves to `explore_settings` user meta.

---

## Setup

### POST `/choose-setup-type/`

Handle the initial setup wizard choice. Creates starter game content if `generate` is selected, or creates a game page if `page` is selected.

**Permission:** Authenticated users (`read` capability)

**Request:**
```json
{
  "type": "generate"
}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `type` | string | `generate` (create starter content), `manual` (skip generation), or `page` (create a game page) |

**Response for `generate` or `manual`:**
```json
{
  "success": true,
  "data": "success"
}
```

**Response for `page`:**
```json
{
  "success": true,
  "data": "https://yoursite.com/my-orbem-studio-game"
}
```

---

## Authentication

### POST `/google-oauth-callback/`

Handle Google Sign-In. Verifies the Google ID token, finds or creates the corresponding WordPress user, and logs them in.

**Permission:** Public (no authentication required)

**Request:**
```json
{
  "credential": "google-id-token-string"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

If the Orbem Studio Pro plugin is active, the Pro version's handler is used instead.

---

## Error Responses

All endpoints return a consistent error format:

```json
{
  "success": false,
  "data": "Error message"
}
```

Common errors:
- `"User not authenticated"` — endpoint requires login
- `"Invalid request data"` — required field missing or invalid
- `"Missing data point"` — required field absent
- `"Invalid item ID"` — post ID does not exist or is wrong type

## Related Documentation

- **[API Overview](README.md)** - Architecture and authentication
- **[Developer Mode Endpoints](devmode-endpoints.md)** - Admin endpoints
- **[Custom Integrations](../extending/custom-integrations.md)** - Building with the API
