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

- **Area** (`explore-area`): Multiselect — area(s) where this item appears
- **Position**: top, left, height, width — required
- **Rotation** (`explore-rotation`): Sprite rotation in degrees
- **Layer** (`explore-layer`): Z-index for visual layering
- **Featured Image**: Visual representation of the item

### Interaction Types

**Interaction Type** (`explore-interaction-type`):
- `collectable` - Collects when touched
- `breakable` - Breaks when interacted with
- `draggable` - Can be dragged to a destination
- `hazard` - Damages player on touch
- `clickable` - Activates when clicked

### Item Behavior

- **Video Override** (`explore-video-override`): Upload a video that replaces the featured image when displayed
- **Interacted Image** (`explore-interacted`): Image shown after the item is interacted with, if it does not disappear
- **Passable** (`explore-passable`): Radio (`yes`/`no`) — whether the player can walk over this item after interaction
- **Disappear** (`explore-disappear`): Radio (`yes`/`no`) — whether this item is removed from the map after interaction
- **Is Strong** (`explore-is-strong`): Radio (`yes`/`no`) — require the Strength ability to interact with this item

### Rewards

- **Value** (`explore-value`): Reward amount
- **Value Type** (`explore-value-type`): `point`, `mana`, `health`, `money`

### Materialization

Items can appear or disappear based on conditions:
- **Materialize Trigger** (`explore-materialize-item-trigger`): Physical trigger zone
- **Materialize After Cutscene**: Appears after a specific cutscene
- **Materialize After Mission**: Appears after a specific mission
- **Remove After Cutscene** (`explore-remove-after-cutscene`): Multiselect — removed after any selected cutscene completes
- **Remove After Mission** (`explore-remove-after-mission`): Removed after a specific mission completes

### Draggable Configuration

**Drag Destination** (`explore-drag-dest`): Define the target zone and outcome for a draggable item.

**Subfields:**
- `top`, `left`, `width`, `height` — destination zone coordinates
- `image` — optional image shown at the destination
- `mission` — mission completed when item is dragged here
- `remove-after` — radio (`yes`/`no`): whether the item is removed on successful drop
- `offset` — pixel offset applied to placement
- `materialize-after-cutscene` — makes the destination appear after a cutscene

### Timer Configuration

**Timer** (`explore-timer`): Configure this item as part of a timed interaction sequence.

**Subfields:**
- `time` — duration in milliseconds
- `trigger` — another item that this timer references

### Minigame Association

**Minigame** (`explore-minigame`): Select a minigame that starts when this item is interacted with.

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
Disappear: yes
```

## Signs and Focus View

**Post Type:** `explore-sign`

Objects players can examine closely, displaying detailed images or text.

### Configuration

- **Area** (`explore-area`): Multiselect — area(s) where this sign appears
- **Position**: top, left, height, width — required; defines the trigger zone the player interacts with
- **Featured Image**: Trigger image (what appears on the map)
- **Post Content**: What displays when examined (supports all WordPress blocks — use Image blocks for readable documents, artwork, or detailed visuals)

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

- **Area** (`explore-area`): Multiselect — area(s) where the explainer appears. Also supports the special value `lose-message` to display this explainer as the game-over message.
- **Explainer Trigger** (`explore-explainer-trigger`): Required trigger zone (top, left, height, width) that activates the explainer
- **Position** (top, left, height, width): The explainer's display position and size (used for `map` and `menu` types; width acts as max-width for `fullscreen`)

### Display Type

**Explainer Type** (`explore-explainer-type`): Required radio field.

- `map` - Fixed in the game map at the configured position
- `menu` - Floating in the HUD overlay
- `fullscreen` - Centered overlay across the screen

### Arrow Configuration

**Explainer Arrow** (`explore-explainer-arrow`): Configure a pointer arrow that highlights what the explainer refers to.

**Subfields:**
- `orientation` — radio: `top` or `bottom` (arrow faces up or down)
- `side` — radio: `left` or `right` (arrow is on left or right side)
- `rotate` — number: additional rotation in degrees

### Sound and Music

- **Sound Byte** (`explore-sound-byte`): Upload an audio file (voice narration or sound) that plays when the explainer appears
- **Mute Music** (`explore-mute-music`): Radio (`yes`/`no`) — mute area music while this explainer is displayed

### Behavior

- **Click to Close** (`explore-click-close`): Radio (`yes`/`no`) — allow clicking the explainer to dismiss it

### Materialization

- **Materialize Trigger** (`explore-materialize-item-trigger`): Physical trigger zone that reveals this explainer
- **Remove After Cutscene** (`explore-remove-after-cutscene`): Multiselect — removed after any selected cutscene completes
- **Materialize After Cutscene**: Revealed after a specific cutscene
- **Materialize After Mission**: Revealed after a specific mission

### Content

- **Post Content**: Explanation text (supports WordPress blocks)
- **Featured Image**: Optional illustration

### Use Cases

- Tutorial messages
- Gameplay hints
- Control explanations
- Story context
- Game-over / lose message (set area to `lose-message`)

### Example

```
Title: Combat Tutorial
Area: training-grounds

Explainer Type: map
Explainer Trigger:
  Top: 2200
  Left: 2600
  Height: 100
  Width: 100

Position:
  Top: 2300
  Left: 2600
  Height: 120
  Width: 300

Explainer Arrow:
  Orientation: top
  Side: left
  Rotate: 0

Sound Byte: combat-tutorial-voice.mp3
Click to Close: yes

Content: "Press SPACE to attack enemies!"
```

## Walls

**Post Type:** `explore-wall`

Invisible collision boundaries that prevent character movement through specific areas.

### Configuration

- **Area** (`explore-area`): Multiselect — area(s) where this wall exists
- **Position**: top, left, height, width — required; defines the blocked rectangle

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

Interactive draggable puzzle experiences.

### Configuration

- **Area** (`explore-area`): Multiselect — area(s) where this minigame appears
- **Minigame Type** (`explore-minigame-type`): Required. Currently only `draggable` is supported.
- **Mission** (`explore-mission`): The mission that completes when this minigame is successfully finished

### Draggable Items

**Draggable Items** (`explore-draggable-items`): Repeater defining the objects the player must drag.

**Subfields per item:**
- `draggable-item` — Upload: the draggable image
- `width` — width in pixels
- `height` — height in pixels

The featured image is used as the minigame background.

### Binary Translation

**Translate Binary Word** (`explore-translate-binary-word`): Optional text field. If set, the player must translate this word into binary as a step in completing the minigame.

### Audio

**Minigame Music** (`explore-minigame-music`): Background music that plays while the minigame is active.

### Example

```
Title: Circuit Puzzle
Area: lab-room

Minigame Type: draggable
Featured Image: circuit-board-background.png

Draggable Items:
  Item 1: resistor.png, 40×40
  Item 2: capacitor.png, 40×40

Mission: repair-circuit

Minigame Music: puzzle-music.mp3
```
## Communication Items

**Post Type:** `explore-communicate`

Messages delivered to the player's in-game communication device.

### Configuration

- **Area** (`explore-area`): Multiselect — area(s) where this communication trigger appears
- **Trigger Position**: top, left, height, width — the trigger zone in the area
- **Communication Type** (`explore-communicate-type`): Required radio field
  - `text` — delivered as a text message
  - `voicemail` — delivered as a voice message
- **Post Content**: Message text or content
- **Featured Image**: Sender avatar or icon

### Triggering

Communications can be triggered in two ways:
1. By a cutscene: set the `explore-engage-communicate` field on the cutscene to this communication item
2. By a trigger zone in the area (position fields above)

### Materialization

- **Materialize Trigger** (`explore-materialize-item-trigger`): Physical trigger zone to reveal this communication
- **Remove After Cutscene** (`explore-remove-after-cutscene`): Multiselect — removed after any selected cutscene
- **Materialize After Cutscene**: Revealed after a specific cutscene
- **Materialize After Mission**: Revealed after a specific mission

### Use Cases

- Story updates
- Mission briefings
- Character messages
- World lore delivery

### Example

```
Title: Distress Signal
Area: space-station

Trigger Position:
  Top: 2000
  Left: 2500
  Height: 100
  Width: 100

Communication Type: voicemail
Featured Image: captain-avatar.png

Content: "This is Captain Jones. We need immediate assistance."
```

## Magic and Abilities

**Post Type:** `explore-magic`

Special powers (spells) the player can unlock. Abilities are categorized using the `magic-type` taxonomy.

### Configuration

- **Post Title**: The spell name (used as identifier)
- **Post Slug**: Used as the spell identifier in the `/addspell/` REST endpoint
- **Post Content**: Spell description and imagery (supports `core/paragraph` and `core/image` blocks)
- **Featured Image**: Spell icon

### Categorization

Assign a `magic-type` taxonomy term to each spell:
- `offense` — Offensive spells
- `defense` — Defensive spells

Custom terms can be added through **Orbem Studio** → **Magic Types** in the admin.

### Unlocking Spells

Spells are granted to players via the REST endpoint:

```
POST /wp-json/orbemorder/v1/addspell/
{ "spellid": "fireball" }
```

See the [API documentation](../api/gameplay-endpoints.md) for full details.

### Use Cases

- Combat spells unlocked after story events
- Defensive abilities granted as mission rewards
- Special powers tied to crew mate recruitment

### Example

```
Title: Fireball
Slug: fireball
Magic Type: offense

Featured Image: fireball-icon.png
Content: "Launches a ball of fire at enemies."
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
