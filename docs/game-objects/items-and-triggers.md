# Items and Triggers

Orbem Studio includes several interactive object types for collectibles, information delivery, boundaries, and special interactions. This document covers Points, Signs, Explainers, Walls, Minigames, Magic/Abilities, and Communication Items.

## Table of Contents

- [Items (Points)](#collectible-items-points)
- [Signs and Focus View](#signs-and-focus-view)
- [Explainer Popups](#explainer-popups)
- [Walls](#walls)
- [Minigames](#minigames)
- [Communication Items](#communication-items)

## Items (Points)

**Post Type:** `explore-point`

Items players can collect/break/get damaged by/drag throughout the game world, providing rewards or triggering events.

### Configuration

- **Area** (`explore-area`): Where the item appears
- **Position**: top, left, height, width coordinates
- **Rotation** (`explore-rotation`): Sprite rotation in degrees
- **Layer** (`explore-layer`): Z-index for visual layering
- **Featured Image**: Visual representation of the item

### Interaction Types

**Interaction Type** (`explore-interaction-type`):
- `collectable` - Collects when touched
- `breakable` - Breaks when interacted with
- `draggable` - Can be dragged
- `hazard` - Damages player on touch

### Rewards

- **Value** (`explore-value`): Reward amount
- **Value Type** (`explore-value-type`): `point`, `mana`, `health`, `money`

### Materialization

Items can appear after conditions are met:
- **Materialize Trigger**: Physical trigger zone
- **Materialize After Cutscene**: Appears after cutscene
- **Materialize After Mission**: Appears after mission

### Example

```
Title: Health Potion
Area: dungeon-level-1
Top: 1800
Left: 2200
Height: 50
Width: 50

Interaction Type: collectable
Value: 25
Value Type: health
```

## Signs and Focus View

**Post Type:** `explore-sign`

Objects players can examine closely, displaying detailed images or text.

### Configuration

- **Area** (`explore-area`): Where the sign appears
- **Position**: top, left, height, width
- **Featured Image**: Trigger image (what appears on the map)
- **Post Content**: What displays when examined (use Image blocks for readable documents)

### Use Cases

- Readable documents and books
- Detailed artwork or paintings
- Information terminals
- Puzzle clues

### Example

```
Title: Ancient Tablet
Area: temple-ruins
Top: 2000
Left: 2500
Height: 80
Width: 60

Featured Image: tablet-on-wall.png
Content: [Image block with readable inscription]
```

## Explainer Popups

**Post Type:** `explore-explainer`

Tutorial popups that provide information and instructions to players.

### Configuration

- **Area** (`explore-area`): Where the explainer appears
- **Explainer Trigger**: Trigger zone (top, left, height, width)
- **Explainer Arrow**: Pointing arrow configuration (top, left, direction)
- **Trigger Type** (`explore-trigger-type`):
  - `auto` - Shows immediately when triggered
  - `engagement` - Requires action key press

### Content

- **Post Content**: Explanation text (supports blocks)
- **Featured Image**: Optional illustration

### Voice over

Use the MP3 field to upload a voice over or other sound when explainer is triggered

### Use Cases

- Tutorial messages
- Gameplay hints
- Control explanations
- Story context

### Example

```
Title: Combat Tutorial
Area: training-grounds

Explainer Trigger:
  Top: 2200
  Left: 2600
  Height: 100
  Width: 100
Trigger Type: auto

Explainer Arrow:
  Top: 2300
  Left: 2700
  Direction: down

Content: "Press SPACE to attack enemies!"
```

## Walls

**Post Type:** `explore-wall`

Invisible collision boundaries that prevent character movement through specific areas.

### Configuration

- **Area** (`explore-area`): Where the wall exists
- **Position**: top, left, height, width (defines the blocked rectangle)

### Use Cases

- Create impassable obstacles
- Define building exteriors
- Block areas until missions complete
- Guide player movement

### Visual Design

Walls are invisible but should align with visual boundaries on your map image (building walls, cliffs, fences, etc.).

### Example

```
Title: Castle Wall
Area: castle-exterior

Top: 1500
Left: 2000
Height: 500
Width: 50

(Blocks movement through castle wall graphic)
```

## Minigames

**Post Type:** `explore-minigame`

Interactive game-within-game experiences with custom rules.

### Configuration

- **Area** (`explore-area`): Where minigame trigger appears
- **Minigame Trigger**: Trigger zone (top, left, height, width)
- **Trigger Type**: `auto` or `engagement`

### Content

- **Post Content**: Minigame interface (use blocks to design layout)
- **Images**: Minigame assets
- **Groups**: Organize minigame UI elements

### Rewards

- **Value** (`explore-value`): Completion reward
- **Value Type**: Reward type

### Use Cases

- Puzzle challenges
- Quick-time events
- Memory games
- Custom interactions

### Example

```
Title: Lock Picking
Area: vault-door

Minigame Trigger:
  Top: 1800
  Left: 2400
  Height: 100
  Width: 100
Trigger Type: engagement

Value: 50
Value Type: point

Content: [Custom lock-picking interface]
```
## Communication Items

**Post Type:** `explore-communicate`

Messages delivered to the player's in-game communication device.

### Configuration

- **Post Content**: Message text
- **Featured Image**: Sender avatar or icon
- **Communication Type Taxonomy**: Categorize by device type

### Triggering

Communications are triggered by cutscenes using the `explore-engage-communicate` field.

### Use Cases

- Story updates
- Mission briefings
- Character messages
- World lore delivery

### Communication Devices

Define device types through the `explore-communication-type` taxonomy:
- Radio
- Computer Terminal
- Smartphone
- Hologram

### Example

```
Title: Distress Signal
Communication Type: Radio

Content: "This is Captain Jones. We need immediate assistance at coordinates 42, 17."

(Triggered by cutscene)
```

## Object Materialization Patterns

Many object types support materialization - appearing after conditions are met.

### Physical Trigger

```
Materialize Trigger:
  Top: 2000
  Left: 2500
  Height: 100
  Width: 100

(Object appears when player enters this zone)
```

### Cutscene Trigger

```
Materialize After Cutscene: reveal-secret

(Object appears after "reveal-secret" cutscene completes)
```

### Mission Trigger

```
Materialize After Mission: find-the-key

(Object appears after "find-the-key" mission completes)
```

## Best Practices

### Collectible Placement

- Reward exploration with hidden items
- Place valuable items off the main path
- Use materialization to gate progression

### Information Delivery

- Use Signs for detailed/optional information
- Use Explainers for required tutorials
- Use Communications for story updates

### Collision Design

- Align walls with visual boundaries
- Test player movement thoroughly
- Leave clear walkable paths

### Minigame Design

- Keep interactions simple and intuitive
- Provide clear instructions
- Balance difficulty with rewards

## Related Documentation

- **[Missions](missions.md)** - Item triggers and rewards
- **[Cutscenes](cutscenes.md)** - Communication delivery
- **[Characters](characters.md)** - Ability unlocks
- **[Developer Mode](../developer-mode.md)** - Visual object positioning
