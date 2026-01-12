=== Orbem Studio ===
Contributors: orbemorder, scottstorebloom, scottmweaver
Donate link: https://www.patreon.com/c/OrbemOrder
Tags: game engine, rpg, storytelling, gamification, narrative game
Requires at least: 6.1
Tested up to: 6.9
Requires PHP: 8.1
Stable tag: 1.0.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Build fully interactive, story-driven games directly inside WordPress. No external engines required!

== Description ==

**Orbem Studio** turns WordPress into a fully featured, browser-based game engine.

Design immersive, map-driven experiences with characters, missions, cutscenes, items, abilities, and progression systems all managed through WordPress’ familiar admin interface.

Orbem Studio is built for developers and creators who want real gameplay, not just gamified UI. It provides structured systems, performance-focused architecture, and developer tooling that allows complete games to be authored, played, and extended entirely within WordPress.

Whether you’re building a narrative RPG, an educational experience, or an experimental interactive world, Orbem Studio gives you the tools to ship.

== Key Features ==

= 🎮 Full Front-End Game Engine =
* Real-time player movement
* Interactive maps and collision-aware elements
* Directional character asset and animations assignments
* Trigger-based interactions

= 🧩 Modular Game Objects =
* Areas, missions, cutscenes, enemies, items, explainer popups, focus view items, weapons, and characters
* All content managed as WordPress custom post types using proprietary custom fields
* Fully extensible metadata-driven design

= 🧠 Mission & Progression System =
* Branching mission chains
* Conditional triggers and unlocks
* Persistent player state
* Health, mana, power, experience, currency, and leveling

= 🛠 Developer Mode (Admin-Only) =
* Live in-game object/character placement
* Visual trigger overlays
* Admin-only editing tools
* Level selector for easy level building
* Rapid iteration without page reloads
* Front end wall-builder

= 📦 Inventory & Equipment System =
* Storage limits
* Weapons, gear, and consumables
* Equip / unequip logic
* Character-bound equipment support

= 🔊 Media-Rich Storytelling =
* Cutscenes and scripted events
* Per-area & per-cutscene music
* Sound effects and audio triggers
* Intro videos and cinematic playback

= 🔐 Secure & Performant =
* REST API–based architecture
* Permission-aware custom endpoints
* Subscriber-safe gameplay routes
* Optimized meta access and caching strategies

= 🧑‍💻 Built for Developers =
* Clean, modern PHP architecture
* Environment-aware behavior (local vs production)
* Extensible via hooks and filters
* No hard dependency on third-party services

== Use Cases ==

* Narrative RPGs
* Interactive fiction
* Educational games
* Gamified onboarding
* Experimental storytelling
* Browser-based adventure games

If it can be represented spatially and interactively, Orbem Studio can power it.

== Screenshots ==

1. Live gameplay view showing player movement, HUD, missions, and interactive map elements.
2. Developer Mode overlay with visual triggers and in-game editing tools.
3. Inventory and character management panels.
4. Global config options.

== Installation ==

1. Upload the `orbem-studio` folder to `/wp-content/plugins/`
2. Activate the plugin through the **Plugins** menu in WordPress
3. Follow setup steps in the global game settings under **Orbem Studio** in the admin menu
4. Publish the page and begin building your game world

== External Services ==

This plugin connects to third-party services to provide optional functionality related to authentication and text-to-speech features.

= Google Text-to-Speech API =

Orbem Studio can optionally use the Google Text-to-Speech API to generate spoken audio for in-game dialogue and narration.

What the service is used for:
The service is used to convert in-game cutscene and explainer popup text content into synthesized speech audio.

What data is sent and when:
When text-to-speech is enabled by the site administrator and triggered by player interaction, the plugin sends the following data to Google:
- The text content to be synthesized
- The configured language and voice parameters
- The API key provided by the site administrator

No personal user data is sent by default. The text content is only sent at the moment audio generation is requested.

Service provider:
Google LLC

Terms of Service:
https://cloud.google.com/terms

Privacy Policy:
https://policies.google.com/privacy


= Google OAuth / Token Verification =

Orbem Studio supports optional Google Sign-In functionality to allow users to authenticate using their Google account.

What the service is used for:
The service is used to verify the authenticity of a Google ID token during login.

What data is sent and when:
When a user logs in using Google Sign-In, the plugin sends:
- The Google ID token provided by the user’s browser

This request is made once per login attempt to verify the token’s validity. The plugin does not store Google credentials.

Service provider:
Google LLC

Terms of Service:
https://developers.google.com/identity/terms

Privacy Policy:
https://policies.google.com/privacy

== Frequently Asked Questions ==

= Does this require an external game engine? =
No. Orbem Studio runs entirely inside WordPress.

= Is this plugin for developers only? =
Developers can extend the game engine if desired, but non-technical creators can build complete experiences using the admin interface alone.

= Can subscribers play the game? =
Yes. Gameplay routes are designed to support subscribers and logged-in users safely.

= Can guests play without logging in? =
This is configurable. You can require login or allow guest gameplay depending on your settings. (Note: logged-out users will not have persisted game play data)

= Is Orbem Studio extensible? =
Yes. All systems are designed to be extended using WordPress hooks, filters, and custom metadata.

= Where can I find documentation for Orbem Studio? =
We have extensive documentation at https://orbemorder.com/orbem-studio/docs/readme. Tutorials can be found on our channel at https://youtube.com/@orbemorder.

== Changelog ==

= 1.0.3 =
* Add required field logic.
* Add field groups in post types.
* Update label messages for clarity.

= 1.0.2 =
* Fix activation tutorial.

= 1.0.1 =
* Fix Gutenberg block limitations on non-game post types.

= 1.0.0 =
* Initial public release
* Core game engine
* Developer Mode
* Mission, inventory, and progression systems
* Secure REST-based architecture

== Upgrade Notice ==

= 1.0.0 =
First stable release.
