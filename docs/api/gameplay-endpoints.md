# Gameplay Endpoints

Player-facing REST API endpoints for game state management, progression, and interactions.

## Base URL

All endpoints are under: `/wp-json/orbemorder/v1/`

## Authentication

Most endpoints require authentication with `read` capability (standard WordPress user).

---

## Area Data

### GET/POST `/area/`

Retrieve all game data for a specific area.

**Method:** `POST`  
**Permission:** Authenticated users

**Request:**
```json
{
  "area": "level-1"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "posts": [...], // All objects in this area
    "meta": {...}   // Area metadata
  }
}
```

---

## Player State

### POST `/coordinates/`

Save player's current position.

**Permission:** Authenticated users

**Request:**
```json
{
  "area": "level-1",
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

### POST `/add-explore-points/`

Update player's stat points (health, mana, power, money, points).

**Permission:** Authenticated users

**Request:**
```json
{
  "type": "health",
  "value": 25,
  "add": true  // true to add, false to subtract
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

### POST `/resetexplore/`

Reset player's game progress.

**Permission:** Authenticated users

**Request:**
```json
{}
```

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

Add item to player's inventory.

**Permission:** Authenticated users

**Request:**
```json
{
  "item": "health-potion",
  "type": "items" // or "weapons", "gear"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

### POST `/equip-explore-item/`

Equip an item or weapon.

**Permission:** Authenticated users

**Request:**
```json
{
  "item": "laser-sword",
  "type": "weapons",
  "slot": 0
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

### POST `/get-item-description/`

Retrieve item details for display.

**Permission:** Authenticated users

**Request:**
```json
{
  "item": "ancient-artifact"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "description": "...",
    "stats": {...}
  }
}
```

### POST `/save-drag/`

Save draggable item drop position.

**Permission:** Authenticated users

**Request:**
```json
{
  "item": "movable-crate",
  "top": 2200,
  "left": 2800
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

### POST `/save-materialized-item/`

Mark item as materialized/revealed.

**Permission:** Authenticated users

**Request:**
```json
{
  "item": "hidden-weapon"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

---

## Mission System

### POST `/mission/`

Complete a mission and trigger progression.

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

---

## Character System

### POST `/add-character/`

Add crew mate to player's roster.

**Permission:** Authenticated users

**Request:**
```json
{
  "character": "tech-specialist"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

### POST `/addspell/`

Unlock ability/magic for player.

**Permission:** Authenticated users

**Request:**
```json
{
  "spell": "teleportation"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

### POST `/enable-ability/`

Enable special ability.

**Permission:** Authenticated users

**Request:**
```json
{
  "ability": "hazard"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

---

## Enemy System

### POST `/enemy/`

Update enemy state (damage, defeat).

**Permission:** Authenticated users

**Request:**
```json
{
  "enemy": "boss-dragon",
  "health": 250,
  "defeated": false
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

---

## Cutscene System

### POST `/set-previous-cutscene-area/`

Track last cutscene viewed for continuity.

**Permission:** Authenticated users

**Request:**
```json
{
  "cutscene": "intro-scene"
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

---

## Settings

### POST `/save-settings/`

Save player preferences.

**Permission:** Authenticated users

**Request:**
```json
{
  "setting": "volume",
  "value": 75
}
```

**Response:**
```json
{
  "success": true,
  "data": "success"
}
```

---

## Authentication

### POST `/google-oauth-callback/`

Verify Google Sign-In token.

**Permission:** Public (no authentication required)

**Request:**
```json
{
  "credential": "google-id-token"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user_id": 123,
    "token": "..."
  }
}
```

---

## Error Responses

All endpoints return consistent error format:

```json
{
  "success": false,
  "data": "Error message"
}
```

Common errors:
- "User not authenticated"
- "Invalid data point"
- "Invalid item ID"

## Related Documentation

- **[API Overview](README.md)** - Architecture and authentication
- **[Developer Mode Endpoints](devmode-endpoints.md)** - Admin endpoints
- **[Custom Integrations](../extending/custom-integrations.md)** - Building with the API
