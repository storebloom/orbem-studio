/* global OrbemOrder */

import '../sass/menu.scss';
import { engageDevMode } from './devmode';
import { centerCamera } from './free-camera';
import { startMultiplayer, hitPlayersInReach } from './multiplayer';
import { startNpcPositions } from './npc-positions';

let persistTimeout;
// Per-mission debounce so one completion can't cancel another's pending timer.
const saveMissionTimeouts = {};
let saveMaterializedItemTimeout;
const materializedItemsArray = [];

// Conversations you can have again, by the id of the box that starts them.
const saidJustNow = new Set();
const ACTION_REACH = 12;
const saidJustNowApart = new Map();
let persistItems = [];
const source = '';
let talkAudio = '';
let typeWriterTimeout;
let shiftIsPressed = false;
let spaceIsPressed = false;
let chargeAttackTimeout;
let inHazard = false;
let hazardItem = false;
let getOutOfHazard;
let hurtTimeout;
let timerCountDownInterval;
let currentLocation = '';
let timerCountDownHit = false;
let weaponPosTop = 400;
let weaponPosLeft = 400;
let hazardCounter = 0;
const defaultWeapon = OrbemOrder.defaultWeapon;
let isLoggedIn = false;
let isOnMobile = false;
let isOnTablet = false;
let chargeAttackInProgress = false;
let weaponTime = 200;
let heavyAttackInProgress = false;

window.mainCharacter = '';
window.godMode = false;
window.noTouch = false;
window.isDragging = '';
window.hazardTime = 600;
window.globalLeftPositionOffset = 400;
window.globalTopPositionOffset = 400;
window.nextDialogue = false;
window.crewCharacters = [];
window.playerName = '';
window.mcHurtCooldown = false;
window.gravityMode = false;
window.jumpVelocity = 0;
window.isGrounded = false;
window.canDoubleJump = false;
window._jumpKeyActive = false;
window._touchJumpActive = false;

const DEFAULT_PATH_SPEED = 60;

const DEFAULT_PROJECTILE_SPEED = 10;

const DEFAULT_PATH_PAUSE = 0.175;
const NPC_AFK_HOLD = 5000;

const DEFAULT_CHASE_DURATION = 4000;

const PATROL_CHASE_RANGE = 250;

const PATROL_CHASE_COOLDOWN = 1500;

// Retarts gif sprite from frame 1.
function restartGifSprite(img) {
    'use strict';

    if (!img || 'IMG' !== img.tagName) {
        return;
    }

    const src = img.getAttribute('src');

    if (!src || false === /\.gif(\?|#|$)/i.test(src)) {
        return;
    }

    img.src = src.split('#')[0] + '#r' + Date.now();
}

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    const spriteGifObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            const target = mutation.target;

            if (
                'IMG' !== target.tagName ||
                false === target.matches('.map-character-icon, .character-icon') ||
                false === target.classList.contains('engage')
            ) {
                return;
            }

            // The walk loop churns engage off/on the same sprite every tick.
            // Only restart when a genuinely different sprite becomes shown,
            // otherwise repeated restarts freeze the GIF on frame 1.
            const parent = target.parentElement;

            if (parent) {
                if (parent._shownGifSprite === target) {
                    return;
                }

                parent._shownGifSprite = target;
            }

            restartGifSprite(target);
        });
    });

    spriteGifObserver.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class'],
    });

    // Must match the #map-character width/height overrides in _explore.scss
    // exactly (max-width: 480px for mobile, 481-1025px for tablet), otherwise
    // globalLeftPositionOffset/globalTopPositionOffset assume a container
    // size that doesn't match what's actually rendered at that width.
    if (480 >= window.innerWidth) {
        window.globalLeftPositionOffset = 150;
        weaponPosLeft = window.globalLeftPositionOffset;
        isOnMobile = true;

        detectDeviceOrientationChange();
    }

    if (1025 >= window.innerWidth && 481 <= window.innerWidth) {
        window.globalTopPositionOffset = 150;
        weaponPosTop = window.globalTopPositionOffset;
        isOnTablet = true

        detectDeviceOrientationChange();
    }

    function detectDeviceOrientationChange() {
        let lastWidth = window.innerWidth;
        let lastHeight = window.innerHeight;

        window.addEventListener('resize', () => {
            const newWidth = window.innerWidth;
            const newHeight = window.innerHeight;

            // Only reload if orientation actually changed
            const wasLandscape = lastWidth > lastHeight;
            const isLandscape = newWidth > newHeight;

            if (wasLandscape !== isLandscape) {
                location.reload();
            }

            lastWidth = newWidth;
            lastHeight = newHeight;
        });
    }

    currentLocation = document.querySelector('.game-container');
    window.mainCharacter = currentLocation.dataset?.main;
    currentLocation = currentLocation.className.replace('game-container ', '');

    // Detect and close intro video if finished.
    const introVideo = document.getElementById('intro-video');

    if (introVideo) {
        const introVideoContainer = document.querySelector(
            '.intro-video.engage'
        );

        introVideo.play();

        // Unmute introvideo.
        const unmute = document.getElementById('unmute');

        if (unmute) {
            unmute.addEventListener('click', () => {
                introVideo.muted = !introVideo.muted;
                unmute.textContent = introVideo.muted ? '🔇' : '🔉';
            });
        }

        introVideo.addEventListener('ended', () => {
            if (introVideoContainer) {
                introVideoContainer.remove();
                playStartScreenMusic(true);
            }
        });

        const skipButton = document.getElementById('skip-intro-video');

        if (skipButton) {
            skipButton.addEventListener('click', () => {
                introVideo.pause();

                if (introVideoContainer) {
                    introVideoContainer.remove();
                }

                playStartScreenMusic(true);
            });
        }
    } else {
        playStartScreenMusic(true);
    }

    // Create account / login swap.
    const createAccount = document.getElementById('explore-create-account');
    const loginAccount = document.getElementById('explore-login-account');
    const loginForm = document.querySelector('.login-form');
    const registerForm = document.querySelector('.register-form');

    if (createAccount && loginForm && loginAccount) {
        createAccount.addEventListener('click', () => {
            loginForm.style.display = 'none';
            registerForm.style.display = 'block';
            createAccount.style.display = 'none';
            loginAccount.style.display = 'block';
        });

        loginAccount.addEventListener('click', () => {
            loginForm.style.display = 'block';
            registerForm.style.display = 'none';
            loginAccount.style.display = 'none';
            createAccount.style.display = 'block';
        });
    }

    // Engage transport function.
    if (
        'undefined' !== typeof OrbemOrder.exploreAbilities &&
        0 < OrbemOrder.exploreAbilities.length &&
        OrbemOrder.exploreAbilities.includes('transportation')
    ) {
        engageTransportFunction();
    }

    // Engage draggable function.
    engageDraggableFunction();

    // Spell clicks.
    const spells = document.querySelectorAll('.spell');
    const weapon = document.getElementById('weapon');
    const theWeapon = document.querySelector('.map-weapon');

    // Define current weapon for images.
    window.currentWeapon =
        defaultWeapon !== theWeapon.dataset.weapon
            ? '-' + theWeapon.dataset.weapon
            : '';

    if (spells && weapon) {
        spells.forEach((spell) => {
            spell.addEventListener('click', () => {
                const currentSpell = document.querySelector('.spell.engage');
                const currentWeapon = document.querySelector('#weapon');
                const theWeapon = document.querySelector('.map-weapon');
                const spellType = spell.getAttribute('data-type');
                const spellName = spell.getAttribute('title');
                const spellAmount = spell.getAttribute('data-value');

                // Remove engage from weapon.
                currentWeapon.classList.remove('engage');

                if (currentSpell) {
                    currentSpell.classList.remove('engage');
                }

                spell.classList.add('engage');
                theWeapon.className = 'map-weapon';
                theWeapon.classList.add(spellType);
                theWeapon.classList.add(spellName);
                theWeapon.classList.add('spell');
                theWeapon.setAttribute('data-value', spellAmount);
                window.weaponTime = spellAmount;
            });
        });

        // Use weapon instead of magic.
        weapon.addEventListener('click', () => {
            const currentSpell = document.querySelector('.spell.engage');
            const theWeapon = document.querySelector('.map-weapon');

            if (currentSpell) {
                currentSpell.classList.remove('engage');
                theWeapon.className = 'map-weapon';
                window.weaponTime = 400;
            }

            weapon.classList.add('engage');
        });
    }

    // Set up character choice.
    const characterChoice = document.querySelector('.character-item > img');
    if (characterChoice) {
        addNoPoints();
        characterChoice.classList.remove('engage');
    } else {
        addNoPoints();
    }

    // Set points.
    const thePoints = document.querySelectorAll('#explore-points .point-bar');

    if (thePoints) {
        thePoints.forEach((point) => {
            const amount = point.getAttribute('data-amount');
            const gauge = point.querySelector('.gauge');

            if (
                gauge &&
                false === point.classList.contains('point-amount') &&
                false === point.classList.contains('money-amount')
            ) {
                point.setAttribute('data-amount', amount);
                gauge.style.width = amount + 'px';
            } else if (true === point.classList.contains('point-amount')) {
                const newLevel = getCurrentLevel(amount);
                if (OrbemOrder.levelMaps) {
                    window.orbemLevel = newLevel;
                    window.nextLevelPointAmount = nextLevelPoints(newLevel);

                    point.setAttribute('data-amount', amount);
                    gauge.style.width = getPointsGaugeAmount(amount);
                }
            } else if (true === point.classList.contains('money-amount')) {
                point.dataset.amount = amount;
                point.querySelector('.money-text').textContent = amount;
            }
        });
    }

    document.body.style.position = 'fixed';
    const engageExplore = document.getElementById('engage-explore');
    const tryEngageExplore = document.getElementById('try-engage-explore');
    const loginRegisters = document.querySelectorAll('#login-register');
    const nonLoginWarning = document.querySelector('.non-login-warning');
    const loginRegisterCont = document.querySelector(
        '.game-login-create-container'
    );

    if (engageExplore) {
        engageExplore.addEventListener('click', function () {
            engageExploreGame();
        });
    }

    if (tryEngageExplore && nonLoginWarning) {
        tryEngageExplore.addEventListener('click', function () {
            nonLoginWarning.classList.add('engage');
        });
    }

    if (loginRegisters && nonLoginWarning) {
        loginRegisters.forEach((loginRegister) => {
            loginRegister.addEventListener('click', function () {
                loginRegisterCont.classList.add('engage');
                nonLoginWarning.classList.remove('engage');
            });
        });
    }

    engageSettingsMenus();

    engageStorageMenus();

    // New game reset.
    const newGame = document.getElementById('new-explore');

    if (newGame) {
        newGame.addEventListener('click', async () => {
            if (!window.confirm(
                'Are you sure you want to start a new game? All your previously saved data will be lost.'
            )) {
                return;
            }

            resetExplore();

            setTimeout(() => {
                window.location.href = OrbemOrder.gameURL;
            }, 1000);
        });
    }

    let skipStartId = document.cookie.match(/(?:^|;\s*)skip-start=([^;]+)/);
    skipStartId = skipStartId ? skipStartId[1] : null;

    const providedSkipIp = new URLSearchParams(window.location.search).get(
        'skid',
    );

    // Explore page functions.
    window.history.pushState({}, document.title, window.location.pathname);

    if (null !== providedSkipIp && skipStartId === providedSkipIp) {
        engageExploreGame();
        window.localStorage.removeItem('skip-start');
    }
});

function unlockAbilities(pointAmount) {
    'use strict';

    const unlockables = document.querySelectorAll('[data-unlockable]');

    if (unlockables) {
        unlockables.forEach((unlockable) => {
            const whenToUnlock = unlockable.dataset.unlockable;

            if (parseInt(pointAmount) >= parseInt(whenToUnlock)) {
                // If spell, give spell ability.
                if ('explore-magic' === unlockable.dataset.genre) {
                    navigator.vibrate(1000);

                    addNewSpell(unlockable.id);

                    // Remove if unlocked.
                    unlockable.remove();
                }
            }
        });
    }
}

function engageCharacterSelection() {
    'use strict';

    const charactersMenu = document.getElementById('characters');
    // Add crew select click event.
    const crewMates = charactersMenu
        ? charactersMenu.querySelectorAll('.character-list .character-item')
        : false;

    if (crewMates) {
        crewMates.forEach((crewMate) => {
            crewMate.addEventListener('click', () => {
                selectNewCharacter(crewMate);

                charactersMenu.classList.remove('engage');
            });
        });
    }
}

/**
 * Set click events for all clickable items.
 */
function engageClickableTimes()
{
    const clickables = document.querySelectorAll('[data-clickable="true"]');

    if ( clickables ) {
        clickables.forEach((clickable) => {
            if (clickable._clickableWired) return;
            clickable._clickableWired = true;
            clickable.addEventListener('click', () => {
                const clickableName = cleanClassName(clickable.className);

                revealCutscene(clickable);
                removeCutscene(clickable);
                interactWithItem(clickable);
                redirectAfterInteraction(clickable);

                if (clickable.dataset.mission && '' !== clickable.dataset.mission) {
                    saveMission(clickable.dataset.mission, clickable, clickableName);
                }

                // Add item to storage menu.
                storeExploreItem(clickable);

                // If just points. store it.
                if (
                    'point' === clickable.dataset.type &&
                    clickable.dataset?.value &&
                    0 < clickable.dataset.value
                ) {
                    runPointAnimation(
                        clickable,
                        cleanClassName(clickable.className),
                        false,
                        clickable.dataset.value,
                        ''
                    );
                }
            });
        });
    }
}

function revealCutscene(item) {
    const itemName = cleanClassName(item.className);
    const triggerCutscene = document.querySelector('.cutscene-trigger[data-materializeitem="' + itemName + '"]');

    if (triggerCutscene && false === triggerCutscene.classList.contains('enable')) {
        triggerCutscene.classList.add('enable');
        triggerCutscene.style.display = 'block';
    }
}

function removeCutscene(item) {
    const itemName = cleanClassName(item.className);
    const triggerCutscene = document.querySelector('.cutscene-trigger[data-removeafteritem="' + itemName + '"]');

    if (triggerCutscene) {
        triggerCutscene.remove();
    }
}

/**
 * Make npc follow walking path if it exists.
 *
 * @param npc
 * @param cutscene
 * @param areaCutscene
 * @param cutPosition
 */
function moveNPC(npc, cutscene, areaCutscene, cutPosition) {
    'use strict';

    let walkingInterval;

    if (npc) {
        let oldNpc = false;

        if (false !== cutscene) {
            oldNpc = npc;
            npc = cutscene;
        }

        const walkingPath = npc.dataset.path;
        const walkingSpeed = npc.dataset.speed;
        const timeBetween =
            undefined === npc.dataset?.timebetween
                ? '0'
                : npc.dataset.timebetween;
        const repeatPath = npc.dataset?.repeat;
        const wanderer = 'yes' === npc.dataset?.wanderer;

        if (false !== cutscene && oldNpc) {
            npc = oldNpc;
        }

        // Check if walking path exists.
        if (walkingPath && false === wanderer) {
            const pathArray = JSON.parse(walkingPath);

            pathArray.unshift({
                top: npc.style.top.replace('px', ''),
                left: npc.style.left.replace('px', ''),
            });
            const pathCount = pathArray.length - 1;
            let position = 0;
            let nextPosition = 1;
            let loopCount = 0;
            let loopAmount = 0;
            let firstRun = true;
            let moveDirection;
            let newImage;
            let npcIsStopped = false;
            const npcName = cleanClassName(npc.className);

            if (pathArray && 1 !== pathArray.length) {
                let currentWorldX = pathArray[position].left;
                let currentWorldY = pathArray[position].top;
                let previousWorldX;
                let previousWorldY;
                let didPauseNPC = false;

                walkingInterval = setInterval(() => {
                    if (!document.body.contains(npc)) {
                        stopPathMovement(npc);
                        return;
                    }

                    if ('false' !== npc.dataset?.canmove && 'true' !== npc.dataset?.talkHold && 'true' !== npc.dataset?.chasing && !worldPaused()) {
                        const currentImage = npc.querySelector(
                            '.character-icon.engage'
                        );

                        // Set next position to 0 if position is at the end.
                        nextPosition =
                            position === pathCount ? 0 : position + 1;

                        // Get loop amount for how many times to loop interval before switching to next position.
                        loopAmount = getLoopAmount(
                            pathArray[position].left,
                            pathArray[position].top,
                            pathArray[nextPosition].left,
                            pathArray[nextPosition].top,
                            walkingSpeed,
                            timeBetween
                        );

                        // If loopAmount equals loop count, transition to next walking path.
                        if (loopCount >= loopAmount - 1 || firstRun) {
                            // Check that current position is not the last position. And move npc if it is not.
                            if (
                                pathCount > position ||
                                (firstRun && pathCount === position)
                            ) {
                                // Get user direction of movement path.
                                moveDirection = regulateTransitionSpeed(
                                    pathArray[position].left,
                                    pathArray[position].top,
                                    pathArray[nextPosition].left,
                                    pathArray[nextPosition].top,
                                    npc,
                                    walkingSpeed
                                );

                                npc.style.left =
                                    pathArray[nextPosition].left + 'px';
                                npc.style.top =
                                    pathArray[nextPosition].top + 'px';

                                // Update NPC direction image.
                                newImage = npc.querySelector(
                                    '#' + escClass(npcName) + moveDirection
                                );

                                if (newImage && '' !== newImage.getAttribute('src')) {
                                    if (currentImage) {
                                        currentImage.classList.remove('engage');
                                    }

                                    newImage.classList.add('engage');
                                    npcIsStopped = false;
                                }
                            }

                            // If it is not the first run do this.
                            if (false === firstRun) {
                                // If the current position is not the last position, iterate on position count and reset loop count to 0.
                                if (pathCount > nextPosition) {
                                    loopCount = 0;
                                    firstRun = true;

                                    if (0 !== nextPosition) {
                                        position++;
                                    } else {
                                        position = 0;
                                    }

                                    // If it is the last position, and repeat is set to true, then reset position to 0.
                                } else if ('true' === repeatPath) {
                                    firstRun = true;
                                    position = pathCount;
                                    loopCount = 0;
                                    playCutscene(cutPosition, areaCutscene);

                                    // If not repeat and position is at end, clear interval.
                                } else if (pathCount === nextPosition) {
                                    clearInterval(walkingInterval);
                                    playCutscene(cutPosition, areaCutscene);
                                }

                                // if it is the first run, set to false and iterate on position and loopcount.
                            } else {
                                firstRun = false;
                                loopCount++;
                            }
                        } else {
                            loopCount++;
                        }

                        // Live track NPC movement.
                        const trackNPC = () => {
                            if (npc._pathStopped || !document.body.contains(npc)) {
                                npc._trackingPath = false;
                                return;
                            }

                            if (
                                parseInt(pathArray[nextPosition].left) ===
                                npc.offsetLeft &&
                                parseInt(pathArray[nextPosition].top) ===
                                npc.offsetTop &&
                                true !== npcIsStopped
                            ) {
                                setStaticNPCImage(moveDirection, npc);
                                npcIsStopped = true;
                            }

                            currentWorldX = npc.offsetLeft;
                            currentWorldY = npc.offsetTop;
                            previousWorldX = npc.offsetLeft;
                            previousWorldY = npc.offsetTop;
                            requestAnimationFrame(trackNPC);
                        };

                        if (!npc._trackingPath) {
                            npc._trackingPath = true;
                            trackNPC();
                        }

                        didPauseNPC = false;
                    } else if (false === didPauseNPC) {
                        // Set current position so paused movement can restart at point of pause.
                        loopAmount = loopAmount + 1;
                        position = 0 < position ? position - 1 : pathCount;

                        setStaticNPCImage(moveDirection, npc);

                        if ('true' === npc.dataset?.chasing) {
                            delete npc.dataset.currentDirection;
                        }

                        npc.style.left = currentWorldX + 'px';
                        npc.style.top = currentWorldY + 'px';

                        didPauseNPC = true;
                    }
                }, 250);

                npc._pathInt = walkingInterval;
                npc._pathStopped = false;
            } else {
                regulateTransitionSpeed(
                    npc.style.left.replace('px', ''),
                    npc.style.top.replace('px', ''),
                    pathArray[position].left,
                    pathArray[position].top,
                    npc,
                    walkingSpeed
                );

                npc.style.left = pathArray[nextPosition].left + 'px';
                npc.style.top = pathArray[nextPosition].top + 'px';
            }
        } else if (true === wanderer) {
            makeNPCWander(npc, walkingSpeed, timeBetween, false);
            playCutscene(cutPosition, areaCutscene);
        }

        window.allowCutscene = true;
    } else {
        playCutscene(cutPosition, areaCutscene);
    }
}

const sfxCache = {};

function playSfx(name) {
    'use strict';

    const url = window.OrbemOrder?.sounds?.[name];

    if (!url) {
        return;
    }

    let sound = sfxCache[name];

    if (!sound) {
        sound = new Audio(url);
        sound.preload = 'auto';
        sfxCache[name] = sound;
    }

    sound.volume = undefined === window.sfxVolume ? 1 : window.sfxVolume;
    sound.currentTime = 0;
    sound.play().catch(() => {});
}

window.orbemSfx = playSfx;

// Storage menu functionality.
function engageStorageMenus() {
    'use strict';

    // Tab logic.
    const storageTabs = document.querySelectorAll('.menu-tabs > div');

    if (storageTabs) {
        storageTabs.forEach((storageTab, storageIndex) => {
            storageTab.addEventListener('click', () => {
                const currentTab = document.querySelector('.menu-tabs .engage');

                const itemDescription =
                    document.getElementById('item-description');
                if (itemDescription) {
                    itemDescription.innerHTML = '';
                }

                if (currentTab) {
                    currentTab.classList.remove('engage');
                }

                const selectedTabContent = document.querySelector(
                    '.retrieval-points .storage-menu[data-menu="' +
                    storageTab.dataset.menu +
                    '"]'
                );

                // Select new tab.
                storageTab.classList.add('engage');
                playSfx('explore_sfx_tab');

                const currentTabContent = document.querySelector(
                    '.storage-menu.engage'
                );

                if (currentTabContent) {
                    currentTabContent.classList.remove('engage');
                }

                if (selectedTabContent) {
                    selectedTabContent.classList.add('engage');
                }
            });
        });
    }
}

function engageSettingsMenus() {
    'use strict';

    // Settings.
    const settingCogs = document.querySelectorAll('#settings, #storage, #characters');

    if (settingCogs) {
        settingCogs.forEach((settingCog) => {
            if ('storage' === settingCog.id) {
                // Show item description in storage menu.
                const menuItems = document.querySelectorAll('.retrieval-points .storage-item');

                if (menuItems) {
                    menuItems.forEach((menuItem) => {
                        menuItem.addEventListener('click', () => {
                            if ('true' !== menuItem.dataset.empty) {
                                playSfx('explore_sfx_select');
                                showItemDescription(menuItem);
                            }
                        });
                    });
                }
            }

            settingCog.addEventListener('click', (e) => {
                if (
                    false === e.target.classList.contains('close-settings') &&
                    !e.target.closest('.character-item')
                ) {
                    if (!settingCog.classList.contains('engage')) {
                        playSfx('explore_sfx_menu_open');

                        settingCogs.forEach((otherCog) => {
                            if (otherCog !== settingCog && otherCog.classList.contains('engage')) {
                                otherCog.classList.remove('engage');

                                if ('storage' === otherCog.id) {
                                    const otherDescription = document.querySelector('.retrieval-points #item-description');

                                    if (otherDescription) {
                                        otherDescription.innerHTML = '';
                                    }
                                }
                            }
                        });
                    }

                    settingCog.classList.add('engage');
                }
            });

            settingCog
                .querySelector('.close-settings')
                .addEventListener('click', () => {
                    const description = document.querySelector('.retrieval-points #item-description');
                    settingCog.classList.remove('engage');
                    playSfx('explore_sfx_menu_close');

                    if (description) {
                        description.innerHTML = '';
                    }
                });
        });
    }

    const updateSettings = document.getElementById('update-settings');

    // Save settings.
    const musicSettings = document.getElementById('music-volume');
    const sfxSettings = document.getElementById('sfx-volume');
    const talkingSettings = document.getElementById('talking-volume');

    if (updateSettings) {
        if (sfxSettings && musicSettings && talkingSettings) {
            window.sfxVolume = sfxSettings.value / 100;
            window.talkingVolume = talkingSettings.value;

            // Volume listeners.
            musicSettings.addEventListener('input', (event) => {
                window.currentMusic.volume = event.target.value / 100;
            });

            // Volume listeners.
            talkingSettings.addEventListener('input', (event) => {
                window.talkingVolume = event.target.value;
            });

            // Volume listeners.
            sfxSettings.addEventListener('input', (event) => {
                window.sfxVolume = event.target.value / 100;
            });
        }

        updateSettings.addEventListener('click', () => {
            playSfx('explore_sfx_button');

            if (musicSettings && sfxSettings && talkingSettings) {
                saveSettings(
                    musicSettings.value,
                    sfxSettings.value,
                    talkingSettings.value,
                );
            }
        });
    }
}

function setStaticNPCImage(moveDirection, npc) {
    'use strict';

    const currentImage = npc.querySelector('.character-icon.engage');
    const npcName = cleanClassName(npc.className);

    const newImage = document.getElementById(
        npcName + 'static-' + moveDirection
    );

    if (newImage && '' !== newImage.getAttribute('src')) {
        if (currentImage) {
            currentImage.classList.remove('engage');
        }

        newImage.classList.add('engage');
    }
}

window.makeNPCWander = makeNPCWander;

window.orbemFaceCharacter = (npc, direction, walking) => (walking ? setDirectionImage(npc, direction) : setStaticNPCImage(direction, npc));

function makeNPCWander(npc, walkingSpeed, timeBetween, enemy) {
    'use strict';

    // A spawner marked as a wanderer is marking its copies, not itself.
    if (isSpawner(npc)) {
        return;
    }

    // Prevent a second wander loop if one is already running on this element.
    if (npc._wanderInt) {
        return;
    }

    let startDir = getRandomDir([], enemy, npc);
    let moveDir = '';
    let triedDown = false;
    let triedLeft = false;
    let triedRight = false;
    let triedUp = false;
    let noCollideCount = 0;
    let collisionCount = 0;
    let preMoveDir = '';
    let swap = 0;
    let standing = false;
    let held = false;
    let anchorLeft = parseFloat(npc.style.left) || 0;
    let anchorTop = parseFloat(npc.style.top) || 0;
    let anchorTicks = 0;

    function stand(direction) {
        if (direction) {
            npc.dataset.currentDirection = direction;
            setStaticNPCImage(direction, npc);
        }

        standing = true;
    }

    function startRandomNpcPause() {
        const pauseTime =
            Math.floor(Math.random() * (25000 - 15000 + 1)) + 15000;

        setTimeout(() => {
            pauseNpc(timeBetween, npc);

            // Schedule the next pause with a new random time
            startRandomNpcPause();
        }, pauseTime);
    }

    if (false === enemy) {
        startRandomNpcPause();
    }

    npc._wanderInt = setInterval(() => {
        if (!document.body.contains(npc)) {
            clearInterval(npc._wanderInt);
            npc._wanderInt = null;
            stopRunnerPunching(npc);
            return;
        }

        if (
            'true' !== npc.dataset?.break &&
            'true' !== npc.dataset?.cutscenebreak &&
            'false' !== npc.dataset?.canmove &&
            'true' !== npc.dataset?.talkHold &&
            !worldPaused()
        ) {
            if (true === enemy && '' === moveDir) {
                startDir = getRandomDir(startDir, true, npc);
            }
            const currentLeft = npc.style.left.replace('px', '');
            const currentTop = npc.style.top.replace('px', '');
            const finalPos = blockMovement(currentTop, currentLeft, npc, enemy);

            // Hold still for the attack, after blockMovement has rechecked reach.
            if ('true' === npc.dataset?.attacking) {
                return;
            }

            // Gravity for this entity is handled continuously by applyEntityGravity.

            if (true === enemy) {
                const target = enemyTargetPoint(npc) || { left: currentLeft, top: currentTop };
                const targetLeft = target.left;
                const targetTop = target.top;

                const horizontalDiff = targetLeft - currentLeft;
                const verticalDiff = targetTop - currentTop;
                const absHorizontalDiff = Math.abs(horizontalDiff);
                const absVerticalDiff = Math.abs(verticalDiff);

                let displayDirection = npc.dataset.currentDirection || 'down';
                const directionBuffer = 2;

                if (absVerticalDiff > absHorizontalDiff + directionBuffer) {
                    displayDirection = verticalDiff > 0 ? 'down' : 'up';
                } else if (absHorizontalDiff > absVerticalDiff + directionBuffer) {
                    displayDirection = horizontalDiff > 0 ? 'right' : 'left';
                }

                if (displayDirection !== npc.dataset.currentDirection) {
                    npc.dataset.currentDirection = displayDirection;
                    setDirectionImage(npc, displayDirection);
                }
            } else {
                const activeDir = moveDir || startDir;

                if (held) {
                    held = false;
                    standing = false;
                    anchorLeft = parseFloat(currentLeft) || 0;
                    anchorTop = parseFloat(currentTop) || 0;
                    anchorTicks = 0;

                    if (activeDir) {
                        setDirectionImage(npc, activeDir);
                    }
                } else if (activeDir && activeDir !== npc.dataset.currentDirection) {
                    if (standing) {
                        stand(activeDir);
                    } else {
                        npc.dataset.currentDirection = activeDir;
                        setDirectionImage(npc, activeDir);
                    }
                }
            }

            switch (startDir) {
                case 'down':
                    if (!window.gravityMode) npc.style.top = finalPos.top + 1 + 'px';
                    break;
                case 'up':
                    if (!window.gravityMode) npc.style.top = finalPos.top - 1 + 'px';
                    break;
                case 'left':
                    npc.style.left = finalPos.left - 1 + 'px';
                    break;
                case 'right':
                    npc.style.left = finalPos.left + 1 + 'px';
                    break;
            }

            preMoveDir = moveDir;

            if (
                ((finalPos.left > currentLeft || finalPos.left < currentLeft) &&
                    true === finalPos.collide &&
                    false === triedDown &&
                    (startDir === 'left' || startDir === 'right')) ||
                (true === finalPos.collide && finalPos.top > currentTop)
            ) {
                moveDir = swap % 2 === 0 ? 'down' : 'up';
            }

            if (
                ((('down' === moveDir && finalPos.top < currentTop) ||
                        ('up' === moveDir && finalPos.top > currentTop)) &&
                    true === finalPos.collide &&
                    (startDir === 'left' || startDir === 'right')) ||
                (finalPos.left > currentLeft && true === triedDown)
            ) {
                moveDir = 'down' === moveDir ? 'up' : 'down';
                triedDown = true;
            }

            if (
                finalPos.top > currentTop &&
                true === finalPos.collide &&
                true === triedDown &&
                (startDir === 'left' || startDir === 'right')
            ) {
                triedUp = true;
            }

            // Up / down checks.
            if (
                (finalPos.top > currentTop || finalPos.top < currentTop) &&
                true === finalPos.collide &&
                false === triedLeft &&
                (startDir === 'up' || startDir === 'down')
            ) {
                moveDir = swap % 2 === 0 ? 'left' : 'right';
            }

            if (
                ((('left' === moveDir && finalPos.left > currentLeft) ||
                        ('right' === moveDir && finalPos.left < currentLeft)) &&
                    true === finalPos.collide &&
                    (startDir === 'up' || startDir === 'down')) ||
                (finalPos.top > currentTop && true === triedLeft)
            ) {
                moveDir =
                    'left' === moveDir || 'down' === moveDir ? 'right' : 'left';
                triedLeft = true;
            }

            if (
                finalPos.left < currentLeft &&
                true === finalPos.collide &&
                true === triedLeft
            ) {
                triedRight = true;
            }

            if (
                (true === triedLeft && true === triedRight) ||
                (true === triedUp && true === triedDown)
            ) {
                moveDir = '';
                startDir = getRandomDir(startDir, enemy, npc);
                triedLeft = false;
                triedRight = false;
                triedUp = false;
                triedDown = false;
                swap++;
            }

            switch (moveDir) {
                case 'down':
                    if (!window.gravityMode && 'up' !== startDir) {
                        npc.style.top = finalPos.top + 1 + 'px';
                    } else {
                        moveDir = '';
                    }
                    break;
                case 'up':
                    if (!window.gravityMode && 'down' !== startDir) {
                        npc.style.top = finalPos.top - 1 + 'px';
                    } else {
                        moveDir = '';
                    }
                    break;
                case 'left':
                    if ('right' !== startDir) {
                        npc.style.left = finalPos.left - 1 + 'px';
                    } else {
                        moveDir = '';
                    }
                    break;
                case 'right':
                    if ('left' !== startDir) {
                        npc.style.left = finalPos.left + 1 + 'px';
                    } else {
                        moveDir = '';
                    }
                    break;
            }

            if (false === finalPos.collide) {
                noCollideCount++;
            } else {
                noCollideCount = 0;

                if (preMoveDir !== moveDir) {
                    collisionCount++;
                }
            }

            if (collisionCount > 20) {
                pauseNpc(timeBetween, npc);

                npc.dataset.stuck = 'true';
                moveDir = '';
                triedDown = false;
                triedUp = false;
                triedLeft = false;
                triedRight = false;
                swap++;
                collisionCount = 0;
            }

            if (noCollideCount > 20) {
                collisionCount = 0;
                triedDown = false;
                triedUp = false;
                triedLeft = false;
                triedRight = false;
                moveDir = '';
                swap++;
            }

            if (false === enemy && ++anchorTicks >= 8) {
                const nowLeft = parseFloat(npc.style.left) || 0;
                const nowTop = parseFloat(npc.style.top) || 0;
                const stalled = Math.abs(nowLeft - anchorLeft) + Math.abs(nowTop - anchorTop) < 3;

                if (stalled && !standing) {
                    stand(npc.dataset.currentDirection);
                } else if (!stalled && standing) {
                    standing = false;
                    setDirectionImage(npc, npc.dataset.currentDirection || moveDir || startDir);
                }

                anchorLeft = nowLeft;
                anchorTop = nowTop;
                anchorTicks = 0;
            }
        } else if (false === enemy) {
            if (!held) {
                held = true;
                stand(npc.dataset.currentDirection);
            }

            startDir = getRandomDir(startDir, enemy, npc);
        }
    }, walkingSpeed);
}

function pauseNpc(timeBetween, npc) {
    'use strict';

    npc.dataset.break = 'true';
    setTimeout(() => {
        npc.dataset.break = 'false';
    }, timeBetween);
}

// ─── Paused ──────────────────────────────────────────────────────────────────

function worldPaused() {
    return true === window.orbemPaused;
}

// ─── What an enemy goes for ──────────────────────────────────────────────────

function targetableNpcs() {
    return Array.from(
        document.querySelectorAll('.default-map .map-item[data-targetable="yes"]')
    ).filter((el) => 0 < parseInt(el.dataset.health || '0', 10));
}

/**
 * Where an enemy is heading, as the top-left corner the chase code has always steered towards.
 *
 * @return {{left: number, top: number, npc: Element|null}|null}
 */
function enemyTargetPoint(enemyEl) {
    const mapCharacter = document.getElementById('map-character');
    const mapCharacterImage = document.querySelector('.map-character-icon.engage');
    let best = null;

    if (mapCharacter && mapCharacterImage) {
        best = {
            left: parseInt(mapCharacter.style.left, 10) + (window.globalLeftPositionOffset - mapCharacterImage.width / 2),
            top: parseInt(mapCharacter.style.top, 10) + (window.globalTopPositionOffset - mapCharacterImage.height / 2),
            npc: null,
        };
    }

    const npcs = targetableNpcs();

    if (!npcs.length || !enemyEl) {
        return best;
    }

    const fromLeft = parseInt(enemyEl.style.left, 10) || enemyEl.offsetLeft;
    const fromTop = parseInt(enemyEl.style.top, 10) || enemyEl.offsetTop;
    const distance = (p) => Math.hypot(p.left - fromLeft, p.top - fromTop);

    npcs.forEach((npc) => {
        const point = {
            left: parseInt(npc.style.left, 10) || npc.offsetLeft,
            top: parseInt(npc.style.top, 10) || npc.offsetTop,
            npc,
        };

        if (!best || distance(point) < distance(best)) {
            best = point;
        }
    });

    return best;
}

/** Take health off somebody being defended, and see them off at 0. */
function hurtNpc(npc, amount) {
    const health = Math.max(0, parseInt(npc.dataset.health || '0', 10) - (parseInt(amount, 10) || 0));
    const full = parseInt(npc.dataset.healthamount || '1', 10) || 1;
    const bar = npc.querySelector('.npc-health-bar');

    if ('0' === npc.dataset.health) {
        return;
    }

    npc.dataset.health = String(health);

    if (bar) {
        bar.style.width = Math.round((health / full) * 100) + '%';
    }

    npc.classList.add('hurt');
    setTimeout(() => npc.classList.remove('hurt'), 400);

    document.dispatchEvent(new CustomEvent('orbem:npc-hurt', { detail: { npc, health, full } }));

    if (0 === health) {
        npc.classList.add('defeated');
        document.dispatchEvent(new CustomEvent('orbem:npc-defeated', { detail: { npc } }));
    }
}

function getRandomDir(currentDir, enemy, enemyEl) {
    'use strict';

    const dirs = window.gravityMode
        ? ['left', 'right']
        : ['up', 'down', 'left', 'right'];

    if (true === enemy && enemyEl) {
        // If flagged as stuck, pick a random direction to escape
        if ('true' === enemyEl.dataset.stuck) {
            enemyEl.dataset.stuck = 'false';
            const excludeDirs = Array.isArray(currentDir) ? currentDir : [currentDir];
            const filteredDirs = dirs.filter((dir) => !excludeDirs.includes(dir));
            const randomIndex = Math.floor(Math.random() * filteredDirs.length);
            return filteredDirs[randomIndex];
        }

        const target = enemyTargetPoint(enemyEl);

        if (target) {
            const enemyLeft = parseInt(enemyEl.style.left.replace('px', ''), 10);
            const enemyTop = parseInt(enemyEl.style.top.replace('px', ''), 10);
            const targetLeft = target.left;
            const targetTop = target.top;
            const horizontalDiff = targetLeft - enemyLeft;
            const verticalDiff = targetTop - enemyTop;
            const absHorizontalDiff = Math.abs(horizontalDiff);
            const absVerticalDiff = Math.abs(verticalDiff);

            if (!window.gravityMode && absVerticalDiff > absHorizontalDiff) {
                return verticalDiff > 0 ? 'down' : 'up';
            }

            if (0 < absHorizontalDiff) {
                return horizontalDiff > 0 ? 'right' : 'left';
            }
        }
    }

    const excludeDirs = Array.isArray(currentDir) ? currentDir : [currentDir];
    const filteredDirs = dirs.filter((dir) => !excludeDirs.includes(dir));

    if (0 === filteredDirs.length) {
        return null;
    }

    const randomIndex = Math.floor(Math.random() * filteredDirs.length);
    return filteredDirs[randomIndex];
}

/**
 * Adds points to user's account.
 *
 * @param amount
 * @param type
 * @param position
 * @param collectable
 * @param missionName
 */
function addUserPoints(amount, type, position, collectable, missionName) {
    'use strict';

    // If collectable, remove from menu.
    if (true === collectable) {
        removeItemFromStorage(position, type);
    }

    // Make sure amount is always 100 or less. Not for points or money.
    if (amount > barMax(type) && 'point' !== type && 'money' !== type) {
        amount = barMax(type);
    }

    // Make sure amount is 0 if less than 0 for health
    if (amount < 0 && 'health' === type) {
        amount = 0;
    }

    const bar = document.querySelector(`.${type}-amount`);
    let gauge = false;

    if (bar) {
        gauge = bar.querySelector('.gauge');
    }

    // Add to explorePoints.
    if (
        OrbemOrder.explorePoints &&
        OrbemOrder.explorePoints[type] &&
        false === OrbemOrder.explorePoints[type].positions.includes(position) &&
        false === Array.isArray(position)
    ) {
        OrbemOrder.explorePoints[type].positions.push(position);
    } else if (
        OrbemOrder.explorePoints &&
        OrbemOrder.explorePoints[type] &&
        false === OrbemOrder.explorePoints[type].positions.includes(position) &&
        true === Array.isArray(position)
    ) {
        position.forEach((positionName) => {
            OrbemOrder.explorePoints[type].positions.push(positionName);
        });
    }

    if (gauge && 'point' !== type && 'money' !== type) {
        bar.setAttribute('data-amount', amount);
        gauge.style.width = amount + 'px';
    } else if ('point' === type) {
        bar.setAttribute('data-amount', amount);

        gauge.style.width = getPointsGaugeAmount(amount);

        // Unlock abilities as points grow.
        unlockAbilities(amount);
    } else if ('money' === type) {
        bar.setAttribute('data-amount', amount);

        const moneyText = bar.querySelector('.money-text');
        moneyText.textContent = amount;
    }

    if ('health' === type && 0 === amount) {
        triggerGameOver();
    }

    if (
        '' !== position &&
        true === ['money', 'point', 'health', 'mana'].includes(type) &&
        position !== missionName
    ) {
        persistItemRemoval(position, type, amount, 2000, '', false);
    }

    // Update scores.
    replaceScoresInBody();
}

/**
 * Dismiss the lose-message popup: the End restarts the whole game (wiping
 * progress), otherwise retry from the current spot.
 */
function dismissGameOver(gameOver) {
    'use strict';

    if (gameOver && 'yes' === gameOver.dataset.theEnd) {
        restartGame();
    } else {
        window.location.reload();
    }
}

/** Hand the death over to whatever owns it, then go where it says. */
function respawnAtHome() {
    'use strict';

    fetch(window.OrbemWorld.respawnUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.OrbemWorld.nonce },
        credentials: 'same-origin',
    })
        .then(r => r.json())
        .then((data) => {
            if (data && data.success) {
                window.location.href = OrbemOrder.gameURL;
            }
        })
        .catch(() => {});
}

/**
 * Trigger the game over notice and add restart logic.
 */
function triggerGameOver() {
    'use strict';

    const gameOver = document.querySelector('.game-over-notice');

    if (gameOver) {
        const gameOverMusic = gameOver.querySelector( 'audio' );
        const defaultMap = document.querySelector('.default-map');

        if ( window.currentMusic && gameOverMusic && '' !== gameOverMusic.src ) {
            window.currentMusic.pause();
            gameOverMusic.loop = false;
            gameOverMusic.play();
        }

        gameOver.style.display = 'block';

        // Auto-dismiss after the explainer's configured delay (milliseconds).
        const autoCloseMs = parseInt(gameOver.dataset.autoClose, 10);

        if (0 < autoCloseMs) {
            setTimeout(() => dismissGameOver(gameOver), autoCloseMs);
        }

        window.allowMovement = false;
        inHazard = false;
        hazardItem = false;

        persistItemRemoval('projectile', 'health', 100, 0, 'true', false);

        // Somewhere else may own what happens after a death.
        if (window.OrbemWorld && window.OrbemWorld.respawnUrl) {
            respawnAtHome();

            return;
        }

        if (defaultMap) {
            // Reset user position.
            addUserCoordianate(
                defaultMap.dataset.startleft,
                defaultMap.dataset.starttop,
            );
        }

        const types = ['money', 'point'];

        types.forEach((type) => {
            const storageKey = `orbem_local_${type}`;
            const current = JSON.parse(localStorage.getItem(storageKey) || '{}');
            const updated = {
                type,
                current: current.current,
                phigh: 0,
                high: current.high,
                positions: current.positions,
            };

            localStorage.setItem(storageKey, JSON.stringify(updated));
        });
    }
}

/**
 * Show an explainer.
 *
 * @param {string} slug The explainer's slug.
 * @param {HTMLElement|null} trigger The trigger walked into, if it was walked into.
 * @return {boolean} Whether there was one to show.
 */
function showExplainer(slug, trigger) {
    'use strict';

    const triggee = document.querySelector(
        '.' + escClass(slug) + '-explainer-item'
    );
    let autoCloseTimeout;

    // Shared close routine used by the click/key handler and the optional auto-close timer.
    const finishClose = () => {
        clearTimeout(autoCloseTimeout);
        window.allowMovement = true;
        window.allowHit = true;
        triggee.classList.remove('show-explainer');
        document.removeEventListener('keydown', closeExplainer);
        document.removeEventListener('click', closeExplainer);

        // "The End": closing this explainer restarts the game.
        if ('yes' === triggee.dataset?.theEnd) {
            restartGame();
        }

        const cutscene = document.querySelector('.cutscene-trigger[data-materializeexplainer="' + slug + '"]');

        if (cutscene) {
            cutscene.classList.add('enable');
        }

        if (
            'yes' === trigger?.dataset?.muteMusic &&
            window.currentMusic
        ) {
            window.currentMusic.play();
        }
    };

    const closeExplainer = (event) => {
        const clickClose = '1' === triggee.dataset?.clickclose ? true : !triggee.contains(event.target);
        if (
            (('keydown' === event.type &&
                    'Space' === event.code) ||
                'click' === event.type) &&
            clickClose
        ) {
            finishClose();
        }
    };

    if (triggee) {
        triggee.classList.add('show-explainer');
        trigger?.classList.add('already-hit');
        window.allowMovement = false;
        window.allowHit = false;
        const firstExplainerText = triggee.querySelector('p');

        centerCamera(triggee, {
            behavior: 'instant',
            block: 'center',
            inline: 'center',
        });

        // Stop walking sound.
        resetWalkSound();

        if (firstExplainerText) {
            const text = Array.from(
                firstExplainerText.childNodes
            )
                .filter((node) => node.nodeType === Node.TEXT_NODE)
                .map((node) => node.textContent)
                .join('');
            const mcVoice = document.getElementById('map-character')?.dataset?.voice;
            const providedAudio =
                document.getElementById(triggee.id + '-s') ?? false;

            // Do text to speech.
            makeTalk(text, mcVoice, providedAudio, true);
        }

        if (
            'yes' === trigger?.dataset?.muteMusic &&
            window.currentMusic
        ) {
            window.currentMusic.pause();
        }

        const arrow = triggee.querySelector('img');

        if (arrow) {
            const rotate = parseInt(arrow.dataset.rotate);
            let animate1 = false;
            let animate2 = false;
            let animate3 = false;

            if (arrow && rotate && 0 < rotate) {
                if (0 < rotate && 90 >= rotate) {
                    animate1 = `rotate(${rotate}deg) translate( 10px, -10px )`;
                    animate2 = `rotate(${rotate}deg) translate( 10px, 10px )`;
                    animate3 = `rotate(${rotate}deg) translate( 10px, -10px )`;
                }

                if (91 < rotate && 180 >= rotate) {
                    animate1 = `rotate(${rotate}deg) translate( 0, 10px )`;
                    animate2 = `rotate(${rotate}deg) translate( -10px, -10px )`;
                    animate3 = `rotate(${rotate}deg) translate( 0, 10px )`;
                }

                if (181 < rotate && 270 >= rotate) {
                    animate1 = `rotate(${rotate}deg) translate( -10px, 10px )`;
                    animate2 = `rotate(${rotate}deg) translate( -10px, -10px )`;
                    animate3 = `rotate(${rotate}deg) translate( -10px, 10px )`;
                }

                if (271 < rotate && 360 >= rotate) {
                    animate1 = `rotate(${rotate}deg) translate( -10px, 0 )`;
                    animate2 = `rotate(${rotate}deg) translate( -10px, -10px )`;
                    animate3 = `rotate(${rotate}deg) translate( -10px, 0 )`;
                }

                if (false !== animate1) {
                    const moveArrow = [
                        { transform: animate1 },
                        { transform: animate2 },
                        { transform: animate3 },
                    ];

                    const arrowTiming = {
                        duration: 1000,
                        iterations: Infinity,
                    };

                    arrow.animate(moveArrow, arrowTiming);
                }
            }
        }

        // Close explainer on click.
        document.addEventListener('click', closeExplainer);

        // Close on action key
        document.addEventListener('keydown', closeExplainer);

        // Auto-close after the configured delay (milliseconds).
        const autoCloseMs = parseInt(
            triggee.dataset.autoClose,
            10
        );

        if (0 < autoCloseMs) {
            autoCloseTimeout = setTimeout(finishClose, autoCloseMs);
        }

        // Persist to avoid showing again on refresh — only when walked into.
        if (trigger) {
            persistItemRemoval(
                slug,
                'point',
                0,
                2000,
                '',
                true
            );
        }
    }

    return !!triggee;
}

/**
 * Adds item to explore point area so it doesn't show up again.
 * @param item
 * @param type
 * @param amount
 * @param timeoutTime
 * @param reset
 * @param direct
 */
function persistItemRemoval(item, type, amount, timeoutTime, reset, direct) {
    'use strict';

    if ('' !== item && type) {
        const storageKey = `orbem_local_${type}`;
        const current = JSON.parse(localStorage.getItem(storageKey) || '{}');

        if (true === direct) {
            amount = 'health' !== type
                ? (current.current || 0) + amount
                : (current.current || 0) - amount;
        }

        const items = Array.isArray(item) ? item : [item];
        const existingItems = Array.isArray(current.positions) ? current.positions : [];
        const newHigh = amount > (current.high || 0) ? amount : (current.high || 0);

        const updated = {
            type,
            current: amount,
            phigh: newHigh,
            high: current.high,
            positions: Array.from(new Set(existingItems.concat(items))),
        };

        localStorage.setItem(storageKey, JSON.stringify(updated));

        if (OrbemOrder.explorePoints) {
            const itemList = Array.isArray(item) ? item : [item];
            if (!OrbemOrder.explorePoints[type]) {
                OrbemOrder.explorePoints[type] = { positions: [] };
            }
            OrbemOrder.explorePoints[type].positions = Array.from(
                new Set((OrbemOrder.explorePoints[type].positions || []).concat(itemList))
            );
        }
    }

    if (false === isLoggedIn) {
        return;
    }

    const filehref = `${OrbemOrder.siteRESTURL}/add-explore-points/`;

    // Don't allow health to be 0.
    if ('health' === type && 0 === amount) {
        return;
    }

    if ('' !== item) {
        clearTimeout(persistTimeout);

        if (false === Array.isArray(item)) {
            persistItems.push(item);
        } else {
            persistItems = item.concat(persistItems);
        }

        // Always use projectile if health update.
        if ('health' === type) {
            persistItems = ['projectile'];
        }

        persistItems = Array.from(new Set(persistItems));

        if (true === direct) {
            amount =
                'health' !== type
                    ? getCurrentPoints(type) + amount
                    : getPointsGaugeAmount(type) - amount;
        }

        persistTimeout = setTimeout(() => {
            const jsonString = {
                type,
                item: persistItems,
                amount: storedBarAmount(type, amount),
                reset,
            };

            // Save position of item.
            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                    'Content-Type': 'application/json', // Set the content type to JSON
                    'X-WP-Nonce': OrbemOrder.orbemNonce,
                },
                body: JSON.stringify(jsonString), // The JSON stringified payload
            }).then((response) => {
                // Check if the response status is in the range 200-299
                if (!response.ok) {
                    throw new Error(
                        'Network response was not ok ' + response.statusText
                    );
                }

                if (type === 'communicate' || 'money' === type) {
                    type = 'point';
                }

                // Add to explore points var.
                if (OrbemOrder.explorePoints && type) {
                    if (
                        OrbemOrder.explorePoints[type].positions &&
                        Array.isArray(OrbemOrder.explorePoints[type].positions)
                    ) {
                        OrbemOrder.explorePoints[type].positions =
                            OrbemOrder.explorePoints[type].positions.concat(
                                persistItems
                            );
                    } else {
                        OrbemOrder.explorePoints[type].positions = persistItems;
                    }
                }

                persistItems = [];
            });
        }, timeoutTime);
    }
}

/**
 * Get the gauge width for the points bar.
 * @param  amount
 * @return {string}
 */
function getPointsGaugeAmount(amount) {
    'use strict';

    return Math.min(100, (amount / (window.nextLevelPointAmount || 1)) * 100) + '%';
}

/**
 * Save mission once completed.
 * @param mission
 * @param value
 * @param position
 */
function saveMission(mission, value, position) {
    'use strict';

    clearTimeout(saveMissionTimeouts[mission]);

    saveMissionTimeouts[mission] = setTimeout(() => {
        // Somebody finished something.
        document.dispatchEvent(new CustomEvent('orbem:mission-complete', {
            detail: { mission },
        }));

        // Cross off mission.
        const theMission = document.querySelector(
            '.' + escClass(mission) + '-mission-item'
        );

        // Materialize commuincation.
        const materializes = document.querySelectorAll(
            '[data-materializemission="' + mission + '"]'
        );

        if (materializes) {
            materializes.forEach((materialize) => {
                if (materialize.classList.contains('cutscene-trigger') && !materialize.classList.contains('enable') ) {
                    materialize.classList.add('enable');
                    materialize.style.display = 'block';
                } else {
                    materialize.style.display = 'block';
                    if ('explore-enemy' === materialize.dataset.genre) {
                        engageEnemy(materialize, false);
                    }
                    materializeGravity(materialize);
                }
            });
        }

        if (theMission) {
            const missionPoints = parseInt(theMission.dataset.points);
            const hazardRemoveText = theMission.dataset.hazardremove;
            const missionAbility = theMission.dataset.ability;

            showNextMission(theMission);

            const missionBlockade = theMission.dataset.blockade;

            // Remove blockade if exists.
            if (
                '' !== missionBlockade &&
                '0' !== JSON.parse(missionBlockade).top
            ) {
                document
                    .querySelector(
                        '.' + escClass(
                            theMission.className
                                .replace('engage', '')
                                .replace('next-mission', '')
                                .replace('mission-item', '')
                                .replace(/\s+/g, '')
                        ) +
                        '-blockade'
                    )
                    .remove();
            }

            theMission.style.textDecoration = 'line-through';

            // Remove hazard if set.
            if (
                null !== hazardRemoveText &&
                hazardRemoveText &&
                'none' !== hazardRemoveText
            ) {
                const hazardRemoveArray = hazardRemoveText.split(',');

                if (hazardRemoveArray) {
                    hazardRemoveArray.forEach((hazardRemove) => {
                        const dragDest = document.querySelector(
                            '.' + escClass(hazardRemove) + '-drag-dest-map-item'
                        );
                        const removedHazard = document.querySelector('.' + escClass(hazardRemove) + '-map-item');

                        removedHazard.remove();
                        itemGone(removedHazard);

                        if (dragDest) {
                            dragDest.remove();
                        }

                        if (
                            (true === Array.isArray(position) &&
                                false === position.includes(hazardRemove)) ||
                            (false === Array.isArray(position) &&
                                position !== hazardRemove)
                        ) {
                            // Make sure it doesn't come back.
                            persistItemRemoval(
                                hazardRemove,
                                'point',
                                0,
                                2000,
                                '',
                                true
                            );
                        }
                    });
                }
            }

            setTimeout(() => {
                theMission.remove();

                // Enable transportation if mission complete.
                if (missionAbility && 'transportation' === missionAbility) {
                    engageTransportFunction();

                    // Enable transportation in DB.
                    enableAbility('transportation');
                }

                // Remove after cutscene.
                const removeThings = document.querySelectorAll(
                    '[data-removeaftermission]'
                );

                if (removeThings) {
                    removeMissions(removeThings, mission);
                }

                // Show after mission.
                const showItems = document.querySelectorAll(
                    '[data-showaftermission="' + mission + '"]'
                );

                if (showItems) {
                    showItems.forEach((showItem) => {
                        materializedItemsArray.push(
                            cleanClassName(showItem.className)
                        );
                        showItem.classList.add('materialized'); // Use materialize instead of no point because other interactions use no point.

                        if ('explore-enemy' === showItem.dataset.genre) {
                            engageEnemy(showItem, false);
                        }

                        materializeGravity(showItem);
                    });

                    saveMaterializedItem(
                        currentLocation,
                        materializedItemsArray
                    );
                }
            }, 500);

            // Trigger cutscene if mission is attached.
            const theCutscene = document.querySelector(
                `.map-cutscene[data-mission="${mission}"]`
            );

            if (theCutscene) {
                const cutsceneName = cleanClassName(theCutscene.className);
                engageCutscene(cutsceneName, false);
            }

            if (value && missionPoints > 0) {
                // Give points.
                runPointAnimation(
                    value,
                    position,
                    true,
                    missionPoints,
                    mission
                );
            } else if (value && 0 === missionPoints) {
                persistItemRemoval(position, 'point', 0, 2000, '', true);
            }
        }

        if (false === isLoggedIn) {
            const missionArea = document.querySelector('.missions-content')?.dataset?.area || currentLocation;
            const storedMissions = JSON.parse(localStorage.getItem('orbem_local_missions') || '{}');
            if (!storedMissions[missionArea]) storedMissions[missionArea] = [];
            if (!storedMissions[missionArea].includes(mission)) {
                storedMissions[missionArea].push(mission);
            }
            localStorage.setItem('orbem_local_missions', JSON.stringify(storedMissions));
        }

        const filehref = `${OrbemOrder.siteRESTURL}/mission/`;

        const jsonString = {
            mission,
        };

        if (false !== isLoggedIn) {
            // Save position of item.
            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                    'Content-Type': 'application/json', // Set the content type to JSON
                    'X-WP-Nonce': OrbemOrder.orbemNonce,
                },
                body: JSON.stringify(jsonString), // The JSON stringified payload
            }).then((response) => {
                // Check if the response status is in the range 200-299
                if (!response.ok) {
                    throw new Error(
                        'Network response was not ok ' + response.statusText
                    );
                }
            });
        }
    }, 500);
}

function refreshHudVisibility() {
    'use strict';

    const hud = document.getElementById('explore-points');

    if (!hud) {
        return;
    }

    const isVisible = (el) => el && 'none' !== getComputedStyle(el).display;

    const hasBars = [...hud.querySelectorAll('.point-bar, .money-amount, .level-amount')]
        .some(isVisible);
    const hasMissions = [...hud.querySelectorAll('.mission-list .mission-item')]
        .some(isVisible);

    hud.classList.toggle('empty', !hasBars && !hasMissions);

    const missions = document.getElementById('missions');

    if (missions) {
        missions.style.display = hasMissions ? '' : 'none';
    }
}

function watchHudContents() {
    'use strict';

    const hud = document.getElementById('explore-points');

    if (!hud || hud._hudWatched) {
        return;
    }

    hud._hudWatched = true;

    let queued = false;
    const observer = new MutationObserver(() => {
        if (queued) {
            return;
        }
        queued = true;
        requestAnimationFrame(() => {
            queued = false;
            refreshHudVisibility();
        });
    });

    observer.observe(hud, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
    });
}

function showNextMission(theMission) {
    'use strict';

    const nextMissions =
        '' !== theMission.dataset.nextmission
            ? theMission.dataset.nextmission.split(',')
            : false;

    if (false !== nextMissions) {
        nextMissions.forEach((nextMission) => {
            nextMission = nextMission.trim();

            if ('' === nextMission) {
                return;
            }

            // Predecessors still on the board — exact list membership, since
            // data-nextmission is a comma list ('*=' would substring-match.)
            const allMissionsNext = Array.from(
                document.querySelectorAll('[data-nextmission]')
            ).filter((el) =>
                el.dataset.nextmission
                    .split(',')
                    .map((slug) => slug.trim())
                    .includes(nextMission)
            );

            if (1 === allMissionsNext.length) {
                const nextMissionEl = document.querySelector(
                    '.' + escClass(nextMission) + '-mission-item'
                );

                if (nextMissionEl) {
                    const nextMissionBlockade = nextMissionEl.dataset.blockade;

                    // If next mission exists then show it after previous is completed.
                    if (
                        '' !== nextMissionBlockade &&
                        '0' !== JSON.parse(nextMissionBlockade).top
                    ) {
                        const blockadeEl = document.querySelector(
                            '.' + escClass(
                                nextMissionEl.className
                                    .replace('mission-item ', '')
                                    .replace('next-mission ', '')
                            ) +
                            '-blockade'
                        );

                        if (blockadeEl) {
                            blockadeEl.style.display = 'block';
                        }
                    }

                    nextMissionEl.classList.add('engage');
                }
            }
        });
    }
}

// Mission timers

// How often a running clock is saved, besides when the page is left.
const MISSION_TIMER_SAVE_EVERY = 5000;

const missionTimers = new Map();
// Missions that ran out while on this page, so leaving them clears the saved "no time left" and coming back is a fresh try.
const missionTimedOut = new Set();
const missionTimeUps = [];
let missionTimerTick = null;
let missionTimerLast = 0;

function missionSlugOf(el) {
    'use strict';

    const cls = Array.from(el.classList).find(
        (c) => 'mission-item' !== c && c.endsWith('-mission-item')
    );

    return cls ? cls.slice(0, -'-mission-item'.length) : '';
}

function missionIsShowing(el) {
    'use strict';

    return (
        (!el.classList.contains('next-mission') ||
            el.classList.contains('engage')) &&
        'line-through' !== el.style.textDecoration
    );
}

function formatMissionTime(ms) {
    'use strict';

    const total = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;

    return minutes + ':' + String(seconds).padStart(2, '0');
}

function drawMissionTimer(timer) {
    'use strict';

    let clock = timer.el.querySelector('.mission-timer');

    if (!clock) {
        clock = document.createElement('span');
        clock.className = 'mission-timer';
        timer.el.appendChild(clock);
    }

    clock.textContent = formatMissionTime(timer.left);
    clock.classList.toggle('is-low', 10000 >= timer.left);

    drawTopClock();
}

function drawTopClock() {
    'use strict';

    let soonest = null;

    missionTimers.forEach((timer) => {
        if (timer.el.isConnected && (!soonest || timer.left < soonest.left)) {
            soonest = timer;
        }
    });

    let clock = document.getElementById('orbem-mission-clock');

    if (!soonest) {
        if (clock) {
            clock.hidden = true;
        }

        return;
    }

    if (!clock) {
        clock = document.createElement('div');
        clock.id = 'orbem-mission-clock';
        clock.setAttribute('role', 'timer');
        document.body.appendChild(clock);
    }

    const above = Array.from(document.querySelectorAll('#orbem-boss-bar, #orbem-defend-banner'))
        .filter((el) => !el.hidden && el.offsetHeight);
    const top = above.reduce((lowest, el) => Math.max(lowest, el.getBoundingClientRect().bottom + 8), 0);

    clock.style.top = top ? top + 'px' : '';
    clock.textContent = formatMissionTime(soonest.left);
    clock.classList.toggle('is-low', 10000 >= soonest.left);
    clock.hidden = false;
}

/**
 * Save the time left on one mission, or clear it (left = null).
 *
 * @param {string} slug
 * @param {number|null} left Milliseconds.
 */
function saveMissionTimer(slug, left) {
    'use strict';

    // Read from the page: this can run before anything has set isLoggedIn.
    if (!document.querySelector('main[data-loggedin]') || !slug) {
        return;
    }

    fetch(`${OrbemOrder.siteRESTURL}/mission-timer/`, {
        method: 'POST',
        credentials: 'same-origin',
        // Still sent when this is the page being left.
        keepalive: true,
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': OrbemOrder.orbemNonce,
        },
        body: JSON.stringify({
            mission: slug,
            left: null === left ? null : Math.max(0, Math.round(left)),
        }),
    }).catch(() => {});
}

function stopMissionTimer(slug) {
    'use strict';

    const timer = missionTimers.get(slug);

    if (!timer) {
        return;
    }

    missionTimers.delete(slug);
    timer.el.querySelector('.mission-timer')?.remove();
    saveMissionTimer(slug, null);
    drawTopClock();
}

/** Start timers for missions that have just appeared, and end those whose mission is gone. */
function syncMissionTimers() {
    'use strict';

    const present = new Set();

    document
        .querySelectorAll('.mission-list .mission-item[data-timer]')
        .forEach((el) => {
            const slug = missionSlugOf(el);
            const seconds = parseInt(el.dataset.timer, 10);

            if (!slug || !(0 < seconds)) {
                return;
            }

            present.add(slug);

            const timer = missionTimers.get(slug);

            if (timer) {
                timer.el = el;
                return;
            }

            if ('yes' === el.dataset.timerDone || !missionIsShowing(el)) {
                return;
            }

            // Time saved from before a refresh, used once: after that this page's own count is the one that is right.
            const saved = parseInt(el.dataset.timerLeft, 10);
            const left = 0 <= saved ? Math.min(saved, seconds * 1000) : seconds * 1000;

            delete el.dataset.timerLeft;

            const started = { el, left, saved: left };

            missionTimers.set(slug, started);
            drawMissionTimer(started);

            if (isNaN(saved)) {
                saveMissionTimer(slug, left);
            }
        });

    missionTimers.forEach((timer, slug) => {
        if (!present.has(slug)) {
            stopMissionTimer(slug);
        }
    });

    missionTimedOut.forEach((slug) => {
        if (!present.has(slug)) {
            missionTimedOut.delete(slug);
            saveMissionTimer(slug, null);
        }
    });

    if ((missionTimers.size || missionTimeUps.length) && !missionTimerTick) {
        missionTimerLast = performance.now();
        missionTimerTick = setInterval(tickMissionTimers, 250);
    }
}

function missionTimeUp(slug, timer) {
    'use strict';

    missionTimers.delete(slug);
    missionTimedOut.add(slug);
    saveMissionTimer(slug, 0);
    timer.el.dataset.timerDone = 'yes';
    timer.el.classList.add('timed-out');
    drawMissionTimer({ el: timer.el, left: 0 });
    drawTopClock();

    document.dispatchEvent(
        new CustomEvent('orbem:mission-timeout', { detail: { mission: slug } })
    );

    if (timer.el.dataset.timerCutscene) {
        missionTimeUps.push({ cutscene: timer.el.dataset.timerCutscene });
    }

    if (timer.el.dataset.timerExplainer) {
        missionTimeUps.push({ explainer: timer.el.dataset.timerExplainer });
    }
}

/** Play what running out leads to, one thing at a time, each once nothing else is showing. */
function playMissionTimeUps() {
    'use strict';

    if (
        !missionTimeUps.length ||
        true !== window.allowMovement ||
        document.querySelector('.map-cutscene.engage, .show-explainer')
    ) {
        return;
    }

    const next = missionTimeUps.shift();

    if (next.cutscene) {
        const cutscene = document.querySelector(
            '.' + escClass(next.cutscene) + '-map-cutscene'
        );

        if (cutscene) {
            // It is the consequence of running out, so it plays each time the player does, seen before or not.
            cutscene.classList.remove('been-viewed');
            engageCutscene(next.cutscene, false);
        }

        return;
    }

    if (next.explainer) {
        showExplainer(next.explainer, null);
    }
}

function tickMissionTimers() {
    'use strict';

    const now = performance.now();
    const elapsed = now - missionTimerLast;

    missionTimerLast = now;

    const playing =
        true === window.allowMovement &&
        !document.hidden &&
        !document.querySelector('.map-cutscene.engage, .show-explainer');

    if (playing) {
        missionTimers.forEach((timer, slug) => {
            if (!timer.el.isConnected) {
                return;
            }

            timer.left -= elapsed;

            if (0 >= timer.left) {
                missionTimeUp(slug, timer);
            } else {
                drawMissionTimer(timer);

                if (MISSION_TIMER_SAVE_EVERY <= timer.saved - timer.left) {
                    timer.saved = timer.left;
                    saveMissionTimer(slug, timer.left);
                }
            }
        });
    }

    playMissionTimeUps();
    drawTopClock();

    if (!missionTimers.size && !missionTimeUps.length) {
        clearInterval(missionTimerTick);
        missionTimerTick = null;
    }
}

// Leaving the page — a refresh, or closing the tab — saves every running clock where it stands.
window.addEventListener('pagehide', () => {
    missionTimers.forEach((timer, slug) => saveMissionTimer(slug, timer.left));
});

// Completing the mission is the win.
document.addEventListener('orbem:mission-complete', (event) => {
    playSfx('explore_sfx_mission');

    const slug = event.detail?.mission || '';
    const el = slug
        ? document.querySelector('.' + escClass(slug) + '-mission-item')
        : null;

    if (el) {
        el.dataset.timerDone = 'yes';
    }

    stopMissionTimer(slug);
});

function watchMissionTimers() {
    'use strict';

    // The list is rebuilt on every area change, and a following mission appears by gaining a class, so both are watched.
    const onList = new MutationObserver(syncMissionTimers);
    let watched = null;

    const attach = () => {
        const missions = document.getElementById('missions') || document.body;

        if (missions === watched) {
            return;
        }

        onList.disconnect();
        watched = missions;
        onList.observe(missions, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class'],
        });

        syncMissionTimers();
    };

    new MutationObserver(attach).observe(document.body, { childList: true, subtree: true });

    attach();
}

if ('loading' === document.readyState) {
    document.addEventListener('DOMContentLoaded', watchMissionTimers);
} else {
    watchMissionTimers();
}

function addCharacter(character) {
    'use strict';

    const filehref = `${OrbemOrder.siteRESTURL}/add-character/`;

    const jsonString = {
        slug: character,
    };

    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce,
        },
        body: JSON.stringify(jsonString), // The JSON stringified payload
    }).then((response) => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error(
                'Network response was not ok ' + response.statusText
            );
        }
    });
}

/**
 * Equip a new item to user.
 *
 * @param type
 * @param id
 * @param amount
 * @param unequip
 * @param name
 */
function equipNewItem(type, id, amount, unequip, name) {
    'use strict';

    const jsonString = {
        type,
        itemid: id,
        amount,
        unequip,
    };

    if ('weapons' === type) {
        window.currentWeapon = defaultWeapon !== name ? '-' + name : '';
    }

    if (false !== isLoggedIn) {
        // Save position of item.
        fetch(`${OrbemOrder.siteRESTURL}/equip-explore-item/`, {
            method: 'POST', // Specify the HTTP method
            headers: {
                'Content-Type': 'application/json', // Set the content type to JSON
                'X-WP-Nonce': OrbemOrder.orbemNonce,
            },
            body: JSON.stringify(jsonString), // The JSON stringified payload
        }).then((response) => {
            // Check if the response status is in the range 200-299
            if (!response.ok) {
                throw new Error(
                    'Network response was not ok ' + response.statusText
                );
            }

            const itemDescription = document.getElementById('item-description');
            if (itemDescription) {
                itemDescription.innerHTML = '';
            }

            setStaticMCImage(
                document.getElementById('map-character'),
                'down',
                true
            );
        });
    }
}

/**
 * Add new spell.
 *
 * @param id The spell id.
 */
function addNewSpell(id) {
    'use strict';

    const filehref = `${OrbemOrder.siteRESTURL}/addspell/`;

    const jsonString = {
        spellid: id,
    };

    if (false !== isLoggedIn) {
        // Save position of item.
        fetch(filehref, {
            method: 'POST', // Specify the HTTP method
            headers: {
                'Content-Type': 'application/json', // Set the content type to JSON
                'X-WP-Nonce': OrbemOrder.orbemNonce,
            },
            body: JSON.stringify(jsonString), // The JSON stringified payload
        }).then((response) => {
            // Check if the response status is in the range 200-299
            if (!response.ok) {
                throw new Error(
                    'Network response was not ok ' + response.statusText
                );
            }
        });
    }
}

/**
 * Remove an item from the storage menu.
 *
 * @param position
 * @param type
 */
function removeItemFromStorage(position, type) {
    'use strict';

    const menuItem = document.querySelector(
        '.retrieval-points span[title="' + position + '"]'
    );

    if (menuItem) {
        const itemCount = menuItem.getAttribute('data-count');
        const itemId = menuItem.getAttribute('data-id');

        // if item count is above 1 then reduce count by 1 instead of removing.
        if (itemCount && 1 < itemCount) {
            menuItem.setAttribute('data-count', itemCount - 1);
        } else {
            menuItem.setAttribute('data-type', '');
            menuItem.setAttribute('data-id', '');
            menuItem.setAttribute('data-value', '');
            menuItem.setAttribute('title', '');
            menuItem.setAttribute('data-empty', 'true');
            menuItem.setAttribute('data-count', '');
            menuItem.classList.remove('equipped');
            menuItem.innerHTML = '';
        }

        saveStorageItem(itemId, position, type, 0, true);
    }
}

/**
 * Save settings
 *
 * @param music
 * @param sfx
 * @param talking
 */
function saveSettings(music, sfx, talking) {
    'use strict';

    if (false === isLoggedIn) {
        return;
    }

    const jsonString = {
        music,
        sfx,
        talking,
    };

    // Save position of item.
    fetch(`${OrbemOrder.siteRESTURL}/save-settings/`, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce,
        },
        body: JSON.stringify(jsonString), // The JSON stringified payload
    }).then((response) => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error(
                'Network response was not ok ' + response.statusText
            );
        }
    });
}

/**
 * Save storage
 *
 * @param id
 * @param name
 * @param type
 * @param value
 * @param remove
 */
function saveStorageItem(id, name, type, value, remove) {
    'use strict';

    const filehref = `${OrbemOrder.siteRESTURL}/save-storage-item/`;

    const jsonString = {
        id,
        name,
        value,
        type,
        remove,
    };

    if (false === isLoggedIn) {
        return;
    }

    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce,
        },
        body: JSON.stringify(jsonString), // The JSON stringified payload
    }).then((response) => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error(
                'Network response was not ok ' + response.statusText
            );
        }
    });
}

/**
 * Adds points to user's account.
 *
 */
function resetExplore() {
    'use strict';

    isLoggedIn = document.querySelector('main').dataset?.loggedin ?? false;

    if (false === isLoggedIn) {
        return;
    }

    const filehref = `${OrbemOrder.siteRESTURL}/resetexplore/`;

    const jsonString = {};

    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce,
        },
        body: JSON.stringify(jsonString), // The JSON stringified payload
    }).then((response) => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error(
                'Network response was not ok ' + response.statusText
            );
        }
    });
}

/**
 * Restart the game: wipe saved progress and return to the game's start. Used by
 * the "The End" option on explainers and cutscenes.
 */
function restartGame() {
    'use strict';

    // Somewhere else may own what "The End" means.
    if ('function' === typeof window.orbemTheEnd && true === window.orbemTheEnd()) {
        return;
    }

    resetExplore();

    setTimeout(() => {
        window.location.href = OrbemOrder.gameURL;
    }, 1000);
}

/**
 * Save coordinates to user's account.
 *
 * @param left
 * @param top
 */
function addUserCoordianate(left, top) {
    'use strict';

    if (false === isLoggedIn) {
        return;
    }

    const filehref = `${OrbemOrder.siteRESTURL}/coordinates/`;

    const jsonString = {
        left: left.replace('px', ''),
        top: top.replace('px', ''),
    };

    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce,
        },
        body: JSON.stringify(jsonString), // The JSON stringified payload
    }).then((response) => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error(
                'Network response was not ok ' + response.statusText
            );
        }
    });
}

/**
 * Take health away from enemy.
 */
/**
 * Damage a single enemy with the player's weapon, resolving the weapon's
 * on-screen reach as the hit area.
 *
 * @param weaponEl
 * @param enemyEl
 */
function hitEnemyWithWeapon(weaponEl, enemyEl) {
    'use strict';

    hurtTheEnemy(weaponEl, enemyEl, weaponHitAreaOf(weaponEl));
}

function weaponHitAreaOf(weaponEl) {
    'use strict';

    // For an equipped overlay weapon, use the weapon image's reach (centered on
    // the character) as the hit area instead of the pushed-out hitbox point, so
    // range matches what's on screen.
    let weaponHitArea = weaponEl;
    const activeOverlay =
        weaponEl.matches &&
        weaponEl.matches('.weapon-swing, .weapon-thrust, .weapon-shoot')
            ? weaponEl.querySelector('.weapon-overlay')
            : null;

    if (activeOverlay) {
        const reach = Math.max(
            activeOverlay.offsetWidth,
            activeOverlay.offsetHeight
        );

        // Shift the hit area out by the weapon's range in the facing direction.
        const range = parseInt(weaponEl.dataset.range, 10) || 0;
        let rangeX = 0;
        let rangeY = 0;
        switch (weaponEl.dataset.direction) {
            case 'top':
                rangeY = -range;
                break;
            case 'down':
                rangeY = range;
                break;
            case 'left':
                rangeX = -range;
                break;
            case 'right':
                rangeX = range;
                break;
        }

        const verticalOffset =
            parseInt(weaponEl.dataset.verticalOffset, 10) || 0;

        weaponHitArea = {
            offsetLeft: weaponEl.offsetLeft - reach + rangeX,
            offsetTop: weaponEl.offsetTop - reach + rangeY + verticalOffset,
            offsetWidth: reach * 2,
            offsetHeight: reach * 2,
            classList: { contains: () => false },
        };
    }

    return weaponHitArea;
}

/**
 * What this swing costs whatever it lands on.
 *
 * @param theWeapon
 * @return {number}
 */
function attackStrengthOf(theWeapon) {
    'use strict';

    let attackType =
        true === theWeapon.classList.contains('heavy-engage')
            ? 'heavy'
            : 'normal';

    attackType =
        true === theWeapon.classList.contains('charge-attack-engage')
            ? 'charged'
            : attackType;

    return (
        Math.round(parseInt(JSON.parse(theWeapon.dataset.strength)[attackType]) * statScale('strength')) +
        window.attackMultiplier
    );
}

function statScale(name) {
    'use strict';

    return Math.max(1, parseFloat((window.orbemPlayerStats || {})[name]) || 1);
}

let stepCarry = 0;

function nextStep() {
    'use strict';

    const exact = window.moveSpeed * (window.orbemSpeedScale || 1) * statScale('speed') + stepCarry;
    const whole = Math.floor(exact);

    stepCarry = exact - whole;
    window.orbemStep = whole;

    return whole;
}

function stepSpeed() {
    'use strict';

    return window.orbemStep || window.moveSpeed;
}

function damageTaken(amount) {
    'use strict';

    const raw = parseInt(amount, 10) || 0;

    if (0 >= raw) {
        return 0;
    }

    const offset = parseInt(window.defenseMultiplier, 10) || 0;

    return Math.max(1, Math.round((raw - offset) / statScale('defense')));
}

window.orbemDamageTaken = damageTaken;

/**
 * Offer this swing to any other player standing in it.
 *
 * @param weaponEl
 */
function swingAtPlayers(weaponEl) {
    'use strict';

    if (!weaponEl || !weaponEl.dataset || !weaponEl.dataset.strength) {
        return;
    }

    let strength;

    try {
        strength = attackStrengthOf(weaponEl);
    } catch (e) {
        return;
    }

    if (!strength) {
        return;
    }

    hitPlayersInReach(weaponHitAreaOf(weaponEl), strength, elementsOverlap);
}

/**
 * Deal the player's attack damage to every enemy currently in reach.
 *
 * @param weaponEl
 */
function hitEnemiesInReach(weaponEl) {
    'use strict';

    if (!weaponEl) {
        return;
    }

    document.querySelectorAll('.enemy-item').forEach((enemyEl) => {
        hitEnemyWithWeapon(weaponEl, enemyEl);
    });

    // And anybody else standing in it, where the area allows fighting.
    swingAtPlayers(weaponEl);
}

function damageEnemy(value, attackStrength, weaponName, remote) {
    'use strict';

    const enemyHealth = value.dataset.health;
    const enemyFullHealth = value.dataset.healthamount;
    const enemyMission = value.dataset.mission;

    const newHealth =
        0 <= enemyHealth - attackStrength
            ? enemyHealth - attackStrength
            : 0;

    const weaponType = value.dataset.weapon ?? '';
    const enemyHealthBar = value.querySelector('.enemy-health-bar-wrapper');

    if (
        remote ||
        ('' !== weaponType &&
            weaponName === weaponType) ||
        '' === weaponType
    ) {
        if (!remote) {
            value.dataset.nextAllowedHit = String(Date.now() + 1000);
        }

        value.setAttribute('data-health', newHealth);

        if ('true' !== value.dataset.spawned) {
            document.dispatchEvent(new CustomEvent('orbem:enemy-hurt', {
                detail: { enemy: value, name: cleanClassName(value.className), amount: attackStrength, remote },
            }));
        }

        updateBossBar(value);

        // A boss with its bar across the screen does not need one over its head too.
        if (enemyHealthBar && 'yes' !== value.dataset.bossBar) {
            if ('block' !== enemyHealthBar.style.display) {
                enemyHealthBar.style.display = 'block';
            }

            const enemyHealthPercent = parseInt(
                (parseInt(value.dataset.health) / parseInt(value.dataset.healthamount)) * 100
            );

            if (enemyHealthPercent) {
                enemyHealthBar.querySelector('.enemy-health-bar').style.width =
                    enemyHealthPercent + '%';
            }
        }
    }

    if ('boss' === value.getAttribute('data-enemy-type') && !bossSequence(value)) {
        if (
            newHealth <= enemyFullHealth * 0.75 &&
            !value._secondWaveHit
        ) {
            value._secondWaveHit = true;
            updateBossWave(value);
        } else if (
            newHealth <= enemyFullHealth * 0.5 &&
            !value._thirdWaveHit
        ) {
            value._thirdWaveHit = true;
            updateBossWave(value);
        } else if (
            newHealth <= enemyFullHealth * 0.25 &&
            !value._fourthWaveHit
        ) {
            value._fourthWaveHit = true;
            updateBossWave(value);
        }
    }

    playHurtSound(value);

    if (0 === newHealth) {
        const spawnedCopy = 'true' === value.dataset.spawned;

        // Anything keeping count — waves, a score — listens here rather than watching the map.
        document.dispatchEvent(new CustomEvent('orbem:enemy-defeated', {
            detail: {
                enemy: value,
                spawned: spawnedCopy,
                spawner: spawnedCopy ? document.getElementById(value.dataset.spawnedFrom) : null,
            },
        }));

        // Grant the reward defined for killing this enemy.
        const rewardAmount = parseInt(value.dataset.rewardValue || '0', 10);
        const rewardType = value.dataset.type;

        if (0 < rewardAmount && rewardType) {
            runPointAnimation(value, cleanClassName(value.className), true, rewardAmount, '');
        }

        stopShooterEnemy(value);
        stopRunnerEnemy(value);
        stopPathMovement(value);
        stopBossSequence(value);

        if (value._pulsewaveInterval) {
            clearInterval(value._pulsewaveInterval);
            value._pulsewaveInterval = null;
        }

        const enemyName = cleanClassName(value.className);
        const deadImage = value.querySelector('#' + escClass(enemyName) + 'dead');

        if (deadImage && deadImage?.src && '' !== deadImage.getAttribute('src')) {
            enemyHealthBar.style.display = 'none';
            const currentEnemyImage = value.querySelector('.character-icon.engage');
            currentEnemyImage.classList.remove('engage');
            deadImage.classList.add('engage');
            value.style.zIndex = '0';

            setTimeout(() => {
                value.remove();

                if (!spawnedCopy) {
                    saveEnemyMission(enemyMission, value);
                }
            }, 2000);
        } else {
            value.remove();

            if (!spawnedCopy) {
                saveEnemyMission(enemyMission, value);
            }
        }

        // A copy shares its spawner's name.
        if (spawnedCopy) {
            return;
        }

        const position = cleanClassName(value.className);
        const filehref = `${OrbemOrder.siteRESTURL}/enemy/`;

        const jsonString = {
            health: 0,
            position,
        };

        if (false !== isLoggedIn) {
            fetch(filehref, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': OrbemOrder.orbemNonce,
                },
                body: JSON.stringify(jsonString),
            }).then((response) => {
                if (!response.ok) {
                    throw new Error(
                        'Network response was not ok ' + response.statusText
                    );
                }
            });
        }
    } else {
        hurtAnimationEnemy(value, attackStrength);
    }
}

window.orbemHurtEnemy = function (name, amount) {
    const enemy = Array.from(document.querySelectorAll('[data-genre="explore-enemy"]:not([data-spawned="true"])'))
        .find((el) => cleanClassName(el.className) === name);

    if (!enemy || !enemy.isConnected || 0 >= parseInt(enemy.dataset.health || '0', 10)) {
        return false;
    }

    damageEnemy(enemy, parseInt(amount, 10) || 0, '', true);

    return true;
};

window.orbemItemName = (classes) => cleanClassName(String(classes || ''));

window.orbemRemoveItem = function (name) {
    const item = document.querySelector('.' + escClass(name) + '-map-item');

    if (!item) {
        return false;
    }

    document.querySelector('.' + escClass(name) + '-drag-dest-map-item')?.remove();
    item.remove();

    return true;
};

function itemGone(item) {
    if (item) {
        document.dispatchEvent(new CustomEvent('orbem:item-gone', {
            detail: { item, name: cleanClassName(item.className) },
        }));
    }
}

const hurtTheEnemy = (function () {
    'use strict';

    return function (theWeapon, value, hitArea) {
        if (isSpawner(value)) {
            return;
        }

        // The overlap test can use a separate hit area.
        const overlapTarget = hitArea || theWeapon;

        if (value && theWeapon && elementsOverlap(overlapTarget, value, 0)) {
            const now = Date.now();
            const nextAllowedHit = parseInt(value.dataset.nextAllowedHit || '0', 10);

            if (now < nextAllowedHit) {
                return;
            }

            if (
                'explore-enemy' === value.dataset.genre &&
                false === theWeapon.classList.contains('protection')
            ) {
                damageEnemy(value, attackStrengthOf(theWeapon), theWeapon.dataset.weapon, false);
            }
        }
    };
})();

function hurtAnimationEnemy(enemy, pushAmount) {
    if (false === enemy.classList.contains('hurt')) {
        const mapChar = document.querySelector('#map-character');
        const direction = mapChar.className.replace('-dir', '');
        const currentLeft = parseInt(enemy.style.left, 10);
        const currentTop = parseInt(enemy.style.top, 10);
        const currentImage = enemy.querySelector('.character-icon.engage');
        let hurtDirection = 'down';

        enemy.classList.add('hurt');

        let newLeft = currentLeft;
        let newTop = currentTop;

        pushAmount = pushAmount * 2;

        if ('boss' === enemy.dataset.enemyType) {
            pushAmount = 0 !== pushAmount ? pushAmount - 10 : 0;
        }

        if ('blocker' === enemy.dataset.enemyType) {
            pushAmount = 0;
        }

        switch (direction) {
            case 'right':
                newLeft = currentLeft + pushAmount;
                hurtDirection = 'left';
                break;
            case 'left':
                newLeft = currentLeft - pushAmount ;
                hurtDirection = 'right';
                break;
            case 'down':
                newTop = currentTop + pushAmount;
                hurtDirection = 'up';
                break;
            case 'up':
                newTop = currentTop - pushAmount;
                hurtDirection = 'down';
                break;
        }

        const hurtImage = enemy.querySelector('#' + escClass(cleanClassName(enemy.className)) + hurtDirection + '-hurt');

        if ( hurtImage && '' !== hurtImage.getAttribute('src') && currentImage ) {
            currentImage.classList.remove('engage');
            hurtImage.classList.add('engage');
        }

        setTimeout(() => {
            enemy.classList.remove('hurt');
            const currentEnemyImage = enemy.querySelector('.character-icon.engage');

            if (currentEnemyImage === hurtImage && '' !== hurtImage.getAttribute('src')) {
                currentImage.classList.add('engage');
            }

            if (hurtImage && '' !== hurtImage.getAttribute('src') ) {
                hurtImage.classList.remove('engage');
            }
        }, 700);

        // After computing newTop/newLeft from the hit force...
        const collisionWalls = document.querySelectorAll(
            '.map-character-icon.engage, .default-map svg rect, .map-item' +
            ':not([data-wanderer="yes"]):not(.explainer-container):not(.materialize-item-trigger):not(.drag-dest):not([data-trigger="true"]):not(.currently-dragging):not([data-passable="true"].no-point):not([data-passable="true"][data-collectable="true"]):not(.passable):not([data-genre="explore-sign"]):not([data-foreground="true"]):not([data-background="true"])'
        );

        const clampedPosition = clampToWalls(collisionWalls, enemy, newTop, newLeft);
        enemy.style.left = clampedPosition.left + 'px';
        enemy.style.top  = clampedPosition.top  + 'px';
    }
}

function clampToWalls(collisionWalls, enemy, newTop, newLeft) {
    const enemyImage = enemy.querySelector('.character-icon.engage') || enemy;
    const inset = 20; // must match enemyHitInset

    let clampedLeft = newLeft;
    let clampedTop  = newTop;

    // The enemy's collision box at the proposed new position
    const eLeft   = newLeft  + inset;
    const eTop    = newTop   + inset;
    const eRight  = newLeft  + enemyImage.offsetWidth  - inset;
    const eBottom = newTop   + enemyImage.offsetHeight - inset;

    collisionWalls.forEach((wall) => {
        // Skip self
        if (wall === enemy) return;

        // Get wall bounds — handle DOM elements, SVG map rects and plain objects.
        const wallBox = collisionBox(wall, { offsetLeft: eLeft, offsetTop: eTop, offsetWidth: eRight - eLeft, offsetHeight: eBottom - eTop });
        const wLeft   = wallBox.offsetLeft;
        const wTop    = wallBox.offsetTop;
        const wRight  = wallBox.offsetLeft + wallBox.offsetWidth;
        const wBottom = wallBox.offsetTop  + wallBox.offsetHeight;

        // No overlap — nothing to clamp
        if (eRight <= wLeft || eLeft >= wRight ||
            eBottom <= wTop || eTop >= wBottom) return;

        // Compute penetration depth on each axis
        const overlapLeft   = eRight  - wLeft;   // enemy's right into wall's left
        const overlapRight  = wRight  - eLeft;   // enemy's left into wall's right
        const overlapTop    = eBottom - wTop;     // enemy's bottom into wall's top
        const overlapBottom = wBottom - eTop;     // enemy's top into wall's bottom

        // Push out along the axis of least penetration
        const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

        if (minOverlap === overlapLeft) {
            // Came from the right — push left
            clampedLeft -= overlapLeft;
        } else if (minOverlap === overlapRight) {
            // Came from the left — push right
            clampedLeft += overlapRight;
        } else if (minOverlap === overlapTop) {
            // Came from below — push down
            clampedTop -= overlapTop;
        } else {
            // Came from above — push up
            clampedTop += overlapBottom;
        }
    });

    return { left: clampedLeft, top: clampedTop };
}

function saveEnemyMission(enemyMission, value) {
    if (
        enemyMission &&
        noOtherItemAttachedToMission(enemyMission)
    ) {
        saveMission(enemyMission, value, enemyMission);
    }
}

function playHurtSound(character) {
    const hurtSound = character.querySelector('.hurt-sound audio');

    if ( hurtSound ) {
        hurtSound.volume = window.sfxVolume;

        setInterval(() => {
            hurtSound.volume = window.sfxVolume;
        }, 1000);

        hurtSound.play();
    }
}

window.orbemApplyDayNight = function (dayNight) {
    const container = document.querySelector('.game-container');

    if (!container) {
        return;
    }

    setDayNightData(container, dayNight);

    const world = container.querySelector('.game-world');
    const scale = parseFloat(container.dataset.areaScale) || 1;

    if (world && (1 !== scale || dayNightWanted(container))) {
        applyDayNight();
        return;
    }

    if (world) {
        const defaultMap = world.querySelector('.default-map');

        container
            .querySelectorAll(':scope > .map-cutscene, :scope > .minigame, :scope > .communication-wrapper')
            .forEach((overlay) => {
                defaultMap?.appendChild(overlay);
            });
    }

    applyAreaScale(scale);
};

function setDayNightData(container, dayNight) {
    'use strict';

    if (!container) {
        return;
    }

    const clock = dayNight || {};

    container.dataset.dayNight = clock.mode || '';
    container.dataset.dayNightCycle = clock.minutes || 60;
    container.dataset.dayNightEpoch = clock.epoch || 0;
    container.dataset.dayNightOffset = clock.offset || 0;
    container.dataset.dayNightNow = clock.now || '';
}

function setWeatherData(container, weather) {
    'use strict';

    if (!container) {
        return;
    }

    const sky = weather || {};

    container.dataset.weather = (sky.kinds || []).join(' ');
    container.dataset.weatherFrequency = sky.frequency || 'always';
    container.dataset.weatherSeed = sky.seed || 0;
    container.dataset.weatherNow = sky.now || '';
}

function weatherWanted(container) {
    'use strict';

    return '' !== (container?.dataset.weather || '');
}

function dayNightWanted(container) {
    'use strict';

    return ['cycle', 'dusk', 'night'].includes(container?.dataset.dayNight || '');
}

function dayNightHour(container) {
    'use strict';

    const minutes = parseFloat(container.dataset.dayNightCycle) || 60;
    const epoch = parseFloat(container.dataset.dayNightEpoch) || 0;
    const offset = parseFloat(container.dataset.dayNightOffset) || 0;
    const now = Date.now() + (window.dayNightSkew || 0);
    const day = (now - epoch) / (minutes * 60000) + offset;

    return ((day % 1) + 1) % 1 * 24;
}

function dayNightLook(hour) {
    'use strict';

    const night = [1, 1, 22, 32, 95, 0.74];
    const twilight = [1, 1, 70, 72, 150, 0.6];
    const dawn = [1, 1, 235, 175, 135, 0.28];
    const day = [1, 1, 255, 255, 255, 0];
    const dusk = [1, 1, 215, 120, 75, 0.4];
    const stops = [
        [0, night],
        [4.5, night],
        [5.3, twilight],
        [6, dawn],
        [8, day],
        [17, day],
        [18.75, dusk],
        [19.6, twilight],
        [20.5, night],
        [24, night],
    ];

    let i = 0;

    while (i < stops.length - 2 && hour >= stops[i + 1][0]) {
        i++;
    }

    const [fromHour, from] = stops[i];
    const [toHour, to] = stops[i + 1];
    const t = toHour > fromHour ? Math.min(1, Math.max(0, (hour - fromHour) / (toHour - fromHour))) : 0;
    const mix = from.map((value, k) => value + (to[k] - value) * t);

    return {
        brightness: mix[0].toFixed(3),
        saturate: mix[1].toFixed(3),
        tint: `rgba(${Math.round(mix[2])}, ${Math.round(mix[3])}, ${Math.round(mix[4])}, ${mix[5].toFixed(3)})`,
    };
}

function applyDayNight() {
    'use strict';

    const container = document.querySelector('.game-container');

    clearInterval(window.dayNightTimer);
    clearInterval(window.dayNightLightTimer);

    if (!container) {
        return;
    }

    if (container.dataset.dayNightNow) {
        window.dayNightSkew = parseFloat(container.dataset.dayNightNow) - Date.now();
        container.dataset.dayNightNow = '';
    }

    const world = container.querySelector('.game-world');
    let shade = world?.querySelector(':scope > .day-night-shade');

    if (!world || false === dayNightWanted(container)) {
        shade?.remove();

        if (world) {
            world.style.filter = '';
            world.style.isolation = '';
        }

        return;
    }

    if (!shade) {
        shade = document.createElement('div');
        shade.className = 'day-night-shade';
        shade.style.cssText =
            'position:absolute;inset:0;pointer-events:none;mix-blend-mode:multiply;' +
            'z-index:2147483646;transition:background-color 1s linear;';
        world.appendChild(shade);
    }

    world.style.isolation = 'isolate';
    world.style.transition = 'filter 1s linear';

    const mode = container.dataset.dayNight;
    const paint = () => {
        const look = dayNightLook('cycle' === mode ? dayNightHour(container) : ('dusk' === mode ? 18.75 : 0));

        world.style.filter = '';
        shade.style.backgroundColor = look.tint;
        shade.dataset.dark = parseFloat(look.tint.split(',')[3]) > 0.02 ? 'yes' : '';
    };

    paint();
    paintLights(world, shade);

    if ('cycle' === mode) {
        window.dayNightTimer = setInterval(paint, 1000);
    }

    window.dayNightLightTimer = setInterval(() => paintLights(world, shade), 100);
}

function paintLights(world, shade) {
    'use strict';

    if (!world.isConnected || !shade.isConnected) {
        clearInterval(window.dayNightLightTimer);
        return;
    }

    const lights = [];

    if ('yes' === shade.dataset.dark) {
        world.querySelectorAll('.default-map [data-illuminate]').forEach((el) => {
            const radius = parseInt(el.dataset.illuminate, 10) || 0;

            if (0 < radius && el.offsetWidth && 'none' !== el.style.display) {
                lights.push([el.offsetLeft + el.offsetWidth / 2, el.offsetTop + el.offsetHeight / 2, radius]);
            }
        });

        const weapon = document.querySelector('.map-weapon');
        const mapChar = document.getElementById('map-character');
        const held = weapon ? parseInt(weapon.dataset.light, 10) || 0 : 0;

        if (0 < held && mapChar) {
            const facing = String(mapChar.className).match(/\b(up|down|left|right)-dir\b/);
            const ahead = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[facing ? facing[1] : 'down'];

            lights.push([
                mapChar.offsetLeft + (window.globalLeftPositionOffset || 0) + ahead[0] * held * 0.35,
                mapChar.offsetTop + (window.globalTopPositionOffset || 0) + ahead[1] * held * 0.35,
                held,
            ]);
        }
    }

    const layers = [];

    lights.forEach(([x, y, r]) => layers.push({
        image: `radial-gradient(circle ${Math.round(r)}px at ${Math.round(x)}px ${Math.round(y)}px, transparent 0, transparent ${Math.round(r * 0.45)}px, #000 ${Math.round(r)}px)`,
        size: '100% 100%',
        position: '0 0',
        composite: 'intersect',
    }));

    if (layers.length) {
        layers.push({ image: 'linear-gradient(#000, #000)', size: '100% 100%', position: '0 0', composite: 'add' });
    }

    const mask = layers.map(l => l.image + ' ' + l.position + ' / ' + l.size).join(', ');

    if (shade.dataset.mask === mask) {
        return;
    }

    shade.dataset.mask = mask;

    const set = (name, value) => {
        shade.style[name] = value;
        shade.style['webkit' + name.charAt(0).toUpperCase() + name.slice(1)] = value;
    };

    set('maskImage', layers.length ? layers.map(l => l.image).join(', ') : 'none');
    set('maskSize', layers.map(l => l.size).join(', '));
    set('maskPosition', layers.map(l => l.position).join(', '));
    set('maskRepeat', 'no-repeat');
    shade.style.maskComposite = layers.map(l => l.composite).join(', ');
}

/**
 * Pull new area html.
 *
 */
/**
 * Wrap (or unwrap) the world in a transform-scaled `.game-world` layer for the
 * given area zoom, and keep window.areaScale / devZoom / the container
 * attribute in sync. Called on load and on every area change so the zoom
 * follows the player between areas. offsetLeft/Top-based collision is
 * transform-invariant, so only this DOM structure and the screen<->world
 * conversions (click-to-move, projectile aiming, devmode placement) depend on
 * the scale.
 *
 * @param {number} scale The area zoom factor (1 = no zoom).
 */
function applyAreaScale(scale) {
    'use strict';

    const container = document.querySelector('.game-container');

    if (!container) {
        return;
    }

    scale = parseFloat(scale) || 1;
    window.areaScale = scale;
    container.dataset.areaScale = scale;
    window.devZoom = scale;

    // Clear any overlays a previous area hoisted to the container so stale
    // cutscene/minigame/communicate popups don't accumulate between areas.
    container
        .querySelectorAll(
            ':scope > .map-cutscene, :scope > .minigame, :scope > .communication-wrapper'
        )
        .forEach((overlay) => {
            overlay.remove();
        });

    let world = container.querySelector('.game-world');

    if (1 === scale && false === dayNightWanted(container) && false === weatherWanted(container)) {
        clearInterval(window.dayNightTimer);
        clearInterval(window.dayNightLightTimer);
        world?.querySelector(':scope > .day-night-shade')?.remove();

        // Unwrap: return the world elements to the container, drop the layer.
        if (world) {
            while (world.firstChild) {
                container.appendChild(world.firstChild);
            }
            world.remove();

            // Keep default-map painting last (map items over the character),
            // matching the canonical unscaled DOM order.
            const defaultMap = container.querySelector('.default-map');

            if (defaultMap) {
                container.appendChild(defaultMap);
            }
        }
        return;
    }

    // Ensure the scaled layer exists.
    if (!world) {
        world = document.createElement('div');
        world.className = 'game-world';
        container.appendChild(world);
    }

    world.style.cssText =
        'position:absolute;top:0;left:0;width:5000px;height:4517px;' +
        'transform-origin:0 0;transform:scale(' +
        scale +
        ');will-change:transform;';

    // Move the visual world into the layer, in paint order. appendChild moves
    // elements already inside the layer to enforce a consistent order.
    ['.container-image', '#map-character', '.map-weapon', '.default-map'].forEach(
        (selector) => {
            const el = container.querySelector(selector);

            if (el) {
                world.appendChild(el);
            }
        }
    );

    // Menu/fullscreen explainers render their pop-ups as screen-fixed direct
    // children of the container, but their map triggers are world-positioned.
    // Pull any stray world trigger into the scaled layer so its (offset-based)
    // hit area lines up with the zoomed map instead of firing at a 1x spot.
    container
        .querySelectorAll(':scope > [data-trigger="true"], :scope > .explainer-trigger')
        .forEach((trigger) => {
            world.appendChild(trigger);
        });

    // Lift the screen-fixed overlays back out to the container so their
    // position:fixed anchors to the viewport, not the transformed layer.
    const defaultMap = world.querySelector('.default-map');

    if (defaultMap) {
        defaultMap
            .querySelectorAll('.map-cutscene, .minigame, .communication-wrapper')
            .forEach((overlay) => {
                container.appendChild(overlay);
            });
    }

    applyDayNight();
}

const enterNewArea = (function () {
    'use strict';

    window.runningPointFunction = false;
    let called = false;

    return function (position, weapon, mapUrl, nextAreaPosition, characters) {
        fadeOutScene();
        isLoggedIn = document.querySelector('main').dataset?.loggedin ?? false;

        window.previousCutsceneArea =
            '' === window.previousCutsceneArea
                ? (OrbemOrder.previousCutsceneArea || localStorage.getItem('orbem_local_previousCutsceneArea') || '')
                : window.previousCutsceneArea;

        // Incase using level selector.
        playStartScreenMusic(false);

        window.allowMovement = false;

        const enemyRunners = document.querySelectorAll('.enemy-item[data-enemy-type="runner"]');

        if (enemyRunners) {
            enemyRunners.forEach((enemyItem) => {
                stopRunnerEnemy(enemyItem);
            });
        }

        const enemyShooters = document.querySelectorAll('.enemy-item[data-enemy-type="shooter"]');

        if (enemyShooters) {
            enemyShooters.forEach((enemyItem) => {
                stopShooterEnemy(enemyItem);
            });
        }

        document
            .querySelectorAll('.path-onload[data-path]:not([data-path=""])')
            .forEach((walker) => stopPathMovement(walker));

        // Remove menu explainers. Include any that applyAreaScale hoisted into
        // the scaled .game-world layer so they don't linger between areas.
        const menuExplainers = document.querySelectorAll(
            '.game-container > .explainer-container, .game-container > .explainer-trigger, .game-world > .explainer-container, .game-world > .explainer-trigger'
        );

        if (menuExplainers) {
            menuExplainers.forEach((explainer) => {
                explainer.remove();
            });
        }

        // Remove old devmmode.
        const devModeButton = document.querySelector('.right-bottom-devmode');
        const devModeMenu = document.querySelector('.dev-mode-menu');

        if (devModeMenu && devModeButton) {
            devModeMenu.remove();
            devModeButton.remove();
        }

        // Remove current explore finder list items. DEVMODE
        const finderItems = document.querySelector('.explore-item-list');

        if (finderItems) {
            finderItems.innerHTML = '';
        }

        // Remove old items.
        const defaultMap = document.querySelector('.default-map');

        if (defaultMap) {
            defaultMap.remove();
        }

        // Don't repeat enter.
        if (false === called) {
            const filehref = `${OrbemOrder.siteRESTURL}/area/`;
            let newMusic = '';

            if (OrbemOrder.musicNames) {
                newMusic = JSON.parse(OrbemOrder.musicNames)[position];
            }

            const jsonString = {
                position,
                characters,
            };

            // Save position of item.
            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': OrbemOrder.orbemNonce,
                },
                body: JSON.stringify(jsonString),
            })
                .then((response) => {
                    // Check if the response status is in the range 200-299
                    if (!response.ok) {
                        throw new Error(
                            'Network response was not ok ' + response.statusText
                        );
                    }
                    return response.json();
                })
                .then((data) => {
                    let newMapItems = data;

                    newMapItems = newMapItems.data;
                    const mapItemStyles =
                        document.getElementById('map-item-styles');
                    const mainCont = document.querySelector('.site-main');
                    const head = document.querySelector('head');
                    let devMode = '';

                    if (
                        newMapItems['dev-mode'] &&
                        '' !== newMapItems['dev-mode']
                    ) {
                        devMode = newMapItems['dev-mode'];
                    }

                    if ('' !== devMode) {
                        mainCont.innerHTML = devMode + mainCont.innerHTML;

                        // Show Devmode.
                        const devModeMenus = document.querySelectorAll(
                            '.right-bottom-devmode, .dev-mode-menu, .right-bottom-devmode-pro',
                        );

                        if (devModeMenus) {
                            devModeMenus.forEach((devModeMenu) => {
                                devModeMenu.classList.add('engage');
                            });
                        }
                    }

                    // Delete old area styles/maps.
                    if (mapItemStyles) {
                        mapItemStyles.remove();
                    }

                    const newStyles = document.createElement('style');
                    newStyles.id = 'map-item-styles';
                    newStyles.innerHTML =
                        newMapItems['map-item-styles-scripts'];

                    // Add area missions.
                    const missionList =
                        document.querySelector('.missions-content');

                    if (missionList) {
                        missionList.innerHTML = newMapItems['map-missions'];
                        missionList.dataset.area = position;

                        if ('' !== window.nextAreaMissionComplete) {
                            const completeMission = document.querySelector(
                                '.' + escClass(window.nextAreaMissionComplete) +
                                '-mission-item'
                            );

                            if (completeMission) {
                                completeMission.style.textDecoration =
                                    'line-through';

                                setTimeout(() => {
                                    showNextMission(completeMission);
                                    completeMission.remove();
                                }, 500);
                            }
                        }

                        if (false === isLoggedIn) {
                            const storedMissions = JSON.parse(localStorage.getItem('orbem_local_missions') || '{}');
                            const completedMissions = storedMissions[position] || [];
                            completedMissions.forEach((completedMission) => {
                                const completedEl = missionList.querySelector('.' + escClass(completedMission) + '-mission-item');
                                if (completedEl) {
                                    showNextMission(completedEl);
                                    completedEl.remove();
                                }
                            });
                        }
                    }

                    // Add new map styles and map urls.
                    if (head) {
                        head.append(newStyles);
                    }

                    // Replace items.
                    if (defaultMap) {
                        setTimeout(() => {
                            const container =
                                document.querySelector('.game-container');
                            // Create new default map.
                            const newDefaultMap = document.createElement('div');
                            newDefaultMap.className = 'default-map';

                            // Set starting position in case you die.
                            newDefaultMap.dataset.starttop =
                                newMapItems['start-top'];
                            newDefaultMap.dataset.startleft =
                                newMapItems['start-left'];
                            newDefaultMap.innerHTML =
                                (newMapItems['map-explainers'] || '') +
                                (newMapItems['map-items'] || '') +
                                (newMapItems['map-cutscenes'] || '') +
                                (newMapItems.minigames || '') +
                                (newMapItems['map-svg'] || '') +
                                (newMapItems['map-communicate'] || '');

                            if ('yes' === newMapItems['is-cutscene']) {
                                newDefaultMap.dataset.iscutscene = 'yes';
                            }

                            container.innerHTML =
                                newMapItems['menu-explainers'] +
                                newMapItems['fullscreen-explainers'] +
                                container.innerHTML +
                                newDefaultMap.outerHTML;

                            // Set new area physics before movementIntFunc so
                            // gravity mode is correct from tick 1.
                            container.dataset.physics = newMapItems['area-physics'] || '';
                            window.gravityMode = 'gravity' === container.dataset.physics;
                            if (window.gravityMode) {
                                window.jumpVelocity = 0;
                                window.isGrounded = false;
                                window.canDoubleJump = false;
                            }

                            // Apply this area's zoom BEFORE movement/camera setup
                            // so the world is wrapped in the scaled layer first
                            // (and the camera centers on the scaled character).
                            // Runs here rather than at the end of this block so a
                            // later error can't skip the wrapping.
                            setDayNightData(container, newMapItems['day-night']);
                            setWeatherData(container, newMapItems.weather);
                            applyAreaScale(newMapItems['area-scale']);

                            // Engage walking.
                            movementIntFunc();
                            window.allowMovement = true;

                            // Engage action.
                            document.querySelector('.action-key').addEventListener('click', dragItemEvent);
                            document.querySelector('.action-key').addEventListener('click', characterHitEvent);

                            // Engage settings menus.
                            engageSettingsMenus();

                            // Engage storage menus.
                            engageStorageMenus();

                            // Engage clickables. Must run here (after the new
                            // area's items are actually in the DOM) rather than
                            // in the sibling 100ms setTimeout below, which fires
                            // before this 700ms block and would find nothing.
                            engageClickableTimes();

                            // Add characters.
                            const characterList = document.querySelector(
                                '.characters-content'
                            );

                            if (characterList) {
                                characterList.innerHTML =
                                    newMapItems['map-characters'];

                                const characterItems =
                                    characterList.querySelectorAll(
                                        '.character-item'
                                    );

                                if (0 < characterItems.length) {
                                    document.getElementById(
                                        'characters'
                                    ).style.display = 'block';
                                }

                                // Add character selection events.
                                engageCharacterSelection();

                                // Add hazard check.
                                checkIfHazardHurts();

                                // Engage dev mode.
                                if (document.querySelector('main[data-devmode="true"]')) {
                                    engageDevMode();
                                }

                                // Add close menu event.
                                const characterMenu =
                                    document.getElementById('characters');
                                const closeCharacter =
                                    characterMenu.querySelector(
                                        '.close-settings'
                                    );

                                if (closeCharacter) {
                                    closeCharacter.addEventListener(
                                        'click',
                                        () => {
                                            characterMenu.classList.remove(
                                                'engage'
                                            );
                                        }
                                    );
                                }
                            }

                            // Move npcs
                            const moveableCharacters =
                                document.querySelectorAll(
                                    '.path-onload[data-path]:not([data-path=""]), [data-wanderer="yes"]'
                                );

                            if (moveableCharacters) {
                                moveableCharacters.forEach(
                                    (moveableCharacter) => {
                                        moveNPC(moveableCharacter, false, false, false);
                                    }
                                );
                            }

                            // Engage enemies that have no trigger defined.
                            engageUntriggeredEnemies();

                            // Apply gravity to items marked with explore-gravity = yes.
                            applyItemGravity();

                            cycleInteractedImages();

                            // Apply gravity to all characters and enemies in the area.
                            applyEntityGravity();

                            // Load materialize item logic.
                            materializeItemLogic();

                            // Load blockades.
                            loadMissionBlockades();

                            // Engage communicate click.
                            communicateParentClick();

                            // Swap dialogue text/audio to match visitor's browser language before engaging.
                            applyLanguageTranslations();

                            // Set all first cutscene dialogues to engage.
                            const allFirstDialogues = document.querySelectorAll(
                                '.map-cutscene .wp-block-orbem-paragraph-mp3:first-of-type, .map-communicate .message-wrapper .wp-block-orbem-paragraph-mp3'
                            );

                            if (allFirstDialogues) {
                                allFirstDialogues.forEach((firstDialogue) => {
                                    if (isBranchLine(firstDialogue)) {
                                        return;
                                    }

                                    firstDialogue.classList.add('engage');
                                });
                            }

                            // If the previous area was a cutscene, remove items set to be removed after that cutscene area.
                            if ('' !== window.previousCutsceneArea) {
                                removeItems(
                                    document.querySelectorAll(
                                        '[data-removeaftercutscene]'
                                    ),
                                    window.previousCutsceneArea
                                );

                                const showItems = document.querySelectorAll(
                                    '[data-showaftercutscene=' +
                                    window.previousCutsceneArea +
                                    ']'
                                );

                                if (showItems) {
                                    showItems.forEach((showItem) => {
                                        materializedItemsArray.push(
                                            cleanClassName(showItem.className)
                                        );
                                        showItem.classList.add('no-point');
                                        if ('explore-enemy' === showItem.dataset.genre) {
                                            engageEnemy(showItem, false);
                                        }
                                        materializeGravity(showItem);
                                    });

                                    saveMaterializedItem(
                                        currentLocation,
                                        materializedItemsArray
                                    );
                                }
                            }

                            // engage cutscene.
                            if ('yes' === newMapItems['is-cutscene']) {
                                const cutsceneName = cleanClassName(
                                    document.querySelector('.map-cutscene')
                                        .className
                                );
                                engageCutscene(cutsceneName, true);
                                window.previousCutsceneArea = cutsceneName;
                                setPreviousCutsceneArea(
                                    window.previousCutsceneArea
                                );
                            } else {
                                fadeInScene();
                            }

                            const crewMates = document.querySelectorAll(
                                '[data-crewmate="yes"]'
                            );

                            // Add crewmates if there are any on the map.
                            if (0 < crewMates.length) {
                                let characterCount = 0;
                                const addCharactersInt = setInterval(() => {
                                    if (
                                        characterCount ===
                                        crewMates.length - 1
                                    ) {
                                        clearInterval(addCharactersInt);
                                    }

                                    const characterName = cleanClassName(
                                        crewMates[characterCount].className
                                    );

                                    if (false === isLoggedIn) {
                                        window.crewCharacters.push(characterName);
                                    } else {
                                        addCharacter(characterName);
                                    }

                                    characterCount++;
                                }, 1000);
                            }

                            // Run no point class adder again
                            addNoPoints();

                            if (false === isLoggedIn) {
                                applyLocalDragPositions(position);
                            }
                        }, 700);
                    }

                    setTimeout(() => {
                        const container =
                            document.querySelector('.game-container');
                        const characterItem =
                            document.getElementById('map-character');
                        const theWeapon = document.querySelector('.map-weapon');

                        if (nextAreaPosition) {
                            newMapItems['start-top'] =
                                JSON.parse(nextAreaPosition).top;
                            newMapItems['start-left'] =
                                JSON.parse(nextAreaPosition).left;
                        }

                        const _charIcon = characterItem.querySelector('.map-character-icon');
                        const _iconH = _charIcon ? parseInt(_charIcon.getAttribute('height') || '0') : 0;
                        const _iconW = _charIcon ? parseInt(_charIcon.getAttribute('width') || '0') : 0;

                        characterItem.style.top =
                            (parseInt(newMapItems['start-top']) - (window.globalTopPositionOffset - Math.round(_iconH / 2))) + 'px';
                        characterItem.style.left =
                            (parseInt(newMapItems['start-left']) - (window.globalLeftPositionOffset - Math.round(_iconW / 2))) + 'px';
                        characterItem.className =
                            newMapItems['start-direction'] + '-dir';

                        // Remember where this area put them, now, rather than waiting for them to move.
                        addUserCoordianate(
                            characterItem.style.left,
                            characterItem.style.top
                        );

                        centerCamera(characterItem, {
                            behavior: 'instant',
                            block: 'center',
                            inline: 'center',
                        });
                        setStaticMCImage(
                            characterItem,
                            newMapItems['start-direction'],
                            false
                        );

                        container.className = 'game-container ' + position;
                        container.dataset.physics = newMapItems['area-physics'] || '';
                        window.gravityMode = 'gravity' === container.dataset.physics;
                        if (window.gravityMode) {
                            window.jumpVelocity = 0;
                            window.isGrounded = false;
                            window.canDoubleJump = false;
                        }
                        const mapImage = container.querySelector('.container-image');

                        if (mapImage) {
                            mapImage.src = mapUrl;
                            mapImage.style.height =
                                newMapItems['area-height'];
                            mapImage.style.width =
                                newMapItems['area-width'];
                        }

                        currentLocation = position;

                        playSong(newMusic, position);
                        theWeapon.style.display = 'block';

                        if (
                            ('undefined' !==
                                typeof OrbemOrder.exploreAbilities &&
                                0 < OrbemOrder.exploreAbilities.length &&
                                OrbemOrder.exploreAbilities.includes(
                                    'transportation'
                                )) ||
                            (newMapItems['explore-ability'] &&
                                newMapItems['explore-ability'].includes(
                                    'transportation'
                                ))
                        ) {
                            engageTransportFunction();
                        }

                        const mainCharName = document.querySelector('#map-character .map-character-icon').alt.replace(' static', '');
                        const currentPlayerName = '' !== window.playerName ? window.playerName : mainCharName;
                        replaceNameInBody('{{playerName}}', currentPlayerName);

                        // Update current scores for realtime / high score counters.
                        replaceScoreTokens();
                        replaceScoresInBody();
                        window.orbemAreaChanged = position;
                    }, 100);
                });

            called = true;

            // Reset called var.
            setTimeout(() => {
                called = false;
            }, 1000);
        }
    };
})();

function replaceScoreTokens() {
    'use strict';

    const tokens = {
        '{{currentMoney}}': '<span class="current-money-element" data-amount="0">0</span>',
        '{{highMoney}}':    '<span class="high-money-element" data-amount="0">0</span>',
        '{{currentPoints}}': '<span class="current-point-element" data-amount="0">0</span>',
        '{{highPoints}}':    '<span class="high-point-element" data-amount="0">0</span>',
    };

    Object.entries(tokens).forEach(([token, html]) => {
        document.querySelectorAll('*').forEach((el) => {
            if (el.children.length === 0 && el.innerHTML.includes(token)) {
                el.innerHTML = el.innerHTML.replace(token, html);
            }
        });
    });
}

function replaceScoresInBody() {
    'use strict';

    const types = ['money', 'point'];

    types.forEach((type) => {
        const storageKey = `orbem_local_${type}`;
        const stored = JSON.parse(localStorage.getItem(storageKey) || '{}');

        const current = stored.current || 0;
        const high = stored.phigh || 0;

        updateScoreElements(type, current, high);
    });
}

function updateScoreElements(type, current, high) {
    'use strict';

    document.querySelectorAll(`.current-${type}-element`).forEach((el) => {
        el.textContent = current;
        el.dataset.amount = current;
    });

    document.querySelectorAll(`.high-${type}-element`).forEach((el) => {
        el.textContent = high;
        el.dataset.amount = high;
    });
}

/**
 * Pull item description content.
 *
 */
const showItemDescription = (function () {
    'use strict';

    let called = false;

    return function (item) {
        const id = item.getAttribute('data-id');

        // Remove engage from current.
        const currentSelectedItem = document.querySelector(
            '.storage-item.engage'
        );

        if (currentSelectedItem) {
            currentSelectedItem.classList.remove('engage');
        }

        // Add engage to selected item.
        item.classList.add('engage');

        // Don't repeat item get.
        if (false === called) {
            const filehref = `${OrbemOrder.siteRESTURL}/get-item-description/`;
            const jsonString = {
                id,
                name: item.getAttribute('title') || '',
            };

            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                    'Content-Type': 'application/json', // Set the content type to JSON
                    'X-WP-Nonce': OrbemOrder.orbemNonce,
                },
                body: JSON.stringify(jsonString), // The JSON stringified payload
            })
                .then((response) => {
                    // Check if the response status is in the range 200-299
                    if (!response.ok) {
                        throw new Error(
                            'Network response was not ok ' + response.statusText
                        );
                    }

                    return response.json();
                })
                .then((data) => {
                    const itemDescription =
                        document.getElementById('item-description');
                    if (itemDescription) {
                        itemDescription.innerHTML = '';
                    }

                    let newItemDescription = data;
                    newItemDescription = newItemDescription.data;
                    const description = document.querySelector(
                        '.retrieval-points #item-description'
                    );
                    const selectedItem = document.querySelector(
                        '.storage-item.engage'
                    );
                    const equipButton = document.createElement('button');
                    equipButton.classList.add('storage-item-button', 'is-equip');
                    equipButton.textContent = 'Equip';
                    const unequipButton = document.createElement('button');
                    unequipButton.textContent = 'Unequip';
                    unequipButton.classList.add('storage-item-button', 'is-unequip');
                    const dropButton = document.createElement('button');
                    dropButton.textContent = 'Drop';
                    dropButton.classList.add('storage-item-button', 'is-drop');

                    const itemId = selectedItem.getAttribute('data-id');
                    const name = selectedItem.getAttribute('title');
                    const amount = selectedItem.getAttribute('data-value');
                    const selectedType = selectedItem.getAttribute('data-type');
                    const isConsumable = isPointItemType(selectedType);

                    // Replace current description content.
                    description.innerHTML = newItemDescription;
                    description.appendChild(dropButton);

                    const useButton = isConsumable
                        ? document.createElement('button')
                        : description.querySelector('.use-button');

                    if (isConsumable) {
                        useButton.textContent = 'Use';
                        useButton.classList.add('storage-item-button', 'is-use');

                        if (barMax(selectedType) <= getCurrentPoints(selectedType)) {
                            useButton.disabled = true;
                            useButton.title = 'Your ' + selectedType + ' is already full';
                        }

                        description.appendChild(useButton);
                    } else if ('ingredients' === selectedType) {
                        equipButton.remove();
                    } else if (selectedItem.classList.contains('equipped')) {
                        description.appendChild(unequipButton);
                    } else {
                        const needed = levelNeeded(itemId);

                        if (needed) {
                            equipButton.disabled = true;
                            equipButton.textContent = 'Level ' + needed;
                            equipButton.title = 'Reach level ' + needed + ' to equip this';
                            equipButton.classList.add('needs-level');
                        }

                        description.appendChild(equipButton);
                    }

                    // Spend the item: top the bar up, then clear the slot.
                    if (useButton && selectedItem) {
                        useButton.addEventListener('click', () => {
                            if (barMax(selectedType) <= getCurrentPoints(selectedType)) {
                                playSfx('explore_sfx_denied');
                                return;
                            }

                            playSfx('explore_sfx_use');
                            runPointAnimation(selectedItem, name);
                            description.innerHTML = '';
                        });
                    }

                    // Drop item.
                    if (dropButton) {
                        dropButton.addEventListener('click', () => {
                            playSfx('explore_sfx_drop');
                            removeItemFromStorage(name, selectedType);
                            description.innerHTML = '';

                            const itemDescription =
                                document.getElementById('item-description');
                            if (itemDescription) {
                                itemDescription.innerHTML = '';
                            }
                        });
                    }

                    // Equip button.
                    if (equipButton) {
                        equipButton.addEventListener('click', () => {
                            if (levelNeeded(itemId)) {
                                playSfx('explore_sfx_denied');
                                return;
                            }

                            playSfx('explore_sfx_equip');

                            const currentCharacter = document.querySelector(
                                '.map-character-icon.engage'
                            ).dataset.currentchar;
                            const selectedItem = document.querySelector(
                                '.storage-item.engage'
                            );

                            // Update item class.
                            if (
                                (selectedItem &&
                                    selectedItem.dataset.character ===
                                    currentCharacter) ||
                                (selectedItem &&
                                    ('' === selectedItem.dataset.character ||
                                        undefined ===
                                        selectedItem.dataset.character ||
                                        null ===
                                        selectedItem.dataset.character))
                            ) {
                                if ('weapons' === selectedItem.dataset.type) {
                                    // Only one weapon can be equipped: clear the
                                    // previously equipped weapon's badge.
                                    document
                                        .querySelectorAll(
                                            '.storage-item[data-type="weapons"].equipped'
                                        )
                                        .forEach((el) =>
                                            el.classList.remove('equipped')
                                        );
                                    applyWeaponToPlayer(selectedItem);
                                }

                                selectedItem.classList.add('equipped');
                                selectedItem.classList.add('being-equipped');
                            }

                            // Reset point calculations.
                            updatePointBars(false);

                            description.innerHTML = '';
                            equipNewItem(
                                selectedType,
                                itemId,
                                amount,
                                false,
                                selectedItem.title
                            );
                        });
                    }

                    // Unequip.
                    if (unequipButton) {
                        unequipButton.addEventListener('click', () => {
                            playSfx('explore_sfx_unequip');

                            const selectedItem = document.querySelector(
                                '.storage-item.engage'
                            );

                            if (
                                selectedItem &&
                                'weapons' === selectedItem.dataset.type
                            ) {
                                // Unequipping a weapon falls back to the default
                                // weapon (a hidden storage item) — the player is
                                // never left with no weapon. Fall back to matching
                                // by the default weapon's name in case the hidden
                                // slot's class isn't present.
                                const defaultItem =
                                    document.querySelector(
                                        '.storage-item[data-type="weapons"].default-weapon'
                                    ) ||
                                    document.querySelector(
                                        '.storage-item[data-type="weapons"][title="' +
                                            defaultWeapon +
                                            '"]'
                                    );

                                document
                                    .querySelectorAll(
                                        '.storage-item[data-type="weapons"].equipped'
                                    )
                                    .forEach((el) =>
                                        el.classList.remove('equipped')
                                    );

                                // Clear the currently held weapon's overlay and
                                // any lingering attack/animation state so the old
                                // weapon can't stay visible on the character.
                                const heldWeapon =
                                    document.querySelector('.map-weapon');
                                if (heldWeapon) {
                                    heldWeapon.classList.remove(
                                        'engage',
                                        'weapon-swing',
                                        'weapon-thrust',
                                        'weapon-shoot'
                                    );
                                }

                                if (defaultItem) {
                                    applyWeaponToPlayer(defaultItem);
                                    defaultItem.classList.add('equipped');
                                    equipNewItem(
                                        'weapons',
                                        defaultItem.dataset.id,
                                        amount,
                                        false,
                                        defaultItem.title
                                    );
                                }

                                description.innerHTML = '';
                                return;
                            }

                            // Gear: normal unequip.
                            if (selectedItem) {
                                selectedItem.classList.remove('equipped');
                                selectedItem.classList.add('unequip');
                            }

                            // Reset point calculations.
                            updatePointBars(true);

                            description.innerHTML = '';
                            equipNewItem(
                                selectedType,
                                itemId,
                                amount,
                                true,
                                selectedItem.title
                            );
                        });
                    }
                });

            called = true;

            // Reset called var.
            setTimeout(() => {
                called = false;
            }, 1000);
        }
    };
})();

/**
 * Apply a storage/collectable item's weapon data to the player's `.map-weapon`
 * element and its `.weapon-overlay` image. Shared by both the equip button and
 * changeWeapon() so the held image, motion, visibility, strength and projectile
 * flags stay in sync no matter how the weapon was equipped.
 *
 * The held image falls back to the item's own thumbnail (the weapon's featured
 * image) when no explicit held-image override was provided.
 *
 * @param {HTMLElement} source A `.storage-item` (or map collectable) element.
 */
function applyWeaponToPlayer(source) {
    'use strict';

    if (!source) {
        return;
    }

    const currentWeapon = document.querySelector('.map-weapon');

    if (!currentWeapon) {
        return;
    }

    const itemImage = source.querySelector('img');
    const overlay = currentWeapon.querySelector('.weapon-overlay');
    // Optional HUD weapon button — not present in every game layout.
    const currentWeaponButton = document.querySelector('.weapon-content img');
    const heldImage =
        source.dataset.heldImage ||
        (itemImage ? itemImage.src : '') ||
        '';

    currentWeapon.dataset.weapon = source.title;
    currentWeapon.dataset.strength = source.dataset.strength;
    currentWeapon.dataset.projectile = source.dataset.projectile || 'no';
    currentWeapon.dataset.visibility = source.dataset.visibility || 'attack';
    currentWeapon.dataset.motion = source.dataset.motion || 'swing';
    currentWeapon.dataset.facing = source.dataset.facing || '';
    currentWeapon.dataset.resting = source.dataset.resting || 'in-hand';
    currentWeapon.dataset.light = source.dataset.light || '0';
    currentWeapon.dataset.range = source.dataset.range || '0';
    currentWeapon.style.setProperty(
        '--weapon-range',
        (parseInt(source.dataset.range, 10) || 0) + 'px'
    );
    currentWeapon.dataset.verticalOffset = source.dataset.verticalOffset || '0';
    currentWeapon.style.setProperty(
        '--weapon-vertical-offset',
        (parseInt(source.dataset.verticalOffset, 10) || 0) + 'px'
    );
    currentWeapon.dataset.heldImage = heldImage;

    // Sync the .map-weapon attack sound to the equipped weapon, creating the
    // audio on demand for weapons picked up after load.
    const weaponSoundSrc = source.dataset.sound || '';
    let weaponAudio = currentWeapon.querySelector('audio');

    if (weaponSoundSrc) {
        if (!weaponAudio) {
            weaponAudio = document.createElement('audio');
            weaponAudio.id = 'weapon-sound';
            currentWeapon.appendChild(weaponAudio);
        }

        if (weaponAudio.getAttribute('src') !== weaponSoundSrc) {
            weaponAudio.src = weaponSoundSrc;
        }
    } else if (weaponAudio) {
        weaponAudio.remove();
    }

    if (overlay) {
        overlay.src = heldImage;

        // Held size: prefer the dedicated held width/height, falling back to the
        // item's on-map size. An unset height keeps the image's aspect ratio.
        const heldWidth = source.dataset.heldWidth || source.dataset.width || '';
        const heldHeight =
            source.dataset.heldHeight || source.dataset.height || '';

        overlay.style.width = heldWidth ? heldWidth + 'px' : '';
        overlay.style.height = heldHeight ? heldHeight + 'px' : '';

        // Half the weapon's short dimension, for On Hip edge alignment.
        const w = parseInt(heldWidth, 10) || 0;
        const h = parseInt(heldHeight, 10) || 0;
        const halfWidth = w && h ? Math.round(Math.min(w, h) / 2) : 0;
        currentWeapon.style.setProperty(
            '--weapon-hip-halfwidth',
            halfWidth + 'px'
        );
    }

    // Optional fired-projectile image. Empty src falls back to throwing the
    // weapon image itself. data-projectile-facing (on .map-weapon) drives the
    // projectile's rotation to the fire direction.
    currentWeapon.dataset.projectileFacing =
        source.dataset.projectileFacing || '';
    currentWeapon.dataset.ammoCost = source.dataset.ammoCost || '0';
    const projectileImg = currentWeapon.querySelector('.weapon-projectile');
    if (projectileImg) {
        projectileImg.src = source.dataset.projectileImage || '';
        projectileImg.style.width = source.dataset.projectileWidth
            ? source.dataset.projectileWidth + 'px'
            : '';
        projectileImg.style.height = source.dataset.projectileHeight
            ? source.dataset.projectileHeight + 'px'
            : '';
    }

    if (currentWeaponButton && itemImage) {
        currentWeaponButton.src = itemImage.src;
    }

    window.currentWeapon =
        defaultWeapon !== source.title ? '-' + source.title : '';
}

/**
 * Resolve a character sprite element by its base id (without the weapon
 * suffix), preferring the weapon-specific variant when one exists with a real
 * src. This lets a character reuse its base walking / standing / directional
 * sprites for weapons that only supply an on-attack overlay image, instead of
 * breaking to the default static image when no per-weapon character sprites
 * were uploaded for the equipped weapon.
 *
 * @param {string} baseId Sprite element id without the weapon suffix.
 * @returns {HTMLElement|null}
 */
function getCharacterSprite(baseId) {
    'use strict';

    if (window.currentWeapon) {
        const weaponSprite = document.getElementById(
            baseId + window.currentWeapon
        );

        if (weaponSprite && '' !== weaponSprite.getAttribute('src')) {
            return weaponSprite;
        }
    }

    return document.getElementById(baseId);
}

/**
 * Temporarily change weapon player is using. Previously equipped weapon will still be noted as equipped to allow for change back.
 * @param selectedItem
 */
function changeWeapon(selectedItem) {
    'use strict';

    if (selectedItem && levelNeeded(selectedItem.dataset?.id)) {
        playSfx('explore_sfx_denied');
        return;
    }

    applyWeaponToPlayer(selectedItem);
}

function updatePointBars(unequip) {
    'use strict';

    const gear = document.querySelector(
        '.storage-item.being-equipped[data-type="gear"]'
    );
    const healthBar = document.querySelector(`#explore-points .health-amount`);
    const manaBar = document.querySelector(`#explore-points .mana-amount`);

    let manaAmount = manaBar ? parseInt(manaBar.dataset.amount) : 100;
    let manaWidth = manaBar ? parseInt(manaBar.style.width.replace('px', '')) : 100;

    let healthAmount = healthBar ? parseInt(healthBar.dataset.amount) : 100;
    let healthWidth = healthBar ? parseInt(healthBar.style.width.replace('px', '')) : 100;

    // Calculate the gear modifiers.
    if (gear && false === unequip) {
        const gearAmount = gear.getAttribute('data-value');
        const gearSubtype = gear.getAttribute('data-subtype');

        if ('health' === gearSubtype && healthBar) {
            healthAmount += parseInt(gearAmount);
            healthWidth += parseInt(gearAmount);
        }

        if ('mana' === gearSubtype && manaBar) {
            manaAmount += parseInt(gearAmount);
            manaWidth += parseInt(gearAmount);
        }
    } else if (gear && false !== unequip) {
        const gearUnequip = document.querySelector(
            '.storage-item.unequip[data-type="gear"]'
        );
        const gearAmount = gearUnequip.getAttribute('data-value');
        const gearSubtype = gearUnequip.getAttribute('data-subtype');

        if ('health' === gearSubtype) {
            healthAmount -= parseInt(gearAmount);
            healthWidth -= parseInt(gearAmount);
        }

        if ('mana' === gearSubtype) {
            manaAmount -= parseInt(gearAmount);
            manaWidth -= parseInt(gearAmount);
        }
    }

    if (gear) {
        if (healthBar) {
            // update the points bars to new width.
            healthBar.style.width = healthWidth + 'px';
            healthBar.setAttribute('data-amount', healthAmount);
            healthBar.querySelector('.gauge').style.width = healthAmount + 'px';
        }

        if (manaBar) {
            manaBar.style.width = manaWidth + 'px';
            manaBar.setAttribute('data-amount', manaAmount);
            manaBar.querySelector('.gauge').style.width = manaAmount + 'px';
        }
    }

    // Remove extra classes:
    const beingEquipped = document.querySelector('.being-equipped');
    const beingUnequipped = document.querySelector('.unequip');

    if (beingEquipped) {
        beingEquipped.classList.remove('being-equipped');
    }

    if (beingUnequipped) {
        beingUnequipped.classList.remove('unequip');
    }
}

/**
 * get current points.
 * @param type the type of point bar.
 */
function getCurrentPoints(type) {
    'use strict';

    const thePoints = document.querySelector(`#explore-points .${type}-amount`);

    return thePoints ? parseInt(thePoints.getAttribute('data-amount')) : 0;
}

function playSong(path, name) {
    'use strict';

    if (!path || '' === path) {
        return;
    }

    const audio = document.createElement('audio');
    audio.setAttribute('loop', '');
    audio.src = path;
    audio.id = name;

    document.body.appendChild(audio);

    const volume = document.getElementById('music-volume');

    if (volume && audio) {
        audio.volume = volume.value / 100;
    }

    // Pause current song.
    if (window.currentMusic) {
        window.currentMusic.pause();
    }

    if (audio) {
        audio.play();

        // Set for volume control
        window.currentMusic = audio;
    }
}

/**
 * Function to change the current playable character from your crew list.
 * @param character
 */
function selectNewCharacter(character) {
    'use strict';

    playSfx('explore_sfx_character');

    const charImage = character.querySelector('img');
    charImage.removeAttribute('srcset');
    const currentCharacter = document.querySelector('#map-character');

    if (charImage && currentCharacter) {
        const oldCurrentCharName =
            undefined === currentCharacter.dataset.currentchar
                ? window.mainCharacter
                : currentCharacter.dataset.currentchar;
        const mc = document.querySelectorAll(
            '#map-character .map-character-icon'
        );
        const newCharacter = character.querySelectorAll(
            '.character-images .character-icon'
        );

        if (mc) {
            mc.forEach((mcImage, index) => {
                if (newCharacter[index]) {
                    const mcImageUrl = mcImage.src;
                    mcImage.src = newCharacter[index].src;
                    newCharacter[index].src = mcImageUrl;
                }
            });

            const mcAbility = currentCharacter.dataset.ability;
            const mcName = currentCharacter.dataset.name;
            const mcSpeed = currentCharacter.dataset.speed;

            // set new character
            currentCharacter.dataset.currentchar =
                character.dataset.charactername;
            currentCharacter.dataset.ability = character.dataset.ability;
            currentCharacter.dataset.speed = character.dataset.speed || '16';
            currentCharacter.dataset.name =
                character.querySelector('.character-name').textContent;
            character.dataset.ability = mcAbility;
            character.dataset.speed = mcSpeed;
            character.querySelector('.character-name').textContent = mcName;
        }

        window.defenseMultiplier = 'defense' === currentCharacter.dataset?.ability ? 10 : 0;

        switch (currentCharacter.dataset?.ability) {
            case 'defense':
                window.moveSpeed = 3;
                window.attackMultiplier = 0;
                movementIntFunc();

                changeWeapon(
                    document.querySelector(
                        '.storage-item[title="' +
                        currentCharacter.dataset?.weapon +
                        '"]'
                    )
                );
                break;
            case 'speed':
                window.moveSpeed = 5;
                window.attackMultiplier = 5;
                movementIntFunc();

                // Change weapon.
                changeWeapon(
                    document.querySelector(
                        '.storage-item[title="' +
                        currentCharacter.dataset?.weapon +
                        '"]'
                    )
                );
                break;
            case 'programming':
                const equipped = document.querySelector(
                    '.storage-item[data-type="weapons"].equipped'
                );
                changeWeapon(equipped);

                window.moveSpeed = 3;
                window.attackMultiplier = 0;
                movementIntFunc();
                break;

            case 'strength':
                window.moveSpeed = 3;
                movementIntFunc();

                // Change weapon.
                changeWeapon(
                    document.querySelector(
                        '.storage-item[title="' +
                        currentCharacter.dataset?.weapon +
                        '"]'
                    )
                );
                window.attackMultiplier = 10;
                break;
            case 'hazard':
                window.moveSpeed = 3;
                movementIntFunc();

                // Change weapon.
                changeWeapon(
                    document.querySelector(
                        '.storage-item[title="' +
                        currentCharacter.dataset?.weapon +
                        '"]'
                    )
                );
                window.attackMultiplier = 0;
                break;
            case 'default':
                window.moveSpeed = 3;
                // Change weapon.
                changeWeapon(
                    document.querySelector(
                        '.storage-item[title="' +
                        currentCharacter.dataset?.weapon +
                        '"]'
                    )
                );
                movementIntFunc();
                break;
        }

        character.dataset.charactername = oldCurrentCharName
            ? oldCurrentCharName
            : window.mainCharacter;
    }
}

/**
 * Helper to set the enemy's directional image.
 */
function setDirectionImage(enemyEl, direction) {
    'use strict';

    if (!enemyEl || !direction) {
        return;
    }

    const allImages = enemyEl.querySelectorAll('.character-icon');
    const enemyName = cleanClassName(enemyEl.className);
    const directionalImage = enemyEl.querySelector(
        '#' + escClass(enemyName) + direction
    );

    if (directionalImage && '' !== directionalImage.getAttribute('src')) {
        allImages.forEach((image) => {
            image.classList.remove('engage');
        });
        enemyEl.dataset.currentDirection = direction;
        directionalImage.classList.add('engage');
    }
}

function stopRunnerPunching(enemyEl, letAttackFinish) {
    'use strict';

    if (!enemyEl || !enemyEl._runnerPunchInt) {
        return;
    }

    clearInterval(enemyEl._runnerPunchInt);
    enemyEl._runnerPunchInt = null;

    // A dead enemy must not land damage queued for the end of its attack.
    clearTimeout(enemyEl._runnerDamageTimeout);
    enemyEl._runnerDamageTimeout = null;

    // Escaping the reach only cancels the damage; the swing still plays out.
    if (true === letAttackFinish) {
        return;
    }

    // Otherwise a kill mid-punch still swaps the dead image back afterwards.
    clearTimeout(enemyEl._runnerPunchTimeout);
    enemyEl._runnerPunchTimeout = null;

    delete enemyEl.dataset.attacking;
}

function startRunnerPunching(enemyEl, npc) {
    'use strict';

    if (!enemyEl) {
        return;
    }

    // Who the swing lands on: an NPC being defended, or the player.
    enemyEl._punchTarget = npc || null;

    if (enemyEl._runnerPunchInt) {
        return;
    }

    const attackDisplayTime =
        parseInt(enemyEl.dataset.attackDisplayTime, 10) || 800;
    const damageAtEnd = 'end' === enemyEl.dataset.damageTime;

    // The cycle has to outlast the animation or the runner never gets to move.
    const attackCycle = Math.max(1600, attackDisplayTime * 2);

    enemyEl._runnerPunchInt = setInterval(() => {
        if (!document.body.contains(enemyEl)) {
            clearInterval(enemyEl._runnerPunchInt);
            enemyEl._runnerPunchInt = null;
            return;
        }

        if (worldPaused()) {
            return;
        }

        const strength = enemyEl.dataset.value;
        
        clearTimeout(enemyEl._runnerPunchTimeout);
        clearTimeout(enemyEl._runnerDamageTimeout);

        // Held for the attack so wandering can't turn or move mid-animation.
        enemyEl.dataset.attacking = 'true';

        updatePunchImage(enemyEl, true);

        enemyEl._runnerPunchTimeout = setTimeout(() => {
            updatePunchImage(enemyEl, false);
            delete enemyEl.dataset.attacking;
        }, attackDisplayTime);

        // Hurt main.
        const hurtMainCharacter = () => {
            if (enemyEl._punchTarget) {
                hurtNpc(enemyEl._punchTarget, strength);
                return;
            }

            if (window.mcHurtCooldown) {
                return;
            }

            window.mcHurtCooldown = true;
            enemyEl._chaseStartedAt = Date.now();

            // apply damage here
            const currentHealth = getCurrentPoints('health');
            const newAmount = parseInt(currentHealth, 10) - damageTaken(strength);
            hurtAnimation();
            addUserPoints(newAmount, 'health', 'enemy', '');

            setTimeout(() => {
                window.mcHurtCooldown = false;
            }, 1000);
        };

        if (damageAtEnd) {
            // Just inside the animation, so escaping has to beat the swing.
            enemyEl._runnerDamageTimeout = setTimeout(
                hurtMainCharacter,
                Math.round(attackDisplayTime * 0.9)
            );
        } else {
            hurtMainCharacter();
        }
    }, attackCycle);
}

function stopRunnerEnemy(enemyEl) {
    'use strict';

    if (!enemyEl) {
        return;
    }

    if (enemyEl._wanderInt) {
        clearInterval(enemyEl._wanderInt);
        enemyEl._wanderInt = null;
    }

    // Always stop punching regardless of wander state — the previous guard on
    // _wanderInt caused stopRunnerPunching to be skipped when the wander
    // interval happened to be null at kill time, leaving the punch interval
    // running and dealing damage to the player after the enemy was dead.
    stopRunnerPunching(enemyEl);
    stopPatrolWatch(enemyEl);
    delete enemyEl.dataset.chasing;
}

function startPatrolWatch(enemyEl) {
    'use strict';

    if (!enemyEl || enemyEl._patrolWatchInt) {
        return;
    }

    enemyEl._patrolWatchInt = setInterval(() => {
        if (!document.body.contains(enemyEl)) {
            stopPatrolWatch(enemyEl);
            return;
        }

        if (worldPaused()) {
            return;
        }

        if ('true' === enemyEl.dataset.chasing) {
            const duration =
                parseInt(enemyEl.dataset.chaseDuration, 10) || DEFAULT_CHASE_DURATION;

            if (
                Date.now() - enemyEl._chaseStartedAt >= duration &&
                'true' !== enemyEl.dataset.attacking
            ) {
                endPatrolChase(enemyEl);
            }

            return;
        }

        if (
            !enemyEl._pathInt ||
            enemyEl._pathStopped ||
            'true' === enemyEl.dataset.cutscenebreak ||
            Date.now() < (enemyEl._chaseCooldownUntil || 0)
        ) {
            return;
        }

        if (isPlayerInChaseRange(enemyEl)) {
            beginPatrolChase(enemyEl);
        }
    }, 100);
}

function stopPatrolWatch(enemyEl) {
    'use strict';

    if (!enemyEl || !enemyEl._patrolWatchInt) {
        return;
    }

    clearInterval(enemyEl._patrolWatchInt);
    enemyEl._patrolWatchInt = null;
}

function isPlayerInChaseRange(enemyEl) {
    'use strict';

    const mapCharacter = document.getElementById('map-character');

    if (!mapCharacter) {
        return false;
    }

    const playerX =
        parseInt(mapCharacter.style.left, 10) + window.globalLeftPositionOffset;
    const playerY =
        parseInt(mapCharacter.style.top, 10) + window.globalTopPositionOffset;
    const enemyX = enemyEl.offsetLeft + enemyEl.offsetWidth / 2;
    const enemyY = enemyEl.offsetTop + enemyEl.offsetHeight / 2;

    return Math.hypot(playerX - enemyX, playerY - enemyY) <= PATROL_CHASE_RANGE;
}

function beginPatrolChase(enemyEl) {
    'use strict';

    const left = enemyEl.offsetLeft;
    const top = enemyEl.offsetTop;

    enemyEl.dataset.chasing = 'true';
    enemyEl._chaseStartedAt = Date.now();
    enemyEl.style.transition = 'none';
    enemyEl.style.left = left + 'px';
    enemyEl.style.top = top + 'px';

    makeNPCWander(enemyEl, enemyEl.dataset.speed, 0, true);
}

function endPatrolChase(enemyEl) {
    'use strict';

    if (enemyEl._wanderInt) {
        clearInterval(enemyEl._wanderInt);
        enemyEl._wanderInt = null;
    }

    stopRunnerPunching(enemyEl);

    delete enemyEl.dataset.chasing;
    enemyEl._chaseCooldownUntil = Date.now() + PATROL_CHASE_COOLDOWN;
}

function stopPathMovement(el) {
    'use strict';

    if (!el) {
        return;
    }

    el._pathStopped = true;

    if (el._pathInt) {
        clearInterval(el._pathInt);
        el._pathInt = null;
    }
}

function stopShooterEnemy(enemyEl) {
    'use strict';

    if (!enemyEl || !enemyEl._shooterInt) {
        return;
    }

    clearInterval(enemyEl._shooterInt);
    enemyEl._shooterInt = null;
}

window.engageEnemy = engageEnemy;

/**
 * Start enemies.
 * @param enemy
 * @param trigger
 */
// ─── Spawners ────────────────────────────────────────────────────────────────

const spawnerStates = new Map();

/** A wandering copy's pace when its spawner gives none: an NPC's walk. */
const SPAWN_WANDER = { speed: 30, between: 2 };

function isSpawner(el) {
    return 'yes' === el?.dataset?.spawner;
}

function spawnerIsOwned(el) {
    return 'function' === typeof window.orbemOwnsSpawner && true === window.orbemOwnsSpawner(el);
}

function spawnerOptions(el, overrides) {
    const o = overrides || {};

    return {
        amount: Math.max(0, parseInt(o.amount ?? el.dataset.spawnAmount ?? '0', 10) || 0),
        interval: Math.max(0.2, parseFloat(o.interval ?? el.dataset.spawnInterval ?? '2') || 2),
        alive: Math.max(1, parseInt(o.alive ?? el.dataset.spawnAlive ?? '8', 10) || 8),
        // Per-start changes: what the copies look like and are.
        images: o.images || null,
        type: o.type || null,
        health: o.health || null,
        width: o.width || null,
        height: o.height || null,
    };
}

function stopSpawner(el) {
    const state = spawnerStates.get(el);

    if (state) {
        clearInterval(state.timer);
        spawnerStates.delete(el);
    }
}

function spawnCopy(el, state) {
    const opts = state.opts;
    const copy = el.cloneNode(true);
    const name = cleanClassName(el.className);

    state.sent += 1;

    copy.id = el.id + '-s' + state.sent;
    delete copy.dataset.spawner;
    delete copy.dataset.spawnAmount;
    delete copy.dataset.spawnInterval;
    delete copy.dataset.spawnAlive;
    copy.dataset.spawned = 'true';
    copy.dataset.spawnedFrom = el.id;
    copy.style.display = '';

    if (opts.type) {
        copy.dataset.enemyType = opts.type;
    }

    if (opts.health) {
        copy.dataset.healthamount = String(opts.health);
    }

    copy.dataset.health = copy.dataset.healthamount;

    // The shot a spawner carries is a template, as it is on any shooter.
    copy.querySelectorAll(':scope > .projectile').forEach((shot) => {
        shot.style.display = 'none';
    });

    if (opts.width) {
        copy.style.width = opts.width + 'px';
    }

    if (opts.height) {
        copy.style.height = opts.height + 'px';
    }

    // A new look: each frame by its direction, falling back to standing.
    if (opts.images) {
        copy.querySelectorAll('img.character-icon').forEach((img) => {
            const direction = img.id.startsWith(name) ? img.id.slice(name.length) : '';
            const src = opts.images[direction] || opts.images.static;

            if (src) {
                img.src = src;
            }

            if (opts.width) {
                img.width = opts.width;
            }

            if (opts.height) {
                img.height = opts.height;
            }
        });
    }

    el.parentNode.appendChild(copy);
    state.copies.add(copy);

    document.dispatchEvent(new CustomEvent('orbem:enemy-spawned', { detail: { enemy: copy, spawner: el } }));

    engageEnemy(copy, false);

    // A wanderer walks about the way any wanderer does.
    if ('yes' === copy.dataset.wanderer && 'runner' !== copy.dataset.enemyType) {
        makeNPCWander(copy, copy.dataset.speed || SPAWN_WANDER.speed, copy.dataset.timebetween || SPAWN_WANDER.between, false);
    }
}

function startSpawner(el, overrides) {
    stopSpawner(el);

    const state = { opts: spawnerOptions(el, overrides), sent: 0, copies: new Set(), timer: null };

    spawnerStates.set(el, state);

    const tick = () => {
        // Gone with the area it was in: walking through a door rebuilds the map.
        if (!document.body.contains(el)) {
            stopSpawner(el);
            return;
        }

        state.copies.forEach((copy) => {
            if (!document.body.contains(copy) || '0' === copy.dataset.health) {
                state.copies.delete(copy);
            }
        });

        const finished = 0 < state.opts.amount && state.sent >= state.opts.amount;

        if (finished) {
            if (0 === state.copies.size) {
                stopSpawner(el);
                document.dispatchEvent(new CustomEvent('orbem:spawner-done', { detail: { spawner: el, sent: state.sent } }));
            }

            return;
        }

        // Not while the game is paused for a conversation or a menu.
        if (false === window.allowMovement || worldPaused() || state.copies.size >= state.opts.alive) {
            return;
        }

        spawnCopy(el, state);
    };

    state.timer = setInterval(tick, state.opts.interval * 1000);
    tick();
}

window.orbemSpawners = {
    start: (el, overrides) => startSpawner(el, overrides),
    stop: (el) => stopSpawner(el),
    // Take every copy off the map, as when a game ends.
    clear: (el) => {
        stopSpawner(el);
        document.querySelectorAll('[data-spawned-from="' + el.id + '"]').forEach(copy => copy.remove());
    },
    running: (el) => spawnerStates.has(el),
};

function engageEnemy(enemy, trigger) {
    'use strict';

    // A spawner is where enemies come from, not an enemy.
    if (isSpawner(enemy)) {
        if (trigger) {
            trigger.remove();
        }

        // A moment's grace first, so a game whose script loads after the engine has the chance to claim it.
        setTimeout(() => {
            if (document.body.contains(enemy) && !spawnerIsOwned(enemy) && !spawnerStates.has(enemy)) {
                startSpawner(enemy);
            }
        }, 1000);

        return;
    }

    const enemyType = enemy.getAttribute('data-enemy-type');
    const enemySound = enemy.querySelector(':scope > audio');

    if (enemySound) {
        enemySound.volume = window.sfxVolume;

        setInterval(() => {
            enemySound.volume = window.sfxVolume;
        }, 1000);

        enemySound.play();
    }

    if (trigger) {
        trigger.remove();
    }

    if ('shooter' === enemyType) {
        engageShooter(enemy);
    }

    // Runner Type.
    if ('runner' === enemyType && !enemy.dataset.path) {
        makeNPCWander(enemy, enemy.dataset.speed, 0, true);
    }

    if ('runner' === enemyType && enemy.dataset.path) {
        startPatrolWatch(enemy);
    }

    // Boss type: its waves in order and on a clock, or as its health drops.
    if ('boss' === enemyType) {
        showBossBar(enemy);

        if (bossSequence(enemy)) {
            startBossSequence(enemy);
        } else {
            updateBossWave(enemy);
        }
    }
}

function updatePunchImage(enemyEl, showPunch) {
    const previousImage = enemyEl.querySelector('.character-icon.engage');
    const lastImage = enemyEl.querySelector('.last-image');

    if (previousImage && !lastImage) {
        if ((previousImage.id.includes('-hurt') || previousImage.id.includes('-punch')) && false !== showPunch) {
            updatePunchImage(enemyEl, false);
        } else {
            previousImage.classList.add('last-image');
        }
    }

    const direction = enemyEl.dataset.currentDirection || 'down';
    const enemyName = cleanClassName(enemyEl.className);
    const punchImage = enemyEl.querySelector(
        '#' + escClass(enemyName) + direction + '-punch'
    );

    const baseImage = enemyEl.querySelector('#' + escClass(enemyName) + direction);
    const finalImage = 'runner' === enemyEl.dataset.enemyType ? baseImage : lastImage;
    const allImages = enemyEl.querySelectorAll('.character-icon');
    const nextImage = showPunch && punchImage ? punchImage : finalImage;

    if (!nextImage || (nextImage && '' === nextImage.getAttribute('src')) ) {
        return;
    }

    allImages.forEach((image) => {
        image.classList.remove('engage');
    });

    nextImage.classList.add('engage');

    if (lastImage) {
        lastImage.classList.remove('last-image');
    }
}

/**
 * Switch boss wave type.
 * @param enemy
 */
function updateBossWave(enemy) {
    'use strict';

    const bossWaves = enemy.dataset.waves.split(',');

    enemy._bossWaveCount ??= 0;

    if (enemy._bossWaveCount > (bossWaves.length - 2)) {
        enemy._bossWaveCount = 0;
    }

    if (bossWaves) {
        applyBossWave(enemy, bossWaves[enemy._bossWaveCount]);
    }

    enemy._bossWaveCount++;
}

// ─── Boss waves ──────────────────────────────────────────────────────────────

const BOSS_WAVES = ['projectile', 'pulse-wave', 'rush', 'auto-shoot'];

/** How a rush plays: the wind-up, the charge, and the rest after it. */
const BOSS_RUSH = { windup: 700, speed: 900, overshoot: 260, rest: 900, step: 12, contact: 400 };

/** How an auto-shoot sprays: a shot every `every` ms, a full turn every `turn` ms. */
const BOSS_SPRAY = { every: 120, turn: 3600, speed: 650, reach: 1600 };

/** A boss's rush and spray at its difficulty, 1 to 10. */
function bossTuning(enemy) {
    const level = Math.min(10, Math.max(1, parseInt(enemy.dataset.bossDifficulty || '5', 10) || 5));
    const step = level - 5;

    return {
        rush: {
            ...BOSS_RUSH,
            speed: BOSS_RUSH.speed + step * 80,
            windup: BOSS_RUSH.windup - step * 60,
            rest: BOSS_RUSH.rest - step * 80,
        },
        spray: {
            ...BOSS_SPRAY,
            every: BOSS_SPRAY.every - step * 14,
            speed: BOSS_SPRAY.speed + step * 50,
        },
    };
}

/** Stop whatever wave a boss is in, so the next starts clean. */
function endBossWave(enemy) {
    BOSS_WAVES.forEach((wave) => enemy.classList.remove(wave + '-wave-engage'));

    if (enemy._pulsewaveInterval) {
        clearInterval(enemy._pulsewaveInterval);
        enemy._pulsewaveInterval = null;
    }

    enemy.classList.remove('pulse-in');
    stopShooterEnemy(enemy);
    stopBossRush(enemy);
    stopBossSpray(enemy);
    updatePunchImage(enemy, false);
}

function applyBossWave(enemy, wave) {
    endBossWave(enemy);

    if (!wave) {
        return;
    }

    enemy.classList.add(wave + '-wave-engage');

    if ('pulse-wave' === wave) {
        enemy._pulsewaveInterval = setInterval(() => {
            enemy.classList.toggle('pulse-in');
        }, 13000);
    }

    if ('projectile' === wave) {
        engageShooter(enemy);
    }

    if ('rush' === wave) {
        startBossRush(enemy);
    }

    if ('auto-shoot' === wave) {
        startBossSpray(enemy);
    }

    document.dispatchEvent(new CustomEvent('orbem:boss-wave', { detail: { boss: enemy, wave } }));
}

// ─── A boss's bar ────────────────────────────────────────────────────────────

function showBossBar(boss) {
    if ('yes' !== boss.dataset.bossBar) {
        return;
    }

    let bar = document.getElementById('orbem-boss-bar');

    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'orbem-boss-bar';
        bar.innerHTML = '<span class="orbem-boss-bar__name"></span><span class="orbem-boss-bar__track"><span class="orbem-boss-bar__fill"></span></span>';
        document.body.appendChild(bar);
    }

    bar._boss = boss;
    bar.querySelector('.orbem-boss-bar__name').textContent = boss.dataset.bossName || '';
    bar.hidden = false;
    updateBossBar(boss);

    clearInterval(bar._watch);
    bar._watch = setInterval(() => {
        if (!document.body.contains(boss) || '0' === boss.dataset.health) {
            hideBossBar(boss);
        }
    }, 300);
}

function updateBossBar(boss) {
    const bar = document.getElementById('orbem-boss-bar');

    if (!bar || bar._boss !== boss) {
        return;
    }

    const full = parseInt(boss.dataset.healthamount, 10) || 1;
    const now = Math.max(0, parseInt(boss.dataset.health, 10) || 0);

    bar.querySelector('.orbem-boss-bar__fill').style.width = Math.round((now / full) * 100) + '%';
}

function hideBossBar(boss) {
    const bar = document.getElementById('orbem-boss-bar');

    if (bar && (!boss || bar._boss === boss)) {
        // Long enough to see it empty.
        updateBossBar(boss || bar._boss);
        clearInterval(bar._watch);
        setTimeout(() => {
            if (bar._boss === boss || !boss) {
                bar.hidden = true;
                bar._boss = null;
            }
        }, '0' === (boss && boss.dataset.health) ? 1200 : 0);
    }
}

/** The boss's waves in order, or null for a boss that changes on its health. */
function bossSequence(enemy) {
    try {
        const steps = JSON.parse(enemy.dataset.bossSequence || 'null');

        return Array.isArray(steps) && steps.length ? steps : null;
    } catch (e) {
        return null;
    }
}

function startBossSequence(enemy) {
    const steps = bossSequence(enemy);

    if (!steps || enemy._bossSequence) {
        return;
    }

    const state = { index: 0, until: Date.now() + (parseFloat(steps[0].seconds) || 8) * 1000 };

    enemy._bossSequence = state;
    applyBossWave(enemy, steps[0].wave);

    state.timer = setInterval(() => {
        if (!document.body.contains(enemy) || '0' === enemy.dataset.health) {
            stopBossSequence(enemy);
            return;
        }

        // Paused for a conversation or a menu: the wave waits too.
        if (false === window.allowMovement || worldPaused()) {
            state.until += 250;
            return;
        }

        if (Date.now() < state.until) {
            return;
        }

        // The last wave done and both still standing: from the top again.
        state.index = (state.index + 1) % steps.length;
        state.until = Date.now() + (parseFloat(steps[state.index].seconds) || 8) * 1000;
        applyBossWave(enemy, steps[state.index].wave);
    }, 250);
}

function stopBossSequence(enemy) {
    if (enemy._bossSequence) {
        clearInterval(enemy._bossSequence.timer);
        enemy._bossSequence = null;
    }

    endBossWave(enemy);
}

/** Rush: wind up, then charge straight at whoever the boss is after, hurting like a hazard while it charges. */
function startBossRush(enemy) {
    stopBossRush(enemy);

    const RUSH = bossTuning(enemy).rush;
    const rush = { phase: 'windup', until: performance.now() + RUSH.windup, last: performance.now() };

    enemy._bossRush = rush;
    enemy.classList.add('boss-rush-windup');

    const frame = (now) => {
        if (enemy._bossRush !== rush || !document.body.contains(enemy) || '0' === enemy.dataset.health) {
            return;
        }

        const dt = Math.min(0.05, (now - rush.last) / 1000);
        rush.last = now;
        rush.raf = requestAnimationFrame(frame);

        if (false === window.allowMovement || worldPaused()) {
            rush.until += dt * 1000;
            rush.contactUntil = (rush.contactUntil || 0) + dt * 1000;
            return;
        }

        if ('windup' === rush.phase && now >= rush.until) {
            const target = enemyTargetPoint(enemy);

            if (!target) {
                rush.until = now + RUSH.windup;
                return;
            }

            const fromLeft = parseFloat(enemy.style.left) || enemy.offsetLeft;
            const fromTop = parseFloat(enemy.style.top) || enemy.offsetTop;
            const dx = target.left - fromLeft;
            const dy = target.top - fromTop;
            const distance = Math.hypot(dx, dy) || 1;

            rush.phase = 'charge';
            rush.dir = { x: dx / distance, y: dy / distance };
            rush.left = distance + RUSH.overshoot;

            enemy.classList.remove('boss-rush-windup');
            enemy.classList.add('boss-rush-charge');
            enemy.dataset.hazard = 'true';

            if (typeof setDirectionImage === 'function') {
                setDirectionImage(enemy, Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
            }

            return;
        }

        if ('charge' === rush.phase) {
            let travel = Math.min(rush.left, RUSH.speed * dt);
            let hit = false;

            // In small steps, so a fast charge cannot pass through a wall.
            while (travel > 0 && !hit) {
                const step = Math.min(RUSH.step, travel);
                const nextLeft = (parseFloat(enemy.style.left) || 0) + rush.dir.x * step;
                const nextTop = (parseFloat(enemy.style.top) || 0) + rush.dir.y * step;
                const final = blockMovement(nextTop, nextLeft, enemy, true);

                enemy.style.left = final.left + 'px';
                enemy.style.top = final.top + 'px';

                hit = true === final.collide;
                travel -= step;
                rush.left -= step;
            }

            if (hit || rush.left <= 0) {
                rush.phase = 'rest';
                rush.until = now + RUSH.rest;
                // Still dangerous for a moment.
                rush.contactUntil = now + RUSH.contact;
                enemy.classList.remove('boss-rush-charge');
            }

            return;
        }

        if ('rest' === rush.phase && 'true' === enemy.dataset.hazard && now >= rush.contactUntil) {
            delete enemy.dataset.hazard;
        }

        if ('rest' === rush.phase && now >= rush.until) {
            rush.phase = 'windup';
            rush.until = now + RUSH.windup;
            enemy.classList.add('boss-rush-windup');
        }
    };

    rush.raf = requestAnimationFrame(frame);
}

function stopBossRush(enemy) {
    if (enemy._bossRush) {
        cancelAnimationFrame(enemy._bossRush.raf);
        enemy._bossRush = null;
    }

    enemy.classList.remove('boss-rush-windup', 'boss-rush-charge');

    // Not a hazard once it is not charging — a sword's reach of it is fair.
    if ('true' === enemy.dataset.hazard) {
        delete enemy.dataset.hazard;
    }
}

/** Auto-shoot: a steady stream of the boss's shots in one direction while the direction turns a full circle, like a turret spinning as it fires. */
function startBossSpray(enemy) {
    stopBossSpray(enemy);

    const template = enemy.querySelector(':scope > .projectile');

    if (!template) {
        return;
    }

    template.style.display = 'none';

    const SPRAY = bossTuning(enemy).spray;

    let angle = 0;

    enemy._bossSpray = setInterval(() => {
        if (!document.body.contains(enemy) || '0' === enemy.dataset.health) {
            stopBossSpray(enemy);
            return;
        }

        if (false === window.allowMovement || worldPaused()) {
            return;
        }

        angle = (angle + (360 * SPRAY.every) / SPRAY.turn) % 360;
        fireBossShot(enemy, template, angle, SPRAY);
    }, SPRAY.every);
}

function stopBossSpray(enemy) {
    if (enemy._bossSpray) {
        clearInterval(enemy._bossSpray);
        enemy._bossSpray = null;
    }
}

function fireBossShot(enemy, template, degrees, SPRAY = BOSS_SPRAY) {
    const shot = template.cloneNode(true);
    const img = shot.querySelector('img');
    const width = img ? (parseInt(img.style.width, 10) || 0) : 0;
    const height = img ? (parseInt(img.style.height, 10) || 0) : 0;
    const radians = (degrees * Math.PI) / 180;
    const dx = Math.cos(radians) * SPRAY.reach;
    const dy = Math.sin(radians) * SPRAY.reach;

    shot.classList.add('shooting');
    shot.style.display = '';
    shot.style.position = 'absolute';
    shot.style.left = Math.round(enemy.offsetLeft + (enemy.offsetWidth - width) / 2) + 'px';
    shot.style.top = Math.round(enemy.offsetTop + (enemy.offsetHeight - height) / 2) + 'px';
    shot.style.transition = `transform ${SPRAY.reach / SPRAY.speed}s linear`;

    if (img) {
        img.style.transform = 'rotate(' + degrees + 'deg)';
    }

    (enemy.parentElement || document.querySelector('.game-container')).prepend(shot);

    // The next frame, so the transition has somewhere to start from.
    requestAnimationFrame(() => {
        shot.style.transform = `translate(${dx}px, ${dy}px)`;
    });

    trackProjectile(
        shot,
        document.querySelectorAll('.default-map svg rect, .protection, .map-character-icon.engage, #map-weapon img, [data-genre="explore-point"], [data-genre="explore-wall"]'),
        true,
        enemy
    );
}

function engageShooter(enemy) {
    'use strict';

    stopShooterEnemy(enemy);

    const projSpeed = enemy.dataset.enemyspeed;
    const projectileTemplate = enemy.querySelector('.projectile');

    if (projectileTemplate) {
        projectileTemplate.style.display = 'none';
    }

    // Per-enemy attack display time (ms) so animated (GIF) attack sprites can finish; empty keeps the default.
    const attackDisplayTime =
        parseInt(enemy.dataset.attackDisplayTime, 10) || 500;

    enemy._shooterInt = setInterval(() => {
        if (worldPaused()) {
            return;
        }

        updatePunchImage(enemy, true);

        setTimeout(() => {
            updatePunchImage(enemy, false);
        }, attackDisplayTime);

        const target = enemyTargetPoint(enemy);
        const aimAt = target && target.npc
            ? target.npc
            : document.querySelector('.map-character-icon.engage');
        const aimRect = target && target.npc ? aimAt.getBoundingClientRect() : unscaledRect(aimAt);
        const mapCharacterLeft = aimRect.left + aimRect.width / 2;
        const mapCharacterTop = aimRect.top + (target && target.npc ? aimRect.height / 2 : aimRect.width / 2);

        if (projectileTemplate) {
            shootProjectile(
                projectileTemplate,
                mapCharacterLeft,
                mapCharacterTop,
                enemy,
                projSpeed,
                false,
                '.projectile',
                'no'
            );
        }
    }, parseInt(enemy.dataset.rate, 10) || 5000);
}

/**
 * Shoot the projectile.
 *
 * @param projectile
 * @param mapCharacterLeft
 * @param mapCharacterTop
 * @param enemy
 * @param projSpeed
 * @param spell
 * @param projectileClass
 * @param isProjectile
 */
function shootProjectile(
    projectile,
    mapCharacterLeft,
    mapCharacterTop,
    enemy,
    projSpeed,
    spell,
    projectileClass,
    isProjectile
) {
    'use strict';

    const newProjectile = projectile.cloneNode(true);

    newProjectile.classList.remove('engage');
    newProjectile.style.transition = '';
    newProjectile.style.transform = '';
    newProjectile.style.display = '';

    // Weapon projectiles: if the weapon defines a dedicated projectile image, show that on the flying clone.
    if (true !== spell) {
        newProjectile.classList.remove(
            'weapon-swing',
            'weapon-thrust',
            'weapon-shoot'
        );

        const projectileImg = newProjectile.querySelector('.weapon-projectile');
        const projectileOverlay = newProjectile.querySelector('.weapon-overlay');
        const hasProjectileImg =
            projectileImg && '' !== (projectileImg.getAttribute('src') || '');

        if (hasProjectileImg) {
            projectileImg.style.display = 'block';
            if (projectileOverlay) {
                projectileOverlay.style.display = 'none';
            }
        } else if (projectileOverlay) {
            projectileOverlay.style.display = 'block';
        }
    }

    let collisionWalls;

    let spawnerEl = null;

    if (true !== spell && 'no' === isProjectile) {
        newProjectile.classList.add('shooting');
        const projImg = newProjectile.querySelector('img');
        const projW = projImg ? (parseInt(projImg.style.width)  || 0) : 0;
        const projH = projImg ? (parseInt(projImg.style.height) || 0) : 0;
        newProjectile.style.position = 'absolute';
        newProjectile.style.left =
            Math.round(enemy.offsetLeft + (enemy.offsetWidth  - projW) / 2) + 'px';
        newProjectile.style.top =
            Math.round(enemy.offsetTop  + (enemy.offsetHeight - projH) / 2) + 'px';
        (enemy.parentElement || document.querySelector('.game-container'))
            .prepend(newProjectile);
        spawnerEl = enemy;
        moveEnemy(newProjectile, mapCharacterLeft, mapCharacterTop, projSpeed, enemy);
        collisionWalls = document.querySelectorAll(
            '.default-map svg rect, .protection, .map-character-icon.engage, #map-weapon img, [data-genre="explore-point"], [data-genre="explore-wall"]'
        );
    } else if (true === spell) {
        newProjectile.classList.remove('map-weapon');
        newProjectile.classList.add('magic-weapon');
        const gameContainer = document.querySelector('.game-container');
        gameContainer.prepend(newProjectile);
        moveSpell(newProjectile, mapCharacterLeft, mapCharacterTop);
        collisionWalls = document.querySelectorAll(
            '.default-map svg rect, .enemy-item, .map-item'
        );
    } else if ('yes' === isProjectile) {
        const gameContainer = document.querySelector('.game-container');
        gameContainer.prepend(newProjectile);
        moveSpell(newProjectile, mapCharacterLeft, mapCharacterTop);
        collisionWalls = document.querySelectorAll(
            '.default-map svg rect, .enemy-item, .map-item'
        );
    }

    trackProjectile(newProjectile, collisionWalls, true, spawnerEl);
}

function trackProjectile(projectile, collisionWalls, isProjectile, spawner) {
    'use strict';

    const container = document.querySelector('.game-container');
    // In gravity mode, walls at or below the spawner's feet are ignored until
    // the projectile clears them — prevents a small enemy from instantly
    // self-destructing its shot on the floor it's standing on.
    // Walls beside or above the enemy are never excluded.
    let belowSpawnWalls = null;

    function tick() {
        if (!document.body.contains(projectile)) {
            return;
        }

        // Remove projectile once it leaves the game container bounds.
        const pr = getRelativeRect(projectile, container);
        const margin = 200;
        if (
            pr.right < -margin ||
            pr.left > container.offsetWidth + margin ||
            pr.bottom < -margin ||
            pr.top > container.offsetHeight + margin
        ) {
            projectile.remove();
            return;
        }

        if (window.gravityMode && belowSpawnWalls === null) {
            const origin = spawner || projectile.parentElement;
            const spawnerBottom = origin ? origin.getBoundingClientRect().bottom : 0;
            belowSpawnWalls = new Set(
                Array.from(collisionWalls).filter((wall) =>
                    wall.getBoundingClientRect().top >= spawnerBottom - 2
                )
            );
        }

        for (const wall of collisionWalls) {
            if (belowSpawnWalls && belowSpawnWalls.has(wall)) {
                if (enemyOverlap(projectile, wall, container)) {
                    continue;
                }
                belowSpawnWalls.delete(wall);
            }

            // className on an SVG map rect is an SVGAnimatedString with no includes(), so it is normalised to a string first.
            if (enemyOverlap(projectile, wall, container) && false === String(wall.className?.baseVal ?? wall.className ?? '').includes('trigger') && 'true' !== wall.dataset?.passable) {
                // If projectile collides with player than take health of player.
                if (
                    true === wall.classList.contains('map-character-icon') &&
                    false === projectile.classList.contains('map-weapon') &&
                    !worldPaused()
                ) {
                    const enemyValue = damageTaken(projectile.dataset.value);

                    // Immediately remove the projectile when hits.
                    const currentHealth = document.querySelector(
                        '#explore-points .health-amount'
                    );

                    if (currentHealth) {
                        const healthAmount = parseInt(
                            currentHealth.getAttribute('data-amount'),
                        );

                        if (0 <= healthAmount) {
                            const currentHealthLevel = healthAmount;
                            const newAmount =
                                currentHealthLevel >= enemyValue
                                    ? currentHealthLevel - enemyValue
                                    : 0;

                            hurtAnimation();

                            addUserPoints(
                                newAmount,
                                'health',
                                'projectile',
                                false,
                                '',
                            );
                        }
                    }
                }

                if (true === isProjectile) {
                    projectile.remove();
                }

                // Link weapon back to player.
                window.weaponConnection = true;
            }
        }

        // Somebody being defended is not in the walls list, so is looked for separately.
        if (false === projectile.classList.contains('map-weapon')) {
            const victim = targetableNpcs().find((npcEl) => enemyOverlap(projectile, npcEl, container));

            // One hit per shot: it is gone the moment it lands, or it would hurt them again on every frame it took to pass through.
            if (victim) {
                if (!worldPaused()) {
                    hurtNpc(victim, projectile.dataset.value);
                }

                projectile.remove();
                return;
            }
        }

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    projectile.addEventListener('transitionend', function onProjTransitionEnd() {
        projectile.removeEventListener('transitionend', onProjTransitionEnd);
        if (document.body.contains(projectile)) {
            projectile.remove();
        }
    });
}

function enemyOverlap(a, b, container) {
    'use strict';

    const ar = getRelativeRect(a, container);
    const br = getRelativeRect(b, container);

    return !(
        ar.right < br.left ||
        ar.left > br.right ||
        ar.bottom < br.top ||
        ar.top > br.bottom
    );
}

/**
 * Fire a projectile from the player's weapon. Unlike the old approach (which
 * cloned the .map-weapon and hijacked the movement loop), this builds a
 * standalone element that travels in a straight line in the direction the
 * character faces — like a shooter enemy — damaging enemies and stopping at
 * walls. Uses the configured projectile image, or the weapon image itself.
 *
 * @param {HTMLElement} weapon The player's .map-weapon element.
 */
function fireWeaponProjectile(weapon) {
    'use strict';

    const container = document.querySelector('.game-container');
    const mapChar = document.querySelector('#map-character');

    if (!container || !mapChar) {
        return;
    }

    // Projectile image + size: configured projectile image, else the weapon.
    const projSrcEl = weapon.querySelector('.weapon-projectile');
    const overlayEl = weapon.querySelector('.weapon-overlay');
    const useProj =
        projSrcEl && '' !== (projSrcEl.getAttribute('src') || '');
    const srcEl = useProj ? projSrcEl : overlayEl;
    const src = srcEl ? srcEl.getAttribute('src') || srcEl.src || '' : '';

    if ('' === src) {
        return;
    }

    // The source image is hidden, so it measures 0 without a configured size.
    const width = srcEl.style.width || (srcEl.offsetWidth || srcEl.naturalWidth) + 'px';
    const height = srcEl.style.height || (srcEl.offsetHeight || srcEl.naturalHeight) + 'px';

    // Direction the character faces → travel vector + rotation angle.
    const dirData = {
        right: { angle: 0, dx: 1, dy: 0 },
        down: { angle: 90, dx: 0, dy: 1 },
        left: { angle: 180, dx: -1, dy: 0 },
        top: { angle: 270, dx: 0, dy: -1 },
        up: { angle: 270, dx: 0, dy: -1 },
    };
    const dir = dirData[weapon.dataset.direction] || dirData.down;

    const facingAngles = {
        right: 0,
        'bottom-right': 45,
        down: 90,
        'bottom-left': 135,
        left: 180,
        'top-left': 225,
        up: 270,
        'top-right': 315,
    };
    const facingAngle = facingAngles[weapon.dataset.projectileFacing];
    const rotate =
        undefined !== facingAngle
            ? ' rotate(' + (dir.angle - facingAngle) + 'deg)'
            : '';

    // Spawn at the weapon's tip: the character's center (container coordinates,
    // matching how .map-weapon is positioned) plus the weapon's reach — its
    // range offset plus its length — in the facing direction.
    const range = parseInt(weapon.dataset.range, 10) || 0;
    const weaponLength = overlayEl
        ? Math.max(overlayEl.offsetWidth, overlayEl.offsetHeight)
        : 0;
    // The shot leaves from the weapon's height, not the character's center.
    const verticalOffset = parseInt(weapon.dataset.verticalOffset, 10) || 0;
    const tipOffset = range + weaponLength;
    const spawnLeft =
        parseInt(mapChar.style.left, 10) +
        window.globalLeftPositionOffset +
        dir.dx * tipOffset;
    const spawnTop =
        parseInt(mapChar.style.top, 10) +
        window.globalTopPositionOffset +
        verticalOffset +
        dir.dy * tipOffset;

    const proj = document.createElement('div');
    proj.className = 'weapon-fired-projectile';
    proj.dataset.strength = weapon.dataset.strength || '""';
    proj.dataset.weapon = weapon.dataset.weapon || '';
    proj.style.position = 'absolute';
    proj.style.left = spawnLeft + 'px';
    proj.style.top = spawnTop + 'px';
    proj.style.width = '0';
    proj.style.height = '0';
    proj.style.zIndex = '2';

    const img = document.createElement('img');
    img.src = src;
    img.style.position = 'absolute';
    img.style.left = '50%';
    img.style.top = '50%';
    img.style.width = width;
    img.style.height = height;
    img.style.transform = 'translate(-50%, -50%)' + rotate;
    proj.appendChild(img);
    // Spawn coordinates are world-local (from mapChar.style.left), so in a
    // zoomed area the projectile must live inside the scaled world layer to
    // line up with the weapon and travel the right visual distance.
    const worldLayer = document.querySelector('.game-world') || container;
    worldLayer.appendChild(proj);

    // Travel far enough to leave the map, then let collision/bounds remove it.
    const distance = 5000;
    proj.style.transition = 'transform 1.2s linear';
    void proj.offsetWidth;
    proj.style.transform =
        'translate(' + dir.dx * distance + 'px, ' + dir.dy * distance + 'px)';

    const collisionWalls = document.querySelectorAll(
        '.enemy-item, .default-map svg rect, [data-genre="explore-wall"]'
    );

    trackWeaponProjectile(proj, collisionWalls);
}

/**
 * Track a fired weapon projectile: remove it when it leaves the map or hits a
 * wall, and damage the enemy it strikes.
 *
 * @param {HTMLElement} projectile
 * @param {NodeList}    collisionWalls
 */
function trackWeaponProjectile(projectile, collisionWalls) {
    'use strict';

    const container = document.querySelector('.game-container');

    function tick() {
        if (!document.body.contains(projectile)) {
            return;
        }

        const pr = getRelativeRect(projectile, container);
        const margin = 200;

        if (
            pr.right < -margin ||
            pr.left > container.offsetWidth + margin ||
            pr.bottom < -margin ||
            pr.top > container.offsetHeight + margin
        ) {
            projectile.remove();
            return;
        }

        for (const wall of collisionWalls) {
            if (!document.body.contains(wall)) {
                continue;
            }

            // className on an SVG element is an SVGAnimatedString, which has no includes().
            if (
                String(wall.className?.baseVal ?? wall.className ?? '').includes('trigger') ||
                'true' === wall.dataset?.passable
            ) {
                continue;
            }

            if (enemyOverlap(projectile, wall, container)) {
                if (wall.classList.contains('enemy-item')) {
                    hurtTheEnemy(projectile, wall, {
                        offsetLeft: wall.offsetLeft,
                        offsetTop: wall.offsetTop,
                        offsetWidth: wall.offsetWidth,
                        offsetHeight: wall.offsetHeight,
                        classList: { contains: () => false },
                    });
                }

                projectile.remove();
                return;
            }
        }

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);

    projectile.addEventListener('transitionend', function onEnd() {
        projectile.removeEventListener('transitionend', onEnd);
        if (document.body.contains(projectile)) {
            projectile.remove();
        }
    });
}

function getRelativeRect(el, container) {
    'use strict';

    const elRect = el.getBoundingClientRect();
    const parentRect = container.getBoundingClientRect();

    return {
        top: elRect.top - parentRect.top,
        left: elRect.left - parentRect.left,
        width: elRect.width,
        height: elRect.height,
        right: elRect.right - parentRect.left,
        bottom: elRect.bottom - parentRect.top,
    };
}

/**
 *  Move enemy or projectile to character position.
 *
 * @param projectile       The projectile or runner.
 * @param mapCharacterLeft Character's left position.
 * @param mapCharacterTop  Character's right position.
 * @param projSpeed        The speed of movement.
 * @param newEnemy         The enemy shooting.
 */
function moveEnemy(
    projectile,
    mapCharacterLeft,
    mapCharacterTop,
    projSpeed,
    newEnemy
) {
    'use strict';

    let leftDifference;
    let topDifference;
    const projectilePosition = projectile.getBoundingClientRect();
    const projCenterX = projectilePosition.left + projectilePosition.width  / 2;
    const projCenterY = projectilePosition.top  + projectilePosition.height / 2;

    const mapCharacter = document.getElementById('map-character');
    const bPosition = getPositionAtCenter(newEnemy);
    const aPosition = getPositionAtCenter(mapCharacter);

    // Set the transition speed dynamically.
    regulateTransitionSpeed(
        aPosition.x,
        aPosition.y,
        bPosition.x,
        bPosition.y,
        projectile,
        projSpeed,
        DEFAULT_PROJECTILE_SPEED
    );

    const angle = Math.atan2(
        mapCharacterTop  - projCenterY,
        mapCharacterLeft - projCenterX
    );

    // Rotate the projectile image to point the way it travels. The rotation is
    // the travel angle minus the angle the art already faces (data-projectile-
    // facing on the .projectile). Applied to the inner <img> so it doesn't
    // clash with the movement transform on the .projectile element.
    const facingAngles = {
        right: 0,
        'bottom-right': 45,
        down: 90,
        'bottom-left': 135,
        left: 180,
        'top-left': 225,
        up: 270,
        'top-right': 315,
    };
    const facingAngle = facingAngles[projectile.dataset.projectileFacing];
    if (undefined !== facingAngle) {
        const projImg = projectile.querySelector('img');
        if (projImg) {
            projImg.style.transform =
                'rotate(' + ((angle * 180) / Math.PI - facingAngle) + 'deg)';
        }
    }

    const targetX = mapCharacterLeft + Math.cos(angle) * 800;
    const targetY = mapCharacterTop  + Math.sin(angle) * 800;

    // Deltas are in screen pixels (from getBoundingClientRect). The projectile
    // sits inside the scaled .game-world, so a transform applied here is scaled
    // again by the wrapper — divide by the area scale to cancel that out.
    const scale = window.areaScale || 1;

    leftDifference = (targetX - projCenterX) / scale;
    topDifference  = (targetY - projCenterY) / scale;

    projectile.style.transform =
        'translate(' + leftDifference + 'px, ' + topDifference + 'px)';
}

/**
 * Move enemy or projectile to character position.
 * @param projectile
 * @param mapCharacterLeft
 * @param mapCharacterTop
 */
function moveSpell(projectile, mapCharacterLeft, mapCharacterTop) {
    'use strict';

    // Set the transition speed dynamically.
    projectile.style.transition = 'all 3s';
    // Force a reflow so the transition animates from the projectile's current
    // position instead of jumping straight to the far target (which flies off
    // screen instantly and never appears).
    void projectile.offsetWidth;
    projectile.style.left = mapCharacterLeft + 'px';
    projectile.style.top = mapCharacterTop + 'px';
}

/**
 *
 * @param  aPositionx
 * @param  aPositiony
 * @param  bPositionx
 * @param  bPositiony
 * @param  projectile
 * @param  multiple
 * @return {number}
 */
function regulateTransitionSpeed(
    aPositionx,
    aPositiony,
    bPositionx,
    bPositiony,
    projectile,
    multiple,
    fallbackSpeed
) {
    'use strict';

    const diffDist = Math.hypot(
        aPositionx - bPositionx,
        aPositiony - bPositiony
    );

    const transitionDist =
        diffDist * 0.075 * usableSpeed(multiple, fallbackSpeed || DEFAULT_PATH_SPEED);
    let moveDirection = 'down';
    const ydiff = Math.abs(aPositiony - bPositiony);
    const xdiff = Math.abs(aPositionx - bPositionx);

    projectile.style.transition = 'all ' + transitionDist + 'ms linear 0s';

    if (aPositiony > bPositiony && ydiff > xdiff) {
        moveDirection = 'up';
    } else if (aPositiony < bPositiony && ydiff > xdiff) {
        moveDirection = 'down';
    } else if (aPositionx < bPositionx && xdiff > ydiff) {
        moveDirection = 'right';
    } else if (aPositionx > bPositionx && xdiff > ydiff) {
        moveDirection = 'left';
    }

    return moveDirection;
}

/**
 *
 * @param  aPositionx
 * @param  aPositiony
 * @param  bPositionx
 * @param  bPositiony
 * @param  multiple
 * @param  timeBetween
 * @return {number}
 */
function getLoopAmount(
    aPositionx,
    aPositiony,
    bPositionx,
    bPositiony,
    multiple,
    timeBetween
) {
    'use strict';

    const diffDist = Math.hypot(
        aPositionx - bPositionx,
        aPositiony - bPositiony
    );
    const transitionDist =
        diffDist * pathPause(timeBetween) * usableSpeed(multiple, DEFAULT_PATH_SPEED);

    return Math.max(1, Math.ceil(transitionDist / 250));
}

function usableSpeed(value, fallback) {
    'use strict';

    const speed = parseFloat(value);

    return Number.isFinite(speed) && 0 < speed ? speed : fallback;
}

function pathPause(value) {
    'use strict';

    const pause = parseFloat(value);

    return Number.isFinite(pause) && 0 < pause ? pause : DEFAULT_PATH_PAUSE;
}

function unscaledRect(el) {
    'use strict';

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    if (!style.transform || 'none' === style.transform || !el.offsetWidth) {
        return rect;
    }

    const m = new DOMMatrixReadOnly(style.transform);
    const sx = m.a || 1;
    const sy = m.d || 1;

    if (Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) {
        return rect;
    }

    const k = rect.width / (el.offsetWidth * sx);
    const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
    const left = rect.left - ox * k * (1 - sx);
    const top = rect.top - oy * k * (1 - sy);
    const width = el.offsetWidth * k;
    const height = el.offsetHeight * k;

    return { left, top, width, height, right: left + width, bottom: top + height };
}

/**
 *
 * @param  element
 * @return {{x: *, y: *}}
 */
function getPositionAtCenter(element) {
    'use strict';

    const { top, left, width, height } = element.getBoundingClientRect();
    return {
        x: left + width / 2,
        y: top + height / 2,
    };
}

/**
 * Helper function to add no points class to areas that have points already.
 */
function addNoPoints() {
    'use strict';

    const types = ['health', 'mana', 'point', 'gear', 'weapons', 'money'];

    types.forEach((type) => {
        const selectedCharacterPositions =
            undefined !== OrbemOrder.explorePoints[type]
                ? OrbemOrder.explorePoints[type].positions
                : [];

        // Add no point class to positions already gotten.
        if (selectedCharacterPositions) {
            selectedCharacterPositions.forEach((value) => {
                const valNum = parseInt(value) > 0;
                const mapItem = valNum
                    ? null
                    : document.querySelector('.' + escClass(value) + '-map-item');
                const cutSceneItem = valNum
                    ? null
                    : document.querySelector('.' + escClass(value) + '-map-cutscene');
                const explainerItem = valNum
                    ? null
                    : document.querySelector(
                        '.' + escClass(value) + '-explainer-trigger-map-item'
                    );
                const materializeMapItem = valNum
                    ? null
                    : document.querySelector(
                        '.' + escClass(value) + '-materialize-item-map-item'
                    );
                const dragDestMapItem = valNum
                    ? null
                    : document.querySelector(
                        '.' + escClass(value) + '-drag-dest-map-item'
                    );
                const communicateTrigger = document.getElementById(
                    value + '-t'
                );

                if (communicateTrigger) {
                    const communicateMessage = document.getElementById(value);
                    const communicateParent = communicateMessage.parentNode;

                    if (communicateMessage) {
                        communicateMessage.classList.add('engage');

                        communicateTrigger.remove();
                    }

                    if (
                        communicateParent &&
                        false ===
                        communicateParent.classList.contains('dependent')
                    ) {
                        communicateParent.classList.add('dependent');
                    }
                }

                // Add special class for cutscenes.
                if (cutSceneItem && 'yes' !== cutSceneItem.dataset?.repeat) {
                    cutSceneItem.classList.add('been-viewed');
                }

                // Add for explainers.
                if (explainerItem) {
                    explainerItem.classList.add('already-hit');
                }

                if (mapItem) {
                    // If collected already don't show item.
                    if (shouldRemoveItemOnload(mapItem)) {
                        mapItem.remove();

                        if (materializeMapItem) {
                            materializeMapItem.remove();
                        }
                    }

                    // Remove drag dest if removable and map item has one.
                    if (
                        dragDestMapItem &&
                        'true' === dragDestMapItem.dataset.removable
                    ) {
                        dragDestMapItem.remove();
                    }

                    if ('no' === mapItem.dataset?.disappear) {
                        swapInteractedImage(mapItem);
                    }

                    mapItem.classList.add('no-point');
                }
            });
        }

        // Clear all bubbles.
        const characterSlugs = document.querySelectorAll(
            '.map-item-modal.graeme'
        );
        const allBubble = document.querySelectorAll('.map-item-modal');

        if (allBubble) {
            allBubble.forEach((bubble) => {
                bubble.classList.remove('engage');
            });
        }

        // Show all character bubbles.
        if (characterSlugs) {
            characterSlugs.forEach((characterSlug) => {
                characterSlug.classList.add('engage');
            });
        }
    });

    // Engage already materialized items.
    if (OrbemOrder?.exploreMaterializedItems[currentLocation] && 0 < OrbemOrder.exploreMaterializedItems[currentLocation].length) {
        OrbemOrder.exploreMaterializedItems[currentLocation].forEach((item) => {
            const theItemElement = document.querySelector('.' + escClass(item) + '-map-item');

            if (theItemElement) {
                theItemElement.classList.add('materialized');
            }
        });
    }
}

function shouldRemoveItemOnload(mapItem) {
    'use strict';

    if (
        (undefined !== mapItem.dataset.timer &&
            null !== mapItem.dataset.timer) ||
        'explore-character' === mapItem.dataset.genre ||
        'true' === mapItem.dataset.hazard ||
        'true' === mapItem.dataset.collectable ||
        (('true' === mapItem.dataset.breakable || 'true' === mapItem.dataset.collectable || 'true' === mapItem.dataset.clickable) &&
            'no' !== mapItem.dataset?.disappear) ||
        ('true' === mapItem.dataset.removable &&
            'no' !== mapItem.dataset?.disappear) ||
        ('true' === mapItem.dataset.draggable &&
            'yes' === mapItem.dataset?.disappear) ||
        (undefined !== mapItem.dataset?.removeaftercutscene ||
            undefined !== mapItem.dataset?.removeaftermission)
    ) {
        return true;
    }

    return false;
}

function startGravityLoop(entity) {
    if (entity._gravityActive) return;
    entity._gravityActive = true;
    entity._gravVelocity = 0;

    function gravTick() {
        if (!document.body.contains(entity) || !window.gravityMode) {
            entity._gravityActive = false;
            return;
        }

        const GRAVITY  = 0.5;
        const MAX_FALL = 12;
        const MAX_STEP = 3;

        entity._gravVelocity = Math.min(entity._gravVelocity + GRAVITY, MAX_FALL);

        let remaining   = entity._gravVelocity;
        let currentTop  = parseInt(entity.style.top, 10) || 0;
        const currentLeft = parseInt(entity.style.left, 10) || 0;

        while (Math.abs(remaining) > 0.01) {
            const step    = Math.min(remaining, MAX_STEP);
            const testTop = Math.round(currentTop + step);

            // Always use npc=true collision path for the gravity check, not the
            // enemy path. The enemy path applies a 20px hitbox inset so that
            // enemies can visually overlap walls during horizontal pursuit; if
            // we used that for floor detection the visual sprite would phase
            // 20px into the floor before "landing." Passing false here uses
            // the entity's full offsetWidth/offsetHeight so the visual bottom
            // lines up with the floor surface.
            const testPos = blockMovement(testTop, currentLeft, entity, false);

            if (testPos.top < testTop) {
                // Floor hit — stop falling but keep the loop running so the
                // entity will fall again if it walks off an edge.
                entity._gravVelocity = 0;
                break;
            } else {
                currentTop += step;
                remaining  -= step;
            }
        }

        entity.style.top = Math.round(currentTop) + 'px';
        requestAnimationFrame(gravTick);
    }

    requestAnimationFrame(gravTick);
}

function applyItemGravity() {
    if (!window.gravityMode) return;

    const gravityItems = document.querySelectorAll('[data-gravity="yes"]');
    gravityItems.forEach((item) => {
        // Skip items hidden by their own display:none rule (e.g. data-showaftermission,
        // materialize-item targets). getComputedStyle checks the element's own resolved
        // display, NOT inherited from ancestors — so a display:none on .game-container
        // doesn't incorrectly mark its children as hidden.
        if ('none' !== window.getComputedStyle(item).display) {
            startGravityLoop(item);
        }
    });
}

function applyEntityGravity() {
    if (!window.gravityMode) return;

    const entities = document.querySelectorAll(
        '[data-genre="explore-character"], [data-genre="explore-enemy"], .enemy-item'
    );

    entities.forEach((entity) => {
        // Main player character is handled by movementIntFunc's movement interval.
        if ('map-character' === entity.id) return;

        // Skip entities hidden by their own display:none rule (same reasoning as
        // applyItemGravity above). Gravity for these starts via materializeGravity().
        if ('none' !== window.getComputedStyle(entity).display) {
            startGravityLoop(entity);
        }
    });
}

/**
 * Start gravity for an element that has just been made visible.
 * Checks whether the element is a gravity candidate before starting.
 */
function materializeGravity(el) {
    if (!window.gravityMode || !el) return;
    if (
        'yes' === el.dataset.gravity ||
        'explore-enemy' === el.dataset.genre ||
        'explore-character' === el.dataset.genre ||
        el.classList.contains('enemy-item')
    ) {
        startGravityLoop(el);
    }
}

function engageUntriggeredEnemies() {
    const enemies = document.querySelectorAll('.enemy-item[data-genre="explore-enemy"]');
    enemies.forEach((enemy) => {
        // A spawner is hidden on purpose, so it is judged by its trigger alone.
        if (isSpawner(enemy)) {
            const spawnerName = cleanClassName(enemy.className);

            if (!document.querySelector('.' + escClass(spawnerName) + '-trigger-map-item')) {
                engageEnemy(enemy, false);
            }

            return;
        }

        // Skip enemies hidden by their own CSS (data-showaftermission etc.).
        // Use getComputedStyle so a display:none on .game-container (the outer
        // wrapper) doesn't accidentally hide all enemies at startup.
        if ('none' === window.getComputedStyle(enemy).display) return;

        const enemyName = [...enemy.classList].find(c => c.endsWith('-map-item') && c !== 'map-item')?.replace('-map-item', '') || '';
        const hasTrigger = enemyName && document.querySelector('.' + escClass(enemyName) + '-trigger-map-item');
        const hasPendingBossCutscene = enemyName && document.querySelector('.map-cutscene[data-boss="' + enemyName + '"]:not(.been-viewed)');
        if (!hasTrigger && !hasPendingBossCutscene) {
            engageEnemy(enemy, false);
        }
    });
}

export function engageExploreGame() {
    'use strict';

    isLoggedIn = document.querySelector('main').dataset?.loggedin ?? false;
    const playerName = document.querySelector('#orbem-studio-play-name');
    const container = document.querySelector('.game-container');
    const touchButtons = document.querySelector('.touch-buttons');
    // Per-area zoom. Scaled areas wrap the world in a transform:scale layer
    // (.game-world). offsetLeft/Top-based math is unaffected by transforms, but
    // screen<->world conversions (click-to-move, projectile aiming, devmode
    // placement) divide by this factor. 1 = no zoom. The template renders the
    // wrapper server-side on load; applyAreaScale normalizes it (and hoists the
    // fixed overlays out) so the same code path handles load and area changes.
    applyAreaScale(container?.dataset.areaScale);
    window.previousCutsceneArea = OrbemOrder.previousCutsceneArea || localStorage.getItem('orbem_local_previousCutsceneArea') || '';

    const tryAgain = document.querySelectorAll('.try-again');
    if (tryAgain) {
        tryAgain.forEach((tryAgainButton) => {
            tryAgainButton.addEventListener('click', () => {
                dismissGameOver(
                    tryAgainButton.closest('.game-over-notice')
                );
            });
        });
    }

    // Show Devmode.
    const devModeMenus = document.querySelectorAll('.right-bottom-devmode, .dev-mode-menu, .right-bottom-devmode-pro');

    if (devModeMenus) {
        devModeMenus.forEach(devModeMenu => {
            devModeMenu.classList.add('engage');
        })
    }

    // Reset any local game stats.
    resetLocalGameState();
    replaceScoreTokens();
    replaceScoresInBody();

    if (playerName && '' !== playerName.value) {
        const playerNameString = playerName.value;
        window.playerName = playerNameString;

        replaceNameInBody('{{playerName}}', playerNameString);
    } else {
        const mainCharName = document.querySelector('#map-character .map-character-icon').alt.replace(' static', '');
        replaceNameInBody('{{playerName}}', mainCharName);
    }

    // Swap dialogue text/audio to match visitor's browser language before engaging.
    applyLanguageTranslations();

    // Set all first cutscene dialogues to engage.
    const allFirstDialogues = document.querySelectorAll(
        '.map-cutscene .wp-block-orbem-paragraph-mp3:first-of-type, .map-communicate .wp-block-orbem-paragraph-mp3'
    );

    if (allFirstDialogues) {
        allFirstDialogues.forEach((firstDialogue) => {
            if (isBranchLine(firstDialogue)) {
                return;
            }

            firstDialogue.classList.add('engage');
        });
    }

    // Stop start music.
    playStartScreenMusic(false);

    // Engage communicate click.
    communicateParentClick();

    // Engage clickables.
    engageClickableTimes();
    window.engageClickableTimes = engageClickableTimes;

    // Set true by default.
    window.weaponConnection = true;

    // Set true by default.
    window.allowHit = true;

    // Set true by default.
    window.allowIndicate = true;

    // Set attack multiplier default.
    window.attackMultiplier = 0;
    window.defenseMultiplier = 0;

    // Set points running to false by default.
    window.runningPointFunction = false;

    // Set walking speed by default.
    window.moveSpeed = 3;

    // Default for auto walk.
    window.currentCharacterAutoDirection = '';

    // Engage character selection.
    engageCharacterSelection();

    // Hide materialize items.
    materializeItemLogic();

    // Show crew menu.
    const crewMenu = document.getElementById('characters');
    const crewMates = crewMenu
        ? crewMenu.querySelectorAll('.character-item')
        : false;

    if (crewMenu && 0 < crewMates.length) {
        crewMenu.style.display = 'block';
    }

    // Hide start screen.
    if (document.querySelector('.explore-overlay')) {
        document.querySelector('.explore-overlay').remove();
    }
    document.body.style.position = 'unset';

    if (touchButtons && ( isOnTablet || isOnMobile )) {
        touchButtons.classList.add('do-mobile');
    }

    let newMusic = '';

    if (OrbemOrder.musicNames && currentLocation) {
        newMusic = JSON.parse(OrbemOrder.musicNames)[currentLocation];
    }

    // Start music.
    playSong(newMusic, currentLocation);

    // Show leave map link and keys guide.
    const explorePoints = document.getElementById('explore-points');
    const missions = document.getElementById('missions');

    if (explorePoints) {
        explorePoints.style.opacity = '1';
    }

    if (missions) {
        missions.style.opacity = '1';
    }

    watchHudContents();
    refreshHudVisibility();

    // Flash key-guide.
    const keyGuide = document.getElementById('key-guide');
    spinMiroLogo(keyGuide, 'engage');

    // Run arrow flash intermittently.
    window.buttonShow = setInterval(function () {
        spinMiroLogo(keyGuide, 'engage');
    }, 10000);

    // Engage enemies that have no trigger defined.
    engageUntriggeredEnemies();

    const missionListEl = document.querySelector('.missions-content');
    if (missionListEl) missionListEl.dataset.area = currentLocation;

    if (false === isLoggedIn) {
        const storedMissions = JSON.parse(localStorage.getItem('orbem_local_missions') || '{}');
        const completedMissions = storedMissions[currentLocation] || [];
        completedMissions.forEach((completedMission) => {
            const completedEl = document.querySelector('.' + escClass(completedMission) + '-mission-item');
            if (completedEl) {
                showNextMission(completedEl);
                completedEl.remove();
            }
        });
    }

    // Load blockades.
    loadMissionBlockades();

    if (false === isLoggedIn) {
        applyLocalDragPositions(currentLocation);
    }

    // Add character hit button.
    addCharacterHit();

    // Update explore position if on explore page.
    movementIntFunc();

    // Apply gravity to items marked with explore-gravity = yes.
    // Must run after movementIntFunc so window.gravityMode is set.
    applyItemGravity();

    cycleInteractedImages();

    // Apply gravity to all characters and enemies in the area.
    applyEntityGravity();

    // Move npcs - must run after movementIntFunc so window.gravityMode is set
    // before getRandomDir picks a wander direction.
    const moveableCharacters = document.querySelectorAll(
        '.path-onload[data-path]:not([data-path=""]), [data-wanderer="yes"]'
    );

    if (moveableCharacters) {
        moveableCharacters.forEach((moveableCharacter) => {
            moveNPC(moveableCharacter, false, false, false);
        });
    }

    const defaultMap =  document.querySelector('.default-map');

    // Trigger cutscene if area is cutscene.
    const isAreaCutscene =
        'yes' === defaultMap.dataset.iscutscene;

    if (isAreaCutscene && currentLocation) {
        const cutSceneName = cleanClassName(
            document.querySelector('.map-cutscene').className
        );
        window.previousCutsceneArea = cutSceneName;
        setPreviousCutsceneArea(window.previousCutsceneArea);
        engageCutscene(cutSceneName, true);
    }

    if ('' !== window.previousCutsceneArea) {
        removeItems(
            document.querySelectorAll('[data-removeaftercutscene]'),
            window.previousCutsceneArea
        );

        const showItems = document.querySelectorAll(
            '[data-showaftercutscene=' + window.previousCutsceneArea + ']'
        );

        if (showItems) {
            showItems.forEach((showItem) => {
                materializedItemsArray.push(cleanClassName(showItem.className));
                showItem.classList.add('no-point');
            });

            saveMaterializedItem(currentLocation, materializedItemsArray);
        }
    }

    // Hazard hurt me check.
    checkIfHazardHurts();

    // Show the game container.
    if (container) {
        container.style.display = 'block';
    }

    // Scroll to center.
    const mapChar = document.getElementById('map-character');

    if (mapChar) {
        // Entering fullscreen doesn't require a position adjustment — the
        // icon-centering math below already produces the same on-screen
        // position for any container/offset size (mobile, tablet, desktop).
        if (isOnMobile && mapChar.style.left.replace('px', '') === defaultMap.dataset.startleft) {
            enterFullscreen();
        }

        if (isOnTablet && mapChar.style.top.replace('px', '') === defaultMap.dataset.starttop) {
            enterFullscreen();
        }

        // Convert the raw map-relative start position rendered by PHP into a
        // position centered on the character's image, matching enterNewArea's
        // math. This only applies to a fresh area start (an image-target
        // position). When continuing a saved game the stored coordinate is
        // already the container's position, so applying the offset again would
        // shift the player away from where they left off — skip it.
        if ('1' !== mapChar.dataset.continued) {
            const _charIcon = mapChar.querySelector('.map-character-icon');
            const _iconH = _charIcon ? parseInt(_charIcon.getAttribute('height') || '0') : 0;
            const _iconW = _charIcon ? parseInt(_charIcon.getAttribute('width') || '0') : 0;

            mapChar.style.top =
                (parseInt(mapChar.style.top) - (window.globalTopPositionOffset - Math.round(_iconH / 2))) + 'px';
            mapChar.style.left =
                (parseInt(mapChar.style.left) - (window.globalLeftPositionOffset - Math.round(_iconW / 2))) + 'px';
        }

        centerCamera(mapChar, {
            behavior: 'instant',
            block: 'center',
            inline: 'center',
        });
    }

    setTimeout(() => {
        fadeInScene();
    }, 1000);
}

function applyLocalDragPositions(area) {
    'use strict';

    const dragStorage = JSON.parse(localStorage.getItem('orbem_local_drag') || '{}');
    const positions = dragStorage[area] || {};

    Object.entries(positions).forEach(([slug, coords]) => {
        const el = document.querySelector('.' + escClass(slug) + '-map-item');
        if (el) {
            el.style.top = coords.top;
            el.style.left = coords.left;
        }
    });
}

function resetLocalGameState() {
    'use strict';

    const types = ['point', 'health', 'money', 'communicate'];

    types.forEach((type) => {
        const storageKey = `orbem_local_${type}`;
        const current = JSON.parse(localStorage.getItem(storageKey) || '{}');

        if (current.phigh > current.high) {
            current.high = current.phigh;
            current.phigh = 0;
        }

        const reset = {
            type,
            current: 0,
            high: current.high || 0,
            positions: [],
        };

        localStorage.setItem(storageKey, JSON.stringify(reset));
    });

    if (false === isLoggedIn) {
        localStorage.removeItem('orbem_local_missions');
        localStorage.removeItem('orbem_local_previousCutsceneArea');
        localStorage.removeItem('orbem_local_drag');
        localStorage.removeItem('orbem_local_points');
    }
}

function enterFullscreen() {
    const el = document.documentElement;

    if (el.requestFullscreen) {
        el.requestFullscreen();
    } else if (el.webkitRequestFullscreen) { // iOS Safari
        el.webkitRequestFullscreen();
    }
}

/**
 * Run materialize item logic.
 */
function materializeItemLogic() {
    'use strict';

    const materialItems = document.querySelectorAll(
        '.materialize-item-trigger'
    );

    if (materialItems) {
        materialItems.forEach((mItem) => {
            const itemName = cleanClassName(mItem.className);
            const itemEl = document.querySelector('.' + escClass(itemName) + '-map-item');
            const dragDest = document.querySelector(
                '.' + escClass(itemName) + '-drag-dest-map-item'
            );

            if (itemEl) {
                itemEl.style.display = 'none';
            }

            if (dragDest) {
                dragDest.style.display = 'none';
            }
        });
    }
}

/**
 * Load blockades and hide communicate triggers from missions.
 */
function loadMissionBlockades() {
    'use strict';

    // Add mission blockade.
    const missions = document.querySelectorAll('.mission-list .mission-item');

    if (missions) {
        missions.forEach((mission) => {
            const blockade = mission.dataset.blockade;
            const missionName = cleanClassName(mission.className);
            const materializes = document.querySelectorAll(
                '[data-materializemission="' + missionName + '"]'
            );

            if (materializes) {
                materializes.forEach((materialize) => {
                    materialize.style.display = 'none';
                });
            }

            if (blockade && '' !== blockade) {
                const blockadeSpecs = JSON.parse(blockade);

                if ('0' !== blockadeSpecs.height) {
                    const missionBlockadeEl = document.createElement('div');
                    const blockadeClasses = mission.className.replace(
                        'mission-item ',
                        ''
                    );
                    const defaultMap = document.querySelector('.default-map');

                    missionBlockadeEl.className =
                        'wp-block-group map-item is-layout-flow wp-block-group-is-layout-flow ' +
                        blockadeClasses +
                        '-blockade';
                    missionBlockadeEl.style.top = blockadeSpecs.top + 'px';
                    missionBlockadeEl.style.left = blockadeSpecs.left + 'px';
                    missionBlockadeEl.style.width = blockadeSpecs.width + 'px';
                    missionBlockadeEl.style.height =
                        blockadeSpecs.height + 'px';
                    missionBlockadeEl.dataset.genre = 'blockade';
                    missionBlockadeEl.id = mission.id;
                    missionBlockadeEl.draggable = true;

                    if (
                        false === mission.classList.contains('engage') &&
                        true === mission.classList.contains('next-mission')
                    ) {
                        missionBlockadeEl.style.display = 'none';
                    }

                    // Add blockade to map.
                    if (defaultMap) {
                        defaultMap.append(missionBlockadeEl);
                    }
                }
            }
        });
    }
}

/**
 * Helper function that returns position of element.
 *
 * @param  v
 * @param  a
 * @param  b
 * @param  d
 * @param  x
 * @param  $newest
 * @return {number}
 */
function miroExplorePosition(v, a, b, d, x, $newest) {
    'use strict';

    const pane = document.querySelector('.game-container');
    const mapChar = document.querySelector('#map-character');
    const box = mapChar.querySelector('.map-character-icon.engage');
    const modal = document.querySelectorAll(
        '.map-item:not(.drag-dest), .projectile, .enemy-item, [data-hazard="true"]'
    );

    let weaponEl = document.querySelector('.map-weapon');
    const magicEl = document.querySelector('.magic-weapon');
    const area = document
        .querySelector('.game-container')
        .className.replace('game-container ', '');
    const hazardGauge = mapChar.querySelector('.misc-gauge-wrap');

    // Reset weapon element as magic element.
    if (magicEl) {
        weaponEl = magicEl;
    }

    const weaponOverlay = weaponEl.querySelector('.weapon-overlay');
    const damageAtEnd = 'end' === mapChar.dataset.damageTime;

    // Other players, once per pass rather than once per item.
    if (weaponEl.classList.contains('engage') && false === damageAtEnd) {
        swingAtPlayers(weaponEl);
    }

    if (0 < modal.length && false === window.noTouch) {
        // Overlap check for map item.
        modal.forEach((value) => {
            let position = cleanClassName(value.className);

            if (
                value.classList.contains('enemy-item') &&
                weaponEl.classList.contains('engage') &&
                false === damageAtEnd
            ) {
                hitEnemyWithWeapon(weaponEl, value);
            }

            // No points for draggables.
            const dragDest = /^\d/.test(String(position)) ? null : document.querySelector(
                '.' + escClass(position) + '-drag-dest-map-item'
            );
            let dragMission = false;

            if (dragDest && false === value.classList.contains('no-point')) {
                dragMission = document.querySelector(
                    '.' + escClass(dragDest.dataset.mission) + '-mission-item'
                );

                if (null === dragMission) {
                    value.classList.add('no-point');
                }
            }

            const indicator = document.querySelector('.indicator-icon');
            const characterName = cleanClassName(value.className);
            const cutsceneEl = document.querySelector(
                `.map-cutscene[data-character="${characterName}"]:not([data-triggertype="none"])`
            );

            const finalCharPos = {
                offsetLeft: mapChar.offsetLeft + (window.globalLeftPositionOffset - box.offsetWidth / 2),
                offsetWidth: box.offsetWidth,
                offsetTop: mapChar.offsetTop + (window.globalTopPositionOffset - box.offsetHeight / 2),
                offsetHeight: box.offsetHeight,
            };

            if (value.dataset.passDepth) {
                sortByDepth(value, finalCharPos);
            }

            // A just-dropped weapon can't be re-collected until the player
            // steps off it, so replacing a weapon doesn't instantly re-equip
            // the one that was dropped.
            if ('true' === value.dataset.dropCooldown) {
                if (box && !elementsOverlap(finalCharPos, value, 5)) {
                    delete value.dataset.dropCooldown;
                }

                return;
            }

            // Touching with buffer.
            if (!worldPaused() && value && box && 'true' === value.dataset.hazard && theHazardOverlap(box, value, (value?.offsetParent && 'boss' === value.offsetParent.dataset.enemyType))) {
                // If in hazard set to true.
                if (
                    false === canCharacterInteract(value, mapChar, 'hazard')
                ) {
                    if (100 <= hazardCounter || 0 === hazardCounter) {
                        const hazardHurt = parseInt(value.dataset.value, 10) || 1;
                        const hurtAmount = value.closest('.enemy-item') ? damageTaken(hazardHurt) : hazardHurt;
                        const currentHealth = getCurrentPoints('health');
                        const newAmount = currentHealth - hurtAmount;

                        hurtAnimation();

                        addUserPoints(newAmount, 'health', 'hazard', false, '');

                        redirectAfterInteraction(value);

                        // Push character away from hazard center.
                        pushCharacter(
                            25,
                            value.closest('.enemy-item') ?? value,
                            mapChar
                        );

                        hazardCounter = 0;
                    }

                    hazardCounter++;
                } else if (
                    true === canCharacterInteract(value, mapChar, 'hazard')
                ) {
                    if (hazardGauge) {
                        hazardGauge.classList.add('engage');
                    }

                    const hazardGaugeBar =
                        hazardGauge.querySelector('.misc-gauge');

                    if (window.hazardTime <= hazardCounter) {
                        inHazard = true;
                        window.theHazardValue = value.dataset.value;
                        hazardItem = value.closest('.enemy-item') ?? value;
                        hazardGaugeBar.style.width = '100%';
                        hazardGauge.classList.remove('engage');
                    } else {
                        hazardGaugeBar.style.width =
                            ((window.hazardTime - hazardCounter) /
                                window.hazardTime) *
                            100 +
                            '%';
                    }

                    hazardCounter++;
                }
            }

            const touchBox = window.orbemDepthSort && value?.dataset?.passDepth && 'explore-character' === value.dataset.genre
                ? { offsetLeft: value.offsetLeft, offsetTop: value.offsetTop, offsetWidth: value.offsetWidth, offsetHeight: value.offsetHeight }
                : value;

            if (value && box && elementsOverlap(finalCharPos, touchBox, 5)) {
                // Pause NPC from moving if touching MC.
                if (
                    'explore-character' === value.dataset.genre &&
                    '' !== value.dataset.path &&
                    cutsceneEl
                ) {

                    npcNear(value, 'body', true);

                    if (false === value.classList.contains('passable')) {
                        if (holdNpc(value)) {
                            value.dataset.canmove = 'false';
                        } else if ('false' === value.dataset.canmove) {
                            value.dataset.canmove = 'true';
                            releaseNpc(value);
                        }
                    }

                    const cutsceneTrigger = document.getElementById(
                        cutsceneEl.id + '-t'
                    );

                    if (
                        !cutsceneTrigger &&
                        cutsceneEl &&
                        false ===
                        cutsceneEl.classList.contains('been-viewed') &&
                        'none' !== cutsceneEl.dataset.triggertype &&
                        false === value.classList.contains('engage')
                    ) {
                        const talkName = (String(cutsceneEl.className).match(/([a-z0-9-]+)-map-cutscene/) || [])[1] || '';

                        triggerIndicator(value, true, { dataset: { triggee: talkName } }, false);

                        if (indicator && indicator.dataset.cutscene === talkName) {
                            value.classList.add('engage');
                        }
                    }
                }

                if (true === value.classList.contains('communicate-trigger')) {
                    engageCommunicate(value?.dataset.triggee, value);
                }

                // Somebody keeping a shop opens it when you reach them.
                if (value.dataset?.shop && !value.dataset.shopJustClosed) {
                    openShop(Number(value.dataset.shop), value);
                }
            } else {
                // Walked away from a shopkeeper, so their shop can open again.
                if (value.dataset?.shopJustClosed) {
                    delete value.dataset.shopJustClosed;
                }

                if ('explore-character' === value.dataset?.genre) {
                    npcNear(value, 'body', false);
                }

                if ('false' === value.dataset?.canmove) {
                    // Reset NPC to allow movement.
                    value.dataset.canmove = 'true';
                    releaseNpc(value);
                }
            }

            // Somebody you have just spoken to is available again once you have actually left them.
            if (box && value.classList.contains('cutscene-trigger') && value.dataset.triggee) {
                const talkScene = document.querySelector('.' + escClass(value.dataset.triggee) + '-map-cutscene');
                const speaker = talkScene && talkScene.dataset.character
                    ? document.querySelector('.' + escClass(talkScene.dataset.character) + '-map-item')
                    : null;

                if (speaker && 'explore-character' === speaker.dataset.genre) {
                    const inTalkBox = elementsOverlap(finalCharPos, value, 0);

                    npcNear(speaker, 'talk', inTalkBox);

                    const holding = inTalkBox && holdNpc(speaker) ? 'true' : '';

                    if ((speaker.dataset.talkHold || '') !== holding) {
                        speaker.dataset.talkHold = holding;
                        releaseNpc(speaker);
                    }
                }
            }

            if (box && value.classList.contains('cutscene-trigger')) {
                const talkKey = value.id || cleanClassName(value.className);

                if (saidJustNow.has(talkKey)) {
                    if (elementsOverlap(finalCharPos, value, 0)) {
                        saidJustNowApart.delete(talkKey);
                    } else if (!saidJustNowApart.has(talkKey)) {
                        saidJustNowApart.set(talkKey, Date.now());
                    } else if (Date.now() - saidJustNowApart.get(talkKey) > 5000) {
                        saidJustNow.delete(talkKey);
                        saidJustNowApart.delete(talkKey);
                    }
                }
            }

            const actionReach = value && box && (
                'explore-sign' === value.dataset.genre ||
                'yes' === value.dataset.crafting ||
                'yes' === value.dataset.interact ||
                ('explore-area' === value.dataset.genre && 'yes' === value.dataset.interactToEnter) ||
                (true === value.classList.contains('no-point') && undefined !== value.dataset?.minigame)
            ) && elementsOverlap(value.dataset.passDepth ? feetBox(finalCharPos) : finalCharPos, value, ACTION_REACH);

            if (actionReach) {
                if (
                    'explore-sign' === value.dataset.genre &&
                    false === value.classList.contains('engage')
                ) {
                    triggerIndicator(value, false, false, false);
                    value.classList.add('engage');
                    window.allowHit = false;
                }

                if ('yes' === value.dataset.crafting && false === value.classList.contains('engage')) {
                    triggerIndicator(value, false, false, false);

                    if (indicator && indicator.dataset.sign === cleanClassName(value.className)) {
                        indicator.dataset.sign = '';
                        indicator.dataset.crafting = 'yes';
                        value.classList.add('engage');
                    }
                }

                if ('explore-area' === value.dataset.genre && 'yes' === value.dataset.interactToEnter) {
                    const fromFront = enteredFromAllowedSide(value, finalCharPos);

                    if (fromFront && false === value.classList.contains('engage')) {
                        triggerIndicator(value, false, false, false);

                        if (indicator && indicator.dataset.sign === cleanClassName(value.className)) {
                            indicator.dataset.sign = '';
                            indicator.dataset.enter = value.id;
                            value.classList.add('engage');
                        }
                    }

                    if (!fromFront && true === value.classList.contains('engage')) {
                        value.classList.remove('engage');

                        if (indicator && indicator.dataset.enter === value.id) {
                            indicator.dataset.enter = '';
                            indicator.classList.remove('engage');
                            window.allowHit = true;
                        }
                    }
                }

                if ('yes' === value.dataset.interact && false === value.classList.contains('engage')) {
                    triggerIndicator(value, false, false, false);

                    if (indicator && indicator.dataset.sign === cleanClassName(value.className)) {
                        indicator.dataset.sign = '';
                        indicator.dataset.interact = value.id;
                        value.classList.add('engage');
                    }
                }

                if (
                    true === value.classList.contains('no-point') &&
                    undefined !== value.dataset?.minigame
                ) {
                    triggerIndicator(value, false, false, true);
                    value.classList.add('engage');
                }
            }

            if (value && box && elementsOverlap(value.dataset.passDepth ? feetBox(finalCharPos) : finalCharPos, value, 0)) {
                // Check if collided point is enterable.
                if ('explore-area' === value.getAttribute('data-genre')) {
                    if ('yes' === value.dataset.interactToEnter) {
                        return;
                    }

                    if (!enteredFromAllowedSide(value, finalCharPos)) {
                        return;
                    }

                    if ('function' === typeof window.orbemMayEnter && false === window.orbemMayEnter(value)) {
                        return;
                    }

                    enterExplorePoint(value, 'false');

                    return;
                }

                // Draggable logic. A drag destination/mission is optional —
                // items can be picked up and moved freely without one.
                if (
                    'true' === value.dataset.draggable &&
                    false === value.classList.contains('dragme') &&
                    false === value.classList.contains('no-point') &&
                    !document.querySelector('.dragme') &&
                    canCharacterInteract(value, mapChar, 'strength')
                ) {
                    value.classList.add('dragme');
                }

                // If trigger. Trigger the triggee.
                if (
                    'true' === value.dataset.trigger &&
                    false === value.classList.contains('cutscene-trigger')
                ) {
                    const triggeeId = value.id?.replace(/-t$/, '');
                    const triggee = triggeeId ? document.getElementById(triggeeId) : null;

                    if (triggee && 'explore-enemy' === triggee.dataset.genre) {
                        engageEnemy(triggee, value);
                    }
                }

                // If explainer trigger. Trigger the triggee.
                if (
                    true === value.classList.contains('explainer-trigger') &&
                    false === value.classList.contains('already-hit')
                ) {
                    showExplainer(value.dataset.triggee, value);
                }

                // NPC Walking Path Trigger.
                if (
                    true === value.classList.contains('path-trigger') &&
                    false === value.classList.contains('already-hit')
                ) {
                    const triggee = document.querySelector(
                        '.' + escClass(value.getAttribute('data-triggee'))
                    );

                    // Move triggered NPC.
                    moveNPC(triggee, false, false, false);

                    value.remove();
                }

                // For collectables.
                if ('true' === value.dataset?.collectable) {
                    if (value.dataset.mission && '' !== value.dataset.mission) {
                        saveMission(value.dataset.mission, value, position);
                    }

                    // Add item to storage menu.
                    storeExploreItem(value);

                    // Reveal cutscene if item trigger.
                    revealCutscene(value);

                    // Remove cutscene if item trigger.
                    removeCutscene(value);

                    // If just points or money. store it.
                    if (
                        ('point' === value.dataset.type ||
                            'money' === value.dataset.type) &&
                        value.dataset?.value &&
                        0 < value.dataset.value &&
                        false === value.classList.contains('interacted-with')
                    ) {
                        runPointAnimation(
                            value,
                            cleanClassName(value.className),
                            false,
                            value.dataset.value,
                            '',
                        );
                    }
                }

                // Trigger mission complete if mission trigger overlapped with.
                if (true === value.classList.contains('mission-trigger')) {
                    if (value.dataset.triggee && '' !== value.dataset.triggee) {
                        saveMission(value.dataset.triggee, value, position);
                    }

                    value.remove();
                }

                const cutsceneTriggee = value.dataset.triggee;

                // Change position to triggee if cutscene trigger hit.
                position =
                    cutsceneTriggee && '' !== cutsceneTriggee
                        ? cleanClassName(cutsceneTriggee)
                        : position;

                const theCutScene =
                    cutsceneTriggee && '' !== cutsceneTriggee
                        ? document.getElementById(value.id.replace('-t', ''))
                        : document.querySelector(
                            '.' + escClass(position) + '-map-cutscene'
                        );

                // Trigger cutscene if overlapping cutscene trigger item.
                if (
                    false === value.classList.contains('engage') &&
                    theCutScene &&
                    false === theCutScene.classList.contains('been-viewed') &&
                    !saidJustNow.has(value.id || cleanClassName(value.className)) &&
                    'none' !== value.dataset.triggertype &&
                    true === value.classList.contains('cutscene-trigger')
                ) {
                    const triggerType = value.dataset.triggertype;

                    if ('engagement' !== triggerType) {
                        if (
                            value.dataset.mission &&
                            '' !== value.dataset.mission
                        ) {
                            saveMission(value.dataset.mission, value, position);
                        }

                        engageCutscene(position, false);

                        // Something you can do again — talking to somebody — keeps its trigger and is not written down as spent.
                        if ('yes' === value.dataset?.repeat) {
                            saidJustNow.add(value.id || cleanClassName(value.className));
                            saidJustNowApart.delete(value.id || cleanClassName(value.className));
                        } else {
                            // Persist trigger so it isn't triggerable again.
                            if ('' === position) {
                                saveMaterializedItem(area, [
                                    cleanClassName(value.className),
                                ]);
                            }

                            // Remove trigger.
                            value.remove();
                        }
                    } else {
                        let characterEl = '.' + escClass(theCutScene.dataset?.character) + '-map-item';

                        if (theCutScene.dataset?.character === window.mainCharacter) {
                            characterEl = '#map-character .map-character-icon.engage';
                        }
                        triggerIndicator(
                            document.querySelector(characterEl),
                            true,
                            value,
                            false
                        );

                        if (indicator && indicator.dataset.cutscene === value.dataset.triggee) {
                            value.classList.add('engage');
                        }
                    }
                }

                // Trigger item creation if you walk on this trigger.
                if (
                    true ===
                    value.classList.contains('materialize-item-trigger')
                ) {
                    clearTimeout(saveMaterializedItemTimeout);
                    const itemName = cleanClassName(value.className);

                    const itemEl = document.querySelector(
                        '.' + escClass(itemName) + '-map-item'
                    );
                    const dragDest = document.querySelector(
                        '.' + escClass(itemName) + '-drag-dest-map-item'
                    );

                    if (itemEl) {
                        itemEl.style.display = 'block';
                        if ('explore-enemy' === itemEl.dataset.genre) {
                            engageEnemy(itemEl, false);
                        }
                        materializeGravity(itemEl);
                    }

                    if (dragDest) {
                        dragDest.style.display = 'block';
                        if ('explore-enemy' === dragDest.dataset.genre) {
                            engageEnemy(dragDest, false);
                        }
                        materializeGravity(dragDest);
                    }

                    materializedItemsArray.push(itemName);

                    saveMaterializedItemTimeout = setTimeout(() => {
                        saveMaterializedItem(area, materializedItemsArray);
                    }, 1000);

                    // remove trigger.
                    value.remove();
                }

                // remove item on collision if collectable.
                if ('true' === value.dataset.collectable && 'no' !== value.dataset.disappear) {
                    value.remove();
                    itemGone(value);
                    redirectAfterInteraction(value);
                } else if ('true' === value.dataset.collectable && 'no' === value.dataset.disappear) {
                    interactWithItem(value, mapChar);
                    redirectAfterInteraction(value);
                }

                // Clear this so it doesn't set hazard to false even when I'm in it.
                clearTimeout(getOutOfHazard);

                getOutOfHazard = setTimeout(() => {
                    inHazard = false;
                    hazardItem = false;
                    hazardCounter = 0;
                    hazardGauge.classList.remove('engage');
                }, 100);
            } else if (
                !actionReach && (
                    true === value.classList.contains('engage') ||
                    true === value.classList.contains('dragme')
                )
            ) {
                value.classList.remove('engage');
                value.classList.remove('dragme');

                if (indicator) {
                    indicator.classList.remove('engage');
                    window.allowHit = true;
                }
            }

            // For breakables and other interactions.
            if (weaponEl && 'none' !== weaponEl.style.display) {
                if (elementsOverlap(weaponEl, value, 0)) {
                    // Timer trigger logic.
                    const triggeeName = cleanClassName(value.className);
                    const triggee = document.querySelector(
                        '[data-timertriggee="' + triggeeName + '"]'
                    );
                    const hasTrigger = value.dataset?.timertriggee;

                    // Timer scenario.
                    const startTimerItem =
                        document.querySelector('.start-timer');

                    if (
                        (triggee || undefined !== hasTrigger) &&
                        startTimerItem &&
                        false === value.classList.contains('start-timer')
                    ) {
                        const timerPosition =
                            'true' === startTimerItem.dataset.removable
                                ? ''
                                : [
                                    position,
                                    cleanClassName(
                                        startTimerItem.className
                                    ),
                                ];
                        saveMission(
                            value.dataset.mission,
                            value,
                            timerPosition
                        );
                        startTimerItem.style.display = 'none';
                        value.style.display = 'none';
                    } else if (triggee || undefined !== hasTrigger) {
                        value.classList.add('start-timer');

                        const triggeeTimer =
                            undefined !== hasTrigger
                                ? parseInt(value.dataset.timer)
                                : parseInt(triggee.dataset.timer);

                        if (0 < triggeeTimer) {
                            setTimeout(() => {
                                value.classList.remove('start-timer');
                            }, 1000 * triggeeTimer);

                            startTheTimer(1000 * triggeeTimer);
                        }
                    } else if (
                        ('true' === value.dataset.breakable ||
                            'true' === value.dataset.collectable) &&
                        canCharacterInteract(value, mapChar, 'strength') &&
                        null === triggee &&
                        undefined === hasTrigger
                    ) {
                        // Nothing requires a mission to be collected. Complete an
                        // attached mission only if the item belongs to one (and
                        // it is the last item for that mission).
                        if (
                            value.dataset.mission &&
                            '' !== value.dataset.mission &&
                            noOtherItemAttachedToMission(value.dataset.mission)
                        ) {
                            const multiItem = document.querySelectorAll(
                                `.map-item[data-mission="${value.dataset.mission}"]`
                            );

                            if (multiItem) {
                                position = [];

                                multiItem.forEach((theMultiItem) => {
                                    position.push(
                                        cleanClassName(theMultiItem.className)
                                    );
                                });
                            }

                            saveMission(value.dataset.mission, value, position);
                        }
                    }

                    // For breakable (and collectable weapons hit with the
                    // blade, so a struck weapon is stored before it is hidden).
                    if (
                        ('true' === value.dataset.breakable ||
                            ('explore-weapon' === value.dataset.genre &&
                                'true' === value.dataset.collectable)) &&
                        false === value.classList.contains('interacted-with') &&
                        false === value.classList.contains('no-point')
                    ) {
                        // Add item to storage menu.
                        storeExploreItem(value);

                        // If just points. store it.
                        if (
                            'point' === value.dataset.type ||
                            'money' === value.dataset.type
                        ) {
                            runPointAnimation(
                                value,
                                cleanClassName(value.className),
                                false,
                                value.dataset.value,
                                '',
                            );
                        }

                        redirectAfterInteraction(value);
                    }

                    // Don't remove item if it's a sign.
                    if (
                        true ===
                        noOtherItemAttachedToMission(
                            value.dataset.mission
                        ) &&
                        ('true' === value.dataset.breakable || 'true' === value.dataset.collectable) &&
                        'explore-sign' !== value.dataset.genre &&
                        canCharacterInteract(value, mapChar, 'strength') &&
                        (null === value.dataset.minigame ||
                            undefined === value.dataset.minigame) &&
                        (null === value.dataset.disappear ||
                            undefined === value.dataset.disappear) &&
                        'no' !== value.dataset?.disappear
                    ) {
                        value.remove();
                        itemGone(value);
                    } else if (value && 'true' !== value.dataset.clickable) {
                        interactWithItem(value, mapChar);
                    }
                }
            }
        });
    }

    // Engage/disengage walking class.
    if (d[37] || d[38] || d[39] || d[40] || d[87] || d[65] || d[68] || d[83]) {
        const goThisWay =
            true === d[$newest] ? $newest : parseInt(getKeyByValue(d, true));
        const isDragging = window.isDragging;
        let direction;
        let newCharacterImage;

        const allImages = document.querySelectorAll('.map-character-icon:not(.fight-image)');

        if (window.attackContext) {
            // An attack's display is still holding: keep the character in its
            // attack pose and re-aim the punch sprite to the direction being
            // pressed, instead of switching to a walking sprite. Turning
            // changes the attack direction until the hold ends.
            const attackKeyDirs = {
                38: 'up',
                87: 'up',
                37: 'left',
                65: 'left',
                39: 'right',
                68: 'right',
                40: 'down',
                83: 'down',
            };
            const attackDir =
                '' !== isDragging
                    ? window.draggingDirection
                    : attackKeyDirs[goThisWay];

            if (attackDir) {
                direction = attackDir;
                const weaponDir = 'up' === attackDir ? 'top' : attackDir;

                mapChar.className = '';
                mapChar.classList.add(weaponDir + '-dir');
                if (weaponEl) {
                    weaponEl.setAttribute('data-direction', weaponDir);
                }

                const punchSprite = resolvePunchSprite(
                    mapChar,
                    attackDir,
                    window.attackContext.weaponType,
                    window.attackContext.attackType
                );
                
                if (punchSprite && !punchSprite.classList.contains('engage')) {
                    mapChar
                        .querySelectorAll('.map-character-icon.engage')
                        .forEach((img) => img.classList.remove('engage'));
                    punchSprite.classList.add('engage');
                }
            }
        } else if (
            (!box || false === box.classList.contains('fight-image')) &&
            true === window.allowMovement
        ) {
            switch (goThisWay) {
                case 38:
                    weaponOverlay.style.opacity = '1';
                    direction =
                        '' !== isDragging ? window.draggingDirection : 'up';
                    newCharacterImage = getCharacterSprite(
                        window.mainCharacter + '-' + direction + isDragging
                    );
                    if (newCharacterImage && '' !== newCharacterImage.getAttribute('src')) {
                        box?.classList.remove('engage');
                        allImages.forEach((image) => {
                            image.classList.remove('engage');
                        });
                        newCharacterImage.classList.add('engage');
                    }

                    mapChar.className = '';
                    mapChar.classList.add('top-dir');

                    if (
                        newCharacterImage &&
                        newCharacterImage.id ===
                            window.mainCharacter +
                                '-' +
                                direction +
                                isDragging +
                                '-' +
                                weaponEl.dataset.weapon &&
                        weaponOverlay &&
                        '' !== weaponOverlay.src
                    ) {
                        weaponOverlay.style.opacity = '0';
                    }

                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'top');
                    }

                    if (
                        newCharacterImage &&
                        newCharacterImage.id ===
                            window.mainCharacter +
                                '-' +
                                direction +
                                isDragging +
                                '-' +
                                weaponEl.dataset.weapon &&
                        weaponOverlay &&
                        '' !== weaponOverlay.src
                    ) {
                        weaponOverlay.style.opacity = '0';
                    }
                    break;
                case 37:
                    weaponOverlay.style.opacity = '1';
                    direction =
                        '' !== isDragging ? window.draggingDirection : 'left';
                    newCharacterImage = getCharacterSprite(
                        window.mainCharacter + '-' + direction + isDragging
                    );
                    if (
                        newCharacterImage &&
                        '' !== newCharacterImage.getAttribute('src')
                    ) {
                        box?.classList.remove('engage');
                        allImages.forEach((image) => {
                            image.classList.remove('engage');
                        });
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('left-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'left');
                    }

                    if (
                        newCharacterImage &&
                        newCharacterImage.id ===
                            window.mainCharacter +
                                '-' +
                                direction +
                                isDragging +
                                '-' +
                                weaponEl.dataset.weapon &&
                        weaponOverlay &&
                        '' !== weaponOverlay.src
                    ) {
                        weaponOverlay.style.opacity = '0';
                    }
                    break;
                case 39:
                    weaponOverlay.style.opacity = '1';
                    direction =
                        '' !== isDragging ? window.draggingDirection : 'right';
                    newCharacterImage = getCharacterSprite(
                        window.mainCharacter + '-' + direction + isDragging
                    );
                    if (newCharacterImage && '' !== newCharacterImage.getAttribute('src')) {
                        box?.classList.remove('engage');
                        allImages.forEach((image) => {
                            image.classList.remove('engage');
                        });
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('right-dir');

                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'right');
                    }

                    if (
                        newCharacterImage &&
                        newCharacterImage.id ===
                            window.mainCharacter +
                                '-' +
                                direction +
                                isDragging +
                                '-' +
                                weaponEl.dataset.weapon &&
                        weaponOverlay &&
                        '' !== weaponOverlay.src
                    ) {
                        weaponOverlay.style.opacity = '0';
                    }

                    break;
                case 40:
                    weaponOverlay.style.opacity = '1';
                    direction =
                        '' !== isDragging ? window.draggingDirection : 'down';
                    newCharacterImage = getCharacterSprite(
                        window.mainCharacter + '-' + direction + isDragging
                    );
                    if (newCharacterImage && '' !== newCharacterImage.getAttribute('src')) {
                        box?.classList.remove('engage');
                        allImages.forEach((image) => {
                            image.classList.remove('engage');
                        });
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('down-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'down');
                    }

                    if (
                        newCharacterImage &&
                        newCharacterImage.id ===
                            window.mainCharacter +
                                '-' +
                                direction +
                                isDragging +
                                '-' +
                                weaponEl.dataset.weapon &&
                        weaponOverlay &&
                        '' !== weaponOverlay.src
                    ) {
                        weaponOverlay.style.opacity = '0';
                    }
                    break;
                case 87:
                    weaponOverlay.style.opacity = '1';
                    direction =
                        '' !== isDragging ? window.draggingDirection : 'up';
                    newCharacterImage = getCharacterSprite(
                        window.mainCharacter + '-' + direction + isDragging
                    );
                    if (newCharacterImage && '' !== newCharacterImage.getAttribute('src')) {
                        box?.classList.remove('engage');
                        allImages.forEach((image) => {
                            image.classList.remove('engage');
                        });
                        newCharacterImage.classList.add('engage');
                    }

                    mapChar.className = '';
                    mapChar.classList.add('top-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'top');
                    }

                    if (
                        newCharacterImage &&
                        newCharacterImage.id ===
                            window.mainCharacter +
                                '-' +
                                direction +
                                isDragging +
                                '-' +
                                weaponEl.dataset.weapon &&
                        weaponOverlay &&
                        '' !== weaponOverlay.src
                    ) {
                        weaponOverlay.style.opacity = '0';
                    }
                    break;
                case 65:
                    weaponOverlay.style.opacity = '1';
                    direction =
                        '' !== isDragging ? window.draggingDirection : 'left';
                    newCharacterImage = getCharacterSprite(
                        window.mainCharacter + '-' + direction + isDragging
                    );
                    if (newCharacterImage && '' !== newCharacterImage.getAttribute('src')) {
                        box?.classList.remove('engage');
                        allImages.forEach((image) => {
                            image.classList.remove('engage');
                        });
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('left-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'left');
                    }

                    if (
                        newCharacterImage &&
                        newCharacterImage.id ===
                            window.mainCharacter +
                                '-' +
                                direction +
                                isDragging +
                                '-' +
                                weaponEl.dataset.weapon &&
                        weaponOverlay &&
                        '' !== weaponOverlay.src
                    ) {
                        weaponOverlay.style.opacity = '0';
                    }
                    break;
                case 68:
                    weaponOverlay.style.opacity = '1';
                    direction =
                        '' !== isDragging ? window.draggingDirection : 'right';
                    newCharacterImage = getCharacterSprite(
                        window.mainCharacter + '-' + direction + isDragging
                    );
                    if (newCharacterImage && '' !== newCharacterImage.getAttribute('src')) {
                        box?.classList.remove('engage');
                        allImages.forEach((image) => {
                            image.classList.remove('engage');
                        });
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('right-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'right');
                    }
                    if (
                        newCharacterImage &&
                        newCharacterImage.id ===
                            window.mainCharacter +
                                '-' +
                                direction +
                                isDragging +
                                '-' +
                                weaponEl.dataset.weapon &&
                        weaponOverlay &&
                        '' !== weaponOverlay.src
                    ) {
                        weaponOverlay.style.opacity = '0';
                    }
                    break;
                case 83:
                    weaponOverlay.style.opacity = '1';
                    direction =
                        '' !== isDragging ? window.draggingDirection : 'down';
                    newCharacterImage = getCharacterSprite(
                        window.mainCharacter + '-' + direction + isDragging
                    );
                    if (newCharacterImage && '' !== newCharacterImage.getAttribute('src')) {
                        box?.classList.remove('engage');
                        allImages.forEach((image) => {
                            image.classList.remove('engage');
                        });
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('down-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'down');
                    }

                    if (
                        newCharacterImage &&
                        newCharacterImage.id ===
                            window.mainCharacter +
                                '-' +
                                direction +
                                isDragging +
                                '-' +
                                weaponEl.dataset.weapon &&
                        weaponOverlay &&
                        '' !== weaponOverlay.src
                    ) {
                        weaponOverlay.style.opacity = '0';
                    }
                    break;
            }
        }

        playWalkSound();

        window.amwalking = true;
    } else {
        if (window.amwalking) {
            stopWalkSound();
        }
    }

    const w = pane.offsetWidth - box.offsetWidth;
    const n = parseInt(v, 10) - (d[a] ? x : 0) + (d[b] ? x : 0);

    return n < 0 ? 0 : n > w ? w : n;

    function getKeyByValue(array, value) {
        for (const key in array) {
            if (array.hasOwnProperty(key) && array[key] === value) {
                return key;
            }
        }
        // If value is not found, you can return null or any other indicator
        return null;
    }
}

/**
 * Move character if they're in a hazard or other element pushing.
 * @param distanceMult
 * @param pushElement
 * @param pushee
 */
function pushCharacter(distanceMult, pushElement, pushee) {
    'use strict';

    // Push user away from hazard center.
    let targetX = parseInt(pushee.style.left.replace('px', ''));
    let targetY = parseInt(pushee.style.top.replace('px', ''));

    if (pushElement) {
        const enemyLeft = parseInt(pushElement.style.left.replace('px'));
        const enemyTop = parseInt(pushElement.style.top.replace('px'));

        targetX =
            targetX + window.globalLeftPositionOffset < enemyLeft
                ? targetX - distanceMult
                : targetX + distanceMult;
        targetY =
            targetY + window.globalTopPositionOffset < enemyTop
                ? targetY - distanceMult
                : targetY + distanceMult;

        pushee.style.left = targetX + 'px';
        pushee.style.top = targetY + 'px';
    }
}

/**
 * Check if there are any other items that trigger the same mission.
 * @param  mission
 * @return {boolean}
 */
function noOtherItemAttachedToMission(mission) {
    'use strict';

    const itemMissions = document.querySelectorAll(
        `.map-item[data-mission="${mission}"]`
    );
    const enemyItems = document.querySelectorAll(
        `.enemy-item[data-mission="${mission}"]`
    );

    return 1 >= itemMissions.length && 0 === enemyItems.length;
}

/**
 * Is the provided item able to be interacted with by character.
 * @param  item
 * @param  character
 * @param  type
 * @return {boolean}
 */
function canCharacterInteract(item, character, type) {
    'use strict';

    if (type === 'strength') {
        return (
            ('yes' === item.dataset.isstrong &&
                'strength' === character.dataset.ability) ||
            undefined === item.dataset.isstrong ||
            'no' === item.dataset.isstrong
        );
    }

    return type === character.dataset.ability;
}

/**
 * Drag item
 */

/**
 * When user hits an item with weapon
 * @param item
 */
/**
 * Redirect the browser to an item's explore-redirect-path after it has been
 * interacted with. Guards against firing more than once per item since some
 * interaction types (hazard overlap, non-disappearing collectables) re-run
 * their handler on every tick while the player keeps overlapping the item.
 */
function redirectAfterInteraction(item) {
    'use strict';

    const redirectPath = item?.dataset?.redirectPath;

    if (!redirectPath || 'true' === item.dataset.redirected) {
        return;
    }

    item.dataset.redirected = 'true';

    setTimeout(() => {
        window.location.href = redirectPath;
    }, 1000);
}

function interactWithItem(item) {
    'use strict';

    // If item is breakable.
    if (
        'no' !== item.dataset?.disappear &&
        ('true' === item.dataset.breakable || 'true' === item.dataset.collectable || 'true' === item.dataset.clickable) &&
        'explore-sign' !== item.dataset.genre
    ) {
        item.style.display = 'none';
        itemGone(item);
    }

    // If disappear set to false change image.
    if ('no' === item.dataset?.disappear) {
        swapInteractedImage(item);
    }

    // Reveal items waiting for this item to be interacted with.
    const itemName = cleanClassName(item.className);
    if (itemName) {
        const revealItems = document.querySelectorAll('[data-showafteritem="' + itemName + '"]');
        if (revealItems.length) {
            const materializedItemsArray = [];
            revealItems.forEach((showItem) => {
                showItem.classList.add('materialized');
                materializedItemsArray.push(cleanClassName(showItem.className));
                if ('explore-enemy' === showItem.dataset.genre) {
                    engageEnemy(showItem, false);
                }
                materializeGravity(showItem);
            });
            saveMaterializedItem(currentLocation, materializedItemsArray);
        }
    }
}

/**
 * Swatch alt image for interacted items like breakables that don't disappear.
 * @param item
 */
function swapInteractedImage(item) {
    'use strict';

    const altImage = item.dataset?.interacted;

    if (altImage && '' !== altImage) {
        item.style.background = `url(${altImage}) no-repeat`;
        item.style.backgroundSize = 'cover';

        if ('true' === item.dataset.passable) {
            item.classList.add('passable');
        }

        item.classList.add('interacted-with');
    }
}

function cycleInteractedImages() {
    'use strict';

    document.querySelectorAll('.default-map [data-interacted-every]').forEach((item) => {
        const every = parseInt(item.dataset.interactedEvery, 10) || 0;
        const hold = parseInt(item.dataset.interactedHold, 10) || every;

        if (0 >= every || 'yes' === item.dataset.interactedCycling) {
            return;
        }

        item.dataset.interactedCycling = 'yes';

        const stopped = () => !item.isConnected || item.classList.contains('interacted-with');

        const swap = () => {
            if (stopped()) {
                delete item.dataset.interactedCycling;
                return;
            }

            const background = item.style.background;
            const backgroundSize = item.style.backgroundSize;

            item.style.background = `url(${item.dataset.interacted}) no-repeat`;
            item.style.backgroundSize = 'cover';

            setTimeout(() => {
                if (!item.classList.contains('interacted-with')) {
                    item.style.background = background;
                    item.style.backgroundSize = backgroundSize;
                }

                setTimeout(swap, every);
            }, hold);
        };

        setTimeout(swap, every);
    });
}

function saveMaterializedItem(area, materializedItemsArray) {
    'use strict';

    if (false === isLoggedIn) {
        return;
    }

    const jsonString = {
        area,
        item: materializedItemsArray,
    };
    // Save position of item.
    fetch(`${OrbemOrder.siteRESTURL}/save-materialized-item/`, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce,
        },
        body: JSON.stringify(jsonString), // The JSON stringified payload
    }).then((response) => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error(
                'Network response was not ok ' + response.statusText
            );
        }
    });
}

function enableAbility(ability) {
    'use strict';

    if (false === isLoggedIn) {
        return;
    }

    const jsonString = {
        slug: ability,
    };

    // Save position of item.
    fetch(`${OrbemOrder.siteRESTURL}/enable-ability/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': OrbemOrder.orbemNonce,
        },
        body: JSON.stringify(jsonString),
    }).then((response) => {
        if (!response.ok) {
            throw new Error(
                'Network response was not ok ' + response.statusText
            );
        }
    });
}

/**
 * Trigger indicator.
 * @param indicateMe
 * @param isCutscene
 * @param trigger
 * @param isMinigame
 */
function triggerIndicator(indicateMe, isCutscene, trigger, isMinigame) {
    'use strict';

    window.allowHit = false;
    const indicator = document.querySelector('.indicator-icon');

    if (
        window.allowIndicate &&
        indicateMe &&
        indicator &&
        false === indicator.classList.contains('engage')
    ) {
        let leftPosition = indicateMe.style.left.replace('px', '');
        let topPosition = indicateMe.style.top.replace('px', '');
        if (true === indicateMe.classList.contains('map-character-icon')) {
            topPosition = (parseInt(indicateMe.parentElement.style.top.replace('px', '')) + window.globalTopPositionOffset) - (indicateMe.offsetHeight / 2);
            leftPosition = (parseInt(indicateMe.parentElement.style.left.replace('px', '')) + window.globalLeftPositionOffset) - (indicateMe.offsetWidth / 2);
        }

        const width = indicateMe.offsetWidth / 2 - (indicator.offsetWidth || 15) / 2;
        const positionName = cleanClassName(indicateMe.className);

        if (indicator) {
            indicator.classList.add('engage');
            indicator.style.left = width + parseInt(leftPosition) + 'px';
            indicator.style.top = parseInt(topPosition) - Math.round(25 / (window.areaScale || 1)) + 'px';

            indicator.dataset.crafting = '';
            indicator.dataset.interact = '';
            indicator.dataset.enter = '';

            if (true === isCutscene) {
                indicator.dataset.sign = '';
                indicator.dataset.minigame = '';
                indicator.dataset.cutscene = trigger.dataset.triggee;
            }

            if (false === isCutscene) {
                indicator.dataset.cutscene = '';
                indicator.dataset.minigame = '';
                indicator.dataset.sign = positionName;
            }

            if (true === isMinigame) {
                indicator.dataset.cutscene = '';
                indicator.dataset.sign = '';
                indicator.dataset.minigame = indicateMe.dataset.minigame;
            }
        }
    }
}

/**
 * Add item to storage menu.
 *
 * @param item
 */
/**
 * Drop the currently held (auto-equipped) weapon back onto the map at the
 * player's feet so it can be picked up again. Used when weapons can't be
 * managed in storage and a newly collected weapon replaces the one in hand.
 */
function dropEquippedWeaponOnMap() {
    'use strict';

    const clone = window.autoEquippedWeaponClone;
    const defaultMap = document.querySelector('.default-map');
    const mapChar = document.querySelector('#map-character');

    if (!clone || !defaultMap || !mapChar) {
        return;
    }

    const cloneWidth = parseInt(clone.dataset.width, 10) || 50;
    const cloneHeight = parseInt(clone.dataset.height, 10) || 50;

    // Drop the weapon behind the player (opposite the way they're facing) and
    // a good distance off, so they don't accidentally walk back onto it.
    const dropDistance = 180;
    const weaponEl = document.querySelector('.map-weapon');
    const facing = (weaponEl && weaponEl.dataset.direction) || 'down';
    let offsetX = 0;
    let offsetY = dropDistance;

    if ('top' === facing) {
        offsetY = dropDistance;
    } else if ('down' === facing) {
        offsetY = -dropDistance;
    } else if ('left' === facing) {
        offsetX = dropDistance;
        offsetY = 0;
    } else if ('right' === facing) {
        offsetX = -dropDistance;
        offsetY = 0;
    }

    const charLeft =
        (parseInt(mapChar.style.left, 10) || 0) +
        window.globalLeftPositionOffset;
    const charTop =
        (parseInt(mapChar.style.top, 10) || 0) +
        window.globalTopPositionOffset;

    clone.style.left = charLeft + offsetX - cloneWidth / 2 + 'px';
    clone.style.top = charTop + offsetY - cloneHeight / 2 + 'px';
    clone.style.display = 'block';

    // Don't let the player instantly re-collect the weapon they're standing on.
    clone.dataset.dropCooldown = 'true';

    defaultMap.appendChild(clone);

    window.autoEquippedWeaponClone = null;
}

function storeExploreItem(item) {
    'use strict';

    const type = item.dataset.type
    const value = item.dataset.value
    const id = item.id;
    // An item can name the storage entry it belongs to.
    const name = item.dataset.storeAs || cleanClassName(item.className);
    const menuItem = document.createElement('span');
    const menuType = getMenuType(type);
    const menu = document.querySelector(
        '.storage-menu[data-menu="' + menuType + '"]'
    );
    const thePoints = document.querySelector(`#explore-points .${type}-amount`);
    let currentPoints = 100;

    if (thePoints) {
        currentPoints = thePoints ? thePoints.getAttribute('data-amount') : 0;
    }

    // Something with a storage entry of its own always goes to storage, rather than being used up the moment it is walked into.
    if (
        'gear' !== type &&
        !item.dataset.storeAs &&
        true === isPointItemType(type) &&
        barMax(type) > currentPoints
    ) {
        runPointAnimation(item, name, false, (parseInt(currentPoints) + parseInt(value)), '' )

        return;
    }

    if (!['point', 'money'].includes(type) || item.dataset.storeAs) {
        showGain({
            label: item.dataset.title || name.replace(/-/g, ' '),
            amount: 1,
            image: item.dataset.image || '',
            kind: type || 'items',
        });
    }

    // Add menu attributes.
    menuItem.setAttribute('data-type', type);
    menuItem.setAttribute('data-id', id);
    menuItem.setAttribute('data-value', value);
    menuItem.setAttribute('title', name);
    menuItem.setAttribute('data-empty', 'false');

    // Item image.
    if ('gear' === type || 'weapons' === type) {
        // Assign width/height on collect.
        const itemStyle = getComputedStyle(item);
        menuItem.setAttribute('data-width', itemStyle.width.replace('px', ''));
        menuItem.setAttribute(
            'data-height',
            itemStyle.height.replace('px', '')
        );
        menuItem.setAttribute('data-strength', item.dataset.strength);

        // Carry the weapon overlay data from the map collectible so a weapon
        // equipped in the same session (before the next page load re-renders
        // storage from post meta) still shows/animates its held image.
        if ('weapons' === type) {
            menuItem.setAttribute(
                'data-projectile',
                item.dataset.projectile || 'no'
            );
            menuItem.setAttribute(
                'data-visibility',
                item.dataset.visibility || 'attack'
            );
            menuItem.setAttribute('data-motion', item.dataset.motion || 'swing');
            menuItem.setAttribute('data-facing', item.dataset.facing || '');
            menuItem.setAttribute(
                'data-resting',
                item.dataset.resting || 'in-hand'
            );
            menuItem.setAttribute('data-range', item.dataset.range || '0');
            menuItem.setAttribute(
                'data-vertical-offset',
                item.dataset.verticalOffset || '0'
            );
            menuItem.setAttribute(
                'data-held-width',
                item.dataset.heldWidth || ''
            );
            menuItem.setAttribute(
                'data-held-height',
                item.dataset.heldHeight || ''
            );
            menuItem.setAttribute(
                'data-held-image',
                item.dataset.heldImage || item.dataset.image || ''
            );
            menuItem.setAttribute(
                'data-projectile-image',
                item.dataset.projectileImage || ''
            );
            menuItem.setAttribute(
                'data-projectile-width',
                item.dataset.projectileWidth || ''
            );
            menuItem.setAttribute(
                'data-projectile-height',
                item.dataset.projectileHeight || ''
            );
            menuItem.setAttribute(
                'data-projectile-facing',
                item.dataset.projectileFacing || ''
            );
            menuItem.setAttribute('data-ammo-cost', item.dataset.ammoCost || '0');
            menuItem.setAttribute('data-sound', item.dataset.sound || '');
            menuItem.setAttribute('data-light', item.dataset.light || '0');
        }

        const itemImage = document.createElement('img');

        itemImage.setAttribute('src', item.dataset.image);
        itemImage.setAttribute('width', '80px');
        itemImage.style.objectFit = 'contain';
        menuItem.append(itemImage);
    } else if (item.dataset.image) {
        // Items show what they are too, not an empty-looking slot.
        const itemImage = document.createElement('img');

        itemImage.setAttribute('src', item.dataset.image);
        itemImage.setAttribute('alt', name);
        itemImage.setAttribute('width', '30px');
        itemImage.setAttribute('height', '30px');
        itemImage.style.objectFit = 'contain';
        menuItem.append(itemImage);
    }
    menuItem.className = 'storage-item';

    // If a weapon is collected but there's no way to manage weapons in storage
    // (the weapons tab is disabled, or the storage menu is hidden entirely),
    // equip it immediately. Only one non-default weapon can be held this way,
    // so equipping the new one replaces (drops) any weapon already equipped.
    if ('weapons' === type && !menu && levelNeeded(id)) {
        playSfx('explore_sfx_denied');
        showGain({ label: 'Reach level ' + levelNeeded(id) + ' to use this', amount: 0, kind: 'level' });
        return;
    }

    if ('weapons' === type && !menu) {
        // Drop whatever weapon is currently held back onto the map before
        // equipping the new one (only one weapon can be carried this way).
        dropEquippedWeaponOnMap();

        applyWeaponToPlayer(menuItem);
        equipNewItem('weapons', id, value, false, name);

        // Remember this weapon's collectable so it can be dropped when a
        // later pick-up replaces it.
        const droppable = item.cloneNode(true);
        const droppableStyle = getComputedStyle(item);

        droppable.dataset.width = droppableStyle.width.replace('px', '');
        droppable.dataset.height = droppableStyle.height.replace('px', '');
        droppable.classList.remove(
            'engage',
            'dragme',
            'interacted-with',
            'already-hit'
        );
        delete droppable.dataset.dropCooldown;
        delete droppable.dataset.mission;

        window.autoEquippedWeaponClone = droppable;

        return;
    }

    // Add to menu.
    if (menu) {
        const emptyStorageItem = menu.querySelector(
            '.storage-item[data-empty="true"]'
        );
        const nonEmptyStorageItems = menu.querySelectorAll(
            '.storage-item[data-empty="false"]'
        );
        let isNewItem = true;

        // If empty slot exists then add new item to menu.
        if (emptyStorageItem) {
            emptyStorageItem.remove();

            // Check if item already exists and iterate if does. Add a number to it.
            if (nonEmptyStorageItems) {
                nonEmptyStorageItems.forEach((nonEmptyStorageItem) => {
                    const menuItemName =
                        nonEmptyStorageItem.getAttribute('title');

                    // If name is same, add count to item.
                    if (menuItemName === name) {
                        let currentCount =
                            nonEmptyStorageItem.getAttribute('data-count');

                        currentCount =
                            null !== currentCount
                                ? parseInt(currentCount) + 1
                                : 2;
                        nonEmptyStorageItem.setAttribute(
                            'data-count',
                            currentCount
                        );
                        isNewItem = false;
                    }
                });
            }

            if (true === isNewItem) {
                menu.prepend(menuItem);
                menuItem.addEventListener('click', () => {
                    if ('true' !== menuItem.dataset.empty) {
                        playSfx('explore_sfx_select');
                        showItemDescription(menuItem);
                    }
                });
            }

            // Add item to database.
            saveStorageItem(id, name, type, value, false);
        }
    }
}

function setPreviousCutsceneArea(cutsceneName) {
    'use strict';

    if (false === isLoggedIn) {
        localStorage.setItem('orbem_local_previousCutsceneArea', cutsceneName);
        return;
    }

    const jsonString = {
        cutscene: cutsceneName,
    };

    // Set the cutscene area previously viewed.
    fetch(`${OrbemOrder.siteRESTURL}/set-previous-cutscene-area/`, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce,
        },
        body: JSON.stringify(jsonString), // The JSON stringified payload
    }).then((response) => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error(
                'Network response was not ok ' + response.statusText
            );
        }
    });
}

/**
 * cut scene logic
 * @param position
 * @param areaCutscene
 */
/** Walking a conversation that forks. */
const DIALOGUE_PATH = 'orbem-dialogue-path';
const DIALOGUE_LINE = 'wp-block-orbem-paragraph-mp3';
const CONVERSATION = 'orbem-conversation';

/**
 * Which of a character's conversations to have this time.
 *
 * @param {Element} cutscene
 * @return {Element} The conversation to play, which may be the cutscene.
 */
function pickConversation(cutscene) {
    const all = [...cutscene.querySelectorAll('.' + CONVERSATION)]
        .filter(el => !el.parentElement.closest('.' + CONVERSATION));

    if (!all.length) {
        return cutscene;
    }

    const key = 'orbem-said-' + (cutscene.id || cleanClassName(cutscene.className));
    let next = 0;

    try {
        next = (parseInt(window.localStorage.getItem(key), 10) || 0) % all.length;
        window.localStorage.setItem(key, String((next + 1) % all.length));
    } catch (e) {
        // Private window, blocked storage, a browser having a bad day.
        next = 0;
    }

    all.forEach((el, index) => {
        el.classList.toggle('is-saying', index === next);
    });

    return all[next];
}

/** Whether a line belongs to a branch rather than to the conversation itself. */
function isBranchLine(el) {
    return !!el.closest('.' + DIALOGUE_PATH);
}

function isDialoguePath(el) {
    return !!el && !!el.classList && el.classList.contains(DIALOGUE_PATH);
}

/** Whether an element is a line of the conversation. */
function isDialogueLine(el) {
    return !!el && ('P' === el.tagName || (!!el.classList && el.classList.contains(DIALOGUE_LINE)));
}

/** The line a path opens with, which is the choice the player is shown. */
function dialogueOffer(path) {
    return path ? [...path.children].find(isDialogueLine) || null : null;
}

/** Every branch offered at this point: the run of paths standing together. */
function dialogueChoicesAt(el) {
    const paths = [];
    let node = el;

    while (isDialoguePath(node)) {
        paths.push(node);
        node = node.nextElementSibling;
    }

    return paths;
}

/** What comes after a line, climbing out of any branch it finishes. */
function afterDialogue(current, root) {
    let node = current;

    while (node && node !== root) {
        let next = node.nextElementSibling;

        if (isDialoguePath(node)) {
            while (isDialoguePath(next)) {
                next = next.nextElementSibling;
            }
        }

        // Step over anything that is not part of the conversation.
        while (next && !isDialogueLine(next) && !isDialoguePath(next)) {
            next = next.nextElementSibling;
        }

        if (next) {
            return next;
        }

        node = node.parentElement;
    }

    return null;
}

function playCutscene(position, areaCutscene) {
    'use strict';

    if (false === position && false === areaCutscene) {
        return;
    }

    const cutscene =
        undefined === position?.className
            ? document.querySelector('.' + escClass(position) + '-map-cutscene')
            : position;
    position =
        undefined === position?.className
            ? position
            : cleanClassName(position.className);

    if (
        cutscene &&
        (undefined === cutscene.dataset?.video ||
            'false' === cutscene.dataset?.video)
    ) {
        // One of the things this character might say, and the only part of the cutscene anything below should look at.
        const said = pickConversation(cutscene);

        const dialogues = said.querySelectorAll(
            'p, .wp-block-orbem-paragraph-mp3'
        );
        const mc = document.getElementById('map-character');
        const character = cleanClassName(
            cutscene.querySelector(
                '.wp-block-orbem-paragraph-mp3:not(.explore-character-' +
                mc?.dataset?.mainid +
                ')'
            )?.className
        );
        const npc = document.getElementById(character);

        if (false === cutscene.classList.contains('been-viewed')) {
            // Stop movement.
            window.allowMovement = false;
            window.allowHit = false;

            if (npc) {
                setTimeout(() => {
                    centerCamera(npc, {
                        behavior: 'smooth',
                        block: 'nearest',
                    });
                }, 500);

                npc.dataset.cutscenebreak = 'true';
            }

            cutscene.classList.add('engage');

            // start music if exists.
            if (cutscene.dataset.music && '' !== cutscene.dataset.music) {
                playSong(cutscene.dataset.music, position);
            }

            // Mute current if mute is flagged.
            if ('yes' === cutscene.dataset?.mutemusic && window.currentMusic) {
                window.currentMusic.pause();
            }

            // Stop walk sound during cutscene.
            resetWalkSound();

            // Engage this conversation's opening line.
            cutscene
                .querySelectorAll('.wp-block-orbem-paragraph-mp3.engage')
                .forEach((line) => line.classList.remove('engage'));

            const opener = [...dialogues].find(
                (line) =>
                    line.classList
                    && line.classList.contains('wp-block-orbem-paragraph-mp3')
                    && !isBranchLine(line)
            ) || dialogues[0];

            if (opener && opener.classList) {
                opener.classList.add('engage');
            }

            let textContainer = opener;

            // on load.
            if (
                opener &&
                opener.classList &&
                opener.classList.contains('wp-block-orbem-paragraph-mp3')
            ) {
                textContainer = opener.querySelector('p');
            }

            const text = textContainer.innerText;
            textContainer.innerText = '';

            let wordCount = 0;

            const typeWriter = (element, text, i) => {
                clearTimeout(typeWriterTimeout);

                if (i < text.length) {
                    element.innerHTML += text.charAt(i);
                    i++;
                    typeWriterTimeout = setTimeout(function () {
                        wordCount++;

                        const regex = /^[a-zA-Z]+$/;

                        if (false === regex.test(text.charAt(i))) {
                            wordCount = 0;
                        }

                        typeWriter(element, text, i);
                    }, 50); // Adjust the delay here
                } else {
                    window.nextDialogueTimeout = setInterval(() => {

                        if (true === window.nextDialogue) {
                            nextDialogue();

                            clearInterval(window.nextDialogueTimeout);
                            window.nextDialogue = false;
                        }
                    }, 500);
                }
            };

            typeWriter(textContainer, text, 0);

            /** Say one line, whichever branch it is in. */
            const engageLine = (line) => {
                line.classList.add('engage');

                let providedAudio = line.querySelector('audio');
                providedAudio = providedAudio ?? false;

                // A bare <p> is its own text; a dialogue block holds one.
                const nextP = line.querySelector('p') || line;
                const text = nextP.innerText;

                nextP.innerText = '';
                typeWriter(nextP, text, 0);

                moveDialogueBox();
                makeTalk(text, line.dataset.voice, providedAudio, false);
            };

            /** Offer the branches and wait. */
            const showChoices = (paths) => {
                clearInterval(window.nextDialogueTimeout);
                clearTimeout(typeWriterTimeout);

                // These are the player's own words, so whoever was speaking stops being on screen.
                cutscene.querySelectorAll('.cut-character.engage, .character-name.engage')
                    .forEach((el) => el.classList.remove('engage'));

                const list = document.createElement('div');
                list.className = 'orbem-dialogue-choices';

                // No name and no portrait over the player's own options.

                paths.forEach((path) => {
                    const offer = dialogueOffer(path);

                    if (!offer) {
                        return;
                    }

                    const option = document.createElement('button');
                    option.type = 'button';
                    option.className = 'orbem-dialogue-choice';
                    option.textContent = (offer.querySelector('p') || offer).innerText;

                    option.addEventListener('click', (event) => {
                        // The cutscene listens for clicks to move on, and this click is an answer rather than a nudge.
                        event.stopPropagation();
                        playSfx('explore_sfx_select');

                        list.remove();

                        // The chosen line is not played back.
                        offer.classList.add('engage');
                        nextDialogue();
                    });

                    list.appendChild(option);
                });

                // Nothing to offer — every branch was empty.
                if (!list.children.length) {
                    const past = afterDialogue(paths[paths.length - 1], cutscene);

                    if (past) {
                        engageLine(past);
                    }

                    return;
                }

                cutscene.appendChild(list);
            };

            const nextDialogue = () => {
                // A question is on screen. Pressing on does not answer it.
                if (cutscene.querySelector('.orbem-dialogue-choices')) {
                    return;
                }

                playSfx('explore_sfx_dialogue');

                if ('' !== source) {
                    source.stop();
                }

                if ('' !== talkAudio) {
                    talkAudio.pause();
                    talkAudio.currentTime = 0;
                }

                // Clear timeout incase manually triggered.
                clearInterval(window.nextDialogueTimeout);

                const currentDialogue = cutscene.querySelector(
                    'p.engage, .wp-block-orbem-paragraph-mp3.engage'
                );
                const nextDialogue = afterDialogue(currentDialogue, said);

                dialogues.forEach((dialogue) => {
                    dialogue.classList.remove('engage');
                });

                // A branch, or several standing together: ask rather than play.
                if (isDialoguePath(nextDialogue)) {
                    showChoices(dialogueChoicesAt(nextDialogue));

                    return;
                }

                if (nextDialogue) {
                    engageLine(nextDialogue);
                } else {
                    clearTimeout(typeWriterTimeout);
                    clearInterval(window.nextDialogueTimeout);

                    // At end of dialogue. Close cutscene and make walking available.
                    cutscene.classList.remove('engage');

                    // Something you can do again is not finished with just because it finished.
                    if ('yes' === cutscene.dataset?.repeat) {
                        cutscene.classList.remove('been-viewed');
                    }
                    cutscene.removeEventListener('click', cutsceneKeys);
                    document.removeEventListener('keydown', cutsceneKeys);

                    // If not area cutscene reset MC cutscene character.
                    if (
                        'yes' !==
                        document.querySelector('.default-map').dataset
                            .iscutscene
                    ) {
                        const mapMainCharacter =
                            document.getElementById('map-character');

                        if (mapMainCharacter) {
                            const mainCharacterDialogue = document
                                .querySelector(
                                    'div[data-character="' +
                                    mapMainCharacter.dataset?.mainid +
                                    '"].cut-character'
                                );

                            if ( mainCharacterDialogue ) {
                                mainCharacterDialogue.classList.remove('engage');
                            }
                        }
                    }

                    // Reengage movement.
                    window.allowMovement = true;

                    // reset dialogue.
                    cutscene.querySelector('.orbem-dialogue-choices')?.remove();

                    if (opener && opener.classList) {
                        opener.classList.add('engage');
                    }

                    // After cutscene.
                    afterCutscene(cutscene, areaCutscene, character);

                    // If cutscene area remove stuff.
                    cutscene.style.removeProperty('position');
                    cutscene.style.removeProperty('display');
                    cutscene.style.removeProperty('width');
                    cutscene.style.removeProperty('max-height');
                    cutscene.style.removeProperty('height');
                    cutscene.style.removeProperty('transform');
                    cutscene.style.removeProperty('left');
                    cutscene.style.removeProperty('top');
                }
            };

            /**
             * Handles key events during a cutscene, allowing progression through dialogue and ending the cutscene.
             * @param {KeyboardEvent} event - The keyboard event object.
             */
            const cutsceneKeys = (event) => {
                if (true === window.allowCutscene) {
                    if (
                        (event.code === 'Space' || event.target.classList.contains('action-key') || event.target.classList.contains('wp-block-orbem-paragraph-mp3') || event.target.parentElement.classList.contains('wp-block-orbem-paragraph-mp3')) &&
                        dialogues &&
                        cutscene.classList.contains('engage')
                    ) {
                        nextDialogue();
                    }
                }
            };

            cutscene.classList.add('been-viewed');

            // Set allow by default.
            window.allowCutscene = true;

            const moveDialogueBox = (firstText = '') => {
                const currentDialogue = cutscene.querySelector(
                    '.wp-block-orbem-paragraph-mp3.engage'
                );
                let providedAudio = currentDialogue.querySelector('audio');
                providedAudio = providedAudio ?? false;
                const dialogueChar = cleanClassName(currentDialogue.className);
                const currentDialogueChar =
                    mc.dataset?.mainid !== dialogueChar
                        ? document.getElementById(dialogueChar)
                        : mc;
                const voice = currentDialogue.dataset.voice;
                const pathTrigger = currentDialogue.dataset?.triggerpath;
                let theCharacterEl = document.getElementById(dialogueChar);
                const theCharacterImage = cutscene.querySelector(
                    '.cut-character[data-character="' + dialogueChar + '"]'
                );
                const theCharacterName = cutscene.querySelector(
                    '.character-name[data-character="' + dialogueChar + '"]'
                );

                if (mc) {
                    theCharacterEl =
                        mc.dataset.mainid === dialogueChar
                            ? mc
                            : theCharacterEl;
                }

                // Move dialogue box to talker.
                if (true === areaCutscene) {
                    if (currentDialogueChar && cutscene) {
                        let currentDialogueCharLeft =
                            parseInt(
                                currentDialogueChar.style.left.replace('px', '')
                            ) -
                            cutscene.offsetWidth / 2;
                        const currentDialogueCharTop =
                            parseInt(
                                currentDialogueChar.style.top.replace('px', '')
                            ) +
                            currentDialogueChar.offsetHeight / 2;

                        if (mc.dataset?.mainid === dialogueChar) {
                            currentDialogueCharLeft =
                                currentDialogueCharLeft + mc.offsetWidth / 2;
                        }

                        cutscene.style.left = currentDialogueCharLeft + 'px';
                        cutscene.style.top = currentDialogueCharTop + 'px';

                        const currentCharName = document.querySelector(
                            '.engage.character-name'
                        );
                        if (currentCharName) {
                            currentCharName.classList.remove('engage');
                            theCharacterName.classList.add('engage');
                        } else if (theCharacterName && '' === firstText) {
                            theCharacterName.classList.add('engage');
                        }
                    }
                } else if (mc) {
                    const currentCharImage = cutscene.querySelector(
                        '.engage.cut-character'
                    );
                    const currentCharName = cutscene.querySelector(
                        '.engage.character-name'
                    );

                    if ((currentCharImage && currentCharName) || ('' === firstText && !currentCharImage && !currentCharName)) {
                        currentCharName?.classList.remove('engage');
                        currentCharImage?.classList.remove('engage');
                        theCharacterImage?.classList.add('engage');
                        theCharacterName?.classList.add('engage');

                        setTimeout(() => {
                            centerCamera(currentCharImage || theCharacterImage, {
                                behavior: 'smooth',
                                block: 'nearest',
                            });
                        }, 500);
                    }
                }

                // If triggerable, trigger the move path for character.
                if (pathTrigger && theCharacterEl) {
                    moveNPC(theCharacterEl, false, false, false);
                }

                if ('' !== firstText) {
                    makeTalk(firstText, voice, providedAudio, false);

                    if (mc && theCharacterImage) {
                        theCharacterImage.classList.add('engage');
                    }

                    if (mc && theCharacterName) {
                        theCharacterName.classList.add('engage');
                    }
                }
            };

            moveDialogueBox(text);

            // Add a keydown event listener to the document to detect spacebar press
            document.addEventListener('keydown', cutsceneKeys);
            document.querySelector('.action-key').addEventListener('click', cutsceneKeys);
            cutscene.addEventListener('click', cutsceneKeys);

            // Fade in if area cutscene.
            if (true === areaCutscene) {
                fadeInScene();
            }
        }
    } else if (cutscene && 'true' === cutscene.dataset?.video) {
        if (false === cutscene.classList.contains('been-viewed')) {
            const cutsceneVideo = cutscene.querySelector('video');
            // stop movement.
            window.allowMovement = false;
            cutscene.classList.add('engage');

            if (cutsceneVideo) {
                // Mute current if mute is flagged.
                if (
                    'yes' === cutscene.dataset?.mutemusic &&
                    window.currentMusic
                ) {
                    window.currentMusic.pause();
                }

                cutsceneVideo.play();
                cutsceneVideo.muted = false;

                cutsceneVideo.addEventListener('ended', () => {
                    // Reengage movement.
                    window.allowMovement = true;

                    // After cutscene.
                    afterCutscene(cutscene, areaCutscene, false);
                });

                // Skip cutscene video.
                const skipButton = document.getElementById(
                    'skip-cutscene-video'
                );

                if (skipButton) {
                    skipButton.addEventListener('click', () => {
                        // Reengage movement.
                        window.allowMovement = true;
                        cutsceneVideo.pause();

                        afterCutscene(cutscene, areaCutscene, false);
                    });
                }
            }
        }
    }
}

/**
 * Parent communicate click to avoid multiple events per trigger engagement.
 */
function communicateParentClick() {
    'use strict';

    const communicateParents = document.querySelectorAll(
        '.communication-wrapper'
    );

    if (communicateParents) {
        communicateParents.forEach((communicateParent) => {
            communicateParent.addEventListener('click', (e) => {
                const isCommunicate = e.target.closest('.map-communicate');
                if (
                    (!isCommunicate &&
                        false ===
                        e.target.classList.contains('map-communicate')) ||
                    false === communicateParent.classList.contains('engage')
                ) {
                    if (
                        false === communicateParent.classList.contains('engage')
                    ) {
                        communicateParent.classList.add('engage');
                        communicateParent.classList.remove('notify');
                    } else {
                        communicateParent.classList.remove('engage');
                    }
                }
            });

            const communicates =
                communicateParent.querySelectorAll('.map-communicate');

            if (communicates) {
                communicates.forEach((communicateEl) => {
                    const dialogues = communicateEl.querySelectorAll(
                        'p, .wp-block-orbem-paragraph-mp3'
                    );
                    const communicateType = communicateEl.dataset.type;

                    communicateEl.addEventListener('click', () => {
                        if (
                            'voicemail' === communicateType &&
                            true ===
                            communicateParent.classList.contains('engage')
                        ) {
                            const textContainer = dialogues[0];

                            const text = textContainer.innerText;

                            const moveDialogueBox = (firstText = '') => {
                                const currentDialogue =
                                    communicateEl.querySelector(
                                        '.wp-block-orbem-paragraph-mp3.engage'
                                    );
                                let providedAudio =
                                    currentDialogue.querySelector('audio');
                                providedAudio = providedAudio ?? false;
                                const voice = currentDialogue.dataset.voice;

                                if ('' !== firstText) {
                                    makeTalk(firstText, voice, providedAudio, false);
                                }
                            };

                            moveDialogueBox(text);
                        } else if (
                            true ===
                            communicateParent.classList.contains('engage')
                        ) {
                            communicateEl.classList.toggle('show');
                        }
                    });

                    // start music if exists.
                    if (
                        communicateEl.dataset.music &&
                        '' !== communicateEl.dataset.music
                    ) {
                        playSong(
                            communicateEl.dataset.music,
                            cleanClassName(communicateEl.className)
                        );
                    }

                    // Mute current if mute is flagged.
                    if (
                        'yes' === communicateEl.dataset?.mutemusic &&
                        window.currentMusic
                    ) {
                        window.currentMusic.pause();
                    }
                });
            }
        });
    }
}

/**
 * Communicate logic
 * @param communicate
 * @param communicateTrigger
 */
function engageCommunicate(communicate, communicateTrigger) {
    'use strict';

    const communicateEl = document.querySelector(
        '.' + escClass(communicate) + '-map-communicate'
    );
    const communicateParent = communicateEl.parentNode;

    communicateParent.classList.add('notify');

    if (communicateTrigger) {
        communicateTrigger.remove();
        persistItemRemoval(
            communicateEl.id,
            'communicate',
            communicateParent.id,
            2000,
            '',
            false
        );
    }

    // Show communicate.
    communicateEl.classList.add('engage');
}

/**
 * engage the sign to open.
 *
 * @param signname
 */
function engageSign(signname) {
    'use strict';

    const item = document.querySelector('.' + escClass(signname) + '-map-item');
    item.classList.add('open-up');

    // In a zoomed area the sign lives inside the transform-scaled .game-world,
    // which would break its position:fixed pop-up. Temporarily lift the pop-up
    // out to the (unscaled) game container so it centers on the viewport, and
    // put it back when the sign closes.
    let hoistedFocus = null;
    let focusHome = null;
    if ((window.areaScale || 1) !== 1) {
        const focus = item.querySelector('.focus-content');
        const gameContainer = document.querySelector('.game-container');

        if (focus && gameContainer) {
            hoistedFocus = focus;
            focusHome = item;
            focus.style.zIndex = '99999';
            gameContainer.appendChild(focus);
        }
    }

    setTimeout(() => {
        document.addEventListener('click', closeSign);
    }, 0);

    // Close on action key
    document.addEventListener('keydown', closeSign);

    /**
     * Close event using spacebar for focus view.
     * @param event
     */
    function closeSign(event) {
        if ('Space' === event.code || 'click' === event.type) {
            item.classList.remove('open-up');
            document.removeEventListener('keydown', closeSign);

            // Return a hoisted pop-up to its sign item.
            if (hoistedFocus && focusHome) {
                hoistedFocus.style.zIndex = '';
                focusHome.appendChild(hoistedFocus);
                hoistedFocus = null;
                focusHome = null;
            }

            const focusViewName = cleanClassName(item.className);
            const cutscene = document.querySelector('.cutscene-trigger[data-materializefocus="' + focusViewName + '"]');
            const removeCutscene = document.querySelector('.cutscene-trigger[data-removeafterfocus="' + focusViewName + '"]');

            if (cutscene) {
                cutscene.classList.add('enable');
            }

            if (removeCutscene) {
                removeCutscene.remove();
            }

            if (item.dataset.mission && '' !== item.dataset.mission) {
                saveMission(item.dataset.mission, item, focusViewName);
            }
        }
    }
}

/**
 * Swap dialogue text/audio to match the visitor's browser language.
 * Handles three cases:
 *   1. orbem/paragraph-mp3 — translation spans are direct children of the
 *      outer <span>; swaps the inner <p> text and <audio> src.
 *   2. core/paragraph — translation spans are inside the <p>; swaps text nodes.
 *   3. core/heading — same pattern as core/paragraph but for h1–h6.
 *
 * Only runs when a non-English language is detected AND a matching translation
 * span exists. Safe to call multiple times — untranslated blocks are untouched.
 *
 * @param {Element|Document} [root] - Scope to search within. Defaults to document.
 */
function applyLanguageTranslations(root) {
    'use strict';

    const lang = (navigator.language || 'en').split('-')[0].toLowerCase();

    if ('en' === lang) {
        return;
    }

    const container = root || document;

    // Case 1: orbem/paragraph-mp3 — translation spans are direct children of
    // the outer span wrapper, not inside the <p>.
    container
        .querySelectorAll('.wp-block-orbem-paragraph-mp3')
        .forEach(function (block) {
            const translation = block.querySelector(
                ':scope > .lang-translation[data-lang="' + lang + '"]'
            );

            if (!translation) {
                return;
            }

            const defaultP = block.querySelector(':scope > p');
            const translatedP = translation.querySelector('p');

            if (defaultP && translatedP && translatedP.textContent) {
                defaultP.textContent = translatedP.textContent;
            }

            const translatedAudio = translation.querySelector('audio');

            if (translatedAudio && translatedAudio.src) {
                const defaultAudio = block.querySelector(':scope > audio');

                if (defaultAudio) {
                    defaultAudio.src = translatedAudio.src;
                } else {
                    const newAudio = document.createElement('audio');
                    newAudio.controls = true;
                    newAudio.src = translatedAudio.src;
                    newAudio.style.position = 'absolute';
                    newAudio.style.left = '-56000px';
                    block.insertBefore(
                        newAudio,
                        block.querySelector('.lang-translation')
                    );
                }
            }
        });

    // Case 2 & 3: core/paragraph and core/heading — translation spans live
    // inside the element itself as direct children.
    container
        .querySelectorAll('p, h1, h2, h3, h4, h5, h6')
        .forEach(function (el) {
            // Skip anything already handled by Case 1.
            if (el.closest('.wp-block-orbem-paragraph-mp3')) {
                return;
            }

            const translation = el.querySelector(
                ':scope > .lang-translation[data-lang="' + lang + '"]'
            );

            if (!translation || !translation.textContent.trim()) {
                return;
            }

            const translatedText = translation.textContent.trim();
            let replaced = false;

            Array.from(el.childNodes).forEach(function (node) {
                if (node.nodeType === Node.TEXT_NODE) {
                    if (!replaced) {
                        node.textContent = translatedText;
                        replaced = true;
                    } else {
                        node.textContent = '';
                    }
                }
            });
        });
}

/**
 * Stuff that happens before a cutscene.
 * @param position
 * @param areaCutscene
 */
/**
 * Start a cutscene by name, from outside the engine.
 *
 * @param {string} name The cutscene's slug.
 */
/**
 * Walk out through a doorway, from outside the engine.
 *
 * @param {Element} door The doorway element.
 */
window.orbemLeaveThrough = function (door) {
    if (!door || !door.className) {
        return false;
    }

    enterExplorePoint(door, 'false');

    return true;
};

/**
 * Finish a mission from outside the engine.
 *
 * @param {string} slug The mission's slug.
 */
window.orbemCompleteMission = function (slug) {
    if (!slug) {
        return false;
    }

    saveMission(String(slug), null, '');

    return true;
};

/** End the player, the way losing all their health does: the game-over and whatever the world does after a death. */
window.orbemKillPlayer = function (reason) {
    if (false === window.allowMovement && document.querySelector('.game-over-notice[style*="block"]')) {
        return false;
    }

    hurtAnimation();
    addUserPoints(0, 'health', String(reason || 'killed'), false, '');

    return true;
};

window.orbemPlayCutscene = function (name) {
    if (!name || document.querySelector('.map-cutscene.engage')) {
        return false;
    }

    const cutscene = document.querySelector('.' + escClass(name) + '-map-cutscene');

    if (!cutscene || cutscene.classList.contains('been-viewed')) {
        return false;
    }

    engageCutscene(name, false);

    return true;
};

function engageCutscene(position, areaCutscene) {
    'use strict';

    const cutscene =
        undefined === position?.className
            ? document.querySelector('.' + escClass(position) + '-map-cutscene')
            : position;

    if (!cutscene) return;

    const mc = document.getElementById('map-character');
    const character = cleanClassName(
        cutscene.querySelector(
            '.wp-block-orbem-paragraph-mp3:not(.explore-character-' +
            mc?.dataset?.mainid +
            ')'
        )?.className
    );

    const characterPosition = JSON.parse(
        cutscene.getAttribute('data-character-position')
    );
    const cutsceneName = cleanClassName(cutscene.className).replace(' ', '');
    const cutsceneCharacter = character
        ? document.getElementById(character)
        : false;
    const mapCharacter = document.getElementById('map-character');

    // Face NPC before talking to them. Good manners.
    faceNPC(mapCharacter, cutscene.dataset.character, cutscene);

    if (
        characterPosition &&
        0 < characterPosition.length &&
        undefined !== characterPosition[0] &&
        'before' === characterPosition[0]?.trigger
    ) {
        window.allowCutscene = false;

        if ('0' !== characterPosition[0]?.top) {
            // Trigger character move before cutscene starts.
            moveCharacter(
                mapCharacter,
                characterPosition[0].top,
                characterPosition[0].left,
                true,
                cutscene,
                areaCutscene,
                position
            );
        }

        // Trigger walking path if selected and has path.
        const pathTriggerPosition = document.querySelector(
            '[data-trigger-cutscene="' + cutsceneName + '"]'
        );
        const cutsceneHasPath = undefined !== cutscene.dataset?.path;

        // Push MC if NPC needs to walk after cutscene.
        if (pathTriggerPosition || cutsceneHasPath) {
            // Push MC away from character.
            pushMC(30);
        }

        if (pathTriggerPosition) {
            moveNPC(pathTriggerPosition, false, areaCutscene, position);
        }

        // If cutscene has walking path. Move NPC after cutscene.
        if (cutsceneHasPath) {
            moveNPC(cutsceneCharacter, cutscene, areaCutscene, position);
        }
    } else {
        playCutscene(position, areaCutscene);
    }
}

function faceNPC(mapCharacter, npc, cutscene) {
    'use strict';

    const npcEl = document.querySelector('.' + escClass(npc) + '-map-item');
    const mcImage = mapCharacter.querySelector('.map-character-icon.engage');

    if (npcEl) {
        const npcLeft = parseInt(npcEl.style.left.replace('px', '')) + 25;
        const npcTop = parseInt(npcEl.style.top.replace('px', '')) + 25;
        const npcRight = npcLeft + npcEl.offsetWidth - 50;
        const npcBottom = npcTop + npcEl.offsetHeight - 50;
        const mcLeftCont = parseInt(mapCharacter.style.left.replace('px', ''));
        const mcTopCont = parseInt(mapCharacter.style.top.replace('px', ''));
        const mcLeft = mcLeftCont + (window.globalLeftPositionOffset - mcImage.offsetWidth / 2);
        const mcRight = mcLeft + mcImage.offsetWidth;
        const mcTop = mcTopCont + (window.globalTopPositionOffset - mcImage.offsetHeight / 2);
        const mcBottom = mcTop + mcImage.offsetHeight;

        let direction;
        let npcDirection = false;

        direction = mcLeft > npcRight ? 'left' : false;
        direction = mcRight < npcLeft ? 'right' : direction;
        direction = mcTop > npcBottom ? 'up' : direction;
        direction = mcBottom < npcTop ? 'down' : direction;

        if (false === direction) {
            const across = ((mcLeft + mcRight) / 2 - (npcLeft + npcRight) / 2) / Math.max(1, npcEl.offsetWidth);
            const down = ((mcTop + mcBottom) / 2 - (npcTop + npcBottom) / 2) / Math.max(1, npcEl.offsetHeight);

            if (Math.abs(across) > Math.abs(down)) {
                direction = across > 0 ? 'left' : 'right';
            } else {
                direction = down > 0 ? 'up' : 'down';
            }
        }

        switch (direction) {
            case 'left':
                npcDirection = 'right';
                break;
            case 'right':
                npcDirection = 'left';
                break;
            case 'up':
                npcDirection = 'down';
                break;
            case 'down':
                npcDirection = 'up';
                break;
        }

        if (false !== direction) {
            setStaticMCImage(mapCharacter, direction, false);

            if ('no' !== cutscene.dataset?.npcfaceme) {
                if (undefined === npcEl.dataset.facedFrom) {
                    npcEl.dataset.facedFrom = npcEl.querySelector('.character-icon.engage')?.id || '';
                }

                setStaticNPCImage(npcDirection, npcEl);
            }
        }
    }
}

/**
 * Stuff that happens after a cutscene.
 * @param cutscene
 * @param areaCutscene
 * @param character
 */
function afterCutscene(cutscene, areaCutscene, character) {
    'use strict';

    cutscene.classList.remove('engage');

    window.nextAreaMissionComplete = '';
    const cutsceneName = cleanClassName(cutscene.className).replace(' ', '');
    const bossFight = cutscene.dataset.boss;
    const selectedCutsceneCharacter = cutscene.dataset?.character ?? character;
    const cutsceneCharacter =
        selectedCutsceneCharacter && false === Number.isFinite(Number(selectedCutsceneCharacter))
            ? document.querySelector(
                '.' + escClass(selectedCutsceneCharacter) + '-map-item',
            )
            : false;
    const indicator = document.querySelector('.indicator-icon');
    const communicateDevice = cutscene.dataset?.communicate;

    if (cutsceneCharacter && undefined !== cutsceneCharacter.dataset.facedFrom) {
        const before = cutsceneCharacter.dataset.facedFrom
            ? document.getElementById(cutsceneCharacter.dataset.facedFrom)
            : null;
        const facing = cutsceneCharacter.querySelector('.character-icon.engage');

        delete cutsceneCharacter.dataset.facedFrom;

        if (before && before !== facing && cutsceneCharacter.contains(before)) {
            facing?.classList.remove('engage');
            before.classList.add('engage');
        }
    }
    const materializeCutscenes = document.querySelectorAll(
        '[data-materializecutscene="' + cutsceneName + '"]'
    );

    if (materializeCutscenes && 0 < materializeCutscenes.length) {
        materializeCutscenes.forEach(materializeCutscene => {
            if (false === materializeCutscene.classList.contains('enable')) {
                materializeCutscene.classList.add('enable');
            }
        })
    }

    // Show dependent communication devices.
    if (communicateDevice && '' !== communicateDevice) {
        const communicateDeviceEl = document.querySelector(
            '.' + escClass(communicateDevice) + '-map-item'
        );

        if (communicateDeviceEl) {
            communicateDeviceEl.classList.add('dependent');
        }
    }

    // Hide indicator.
    if (indicator) {
        indicator.classList.remove('engage');
    }

    // Give points if value type is specified.
    if ('' !== cutscene.dataset?.type && undefined !== cutscene.dataset?.type) {
        runPointAnimation(
            cutscene,
            cutsceneName,
            false,
            cutscene.dataset.value,
            ''
        );
    }

    // Hide cutscene images.
    const mcImage = document.querySelector(
        '[data-character="' + window.mainCharacter + '"]'
    );

    if (mcImage) {
        mcImage.classList.remove('engage');
    }

    let newMusic = '';

    if (OrbemOrder.musicNames) {
        newMusic = JSON.parse(OrbemOrder.musicNames)[currentLocation];
    }

    // restart music if it changed.
    if (
        ('yes' === cutscene.dataset.mutemusic ||
            (cutscene.dataset.music && '' !== cutscene.dataset.music)) &&
        newMusic
    ) {
        playSong(newMusic, currentLocation);
    }

    // Stop talking.
    if ('' !== talkAudio) {
        talkAudio.pause();
        talkAudio.currentTime = 0;
    }

    const characterPosition = JSON.parse(
        cutscene.getAttribute('data-character-position')
    );

    // Trigger walking path if selected and has path.
    const pathTriggerPosition = document.querySelector(
        '[data-trigger-cutscene="' + cutsceneName + '"]'
    );

    if (
        characterPosition &&
        0 < characterPosition.length &&
        undefined !== characterPosition[0] &&
        'after' === characterPosition[0]?.trigger
    ) {
        const cutsceneHasPath = undefined !== cutscene.dataset?.path;

        // Push MC if NPC needs to walk after cutscene.
        if (pathTriggerPosition || cutsceneHasPath) {
            // Push MC away from character.
            pushMC(30);
        }

        if (pathTriggerPosition) {
            moveNPC(pathTriggerPosition, false, false, false);
        }

        // If cutscene has walking path. Move NPC after cutscene.
        if (cutsceneHasPath) {
            moveNPC(cutsceneCharacter, cutscene, false, false);
        }
    }

    // Remove after cutscene.
    const removeThings = document.querySelectorAll(
        '[data-removeaftercutscene]'
    );

    if (removeThings) {
        removeItems(removeThings, cutsceneName);
    }

    // Materialize item after cutscene.
    const showItems = document.querySelectorAll(
        '[data-showaftercutscene="' + cutsceneName + '"]'
    );

    if (showItems) {
        showItems.forEach((showItem) => {
            showItem.classList.add('no-point');
            materializedItemsArray.push(cleanClassName(showItem.className));

            if ('explore-enemy' === showItem.dataset.genre) {
                engageEnemy(showItem, false)
            }
        });

        saveMaterializedItem(currentLocation, materializedItemsArray);
    }

    // Go to new area after cutscene if next area exists.
    const nextArea = cutscene.dataset.nextarea;
    const nextAreaPosition = cutscene.getAttribute('data-nextarea-position');
    const areaMap = cutscene.dataset.mapurl;
    const weapon = document.querySelector('.map-weapon');

    // Complete mission if cutscene has one.
    const missionComplete = cutscene.dataset.missioncomplete;

    if (missionComplete) {
        const missionCompleteMission = document.querySelector(
            '.' + escClass(missionComplete) + '-mission-item'
        );

        saveMission(missionComplete, missionCompleteMission, missionComplete);
        window.nextAreaMissionComplete = missionComplete;
    }

    // If nextArea exists then trigger new area change.
    if (nextArea) {
        enterNewArea(nextArea, weapon, areaMap, nextAreaPosition, window.crewCharacters);
    }

    // Reengage hit.
    setTimeout(() => {
        window.allowHit = true;

        // Reset after cutscene for face npc logic:
        window.faceNPC = '';

        if (
            pathTriggerPosition &&
            'true' === pathTriggerPosition.dataset?.cutscenebreak
        ) {
            pathTriggerPosition.dataset.cutscenebreak = 'false';
        }

        if (
            cutsceneCharacter &&
            'true' === cutsceneCharacter.dataset?.cutscenebreak
        ) {
            cutsceneCharacter.dataset.cutscenebreak = 'false';
        }

        if (bossFight && '' !== bossFight) {
            const daBoss = document.querySelector(
                '.' + escClass(bossFight) + '-map-item'
            );

            if (daBoss) {
                engageEnemy(daBoss);
            }
        }
    }, 100);

    // "The End": restart the game once this cutscene finishes.
    if ('yes' === cutscene.dataset?.theEnd) {
        restartGame();
    }
}

function removeItems(removeThings, cutsceneName) {
    'use strict';

    removeThings.forEach((removeThing) => {
        if (removeThing.dataset?.removeaftercutscene && '' !== removeThing.dataset.removeaftercutscene) {
            let theRemoveCutscenes;
            let removeTheThing = false;

            try {
                theRemoveCutscenes = JSON.parse(
                    removeThing.dataset.removeaftercutscene,
                );

                removeTheThing = theRemoveCutscenes[cutsceneName];
            } catch (e) {
                theRemoveCutscenes = removeThing.dataset.removeaftercutscene; // fallback to raw string
                removeTheThing = cutsceneName === theRemoveCutscenes;
            }

            if (removeTheThing) {
                removeThing.remove();

                persistItemRemoval(
                    cleanClassName(removeThing.className),
                    'point',
                    0,
                    2000,
                    '',
                    true
                );
            }
        }
    });
}

function removeMissions(removeThings, missionName) {
    'use strict';

    removeThings.forEach((removeThing) => {
        if (removeThing.dataset?.removeaftermission && '' !== removeThing.dataset.removeaftermission) {
            const theRemoveItem = removeThing.dataset.removeaftermission;

            if (missionName === theRemoveItem) {
                removeThing.remove();

                persistItemRemoval(
                    cleanClassName(removeThing.className),
                    'point',
                    0,
                    2000,
                    '',
                    true
                );
            }
        }
    });
}

function resetWalkSound() {
    'use strict';

    const walkingSound = document.getElementById('walking');

    if (
        walkingSound &&
        undefined !== walkingSound?.src &&
        '' !== walkingSound.src
    ) {
        const walkingSoundURL = walkingSound.src;

        walkingSound.src = '';

        setTimeout(() => {
            walkingSound.src = walkingSoundURL;
        }, 100);
    }

    return false;
}

function playWalkSound() {
    'use strict';

    const walkingSound = document.getElementById('walking');

    if (
        walkingSound &&
        undefined !== walkingSound?.src &&
        '' !== walkingSound.getAttribute('src')
    ) {
        walkingSound.loop = true;

        if (window.sfxVolume) {
            walkingSound.volume = window.sfxVolume;
        }

        walkingSound.play();
    }

    return false;
}

function fadeInScene() {
    'use strict';

    const container = document.querySelector('.game-container');

    if (container) {
        container.dataset.fadeout = '';

        setTimeout(() => {
            container.dataset.fadeout = 'false';
        }, 1000);
    }
}

function fadeOutScene() {
    'use strict';

    const container = document.querySelector('.game-container');

    if (container) {
        container.dataset.fadeout = 'true';
    }
}

function stopWalkSound() {
    'use strict';

    const walkingSound = document.getElementById('walking');

    if (walkingSound) {
        walkingSound.pause();
        walkingSound.currentTime = 0;
    }

    window.amwalking = false;

    return false;
}

function playJumpSound() {
    'use strict';
    const jumpAudio = document.querySelector('#map-character .jump-sound audio');
    if (jumpAudio) {
        jumpAudio.currentTime = 0;
        if (window.sfxVolume !== undefined) {
            jumpAudio.volume = window.sfxVolume;
        }
        jumpAudio.play().catch(() => {});
    }
}

// Shops

let shopOpenFor = null;
let shopTab = 'buy';

/** Open the shop this character keeps. */
async function openCrafting() {
    'use strict';

    if (document.getElementById('orbem-crafting')) {
        return;
    }

    playSfx('explore_sfx_menu_open');
    window.allowMovement = false;

    const data = await craftingRequest('/crafting/', {});

    renderCrafting(data && data.success ? data.recipes : [], '');
}

async function craftingRequest(path, body) {
    'use strict';

    try {
        const res = await fetch(`${OrbemOrder.siteRESTURL}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': OrbemOrder.orbemNonce },
            credentials: 'same-origin',
            body: JSON.stringify(body),
        });

        return await res.json();
    } catch (e) {
        return null;
    }
}

function closeCrafting() {
    'use strict';

    if (document.getElementById('orbem-crafting')) {
        playSfx('explore_sfx_menu_close');
    }

    document.getElementById('orbem-crafting')?.remove();
    window.allowMovement = true;
}

function renderCrafting(recipes, message) {
    'use strict';

    document.getElementById('orbem-crafting')?.remove();

    const panel = document.createElement('div');
    panel.id = 'orbem-crafting';
    panel.innerHTML = `
        <div class="orbem-shop-inner">
            <header>
                <strong>Crafting</strong>
                <button type="button" class="orbem-shop-close" aria-label="Close">✕</button>
            </header>
            <ul class="orbem-shop-items">${recipes.map(craftingRow).join('')}</ul>
            ${recipes.length ? '' : '<p class="orbem-shop-empty">Nothing can be crafted yet.</p>'}
            <p class="orbem-shop-message" data-message${message ? '' : ' hidden'}>${escapeShopText(message)}</p>
        </div>
    `;

    panel.querySelector('.orbem-shop-close').addEventListener('click', closeCrafting);

    panel.querySelectorAll('[data-craft]').forEach((button) => {
        button.addEventListener('click', async () => {
            panel.querySelectorAll('[data-craft]').forEach(b => { b.disabled = true; });

            const result = await craftingRequest('/crafting/craft/', { id: Number(button.dataset.craft) });

            if (result && result.success && result.storage) {
                refreshStorageSlots(result.storage);
            }

            playSfx(result && result.success ? 'explore_sfx_craft' : 'explore_sfx_denied');

            if (result && result.success) {
                showGain({ label: result.name, amount: 1, image: result.image || '', kind: 'crafted' });
                document.dispatchEvent(new CustomEvent('orbem:crafted', { detail: result }));
            }

            const after = result && result.recipes
                ? result.recipes
                : ((await craftingRequest('/crafting/', {})) || {}).recipes || recipes;

            renderCrafting(after, result && result.success
                ? (result.message || `Crafted ${result.name}.`)
                : ((result && result.message) || 'That did not work.'));
        });
    });

    document.body.appendChild(panel);
}

function craftingRow(recipe) {
    'use strict';

    const needs = recipe.needs.map(need => `
        <span class="orbem-crafting-need${need.have < need.amount ? ' is-short' : ''}">
            ${need.image ? `<img src="${encodeURI(need.image)}" alt="" />` : ''}
            ${escapeShopText(need.name)} ${need.have}/${need.amount}
        </span>`).join('');

    return `
        <li class="orbem-shop-item${recipe.craftable ? '' : ' is-sold-out'}">
            ${recipe.image ? `<img src="${encodeURI(recipe.image)}" alt="" />` : '<span class="orbem-shop-noimage"></span>'}
            <span class="orbem-shop-name">${escapeShopText(recipe.name)}<span class="orbem-crafting-needs">${needs}</span></span>
            <button type="button" data-craft="${recipe.id}"${recipe.craftable ? '' : ' disabled'}>Craft</button>
        </li>
    `;
}

async function openShop(shopId, keeper) {
    'use strict';

    if (shopOpenFor) {
        return;
    }

    shopOpenFor = shopId;
    shopTab = 'buy';
    window.allowMovement = false;
    playSfx('explore_sfx_menu_open');

    const shop = await fetchShop(shopId);

    if (!shop) {
        closeShop(keeper);

        return;
    }

    renderShop(shop, keeper);
}

async function fetchShop(shopId) {
    'use strict';

    try {
        const res = await fetch(`${OrbemOrder.siteRESTURL}/shop/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': OrbemOrder.orbemNonce },
            credentials: 'same-origin',
            body: JSON.stringify({ shop: shopId }),
        });

        const data = await res.json();

        return data && data.success ? data.data : null;
    } catch (e) {
        return null;
    }
}

function closeShop(keeper) {
    'use strict';

    if (document.getElementById('orbem-shop')) {
        playSfx('explore_sfx_menu_close');
    }

    document.getElementById('orbem-shop')?.remove();
    shopOpenFor = null;
    window.allowMovement = true;

    // Remembered on the keeper so standing against them does not re-open it the instant it closes.
    if (keeper) {
        keeper.dataset.shopJustClosed = '1';
    }
}

function renderShop(shop, keeper) {
    'use strict';

    document.getElementById('orbem-shop')?.remove();

    const panel = document.createElement('div');
    panel.id = 'orbem-shop';
    panel.innerHTML = `
        <div class="orbem-shop-inner">
            <header>
                <strong>${escapeShopText(shop.name)}</strong>
                <span class="orbem-shop-money" data-money>${shop.money}</span>
                <button type="button" class="orbem-shop-close" aria-label="Close">✕</button>
            </header>
            ${shop.greeting ? `<p class="orbem-shop-greeting">${escapeShopText(shop.greeting)}</p>` : ''}
            <nav class="orbem-shop-tabs">
                <button type="button" data-shop-tab="buy"${'buy' === shopTab ? ' class="is-active"' : ''}>Buy</button>
                <button type="button" data-shop-tab="sell"${'sell' === shopTab ? ' class="is-active"' : ''}>Sell</button>
            </nav>
            ${'sell' === shopTab
                ? `<ul class="orbem-shop-items">${(shop.sell || []).map(shopSellRow).join('')}</ul>
                   ${(shop.sell || []).length ? '' : '<p class="orbem-shop-empty">Nothing you carry is wanted here.</p>'}`
                : `<ul class="orbem-shop-items">${shop.items.map(item => shopRow(item, shop.money)).join('')}</ul>
                   ${shop.items.length ? '' : '<p class="orbem-shop-empty">Nothing for sale just now.</p>'}`}
            <p class="orbem-shop-message" data-message hidden></p>
        </div>
    `;

    panel.querySelector('.orbem-shop-close').addEventListener('click', () => closeShop(keeper));

    panel.querySelectorAll('[data-shop-tab]').forEach((button) => {
        button.addEventListener('click', () => {
            playSfx('explore_sfx_tab');
            shopTab = button.dataset.shopTab;
            renderShop(shop, keeper);
        });
    });

    panel.querySelectorAll('[data-buy]').forEach((button) => {
        button.addEventListener('click', () => buyFromShop(shop.shop, Number(button.dataset.buy), keeper));
    });

    panel.querySelectorAll('[data-sell]').forEach((button) => {
        button.addEventListener('click', () => sellToShop(shop.shop, button.dataset.sell, keeper));
    });

    document.body.appendChild(panel);
}

/** One line of the price list. */
function shopRow(item, money) {
    'use strict';

    const stock = item.unlimited
        ? ''
        : (item.soldOut
            ? `<span class="orbem-shop-stock">Sold out${null === item.restocksIn ? '' : ` · back in ${item.restocksIn}m`}</span>`
            : `<span class="orbem-shop-stock">${item.left} left</span>`);

    const tooDear = !item.soldOut && Number(money) < Number(item.price);

    return `
        <li class="orbem-shop-item${item.soldOut ? ' is-sold-out' : ''}${tooDear ? ' is-too-dear' : ''}">
            ${item.image ? `<img src="${encodeURI(item.image)}" alt="" />` : '<span class="orbem-shop-noimage"></span>'}
            <span class="orbem-shop-name">${escapeShopText(item.name)}${stock}</span>
            <button type="button" data-buy="${item.index}"${item.soldOut || tooDear ? ' disabled' : ''}${tooDear ? ' title="Not enough money"' : ''}>${item.price}</button>
        </li>
    `;
}

function shopSellRow(item) {
    'use strict';

    return `
        <li class="orbem-shop-item">
            ${item.image ? `<img src="${encodeURI(item.image)}" alt="" />` : '<span class="orbem-shop-noimage"></span>'}
            <span class="orbem-shop-name">${escapeShopText(item.name)}<span class="orbem-shop-stock">You have ${item.count}</span></span>
            <button type="button" data-sell="${escapeShopText(item.slug)}">${item.price}</button>
        </li>
    `;
}

async function sellToShop(shopId, slug, keeper) {
    'use strict';

    const panel = document.getElementById('orbem-shop');

    if (!panel) {
        return;
    }

    panel.querySelectorAll('[data-sell]').forEach(b => { b.disabled = true; });

    let result = null;

    try {
        const res = await fetch(`${OrbemOrder.siteRESTURL}/shop/sell/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': OrbemOrder.orbemNonce },
            credentials: 'same-origin',
            body: JSON.stringify({ shop: shopId, slug }),
        });

        result = await res.json();
    } catch (e) {
        result = null;
    }

    if (result && result.success && result.storage) {
        refreshStorageSlots(result.storage);
    }

    playSfx(result && result.success ? 'explore_sfx_sell' : 'explore_sfx_denied');

    if (result && result.success) {
        showGain(pointGainLine('money', result.price));
    }

    const shop = await fetchShop(shopId);

    if (shop) {
        renderShop(shop, keeper);
        syncMoneyBar(shop.money);
    }

    const message = document.querySelector('#orbem-shop [data-message]');

    if (message) {
        message.textContent = result && result.success
            ? `Sold ${result.name} for ${result.price}.`
            : ((result && result.message) || 'That did not work.');
        message.hidden = false;
    }
}

/** Buy one thing, then show what the server says the shop looks like now. */
async function buyFromShop(shopId, index, keeper) {
    'use strict';

    const panel = document.getElementById('orbem-shop');

    if (!panel) {
        return;
    }

    panel.querySelectorAll('[data-buy]').forEach(b => { b.disabled = true; });

    let result = null;

    try {
        const res = await fetch(`${OrbemOrder.siteRESTURL}/shop/buy/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': OrbemOrder.orbemNonce },
            credentials: 'same-origin',
            body: JSON.stringify({ shop: shopId, index }),
        });

        result = await res.json();
    } catch (e) {
        result = null;
    }

    if (result && result.success && result.storage) {
        refreshStorageSlots(result.storage);
    }

    playSfx(result && result.success ? 'explore_sfx_buy' : 'explore_sfx_denied');

    if (result && result.success) {
        showGain({ label: result.name, amount: 1, image: result.image || '', kind: 'bought' });
    }

    const shop = await fetchShop(shopId);

    if (shop) {
        renderShop(shop, keeper);
        syncMoneyBar(shop.money);
    }

    const message = document.querySelector('#orbem-shop [data-message]');

    if (message) {
        message.textContent = result && result.success
            ? `Bought ${result.name}.`
            : ((result && result.message) || 'That did not work.');
        message.hidden = false;
    }
}

window.refreshStorageSlots = (html) => refreshStorageSlots(html);

window.orbemRefreshStorage = (html) => refreshStorageSlots(html);

function refreshStorageSlots(html) {
    'use strict';

    const fresh = document.createElement('div');
    fresh.innerHTML = html;

    fresh.querySelectorAll('.storage-menu[data-menu]').forEach((freshMenu) => {
        const menu = document.querySelector('.storage-menu[data-menu="' + freshMenu.dataset.menu + '"]');

        if (!menu) {
            return;
        }

        const slots = Array.from(menu.querySelectorAll(':scope > .storage-item'));

        Array.from(freshMenu.querySelectorAll(':scope > .storage-item')).forEach((freshSlot, i) => {
            const slot = slots[i];

            if (!slot) {
                menu.appendChild(freshSlot);
                return;
            }

            Array.from(slot.attributes).forEach((attr) => {
                if ('class' !== attr.name && !freshSlot.hasAttribute(attr.name)) {
                    slot.removeAttribute(attr.name);
                }
            });

            Array.from(freshSlot.attributes).forEach((attr) => {
                if ('class' !== attr.name) {
                    slot.setAttribute(attr.name, attr.value);
                }
            });

            const engaged = slot.classList.contains('engage');

            slot.className = freshSlot.className;
            slot.classList.toggle('engage', engaged);
            slot.innerHTML = freshSlot.innerHTML;
        });
    });
}

/** Keep the HUD honest about what was just spent. */
function syncMoneyBar(amount) {
    'use strict';

    const bar = document.querySelector('#explore-points .money-amount');

    if (bar) {
        bar.dataset.amount = String(amount);
        const label = bar.querySelector('.money-count, span');

        if (label) {
            label.textContent = String(amount);
        }
    }
}

/** Titles and greetings are the builder's words, printed as words. */
function escapeShopText(value) {
    'use strict';

    const box = document.createElement('div');
    box.textContent = String(value ?? '');

    return box.innerHTML;
}

/**
 * Whether the player reached this trigger from the side that opens.
 *
 * @param {Element} trigger
 * @param {object} mover the walker's box in playfield coordinates, not the sprite element — a sprite's own offsetLeft is measured inside #map-character and says nothing about where on the map it is standing.
 * @return {boolean}
 */
function enteredFromAllowedSide(trigger, mover) {
    'use strict';

    const side = trigger.dataset ? trigger.dataset.entrySide : '';

    if (!side || 'any' === side) {
        return true;
    }

    const t = collisionBox(trigger, mover);
    const m = collisionBox(mover);

    if (!t || !m || undefined === t.offsetLeft || undefined === m.offsetLeft) {
        return true;
    }

    const overlap = {
        left:   (m.offsetLeft + m.offsetWidth) - t.offsetLeft,
        right:  (t.offsetLeft + t.offsetWidth) - m.offsetLeft,
        top:    (m.offsetTop + m.offsetHeight) - t.offsetTop,
        bottom: (t.offsetTop + t.offsetHeight) - m.offsetTop,
    };

    let from = 'left';

    for (const name of ['right', 'top', 'bottom']) {
        if (overlap[name] < overlap[from]) {
            from = name;
        }
    }

    return from === side;
}

/**
 * Enter an explore position if it is enterable.
 * @param value
 * @param mapUrl
 */
export function enterExplorePoint(value, mapUrl) {
    'use strict';

    // Add enter buttons to map items.
    const position =
        undefined !== value.className ? cleanClassName(value.className) : value;
    mapUrl = 'false' !== mapUrl ? mapUrl : value.getAttribute('data-map-url');

    // Some triggers say where you come out.
    const landing = value && value.getAttribute
        ? value.getAttribute('data-nextarea-position')
        : null;

    // Add data point to button.
    const weaponEl = document.querySelector('.map-weapon');

    if (weaponEl) {
        weaponEl.style.display = 'none';
    }

    playSfx('explore_sfx_door');
    enterNewArea(position, weaponEl, mapUrl, landing || false, window.crewCharacters);
}

/**
 * Handles character movement on the map interface.
 * This function sets up event listeners for keyboard and touch inputs
 * to enable character movement. It also continuously updates the character's
 * position on the map based on user input.
 */
function movementIntFunc() {
    'use strict';

    const d = {};
    let $newest = false;
    window.allowMovement = true;
    window.keyDown = false;

    clearInterval(window.movementInt);

    // Step interval from the character's speed field, as NPCs and enemies use.
    const _mapChar = document.getElementById('map-character');
    const characterSpeed = parseInt(_mapChar?.dataset.speed, 10) || 16;

    // Detect gravity mode from the current area's data-physics attribute.
    const _gameContainer = document.querySelector('.game-container');
    window.gravityMode = 'gravity' === (_gameContainer?.dataset.physics || '');
    if (window.gravityMode) {
        window.jumpVelocity = 0;
        window.isGrounded = false;
        window.canDoubleJump = false;
    }

    function triggerJump() {
        const mapChar = document.getElementById('map-character');
        const jumpHeight = parseFloat(mapChar?.dataset.jump || '0');
        if (jumpHeight <= 0) return;
        if (window.isGrounded) {
            window.jumpVelocity = -Math.sqrt(2 * 0.5 * jumpHeight);
            window.isGrounded = false;
            window.canDoubleJump = 0 < parseFloat(mapChar?.dataset.doubleJump || '0');
            playJumpSound();
        } else if (window.canDoubleJump) {
            const djHeight = parseFloat(mapChar?.dataset.doubleJump || '0');
            if (djHeight > 0) {
                window.jumpVelocity = -Math.sqrt(2 * 0.5 * djHeight);
                window.canDoubleJump = false;
                playJumpSound();
            }
        }
    }

    // Add listeners for explore keyboard movement.
    document.addEventListener('keydown', function (e) {
        d[e.which] = true;

        $newest = e.which;

        // Turn off arrow flash if character moved.
        clearInterval(window.buttonShow);
        clearTimeout(window.coordinateTimeout);

        // Gravity mode: Up / W triggers a jump instead of moving upward.
        if (window.gravityMode && window.allowMovement && (38 === e.which || 87 === e.which)) {
            e.preventDefault();
            if (!window._jumpKeyActive) {
                window._jumpKeyActive = true;
                triggerJump();
            }
        }
    });

    document.addEventListener('keyup', function (e) {
        if (38 === e.which || 87 === e.which) {
            window._jumpKeyActive = false;
        }
        stopWalkingFunction(e, false);
    });

    document.addEventListener('touchend', function (e) {
        window._touchJumpActive = false;
        stopWalkingFunction(e, true);
    });

    function stopWalkingFunction(e, touchEvent) {
        const keys = [37, 38, 39, 40, 87, 65, 83, 68];
        const mapChar = document.querySelector('#map-character');

        d[e.which] = false;

        window.keyDown = false;

        // Turn off arrow flash if character moved.
        clearInterval(window.buttonShow);

        // Set Coordinates.
        if (true === keys.includes(e.which) || true === touchEvent) {
            window.coordinateTimeout = setTimeout(() => {
                const mapChar = document.querySelector('#map-character');
                const userLeft = mapChar.style.left;
                const userTop = mapChar.style.top;

                if (
                    false === window.keyDown &&
                    (userLeft !== window.charCurrentLeft ||
                        userTop !== window.charCurrentTop)
                ) {
                    addUserCoordianate(userLeft, userTop);
                    window.charCurrentLeft = userLeft;
                    window.charCurrentTop = userTop;

                    clearInterval(window.coordinateTimeout);
                }
            }, 1000);

            setStaticMCImage(mapChar, '', false);
        }
    }

    document
        .querySelector('.top-left')
        .addEventListener('touchstart', function (e) {
            e.preventDefault();
            if (window.gravityMode) {
                if (!window._touchJumpActive) { window._touchJumpActive = true; triggerJump(); }
            }
            d[37] = true;
            d[38] = true;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
            clearTimeout(window.coordinateTimeout);
        });
    document
        .querySelector('.top-left')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            d[37] = false;
            d[38] = false;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
            // Set Coordinates.
            window.coordinateTimeout = setTimeout(() => {
                const mapChar = document.querySelector('#map-character');
                const userLeft = mapChar.style.left;
                const userTop = mapChar.style.top;

                addUserCoordianate(userLeft, userTop);
            }, 1000);
        });
    document
        .querySelector('.top-middle')
        .addEventListener('touchstart', function (e) {
            e.preventDefault();
            if (window.gravityMode) {
                if (!window._touchJumpActive) { window._touchJumpActive = true; triggerJump(); }
            }
            d[38] = true;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.top-middle')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            d[38] = false;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.top-right')
        .addEventListener('touchstart', function (e) {
            e.preventDefault();
            if (window.gravityMode) {
                if (!window._touchJumpActive) { window._touchJumpActive = true; triggerJump(); }
            }
            d[38] = true;
            d[39] = true;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.top-right')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            d[38] = false;
            d[39] = false;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.middle-left')
        .addEventListener('touchstart', function (e) {
            e.preventDefault();
            d[37] = true;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.middle-left')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            d[37] = false;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.middle-right')
        .addEventListener('touchstart', function (e) {
            e.preventDefault();
            d[39] = true;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.middle-right')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            d[39] = false;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.bottom-left')
        .addEventListener('touchstart', function (e) {
            e.preventDefault();
            d[37] = true;
            d[40] = true;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.bottom-left')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            d[37] = false;
            d[40] = false;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.bottom-middle')
        .addEventListener('touchstart', function (e) {
            e.preventDefault();
            d[40] = true;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.bottom-middle')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            d[40] = false;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.bottom-right')
        .addEventListener('touchstart', function (e) {
            e.preventDefault();
            d[39] = true;
            d[40] = true;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });
    document
        .querySelector('.bottom-right')
        .addEventListener('touchend', function (e) {
            e.preventDefault();
            d[39] = false;
            d[40] = false;

            // Turn off arrow flash if character moved.
            clearInterval(window.buttonShow);
        });

    // Other people, if this game is played with any.
    startMultiplayer();

    // Put the characters back where this player left them, and keep noting where they get to.
    startNpcPositions();

    // Being hit by another player is being hit.
    document.addEventListener('orbem:player-hit', (event) => {
        const damage = parseInt(event.detail?.damage, 10);

        if (!damage || window.mcHurtCooldown) {
            return;
        }

        window.mcHurtCooldown = true;

        const currentHealth = getCurrentPoints('health');

        hurtAnimation();
        addUserPoints(parseInt(currentHealth, 10) - damageTaken(damage), 'health', 'player', '');

        setTimeout(() => {
            window.mcHurtCooldown = false;
        }, 1000);
    });

    window.movementInt = setInterval(function () {
        nextStep();

        const box = document.getElementById('map-character');
        const weapon = document.querySelector('.map-weapon');
        const leftVal = box.style.left;
        const topVal = box.style.top;
        const leftValInt = parseInt(leftVal, 10);
        const topValInt = parseInt(topVal, 10);
        const finalPos = blockMovement(topValInt, leftValInt, false, false);
        const draggableItem = document.querySelector('.dragme');

        if (window.allowMovement) {
            if (Object.values(d).includes(true)) {
                window.keyDown = true;
            }

            let myTop;
            if (window.gravityMode) {
                const GRAVITY = 0.5;
                const MAX_FALL = 12;
                const MAX_STEP = 3;
                window.jumpVelocity = Math.min(window.jumpVelocity + GRAVITY, MAX_FALL);

                let remaining = window.jumpVelocity;
                let currentTop = topValInt;
                let blocked = false;

                while (Math.abs(remaining) > 0.01 && !blocked) {
                    const step = remaining > 0
                        ? Math.min(remaining, MAX_STEP)
                        : Math.max(remaining, -MAX_STEP);
                    const testTop = Math.round(currentTop + step);

                    box.style.top = testTop + 'px';
                    const testPos = blockMovement(testTop, leftValInt, false, false);
                    box.style.top = topVal;

                    if (step > 0 && testPos.top < testTop) {
                        // Hit a floor while falling — land here.
                        window.isGrounded = true;
                        window.canDoubleJump = 0 < parseFloat(box.dataset.doubleJump || '0');
                        window.jumpVelocity = 0;
                        myTop = currentTop;
                        blocked = true;
                    } else if (step < 0 && testPos.top > testTop) {
                        // Hit a ceiling while jumping — cancel upward velocity.
                        window.jumpVelocity = 0;
                        myTop = currentTop;
                        blocked = true;
                    } else {
                        currentTop += step;
                        remaining -= step;
                    }
                }

                if (!blocked) {
                    window.isGrounded = false;
                    myTop = Math.round(currentTop);
                }
            } else {
                myTop = miroExplorePosition(
                    finalPos.top,
                    d[87] ? 87 : 38,
                    d[83] ? 83 : 40,
                    d,
                    stepSpeed(),
                    $newest
                );
            }
            const myLeft = miroExplorePosition(
                finalPos.left,
                d[65] ? 65 : 37,
                d[68] ? 68 : 39,
                d,
                stepSpeed(),
                $newest
            );
            box.style.top = myTop + 'px';
            box.style.left = myLeft + 'px';

            if (weapon && true === window.weaponConnection) {
                weapon.style.top = myTop + weaponPosTop + 'px';
                weapon.style.left = myLeft + weaponPosLeft + 'px';
            }

            if (draggableItem) {
                if (window.dragTop && false !== window.dragTop) {
                    draggableItem.style.top = window.dragTop.higher
                        ? myTop + 450 - window.dragTop.offset + 'px'
                        : myTop + 450 + window.dragTop.offset + 'px';
                }

                if (window.dragLeft && false !== window.dragLeft) {
                    draggableItem.style.left = window.dragLeft.left
                        ? myLeft + 450 - window.dragLeft.offset + 'px'
                        : myLeft + 450 + window.dragLeft.offset + 'px';
                }
            }

            showAirbornePose(box, Object.values(d).includes(true));

            centerCamera(box.querySelector('.orbem-camera-frame') || box, { block: 'nearest' });
        }
    }, characterSpeed);
}

/**
 * In a gravity room, the character in the air.
 *
 * @param {HTMLElement} box #map-character.
 * @param {boolean} moving Whether a movement key is held — landing then goes straight back to walking, not via standing.
 */
let airbornePose = null;
let airborneSide = 'right';
let airborneTicks = 0;

function showAirbornePose(box, moving) {
    'use strict';

    if (!window.gravityMode || !box) {
        return;
    }

    if (box.classList.contains('left-dir')) {
        airborneSide = 'left';
    } else if (box.classList.contains('right-dir')) {
        airborneSide = 'right';
    }

    // Off the ground, not merely slow.
    airborneTicks = window.isGrounded ? 0 : airborneTicks + 1;

    const airborne =
        (airborneTicks > 2 || window.jumpVelocity < -1) &&
        !window.attackContext &&
        !window.mcHurtCooldown &&
        '' === (window.isDragging || '');

    if (!airborne) {
        if (airbornePose) {
            airbornePose = null;

            if (!moving) {
                setStaticMCImage(box, airborneSide, false);
            }
        }

        return;
    }

    const pose = getCharacterSprite(
        window.mainCharacter +
            '-' +
            airborneSide +
            (window.jumpVelocity < 0 ? '-jump' : '-fall')
    );

    if (!pose || '' === pose.getAttribute('src')) {
        return;
    }

    if (!pose.classList.contains('engage')) {
        box.querySelectorAll('.map-character-icon.engage').forEach((img) => {
            img.classList.remove('engage');
        });
        pose.classList.add('engage');
    }

    airbornePose = pose;
}

/**
 * Escape a dynamic class name for use in a CSS selector. WordPress post slugs
 * can start with a digit (e.g. "2-skull-copy-9"), which is a valid class
 * attribute but an invalid raw CSS identifier — so `querySelector('.2-...')`
 * throws a SyntaxError and can abort the whole load. CSS.escape produces a
 * selector-safe form.
 *
 * @param {*} name The class name (may start with a digit / contain specials).
 * @returns {string}
 */
function escClass(name) {
    'use strict';

    return window.CSS && CSS.escape ? CSS.escape(name) : String(name);
}

/**
 * clean class name
 * @param classes
 */
function cleanClassName(classes) {
    'use strict';

    if ('string' === typeof classes) {
        return classes
            .replace('wp-block-group map-item ', '')
            .replace('-map-item', '')
            .replace('drag-dest ', '')
            .replace(' completed-mission', '')
            .replace('wp-block-group enemy-item ', '')
            .replace(' no-point', '')
            .replace(' is-layout-flow', '')
            .replace(' wp-block-group-is-layout-flow', '')
            .replace(' engage', '')
            .replace('wp-block-group map-cutscene ', '')
            .replace('-map-cutscene', '')
            .replace('been-viewed', '')
            .replace(' path-onload', '')
            .replace(' start-timer', '')
            .replace('materialize-item-trigger ', '')
            .replace('-materialize-item', '')
            .replace(' materialized', '')
            .replace('mission-trigger ', '')
            .replace(' hit', '')
            .replace(' hurt', '')
            .replace('-minigame-item', '')
            .replace( ' passable', '')
            .replace('minigame ', '')
            .replace(' pulse-wave-engage', '')
            .replace(' pulse-wave-wave-engage pulse-in', '')
            .replace(' barage-wave-engage', '')
            .replace( ' projectile-wave-engage', '')
            .replace(' selected', '')
            .replace('-cutscene-trigger', '')
            .replace('cutscene-trigger ', '')
            .replace('next-mission ', '')
            .replace('-mission-item', '')
            .replace('mission-item ', '')
            .replace('wp-block-orbem-paragraph-mp3 ', '')
            .replace('explore-character-', '');
    }
}

function setStaticMCImage(mapChar, direction, weaponChange) {
    'use strict';

    // Change to static image.
    const currentCharacterImage = document.querySelector(
        '.map-character-icon.engage'
    );

    if (
        (currentCharacterImage &&
            '' === window.currentCharacterAutoDirection) ||
        (currentCharacterImage && '' !== direction)
    ) {
        // Strip attack tokens (keep any weapon suffix) so a punch id maps to its static.
        let staticId = currentCharacterImage.id
            .replace('-punch', '')
            .replace('-heavy', '')
            .replace('-charged', '')
            .replace(
                window.mainCharacter + '-',
                window.mainCharacter + '-static-'
            );

        direction =
            '' !== window.isDragging ? window.draggingDirection : direction;

        if ('' !== direction) {
            staticId =
                window.mainCharacter +
                '-static-' +
                direction +
                window.isDragging;
        }

        // Look up weaponless so getCharacterSprite prefers the equipped weapon's static.
        if (window.currentWeapon && staticId.endsWith(window.currentWeapon)) {
            staticId = staticId.slice(0, -window.currentWeapon.length);
        }

        const staticVersion = getCharacterSprite(staticId);

        if (staticVersion && '' !== staticVersion.getAttribute('src')) {
            currentCharacterImage.classList.remove('engage');
            staticVersion.classList.add('engage');

            mapChar.dataset.static = 'true';
        }
    }
}

/**
 * Add character hit/interaction ability to spacebar (key 32).
 */
function addCharacterHit() {
    'use strict';

    // Reset shiftispressed if you let go of it.
    document.addEventListener('keydown', (event) => {
        if (false !== window.allowHit) {
            if (true === ['ShiftLeft', 'ShiftRight'].includes(event.code)) {
                shiftIsPressed = true;
            }

            if ('Space' === event.code) {
                spaceIsPressed = true;

                chargeAttackTimeout = setTimeout(() => {
                    if (true === spaceIsPressed) {
                        document.querySelector('#map-character').dataset.charge = 'true';
                        document
                            .querySelector('.game-container')
                            ?.classList.add('charging');
                        chargeAttackInProgress = true;
                    }
                }, 1000);
            }
        }
    });

    document.addEventListener('keyup', characterHitEvent);
    document.querySelector('.action-key').addEventListener('click', characterHitEvent);
}

/**
 * Resolve the punch/attack sprite element for a direction, mirroring the
 * fallback chain used when an attack starts: weapon+attack-type, weapon,
 * base+attack-type, base. Returns the element only when it has a real src.
 *
 * @param {HTMLElement} mapChar    The #map-character element.
 * @param {string}      direction  up/down/left/right.
 * @param {string}      weaponType Weapon suffix (e.g. '-katana') or ''.
 * @param {string}      attackType Attack suffix ('-heavy'/'-charged') or ''.
 * @returns {HTMLElement|null}
 */
function resolvePunchSprite(mapChar, direction, weaponType, attackType) {
    'use strict';

    const ids = [
        `${window.mainCharacter}-${direction}-punch${weaponType}${attackType}`,
        `${window.mainCharacter}-${direction}-punch${weaponType}`,
        `${window.mainCharacter}-${direction}-punch${attackType}`,
        `${window.mainCharacter}-${direction}-punch`,
    ];

    for (const id of ids) {
        const el = mapChar.querySelector('#' + escClass(id));
        if (el && '' !== el.getAttribute('src')) {
            return el;
        }
    }

    return null;
}

/**
 * End an attack's display: clear the attack context and re-engage the normal
 * (non-attack) sprite for the direction the character is now facing, so a turn
 * made mid-attack is reflected once the hold ends. A held movement key makes
 * the movement loop swap to the walking sprite on the next tick.
 *
 * @param {HTMLElement} mapChar The #map-character element.
 * @param {HTMLElement} weapon  The .map-weapon element (carries data-direction).
 */
function restoreSpriteAfterAttack(mapChar, weapon) {
    'use strict';

    if (!window.attackContext) {
        return;
    }

    window.attackContext = null;

    const faceDir =
        'top' === weapon.dataset.direction
            ? 'up'
            : weapon.dataset.direction || 'down';
    const restoreSprite =
        getCharacterSprite(window.mainCharacter + '-static-' + faceDir) ||
        getCharacterSprite(window.mainCharacter + '-' + faceDir);

    mapChar
        .querySelectorAll('.map-character-icon.engage')
        .forEach((img) => img.classList.remove('engage'));
    mapChar
        .querySelectorAll('.map-character-icon.punched')
        .forEach((img) => img.classList.remove('punched'));

    if (restoreSprite && '' !== restoreSprite.getAttribute('src')) {
        restoreSprite.classList.add('engage');
    }
}

function characterHitEvent(event) {
    const weapon = document.querySelector('.map-weapon');
    const weaponType =
        defaultWeapon === weapon.dataset.weapon
            ? ''
            : '-' + weapon.dataset.weapon;

    let attackType = shiftIsPressed ? '-heavy' : '';
    attackType = chargeAttackInProgress ? '-charged' : attackType;

    const direction =
        'top' === weapon.dataset.direction
            ? 'up'
            : weapon.dataset.direction;
    const mapChar = document.querySelector('#map-character');
    const currentImageMapCharacter = mapChar.querySelector(
        '.map-character-icon.engage'
    );
    // A non-default weapon may have its own per-weapon punch sprites uploaded
    // (explore-weapon-images). Those win. When none exist for this
    // character+weapon+direction we fall back to the base punch sprite and
    // overlay the weapon's held image on top instead.
    const hasWeaponSuffix = '' !== weaponType;
    let usedWeaponSprite = false;
    let weaponAnimation = mapChar.querySelector(
        `#${window.mainCharacter}-${direction}-punch${weaponType}${attackType}`
    );

    if (!weaponAnimation || '' === weaponAnimation.getAttribute('src')) {
        weaponAnimation = mapChar.querySelector(
            `#${window.mainCharacter}-${direction}-punch${weaponType}`
        );
    }

    // A weapon-specific punch sprite only "wins" (and suppresses the overlay)
    // when it actually has an image. The per-weapon sprite slots are always
    // rendered — even as empty `src=""` placeholders when no art was uploaded —
    // so an existence check alone is not enough; we must confirm a real src.
    if (
        weaponAnimation &&
        hasWeaponSuffix &&
        '' !== weaponAnimation.getAttribute('src')
    ) {
        usedWeaponSprite = true;
    } else if (
        !weaponAnimation ||
        '' === weaponAnimation.getAttribute('src')
    ) {
        // Fall back to the base (weapon-less) punch sprite so the character
        // still animates a punch while the weapon overlay does the rest.
        const basePunch =
            mapChar.querySelector(
                `#${window.mainCharacter}-${direction}-punch${attackType}`
            ) ||
            mapChar.querySelector(
                `#${window.mainCharacter}-${direction}-punch`
            );
        weaponAnimation =
            basePunch && '' !== basePunch.getAttribute('src')
                ? basePunch
                : null;
    }

    // Show the weapon overlay only when no per-weapon sprite is doing the job
    // and the weapon actually has a held image to display.
    const weaponHeldImage = weapon.dataset.heldImage || '';
    const useWeaponOverlay =
        false === usedWeaponSprite && hasWeaponSuffix && '' !== weaponHeldImage;
    const weaponOverlay = weapon.querySelector('.weapon-overlay');
    const weaponMotionClass = 'weapon-' + (weapon.dataset.motion || 'swing');

    if (false !== window.allowHit) {
        const manaPoints = document.querySelector(
            `#explore-points .mana-amount`
        );
        const currentPoints = manaPoints ? manaPoints.dataset.amount : 0;
        // When a mana bar exists it doubles as ammo: projectile weapons (and
        // spells) require it and consume it. With no mana bar, projectiles are
        // unlimited.
        const hasManaBar = null !== manaPoints;

        if (true === ['ShiftLeft', 'ShiftRight'].includes(event.code)) {
            shiftIsPressed = false;
        }

        if ('Space' === event.code || event.target.classList.contains('action-key')) {
            // Trigger charge attack if started.
            spaceIsPressed = false;
            clearTimeout(chargeAttackTimeout);

            if (weapon && false === heavyAttackInProgress) {
                const isSpell = weapon.classList.contains('spell');
                weaponTime = weapon.classList.contains('protection')
                    ? 8000
                    : 100;

                // Per-character attack display time (ms). Extends how long the
                // attack image shows so animated (GIF) sprites can finish.
                // Empty/unset keeps the defaults. Charged uses its own value;
                // normal uses its own (but never overrides protection's long
                // hold). Heavy is applied on its reset timeout further below.
                const normalAttackTime = parseInt(mapChar.dataset.normalAttackTime, 10);
                const chargedAttackTime = parseInt(mapChar.dataset.chargedAttackTime, 10);

                if (chargeAttackInProgress) {
                    weaponTime = 0 < chargedAttackTime ? chargedAttackTime : 1000;
                } else if (
                    false === weapon.classList.contains('protection') &&
                    0 < normalAttackTime
                ) {
                    weaponTime = normalAttackTime;
                }

                // Only engage if not a spell or mana is not 0.
                if (
                    'true' === weapon.dataset.projectile ||
                    (true === isSpell && 0 < currentPoints) ||
                    (false === isSpell)
                ) {
                    weapon.classList.add('engage');

                    if ( chargeAttackInProgress ) {
                        weapon.classList.add('charge-attack-engage');
                    }

                    // Move the (invisible) weapon hitbox out in the attack
                    // direction to give melee reach — but NOT for overlay
                    // weapons, which stay anchored at the character's center and
                    // use the weapon image itself as the hit area (see the
                    // hit-detection loop). This avoids the weapon lurching out
                    // ~100px and snapping back mid-swing.
                    if (false === useWeaponOverlay) {
                        switch (direction) {
                            case 'up':
                                weaponPosTop = window.globalTopPositionOffset - ((currentImageMapCharacter.offsetHeight / 2) + 5);
                                break;
                            case 'down':
                                weaponPosTop = window.globalTopPositionOffset + ((currentImageMapCharacter.offsetHeight / 2) + 5);
                                break;
                            case 'left':
                                weaponPosLeft = window.globalLeftPositionOffset - ((currentImageMapCharacter.offsetWidth / 2) + 5);
                                break;
                            case 'right':
                                weaponPosLeft = window.globalLeftPositionOffset + ((currentImageMapCharacter.offsetWidth / 2) + 5);
                                break;
                        }
                    }

                    // Play the character's punch sprite only when the overlay is
                    // NOT driving the attack. With an overlay weapon equipped the
                    // character keeps its normal (walking/standing) sprite while
                    // the weapon image does the swinging.
                    if (
                        false === useWeaponOverlay &&
                        currentImageMapCharacter &&
                        weaponAnimation &&
                        '' !== weaponAnimation.getAttribute('src')
                    ) {
                        // Don't punch (opacity 0) the sprite we're about to engage.
                        if (currentImageMapCharacter !== weaponAnimation) {
                            currentImageMapCharacter.classList.add('punched');
                        }
                        weaponAnimation.classList.add('engage');

                        // Remember the attack params so that turning during the
                        // display hold re-aims the punch sprite (rather than
                        // showing a walking sprite). Cleared when the hold ends.
                        window.attackContext = { weaponType, attackType };

                        playWeaponSound(weapon);
                    }

                    // Drive the weapon overlay (swing/thrust/shoot) only when no
                    // per-weapon sprite is handling the attack visually. The
                    // overlay's lifecycle is driven entirely by its motion class
                    // (independent of `.engage`, which resets on a shorter timer)
                    // so the animation always plays to completion. It is removed
                    // on animationend, which also hides the overlay via CSS.
                    if (useWeaponOverlay && weaponOverlay) {
                        // Restart the animation from the start on each attack.
                        weapon.classList.remove(weaponMotionClass);
                        void weapon.offsetWidth;
                        weapon.classList.add(weaponMotionClass);

                        weaponOverlay.addEventListener(
                            'animationend',
                            () => {
                                weapon.classList.remove(weaponMotionClass);
                                // End the charge glow when the swing ends.
                                document
                                    .querySelector('.game-container')
                                    ?.classList.remove('charging');
                            },
                            { once: true }
                        );

                        // The punch sprite is skipped for overlay weapons, so
                        // play the weapon sound here for attack feedback.
                        playWeaponSound(weapon);
                    }
                }

                // Consume mana/ammo when a mana bar exists — for spells and for
                // projectile weapons alike. The cost is the weapon's data-value
                // when set, otherwise 1 per shot.
                if (
                    hasManaBar &&
                    0 < currentPoints &&
                    (true === isSpell || 'yes' === weapon.dataset.projectile)
                ) {
                    // Use mana/ammo. Cost is the weapon's ammo cost if set,
                    // else its data-value (spells), else 1 per shot.
                    const objectAmount =
                        parseInt(weapon.dataset.ammoCost, 10) ||
                        parseInt(weapon.getAttribute('data-value'), 10) ||
                        1;

                    // Remove amount to current points.
                    manaPoints.setAttribute(
                        'data-amount',
                        parseInt(currentPoints) - parseInt(objectAmount)
                    );

                    // Add class for notification of point gain.
                    manaPoints.classList.add('engage');

                    // Get new amount.
                    let newAmount =
                        parseInt(currentPoints) - parseInt(objectAmount);
                    newAmount = 0 > newAmount ? 0 : newAmount;

                    // Add new point count to DB.
                    addUserPoints(newAmount, 'mana', 'magic', false, '');

                    // Remove highlight on point bar.
                    setTimeout(() => {
                        manaPoints.classList.remove('engage');
                    }, 500);
                }

                // If spell or user has not hit weapon 3 time consecutively then reset weapon or is projectile.
                if (
                    'true' === weapon.dataset.projectile ||
                    true === isSpell ||
                    (false === isSpell &&
                        false === heavyAttackInProgress &&
                        false === shiftIsPressed)
                ) {
                    // Just inside the animation, so escaping has to beat the swing.
                    if ('end' === mapChar.dataset.damageTime) {
                        setTimeout(() => {
                            hitEnemiesInReach(weapon);
                        }, Math.round(weaponTime * 0.9));
                    }

                    setTimeout(() => {
                        // If heavy attack is not happening then you reset weapon.
                        if (
                            false ===
                            weapon.classList.contains('heavy-engage')
                        ) {
                            weapon.classList.remove('engage');
                            currentImageMapCharacter.classList.remove(
                                'punched'
                            );

                            weaponAnimation?.classList.remove('engage');

                            // End attack display: show the normal (non-attack)
                            // sprite for the direction now faced (the player may
                            // have turned mid-attack, re-aiming the punch sprite).
                            restoreSpriteAfterAttack(mapChar, weapon);

                            // Reset weapon based on direction
                            switch (direction) {
                                case 'up':
                                    weaponPosTop = window.globalTopPositionOffset;
                                    break;
                                case 'down':
                                    weaponPosTop = window.globalTopPositionOffset;
                                    break;
                                case 'left':
                                    weaponPosLeft = window.globalLeftPositionOffset;
                                    break;
                                case 'right':
                                    weaponPosLeft = window.globalLeftPositionOffset;
                                    break;
                            }

                            if (true === chargeAttackInProgress) {
                                chargeAttackInProgress = false;
                                mapChar.dataset.charge = 'false';
                                document
                                    .querySelector('.game-container')
                                    ?.classList.remove('charging');

                                // Remove highlight on point bar.
                                setTimeout(() => {
                                    weapon.classList.remove('charge-attack-engage');
                                    currentImageMapCharacter.classList.remove(
                                        'punched'
                                    );
                                    weaponAnimation?.classList.remove('engage');
                                }, 700);
                            }
                        }
                    }, weaponTime);
                } else if (true === shiftIsPressed) {
                    weapon.classList.add('heavy-engage');
                    heavyAttackInProgress = true;

                    // Per-character heavy attack display time (ms); empty keeps
                    // the default so animated heavy sprites can finish.
                    const heavyAttackTime = parseInt(mapChar.dataset.heavyAttackTime, 10);
                    const heavyTime = 0 < heavyAttackTime ? heavyAttackTime : 500;

                    // Just inside the animation, so escaping has to beat the swing.
                    if ('end' === mapChar.dataset.damageTime) {
                        setTimeout(() => {
                            hitEnemiesInReach(weapon);
                        }, Math.round(heavyTime * 0.9));
                    }

                    setTimeout(() => {
                        heavyAttackInProgress = false;
                        weapon.classList.remove('heavy-engage');
                        weapon.classList.remove('engage');
                        currentImageMapCharacter.classList.remove(
                            'punched'
                        );
                        weaponAnimation?.classList.remove('engage');

                        // End attack display: show the normal sprite for the
                        // direction now faced (turned mid-attack re-aims punch).
                        restoreSpriteAfterAttack(mapChar, weapon);

                        // Reset weapon based on direction
                        switch (direction) {
                            case 'up':
                                weaponPosTop = window.globalTopPositionOffset;
                                break;
                            case 'down':
                                weaponPosTop = window.globalTopPositionOffset;
                                break;
                            case 'left':
                                weaponPosLeft = window.globalLeftPositionOffset;
                                break;
                            case 'right':
                                weaponPosLeft = window.globalLeftPositionOffset;
                                break;
                        }

                        shiftIsPressed = false;
                    }, heavyTime);
                }

                // For shooting. Fire a projectile weapon or spell, but only if
                // there is ammo — when a mana bar exists it must be above 0;
                // with no mana bar, projectiles are unlimited.
                if (
                    weapon &&
                    ('yes' === weapon.dataset.projectile ||
                        true === isSpell) &&
                    (false === hasManaBar || 0 < currentPoints)
                ) {
                    if (true === isSpell) {
                        // Spells keep the magic-weapon path.
                        let weaponLeft = parseInt(
                            weapon.style.left.replace('px', '')
                        );
                        let weaponTop = parseInt(
                            weapon.style.top.replace('px', '')
                        );
                        const playerDirection =
                            weapon.getAttribute('data-direction');

                        switch (playerDirection) {
                            case 'down':
                                weaponTop = weaponTop + 10000;
                                break;
                            case 'top':
                                weaponTop = weaponTop - 10000;
                                break;
                            case 'left':
                                weaponLeft = weaponLeft - 10000;
                                break;
                            case 'right':
                                weaponLeft = weaponLeft + 10000;
                                break;
                        }

                        shootProjectile(
                            weapon,
                            weaponLeft,
                            weaponTop,
                            document,
                            2,
                            isSpell,
                            '.magic-weapon',
                            weapon.dataset.projectile
                        );
                    } else {
                        // Weapon projectile: fly straight in the facing
                        // direction, damaging enemies and stopping at walls.
                        fireWeaponProjectile(weapon);
                    }
                }
            }
        }
    } else if ('Space' === event.code || event.target.classList.contains('action-key')) {
        const indicator = document.querySelector('.indicator-icon');

        if (indicator && true === indicator.classList.contains('engage')) {
            const cutscene = indicator.dataset?.cutscene;
            const sign = indicator.dataset?.sign;
            const minigame = indicator.dataset?.minigame;
            const minigameEl = minigame
                ? document.querySelector('[data-minigame=' + minigame + ']')
                : false;

            if (cutscene && '' !== cutscene) {
                engageCutscene(cutscene, false);
                indicator.dataset.cutscene = '';
            }

            if ('yes' === indicator.dataset.crafting) {
                indicator.dataset.crafting = '';
                openCrafting();
            }

            if (indicator.dataset.interact) {
                const interactWith = document.getElementById(indicator.dataset.interact);

                indicator.dataset.interact = '';
                indicator.classList.remove('engage');
                interactWith?.classList.remove('engage');

                if (interactWith) {
                    document.dispatchEvent(new CustomEvent('orbem:interact', { detail: { id: interactWith.id, element: interactWith } }));
                }
            }

            if (indicator.dataset.enter) {
                const door = document.getElementById(indicator.dataset.enter);

                indicator.dataset.enter = '';
                indicator.classList.remove('engage');
                door?.classList.remove('engage');
                window.allowHit = true;

                if (door && ('function' !== typeof window.orbemMayEnter || false !== window.orbemMayEnter(door))) {
                    enterExplorePoint(door, 'false');
                }
            }

            if (sign && '' !== sign) {
                engageSign(sign);
                indicator.dataset.sign = '';
            }

            if (minigame && minigameEl && '' !== minigame) {
                engageMinigameLogic(minigameEl);
                indicator.dataset.minigame = '';
            }
        }
    }
}

function playWeaponSound(weapon) {
    const weaponSound = weapon?.querySelector('audio');

    if (weaponSound && weaponSound.getAttribute('src')) {
        weaponSound.volume = window.sfxVolume;
        // Rewind so rapid repeated attacks replay the sound.
        weaponSound.currentTime = 0;
        weaponSound.play().catch(() => {});
    }
}

/**
 * Block movement if intersecting with the walls.
 * @param  top
 * @param  left
 * @param  box
 * @param enemy
 * @return {{top, left}}
 */
function blockMovement(top, left, box, enemy) {
    'use strict';

    const finalTop = top;
    const finalLeft = left;
    const mainChar = box !== false ? '.map-character-icon.engage, ' : '';
    const otherWanderers =
        box && 'yes' === box.dataset?.wanderer && !box.classList.contains('enemy-item')
            ? ', .map-item[data-wanderer="yes"]:not(.enemy-item)'
            : '';
    const mainCharEl = document.getElementById('map-character');
    box = box ? box : document.querySelector('.map-character-icon.engage');
    const hazardClass =
        false !== box && 'hazard' === mainCharEl.dataset.ability
            ? ':not([data-hazard="true"])'
            : '';

    const collisionWalls = document.querySelectorAll(
        mainChar +
        '.default-map svg rect, .map-item' +
        hazardClass +
        ':not([data-wanderer="yes"]):not(.explainer-container):not(.materialize-item-trigger):not(.drag-dest):not([data-trigger="true"]):not(.currently-dragging):not([data-passable="true"].no-point):not([data-passable="true"][data-collectable="true"]):not(.passable):not([data-genre="explore-sign"]):not([data-foreground="true"]):not([data-background="true"]), .enemy-item:not([data-enemy-type="runner"])' +
        otherWanderers
    );

    return getBlockDirection(
        collisionWalls,
        box,
        parseInt(finalTop),
        parseInt(finalLeft),
        enemy,
        '' !== mainChar,
    );
}

/**
 * Get left and top locations to move collider.
 *
 * @param  collisionWalls
 * @param  box
 * @param  finalTop       The top position to move if not blocked.
 * @param  finalLeft      The left position to move if not blocked.
 * @param  enemy          The enemy.
 * @param  npc
 * @return {{top: *, left: *, collide: *}}
 */
function getBlockDirection(
    collisionWalls,
    box,
    finalTop,
    finalLeft,
    enemy,
    npc
) {
    'use strict';

    const left = finalLeft;
    const top = finalTop;
    const final = { top: finalTop, left: finalLeft, collide: false };
    const mapChar = document.getElementById('map-character');
    const mapImage = mapChar.querySelector('.map-character-icon.engage');
    const enemyImage = box.querySelector('.character-icon.engage') || box;

    // Movement collision insets.
    // In gravity mode (platforming) we drop the enemy hit inset to 0 so the
    // enemy's full visual sprite is used for wall/item collision — otherwise
    // the inner hitbox is 20px smaller than the sprite and runners visually
    // phase 20px into walls and items before being blocked.
    const enemyHitInset = (true === enemy && !window.gravityMode) ? 20 : 0;
    const playerHitInset = true === enemy ? 20 : 0;

    // Attack/contact insets.
    const enemyAttackInset = true === enemy ? 8 : 0;
    const playerAttackInset = true === enemy ? 8 : 0;

    // Gravity areas inset the player's top only, keeping their true bottom.
    const playerInsetSides = window.gravityMode ? 1 : 2;

    // Gravity sprites are bottom-anchored, so their box hangs off one baseline
    // instead of shifting with each sprite's rendered height.
    const charHeight = parseFloat(mapChar.dataset.characterHeight) || 0;
    const spriteTop = (spriteHeight) =>
        window.gravityMode
            ? window.globalTopPositionOffset + charHeight / 2 - spriteHeight
            : window.globalTopPositionOffset - spriteHeight / 2;

    let enemyTargetCorner = 'center';

    if (true === enemy) {
        if (!box.dataset.targetCorner) {
            const corners = [
                'top-left',
                'top-right',
                'bottom-left',
                'bottom-right',
            ];
            box.dataset.targetCorner =
                corners[Math.floor(Math.random() * corners.length)];
        }

        enemyTargetCorner = box.dataset.targetCorner;
    }

    const isPlayerBox = true !== enemy && true !== npc;
    let cornerOffsetLeft = window.globalLeftPositionOffset - box.offsetWidth / 2;
    let cornerOffsetTop = isPlayerBox
        ? spriteTop(box.offsetHeight)
        : window.globalTopPositionOffset - box.offsetHeight / 2;

    if (true === enemy) {
        switch (enemyTargetCorner) {
            case 'top-left':
                cornerOffsetLeft -= 30;
                cornerOffsetTop -= 30;
                break;
            case 'top-right':
                cornerOffsetLeft += 30;
                cornerOffsetTop -= 30;
                break;
            case 'bottom-left':
                cornerOffsetLeft -= 30;
                cornerOffsetTop += 30;
                break;
            case 'bottom-right':
                cornerOffsetLeft += 30;
                cornerOffsetTop += 30;
                break;
        }
    }

    // Destination/target box around the player.
    const mainCharPos = {
        offsetLeft: mapChar.offsetLeft + cornerOffsetLeft,
        offsetWidth: box.offsetWidth,
        offsetTop: mapChar.offsetTop + cornerOffsetTop,
        offsetHeight: box.offsetHeight,
    };

    // Smaller movement collision box for the player's body.
    const mainCharBodyPos = {
        offsetLeft:
            mapChar.offsetLeft +
            (window.globalLeftPositionOffset - mapImage.offsetWidth / 2) +
            playerHitInset,
        offsetWidth: Math.max(10, mapImage.offsetWidth - playerHitInset * 2),
        offsetTop:
            mapChar.offsetTop +
            spriteTop(mapImage.offsetHeight) +
            playerHitInset,
        offsetHeight: Math.max(
            10,
            mapImage.offsetHeight - playerHitInset * playerInsetSides
        ),
    };

    // Slightly larger attack/contact box for the player's body.
    const mainCharAttackPos = {
        offsetLeft:
            mapChar.offsetLeft +
            (window.globalLeftPositionOffset - mapImage.offsetWidth / 2) +
            playerAttackInset,
        offsetWidth: Math.max(10, mapImage.offsetWidth - playerAttackInset * 2),
        offsetTop:
            mapChar.offsetTop +
            spriteTop(mapImage.offsetHeight) +
            playerAttackInset,
        offsetHeight: Math.max(
            10,
            mapImage.offsetHeight - playerAttackInset * playerInsetSides
        ),
    };

    // Movement collision box for the moving object.
    const finalCharPos =
        true === npc || true === enemy
            ? {
                offsetLeft: finalLeft + (true === enemy ? enemyHitInset : 0),
                offsetTop: finalTop + (true === enemy ? enemyHitInset : 0),
                offsetWidth:
                    true === enemy
                        ? Math.max(
                            10,
                            enemyImage.offsetWidth - enemyHitInset * 2
                        )
                        : box.offsetWidth,
                offsetHeight:
                    true === enemy
                        ? Math.max(
                            10,
                            enemyImage.offsetHeight - enemyHitInset * 2
                        )
                        : box.offsetHeight,
            }
            : mainCharPos;

    // Attack/contact box for enemies only.
    const finalAttackPos =
        true === enemy
            ? {
                offsetLeft: finalLeft + enemyAttackInset,
                offsetTop: finalTop + enemyAttackInset,
                offsetWidth: Math.max(
                    10,
                    enemyImage.offsetWidth - enemyAttackInset * 2
                ),
                offsetHeight: Math.max(
                    10,
                    enemyImage.offsetHeight - enemyAttackInset * 2
                ),
            }
            : finalCharPos;

    let touchingMainChar = false;
    box.dataset.collide = 'false';

    if (
        true === enemy &&
        'runner' === box.dataset.enemyType &&
        elementsOverlap(finalAttackPos, mainCharAttackPos, 0)
    ) {
        touchingMainChar = true;
        startRunnerPunching(box);
    } else if (true === enemy && 'runner' === box.dataset.enemyType) {
        const victim = targetableNpcs().find((npcEl) => elementsOverlap(finalAttackPos, npcEl, 0));

        if (victim) {
            touchingMainChar = true;
            startRunnerPunching(box, victim);
        }
    }

    if (
        collisionWalls &&
        ((false === window.godMode && true !== npc && true !== enemy) ||
            true === npc ||
            true === enemy)
    ) {
        collisionWalls.forEach((collisionWallEle) => {
            let collisionWall = collisionWallEle;
            let moverPos = collisionWallEle.dataset?.passDepth ? feetBox(finalCharPos) : finalCharPos;

            if (mapImage.id === collisionWall.id) {
                collisionWall = true === enemy ? mainCharBodyPos : mainCharPos;

                if (window.orbemDepthSort && true === npc && box.dataset?.passDepth) {
                    collisionWall = feetBox(collisionWall);
                    moverPos = feetBox(finalCharPos);
                }
            }

            if (
                box !== collisionWallEle &&
                elementsOverlap(moverPos, collisionWall, 0)
            ) {
                // Same measurement elementsOverlap just used.
                const wallBox = collisionBox(collisionWall, moverPos);

                const collisionWallRight =
                    wallBox.offsetLeft + wallBox.offsetWidth;
                const collisionWallLeft = wallBox.offsetLeft;
                const collisionWallTop = wallBox.offsetTop;
                const collisionWallBottom =
                    wallBox.offsetTop + wallBox.offsetHeight;
                const characterRight =
                    moverPos.offsetLeft + moverPos.offsetWidth;
                const characterLeft = moverPos.offsetLeft;
                const characterTop = moverPos.offsetTop;
                const characterBottom =
                    moverPos.offsetTop + moverPos.offsetHeight;

                final.collide = true;
                box.dataset.collide = 'true';

                const topCollision =
                    collisionWallBottom > characterTop &&
                    collisionWallTop < characterTop &&
                    collisionWallBottom < characterTop + 10;
                const bottomCollision =
                    collisionWallTop <= characterBottom &&
                    collisionWallBottom > characterBottom &&
                    collisionWallTop > characterBottom - 10;
                const leftCollision =
                    collisionWallRight > characterLeft &&
                    collisionWallLeft < characterLeft;
                const rightCollision =
                    collisionWallLeft < characterRight &&
                    collisionWallRight > characterRight;

                let adjust = true === enemy ? 5 : stepSpeed();
                adjust = true === npc ? 1 : adjust;

                if (
                    leftCollision &&
                    !rightCollision &&
                    !topCollision &&
                    !bottomCollision
                ) {
                    final.left = left + adjust;
                    final.collide = true;
                    box.dataset.collide = 'true';
                }

                if (
                    rightCollision &&
                    !leftCollision &&
                    !topCollision &&
                    !bottomCollision
                ) {
                    final.left = left - adjust;
                    final.collide = true;
                    box.dataset.collide = 'true';
                }

                // Only treat a wall's bottom edge as a ceiling when the player
                // is genuinely underneath it — i.e. their horizontal center falls
                // within the wall's width. When the player is beside a wall (only
                // the edge of their hitbox overlaps), their center is outside the
                // wall's horizontal extent. Stacked walls create a seam at the
                // top of the lower wall; without this guard, that seam fires as a
                // ceiling the instant the player tries to jump beside the stack,
                // cancelling upward velocity even though the player is not under it.
                const characterCenterX = (characterLeft + characterRight) / 2;
                const playerIsBelowWall =
                    characterCenterX > collisionWallLeft &&
                    characterCenterX < collisionWallRight;
                if (topCollision && !bottomCollision && playerIsBelowWall) {
                    final.top = top + adjust;
                    final.collide = true;
                    box.dataset.collide = 'true';
                }

                if (bottomCollision && !topCollision) {
                    final.top = top - adjust;
                    final.collide = true;
                    box.dataset.collide = 'true';
                }
            }
        });
    }

    if (true === enemy && false === touchingMainChar) {
        stopRunnerPunching(box, true);
    }

    return final;
}

/**
 * Check if elements are touching.
 *
 * @param  rect1
 * @param  rect2
 * @param  buffer
 * @return {boolean}
 */
const collisionBoxCache = new WeakMap();

/**
 * Offset geometry for a collision candidate, in playfield pixels.
 *
 * @param el
 * @return {object}
 */
function collisionBox(el, against) {
    'use strict';

    if (against && window.orbemSolidBox && el && el.dataset && undefined !== el.offsetLeft) {
        const solid = window.orbemSolidBox(el, collisionBox(el), collisionBox(against));

        if (solid) {
            return solid;
        }
    }

    if (el && el.dataset && el.dataset.passDepth && undefined !== el.offsetLeft) {
        return passBox(el);
    }

    if (!el || undefined !== el.offsetLeft || !el.ownerSVGElement || 'function' !== typeof el.getBBox) {
        return el;
    }

    let box = collisionBoxCache.get(el);

    if (!box) {
        const bbox = el.getBBox();

        box = {
            offsetLeft:   bbox.x,
            offsetTop:    bbox.y,
            offsetWidth:  bbox.width,
            offsetHeight: bbox.height,
        };

        collisionBoxCache.set(el, box);
    }

    return box;
}

function passBox(el) {
    'use strict';

    const depth = parseFloat(el.dataset.passDepth) || 0;
    const width = el.offsetWidth;
    const height = el.offsetHeight;
    const box = { offsetLeft: el.offsetLeft, offsetTop: el.offsetTop, offsetWidth: width, offsetHeight: height };

    if (0 >= depth) {
        return box;
    }

    switch (el.dataset.passSide || 'top') {
        case 'bottom':
            box.offsetHeight = Math.max(1, height - depth);
            break;
        case 'left':
            box.offsetLeft += Math.min(depth, width - 1);
            box.offsetWidth = Math.max(1, width - depth);
            break;
        case 'right':
            box.offsetWidth = Math.max(1, width - depth);
            break;
        default:
            box.offsetTop += Math.min(depth, height - 1);
            box.offsetHeight = Math.max(1, height - depth);
    }

    return box;
}

function npcIsHeld(npc) {
    'use strict';

    return 'false' === npc.dataset.canmove || 'true' === npc.dataset.talkHold;
}

function npcNear(npc, part, near) {
    'use strict';

    npc._near = npc._near || {};
    npc._near[part] = near;

    if (!npc._near.body && !npc._near.talk) {
        npc._afkLeft = false;
        npc._heldSince = 0;
    }
}

function holdNpc(npc) {
    'use strict';

    const now = Date.now();

    if (npc._afkLeft) {
        return false;
    }

    if (!npc._heldSince || document.querySelector('.map-cutscene.engage')) {
        npc._heldSince = now;
    }

    if (now - npc._heldSince > NPC_AFK_HOLD) {
        npc._afkLeft = true;
        return false;
    }

    const held = window.heldNpc;

    if (held && held !== npc && held.isConnected && npcIsHeld(held)) {
        return false;
    }

    window.heldNpc = npc;

    return true;
}

function releaseNpc(npc) {
    'use strict';

    if (window.heldNpc === npc && !npcIsHeld(npc)) {
        window.heldNpc = null;
    }
}

function feetBox(pos) {
    'use strict';

    const height = Math.min(24, Math.max(8, pos.offsetHeight * 0.15));

    return {
        offsetLeft: pos.offsetLeft + pos.offsetWidth * 0.2,
        offsetWidth: pos.offsetWidth * 0.6,
        offsetTop: pos.offsetTop + pos.offsetHeight - height,
        offsetHeight: height,
    };
}

function sortByDepth(item, player) {
    'use strict';

    if (window.orbemDepthSort) {
        return;
    }

    const side = item.dataset.passSide || 'top';

    if ('top' !== side && 'bottom' !== side) {
        return;
    }

    if (undefined === item.dataset.passLayer) {
        item.dataset.passLayer = item.style.zIndex || window.getComputedStyle(item).zIndex || '1';
    }

    const solid = passBox(item);
    const feet = player.offsetTop + player.offsetHeight;
    const behind = feet < solid.offsetTop + solid.offsetHeight;
    const zIndex = behind ? String(Math.max(2, parseInt(item.dataset.passLayer, 10) || 1)) : '0';

    if (item.style.zIndex !== zIndex) {
        item.style.zIndex = zIndex;
    }
}

function elementsOverlap(rect1, rect2, buffer) {
    'use strict';

    const isMainCharacter = rect2?.classList ? rect2.classList.contains('map-character-icon') : false;
    const isEnemy = rect1?.classList ? rect1.classList.contains('enemy-item') : false;
    const hitboxInset = (isMainCharacter && isEnemy) ? (parseFloat(rect2.offsetParent.dataset.hitboxInset) || 0) : 0;

    // Either side can be the obstacle.
    const box1 = collisionBox(rect1, rect2);
    const box2 = collisionBox(rect2, rect1);

    const rect1Right  = box1.offsetLeft + box1.offsetWidth;
    const rect1Left   = box1.offsetLeft;
    const rect1Top    = box1.offsetTop;
    const rect1Bottom = box1.offsetTop  + box1.offsetHeight;

    // Gravity areas keep the sprite's true bottom so ground contact is honest.
    const bottomInset = window.gravityMode ? 0 : hitboxInset;

    const rect2Right  = box2.offsetLeft + box2.offsetWidth  - hitboxInset;
    const rect2Left   = box2.offsetLeft                     + hitboxInset;
    const rect2Top    = box2.offsetTop                      + hitboxInset;
    const rect2Bottom = box2.offsetTop  + box2.offsetHeight - bottomInset;

    return (
        false ===
        (rect1Right  + buffer < rect2Left   - buffer ||
            rect1Left   - buffer > rect2Right  + buffer ||
            rect1Bottom + buffer < rect2Top    - buffer ||
            rect1Top    - buffer > rect2Bottom + buffer)
    );
}

function theHazardOverlap(el1, el2, isParent) {
    'use strict';

    const container = document.querySelector('.game-container');
    const containerRect = container.getBoundingClientRect();
    const hitboxInset =
        el1.offsetParent &&
        el1.offsetParent.dataset?.hitboxInset
            ? parseFloat(el1.offsetParent.dataset.hitboxInset)
            : 0;

    const getRect = (el, applyInset = false) => {
        if (el?.dataset?.hazard) {
            const bossRect = isParent ? el.offsetParent.getBoundingClientRect() : el.getBoundingClientRect();
            const waveRect = el.getBoundingClientRect();

            const bossCenterX = bossRect.left + bossRect.width  / 2;
            const bossCenterY = bossRect.top  + bossRect.height / 2;
            const halfW = waveRect.width  / 2;
            const halfH = waveRect.height / 2;

            return {
                left:   bossCenterX - halfW - containerRect.left,
                right:  bossCenterX + halfW - containerRect.left,
                top:    bossCenterY - halfH - containerRect.top,
                bottom: bossCenterY + halfH - containerRect.top,
            };
        }

        const r = el.getBoundingClientRect();
        const inset = applyInset ? hitboxInset : 0;

        // Gravity areas keep the sprite's true bottom so ground contact is honest.
        const bottomInset = (applyInset && window.gravityMode) ? 0 : inset;

        // The sub-step loop parks the player up to MAX_STEP (3px) above a surface.
        const groundedExt = (applyInset && window.gravityMode && window.isGrounded)
            ? 3
            : 0;

        return {
            left:   r.left   - containerRect.left + inset,
            right:  r.right  - containerRect.left - inset,
            top:    r.top    - containerRect.top  + inset,
            bottom: r.bottom - containerRect.top  - bottomInset + groundedExt,
        };
    };

    const rect1 = getRect(el1, true);
    const rect2 = getRect(el2, false);

    return (
        false ===
        (rect1.right  < rect2.left  ||
            rect1.left   > rect2.right ||
            rect1.bottom < rect2.top   ||
            rect1.top    > rect2.bottom)
    );
}

/**
 * Map for menu types.
 *
 * @param type type.
 */
function isPointItemType(type) {
    'use strict';

    return ['health', 'mana', 'power'].includes(type);
}

function getMenuType(type) {
    'use strict';

    const menuTypes = {
        health: 'items',
        mana: 'items',
        power: 'items',
        gear: 'gear',
        weapons: 'weapons',
        ingredients: 'ingredients',
    };

    return menuTypes[type];
}

/**
 * Do the point animation stuff.
 *
 * @param value
 * @param position
 * @param isMission
 * @param missionPoints
 * @param missionName
 */
function runPointAnimation(
    value,
    position,
    isMission,
    missionPoints,
    missionName
) {
    'use strict';

    let positionType = value.dataset.type;
    positionType = positionType && '' !== positionType ? positionType : 'point';

    if (false === value.classList.contains('map-cutscene')) {
        value.classList.add('engage');
    }

    const thePoints = document.querySelector(
        `#explore-points .${positionType}-amount`
    );
    let currentPoints = 100;

    const objectAmount =
        true === isMission
            ? parseInt(missionPoints)
            : parseInt(value.dataset?.value);

    if (thePoints && 0 < objectAmount) {
        currentPoints = thePoints.dataset.amount;
        if ('point' === positionType) {
            const newPoints =
                parseInt(currentPoints) + parseInt(objectAmount ?? '0');

            // Add amount to current points.
            thePoints.setAttribute('data-amount', newPoints);

            // Add level check.
            const oldLevel = getCurrentLevel(currentPoints);
            const newLevel = getCurrentLevel(newPoints);
            window.nextLevelPointAmount = nextLevelPoints(newLevel);

            levelUp(Math.max(oldLevel, window.orbemLevel || 1), newLevel);

            // Update point count.
            const myPoints = document.querySelector('.my-points');

            if (myPoints) {
                myPoints.textContent = newPoints;
            }
        }

        // Add class for notification of point gain.
        thePoints.classList.add('engage');

        setTimeout(function () {
            thePoints.classList.remove('engage');
        }, 2000);

        // Check if it's a storage item.
        const collectable = value.classList.contains('storage-item');

        // Play sound effect for points.
        playPointSound(positionType, objectAmount);

        // Add new point count to DB.
        addUserPoints(
            parseInt(currentPoints) + parseInt(objectAmount),
            positionType,
            position,
            collectable,
            missionName
        );
    }
}

function playPointSound(pointType, amount) {
    'use strict';

    const character = document.getElementById('map-character');

    if (gainFeedOn()) {
        showGain(pointGainLine(pointType, amount));

        const feedSound = document.getElementById('ching');

        if (feedSound) {
            feedSound.volume = window.sfxVolume;
            feedSound.play();
        }

        return false;
    }

    // Show point graphic.
    character.classList.add('point');

    // Add point type
    if ('' !== pointType) {
        character.classList.add(pointType);
    }

    setTimeout(function () {
        character.classList.add('over');

        setTimeout(function () {
            // Add point type
            if ('' !== pointType) {
                character.classList.remove(pointType);
            }

            character.classList.remove('point');
            character.classList.remove('over');
        }, 500);
    }, 1000);

    const pointSound = document.getElementById('ching');

    if (pointSound) {
        pointSound.volume = window.sfxVolume;
        pointSound.play();
    }

    return false;
}

const GAIN_FEED_SPACING = 220;
const GAIN_FEED_LINGER = 4000;
const GAIN_FEED_MOST = 8;
const gainFeedQueue = [];
let gainFeedTimer = null;

function gainFeedOn() {
    'use strict';

    return 'yes' === OrbemOrder.gainFeed;
}

function pointGainLine(pointType, amount) {
    'use strict';

    const labels = { point: 'Points', money: 'Money', health: 'Health', mana: 'Mana', power: 'Power' };
    const moneyImage = document.querySelector('#explore-points .money-image');

    return {
        label: labels[pointType] || 'Points',
        amount: parseInt(amount, 10) || 0,
        image: 'money' === pointType && moneyImage ? moneyImage.getAttribute('src') : '',
        kind: pointType || 'point',
    };
}

function showGain(lines) {
    'use strict';

    if (!gainFeedOn()) {
        return false;
    }

    (Array.isArray(lines) ? lines : [lines]).forEach((line) => {
        if (line && (line.label || line.amount)) {
            gainFeedQueue.push(line);
        }
    });

    if (!gainFeedTimer) {
        nextGainLine();
    }

    return true;
}

window.orbemGain = (lines) => showGain(lines);

function nextGainLine() {
    'use strict';

    const line = gainFeedQueue.shift();

    if (!line) {
        gainFeedTimer = null;

        return;
    }

    let feed = document.getElementById('gain-feed');

    if (!feed) {
        feed = document.createElement('div');
        feed.id = 'gain-feed';
        feed.setAttribute('aria-live', 'polite');
        document.body.appendChild(feed);
    }

    const row = document.createElement('div');
    const amount = parseInt(line.amount, 10);

    row.className = 'gain-line';
    row.dataset.kind = String(line.kind || '');

    if (line.image) {
        const icon = document.createElement('img');

        icon.src = line.image;
        icon.alt = '';
        row.appendChild(icon);
    } else if ('money' === line.kind) {
        const icon = document.createElement('span');

        icon.className = 'gain-symbol';
        icon.textContent = '$';
        row.appendChild(icon);
    }

    if (!isNaN(amount) && 0 !== amount) {
        const count = document.createElement('span');

        count.className = 'gain-amount';
        count.textContent = (0 < amount ? '+' : '') + amount;
        row.appendChild(count);
    }

    const label = document.createElement('span');

    label.className = 'gain-label';
    label.textContent = String(line.label || '');
    row.appendChild(label);

    feed.appendChild(row);

    while (feed.children.length > GAIN_FEED_MOST) {
        feed.firstElementChild.remove();
    }

    requestAnimationFrame(() => row.classList.add('engage'));

    setTimeout(() => {
        row.classList.add('leaving');
        setTimeout(() => row.remove(), 400);
    }, GAIN_FEED_LINGER);

    gainFeedTimer = setTimeout(nextGainLine, GAIN_FEED_SPACING);
}

/**
 * This will hold all in-game transport functionality.
 */
function engageTransportFunction() {
    'use strict';

    const container = document.querySelector('.game-container');
    const character = document.querySelector('#map-character');

    document.addEventListener('keydown', (e) => {
        // If Shift is pressed start transport sequence.
        if (
            16 === e.keyCode &&
            canCharacterInteract('', character, 'programming')
        ) {
            container.addEventListener('click', clickTransport);
        }
    });

    document.addEventListener('keyup', (e) => {
        if (
            16 === e.keyCode &&
            canCharacterInteract('', character, 'programming')
        ) {
            container.removeEventListener('click', clickTransport);
        }
    });
}

/**
 * This will hold all in-game draggable functionality.
 */
function engageDraggableFunction() {
    'use strict';

    document.addEventListener('keydown', dragItemEvent);

    const actionKey = document.querySelector('.action-key');

    if ( actionKey ) {
        actionKey.addEventListener('click', dragItemEvent);
    }
}

function dragItemEvent(e) {
    if ('Space' === e.code || e.target.classList.contains('action-key')) {
        const dragmeitem = document.querySelector('.dragme');

        if (
            dragmeitem &&
            true === dragmeitem.classList.contains('currently-dragging')
        ) {
            // Reengage hit.
            setTimeout(() => {
                window.allowHit = true;
            }, 100);

            const dragmeitemTop = parseInt(
                dragmeitem.style.top.replace('px', '')
            );

            dragmeitem.classList.remove('currently-dragging');
            dragmeitem.classList.remove('dragme');

            dragmeitem.style.left = window.dragLeft.left
                ? parseInt(dragmeitem.style.left.replace('px', '')) -
                2 +
                'px'
                : parseInt(dragmeitem.style.left.replace('px', '')) +
                2 +
                'px';
            dragmeitem.style.top = window.dragTop.higher
                ? dragmeitemTop - 2 + 'px'
                : dragmeitemTop + 2 + 'px';

            window.dragLeft = false;
            window.dragTop = false;
            window.isDragging = '';
            window.draggingDirection = '';

            // Check if drop position is on draggable destination.
            const cleanClass = cleanClassName(dragmeitem.className);
            const dragDest = document.querySelector(
                '.' + escClass(cleanClass) + '-drag-dest-map-item'
            );

            if (dragDest) {
                const dragDestLeft =
                    parseInt(dragDest.style.left.replace('px', '')) +
                    dragDest.offsetWidth / 2;
                const dragDestTop =
                    parseInt(dragDest.style.top.replace('px', '')) +
                    dragDest.offsetHeight / 2;
                const dragItemLeft =
                    parseInt(dragmeitem.style.left.replace('px', '')) +
                    dragDest.offsetWidth / 2;
                const dragItemTop =
                    dragmeitemTop + dragmeitem.offsetHeight / 2;
                const topOffset =
                    dragItemTop < dragDestTop
                        ? dragDestTop - dragItemTop
                        : dragItemTop - dragDestTop;
                const leftOffset =
                    dragItemLeft < dragDestLeft
                        ? dragDestLeft - dragItemLeft
                        : dragItemLeft - dragDestLeft;

                if (
                    topOffset < parseInt(dragDest.dataset.offset) &&
                    leftOffset < parseInt(dragDest.dataset.offset) &&
                    false ===
                    dragDest.classList.contains('completed-mission')
                ) {
                    saveMission(
                        dragDest.dataset.mission,
                        document.querySelector(
                            '.' + escClass(dragDest.dataset.mission) + '-mission-item'
                        ),
                        cleanClass
                    );

                    // Add completed mission so you can't keep getting points.
                    dragDest.classList.add('completed-mission');
                    dragmeitem.classList.add('no-point');

                    redirectAfterInteraction(dragmeitem);

                    if ('true' === dragDest.dataset.removable) {
                        dragDest.remove();
                        persistItemRemoval(
                            cleanClassName(dragDest.className),
                            'point',
                            0,
                            2000,
                            '',
                            true
                        );
                    }

                    // Remove drag item if disappear is yes.
                    if ('yes' === dragmeitem.dataset.disappear) {
                        dragmeitem.remove();
                        persistItemRemoval(
                            cleanClass,
                            'point',
                            0,
                            2000,
                            '',
                            true
                        );
                    }
                }
            }

            // Save position of item.
            const filehref = `${OrbemOrder.siteRESTURL}/save-drag/`;

            const jsonString = {
                slug: cleanClass,
                top: dragmeitem.style.top.replace('px', ''),
                left: dragmeitem.style.left.replace('px', ''),
            };

            if (false === isLoggedIn) {
                const dragStorage = JSON.parse(localStorage.getItem('orbem_local_drag') || '{}');
                if (!dragStorage[currentLocation]) dragStorage[currentLocation] = {};
                dragStorage[currentLocation][cleanClass] = {
                    top: dragmeitem.style.top,
                    left: dragmeitem.style.left,
                };
                localStorage.setItem('orbem_local_drag', JSON.stringify(dragStorage));
            } else {
                // Save position of item.
                fetch(filehref, {
                    method: 'POST', // Specify the HTTP method
                    headers: {
                        'Content-Type': 'application/json', // Set the content type to JSON
                        'X-WP-Nonce': OrbemOrder.orbemNonce,
                    },
                    body: JSON.stringify(jsonString), // The JSON stringified payload
                }).then((response) => {
                    // Check if the response status is in the range 200-299
                    if (!response.ok) {
                        throw new Error(
                            'Network response was not ok ' + response.statusText
                        );
                    }
                });
            }
        } else {
            dragItem();
        }
    }
}

/**
 * Dragg item function.
 */
function dragItem() {
    'use strict';

    const itemToDrag = document.querySelector('.dragme');
    const mapCharacter = document.querySelector('#map-character');
    const currentlyDragging = document.querySelector('.currently-dragging');
    const mapCharacterImage = mapCharacter.querySelector(
        '.map-character-icon.engage'
    );
    let dragDirection;

    if (itemToDrag) {
        window.allowHit = false;

        const itemToDragTop = parseInt(itemToDrag.style.top.replace('px', ''));
        const itemToDragLeft = parseInt(
            itemToDrag.style.left.replace('px', '')
        );
        const mapCharacterTop =
            parseInt(mapCharacter.style.top.replace('px', '')) + 450;
        const mapCharacterLeft =
            parseInt(mapCharacter.style.left.replace('px', '')) + 450;

        const itemIsHigher = itemToDragTop < mapCharacterTop;
        const itemIsLeft = itemToDragLeft < mapCharacterLeft;
        const topOffset = itemIsHigher
            ? mapCharacterTop - itemToDragTop
            : itemToDragTop - mapCharacterTop;
        const leftOffset = itemIsLeft
            ? mapCharacterLeft - itemToDragLeft
            : itemToDragLeft - mapCharacterLeft;
        const itemIsActuallyHigher = itemToDragTop < mapCharacterTop - 50;
        const itemIsActuallyLeft = itemToDragLeft < mapCharacterLeft - 50;
        const topActuallyOffset = itemIsActuallyHigher
            ? mapCharacterTop - 50 - itemToDragTop
            : itemToDragTop - (mapCharacterTop - 50);
        const leftActuallyOffset = itemIsActuallyLeft
            ? mapCharacterLeft -
            (45 + mapCharacterImage.offsetWidth / 2) -
            itemToDragLeft
            : itemToDragLeft -
            (mapCharacterLeft - (55 + mapCharacterImage.offsetWidth / 2));

        window.dragTop = { offset: topOffset, higher: itemIsHigher };
        window.dragLeft = { offset: leftOffset, left: itemIsLeft };

        dragDirection =
            itemIsActuallyHigher && topActuallyOffset >= itemToDrag.offsetHeight
                ? 'up'
                : dragDirection;
        dragDirection =
            false === itemIsActuallyHigher &&
            topActuallyOffset >= mapCharacterImage.offsetHeight
                ? 'down'
                : dragDirection;
        dragDirection =
            itemIsActuallyLeft && leftActuallyOffset >= itemToDrag.offsetWidth
                ? 'left'
                : dragDirection;
        dragDirection =
            false === itemIsActuallyLeft &&
            leftActuallyOffset >= mapCharacterImage.offsetWidth
                ? 'right'
                : dragDirection;

        if (undefined === dragDirection) {
            window.dragTop = false;
            window.dragLeft = false;

            return;
        }

        if (currentlyDragging) {
            currentlyDragging.classList.remove('currently-dragging');
        }

        itemToDrag.classList.add('currently-dragging');
        window.isDragging = '-drag';
        window.draggingDirection = dragDirection;
    } else {
        window.dragTop = false;
        window.dragLeft = false;
    }
}

/**
 * Transport character.
 * @param clickE
 */
function clickTransport(clickE) {
    'use strict';

    const container = document.querySelector('.game-container');
    const rect = container.getBoundingClientRect();
    // In a zoomed area the world is drawn scale× larger, so each screen pixel
    // maps to 1/scale world pixels. Convert the click to world coordinates
    // before subtracting the (world-space) camera-centering offset.
    const scale = window.areaScale || 1;
    const x = (clickE.clientX - rect.left) / scale - window.globalLeftPositionOffset;
    const y = (clickE.clientY - rect.top) / scale - window.globalTopPositionOffset;
    const mapCharacter = document.getElementById('map-character');
    const bar = document.querySelector('.power-amount');
    const gauge = bar.querySelector('.gauge');
    const powerAmount = bar ? bar.getAttribute('data-amount') : 0;

    // Stop recharge.
    clearInterval(window.rechargeInterval);

    if (0 < powerAmount) {
        if (
            mapCharacter &&
            'rect' !== clickE.target.tagName &&
            ('true' === clickE.target.dataset.collectable ||
                false === clickE.target.classList.contains('map-item') ||
                'true' === clickE.target.dataset.hazard)
        ) {
            moveCharacter(mapCharacter, y, x, false, false, false, false);
        }

        const newAmount = powerAmount < 0 ? 0 : powerAmount - 25;

        bar.setAttribute('data-amount', newAmount);
        gauge.style.width = newAmount + 'px';
    }

    if (26 > powerAmount) {
        startPowerRecharge(gauge, bar);
    }
}

/**
 * Move the character.
 * @param mapCharacter
 * @param newTop
 * @param newLeft
 * @param gradual
 * @param cutscene
 * @param areaCutscene
 * @param position
 */
function moveCharacter(mapCharacter, newTop, newLeft, gradual, cutscene, areaCutscene, position) {
    'use strict';

    const currentLeft = parseInt(mapCharacter.style.left.replace('px', ''));
    const currentTop = parseInt(mapCharacter.style.top.replace('px', ''));

    // Top bigger/smaller.
    const leftBigger = currentLeft > newLeft;
    const topBigger = currentTop > newTop;
    const leftDiff = leftBigger ? currentLeft - newLeft : newLeft - currentLeft;
    const topDiff = topBigger ? currentTop - newTop : newTop - currentTop;
    let moveCount = 0;
    const weapon = document.querySelector('.map-weapon');

    if (gradual) {
        clearInterval(window.movementInt);

        // Add class to note movement.
        mapCharacter.classList.add('auto-move');

        const biggestDiff = Math.max(topDiff, leftDiff);

        // Top move.
        const moveInt = setInterval(() => {
            if (moveCount <= biggestDiff) {
                let topDown = '';
                let leftRight = '';

                if (topBigger) {
                    mapCharacter.style.top =
                        moveCount <= topDiff
                            ? currentTop - moveCount + 'px'
                            : newTop + 'px';
                    weapon.style.top =
                        parseInt(mapCharacter.style.top.replace('px', '')) +
                        window.globalTopPositionOffset +
                        'px';
                    topDown = 'up';
                } else {
                    mapCharacter.style.top =
                        moveCount <= topDiff
                            ? currentTop + moveCount + 'px'
                            : newTop + 'px';
                    weapon.style.top =
                        parseInt(mapCharacter.style.top.replace('px', '')) +
                        window.globalTopPositionOffset +
                        'px';
                    topDown = 'down';
                }

                if (leftBigger) {
                    mapCharacter.style.left =
                        moveCount <= leftDiff
                            ? currentLeft - moveCount + 'px'
                            : newLeft + 'px';
                    weapon.style.left =
                        parseInt(mapCharacter.style.left.replace('px', '')) +
                        window.globalLeftPositionOffset +
                        'px';
                    leftRight = 'left';
                } else {
                    mapCharacter.style.left =
                        moveCount <= leftDiff
                            ? currentLeft + moveCount + 'px'
                            : newLeft + 'px';
                    weapon.style.left =
                        parseInt(mapCharacter.style.left.replace('px', '')) +
                        window.globalLeftPositionOffset +
                        'px';
                    leftRight = 'right';
                }

                // Change character image based on direction;
                directCharacter(topDown, leftRight, mapCharacter);
            } else {
                // Reenable cutscene click events.
                window.allowCutscene = true;

                // Change character to static.
                const currentMovementImage = mapCharacter.querySelector(
                    '.map-character-icon.engage',
                );

                // Prefer the weapon-specific static sprite, falling back to the
                // base static sprite for overlay-only weapons.
                const newStaticImage = getCharacterSprite(
                    currentMovementImage.id.replace(
                        window.mainCharacter,
                        window.mainCharacter + '-static',
                    ),
                );

                if (
                    currentMovementImage &&
                    false === currentMovementImage.id.includes('static') &&
                    newStaticImage &&
                    '' !== newStaticImage.getAttribute('src')
                ) {
                    currentMovementImage.classList.remove('engage');
                    newStaticImage.classList.add('engage');
                }

                // Reset so you can use static image swap again.
                window.currentCharacterAutoDirection = '';

                // Once cutscene is over reinstate walking privileges. Also only clear this interval after cutscene is over so you know when to walk again.
                if (
                    false === cutscene ||
                    false === cutscene.classList.contains('engage')
                ) {
                    clearInterval(moveInt);
                    movementIntFunc();
                }

                playCutscene(position, areaCutscene);
            }

            moveCount++;
        }, window.moveSpeed);
    } else {
        mapCharacter.style.left = newLeft + 'px';
        mapCharacter.style.top = newTop + 'px';
    }
}

function directCharacter(topDown, leftRight, mapCharacter) {
    'use strict';

    const direction = '' === topDown ? leftRight : topDown;
    const currentImage = mapCharacter.querySelector(
        '.map-character-icon.engage'
    );

    if (direction !== window.currentCharacterAutoDirection) {
        const newImage = getCharacterSprite(
            window.mainCharacter + '-' + direction
        );

        window.currentCharacterAutoDirection = direction;
        mapCharacter.classList.add(direction + '-dir');

        if (newImage && '' !== newImage.getAttribute('src')) {
            if (currentImage) {
                currentImage.classList.remove('engage');
            }

            newImage.classList.add('engage');
        }

        mapCharacter.className = '';
    }
}

/**
 * Get the current level.
 * @param  currentPoints
 * @return {number|string}
 */
function getCurrentLevel(currentPoints) {
    'use strict';

    const points = parseInt(currentPoints, 10) || 0;
    let level = 1;

    if (OrbemOrder.levelMaps) {
        JSON.parse(OrbemOrder.levelMaps)
            .map((threshold) => parseInt(threshold, 10) || 0)
            .sort((a, b) => a - b)
            .forEach((threshold, index) => {
                if (points >= threshold) {
                    level = index + 1;
                }
            });
    }

    return level;
}

function nextLevelPoints(level) {
    'use strict';

    const levels = OrbemOrder.levelMaps ? JSON.parse(OrbemOrder.levelMaps) : [];

    return levels[level] ?? levels[levels.length - 1] ?? 1;
}

function barMax(type) {
    'use strict';

    const bar = document.querySelector(`#explore-points .${type}-amount`);

    return (bar && parseInt(bar.style.width, 10)) || 100;
}

function storedBarAmount(type, amount) {
    'use strict';

    if ('health' !== type && 'mana' !== type) {
        return amount;
    }

    return parseInt(amount, 10) - (barMax(type) - 100);
}

function levelNeeded(itemId) {
    'use strict';

    const needed = parseInt((OrbemOrder.useLevels || {})[itemId], 10) || 0;

    return needed > (window.orbemLevel || 1) ? needed : 0;
}

window.orbemLevelNeeded = levelNeeded;

function levelUp(oldLevel, newLevel) {
    'use strict';

    if (newLevel <= oldLevel) {
        return;
    }

    window.orbemLevel = newLevel;
    window.nextLevelPointAmount = nextLevelPoints(newLevel);

    playSfx('explore_sfx_level_up');

    const currentLevelEl = document.querySelector('.current-level');

    if (currentLevelEl) {
        currentLevelEl.textContent = 'lvl. ' + newLevel;
    }

    const nextLevelEl = document.querySelector('.next-level-points');

    if (nextLevelEl) {
        nextLevelEl.textContent = window.nextLevelPointAmount;
    }

    const growth = (newLevel - oldLevel) * (parseInt(OrbemOrder.levelHealth, 10) || 0);
    const healthBar = document.querySelector('#explore-points .health-amount');

    if (0 < growth && healthBar) {
        const amount = (parseInt(healthBar.dataset.amount, 10) || 0) + growth;

        healthBar.style.width = barMax('health') + growth + 'px';
        healthBar.dataset.amount = amount;

        const gauge = healthBar.querySelector('.gauge');

        if (gauge) {
            gauge.style.width = amount + 'px';
        }

        healthBar.classList.add('grew');
        setTimeout(() => healthBar.classList.remove('grew'), 2000);
    }

    showGain({ label: 'Level ' + newLevel, amount: 0, kind: 'level' });

    document.dispatchEvent(new CustomEvent('orbem:level-up', {
        detail: { level: newLevel, from: oldLevel, health: growth },
    }));
}

function showPlayerPoints(newPoints) {
    'use strict';

    const bar = document.querySelector('#explore-points .point-amount');
    const points = parseInt(newPoints, 10) || 0;
    const oldLevel = window.orbemLevel || getCurrentLevel(bar ? bar.dataset.amount : 0);
    const newLevel = getCurrentLevel(points);

    if (OrbemOrder.explorePoints?.point) {
        OrbemOrder.explorePoints.point.points = points;
    }

    window.nextLevelPointAmount = nextLevelPoints(newLevel);

    if (bar) {
        bar.dataset.amount = points;

        const gauge = bar.querySelector('.gauge');

        if (gauge) {
            gauge.style.width = getPointsGaugeAmount(points);
        }

        bar.classList.add('engage');
        setTimeout(() => bar.classList.remove('engage'), 2000);
    }

    const myPoints = document.querySelector('.my-points');

    if (myPoints) {
        myPoints.textContent = points;
    }

    levelUp(oldLevel, newLevel);
}

window.orbemShowPoints = showPlayerPoints;

function addPlayerPoints(amount, label) {
    'use strict';

    const gained = parseInt(amount, 10) || 0;
    const bar = document.querySelector('#explore-points .point-amount');

    if (0 >= gained || !bar) {
        return 0;
    }

    const total = (parseInt(bar.dataset.amount, 10) || 0) + gained;

    showPlayerPoints(total);

    if (label && gainFeedOn()) {
        showGain({ label, amount: gained, kind: 'point' });

        const ching = document.getElementById('ching');

        if (ching) {
            ching.volume = window.sfxVolume ?? 1;
            ching.play().catch(() => {});
        }
    } else {
        playPointSound('point', gained);
    }

    addUserPoints(total, 'point', 'xp', false, '');

    return total;
}

window.orbemAddPoints = addPlayerPoints;

/**
 *  Recharge power.
 * @param gauge
 * @param bar
 */
function startPowerRecharge(gauge, bar) {
    'use strict';

    window.rechargeInterval = setInterval(() => {
        const currentAmount = parseInt(bar.getAttribute('data-amount'));

        if (100 <= currentAmount) {
            clearInterval(window.rechargeInterval);
        } else {
            bar.setAttribute('data-amount', currentAmount + 1);
            gauge.style.width = currentAmount + 1 + 'px';
        }
    }, 1500);
}

/**
 * All the logic for minigames.
 * @param minigameTrigger
 */
function engageMinigameLogic(minigameTrigger) {
    'use strict';

    const theMinigame = document.querySelector(
        '.' + escClass(minigameTrigger.dataset.minigame) + '-minigame-item'
    );

    if (theMinigame) {
        const music = theMinigame.dataset.music;
        let missionElExists = false;
        const minigameMission = theMinigame.dataset.mission;
        let missionEl = false;

        if (minigameMission && '' !== minigameMission) {
            missionEl = document.querySelector(
                '.' + escClass(minigameMission) + '-mission-item'
            );

            if (missionEl) {
                missionElExists = missionEl.classList.contains('engage');
            }
        }

        if (missionElExists) {
            window.allowMovement = false;
            theMinigame.classList.add('engage');
            minigameTrigger.classList.add('hit');

            // start the music
            if (music && '' !== music) {
                playSong(music, minigameMission);
            }

            let draggedContainer = null;
            let offsetX = 0;
            let offsetY = 0;

            // Handle the dragstart event
            const handleDragStart = (event) => {
                event.preventDefault();
                draggedContainer = event.target; // Get the container element
                if (draggedContainer) {
                    // Calculate the offset of the mouse from the top-left corner of the container
                    const rect = draggedContainer.getBoundingClientRect();
                    offsetX = event.clientX - rect.left;
                    offsetY = event.clientY - rect.top;

                    event.dataTransfer.setData('text/plain', '');

                    // Add mousemove event listener to update container position
                    document.addEventListener('mousemove', handleMouseMove);
                }
            };

            // Handle the mousemove event to update container position
            const handleMouseMove = (event) => {
                if (draggedContainer) {
                    // Calculate the mouse position relative to the .default-map element
                    const mapRect = theMinigame.getBoundingClientRect();
                    const mouseX = event.clientX - mapRect.left;
                    const mouseY = event.clientY - mapRect.top;

                    // Update container position based on mouse position relative to the container
                    draggedContainer.style.position = 'fixed';
                    draggedContainer.style.zIndex = '9';
                    draggedContainer.style.left = `${mouseX - offsetX}px`;
                    draggedContainer.style.top = `${mouseY - offsetY}px`;
                }
            };

            // Handle the dragend event
            const handleDragEnd = () => {
                if (draggedContainer) {
                    // Clear the reference to the dragged container
                    draggedContainer = null;

                    // Remove mousemove event listener
                    document.removeEventListener('mousemove', handleMouseMove);

                    // Did you cover all the solder points.
                    const minigames = document.querySelectorAll('.minigame');

                    if (minigames) {
                        minigames.forEach((minigame) => {
                            const computerChip =
                                minigame.querySelector('.computer-chip');
                            const solderPoints =
                                computerChip.querySelectorAll('ellipse');
                            const wireWrap =
                                minigame.querySelector('.draggable-images');
                            const wires = wireWrap.querySelectorAll(
                                '.minigame-draggable-image'
                            );

                            function isOverlapping(wire, solderPoint) {
                                const wireRect = wire.getBoundingClientRect();
                                const solderPointBBox =
                                    solderPoint.getBoundingClientRect();

                                return !(
                                    wireRect.right < solderPointBBox.left ||
                                    wireRect.left > solderPointBBox.right ||
                                    wireRect.bottom < solderPointBBox.top ||
                                    wireRect.top > solderPointBBox.bottom
                                );
                            }

                            function areAllSVGsCovered(wires, solderPoints) {
                                for (const solderPoint of solderPoints) {
                                    let covered = false;
                                    for (const wire of wires) {
                                        if (isOverlapping(wire, solderPoint)) {
                                            covered = true;
                                            break;
                                        }
                                    }
                                    if (!covered) {
                                        return false;
                                    }
                                }
                                return true;
                            }

                            if (areAllSVGsCovered(wires, solderPoints)) {
                                computerChip.style.display = 'none';
                                wireWrap.style.display = 'none';

                                engageProgrammingStep(
                                    minigameMission,
                                    missionEl,
                                    minigame
                                );
                            }
                        });
                    }
                }
            };

            // Get all container elements within the .wp-block-group.wires container
            const containers = document.querySelectorAll(
                '.minigame-draggable-image'
            );

            // Add the dragstart and dragend event listeners to each container
            containers.forEach((container) => {
                container.addEventListener('dragstart', handleDragStart);
                container.addEventListener('mouseup', handleDragEnd);
            });
        }
    }
}

function engageProgrammingStep(minigameMission, missionEl, minigame) {
    'use strict';

    const programmingOutput = minigame.querySelector('.programming-output');
    const minigameProgramming = minigame.querySelector('.minigame-programming');
    const programmingSubject = minigame.querySelector('.programming-subject');
    const textAreaInput = programmingOutput.querySelector('textarea');

    if (minigameProgramming && programmingSubject) {
        minigameProgramming.classList.add('engage');
        programmingSubject.classList.add('engage');
    }

    if (programmingOutput && programmingSubject && textAreaInput) {
        programmingOutput.prepend(programmingSubject);
        textAreaInput.focus();
        const programmingWord = programmingSubject.querySelector('strong');
        const binaryAnswer = textToBinary(programmingWord.textContent);

        textAreaInput.addEventListener('keyup', (e) => {
            if (13 === e.which) {
                const textAreaToCheck =
                    programmingOutput.querySelector('textarea');

                if (
                    parseInt(textAreaToCheck.value) === parseInt(binaryAnswer)
                ) {
                    saveMission(minigameMission, missionEl, minigameMission);
                    minigame.classList.remove('engage');

                    // Reengage walking.
                    window.allowMovement = true;

                    // Trigger after minigame is complete.
                    afterMinigame(minigame);
                }
            }
        });
    }
}

/**
 * What happens after a minigame is completed
 * @param minigame
 */
function afterMinigame(minigame) {
    'use strict';

    const minigameName = cleanClassName(minigame.className);
    const cutscene = document.querySelector(
        '.map-cutscene[data-minigame="' + minigameName + '"]'
    );

    if (cutscene) {
        engageCutscene(cleanClassName(cutscene.className), false);
    }

    let newMusic = '';

    if (OrbemOrder.musicNames) {
        newMusic = JSON.parse(OrbemOrder.musicNames)[currentLocation];
    }

    // restart level music.
    if (minigame.dataset.music && '' !== minigame.dataset.music && newMusic) {
        playSong(newMusic, currentLocation);
    }
}

function textToBinary(str) {
    'use strict';

    let output = '';
    str.split('').forEach((element) => {
        const char = element.charCodeAt(0).toString(2);
        output += ('00000' + char).slice(-5).concat('');
    });
    return output;
}

async function makeTalk(text, voiceName, providedAudio, explainer) {
    'use strict';

    let noVoice = false;
    const autoplayCutscene = document.querySelector('main').dataset?.autoplaycutscene;

    if (
        true === text.includes('**') ||
        '' === text ||
        '…' === text ||
        '...' === text
    ) {
        setTimeout(() => {
            window.nextDialogue = true;
        }, 1500);
        return;
    }

    if (false !== providedAudio) {
        talkAudio = providedAudio;
        talkAudio.volume = scaleDbToUnit(parseInt(window.talkingVolume));
        talkAudio.play();

        talkAudio.addEventListener('ended', () => {
            if (false === explainer && 'false' !== autoplayCutscene) {
                window.nextDialogue = true;
            }
        });
    } else {
        noVoice = true;
    }

    const apiKey = OrbemOrder.TTSAPIKEY ?? '';

    if (false === providedAudio && '' !== apiKey && voiceName && '' !== voiceName) {
        noVoice = false;
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
        const pitch = 0;

        const speakingRate = 1.2;

        const requestBody = {
            input: { ssml: '<speak>' + text + '</speak>' },
            voice: {
                name: voiceName,
                languageCode: 'en-US', // Make sure this matches the language of the voice name
            },
            audioConfig: {
                audioEncoding: 'MP3',
                volumeGainDb: parseInt(window.talkingVolume) + 7,
            },
        };

        if (pitch && speakingRate) {
            requestBody.audioConfig.pitch = pitch;
            requestBody.audioConfig.speakingRate = speakingRate;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json();
            const audioContent = data?.audioContent;

            // Play the audio
            talkAudio = new Audio(`data:audio/mp3;base64,${audioContent}`);
            talkAudio.volume = 0.5;
            await talkAudio.play();

            talkAudio.addEventListener('ended', () => {
                if (false === explainer && 'false' !== autoplayCutscene) {
                    window.nextDialogue = true;
                }
            });
        } catch (error) {
            window.audioError = error.message;
        }
    }

    if (noVoice && 'false' !== autoplayCutscene) {
        window.nextDialogue = true;
    }

    function scaleDbToUnit(value, dbMin = -40, dbMax = 16) {
        return (value - dbMin) / (dbMax - dbMin);
    }
}

function startTheTimer(timeAmount) {
    'use strict';

    if (false === timerCountDownHit) {
        timerCountDownHit = true;

        const timer = document.createElement('div');
        timer.className = 'timer-countdown';
        let countDown = parseInt(timeAmount / 1000).toString();
        timer.style.position = 'fixed';
        timer.style.left = '50%';
        timer.style.transform = 'translateX(-50%)';
        timer.style.top = '1rem';
        timer.style.fontSize = '2rem';
        timer.style.zIndex = '99999';
        timer.textContent = countDown;
        const container = document.querySelector('.game-container');

        if (container) {
            container.appendChild(timer);
        }

        timerCountDownInterval = setInterval(() => {
            const timerCountDown = document.querySelector('.timer-countdown');
            const previousContent = parseInt(timerCountDown.textContent);
            if (0 !== previousContent) {
                countDown = previousContent;
            }

            timerCountDown.textContent = 0 < countDown ? countDown - 1 : 0;

            if ('0' === timerCountDown.textContent) {
                timerCountDown.remove();
                clearInterval(timerCountDownInterval);
                timerCountDownHit = false;
            }
        }, 1000);
    }
}

function playStartScreenMusic(play) {
    'use strict';

    const startMusic = document.getElementById('start-screen-music');
    const musicUnmute = document.getElementById('music-unmute');
    const fadeDuration = 3000; // 3 seconds
    const fadeStep = 0.1; // Volume increment step
    const intervalTime = fadeDuration * fadeStep;

    if (startMusic && false !== play) {
        startMusic.volume = 0; // Start with volume at 0
        startMusic.play(); // Start playing the audio
        startMusic.muted = false;

        if (musicUnmute) {
            musicUnmute.textContent = '🔉';

            musicUnmute.addEventListener('click', () => {
                startMusic.muted = !startMusic.muted;
                musicUnmute.textContent = startMusic.muted ? '🔇' : '🔉';
            });
        }

        const fadeInInterval = setInterval(() => {
            if (startMusic.volume < 0.7) {
                startMusic.volume += fadeStep; // Gradually increase volume
            } else {
                clearInterval(fadeInInterval); // Stop the interval when volume reaches 1
            }
        }, intervalTime);
    } else if (startMusic) {
        startMusic.remove();
        musicUnmute.remove();
    }
}

/**
 * Check if you should be hurt by the hazard.
 */
function checkIfHazardHurts() {
    'use strict';

    setInterval(() => {
        if (true === inHazard) {
            const hurtAmount = hazardItem && hazardItem.classList?.contains('enemy-item')
                ? damageTaken(window.theHazardValue)
                : parseInt(window.theHazardValue);
            const currentHealth = getCurrentPoints('health');
            const newAmount = parseInt(currentHealth) - hurtAmount;
            hurtAnimation();

            addUserPoints(newAmount, 'health', 'hazard', '');
        }

        if (false !== hazardItem) {
            const mapChar = document.getElementById('map-character');

            // Push character away from hazard center.
            pushCharacter(25, hazardItem, mapChar);
        }
    }, 1000);
}

function hurtAnimation() {
    'use strict';

    clearTimeout(hurtTimeout);
    const mapCharacter = document.getElementById('map-character');
    const direction = mapCharacter.className.replace('-dir', '');
    const currentImageMapCharacter = mapCharacter.querySelector(
        '.map-character-icon.engage'
    );

    const hurtImage = mapCharacter.querySelector(
        `#${window.mainCharacter}-${direction}-hurt`
    );

    if (mapCharacter) {
        playHurtSound(mapCharacter);

        if (hurtImage && '' !== hurtImage.getAttribute('src')) {
            currentImageMapCharacter.classList.remove('engage');
            hurtImage.classList.add('engage');
        }

        mapCharacter.dataset.hurt = true;

        hurtTimeout = setTimeout(() => {
            if (hurtImage && '' !== hurtImage.getAttribute('src')) {
                currentImageMapCharacter.classList.add('engage');

                hurtImage.classList.remove('engage');
            }
            mapCharacter.dataset.hurt = false;
        }, 500);
    }
}

/**
 * Helper function for logo spin and adds/removes class shortly.
 *
 * @param element
 * @param name
 */
function spinMiroLogo(element, name) {
    'use strict';

    if (element) {
        element.classList.add(name);
        setTimeout(function () {
            element.classList.remove(name);
        }, 1000);
    }
}

// Add the SSO response function for login/signin if it doesn't exist in the theme.
if (typeof window.exploreHandleCredentialResponse !== 'function') {
    window.exploreHandleCredentialResponse = function (response) {
        'use strict';
        // Save position of item.
        const filehref = `${OrbemOrder.siteRESTURL}/google-oauth-callback/`;
        const googleContainer = document.getElementById('g_id_onload');
        const jsonString = {
            credential: response.credential,
            nonce: googleContainer?.dataset?.nonce || '',
        };

        // Save position of item.
        fetch(filehref, {
            method: 'POST', // Specify the HTTP method
            headers: {
                'Content-Type': 'application/json', // Set the content type to JSON
                'X-WP-Nonce': OrbemOrder.orbemNonce,
            },
            body: JSON.stringify(jsonString), // The JSON stringified payload
        })
            .then((response) => {
                if (!response.ok) {
                    throw new Error(
                        'Network response was not ok ' + response.statusText
                    );
                }
                return response.json();
            })
            .then((data) => {
                if (data.success) {
                    window.location.reload();
                }
            });
    };
}

/**
 * Push main character away from direction facing.
 *
 * @param dist The amount of pixels to push character.
 */
function pushMC(dist) {
    'use strict';

    const mc = document.getElementById('map-character');
    const left = parseInt(mc.style.left.replace('px', ''));
    const top = parseInt(mc.style.top.replace('px', ''));
    const dir = mc.className.replace('-dir', '');

    switch (dir) {
        case 'right':
            mc.style.left = left - dist + 'px';
            break;
        case 'left':
            mc.style.left = left + dist + 'px';
            break;
        case 'top':
            mc.style.top = top + dist + 'px';
            break;
        case 'down':
            mc.style.top = top - dist + 'px';
            break;
    }
}

function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceNameInBody(search, replacement) {
    if (search == null || search === "") return;

    const flags = "g";
    const re = new RegExp(escapeRegExp(String(search)), flags);

    // 1) Replace in text nodes
    const textWalker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
    );

    let textNode;
    while ((textNode = textWalker.nextNode())) {
        const v = textNode.nodeValue;
        if (v && re.test(v)) {
            textNode.nodeValue = v.replace(re, replacement);
            re.lastIndex = 0; // reset because we reuse the same regex
        } else {
            re.lastIndex = 0;
        }
    }

    // 2) Replace in attributes (includes data-* attributes)
    const elemWalker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_ELEMENT
    );

    let el;
    while ((el = elemWalker.nextNode())) {
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name;
            const value = attr.value;

            // Optional safety: skip inline event handler attributes like onclick=""
            if (/^on/i.test(name)) continue;

            if (value && re.test(value)) {
                el.setAttribute(name, value.replace(re, replacement));
                re.lastIndex = 0;
            } else {
                re.lastIndex = 0;
            }
        }
    }
}
