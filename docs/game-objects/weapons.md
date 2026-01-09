# Weapons

Weapons are combat items that determine how characters deal damage to enemies. Orbem Studio supports both melee and projectile weapons with configurable attack values and visual representations.

## Table of Contents

- [Overview](#overview)
- [Creating a Weapon](#creating-a-weapon)
- [Configuration Fields](#configuration-fields)
- [Weapon Types](#weapon-types)
- [Making Weapons Collectible](#making-weapons-collectible)
- [Character-Weapon Integration](#character-weapon-integration)
- [Best Practices](#best-practices)
- [Examples](#examples)

## Overview

**Post Type:** `explore-weapon`

Weapons define the combat capabilities of playable characters. Each weapon has attack power values for different attack types, can be melee or ranged, and appears both in the inventory system and optionally as collectible items on the map.

### Key Features

- Three attack power levels (normal, heavy, charged)
- Melee and projectile weapon types
- Collectible placement on maps
- Default weapon assignment for characters
- Character-specific weapon sprites
- Materialization system (appear after conditions)

## Creating a Weapon

1. Navigate to **Orbem Studio** → **Weapons**
2. Click **Add New**
3. Enter a weapon name (e.g., "Energy Sword" or "Plasma Rifle")
4. Configure meta fields in the Configuration box
5. Upload a featured image for the weapon icon
6. Click **Publish**

## Configuration Fields

### Featured Image

The featured image represents the weapon in the inventory system and when placed on the map as a collectible.

**Specifications:**
- **Format:** PNG with transparency
- **Recommended size:** 80px × 80px to 120px × 120px
- **Style:** Match your game's art aesthetic

**Tips:**
- Use consistent lighting across all weapon icons
- Include enough detail to be recognizable
- Consider silhouette clarity at small sizes

### Attack Values

**Field:** `explore-attack`  
**Type:** Complex (three number subfields)

Define damage values for three attack types.

#### Normal Attack

**Subfield:** `normal`  
**Type:** Number

Standard attack damage. This is the primary attack players will use most frequently.

**Example:** `10`

**Design Considerations:**
- Should allow defeating weak enemies in 2-4 hits
- Balance against player's attack frequency
- Starting weapons typically: 5-15 damage

#### Heavy Attack

**Subfield:** `heavy`  
**Type:** Number

Charged or power attack damage. Usually requires longer animation or special input.

**Example:** `20`

**Typical Ratio:** 1.5-2.5× normal attack damage

**Use Cases:**
- Breaking through enemy defenses
- Dealing with armored enemies
- Risk-reward gameplay (longer animation, more damage)

#### Charged Attack

**Subfield:** `charged`  
**Type:** Number

Maximum power attack. Often requires buildup time or resource consumption.

**Example:** `35`

**Typical Ratio:** 2.5-4× normal attack damage

**Balance:**
- Should feel powerful and satisfying
- Long charge time or resource cost prevents spam
- Excellent for boss fights

**Example Attack Configuration:**
```
Normal: 10
Heavy: 20
Charged: 35
```

### Projectile Mode

**Field:** `explore-projectile`  
**Type:** Radio (`yes` or `no`)

Determines if the weapon is melee or ranged.

#### Melee Weapons

**Setting:** `no`

Weapon strikes enemies adjacent to the character.

**Characteristics:**
- Immediate damage on attack animation
- Requires close proximity to enemies
- Typically faster attack speed
- No ammunition concerns

**Best For:**
- Swords, clubs, fists
- High-risk, high-reward gameplay
- Fast-paced combat

#### Projectile Weapons

**Setting:** `yes`

Weapon fires projectiles that travel across the screen.

**Characteristics:**
- Ranged damage delivery
- Projectiles travel until hitting enemy or boundary
- Allows safe combat distance
- Visual projectile uses weapon icon

**Best For:**
- Guns, bows, magic staffs
- Strategic positioning gameplay
- Avoiding direct enemy contact

**Example:**
```
Projectile: yes (This is a laser gun)
```

### Value Type

**Field:** `explore-value-type`  
**Type:** Select

Categorizes the item type for inventory management.

**Current Options:**
- `weapons` - Standard weapon type

**Note:** This field is primarily for internal categorization and future extensibility.

### Map Placement (Optional)

If you want the weapon to appear as a collectible item on the map, configure these fields.

#### Area

**Field:** `explore-area`  
**Type:** Select

The area where this weapon appears as a collectible.

**Example:** Select "armory" to place the weapon in that area.

#### Position

**Fields:**
- `explore-top` - Vertical position in pixels
- `explore-left` - Horizontal position in pixels
- `explore-height` - Display height in pixels
- `explore-width` - Display width in pixels

**Example:**
```
Top: 2200
Left: 3000
Height: 60
Width: 80
```

**Tips:**
- Place weapons in visually interesting or challenging locations
- Use height/width to make important weapons more prominent
- Consider sight lines and player pathing

#### Visual Properties

**Field:** `explore-rotation`  
**Type:** Number  
**Unit:** Degrees

Rotate the weapon sprite on the map.

**Example:**
```
Rotation: 45 (Diagonal placement for visual interest)
```

**Field:** `explore-layer`  
**Type:** Number

Z-index for layering. Higher numbers appear in front.

**Example:**
```
Layer: 5 (Appears above most map elements)
```

### Materialization System

Control when weapons become available.

#### Materialize Trigger

**Field:** `explore-materialize-item-trigger`  
**Type:** Trigger zone

Define a physical trigger that reveals this weapon.

**Subfields:**
- `top` - Trigger top coordinate
- `left` - Trigger left coordinate
- `height` - Trigger height
- `width` - Trigger width

**Example:**
```
Weapon is hidden until player walks to a specific location

Materialize Trigger:
  Top: 2500
  Left: 2800
  Height: 100
  Width: 100
```

#### Materialize After Cutscene

**Field:** `explore-materialize-after-cutscene`  
**Type:** Select (list of cutscenes)

Weapon appears after a specific cutscene completes.

**Example:**
```
Materialize After Cutscene: forge-sword
(Weapon appears after blacksmith cutscene)
```

#### Materialize After Mission

**Field:** `explore-materialize-after-mission`  
**Type:** Select (list of missions)

Weapon appears after a specific mission is completed.

**Example:**
```
Materialize After Mission: defeat-armory-boss
(Legendary weapon appears after boss is defeated)
```

#### Remove After Cutscene

**Field:** `explore-remove-after-cutscene`  
**Type:** Select (list of cutscenes)

Weapon disappears after a cutscene.

**Example:**
```
Remove After Cutscene: weapon-stolen
(Weapon is taken away during story event)
```

## Weapon Types

### Melee Weapons

**Configuration:**
```
Projectile: no
Attack values: Typically higher than ranged
```

**Examples:**
- Swords and blades
- Clubs and hammers
- Fists and martial arts
- Energy melee weapons

**Balance Considerations:**
- Higher damage to compensate for risk
- Faster attack speed
- Encourage aggressive gameplay

### Projectile Weapons

**Configuration:**
```
Projectile: yes
Attack values: Typically lower than melee
```

**Examples:**
- Guns and firearms
- Bows and crossbows
- Magic projectiles
- Thrown weapons

**Balance Considerations:**
- Lower damage balanced by safety
- Slower attack speed
- Encourage strategic positioning
- Consider projectile speed in gameplay

### Starter Weapons

**Configuration:**
```
Attack - Normal: 5-10
Attack - Heavy: 10-15
Attack - Charged: 15-25
```

Balanced for early game content. Often melee to teach combat basics.

**Example:** Basic sword, training weapon, fists

### Mid-Tier Weapons

**Configuration:**
```
Attack - Normal: 15-25
Attack - Heavy: 25-40
Attack - Charged: 40-60
```

Rewards for mid-game progression. Can be melee or ranged.

**Example:** Upgraded sword, laser pistol

### Legendary Weapons

**Configuration:**
```
Attack - Normal: 30-50
Attack - Heavy: 60-90
Attack - Charged: 100-150
```

Rare, powerful weapons often tied to major story beats or difficult challenges.

**Example:** Ancient artifact, boss weapon

## Making Weapons Collectible

To place a weapon on the map for players to find:

### Step 1: Configure Map Placement

```
Area: treasure-vault
Top: 1500
Left: 2000
Height: 70
Width: 90
Rotation: 0
Layer: 10
```

### Step 2: (Optional) Add Conditions

Use materialization to gate the weapon behind progression:

```
Materialize After Mission: open-vault
```

Or use a physical trigger:

```
Materialize Trigger:
  Top: 1400
  Left: 1900
  Height: 200
  Width: 200
(Weapon appears when player enters treasure room)
```

### Step 3: Test Collection

1. Play the game
2. Navigate to the weapon's area and position
3. Touch the weapon to collect it
4. Verify it appears in inventory

## Character-Weapon Integration

Weapons integrate with the character system for visual consistency.

### Default Weapons

Set a weapon as a character's default in the character configuration:

```
Character: Main Hero
Weapon Choice: starter-sword
```

This weapon is equipped when:
- Starting the game
- Recruiting the character
- After respawn (if applicable)

### Weapon-Specific Character Sprites

For playable characters, upload unique sprites for each weapon. See [Characters - Weapon-Specific Images](characters.md#weapon-specific-images).

**Example sprite names:**
- `static-down-laser-rifle.png`
- `up-punch-energy-sword.png`
- `left-ancient-staff.png`

### Switching Weapons

Players can switch weapons through the inventory system during gameplay. The character's sprites automatically update to match the equipped weapon.

## Best Practices

### Attack Value Progression

Design weapon progression that feels rewarding:

```
Early Game:
  Weapon 1: Normal: 8,  Heavy: 15, Charged: 25
  Weapon 2: Normal: 12, Heavy: 22, Charged: 35

Mid Game:
  Weapon 3: Normal: 18, Heavy: 32, Charged: 50
  Weapon 4: Normal: 25, Heavy: 45, Charged: 70

Late Game:
  Weapon 5: Normal: 35, Heavy: 65, Charged: 100
  Weapon 6: Normal: 50, Heavy: 90, Charged: 150
```

### Melee vs. Ranged Balance

**Melee Advantages:**
- 1.5× damage of equivalent ranged
- Faster attack speed
- No projectile travel time

**Ranged Advantages:**
- Safety from distance
- Can attack flying/elevated enemies
- Better for mobile enemies

### Weapon Variety

Offer weapons with different playstyles:

- **Fast/Weak:** High attack speed, lower damage
- **Slow/Strong:** Low attack speed, higher damage
- **Balanced:** Middle ground
- **Special:** Unique mechanics or effects

### Visual Design

**Icon Clarity:**
- Weapon type should be obvious from icon
- Use color coding (blue = energy, brown = wood, grey = metal)
- Include distinctive silhouettes

**In-World Placement:**
- Make important weapons visually prominent
- Use lighting or effects to draw attention
- Position in narratively appropriate locations

### Collectible Placement Strategy

**Hidden Weapons:**
- Off the main path
- Behind optional challenges
- Rewards exploration

**Story Weapons:**
- Given during cutscenes
- Materialize after missions
- Tied to character progression

**Challenge Weapons:**
- Behind difficult enemy encounters
- Require specific abilities to reach
- Gate late-game content

## Examples

### Example 1: Starting Melee Weapon

```
Title: Iron Sword
Slug: iron-sword

Featured Image: iron-sword-icon.png

Attack:
  Normal: 10
  Heavy: 18
  Charged: 30

Projectile: no
Value Type: weapons

(Not placed on map - assigned as default weapon)
```

### Example 2: Mid-Tier Ranged Weapon

```
Title: Laser Pistol
Slug: laser-pistol

Featured Image: laser-pistol-icon.png

Attack:
  Normal: 15
  Heavy: 28
  Charged: 45

Projectile: yes
Value Type: weapons

Area: research-lab
Top: 1800
Left: 2400
Height: 60
Width: 80
Rotation: 0
Layer: 8
```

### Example 3: Hidden Legendary Weapon

```
Title: Ancient Staff
Slug: ancient-staff

Featured Image: ancient-staff-icon.png

Attack:
  Normal: 40
  Heavy: 75
  Charged: 120

Projectile: yes
Value Type: weapons

Area: hidden-temple
Top: 2200
Left: 3500
Height: 100
Width: 70
Rotation: 0
Layer: 10

Materialize After Mission: solve-temple-puzzle
```

### Example 4: Boss Reward Weapon

```
Title: Dragon Slayer Blade
Slug: dragon-slayer

Featured Image: dragon-slayer-icon.png

Attack:
  Normal: 50
  Heavy: 95
  Charged: 150

Projectile: no
Value Type: weapons

Area: dragon-lair
Top: 2500
Left: 2500
Height: 90
Width: 110
Rotation: 45
Layer: 10

Materialize After Cutscene: dragon-defeated
```

## Related Documentation

- **[Characters](characters.md)** - Weapon assignment and sprites
- **[Enemies](enemies.md)** - Combat balancing
- **[Items and Triggers](items-and-triggers.md)** - Collectible system
- **[Missions](missions.md)** - Weapon rewards
- **[Global Options](../global-options.md)** - Default weapon setting
