=== Orbem Studio ===
Contributors: orbemorder, scottstorebloom, scottmweaver
Donate link: https://www.patreon.com/c/OrbemOrder
Tags: game engine, rpg, storytelling, gamification, narrative game
Requires at least: 6.1
Tested up to: 6.9
Requires PHP: 8.1
Stable tag: 1.4.3
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Build fully playable, browser-based games directly inside WordPress. No canvas. No external engine. Just a plugin.

== Description ==

**Orbem Studio** is a no-code browser game engine that runs entirely inside WordPress.

Build real games with combat, NPCs, missions, inventory, cutscenes, boss fights. Publish them as a URL on your own site. No Unity. No canvas. No downloads. Your game lives on a WordPress page.

The engine handles movement, collision, triggers, progression, and state entirely through WordPress systems. If you can install a plugin, you can build a game.

= Why Developers Use Orbem Studio =

Most browser game tools require canvas, external libraries, or separate hosting. Orbem Studio runs inside WordPress itself. Your game is a page on your site and shareable as a URL, playable in any browser, no app store required.

The simultaneous build and playtest workflow means you place an object and immediately walk your character into it to test. No mode switching. No recompiling. Just build and play.

= What You Can Build =

Orbem Studio ships with systems for:

* Combat with directional attacks, heavy attacks, charged attacks, and boss fight mechanics
* Enemies with wander, runner, and projectile behaviors, health bars, and hurt animations
* Missions and progression with branching chains, conditional triggers, and persistent player state
* Cutscenes and scripted events with per-area music, sound effects, and cinematic playback
* Inventory with weapons, gear, consumables, and equip logic
* Mobile controls with d-pad support and landscape mode
* Developer mode with live object placement, visual trigger overlays, and a front end wall builder

= Proven in Production =

Games built with Orbem Studio:

* [One Wizard Wrong Forest](https://orbemstudio.itch.io/one-wizard-wrong-forest) -- fantasy brawler with goblin combat and a tree golem boss
* [Cemetery Showdown](https://orbemstudio.itch.io/cemetery-showdown) -- zombie combat game
* [30 minute build demo](https://youtu.be/TS3HI2M5vH0) -- watch a complete game built from scratch

= Getting Started =

Install the plugin, click Generate a Starter Game, and you have a playable game running on your WordPress site in under 60 seconds. No configuration required to get started.

Or sign up at [orbem.studio](https://orbem.studio) to build and host your game without your own WordPress site.

= Key Features =

**Game Engine**

* Full browser game engine running inside WordPress with no external dependencies
* Real-time player movement and collision
* Simultaneous build and playtest -- no mode switching or recompiling

**Combat System**

* Directional attacks, heavy attacks, and charged attacks
* Boss fight mechanics with phase transitions and pulse wave attacks
* Enemy AI with wander, chase, runner, and projectile behaviors
* Enemy health bars, hurt animations, and death states

**Missions and Progression**

* Branching mission chains with conditional triggers
* Persistent player state across sessions
* Health, mana, power, experience, currency, and leveling systems
* Unlock and materialize triggers

**Cutscenes and Storytelling**

* Scripted cutscene events with dialogue and voice
* Per-area and per-cutscene music
* Sound effects and audio triggers
* Intro videos and cinematic playback
* Google Text-to-Speech integration for voiced dialogue

**Inventory and Equipment**

* Weapons, gear, and consumables
* Equip and unequip logic
* Character-bound equipment support
* Storage limits

**Mobile Support**

* D-pad controls for touch devices
* Landscape mode support
* Mobile-optimized combat hitbox

**Developer Mode**

* Live in-game object and character placement
* Visual trigger overlays
* Front end wall builder
* Level selector for rapid iteration
* Admin-only editing tools

**Architecture**

* REST API based architecture with permission-aware endpoints
* Subscriber-safe gameplay routes
* Optimized meta access and caching
* Extensible via WordPress hooks and filters
* Google OAuth support for player login

= Use Cases =

* Browser-based action games
* Narrative RPGs and interactive fiction
* Educational games and gamified experiences
* Playable demos and interactive product experiences
* Experimental web-native game projects

== Installation ==

1. Upload the `orbem-studio` folder to `/wp-content/plugins/`
2. Activate the plugin through the **Plugins** menu in WordPress
3. Navigate to **Orbem Studio** in the admin menu
4. Click **Generate a Starter Game** to create a playable game instantly
5. Or follow the manual setup steps in Global Game Options to build from scratch

== External Services ==

This plugin connects to third-party services to provide optional functionality related to authentication and text-to-speech features.

= Google Text-to-Speech API =

Orbem Studio can optionally use the Google Text-to-Speech API to generate spoken audio for in-game dialogue and narration.

What the service is used for:
The service is used to convert in-game cutscene and explainer popup text content into synthesized speech audio.

What data is sent and when:
When text-to-speech is enabled by the site administrator and triggered by player interaction, the plugin sends the following data to Google:

* The text content to be synthesized
* The configured language and voice parameters
* The API key provided by the site administrator

No personal user data is sent by default. The text content is only sent at the moment audio generation is requested.

Service provider: Google LLC
[Terms of Service](https://cloud.google.com/terms)
[Privacy Policy](https://policies.google.com/privacy)

= Google OAuth / Token Verification =

Orbem Studio supports optional Google Sign-In functionality to allow users to authenticate using their Google account.

What the service is used for:
The service is used to verify the authenticity of a Google ID token during login.

What data is sent and when:
When a user logs in using Google Sign-In, the plugin sends the Google ID token provided by the user's browser. This request is made once per login attempt to verify the token's validity. The plugin does not store Google credentials.

Service provider: Google LLC
[Terms of Service](https://developers.google.com/identity/terms)
[Privacy Policy](https://policies.google.com/privacy)

== Frequently Asked Questions ==

= Does this require an external game engine? =
No. Orbem Studio runs entirely inside WordPress. No canvas, no external libraries, no separate hosting required.

= Is this plugin for developers only? =
Developers can extend the engine via hooks and filters, but non-technical creators can build complete games using the visual admin interface alone.

= Can subscribers play the game? =
Yes. Gameplay routes are designed to support subscribers and logged-in users safely.

= Can guests play without logging in? =
This is configurable. You can require login or allow guest gameplay depending on your settings. Note that logged-out users will not have persisted gameplay data, but local score tracking is supported.

= Is Orbem Studio extensible? =
Yes. All systems are designed to be extended using WordPress hooks, filters, and custom metadata.

= Do I need my own WordPress site? =
No. You can sign up at orbem.studio to build and host your game without your own WordPress installation.

= Where can I find documentation? =
Documentation is available at https://orbemorder.com/orbem-studio/docs/readme

Tutorials are available on the Orbem Studio YouTube channel at https://youtube.com/@orbemstudio

== Changelog ==

= 1.4.3 =
* Fix absent images.
* Update meta field order.
* Fix devzoom error.
* Fix onboarding.
* Optimize assets.
* Remove start screen page content.

= 1.4.2 =
* Add alternate message for no area.
* Remove game page content addition.
* Fix logged in no login required button.
* Update game generated metadata format.
* Remove orbem studio pro business logic.

= 1.4.1 =
* Add admin bar link.
* Tighten npc wander stuck logic.
* Fix boss shooting after wave end.
* Update site generator map image.
* Update site generator specs.

= 1.4.0 =
* Add local current/high score tracker.
* Add current/high score text replacement.
* Add hitbox inset field for main character.
* Fix enemy kickback direction.
* Fix enemy collision on kickback.
* Fix landscape mode character positioning.

= 1.3.18 =
* Implement landscape mobile mode.
* Update pulse wave style.

= 1.3.16 =
* Fix enemy sound on engage.
* Fix collection point animation.
* Fix pulse wave hazard hurt.
* Fix projectile position boss.
* Fix enemy walking direction.

= 1.3.15 =
* Fix health/mana collection logic.
* Fix enemy hurt sound play on death.
* Fix boss fight trigger.

= 1.3.14 =
* Fix charge attack strength use.
* Fix missing image bug on attack/hurt.
* Fix set materialize trigger position.


= 1.3.13 =
* Send enemy dead image to back layer.
* Fix save mission on kill enemy.
* Make dead image optional.
* Update focus view styles.
* make charge attack bigger.

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
