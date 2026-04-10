=== Orbem Studio ===
Contributors: orbemorder, scottstorebloom, scottmweaver
Donate link: https://www.patreon.com/c/OrbemOrder
Tags: game engine, rpg, storytelling, gamification, narrative game
Requires at least: 6.1
Tested up to: 6.9
Requires PHP: 8.1
Stable tag: 1.3.12
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
4. Publish the page or auto generate one and begin building your game world

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

= 1.3.12 =
* Add dead image animation.
* Tighten runner enemy attack ability

= 1.3.11 =
* Add sound to hurt for enemy/main.
* Add hurt animation options.

= 1.3.10 =
* Stop walking sound when explainer open.
* Fix mobile dpad width.
* Fix zindex on dpad.

= 1.3.9 =
* Enhance cutscene instruction.
* Fix click next target for cutscenes.

= 1.3.8 =
* Fix mobile enemy targeting.
* Fix custom css code styles.

= 1.3.7 =
* Color code devmode triggers
* Fix mobile combat hitbox.

= 1.3.6 =
* allow enemy kill logged out.

= 1.3.5 =
* Remove item after mission.
* Fix enemy trigger mission.

= 1.3.4 =
* Fix duplicate game options menu.
* Remove ghost enemies.

= 1.3.3 =
* Optimize combat.
* Fix broken index.
* Add lose message option.
* Fix after mission cutscene trigger.
* Add custom css menu.

= 1.3.2 =
* Add obstacle avoidance to runner enemy.
* Add weapons sound.
* Add enemy sound.
* Fix mobile hit.
* Fix mobile start position.

= 1.3.1 =
* Fix meta labels for selects.
* Unrestrict page type for game page.
* Multi select enemy triggers for mission.
* Force scroll behavior on site to allow movement.
* Speed up enemy runner attack.
* Allow enemy trigger after cutscene.

= 1.3.0 =
* Add runner enemy logic.
* Add health bars to enemies.
* Add enemy hurt animation.
* Add enemy attack image logic.
* Remove character image required.


= 1.2.6 =
* Fix cutscene size and position.
* Fix mobile walking/action key.

= 1.2.5 =
* Version fix.

= 1.2.4 =
* Fix cutscene autoplay without voice.
* Add multiselect for areas in meta.

= 1.2.3 =
* Add materialize after explainer close for cutscenes.
* Add clickable close option for explainer.

= 1.2.2 =
* Add mobile start screen option.
* Allow more content in explainers.
* Fix menu zindex.

= 1.2.1 =
* Fix new game reset.
* Add mission complete on focus view.
* Add item triggers for cutscenes.
* Add mobile controls.
* Remove hardcoded explainer background.
* Make cutscene multiselect.

= 1.2.0 =
* Fix dev mode engage.
* Add player name selection option.
* Add remove/materialize cutscene triggers for focus view.
* Fix some select meta fields.
* Add clickable interaction state for items.

= 1.1.10 =
* Fix draggable items.
* Remove logged in dependency for get calls.

= 1.1.9 =
* Update select meta field to display titles.
* Fix draggable items when logged out.

= 1.1.8 =
* Make npc movement after or before cutscene option.
* Stop passable characters from stopping when touching main character.
* Allow auto next dialogue without voice.
* Fix first dialogue rush issue.

= 1.1.7 =
* Remove main character hard coded width.
* Add option to choose storage menu tabs.

= 1.1.6 =
* Fix cutscene removal typo.
* Allow all blocks for explainer content editor.
* Fix mobile scroll event.
* Add mobile action key.

= 1.1.5 =
* Add cutscene removal feature.
* Fix margin after cutscene trigger.
* Fix select array var error.

= 1.1.4 =
* Add option to make characters passable.
* Fix meta field array select data saves.
* Add option to no offer login.

= 1.1.3 =
* Fix console error for cutscenes without main character.

= 1.1.1 =
* Enable materialize after mission function.
* Remove disruptive required fields.
* Fix console error for cutscenes without main character.
* Fix money console error.

= 1.1.0 =
* Fix collectable interacted state.
* Add game generate to wizard.
* Fix dev mode visibility.
* Add deactivation option data removal.
* Fix empty point console error.
* Fix admin menu collapse for submenus.

= 1.0.5 =
* Fix wall builder.
* Fix materialize item trigger.
* Add disable image upload scaling for map uploads.

= 1.0.4 =
* Fix setup wizard trigger.
* Add collapsible groups for non required.
* Fix required fields logic on Gutenberg enabled pages.
* Fix character image issue.

= 1.0.3 =
* Add required field logic.
* Add field groups in post types.
* Update label messages for clarity.
* Limit admin assets

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
