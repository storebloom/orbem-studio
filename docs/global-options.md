# Global Options

Global Options configure game-wide settings that affect all areas, characters, and gameplay systems. These settings are managed through the WordPress admin interface.

## Table of Contents

- [Accessing Global Options](#accessing-global-options)
- [Core Game Settings](#core-game-settings)
- [HUD Configuration](#hud-configuration)
- [Visual Customization](#visual-customization)
- [External Integrations](#external-integrations)
- [Audio Settings](#audio-settings)

## Accessing Global Options

Navigate to **Orbem Studio** → **Game Options** in your WordPress admin dashboard.

## Core Game Settings

### Page For Game

**Type:** Select (WordPress pages)

The WordPress page that displays your game interface. This page's content will be replaced with the game.

**Setup:**
1. Create a new page (title doesn't matter)
2. Publish the page (content will be overridden)
3. Select this page in Global Options

### Starting Area

**Type:** Select (Areas)

The area where players begin when first loading the game.

**Recommended:** Choose your tutorial or introductory level.

### Main Character

**Type:** Select (Characters)

The character players control at game start.

**Requirements:**
- Must be a character with "Crew Mate" set to "yes"
- Should have all directional sprites uploaded

### Default Weapon

**Type:** Select (Weapons)

The starting weapon for your main character.

**Common Choices:**
- "fist" or "unarmed" for games starting with no weapon
- Basic melee weapon for immediate combat capability

### Require Login

**Type:** Checkbox

Control whether players must log in to play.

- **Checked:** Users must create accounts (progress is saved)
- **Unchecked:** Anyone can play (progress not persisted for logged-out users)

## HUD Configuration

### HUD Bars

**Type:** Multiselect

Choose which stat bars to display in the heads-up display.

**Options:**
- `health` - Player health points
- `mana` - Magic/energy points
- `power` - Special ability meter
- `money` - In-game currency
- `points` - Experience or score

**Tip:** Only show bars relevant to your game design to avoid UI clutter.

### Custom HUD Icons

Override default interface icons with your own designs.

**Settings Icon**
- **Type:** Upload
- **Use:** Gear/settings menu icon
- **Recommended size:** 32×32px to 64×64px PNG

**Storage Menu Icon**
- **Type:** Upload
- **Use:** Inventory icon
- **Recommended size:** 32×32px to 64×64px PNG

**Hide Storage Menu**
- **Type:** Checkbox
- **Effect:** Completely hide inventory UI if checked

**Crewmate Menu Icon**
- **Type:** Upload
- **Use:** Character switcher icon
- **Recommended size:** 32×32px to 64×64px PNG

**Money Icon**
- **Type:** Upload
- **Use:** Currency symbol in HUD
- **Recommended size:** 24×24px to 48×48px PNG

**Indicator Icon**
- **Type:** Upload
- **Use:** Interaction prompt (shows when objects are interactable)
- **Recommended size:** 32×32px to 64×64px PNG

**Arrow Icon**
- **Type:** Upload
- **Use:** Directional arrows in explainer popups
- **Recommended size:** 32×32px to 64×64px PNG

## Visual Customization

### Cutscene Styling

**Cutscene Border Color**
- **Type:** Color picker
- **Default:** System default
- **Effect:** Border color around cutscene dialogue boxes

**Cutscene Border Size**
- **Type:** Number (pixels)
- **Recommended:** 2-5px
- **Effect:** Thickness of cutscene borders

**Cutscene Border Radius**
- **Type:** Number (pixels)
- **Recommended:** 0-10px
- **Effect:** Rounded corners (0 = sharp corners)

**Cutscene Border Style**
- **Type:** Select
- **Options:** `solid`, `dashed`, `dotted`
- **Effect:** Border line style

**Skip Button Color**
- **Type:** Color picker
- **Effect:** Background color of cutscene skip button
- **Note:** Text is white

### Explainer Styling

**Explainer Border Color**
- **Type:** Color picker
- **Effect:** Border color around explainer popups

**Explainer Border Size**
- **Type:** Number (pixels)
- **Recommended:** 2-5px

**Explainer Border Radius**
- **Type:** Number (pixels)
- **Recommended:** 0-10px

**Explainer Border Style**
- **Type:** Select
- **Options:** `solid`, `dashed`, `dotted`

### Character Styling

**Crewmate Hover Border Color**
- **Type:** Color picker
- **Effect:** Border color when hovering over characters in crew selection menu

## External Integrations

### Google Login (OAuth)

**Google Login ClientID**
- **Type:** Text
- **Purpose:** Enable Google Sign-In for players

**Setup:**
1. Create Google Cloud project
2. Enable Google Sign-In API
3. Create OAuth 2.0 credentials
4. Copy Client ID
5. Paste into this field

**Privacy Note:** Sends Google ID token to Google for verification during login.

### Google Text-to-Speech

**Google TTS API Key**
- **Type:** Text
- **Purpose:** Enable voice narration for cutscenes and explainers

**Setup:**
1. Enable Google Cloud Text-to-Speech API
2. Generate API key
3. Paste into this field

**Privacy Note:** Sends dialogue text to Google for speech synthesis.

**Usage:**
- Assigned character voices speak during cutscenes
- Explainer popups can be narrated
- Requires voice selection in character configuration

## Audio Settings

### Intro Video

**Type:** Upload (MP4, WEBM)

Video that plays when users first visit the game page.

**Specifications:**
- Format: MP4 or WEBM
- Recommended resolution: 1920×1080
- Duration: 10-60 seconds recommended

### Start Screen Music

**Type:** Upload (MP3, WAV, OGG)

Music that plays on the start/login screen (after intro video).

**Specifications:**
- Format: MP3, WAV, or OGG
- Should loop seamlessly
- Recommended length: 1-3 minutes

### Sign In Screen Background

**Type:** Upload (Image or Video)

Background image or video for the start/login screen.

**Specifications:**
- Image: JPG or PNG, 1920×1080 recommended
- Video: MP4 or WEBM

### Walking Sound Effect

**Type:** Upload (MP3, WAV, OGG)

Sound effect that plays when the character walks.

**Specifications:**
- Short footstep sound (0.2-0.5 seconds)
- Will loop while walking
- Should be subtle

### Points Sound Effect

**Type:** Upload (MP3, WAV, OGG)

Sound that plays when completing missions or collecting items.

**Specifications:**
- Short reward sound (0.5-2 seconds)
- Clear and satisfying
- Indicates achievement

## Configuration Examples

### Minimal Setup

```
Page For Game: Play Game
Starting Area: level-1
Main Character: hero
Default Weapon: fist
Require Login: unchecked

HUD Bars: health, points
(All other settings: defaults)
```

### Full-Featured Setup

```
Page For Game: Play Now
Starting Area: tutorial-zone
Main Character: space-captain
Default Weapon: laser-pistol
Require Login: checked

Google Login ClientID: [your-client-id]
Google TTS API Key: [your-api-key]

HUD Bars: health, mana, power, money
Custom icons: all uploaded
Cutscene border: blue, 3px, rounded
Explainer border: green, 2px, solid

Intro Video: game-intro.mp4
Start Music: title-theme.mp3
Walking Sound: footsteps.mp3
Points Sound: success-chime.mp3
```

## Best Practices

### Performance

- Optimize intro video file size
- Compress audio files without quality loss
- Use appropriate image sizes for icons

### User Experience

- Keep intro video under 30 seconds
- Make HUD icons clearly distinguishable
- Use consistent visual styling across all borders
- Test color contrast for accessibility

### Security

- Never commit API keys to version control
- Use environment-specific API keys (dev vs production)
- Document external service dependencies

### Testing

- Test with and without login requirement
- Verify Google integrations work correctly
- Check all custom icons appear properly
- Test on different screen sizes

## Saving Changes

Click **Save Changes** at the bottom of the Global Options page to apply your configuration.

**Note:** Some changes (like page selection) may trigger plugin setup flows.

## Related Documentation

- **[Getting Started](getting-started.md)** - Initial configuration walkthrough
- **[Areas](game-objects/areas.md)** - Starting area setup
- **[Characters](game-objects/characters.md)** - Main character configuration
- **[Weapons](game-objects/weapons.md)** - Default weapon setup
