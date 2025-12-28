/* global OrbemOrder */

import { engageDevMode } from './devmode';

let persistTimeout;
let saveMissionTimeout;
let saveMaterializedItemTimeout;
let materializedItemsArray = [];
let persistItems = [];
let source = '';
let talkAudio = '';
let typeWriterTimeout;
let shiftIsPressed = false;
let spaceIsPressed = false;
let chargeAttackTimeout;
let bossWaveCount = 0;
let secondWaveHit = false;
let thirdWaveHit = false;
let fourthWaveHit = false;
let shooterInterval;
let inHazard = false;
let hazardItem = false;
let pulsewaveInterval;
let getOutOfHazard;
let hurtTimeout;
let timerCountDownInterval;
let currentLocation = '';
let timerCountDownHit = false;
let weaponPosTop = 400;
let weaponPosLeft = 400;
let hazardCounter = 0;
let pulsewaveTrackInterval;
const defaultWeapon = OrbemOrder.defaultWeapon;

window.mainCharacter = '';
window.godMode = false;
window.noTouch = false;
window.isDragging = '';
window.hazardTime = 600;

document.addEventListener("DOMContentLoaded", function(){
    "use strict";

    currentLocation = document.querySelector( '.game-container' );
    window.mainCharacter = currentLocation.dataset?.main;
    currentLocation = currentLocation.className.replace( 'game-container ', '');

    // TODO: Get multiplayer mode working.
    // var socket = io.connect('https://localhost:3030');
    //
    // // Check for successful connection
    // socket.on('connect', function() {
    //     console.log('Connected to the server!');
    // });
    //
    // const tatami = document.querySelector('.tatami-post-1-map-item');
    //
    // socket.on('elementUpdated', function(data) {
    //     updateElementOnPage(data); // Function to update the DOM based on received data
    // });
    //
    // if (tatami) {
    //     tatami.addEventListener('click', function (e) {
    //         var elementData = {left: e.target.style.left, top: e.target.style.top};
    //         socket.emit('updateElement', elementData); // Send the updated data to the server
    //     });
    // }
    //
    // function updateElementOnPage(data) {
    //     const tatami = document.querySelector('.tatami-post-1-map-item');
    //
    //     if ( tatami ) {
    //         tatami.style.left = (parseInt(data.left.replace('px', '')) + 10) + 'px';
    //         tatami.style.top = (parseInt(data.top.replace('px', '')) + 10) + 'px';
    //     }
    // }

    // Explore page functions.
    window.history.pushState({}, document.title, window.location.pathname);

    // Detect and close intro video if finished.
    const introVideo = document.getElementById('intro-video' );

    if ( introVideo ) {
        const introVideoContainer = document.querySelector('.intro-video.engage');

        introVideo.play();

        // Unmute introvideo.
        const unmute = document.getElementById( 'unmute' );

        if ( unmute ) {
            unmute.addEventListener('click', () => {
                introVideo.muted = !introVideo.muted;
                unmute.textContent = introVideo.muted ? '🔇' : '🔉';
            });
        }

        introVideo.addEventListener('ended', () => {
           if ( introVideoContainer ) {
               introVideoContainer.remove( );
               playStartScreenMusic( true );
           }
        });

        const skipButton = document.getElementById('skip-intro-video');

        if ( skipButton ) {
            skipButton.addEventListener('click', () => {
                introVideo.pause();

                if ( introVideoContainer ) {
                    introVideoContainer.remove();
                }

                playStartScreenMusic( true );
            });
        }
    } else {
        playStartScreenMusic( true );
    }

    // Create account / login swap.
    const createAccount = document.getElementById('explore-create-account');
    const loginAccount = document.getElementById('explore-login-account');
    const loginForm = document.querySelector('.login-form');
    const registerForm = document.querySelector('.register-form');

    if ( createAccount && loginForm && loginAccount) {
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
    if ( 'undefined' !== typeof OrbemOrder.exploreAbilities && 0 < OrbemOrder.exploreAbilities.length && OrbemOrder.exploreAbilities.includes('transportation') ) {
        engageTransportFunction();
    }

    // Engage draggable function.
    engageDraggableFunction();

    // Spell clicks.
    const spells = document.querySelectorAll('.spell');
    const weapon = document.getElementById( 'weapon' );
    const theWeapon = document.querySelector( '.map-weapon' );

    // Define current weapon for images.
    window.currentWeapon = defaultWeapon !== theWeapon.dataset.weapon ? '-' + theWeapon.dataset.weapon : '';

    if ( spells && weapon ) {
        spells.forEach( spell => {
            spell.addEventListener( 'click', () => {
                const currentSpell = document.querySelector( '.spell.engage' );
                const currentWeapon = document.querySelector( '#weapon' );
                const theWeapon = document.querySelector( '.map-weapon' );
                const spellType = spell.getAttribute( 'data-type' );
                const spellName = spell.getAttribute( 'title' );
                const spellAmount = spell.getAttribute('data-value');

                // Remove engage from weapon.
                currentWeapon.classList.remove('engage');

                if ( currentSpell ) {
                    currentSpell.classList.remove( 'engage' );
                }

                spell.classList.add('engage');
                theWeapon.className = 'map-weapon';
                theWeapon.classList.add( spellType );
                theWeapon.classList.add( spellName );
                theWeapon.classList.add( 'spell' );
                theWeapon.setAttribute( 'data-value', spellAmount );
                window.weaponTime = spellAmount;
            } );
        } );

        // Use weapon instead of magic.
        weapon.addEventListener( 'click', () => {
            const currentSpell = document.querySelector( '.spell.engage' );
            const theWeapon = document.querySelector( '.map-weapon' );

            if ( currentSpell ) {
                currentSpell.classList.remove( 'engage' );
                theWeapon.className = 'map-weapon';
                window.weaponTime = 400;
            }

            weapon.classList.add( 'engage' );
        } );
    }

    // Set up character choice.
    const characterChoice = document.querySelector('.character-item > img');
    if ( characterChoice ) {
        addNoPoints();
        characterChoice.classList.remove('engage');
    } else {
        addNoPoints();
    }

    // Set points.
    const thePoints = document.querySelectorAll( '#explore-points .point-bar' );

    if ( thePoints ) {
        thePoints.forEach( point => {
            const amount = point.getAttribute('data-amount');
            const gauge = point.querySelector('.gauge');

            if ( gauge && ( false === point.classList.contains( 'point-amount' ) && false === point.classList.contains( 'money-amount' ) )  ) {
                point.setAttribute( 'data-amount', amount );
                gauge.style.width = amount + 'px';
            } else if (true === point.classList.contains( 'point-amount' )) {
                const newLevel = getCurrentLevel( amount );
                if ( OrbemOrder.levelMaps ) {
                    window.nextLevelPointAmount = JSON.parse(OrbemOrder.levelMaps)[newLevel];

                    point.setAttribute('data-amount', amount);
                    gauge.style.width = getPointsGaugeAmount(amount);
                }
            } else if (true === point.classList.contains( 'money-amount' ) ) {
                point.dataset.amount = amount;
                point.querySelector('.money-text').textContent = amount;
            }
        } );
    }

    document.body.style.position = 'fixed';
    const engageExplore = document.getElementById('engage-explore');
    const tryEngageExplore = document.getElementById('try-engage-explore');
    const loginRegisters = document.querySelectorAll('#login-register');
    const nonLoginWarning = document.querySelector( '.non-login-warning' );
    const loginRegisterCont = document.querySelector('.game-login-create-container');

    if (engageExplore) {
        engageExplore.addEventListener( 'click', function () {
            engageExploreGame();
        } );
    }

    if (tryEngageExplore) {
        tryEngageExplore.addEventListener( 'click', function () {
            nonLoginWarning.classList.add('engage');
        } );
    }

    if (loginRegisters) {
        loginRegisters.forEach( loginRegister => {
            loginRegister.addEventListener('click', function () {
                loginRegisterCont.classList.add('engage');
                nonLoginWarning.classList.remove('engage');
            });
        });
    }

    engageSettingsMenus();

    engageStorageMenus();

    // New game reset.
    const newGame = document.getElementById( 'new-explore' );

    if ( newGame ) {
        newGame.addEventListener('click', async () => {
            window.confirm( 'Are you sure you want to start a new game? All your previously saved data will be lost.' );
            await resetExplore();

            setTimeout(() => {
                window.location.href = OrbemOrder.gameURL;
            }, 1000);
        });
    }
});

function unlockAbilities( pointAmount ) {
    "use strict";

    const unlockables = document.querySelectorAll( '[data-unlockable]' );

    if ( unlockables ) {
        unlockables.forEach( unlockable => {
            const whenToUnlock = unlockable.dataset.unlockable;

            if ( parseInt( pointAmount ) >= parseInt( whenToUnlock ) ) {
                // If spell, give spell ability.
                if ( 'explore-magic' === unlockable.dataset.genre ) {
                    navigator.vibrate(1000);

                    addNewSpell( unlockable.id );

                    // Remove if unlocked.
                    unlockable.remove();
                }
            }
        } );
    }
}

function engageCharacterSelection() {
    "use strict";

    const charactersMenu = document.getElementById( 'characters' );
    // Add crew select click event.
    const crewMates = charactersMenu ? charactersMenu.querySelectorAll( '.character-list .character-item' ) : false;

    if ( crewMates ) {
        crewMates.forEach( crewMate => {
            crewMate.addEventListener( 'click', () => {
                selectNewCharacter( crewMate );

                charactersMenu.classList.remove( 'engage' );
            } );
        } );
    }
}

/**
 * Make npc follow walking path if it exists.
 *
 * @param npc
 * @param cutscene
 */
function moveNPC( npc, cutscene) {
    "use strict";

    let walkingInterval;

    if ( npc ) {

        let oldNpc = false;

        if ( false !== cutscene ) {
            oldNpc = npc;
            npc = cutscene;
        }

        const walkingPath = npc.dataset.path;
        const walkingSpeed = npc.dataset.speed;
        const timeBetween = undefined === npc.dataset?.timebetween ? '0' : npc.dataset.timebetween;
        const repeatPath = npc.dataset?.repeat;
        const wanderer = 'yes' === npc.dataset?.wanderer;

        if ( false !== cutscene && oldNpc ) {
            npc = oldNpc;
        }

        // Check if walking path exists.
        if ( walkingPath && false === wanderer ) {
            const pathArray = JSON.parse(walkingPath);

            pathArray.unshift({'top': npc.style.top.replace('px', ''), 'left': npc.style.left.replace('px', '')});
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
                    if ( 'false' !== npc.dataset?.canmove ) {
                        const currentImage = npc.querySelector('.character-icon.engage');

                        // Set next position to 0 if position is at the end.
                        nextPosition = position === pathCount ? 0 : position + 1;

                        // Get loop amount for how many times to loop interval before switching to next position.
                        loopAmount = getLoopAmount(pathArray[position].left, pathArray[position].top, pathArray[nextPosition].left, pathArray[nextPosition].top, walkingSpeed, timeBetween);

                        // If loopAmount equals loop count, transition to next walking path.
                        if ((loopCount === (loopAmount - 1) || firstRun)) {
                            // Check that current position is not the last position. And move npc if it is not.
                            if (pathCount > position || (firstRun && pathCount === position)) {
                                if ( currentImage ) {
                                    currentImage.classList.remove('engage');
                                }

                                // Get user direction of movement path.
                                moveDirection = regulateTransitionSpeed(pathArray[position].left, pathArray[position].top, pathArray[nextPosition].left, pathArray[nextPosition].top, npc, walkingSpeed);

                                npc.style.left = pathArray[nextPosition].left + 'px';
                                npc.style.top = pathArray[nextPosition].top + 'px';

                                // Update NPC direction image.
                                newImage = npc.querySelector('#' + npcName + moveDirection);

                                if (newImage) {
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

                                    // If not repeat and position is at end, clear interval.
                                } else if ( pathCount === nextPosition ) {
                                    clearInterval(walkingInterval);
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
                            if (parseInt(pathArray[nextPosition].left) === npc.offsetLeft && parseInt(pathArray[nextPosition].top) === npc.offsetTop && true !== npcIsStopped) {
                                setStaticNPCImage(moveDirection,npc);
                                npcIsStopped = true;
                            }

                            currentWorldX = npc.offsetLeft;
                            currentWorldY = npc.offsetTop;
                            previousWorldX = npc.offsetLeft;
                            previousWorldY = npc.offsetTop;
                            requestAnimationFrame(trackNPC);
                        };

                        trackNPC();

                        didPauseNPC = false;
                    } else {
                        if ( false === didPauseNPC ) {
                            // Set current position so paused movement can restart at point of pause.
                            loopAmount = loopAmount + 1;
                            position = 0 < position ? position - 1 : pathCount;

                            setStaticNPCImage(moveDirection, npc);

                            npc.style.left = currentWorldX + 'px';
                            npc.style.top = currentWorldY + 'px';

                            didPauseNPC = true;
                        }
                    }
                }, 250);
            } else {
                regulateTransitionSpeed(npc.style.left.replace('px', ''), npc.style.top.replace('px', ''), pathArray[position].left, pathArray[position].top, npc, walkingSpeed);

                npc.style.left = pathArray[nextPosition].left + 'px';
                npc.style.top = pathArray[nextPosition].top + 'px';
            }
        } else if ( true === wanderer ) {
            makeNPCWander( npc, walkingSpeed, timeBetween );
        }
    }
}

// Storage menu functionality.
function engageStorageMenus() {
    "use strict";

    // Tab logic.
    const storageTabs = document.querySelectorAll( '.menu-tabs > div' );

    if ( storageTabs ) {
        storageTabs.forEach( ( storageTab, storageIndex ) => {
            storageTab.addEventListener( 'click', () => {
                const currentTab = document.querySelector( '.menu-tabs .engage' );

                const itemDescription = document.getElementById('item-description');
                if (itemDescription) {
                    itemDescription.innerHTML = '';
                }

                if ( currentTab ) {
                    currentTab.classList.remove( 'engage' );
                }

                // Select new tab.
                storageTab.classList.add( 'engage' );

                const tabContent = document.querySelectorAll( '.storage-menu' );
                const currentTabContent = document.querySelector( '.storage-menu.engage' );

                if ( currentTabContent ) {
                    currentTabContent.classList.remove( 'engage' );
                }

                if ( tabContent ) {
                    tabContent[storageIndex].classList.add( 'engage' );
                }
            } );
        } );
    }
}

function engageSettingsMenus() {
    "use strict";

    // Settings.
    const settingCogs = document.querySelectorAll('#settings, #storage, #characters');

    if ( settingCogs ) {
        settingCogs.forEach( settingCog => {
            if ( 'storage' === settingCog.id ) {
                // Show item description in storage menu.
                const menuItems = document.querySelectorAll('.retrieval-points .storage-item' );

                if ( menuItems ) {
                    menuItems.forEach( menuItem => {
                        menuItem.addEventListener( 'click', () => {
                            if ('true' !== menuItem.dataset.empty) {
                                showItemDescription(menuItem);
                            }
                        });
                    } );
                }
            }

            settingCog.addEventListener('click', (e) => {
                if ( false === e.target.classList.contains( 'close-settings') && !e.target.closest( '.character-item') ) {
                    settingCog.classList.add( 'engage' );
                }
            });

            settingCog.querySelector('.close-settings').addEventListener( 'click', () => {
                const description = document.querySelector( '.retrieval-points #item-description' );
                settingCog.classList.remove('engage');

                if ( description ) {
                    description.innerHTML = '';
                }
            } );
        } );
    }

    const updateSettings = document.getElementById('update-settings');

    // Save settings.
    const musicSettings = document.getElementById('music-volume');
    const sfxSettings = document.getElementById('sfx-volume');
    const talkingSettings = document.getElementById('talking-volume');

    if ( updateSettings ) {
        if ( sfxSettings && musicSettings && talkingSettings ) {
            window.sfxVolume = sfxSettings.value / 100;
            window.talkingVolume = talkingSettings.value;

            // Volume listeners.
            musicSettings.addEventListener("input", (event) => {
                window.currentMusic.volume = event.target.value / 100;
            });

            // Volume listeners.
            talkingSettings.addEventListener("input", (event) => {
                window.talkingVolume = event.target.value;
            });

            // Volume listeners.
            sfxSettings.addEventListener("input", (event) => {
                window.sfxVolume = event.target.value / 100;
            });
        }

        updateSettings.addEventListener('click', () => {
            if ( musicSettings && sfxSettings && talkingSettings ) {
                saveSettings(musicSettings.value, sfxSettings.value, talkingSettings.value);
            }
        });
    }
}

function setStaticNPCImage(moveDirection, npc) {
    "use strict";

    const currentImage = npc.querySelector('.character-icon.engage');
    const npcName = cleanClassName(npc.className);

    if (currentImage) {
        currentImage.classList.remove('engage');
    }

    const newImage = document.getElementById(npcName + 'static-' + moveDirection);
    if (newImage) {
        newImage.classList.add('engage');
    }
}

function makeNPCWander( npc, walkingSpeed, timeBetween ) {
    "use strict";

    let startDir = getRandomDir([]);
    let moveDir = '';
    let triedDown = false;
    let triedLeft = false;
    let triedRight = false;
    let triedUp = false;
    let noCollideCount = 0;
    let collisionCount = 0;
    let preMoveDir = '';
    let swap = 0;

    function startRandomNpcPause() {
        const pauseTime = Math.floor(Math.random() * (25000 - 15000 + 1)) + 15000;

        setTimeout(() => {
            pauseNpc(timeBetween, npc);

            // Schedule the next pause with a new random time
            startRandomNpcPause();
        }, pauseTime);
    }

    startRandomNpcPause();

    setInterval( () => {
        if ( 'true' !== npc.dataset?.break && 'true' !== npc.dataset?.cutscenebreak ) {
            const currentLeft = npc.style.left.replace('px', '');
            const currentTop = npc.style.top.replace('px', '');
            const finalPos = blockMovement(currentTop, currentLeft, npc);

            switch (startDir) {
                case 'down' :
                    npc.style.top = (finalPos.top + 1) + 'px';

                    break;
                case 'up' :
                    npc.style.top = (finalPos.top - 1) + 'px';

                    break;
                case 'left' :
                    npc.style.left = (finalPos.left - 1) + 'px';

                    break;
                case 'right' :
                    npc.style.left = (finalPos.left + 1) + 'px';

                    break;
            }

            preMoveDir = moveDir;

            if ((finalPos.left > currentLeft || finalPos.left < currentLeft) && true === finalPos.collide && false === triedDown && (startDir === 'left' || startDir === 'right') || (true === finalPos.collide && finalPos.top > currentTop)) {
                moveDir = swap % 2 === 0 ? 'down' : 'up';
            }

            if (
                (('down' === moveDir && finalPos.top < currentTop) || ('up' === moveDir && finalPos.top > currentTop)) &&
                true === finalPos.collide &&
                (startDir === 'left' || startDir === 'right') ||
                (finalPos.left > currentLeft && true === triedDown)) {
                moveDir = 'down' === moveDir ? 'up' : 'down';
                triedDown = true;
            }

            if (finalPos.top > currentTop && true === finalPos.collide && true === triedDown && (startDir === 'left' || startDir === 'right')) {
                triedUp = true;
            }

            // Up / down checks.
            if ((finalPos.top > currentTop || finalPos.top < currentTop) && true === finalPos.collide && false === triedLeft && (startDir === 'up' || startDir === 'down')) {
                moveDir = swap % 2 === 0 ? 'left' : 'right';
            }

            if (
                (
                    ('left' === moveDir && finalPos.left > currentLeft) ||
                    ('right' === moveDir && finalPos.left < currentLeft)
                ) &&
                true === finalPos.collide &&
                (startDir === 'up' || startDir === 'down') ||
                (finalPos.top > currentTop && true === triedLeft)
            ) {
                moveDir = ('left' === moveDir || 'down' === moveDir) ? 'right' : 'left';
                triedLeft = true;
            }

            if (finalPos.left < currentLeft && true === finalPos.collide && true === triedLeft) {
                triedRight = true;
            }

            if ((true === triedLeft && true === triedRight) || (true === triedUp && true === triedDown)) {
                moveDir = '';
                startDir = getRandomDir(startDir);
                triedLeft = false;
                triedRight = false;
                triedUp = false;
                triedDown = false;
                swap++;
            }

            switch (moveDir) {
                case 'down' :
                    if ('up' !== startDir) {
                        npc.style.top = (finalPos.top + 1) + 'px';
                    } else {
                        moveDir = '';
                    }
                    break;
                case 'up' :
                    if ('down' !== startDir) {
                        npc.style.top = (finalPos.top - 1) + 'px';
                    } else {
                        moveDir = '';
                    }
                    break;
                case 'left' :
                    if ('right' !== startDir) {
                        npc.style.left = (finalPos.left - 1) + 'px';
                    } else {
                        moveDir = '';
                    }
                    break;
                case 'right' :
                    if ('left' !== startDir) {
                        npc.style.left = (finalPos.left + 1) + 'px';
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

            if (collisionCount > 100) {
                pauseNpc(timeBetween, npc);
                moveDir = '';
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
        } else {
            startDir = getRandomDir(startDir);
        }
    }, walkingSpeed );
}

function pauseNpc ( timeBetween, npc ) {
    "use strict";

    npc.dataset.break = 'true';
    setTimeout( () => {
        npc.dataset.break = 'false';
    }, timeBetween);
}

function getRandomDir(currentDir) {
    "use strict";

    const dirs = ['up', 'down', 'left', 'right'];

    // Normalize currentDir to an array if it's not already
    const excludeDirs = Array.isArray(currentDir) ? currentDir : [currentDir];

    // Filter out any directions in excludeDirs
    const filteredDirs = dirs.filter(dir => !excludeDirs.includes(dir));

    // If no directions left, return null or handle gracefully
    if (filteredDirs.length === 0) {
        return null;
    }

    // Pick a random direction from the remaining ones
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
    "use strict";

    // If collectable, remove from menu.
    if ( true === collectable ) {
        removeItemFromStorage(position, type);
    }

    // Make sure amount is always 100 or less. Not for points or money.
    if ( amount > 100 && ( 'point' !== type && 'money' !== type ) ) {
        amount = 100;
    }

    // Make sure amount is 0 if less than 0 for health
    if ( amount < 0 && 'health' === type ) {
        amount = 0;
    }

    const bar = document.querySelector(`.${type}-amount`);
    let gauge = false;

    if ( bar ) {
        gauge = bar.querySelector( '.gauge' );
    }

    // Add to explorePoints.
    if ( OrbemOrder.explorePoints && OrbemOrder.explorePoints[type] && false === OrbemOrder.explorePoints[type].positions.includes(position) && false === Array.isArray(position) ) {
        OrbemOrder.explorePoints[type].positions.push( position );
    } else if ( OrbemOrder.explorePoints && OrbemOrder.explorePoints[type] && false === OrbemOrder.explorePoints[type].positions.includes(position) && true === Array.isArray(position) ) {
        position.forEach( positionName => {
            OrbemOrder.explorePoints[type].positions.push( positionName );
        });
    }

    if ( gauge && ( 'point' !== type && 'money' !== type ) ) {
        bar.setAttribute( 'data-amount', amount );
        gauge.style.width = amount + 'px';
    } else if ( 'point' === type ) {
        bar.setAttribute( 'data-amount', amount );

        gauge.style.width = getPointsGaugeAmount( amount );

        // Unlock abilities as points grow.
        unlockAbilities( amount );
    } else if ( 'money' === type ) {
        bar.setAttribute( 'data-amount', amount );

        const moneyText = bar.querySelector('.money-text');
        moneyText.textContent = amount;
    }

    if ( 'health' === type && 0 === amount ) {
        triggerGameOver();
    }

    if ( '' !== position && true === ['money', 'point', 'health', 'mana'].includes( type ) && position !== missionName ) {
        persistItemRemoval( position, type, amount, 2000, '' );
    }
}

/**
 * Trigger the game over notice and add restart logic.
 */
function triggerGameOver() {
    "use strict";

    const gameOver = document.querySelector( '.game-over-notice' );

    if ( gameOver ) {
        // Clear shooter interval.
        clearInterval(shooterInterval);

        const tryAgain = document.querySelector( '.try-again' );
        const defaultMap = document.querySelector( '.default-map' );

        gameOver.style.display = 'block';

        window.allowMovement = false;
        inHazard = false;
        hazardItem = false;

        persistItemRemoval( 'projectile', 'health', 100, 0, 'true' );

        if ( defaultMap ) {
            // Reset user position.
            addUserCoordianate( defaultMap.dataset.startleft, defaultMap.dataset.starttop );
        }

        if ( tryAgain ) {
            tryAgain.addEventListener( 'click', () => {
                window.location.reload();
            } );
        }
    }
}

/**
 * Adds item to explore point area so it doesn't show up again.
 * @param item
 * @param type
 * @param amount
 * @param timeoutTime
 * @param reset
 */
function persistItemRemoval( item, type, amount, timeoutTime, reset ) {
    "use strict";


    const filehref = `${OrbemOrder.siteRESTURL}/add-explore-points/`;

    // Don't allow health to be 0.
    if ( 'health' === type && 0 === amount ) {
        return;
    }

    if ('' !== item ) {
        clearTimeout(persistTimeout);

        if ( false === Array.isArray(item) ) {
            persistItems.push(item);
        } else {
            persistItems = item.concat( persistItems );
        }

        // Always use projectile if health update.
        if ( 'health' === type ) {
            persistItems = ['projectile'];
        }

        persistTimeout = setTimeout(() => {
            const jsonString = {
                type: type,
                item: persistItems,
                amount: amount,
                reset: reset,
            };

            // Save position of item.
            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                  'Content-Type': 'application/json', // Set the content type to JSON
                  'X-WP-Nonce': OrbemOrder.orbemNonce
                },
                body: JSON.stringify(jsonString) // The JSON stringified payload
            })
                .then(response => {
                    // Check if the response status is in the range 200-299
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }

                    if ( type === 'communicate' ) {
                        type = 'point';
                    }

                    // Add to explore points var.
                    if ( OrbemOrder.explorePoints && type ) {
                        if ( OrbemOrder.explorePoints[type].positions && Array.isArray(OrbemOrder.explorePoints[type].positions)) {
                            OrbemOrder.explorePoints[type].positions = OrbemOrder.explorePoints[type].positions.concat(persistItems);
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
 * @param amount
 * @returns {string}
 */
function getPointsGaugeAmount( amount ) {
    "use strict";

    return ( ( amount / window.nextLevelPointAmount ) * 100 ) + '%';
}

/**
 * Save mission once completed.
 * @param mission
 * @param value
 * @param position
 */
function saveMission( mission, value, position ) {
    "use strict";

    clearTimeout(saveMissionTimeout);

    saveMissionTimeout = setTimeout(() => {
        // Cross off mission.
        const theMission = document.querySelector('.' + mission + '-mission-item');

        // Materialize commuincation.
        const materializes = document.querySelectorAll( '[data-materializemission="' + mission + '"]' );

        if ( materializes ) {
            materializes.forEach(  materialize => {
                materialize.style.display = 'block';
            } );
        }

        if (theMission) {
            const missionPoints = parseInt(theMission.dataset.points);
            const hazardRemoveText = theMission.dataset.hazardremove;
            const missionAbility = theMission.dataset.ability;

            showNextMission(theMission);

            const missionBlockade = theMission.dataset.blockade;

            // Remove blockade if exists.
            if ('' !== missionBlockade && '0' !== JSON.parse(missionBlockade).top) {
                document.querySelector('.' + theMission.className.replace('engage', '').replace('next-mission', '' ).replace('mission-item', '').replace(/\s+/g, '') + '-blockade').remove();
            }

            theMission.style.textDecoration = 'line-through';

            // Remove hazard if set.
            if (null !== hazardRemoveText && hazardRemoveText && 'none' !== hazardRemoveText) {
                const hazardRemoveArray = hazardRemoveText.split(',');

                if (hazardRemoveArray) {
                    hazardRemoveArray.forEach(hazardRemove => {
                        const dragDest = document.querySelector( '.' + hazardRemove + '-drag-dest-map-item' );
                        document.querySelector('.' + hazardRemove + '-map-item').remove();

                        if ( dragDest ) {
                            dragDest.remove();
                        }

                        if (
                            ( true === Array.isArray(position) && false === position.includes(hazardRemove) ) ||
                            false === Array.isArray(position) && position !== hazardRemove
                        ) {
                            // Make sure it doesn't come back.
                            persistItemRemoval(hazardRemove, 'point', 0, 2000, '');
                        }
                    });
                }
            }

            setTimeout(() => {
                theMission.remove();

                // Enable transportation if mission complete.
                if ( missionAbility && 'transportation' === missionAbility ) {
                    engageTransportFunction();

                    // Enable transportation in DB.
                    enableAbility('transportation');
                }
            }, 500);

            if ( value && missionPoints > 0 ) {
                // Trigger cutscene if mission is attached.
                const theCutscene = document.querySelector( `.map-cutscene[data-mission="${mission}"]` );

                if ( theCutscene ) {
                    const cutsceneName = cleanClassName(theCutscene.className);
                    engageCutscene( cutsceneName, false );
                }

                // Give points.
                runPointAnimation(value, position, true, missionPoints, mission);
            } else if ( value && 0 === missionPoints ) {
                persistItemRemoval(position, 'point', 0, 2000, '');
            }
        }

        const filehref = `${OrbemOrder.siteRESTURL}/mission/`;

        const jsonString = {
            mission,
        };

        // Save position of item.
        fetch(filehref, {
            method: 'POST', // Specify the HTTP method
            headers: {
                'Content-Type': 'application/json', // Set the content type to JSON
                'X-WP-Nonce': OrbemOrder.orbemNonce
            },
            body: JSON.stringify(jsonString) // The JSON stringified payload
        })
        .then(response => {
            // Check if the response status is in the range 200-299
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
        });
    }, 500);
}

function showNextMission( theMission ) {
    "use strict";

    const nextMissions = '' !== theMission.dataset.nextmission ? theMission.dataset.nextmission.split(',') : false;

    if ( false !== nextMissions ) {
        nextMissions.forEach( nextMission => {
            const allMissionsNext = document.querySelectorAll('[data-nextmission*="' + nextMission + '"]');

            if (1 === allMissionsNext.length ) {
                const nextMissionEl = document.querySelector('.' + nextMission + '-mission-item');

                if ( nextMissionEl ) {
                    const nextMissionBlockade = nextMissionEl.dataset.blockade;

                    // If next mission exists then show it after previous is completed.
                    if ('' !== nextMissionBlockade && '0' !== JSON.parse(nextMissionBlockade).top) {
                        document.querySelector('.' + nextMissionEl.className.replace('mission-item ', '').replace('next-mission ', '') + '-blockade').style.display = 'block';
                    }

                    nextMissionEl.classList.add('engage');
                }
            }
        } );
    }
}

function addCharacter( character ) {
    "use strict";

    const filehref = `${OrbemOrder.siteRESTURL}/add-character/`;

    const jsonString = {
        slug: character,
    };

    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString) // The JSON stringified payload
    })
    .then(response => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
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
    "use strict";

    const jsonString = {
        type: type,
        itemid: id,
        amount: amount,
        unequip: unequip,
    };

    if ('weapons' === type) {
        window.currentWeapon = defaultWeapon !== name ? '-' + name : '';
    }

    // Save position of item.
    fetch(`${OrbemOrder.siteRESTURL}/equip-explore-item/`, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString) // The JSON stringified payload
    })
        .then(response => {
            // Check if the response status is in the range 200-299
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }

            const itemDescription = document.getElementById('item-description');
            if (itemDescription) {
                itemDescription.innerHTML = '';
            }

            setStaticMCImage(document.getElementById('map-character'), 'down', true);
        });
}

/**
 * Add new spell.
 *
 * @param id The spell id.
 */
function addNewSpell(id) {
    "use strict";

    const filehref = `${OrbemOrder.siteRESTURL}/addspell/`;

    const jsonString = {
        spellid: id,
    };

    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString) // The JSON stringified payload
    })
    .then(response => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
    });
}

/**
 * Remove an item from the storage menu.
 *
 * @param position
 * @param type
 */
function removeItemFromStorage(position, type) {
    "use strict";

    const menuItem = document.querySelector( '.retrieval-points span[title="' + position + '"]');
    const itemCount = menuItem.getAttribute('data-count');

    if ( menuItem ) {
        // if item count is above 1 then reduce count by 1 instead of removing.
        if ( itemCount && 1 < itemCount ) {
            menuItem.setAttribute( 'data-count', itemCount - 1 );
        } else {
            menuItem.setAttribute( 'data-type', '' );
            menuItem.setAttribute( 'data-id', '' );
            menuItem.setAttribute( 'data-value', '' );
            menuItem.setAttribute( 'title', '' );
            menuItem.setAttribute( 'data-empty', 'true' );
            menuItem.setAttribute( 'data-count', '' );
        }

        saveStorageItem( 0, position, type, 0, true );
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
    "use strict";

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
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString) // The JSON stringified payload
    })
        .then(response => {
            // Check if the response status is in the range 200-299
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
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
    "use strict";

    const filehref = `${OrbemOrder.siteRESTURL}/save-storage-item/`;

    const jsonString = {
        id,
        name,
        value,
        type,
        remove,
    };

    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString) // The JSON stringified payload
    })
    .then(response => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
    });
}

/**
 * Adds points to user's account.
 *
 */
async function resetExplore() {
    "use strict";

    const filehref = `${OrbemOrder.siteRESTURL}/resetexplore/`;

    const jsonString = {
    };

    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString) // The JSON stringified payload
    })
    .then(response => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
    });
}


/**
 * Save coordinates to user's account.
 *
 * @param left
 * @param top
 */
function addUserCoordianate(left, top) {
    "use strict";

    const filehref = `${OrbemOrder.siteRESTURL}/coordinates/`;

    const jsonString = {
        left: left.replace('px', ''),
        top: top.replace('px', '')
    };

    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString) // The JSON stringified payload
    })
    .then(response => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
    });
}

/**
 * Take health away from enemy.
 */
const hurtTheEnemy = (function () {
    "use strict";

    let called = false;

    return function(theWeapon, value) {
        if (value && theWeapon && elementsOverlap( theWeapon, value, 0 )) {
            if ( called === false ) {
                if ('explore-enemy' === value.dataset.genre && false === theWeapon.classList.contains( 'protection' )) {
                    const enemyHealth = value.dataset.health;
                    const enemyFullHealth = value.dataset.healthamount;
                    const enemyMission = value.dataset.mission;

                    // Kill enemy or lower health.
                    let attackType = true === theWeapon.classList.contains('heavy-engage') ? 'heavy' : 'normal';
                    attackType = true === theWeapon.classList.contains('charge-attack-engage') ? 'charged' : attackType;
                    const attackStrength = parseInt( JSON.parse(theWeapon.dataset.strength)[attackType] ) + window.attackMultiplier;
                    const newHealth = 0 <= ( enemyHealth - attackStrength ) ? enemyHealth - attackStrength : 0;
                    const weaponType = value.dataset.weapon ?? '';

                    // If weapon type is defined and matches the current weapon or it's not defined, then hurt the enemy.
                    if ( '' !== weaponType && theWeapon.dataset.weapon === weaponType || '' === weaponType ) {
                        value.setAttribute('data-health', newHealth);
                    }

                    if ( 'boss' === value.getAttribute( 'data-enemy-type' ) ) {
                        if (newHealth <= (enemyFullHealth * 0.75) && false === secondWaveHit) {
                            secondWaveHit = true;
                            updateBossWave(value);
                        } else if (newHealth <= (enemyFullHealth * 0.50) && false === thirdWaveHit) {
                            thirdWaveHit = true;
                            updateBossWave(value);
                        } else if (newHealth <= (enemyFullHealth * 0.25) && false === fourthWaveHit) {
                            fourthWaveHit = true;
                            updateBossWave(value);
                        }
                    }

                    if ( 0 === newHealth ) {
                        clearInterval(window.shooterInt);
                        clearInterval(window.runnerInt);
                        value.remove();

                        // Save new health.
                        const position = cleanClassName(value.className);
                        const filehref = `${OrbemOrder.siteRESTURL}/enemy/`;

                        const jsonString = {
                            health: 0,
                            position,
                        };

                        // Save position of item.
                        fetch(filehref, {
                            method: 'POST', // Specify the HTTP method
                            headers: {
                                'Content-Type': 'application/json', // Set the content type to JSON
                                'X-WP-Nonce': OrbemOrder.orbemNonce
                            },
                            body: JSON.stringify(jsonString) // The JSON stringified payload
                        })
                        .then(response => {
                            // Check if the response status is in the range 200-299
                            if (!response.ok) {
                                throw new Error('Network response was not ok ' + response.statusText);
                            }
                        });

                        if ( enemyMission && noOtherItemAttachedToMission( enemyMission ) ) {
                            saveMission( enemyMission, value, enemyMission );
                        }
                    }
                }

                called = true;

                // Reset called var.
                setTimeout(() => {
                    called = false;
                }, 1000);
            }
        }
    };
})();

/**
 * Pull new area html.
 *
 */
const enterNewArea = (function () {
    "use strict";

    window.runningPointFunction = false;
    let called = false;

    return function(position, weapon, mapUrl, nextAreaPosition) {
        fadeOutScene();

        window.previousCutsceneArea = '' === window.previousCutsceneArea ? OrbemOrder.previousCutsceneArea ?? '' : window.previousCutsceneArea;

        // Incase using level selector.
        playStartScreenMusic(false);

        window.allowMovement = false;
        // Clear enemy interval.
        clearInterval(window.shooterInt);
        clearInterval(window.runnerInt);

        // Remove menu explainers.
        const menuExplainers = document.querySelectorAll( '.game-container > .explainer-container, .game-container > .explainer-trigger');

        if ( menuExplainers ) {
            menuExplainers.forEach( explainer => {
                explainer.remove();
            });
        }

        // Remove old devmmode.
        const devModeButton = document.querySelector('.right-bottom-devmode');
        const devModeMenu = document.querySelector('.dev-mode-menu');

        if ( devModeMenu && devModeButton ) {
            devModeMenu.remove();
            devModeButton.remove();
        }

        // Remove current explore finder list items. DEVMODE
        const finderItems = document.querySelector('.explore-item-list');

        if ( finderItems ) {
            finderItems.innerHTML = '';
        }

        // Remove old items.
        const defaultMap = document.querySelector( '.default-map' );

        if ( defaultMap ) {
            defaultMap.remove();
        }

        // Don't repeat enter.
        if ( false === called ) {
            const filehref = `${OrbemOrder.siteRESTURL}/area/`;
            let newMusic = '';

            if ( OrbemOrder.musicNames ) {
                newMusic = OrbemOrder.musicNames[position];
            }

            const jsonString = {
                position,
            };

            // Save position of item.
            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                    'Content-Type': 'application/json',
                    'X-WP-Nonce': OrbemOrder.orbemNonce
                },
                body: JSON.stringify(jsonString)
            })
            .then(response => {
                // Check if the response status is in the range 200-299
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
                .then(data => {

                let newMapItems = data;

                newMapItems = newMapItems.data;
                const mapItemStyles = document.getElementById( 'map-item-styles' );
                const mainCont = document.querySelector( '.site-main' );
                const head = document.querySelector( 'head' );
                let devMode = '';

                if ( newMapItems['dev-mode'] && '' !== newMapItems['dev-mode']) {
                    devMode = newMapItems['dev-mode'];
                }

                if ( '' !== devMode ) {
                    mainCont.innerHTML = devMode + mainCont.innerHTML;
                }

                // Delete old area styles/maps.
                if ( mapItemStyles ) {
                    mapItemStyles.remove();
                }

                const newStyles = document.createElement( 'style' );
                newStyles.id = 'map-item-styles';
                newStyles.innerHTML = newMapItems['map-item-styles-scripts'];

                // Add area missions.
                const missionList = document.querySelector( '.missions-content' );

                if ( missionList ) {
                    missionList.innerHTML = newMapItems['map-missions'];

                    if ( '' !== window.nextAreaMissionComplete ) {
                        const completeMission = document.querySelector( '.' + window.nextAreaMissionComplete + '-mission-item' );

                        if ( completeMission ) {
                            completeMission.style.textDecoration = 'line-through';

                            setTimeout( () => {
                                showNextMission( completeMission );
                                completeMission.remove();
                            }, 500);

                        }
                    }
                }

                // Add new map styles and map urls.
                if (head) {
                    head.append( newStyles );
                }

                // Replace items.
                if ( defaultMap ) {
                    setTimeout(() => {
                        const container = document.querySelector('.game-container');
                        // Create new default map.
                        const newDefaultMap = document.createElement( 'div' );
                        newDefaultMap.className = 'default-map';

                        // Set starting position in case you die.
                        newDefaultMap.dataset.starttop = newMapItems['start-top'];
                        newDefaultMap.dataset.startleft = newMapItems['start-left'];
                        newDefaultMap.innerHTML = newMapItems['map-explainers'] + newMapItems['map-items'] + newMapItems['map-cutscenes'] + newMapItems.minigames + newMapItems['map-svg'] + newMapItems['map-communicate'];

                        if ( 'yes' === newMapItems['is-cutscene'] ) {
                            newDefaultMap.dataset.iscutscene = 'yes';
                        }

                        container.innerHTML = newMapItems['menu-explainers'] + newMapItems['fullscreen-explainers'] + container.innerHTML + newDefaultMap.outerHTML;

                        // Engage settings menus.
                        engageSettingsMenus();

                        // Engage storage menus.
                        engageStorageMenus();

                        // Add characters.
                        const characterList = document.querySelector( '.characters-content' );

                        if ( characterList ) {
                            characterList.innerHTML = newMapItems['map-characters'];

                            const characterItems = characterList.querySelectorAll( '.character-item' );

                            if ( 0 < characterItems.length ) {
                                document.getElementById( 'characters' ).style.display = 'block';
                            }

                            // Add character selection events.
                            engageCharacterSelection();

                            // Add hazard check.
                            checkIfHazardHurts();

                            // Engage dev mode.
                            engageDevMode();

                            // Add close menu event.
                            const characterMenu = document.getElementById( 'characters' );
                            const closeCharacter = characterMenu.querySelector( '.close-settings' );

                            if ( closeCharacter ) {
                                closeCharacter.addEventListener( 'click', () => {
                                    characterMenu.classList.remove( 'engage' );
                                } );
                            }
                        }

                        // Move npcs
                        const moveableCharacters = document.querySelectorAll( '.path-onload[data-path]:not([data-path=""]), [data-wanderer="yes"]');

                        if ( moveableCharacters ) {
                            moveableCharacters.forEach( moveableCharacter => {
                                moveNPC( moveableCharacter, false );
                            } );
                        }

                        // Load materialize item logic.
                        materializeItemLogic();

                        // Load blockades.
                        loadMissionBlockades();

                        // Engage communicate click.
                        communicateParentClick();

                        // Set all first cutscene dialogues to engage.
                        const allFirstDialogues = document.querySelectorAll( '.map-cutscene .wp-block-orbem-paragraph-mp3:first-of-type, .map-communicate .message-wrapper .wp-block-orbem-paragraph-mp3' );

                        if ( allFirstDialogues ) {
                            allFirstDialogues.forEach( firstDialogue => {
                                firstDialogue.classList.add( 'engage' );
                            });
                        }

                        // If the previous area was a cutscene, remove items set to be removed after that cutscene area.
                        if ( '' !== window.previousCutsceneArea ) {
                            removeItems( document.querySelectorAll('[data-removeaftercutscene]' ), window.previousCutsceneArea );

                            const showItems = document.querySelectorAll('[data-showaftercutscene=' + window.previousCutsceneArea + ']');

                            if ( showItems ) {
                                showItems.forEach(showItem => {
                                    materializedItemsArray.push(cleanClassName(showItem.className));
                                    showItem.classList.add('no-point');
                                });

                                saveMaterializedItem(currentLocation, materializedItemsArray);
                            }
                        }

                        // engage cutscene.
                        if ( 'yes' === newMapItems['is-cutscene'] ) {
                            const cutsceneName = cleanClassName(document.querySelector( '.map-cutscene' ).className);
                            engageCutscene( cutsceneName, true );
                            window.previousCutsceneArea = cutsceneName;
                            setPreviousCutsceneArea( window.previousCutsceneArea );
                        } else {
                            fadeInScene();
                        }

                        const crewMates = document.querySelectorAll( '[data-crewmate="yes"]' );

                        // Add crewmates if there are any on the map.
                        if ( 0 < crewMates.length ) {
                            let characterCount = 0;
                            const addCharactersInt = setInterval( () => {
                                if ( characterCount === crewMates.length -1 ) {
                                    clearInterval( addCharactersInt );
                                }

                                const characterName = cleanClassName( crewMates[characterCount].className );

                                addCharacter( characterName );

                                characterCount++;
                            }, 1000);
                        }

                        // Run no point class adder again
                        addNoPoints();
                    }, 700 );
                }

                setTimeout(() => {
                    const container = document.querySelector( '.game-container' );
                    const characterItem = document.getElementById( 'map-character' );
                    const theWeapon = document.querySelector('.map-weapon');

                    if ( nextAreaPosition ) {
                        newMapItems['start-top'] = JSON.parse( nextAreaPosition ).top;
                        newMapItems['start-left'] = JSON.parse( nextAreaPosition ).left;
                    }

                    characterItem.style.top = newMapItems['start-top'] + 'px';
                    characterItem.style.left = newMapItems['start-left'] + 'px';
                    characterItem.className = newMapItems['start-direction'] + '-dir';
                    characterItem.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
                    setStaticMCImage(characterItem, newMapItems['start-direction'], false);

                    container.className = 'game-container ' + position;
                    container.style.backgroundImage = 'url(' + mapUrl + ')';
                    currentLocation = position;

                    playSong(newMusic, position);
                    window.allowMovement = true;
                    theWeapon.style.display = "block";

                    if ( 'undefined' !== typeof OrbemOrder.exploreAbilities && 0 < OrbemOrder.exploreAbilities.length && OrbemOrder.exploreAbilities.includes('transportation') ) {
                        engageTransportFunction();
                    }
                }, 100 );
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
 * Pull item description content.
 *
 */
const showItemDescription = (function () {
    "use strict";

    let called = false;

    return function(item) {
        const id = item.getAttribute('data-id');

        // Remove engage from current.
        const currentSelectedItem = document.querySelector( '.storage-item.engage' );

        if ( currentSelectedItem ) {
            currentSelectedItem.classList.remove( 'engage' );
        }

        // Add engage to selected item.
        item.classList.add( 'engage' );

        // Don't repeat item get.
        if ( false === called ) {
            const filehref = `${OrbemOrder.siteRESTURL}/get-item-description/`;
            const jsonString = {
                id,
            };

            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                    'Content-Type': 'application/json', // Set the content type to JSON
                    'X-WP-Nonce': OrbemOrder.orbemNonce
                },
                body: JSON.stringify(jsonString) // The JSON stringified payload
            })
            .then(response => {
                // Check if the response status is in the range 200-299
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }

                return response.json();
            } )
            .then( data => {
                const itemDescription = document.getElementById('item-description');
                if (itemDescription) {
                    itemDescription.innerHTML = '';
                }

                let newItemDescription = data;
                newItemDescription = newItemDescription.data;
                const description = document.querySelector( '.retrieval-points #item-description' );
                const selectedItem = document.querySelector( '.storage-item.engage' );
                const equipButton = document.createElement( 'button' );
                equipButton.classList.add('storage-item-button');
                equipButton.textContent = 'Equip';
                const unequipButton  = document.createElement( 'button' );
                unequipButton.textContent = 'Unequip';
                unequipButton.classList.add( 'storage-item-button' );
                const dropButton  = document.createElement( 'button' );
                dropButton.textContent = 'Drop';
                dropButton.classList.add( 'storage-item-button' );

                // Replace current description content.
                description.innerHTML = newItemDescription;
                description.appendChild( dropButton );
                description.appendChild( unequipButton );
                description.appendChild( equipButton );


                // Add use and drop features.
                const useButton = description.querySelector( '.use-button' );
                const itemId = selectedItem.getAttribute( 'data-id' );
                const name = selectedItem.getAttribute( 'title' );
                const amount = selectedItem.getAttribute( 'data-value' );
                const selectedType = selectedItem.getAttribute( 'data-type' );

                // Add points.
                if ( useButton && selectedItem ) {
                    if (100 > getCurrentPoints(selectedType) ) {
                        useButton.addEventListener( 'click', () => {
                            runPointAnimation( selectedItem, name );
                            description.innerHTML = '';
                        } );
                    }
                }

                // Drop item.
                if ( dropButton ) {
                    dropButton.addEventListener( 'click', () => {
                        removeItemFromStorage(name, selectedType);
                        description.innerHTML = '';

                        const itemDescription = document.getElementById('item-description');
                        if (itemDescription) {
                            itemDescription.innerHTML = '';
                        }
                    } );
                }

                // Equip button.
                if ( equipButton ) {
                    equipButton.addEventListener( 'click', () => {
                        const currentCharacter = document.querySelector( '.map-character-icon.engage' ).dataset.currentchar;
                        const selectedItem = document.querySelector( '.storage-item.engage' );

                        // Update item class.
                        if ( ( selectedItem && selectedItem.dataset.character === currentCharacter ) || ( selectedItem && ( '' === selectedItem.dataset.character || undefined === selectedItem.dataset.character || null === selectedItem.dataset.character ) ) ) {
                            const itemImage = selectedItem.querySelector( 'img' );
                            const currentWeapon = document.querySelector( '.map-weapon' );
                            const currentWeaponButton = document.querySelector( '.weapon-content img' );

                            if ( currentWeapon && currentWeaponButton ) {
                                currentWeaponButton.src = itemImage.src;
                                currentWeapon.dataset.weapon = selectedItem.title;
                                currentWeapon.dataset.strength = selectedItem.dataset.strength;
                            }

                            selectedItem.classList.add( 'equipped' );
                            selectedItem.classList.add( 'being-equipped' );
                        }

                        // Reset point calculations.
                        updatePointBars(false);

                        description.innerHTML = '';
                        equipNewItem( selectedType, itemId, amount, false, selectedItem.title );
                    } );
                }

                // Unequip.
                if ( unequipButton ) {
                    unequipButton.addEventListener( 'click', () => {
                        const selectedItem = document.querySelector( '.storage-item.engage' );

                        // Update item class.
                        if ( selectedItem ) {
                            selectedItem.classList.remove( 'equipped' );
                            selectedItem.classList.add('unequip');
                        }

                        // Reset point calculations.
                        updatePointBars(true);

                        description.innerHTML = '';
                        equipNewItem( selectedType, itemId, amount, true, selectedItem.title );
                    } );
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
 * Temporarily change weapon player is using. Previously equipped weapon will still be noted as equipped to allow for change back.
 * @param selectedItem
 */
function changeWeapon( selectedItem ) {
    "use strict";

    if ( selectedItem ) {
        const itemImage = selectedItem.querySelector( 'img' );
        const currentWeapon = document.querySelector( '.map-weapon' );
        const currentWeaponButton = document.querySelector( '.weapon-content img' );
        const currentWeaponImg = currentWeapon.querySelector('img');

        if ( currentWeapon && currentWeaponButton ) {
            currentWeaponImg.src = itemImage.src;
            currentWeaponButton.src = itemImage.src;
            currentWeapon.dataset.weapon = selectedItem.title;
            currentWeaponImg.style.width = selectedItem.dataset.width + 'px';
            currentWeaponImg.style.height = selectedItem.dataset.height + 'px';
            currentWeapon.dataset.strength = selectedItem.dataset.strength;
            currentWeapon.dataset.projectile = selectedItem.dataset.projectile;

            window.currentWeapon = defaultWeapon !== selectedItem.title ? '-' + selectedItem.title : '';
        }
    }
}

function updatePointBars(unequip) {
    "use strict";

    const gear = document.querySelector( '.storage-item.being-equipped[data-type="gear"]' );
    const healthBar = document.querySelector( `#explore-points .health-amount` );
    const manaBar = document.querySelector( `#explore-points .mana-amount` );
    let manaAmount = parseInt( manaBar.dataset.amount );
    let healthAmount = parseInt( healthBar.dataset.amount );
    let manaWidth = parseInt( manaBar.style.width.replace('px', '') );
    let healthWidth = parseInt( healthBar.style.width.replace('px', '') );

    // Calculate the gear modifiers.
    if ( gear && false === unequip ) {
        const gearAmount = gear.getAttribute( 'data-value' );
        const gearSubtype = gear.getAttribute( 'data-subtype' );

        if ( 'health' === gearSubtype ) {
            healthAmount += parseInt( gearAmount );
            healthWidth += parseInt( gearAmount );
        }

        if ( 'mana' === gearSubtype ) {
            manaAmount += parseInt( gearAmount );
            manaWidth += parseInt( gearAmount );
        }
    } else if ( gear && false !== unequip ) {
        const gearUnequip = document.querySelector( '.storage-item.unequip[data-type="gear"]' );
        const gearAmount = gearUnequip.getAttribute( 'data-value' );
        const gearSubtype = gearUnequip.getAttribute( 'data-subtype' );

        if ( 'health' === gearSubtype ) {
            healthAmount -= parseInt( gearAmount );
            healthWidth -= parseInt( gearAmount );
        }

        if ( 'mana' === gearSubtype ) {
            manaAmount -= parseInt( gearAmount );
            manaWidth -= parseInt( gearAmount );
        }
    }

    if ( gear ) {
        // update the points bars to new width.
        healthBar.style.width = healthWidth + 'px';
        healthBar.setAttribute('data-amount', healthAmount);
        healthBar.querySelector('.gauge').style.width = healthAmount + 'px';

        manaBar.style.width = manaWidth + 'px';
        manaBar.setAttribute('data-amount', manaAmount);
        manaBar.querySelector('.gauge').style.width = manaAmount + 'px';
    }

    // Remove extra classes:
    const beingEquipped = document.querySelector( '.being-equipped' );
    const beingUnequipped = document.querySelector( '.unequip' );

    if ( beingEquipped ) {
        beingEquipped.classList.remove( 'being-equipped' );
    }

    if ( beingUnequipped ) {
        beingUnequipped.classList.remove( 'unequip' );
    }
}

/**
 * get current points.
 * @param type the type of point bar.
 */
function getCurrentPoints(type) {
    "use strict";

    const thePoints = document.querySelector( `#explore-points .${ type }-amount` );

    return parseInt( thePoints.getAttribute('data-amount') );
}

function playSong(path, name) {
    "use strict";

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
    "use strict";

    const charImage = character.querySelector('img');
    charImage.removeAttribute('srcset');
    const currentCharacter = document.querySelector( '#map-character' );

    if ( charImage && currentCharacter ) {
        const oldCurrentCharName = undefined === currentCharacter.dataset.currentchar ? window.mainCharacter : currentCharacter.dataset.currentchar;
        const mc = document.querySelectorAll( '#map-character .map-character-icon' );
        const newCharacter = character.querySelectorAll( '.character-images .character-icon' );

        if ( mc ) {
            mc.forEach( (mcImage, index) => {
                if ( newCharacter[index] ) {
                    const mcImageUrl = mcImage.src;
                    mcImage.src = newCharacter[index].src;
                    newCharacter[index].src = mcImageUrl;
                }
            } );

            const mcAbility = currentCharacter.dataset.ability;
            const mcName = currentCharacter.dataset.name;

            // set new character
            currentCharacter.dataset.currentchar = character.dataset.charactername;
            currentCharacter.dataset.ability = character.dataset.ability;
            currentCharacter.dataset.name = character.querySelector('.character-name').textContent;
            character.dataset.ability = mcAbility;
            character.querySelector('.character-name').textContent = mcName;
        }

        switch (currentCharacter.dataset?.ability) {
            case 'speed' :
                window.moveSpeed = 5;
                window.attackMultiplier = 5;
                movementIntFunc();

                // Change weapon.
                changeWeapon(document.querySelector('.storage-item[title="' + currentCharacter.dataset?.weapon + '"]'));
            break;
            case 'programming' :
                    const equipped = document.querySelector('.storage-item[data-type="weapons"].equipped');
                    changeWeapon(equipped);

                    window.moveSpeed = 3;
                    window.attackMultiplier = 0;
                    movementIntFunc();
                    break;

            case 'strength' :
                    window.moveSpeed = 3;
                    movementIntFunc();

                    // Change weapon.
                    changeWeapon(document.querySelector('.storage-item[title="' + currentCharacter.dataset?.weapon + '"]'));
                    window.attackMultiplier = 10;
               break;
            case 'hazard' :
                    window.moveSpeed = 3;
                    movementIntFunc();

                    // Change weapon.
                    changeWeapon(document.querySelector('.storage-item[title="' + currentCharacter.dataset?.weapon + '"]'));
                    window.attackMultiplier = 0;
                break;
            case 'default' :
                    window.moveSpeed = 3;
                    // Change weapon.
                    changeWeapon(document.querySelector('.storage-item[title="' + currentCharacter.dataset?.weapon + '"]'));
                    movementIntFunc();
            break;
        }

        character.dataset.charactername = oldCurrentCharName ? oldCurrentCharName : window.mainCharacter;
    }
}

/**
 * Start enemies.
 */
function engageEnemy( enemy, trigger ){
    "use strict";

    const enemyType = enemy.getAttribute( 'data-enemy-type' );

    if ( trigger ) {
        trigger.remove();
    }

    if ( 'shooter' === enemyType ) {
        engageShooter(enemy);
    }

    // Runner Type.
    if ( 'runner' === enemyType ) {
        window.runnerInt = setInterval( () => {
            const enemyName = cleanClassName(enemy.className);
            const newEnemy = document.querySelector( '.' + enemyName + '-map-item' );
            const collisionWalls = document.querySelectorAll( '.default-map svg rect, .protection' );
            let leftValInt = parseInt( newEnemy.style.left, 10 );
            let topValInt = parseInt( newEnemy.style.top, 10 );
            const mapCharacter = document.getElementById( 'map-character' );
            const mapCharacterLeft = parseInt(mapCharacter.style.left.replace('px', '')) + 400;
            const mapCharacterTop = parseInt(mapCharacter.style.top.replace('px', '')) + 400;

            // Move enemy left.
            if ( leftValInt < mapCharacterLeft ) {
                leftValInt = leftValInt + 1;
            } else {
                leftValInt = leftValInt - 1;
            }

            if ( topValInt < mapCharacterTop ) {
                topValInt = topValInt + 1;
            } else {
                topValInt = topValInt - 1;
            }

            if ( collisionWalls && newEnemy ) {
                const newBlockedPosition = getBlockDirection(collisionWalls, newEnemy.getBoundingClientRect(), topValInt, leftValInt, true, false);

                newEnemy.style.left = newBlockedPosition.left + 'px';
                newEnemy.style.top = newBlockedPosition.top + 'px';
            }
        }, 20 );
    }

    if ( 'boss' === enemyType ) {
        updateBossWave(enemy);

        pulsewaveTrackInterval = setInterval( () => {
            const pulseWave = document.querySelector('.pulse-wave-container');
            const mainChar = document.querySelector( '.map-character-icon.engage' );

            if (enemyOverlap(pulseWave, mainChar, document.querySelector('.game-container'))) {
                inHazard = true;
                window.theHazardValue = pulseWave.dataset.value;
            } else {
                inHazard = false;
            }
        }, 20);
    }
}

/**
 * Switch boss wave type.
 * @param enemy
 */
function updateBossWave(enemy) {
    "use strict";

    const bossWaves = enemy.dataset.waves.split(',');

    // Remove current wave classes.
    if ( bossWaves ) {
        bossWaves.forEach( bossWave => {
            enemy.classList.remove( bossWave + '-wave-engage' );
        } );

        enemy.classList.add(bossWaves[bossWaveCount] + '-wave-engage');

        if ( 'pulse-wave' === bossWaves[bossWaveCount]) {
            pulsewaveInterval = setInterval( () => {
                enemy.classList.toggle( 'pulse-in' );
            }, 13000 );
        } else if ( pulsewaveInterval ) {
            clearInterval(pulsewaveInterval);
            enemy.classList.remove( 'pulse-in' );
        }

        if ('projectile' === bossWaves[bossWaveCount]) {
            engageShooter(enemy);
        } else {
            clearInterval( shooterInterval );
        }
    }

    bossWaveCount++;
}

function engageShooter(enemy) {
    "use strict";

    const projSpeed = enemy.dataset.enemyspeed;
    shooterInterval = window.shooterInt = setInterval( () => {
        const mapCharacter = document.querySelector( '.map-character-icon.engage' );
        const mapCharacterLeft = mapCharacter.getBoundingClientRect().left + mapCharacter.width / 2;
        const mapCharacterTop = mapCharacter.getBoundingClientRect().top + mapCharacter.width / 2;
        const projectile = enemy.querySelector( '.projectile' );

        if ( projectile ) {
            shootProjectile(projectile, mapCharacterLeft, mapCharacterTop, enemy, projSpeed, false, '.projectile', 'no' );
        }
    }, 5000 );
}

/**
 * Shoot the projectile.
 * @param projectile
 * @param mapCharacterLeft
 * @param mapCharacterTop
 * @param enemy
 * @param projSpeed
 * @param spell
 * @param projectileClass
 * @param isProjectile
 */
function shootProjectile( projectile, mapCharacterLeft, mapCharacterTop, enemy, projSpeed, spell, projectileClass, isProjectile ) {
    "use strict";

    const newProjectile = projectile.cloneNode( true );

    // Remove engage class and transition style before using new projectile.
    newProjectile.classList.remove( 'engage' );
    newProjectile.style.transition = '';

    // Move projectile.
    if (true !== spell && 'no' === isProjectile ) {
        moveEnemy( projectile, mapCharacterLeft, mapCharacterTop, projSpeed, enemy );
    } else if ( true === spell ) {
        projectile.classList.remove( 'map-weapon' );
        projectile.classList.add( 'magic-weapon' );

        moveSpell(projectile, mapCharacterLeft, mapCharacterTop);
        enemy = document.querySelector( '.game-container' );
    } else if ( 'yes' === isProjectile ) {
        moveSpell(projectile, mapCharacterLeft, mapCharacterTop);
        enemy = document.querySelector( '.game-container' );
    }

    // check projectile position and remove if its wall.
    const projMovement = setInterval( function () {
        const projectile = enemy.querySelector( projectileClass );
        let collisionWalls = document.querySelectorAll( '.default-map svg rect, .protection, .map-character-icon.engage, #map-weapon img' );

        if (true === spell || 'yes' === isProjectile) {
            collisionWalls = document.querySelectorAll( '.default-map svg rect, .enemy-item, .map-item' );
        }

        if ( collisionWalls && projectile ) {
            trackProjectile(projectile, collisionWalls, true);
        }
    }, 20 );

    setTimeout( () => {
        if ( true === spell || 'true' === isProjectile ) {
            const mapCharPos = document.getElementById( 'map-character' ).className.replace( '-dir', '');
            newProjectile.setAttribute( 'data-direction', mapCharPos );
        }

        enemy.appendChild( newProjectile );
        projectile.remove();
        // Link weapon back to player.
        window.weaponConnection = true;

        clearInterval( projMovement );
    }, 4500 );
}

function trackProjectile(projectile, collisionWalls, isProjectile) {
    "use strict";

    const container = document.querySelector( '.game-container' );

    function tick() {
        if (!document.body.contains(projectile)) {
            return;
        } // stop if removed

        for (const wall of collisionWalls) {
            if (enemyOverlap(projectile, wall, container)) {
                // If projectile collides with player than take health of player.
                if ( true === wall.classList.contains('map-character-icon') && false === projectile.classList.contains('map-weapon') ) {
                    const enemyValue = parseInt(projectile.dataset.value);

                    // Immediately remove the projectile when hits.
                    const currentHealth = document.querySelector('#explore-points .health-amount');
                    const healthAmount = parseInt(currentHealth.getAttribute('data-amount'));

                    if (currentHealth && 0 <= healthAmount) {
                        const currentHealthLevel = healthAmount;
                        const newAmount = currentHealthLevel >= enemyValue ? currentHealthLevel - enemyValue : 0;

                        hurtAnimation();

                        addUserPoints(newAmount, 'health', 'projectile', false, '');
                    }
                }

                if (true === isProjectile) {
                    projectile.remove();
                }

                // Link weapon back to player.
                window.weaponConnection = true;
            }
        }

        requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
}

function enemyOverlap(a, b, container) {
    "use strict";

    const ar = getRelativeRect(a, container);
    const br = getRelativeRect(b, container);

    return !(
        ar.right < br.left ||
        ar.left > br.right ||
        ar.bottom < br.top ||
        ar.top > br.bottom
    );
}

function getRelativeRect(el, container) {
    "use strict";

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
 * @param projectile The projectile or runner.
 * @param mapCharacterLeft Character's left position.
 * @param mapCharacterTop Character's right position.
 * @param projSpeed The speed of movement.
 * @param newEnemy The enemy shooting.
 */
function moveEnemy(projectile, mapCharacterLeft, mapCharacterTop, projSpeed, newEnemy) {
    "use strict";

    let leftDifference;
    let topDifference;
    const projectilePosition = projectile.getBoundingClientRect();

    const mapCharacter = document.getElementById( 'map-character' );
    const bPosition = getPositionAtCenter(newEnemy);
    const aPosition = getPositionAtCenter(mapCharacter);

    // Set the transition speed dynamically.
    regulateTransitionSpeed(aPosition.x, aPosition.y, bPosition.x, bPosition.y, projectile, projSpeed);

    const angle = Math.atan2(mapCharacterTop - projectilePosition.top,  mapCharacterLeft - projectilePosition.left );

    const targetX = mapCharacterLeft + Math.cos(angle) * 800;
    const targetY = mapCharacterTop + Math.sin(angle) * 800;

    // Calculate the required translation
    leftDifference = targetX - projectilePosition.left;
    topDifference = targetY - projectilePosition.top;

    projectile.style.transform = 'translate(' + leftDifference + 'px, ' + topDifference + 'px)';
}

/**
 * Move enemy or projectile to character position.
 * @param projectile
 * @param mapCharacterLeft
 * @param mapCharacterTop
 */
function moveSpell(projectile, mapCharacterLeft, mapCharacterTop) {
    "use strict";

    window.weaponConnection = false;

    // Set the transition speed dynamically.
    projectile.style.transition = 'all 3s';
    projectile.style.left = mapCharacterLeft + 'px';
    projectile.style.top = mapCharacterTop + 'px';
}

/**
 *
 * @param aPositionx
 * @param aPositiony
 * @param bPositionx
 * @param bPositiony
 * @param projectile
 * @param multiple
 * @returns {number}
 */
function regulateTransitionSpeed( aPositionx, aPositiony, bPositionx, bPositiony, projectile, multiple ) {
    "use strict";

    const diffDist = Math.hypot(aPositionx - bPositionx, aPositiony - bPositiony);
    const transitionDist = ( diffDist * 0.075 ) * multiple;
    let moveDirection = 'down';
    const ydiff = Math.abs(aPositiony - bPositiony);
    const xdiff = Math.abs(aPositionx - bPositionx);

    projectile.style.transition = 'all ' + transitionDist + 'ms linear 0s';

    if (aPositiony > bPositiony && ydiff > xdiff) {
        moveDirection = 'up';
    } else if (aPositiony < bPositiony && ydiff > xdiff) {
        moveDirection = 'down';
    } else if (aPositionx < bPositionx && xdiff > ydiff ) {
        moveDirection = 'right';
    } else if (aPositionx > bPositionx && xdiff > ydiff) {
        moveDirection = 'left';
    }

    return moveDirection;
}

/**
 *
 * @param aPositionx
 * @param aPositiony
 * @param bPositionx
 * @param bPositiony
 * @param multiple
 * @param timeBetween
 * @returns {number}
 */
function getLoopAmount(aPositionx, aPositiony, bPositionx, bPositiony, multiple, timeBetween) {
    "use strict";

    multiple = '0' === multiple ? '60' : multiple;
    timeBetween = '0' === timeBetween ? '0.175' : timeBetween;
    const diffDist = Math.hypot(aPositionx - bPositionx, aPositiony - bPositiony);
    const transitionDist = ( diffDist * parseFloat(timeBetween) ) * multiple;

    return Math.ceil(transitionDist / 250);
}

/**
 *
 * @param element
 * @returns {{x: *, y: *}}
 */
function getPositionAtCenter(element) {
    "use strict";

    const {top, left, width, height} = element.getBoundingClientRect();
    return {
        x: left + width / 2,
        y: top + height / 2
    };
}


/**
 * Helper function to add no points class to areas that have points already.
 */
function addNoPoints() {
    "use strict";

    const types = ['health', 'mana', 'point', 'gear', 'weapons', 'money'];

    types.forEach( type => {
        const selectedCharacterPositions = undefined !== OrbemOrder.explorePoints[type] ? OrbemOrder.explorePoints[type].positions : [];

        // Add no point class to positions already gotten.
        if ( selectedCharacterPositions ) {
            selectedCharacterPositions.forEach( value => {
                const valNum = parseInt( value ) > 0;
                const mapItem = valNum ? null : document.querySelector('.' + value + '-map-item');
                const cutSceneItem = valNum ? null : document.querySelector('.' + value + '-map-cutscene');
                const explainerItem = valNum ? null : document.querySelector('.' + value + '-explainer-trigger-map-item');
                const materializeMapItem = valNum ? null : document.querySelector( '.' + value + '-materialize-item-map-item' );
                const dragDestMapItem = valNum ? null : document.querySelector( '.' + value + '-drag-dest-map-item' );
                const communicateTrigger = document.getElementById( value + '-t' );

                if ( communicateTrigger ) {
                    const communicateMessage = document.getElementById( value );
                    const communicateParent = communicateMessage.parentNode;

                    if ( communicateMessage ) {
                        communicateMessage.classList.add( 'engage' );

                        communicateTrigger.remove();
                    }

                    if ( communicateParent && false === communicateParent.classList.contains('dependent') ) {
                        communicateParent.classList.add('dependent');
                    }
                }

                // Add special class for cutscenes.
                if ( cutSceneItem ) {
                    cutSceneItem.classList.add( 'been-viewed' );
                }

                // Add for explainers.
                if ( explainerItem ) {
                    explainerItem.classList.add( 'already-hit' );
                }

                if (mapItem) {
                    // If collected already don't show item.
                    if (shouldRemoveItemOnload( mapItem )) {
                        mapItem.remove();

                        if ( materializeMapItem ) {
                            materializeMapItem.remove();
                        }
                    }

                    // Remove drag dest if removable and map item has one.
                    if ( dragDestMapItem && 'true' === dragDestMapItem.dataset.removable ) {
                        dragDestMapItem.remove();
                    }

                    if ( 'no' === mapItem.dataset?.disappear) {
                        swapInteractedImage(mapItem);
                    }

                    mapItem.classList.add('no-point');
                }
            } );
        }

        // Clear all bubbles.
        const characterSlugs = document.querySelectorAll('.map-item-modal.graeme');
        const allBubble = document.querySelectorAll('.map-item-modal');

        if ( allBubble ) {
            allBubble.forEach( bubble => {
                bubble.classList.remove( 'engage' );
            } );
        }

        // Show all character bubbles.
        if ( characterSlugs ) {
            characterSlugs.forEach( characterSlug => {
                characterSlug.classList.add( 'engage' );
            } );
        }
    });
}

function shouldRemoveItemOnload( mapItem ) {
    "use strict";

    if (
        (undefined !== mapItem.dataset.timer && null !== mapItem.dataset.timer) ||
        'explore-character' === mapItem.dataset.genre ||
        'true' === mapItem.dataset.hazard ||
        'true' === mapItem.dataset.collectable ||
        ( 'true' === mapItem.dataset.breakable && 'no' !== mapItem.dataset?.disappear )  ||
        ('true' === mapItem.dataset.removable && 'no' !== mapItem.dataset?.disappear ) ||
        ('true' === mapItem.dataset.draggable && 'yes' === mapItem.dataset?.disappear) ||
        (undefined !== mapItem.dataset?.removeaftercutscene)
    ) {
        return true;
    }

    return false;
}

/**
 * Engages the explore page game functions.
 */
export function engageExploreGame() {
    "use strict";

    const container = document.querySelector('.game-container');
    const touchButtons = document.querySelector( '.touch-buttons' );
    window.previousCutsceneArea = OrbemOrder.previousCutsceneArea ?? '';

    // Set all first cutscene dialogues to engage.
    const allFirstDialogues = document.querySelectorAll( '.map-cutscene .wp-block-orbem-paragraph-mp3:first-of-type, .map-communicate .wp-block-orbem-paragraph-mp3' );

    if ( allFirstDialogues ) {
        allFirstDialogues.forEach( firstDialogue => {
            firstDialogue.classList.add( 'engage' );
        });
    }

    // Stop start music.
    playStartScreenMusic(false);

    // Engage communicate click.
    communicateParentClick();

    // Set true by default.
    window.weaponConnection = true;

    // Set true by default.
    window.allowHit = true;

    // Set true by default.
    window.allowIndicate = true;

    // Set attack multiplier default.
    window.attackMultiplier = 0;

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
    const crewMenu = document.getElementById( 'characters' );
    const crewMates = crewMenu ? crewMenu.querySelectorAll( '.character-item' ) : false;

    if ( crewMenu && 0 < crewMates.length ) {
        crewMenu.style.display = 'block';
    }

    // Hide start screen.
    if ( document.querySelector( '.explore-overlay' ) ) {
        document.querySelector('.explore-overlay').remove();
    }
    document.body.style.position = 'unset';

    if ( touchButtons ) {
        touchButtons.classList.add( 'do-mobile' );
    }

    let newMusic = '';

    if ( OrbemOrder.musicNames && currentLocation ) {
        newMusic = OrbemOrder.musicNames[currentLocation];
    }

    // Start music.
    playSong( newMusic, currentLocation );

    // Show leave map link and keys guide.
    const explorePoints = document.getElementById( 'explore-points' );
    const missions = document.getElementById( 'missions' );

    if ( explorePoints ) {
        explorePoints.style.opacity = '1';
    }

    if ( missions ) {
        missions.style.opacity = '1';
    }

    // Flash key-guide.
    const keyGuide = document.getElementById( 'key-guide' );
    spinMiroLogo( keyGuide, 'engage' );

    // Bring touch buttons forward and flash arrows.
    spinMiroLogo( touchButtons, 'engage' );

    // Run arrow flash intermittently.
    window.buttonShow = setInterval( function () {
        spinMiroLogo( touchButtons, 'engage' );
        spinMiroLogo( keyGuide, 'engage' );
    }, 10000 );

    // Move npcs
    const moveableCharacters = document.querySelectorAll( '.path-onload[data-path]:not([data-path=""]), [data-wanderer="yes"]');

    if ( moveableCharacters ) {
        moveableCharacters.forEach( moveableCharacter => {
            moveNPC( moveableCharacter, false );
        } );
    }

    // Load blockades.
    loadMissionBlockades();

    // Add character hit button.
    addCharacterHit();

    // Update explore position if on explore page.
    movementIntFunc();

    // Trigger cutscene if area is cutscene.
    const isAreaCutscene = 'yes' === document.querySelector( '.default-map' ).dataset.iscutscene;

    if ( isAreaCutscene && currentLocation ) {
        const cutSceneName = cleanClassName(document.querySelector( '.map-cutscene' ).className);
        window.previousCutsceneArea = cutSceneName;
        setPreviousCutsceneArea( window.previousCutsceneArea );
        engageCutscene( cutSceneName, true );
    }

    if ( '' !== window.previousCutsceneArea ) {
        removeItems( document.querySelectorAll('[data-removeaftercutscene]' ), window.previousCutsceneArea );

        const showItems = document.querySelectorAll('[data-showaftercutscene=' + window.previousCutsceneArea + ']');

        if ( showItems ) {
            showItems.forEach(showItem => {
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
    const mapChar = document.getElementById( 'map-character' );

    if ( mapChar ) {
      mapChar.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
    }

    setTimeout( () => { fadeInScene(); }, 1000 );
}

/**
 * Run materialize item logic.
 */
function materializeItemLogic() {
    "use strict";

    const materialItems = document.querySelectorAll( '.materialize-item-trigger' );

    if ( materialItems ) {
        materialItems.forEach( mItem => {
            const itemName = cleanClassName(mItem.className);
            const itemEl = document.querySelector('.' + itemName + '-map-item');
            const dragDest = document.querySelector( '.' + itemName + '-drag-dest-map-item' );

            if (itemEl) {
                itemEl.style.display = 'none';
            }

            if ( dragDest ) {
                dragDest.style.display = 'none';
            }
        } );
    }
}

/**
 * Load blockades and hide communicate triggers from missions.
 */
function loadMissionBlockades() {
    "use strict";

    // Add mission blockade.
    const missions = document.querySelectorAll( '.mission-list .mission-item' );

    if ( missions ) {
        missions.forEach( mission => {
            const blockade = mission.dataset.blockade;
            const missionName = cleanClassName(mission.className);
            const materializes = document.querySelectorAll( '[data-materializemission="' + missionName + '"]');

            if ( materializes ) {
                materializes.forEach( materialize => {
                    materialize.style.display = 'none';
                });
            }

            if ( blockade && '' !== blockade ) {
                const blockadeSpecs = JSON.parse( blockade );

                if ( '0' !== blockadeSpecs.height ) {
                    const missionBlockadeEl = document.createElement('div');
                    const blockadeClasses = mission.className.replace('mission-item ', '');
                    const defaultMap = document.querySelector('.default-map');

                    missionBlockadeEl.className = 'wp-block-group map-item is-layout-flow wp-block-group-is-layout-flow ' + blockadeClasses + '-blockade';
                    missionBlockadeEl.style.top = blockadeSpecs.top + 'px';
                    missionBlockadeEl.style.left = blockadeSpecs.left + 'px';
                    missionBlockadeEl.style.width = blockadeSpecs.width + 'px';
                    missionBlockadeEl.style.height = blockadeSpecs.height + 'px';
                    missionBlockadeEl.dataset.genre = 'blockade';
                    missionBlockadeEl.id = mission.id;
                    missionBlockadeEl.draggable = true;

                    if (false === mission.classList.contains( 'engage' ) && true === mission.classList.contains( 'next-mission' ) ) {
                        missionBlockadeEl.style.display = 'none';
                    }

                    // Add blockade to map.
                    if (defaultMap) {
                        defaultMap.append(missionBlockadeEl);
                    }
                }
            }
        } );
    }
}

/**
 * Helper function that returns position of element.
 *
 * @param v
 * @param a
 * @param b
 * @param d
 * @param x
 * @param $newest
 * @returns {number}
 */
function miroExplorePosition(v,a,b,d,x, $newest) {
    "use strict";

    const pane = document.querySelector( '.game-container' );
    const mapChar = document.querySelector( '#map-character' );
    let box = mapChar.querySelector( '.map-character-icon.engage' );
    const modal = document.querySelectorAll( '.map-item:not(.drag-dest), .projectile, .enemy-item, [data-hazard="true"]' );
    let weaponEl = document.querySelector( '.map-weapon' );
    const magicEl = document.querySelector( '.magic-weapon' );
    const area = document.querySelector('.game-container').className.replace('game-container ', '');
    const hazardGauge = mapChar.querySelector( '.misc-gauge-wrap' );

    // Reset weapon element as magic element.
    if ( magicEl ) {
        weaponEl = magicEl;
    }

    if ( 0 < modal.length && false === window.noTouch ) {
        // Overlap check for map item.
        modal.forEach( value => {
            let position = cleanClassName(value.className);

            if (value.classList.contains('enemy-item')) {
                // Hurt enemy save enemy health.
                hurtTheEnemy(weaponEl, value);
            }

            // No points for draggables.
            const dragDest = document.querySelector('.' + position + '-drag-dest-map-item');
            let dragMission = false;

            if (dragDest && false === value.classList.contains('no-point')) {
                dragMission = document.querySelector('.' + dragDest.dataset.mission + '-mission-item');

                if (null === dragMission) {
                    value.classList.add('no-point');
                }
            }

            const indicator = document.querySelector('.indicator-icon');
            const characterName = cleanClassName(value.className);
            const cutsceneEl = document.querySelector( `.map-cutscene[data-character="${characterName}"]`);
            const finalCharPos = {
                offsetLeft: mapChar.offsetLeft + (400 - (box.offsetWidth / 2 )),
                offsetWidth: box.offsetWidth,
                offsetTop: mapChar.offsetTop + (400 - (box.offsetHeight / 2 )),
                offsetHeight: box.offsetHeight,
            };

            // Touching with buffer.
            if (value && box && elementsOverlap(finalCharPos, value, 5)) {
                // Pause NPC from moving if touching MC.
                if ( 'explore-character' === value.dataset.genre && '' !== value.dataset.path ) {
                    value.dataset.canmove = 'false';

                    const cutsceneTrigger = document.getElementById(cutsceneEl.id + '-t');

                    if ( !cutsceneTrigger && cutsceneEl && false === cutsceneEl.classList.contains('been-viewed') && 'engagement' !== cutsceneEl.dataset.triggertype) {
                        engageCutscene( cutsceneEl, false );
                    }
                }

                if ( true === value.classList.contains('communicate-trigger') ) {
                    engageCommunicate(value?.dataset.triggee, value);
                }
            } else if ( 'false' === value.dataset?.canmove ) {
                // Reset NPC to allow movement.
                value.dataset.canmove = 'true';
            }

            if ( value && box && elementsOverlap( finalCharPos, value, 0 ) ) {
                // Add indicator if touching sign.
                if ('explore-sign' === value.dataset.genre && false === value.classList.contains( 'engage' ) ) {
                    triggerIndicator(value, false, false, false);
                    value.classList.add( 'engage' );
                    window.allowHit = false;
                }

                // Indicate if you touch minigame item trigger.
                if (true === value.classList.contains( 'no-point') && undefined !== value.dataset?.minigame) {
                    triggerIndicator(value, false, false, true);
                    value.classList.add( 'engage' );
                }

                // Check if collided point is enterable.
                if ('explore-area' === value.getAttribute('data-genre')) {
                    enterExplorePoint(value, 'false');

                    return;
                }

                // If in hazard set to true.
                if ('true' === value.dataset.hazard && false === canCharacterInteract(value, mapChar, 'hazard')) {
                    if ( 100 <= hazardCounter || 0 === hazardCounter ) {
                        const hurtAmount = value.dataset.value;
                        const currentHealth = getCurrentPoints('health');
                        const newAmount = currentHealth - parseInt(hurtAmount);

                        hurtAnimation();

                        addUserPoints(newAmount, 'health', 'hazard', false, '');

                        // Push character away from hazard center.
                        pushCharacter(25, value.closest('.enemy-item') ?? value, mapChar);

                        hazardCounter = 0;
                    }

                    hazardCounter++;
                } else if ('true' === value.dataset.hazard && true === canCharacterInteract(value, mapChar, 'hazard')) {
                    if ( hazardGauge ) {
                        hazardGauge.classList.add( 'engage' );
                    }

                    const hazardGaugeBar = hazardGauge.querySelector('.misc-gauge');

                    if ( window.hazardTime <= hazardCounter ) {
                        inHazard = true;
                        window.theHazardValue = value.dataset.value;
                        hazardItem = value.closest('.enemy-item') ?? value;
                        hazardGaugeBar.style.width = '100%';
                        hazardGauge.classList.remove( 'engage' );
                    } else {
                        hazardGaugeBar.style.width = ( ( ( window.hazardTime - hazardCounter ) / window.hazardTime ) * 100 ) + '%';
                    }

                    hazardCounter++;
                }

                if (dragDest) {
                    dragMission = document.querySelector('.' + dragDest.dataset.mission + '-mission-item');
                }

                // Draggable logic.
                if (
                    'true' === value.dataset.draggable &&
                    false === value.classList.contains('dragme') &&
                    !document.querySelector('.dragme') &&
                    canCharacterInteract(value, mapChar, 'strength') &&
                    dragMission
                ) {
                    value.classList.add('dragme');
                }

                // If trigger. Trigger the triggee.
                if ('true' === value.dataset.trigger && false === value.classList.contains('cutscene-trigger')) {
                    const triggee = document.querySelector('.' + value.dataset.triggee);
                    // Start enemy attacks.

                    if (triggee && 'explore-enemy' === value.dataset.genre) {
                        engageEnemy(triggee, value);
                    }
                }

                // If explainer trigger. Trigger the triggee.
                if (true === value.classList.contains('explainer-trigger') && false === value.classList.contains('already-hit')) {
                    const triggee = document.querySelector('.' + value.dataset.triggee + '-explainer-item');
                    const closeExplainer = (event) => {
                        if (('keydown' === event.type && 'Space' === event.code) || 'click' === event.type) {
                            window.allowMovement = true;
                            window.allowHit = true;
                            triggee.classList.remove('show-explainer');
                            document.removeEventListener('keydown', closeExplainer);
                        }
                    };

                    if (triggee) {
                        triggee.classList.add('show-explainer');
                        triggee.style.zIndex = '10';
                        value.classList.add('already-hit');
                        window.allowMovement = false;
                        window.allowHit = false;

                        const text = Array.from(triggee.querySelector('p').childNodes)
                            .filter(node => node.nodeType === Node.TEXT_NODE)
                            .map(node => node.textContent)
                            .join('');
                        const mcVoice = mapChar.dataset.voice;
                        const providedAudio = document.getElementById(triggee.id + '-s') ?? false;

                        // Do text to speech.
                        makeTalk(text, mcVoice, providedAudio );

                        const arrow = triggee.querySelector('img');

                        if ( arrow) {
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
                        document.addEventListener('keydown', closeExplainer );

                        // Persist to avoid showing again on refresh.
                        persistItemRemoval(value.dataset.triggee, 'point', 0, 2000, '');
                    }
                }

                // NPC Walking Path Trigger.
                if (true === value.classList.contains('path-trigger') && false === value.classList.contains('already-hit')) {
                    const triggee = document.querySelector('.' + value.getAttribute('data-triggee'));

                    // Move triggered NPC.
                    moveNPC(triggee, false);

                    value.remove();
                }

                // For collectables.
                if ('true' === value.dataset?.collectable ) {
                    if (value.dataset.mission && '' !== value.dataset.mission) {
                        saveMission(value.dataset.mission, value, position);
                    }

                    // Add item to storage menu.
                    storeExploreItem(value);

                    // If just points. store it.
                    if ('point' === value.dataset.type && value.dataset?.value && 0 < value.dataset.value) {
                        runPointAnimation(value, cleanClassName(value.className), false, value.dataset.value, '');
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
                position = cutsceneTriggee && '' !== cutsceneTriggee ? cleanClassName(cutsceneTriggee) : position;

                const theCutScene = cutsceneTriggee && '' !== cutsceneTriggee ? document.getElementById( value.id.replace('-t', '') ) : document.querySelector('.' + position + '-map-cutscene');

                // Trigger cutscene if overlapping cutscene trigger item.
                if (false === value.classList.contains('engage') && theCutScene && false === theCutScene.classList.contains('been-viewed') && true === value.classList.contains('cutscene-trigger')) {
                    const triggerType = value.dataset.triggertype;

                    if ('engagement' !== triggerType) {
                        if (value.dataset.mission && '' !== value.dataset.mission) {
                            saveMission(value.dataset.mission, value, position);
                        }

                        engageCutscene( position, false );

                        // Persist trigger so it isn't triggerable again.
                        if ('' === position) {
                            saveMaterializedItem(area, [cleanClassName(value.className)]);
                        }

                        // Remove trigger.
                        value.remove();
                    } else {
                        value.classList.add('engage');
                        triggerIndicator(document.querySelector('.' + theCutScene.dataset?.character + '-map-item'), true, value, false);
                    }
                }

                // Trigger item creation if you walk on this trigger.
                if (true === value.classList.contains('materialize-item-trigger')) {
                    clearTimeout(saveMaterializedItemTimeout);
                    const itemName = cleanClassName(value.className);

                    const itemEl = document.querySelector('.' + itemName + '-map-item');
                    const dragDest = document.querySelector('.' + itemName + '-drag-dest-map-item');

                    if (itemEl) {
                        itemEl.style.display = 'block';
                    }

                    if (dragDest) {
                        dragDest.style.display = 'block';
                    }

                    materializedItemsArray.push(itemName);

                    saveMaterializedItemTimeout = setTimeout(() => {
                        saveMaterializedItem(area, materializedItemsArray);
                    }, 1000);

                    // remove trigger.
                    value.remove();
                }

                // remove item on collision if collectable.
                if ('true' === value.getAttribute('data-collectable')) {
                    value.remove();
                }

                // Clear this so it doesn't set hazard to false even when I'm in it.
                clearTimeout(getOutOfHazard);

                getOutOfHazard = setTimeout(() => {
                    inHazard = false;
                    hazardItem = false;
                    hazardCounter = 0;
                    hazardGauge.classList.remove( 'engage' );
                }, 100);
            } else if ( true === value.classList.contains('engage') || true === value.classList.contains('dragme') ) {
                value.classList.remove('engage');
                value.classList.remove('dragme');

                if (indicator) {
                    indicator.classList.remove('engage');
                    window.allowHit = true;
                }
            }

            // For breakables and other interactions.
            if (weaponEl && 'none' !== weaponEl.style.display) {
                if ( elementsOverlap( weaponEl, value, 0 ) ) {
                    // Timer trigger logic.
                    const triggeeName = cleanClassName(value.className);
                    const triggee = document.querySelector('[data-timertriggee="' + triggeeName + '"]');
                    const hasTrigger = value.dataset?.timertriggee;

                    // Timer scenario.
                    const startTimerItem = document.querySelector('.start-timer');

                    if ((triggee || undefined !== hasTrigger) && (startTimerItem && false === value.classList.contains('start-timer'))) {
                        const timerPosition = 'true' === startTimerItem.dataset.removable ? '' : [position, cleanClassName(startTimerItem.className)];
                        saveMission(value.dataset.mission, value, timerPosition);
                        startTimerItem.style.display = 'none';
                        value.style.display = 'none';
                    } else if (triggee || undefined !== hasTrigger) {
                        value.classList.add('start-timer');

                        const triggeeTimer = undefined !== hasTrigger ? parseInt(value.dataset.timer) : parseInt(triggee.dataset.timer);

                        if (0 < triggeeTimer) {
                            setTimeout(() => {
                                value.classList.remove('start-timer');
                            }, 1000 * triggeeTimer);

                            startTheTimer(1000 * triggeeTimer);
                        }
                    } else if (
                        ('true' === value.dataset.breakable ||
                            'true' === value.dataset.collectable) &&
                        value.dataset.mission &&
                        '' !== value.dataset.mission &&
                        canCharacterInteract(value, mapChar, 'strength') &&
                        (null === triggee && undefined === hasTrigger) &&
                        noOtherItemAttachedToMission(value.dataset.mission)
                    ) {
                        const multiItem = document.querySelectorAll(`.map-item[data-mission="${value.dataset.mission}"]`);

                        if (multiItem) {
                            position = [];

                            multiItem.forEach(theMultiItem => {
                                position.push(cleanClassName(theMultiItem.className));
                            });
                        }

                        saveMission(value.dataset.mission, value, position);
                    }

                    // For collectables.
                    if ('true' === value.getAttribute('data-breakable') && false === value.classList.contains( 'interacted-with' ) && false === value.classList.contains( 'no-point' ) ) {
                        // Add item to storage menu.
                        storeExploreItem(value);

                        // If just points. store it.
                        if ('point' === value.dataset.type) {
                            runPointAnimation(value, cleanClassName(value.className), false, value.dataset.value, '');
                        }

                        value.classList.add('interacted-with');
                    }

                    // Don't remove item if it's a sign.
                    if (
                        true === noOtherItemAttachedToMission(value.dataset.mission) &&
                        'true' === value.dataset.breakable &&
                        'explore-sign' !== value.dataset.genre &&
                        canCharacterInteract(value, mapChar, 'strength') &&
                        (null === value.dataset.minigame || undefined === value.dataset.minigame) &&
                        (null === value.dataset.disappear || undefined === value.dataset.disappear) &&
                        'no' !== value.dataset?.disappear
                    ) {
                        value.remove();
                    } else if (value) {
                        interactWithItem(value, mapChar);
                    }
                }
            }
        });
    }

    // Engage/disengage walking class.
    if (d[37] || d[38] || d[39] || d[40] || d[87] || d[65] || d[68] || d[83] ) {
        const goThisWay = true === d[$newest] ? $newest : parseInt(getKeyByValue(d, true));
        const isDragging = window.isDragging;
        let direction;
        let newCharacterImage;

        if ( false === box.classList.contains( 'fight-image' ) && true === window.allowMovement ) {
            switch (goThisWay) {
                case 38 :
                    box.classList.remove('engage');
                    direction = '' !== isDragging ? window.draggingDirection : 'up';
                    newCharacterImage = document.getElementById(window.mainCharacter + '-' + direction + isDragging + window.currentWeapon);
                    if (newCharacterImage) {
                        newCharacterImage.classList.add('engage');
                    }

                    mapChar.className = '';
                    mapChar.classList.add('top-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'top');
                    }
                    break;
                case 37 :
                    box.classList.remove('engage');
                    direction = '' !== isDragging ? window.draggingDirection : 'left';
                    newCharacterImage = document.getElementById(window.mainCharacter + '-' + direction + isDragging + window.currentWeapon);
                    if (newCharacterImage) {
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('left-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'left');
                    }
                    break;
                case 39 :
                    box.classList.remove('engage');
                    direction = '' !== isDragging ? window.draggingDirection : 'right';
                    newCharacterImage = document.getElementById(window.mainCharacter + '-' + direction + isDragging + window.currentWeapon);
                    if (newCharacterImage) {
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('right-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'right');
                    }
                    break;
                case 40 :
                    box.classList.remove('engage');
                    direction = '' !== isDragging ? window.draggingDirection : 'down';
                    newCharacterImage = document.getElementById(window.mainCharacter + '-' + direction + isDragging + window.currentWeapon);
                    if (newCharacterImage) {
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('down-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'down');
                    }
                    break;
                case 87 :
                    box.classList.remove('engage');
                    direction = '' !== isDragging ? window.draggingDirection : 'up';
                    newCharacterImage = document.getElementById(window.mainCharacter + '-' + direction + isDragging + window.currentWeapon);
                    if (newCharacterImage) {
                        newCharacterImage.classList.add('engage');
                    }

                    mapChar.className = '';
                    mapChar.classList.add('top-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'top');
                    }
                    break;
                case 65 :
                    box.classList.remove('engage');
                    direction = '' !== isDragging ? window.draggingDirection : 'left';
                    newCharacterImage = document.getElementById(window.mainCharacter + '-' + direction + isDragging + window.currentWeapon);
                    if (newCharacterImage) {
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('left-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'left');
                    }
                    break;
                case 68 :
                    box.classList.remove('engage');
                    direction = '' !== isDragging ? window.draggingDirection : 'right';
                    newCharacterImage = document.getElementById(window.mainCharacter + '-' + direction + isDragging + window.currentWeapon);
                    if (newCharacterImage) {
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('right-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'right');
                    }
                    break;
                case 83 :
                    box.classList.remove('engage');
                    direction = '' !== isDragging ? window.draggingDirection : 'down';
                    newCharacterImage = document.getElementById(window.mainCharacter + '-' + direction + isDragging + window.currentWeapon);
                    if (newCharacterImage) {
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('down-dir');
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'down');
                    }
                    break;
            }
        }

        playWalkSound();
    } else {
        stopWalkSound();
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
 */
function pushCharacter(distanceMult, pushElement, pushee) {
    "use strict";

    // Push user away from hazard center.
    let targetX = parseInt(pushee.style.left.replace('px', ''));
    let targetY = parseInt(pushee.style.top.replace( 'px', '' ));

    if ( pushElement ) {
        const enemyLeft = parseInt(pushElement.style.left.replace('px'));
        const enemyTop = parseInt(pushElement.style.top.replace('px'));

        targetX = ( targetX + 400 ) < enemyLeft ? targetX - distanceMult : targetX + distanceMult;
        targetY = ( targetY + 400 ) < enemyTop ? targetY - distanceMult : targetY + distanceMult;

        pushee.style.left = targetX + 'px';
        pushee.style.top = targetY + 'px';
    }
}

/**
 * Check if there are any other items that trigger the same mission.
 * @param mission
 * @returns {boolean}
 */
function noOtherItemAttachedToMission(mission) {
    "use strict";

    const itemMissions = document.querySelectorAll( `.map-item[data-mission="${mission}"]` );
    const enemyItems = document.querySelectorAll( `.enemy-item[data-mission="${mission}"]` );

    return 1 >= itemMissions.length && 0 === enemyItems.length;
}

/**
 * Is the provided item able to be interacted with by character.
 * @param item
 * @param character
 * @param type
 * @returns {boolean}
 */
function canCharacterInteract( item, character, type ) {
    "use strict";

    if ( type === 'strength') {
        return ('yes' === item.dataset.isstrong && 'strength' === character.dataset.ability) ||
            (undefined === item.dataset.isstrong || 'no' === item.dataset.isstrong);
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
function interactWithItem( item ) {
    "use strict";

    // If item is breakable.
    if ('no' !== item.dataset?.disappear && 'true' === item.dataset.breakable && 'explore-sign' !== item.dataset.genre ) {
        item.style.display = 'none';
    }

    // If disappear set to false change image.
    if ('no' === item.dataset?.disappear) {
        swapInteractedImage(item);
    }
}

/**
 * Swatch alt image for interacted items like breakables that don't disappear.
 * @param item
 */
function swapInteractedImage(item) {
    "use strict";

    const altImage = item.dataset?.interacted;

    if ( altImage && '' !== altImage ) {
        item.style.background = `url(${altImage}) no-repeat`;
        item.style.backgroundSize = 'cover';

        if ('true' === item.dataset.passable) {
            item.classList.add('passable');
        }
    }
}

function saveMaterializedItem(area, materializedItemsArray) {
    "use strict";

    const jsonString = {
        area: area,
        item: materializedItemsArray,
    };
    // Save position of item.
    fetch(`${OrbemOrder.siteRESTURL}/save-materialized-item/`, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString) // The JSON stringified payload
    })
    .then(response => {
        // Check if the response status is in the range 200-299
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
    });
}

function enableAbility(ability) {
    "use strict";

    const jsonString = {
        slug: ability,
    };

    // Save position of item.
    fetch(`${OrbemOrder.siteRESTURL}/enable-ability/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
    });
}

/**
 * Trigger indicator.
 */
function triggerIndicator(indicateMe, isCutscene, trigger, isMinigame) {
    "use strict";

    window.allowHit = false;
    const indicator = document.querySelector( '.indicator-icon' );

    if ( window.allowIndicate && indicateMe && indicator && false === indicator.classList.contains( 'engage' ) ) {
        const leftPosition = indicateMe.style.left.replace('px', '');
        const topPosition = indicateMe.style.top.replace('px', '');
        const width = ( indicateMe.getBoundingClientRect().width / 2 ) - 7.5;
        const positionName = cleanClassName(indicateMe.className);

        if ( indicator ) {
            indicator.classList.add( 'engage' );
            indicator.style.left = ( width + parseInt(leftPosition) ) + 'px';
            indicator.style.top = ( parseInt(topPosition) - 25 ) + 'px';

            if ( true === isCutscene ) {
                indicator.dataset.sign = '';
                indicator.dataset.minigame = '';
                indicator.dataset.cutscene =  trigger.dataset.triggee;
            }

            if ( false === isCutscene ) {
                indicator.dataset.cutscene = '';
                indicator.dataset.minigame = '';
                indicator.dataset.sign = positionName;
            }

            if ( true === isMinigame ) {
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
function storeExploreItem( item ) {
    "use strict";

    const type = item.getAttribute('data-type');
    const value = item.getAttribute( 'data-value' );
    const id = item.id;
    const name = cleanClassName( item.className );
    const menuItem = document.createElement( 'span' );
    const menuType = getMenuType( type );
    const menu = document.querySelector( '[data-menu="' + menuType + '"]' );
    const thePoints = document.querySelector( `#explore-points .${ type }-amount` );
    let currentPoints = 100;

    if ( thePoints ) {
        currentPoints = thePoints.getAttribute( 'data-amount' );
    }

    if ( 'gear' !== type && ( 'health' === type || 'mana' === type ) && 100 > currentPoints ) {
        return;
    }

    // Add menu attributes.
    menuItem.setAttribute( 'data-type', type );
    menuItem.setAttribute( 'data-id', id );
    menuItem.setAttribute( 'data-value', value );
    menuItem.setAttribute( 'title', name );
    menuItem.setAttribute( 'data-empty', 'false' );

    // Item image.
    if ( 'gear' === type || 'weapons' === type ) {
        // Assign width/height on collect.
        const itemStyle = getComputedStyle(item);
        menuItem.setAttribute( 'data-width', itemStyle.width.replace( 'px', '' ) );
        menuItem.setAttribute( 'data-height', itemStyle.height.replace( 'px', '' ) );
        menuItem.setAttribute( 'data-strength', item.dataset.strength );

        const itemImage = document.createElement( 'img' );

        itemImage.setAttribute( 'src', item.dataset.image );
        itemImage.setAttribute( 'width', '80px' );
        itemImage.style.objectFit = 'contain';
        menuItem.append(itemImage);
    }
    menuItem.className = 'storage-item';

    // Add to menu.
    if ( menu ) {
        const emptyStorageItem = menu.querySelector('.storage-item[data-empty="true"]');
        const nonEmptyStorageItems = menu.querySelectorAll('.storage-item[data-empty="false"]');
        let isNewItem = true;

        // If empty slot exists then add new item to menu.
        if ( emptyStorageItem ) {
            emptyStorageItem.remove();

            // Check if item already exists and iterate if does. Add a number to it.
            if ( nonEmptyStorageItems ) {
                nonEmptyStorageItems.forEach(nonEmptyStorageItem => {
                    const menuItemName = nonEmptyStorageItem.getAttribute( 'title' );

                    // If name is same, add count to item.
                    if ( menuItemName === name ) {
                        let currentCount = nonEmptyStorageItem.getAttribute( 'data-count' );

                        currentCount = null !== currentCount ? parseInt( currentCount ) + 1 : 2;
                        nonEmptyStorageItem.setAttribute( 'data-count', currentCount );
                        isNewItem = false;
                    }
                } );
            }

            if ( true === isNewItem ) {
                menu.prepend( menuItem );
                menuItem.addEventListener( 'click', () => {
                    if ('true' !== menuItem.dataset.empty) {
                        showItemDescription(menuItem);
                    }
                });
            }

            // Add item to database.
            saveStorageItem(id, name, type, value, false);
        }
    }
}

function setPreviousCutsceneArea( cutsceneName ) {
    "use strict";

    const jsonString = {
        cutscene: cutsceneName,
    };

    // Set the cutscene area previously viewed.
    fetch(`${OrbemOrder.siteRESTURL}/set-previous-cutscene-area/`, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
            'X-WP-Nonce': OrbemOrder.orbemNonce
        },
        body: JSON.stringify(jsonString) // The JSON stringified payload
    })
        .then(response => {
            // Check if the response status is in the range 200-299
            if (!response.ok) {
                throw new Error('Network response was not ok ' + response.statusText);
            }
        });
}

/**
 * cut scene logic
 */
function engageCutscene( position, areaCutscene ) {
    "use strict";

    const cutscene = undefined === position?.className ? document.querySelector('.' + position + '-map-cutscene') : position;
    position = undefined === position?.className ? position : cleanClassName( position.className );

    if ( cutscene && ( undefined === cutscene.dataset?.video || 'false' === cutscene.dataset?.video ) ) {
        const dialogues = cutscene.querySelectorAll( 'p, .wp-block-orbem-paragraph-mp3' );
        const mc = document.getElementById('map-character');
        const character = cleanClassName(cutscene.querySelector('.wp-block-orbem-paragraph-mp3:not(.explore-character-' + mc?.dataset?.mainid + ')')?.className);
        const npc = document.getElementById(character);

        if (false === cutscene.classList.contains('been-viewed')) {
            // Stop movement.
            window.allowMovement = false;
            window.allowHit = false;

            // Before Cutscene.
            beforeCutscene(cutscene);

            if ( npc ) {
                setTimeout(() => {
                    npc.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

            let textContainer = dialogues[0];

            // on load.
            if (dialogues[0] && dialogues[0].classList.contains('wp-block-orbem-paragraph-mp3')) {
                textContainer = dialogues[0].querySelector('p');
            }

            const text = textContainer.innerText;
            textContainer.innerText = '';

            let wordCount = 0;

            const typeWriter = (element, text, i) => {
                clearTimeout( typeWriterTimeout );

                if (i < text.length) {
                    element.innerHTML += text.charAt(i);
                    i++;
                    typeWriterTimeout = setTimeout(function() {
                        wordCount++;

                        let regex = /^[a-zA-Z]+$/;

                        if ( false === regex.test( text.charAt(i) ) ) {
                            wordCount = 0;
                        }

                        typeWriter(element, text, i);
                    }, 50); // Adjust the delay here
                } else {
                    window.nextDialogueTimeout = setInterval( () => {
                        if (true === window.nextDialogue ) {
                            nextDialogue();

                            clearInterval(window.nextDialogueTimeout);
                            window.nextDialogue = false;
                        }
                    }, 500 );
                }
            };

            typeWriter(textContainer, text, 0);

            const nextDialogue = () => {
                if ('' !== source ) {
                    source.stop();
                }

                if ( '' !== talkAudio ) {
                    talkAudio.pause();
                    talkAudio.currentTime = 0;
                }

                // Clear timeout incase manually triggered.
                clearInterval( window.nextDialogueTimeout );

                const currentDialogue = cutscene.querySelector( 'p.engage, .wp-block-orbem-paragraph-mp3.engage' );
                let nextDialogue = currentDialogue.nextElementSibling;

                dialogues.forEach( dialogue => {
                    dialogue.classList.remove( 'engage' );
                } );

                if ( nextDialogue ) {
                    nextDialogue.classList.add( 'engage' );

                    let providedAudio = nextDialogue.querySelector( 'audio' );
                    providedAudio = providedAudio ?? false;

                    const nextP = nextDialogue.querySelector( 'p' );
                    const text = nextP.innerText;

                    nextP.innerText = '';
                    typeWriter(nextP, text, 0 );

                    moveDialogueBox();
                    makeTalk(text, nextDialogue.dataset.voice, providedAudio );
                } else {
                    clearTimeout( typeWriterTimeout );
                    clearInterval( window.nextDialogueTimeout );

                    // At end of dialogue. Close cutscene and make walking available.
                    cutscene.classList.remove( 'engage' );
                    cutscene.removeEventListener( 'click', cutsceneKeys );
                    document.removeEventListener( 'keydown', cutsceneKeys );

                    // If not area cutscene reset MC cutscene character.
                    if ( 'yes' !== document.querySelector( '.default-map' ).dataset.iscutscene ) {
                        const mapMainCharacter = document.getElementById( 'map-character');
                        document.querySelector('div[data-character="' + mapMainCharacter.dataset?.mainid + '"].cut-character').classList.remove('engage');
                    }

                    // Reengage movement.
                    window.allowMovement = true;

                    // reset dialogue.
                    dialogues[0].classList.add( 'engage' );

                    // After cutscene.
                    afterCutscene( cutscene, areaCutscene, character );

                    // If cutscene area remove stuff.
                    cutscene.style.removeProperty('position' );
                    cutscene.style.removeProperty('display' );
                    cutscene.style.removeProperty('width' );
                    cutscene.style.removeProperty('max-height' );
                    cutscene.style.removeProperty('height' );
                    cutscene.style.removeProperty('transform' );
                    cutscene.style.removeProperty('left' );
                    cutscene.style.removeProperty('top' );
                }
            };

            /**
             * Handles key events during a cutscene, allowing progression through dialogue and ending the cutscene.
             * @param {KeyboardEvent} event - The keyboard event object.
             */
            const cutsceneKeys = ( event ) => {
                if ( true === window.allowCutscene ) {
                    if ( event.code === 'Space' && dialogues && cutscene.classList.contains( 'engage' ) ) {
                        nextDialogue();
                    }
                }
            };

            cutscene.classList.add('been-viewed');

            // Set allow by default.
            window.allowCutscene = true;

            const moveDialogueBox = (firstText = '') => {
                const currentDialogue = cutscene.querySelector( '.wp-block-orbem-paragraph-mp3.engage' );
                let providedAudio = currentDialogue.querySelector( 'audio' );
                providedAudio = providedAudio ?? false;
                const dialogueChar = cleanClassName(currentDialogue.className);
                const currentDialogueChar = mc.dataset?.mainid !== dialogueChar ? document.getElementById( dialogueChar ) : mc;
                let voice = currentDialogue.dataset.voice;
                const pathTrigger = currentDialogue.dataset?.triggerpath;
                let theCharacterEl = document.getElementById( dialogueChar );
                const theCharacterImage = cutscene.querySelector( '.cut-character[data-character="' + dialogueChar + '"]' );
                const theCharacterName = cutscene.querySelector( '.character-name[data-character="' + dialogueChar + '"]' );

                if ( mc ) {
                    theCharacterEl = mc.dataset.mainid === dialogueChar ? mc : theCharacterEl;
                }

                // Move dialogue box to talker.
                if ( true === areaCutscene ) {
                    if ( currentDialogueChar && cutscene ) {
                        let currentDialogueCharLeft = parseInt( currentDialogueChar.style.left.replace('px', '') ) - ( cutscene.offsetWidth / 2 );
                        let currentDialogueCharTop = parseInt( currentDialogueChar.style.top.replace('px', '') ) + ( currentDialogueChar.offsetHeight / 2 );

                        if ( mc.dataset?.mainid === dialogueChar ) {
                            currentDialogueCharLeft = currentDialogueCharLeft + ( mc.offsetWidth / 2 );
                        }

                        cutscene.style.left = currentDialogueCharLeft + 'px';
                        cutscene.style.top = currentDialogueCharTop + 'px';

                        const currentCharName = document.querySelector( '.engage.character-name' );
                        if ( currentCharName ) {
                            currentCharName.classList.remove('engage');
                            theCharacterName.classList.add( 'engage' );
                        }
                    }
                } else if ( mc ) {
                    const currentCharImage = cutscene.querySelector( '.engage.cut-character' );
                    const currentCharName = cutscene.querySelector( '.engage.character-name' );

                    if ( currentCharImage && currentCharName ) {
                        currentCharName.classList.remove( 'engage' );
                        currentCharImage.classList.remove('engage');
                        theCharacterImage.classList.add( 'engage' );
                        theCharacterName.classList.add( 'engage' );
                    }
                }

                // If triggerable, trigger the move path for character.
                if ( pathTrigger && theCharacterEl ) {
                    moveNPC(theCharacterEl, false);
                }

                if ('' !== firstText) {
                    makeTalk(firstText, voice, providedAudio);

                    if ( mc && theCharacterImage ) {
                        theCharacterImage.classList.add( 'engage' );
                    }

                    if ( mc && theCharacterName ) {
                        theCharacterName.classList.add( 'engage' );
                    }
                }
            };

            moveDialogueBox(text);

            // Add a keydown event listener to the document to detect spacebar press
            document.addEventListener('keydown', cutsceneKeys);

            // Fade in if area cutscene.
            if ( true === areaCutscene ) {
                fadeInScene();
            }
        }
    } else if ( cutscene && 'true' === cutscene.dataset?.video ) {
        if ( false === cutscene.classList.contains( 'been-viewed' ) ) {
            const cutsceneVideo = cutscene.querySelector( 'video' );
            // stop movement.
            window.allowMovement = false;
            cutscene.classList.add('engage');

            if ( cutsceneVideo ) {
                // Mute current if mute is flagged.
                if ('yes' === cutscene.dataset?.mutemusic && window.currentMusic) {
                    window.currentMusic.pause();
                }

                cutsceneVideo.play();
                cutsceneVideo.muted = false;

                cutsceneVideo.addEventListener( 'ended', () => {
                    // Reengage movement.
                    window.allowMovement = true;

                    // After cutscene.
                    afterCutscene( cutscene, areaCutscene, false );
                } );

                // Skip cutscene video.
                const skipButton = document.getElementById('skip-cutscene-video');

                if ( skipButton ) {
                    skipButton.addEventListener('click', () => {
                        // Reengage movement.
                        window.allowMovement = true;
                        cutsceneVideo.pause();

                        afterCutscene( cutscene, areaCutscene, false );
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
    "use strict";

    const communicateParents = document.querySelectorAll( '.communication-wrapper' );

    if ( communicateParents ) {
        communicateParents.forEach( communicateParent => {
            communicateParent.addEventListener('click', (e) => {
                const isCommunicate = e.target.closest( '.map-communicate' );
                if (( !isCommunicate && false === e.target.classList.contains('map-communicate') ) || false === communicateParent.classList.contains('engage')) {
                    if (false === communicateParent.classList.contains('engage')) {
                        communicateParent.classList.add('engage');
                        communicateParent.classList.remove('notify');
                    } else {
                        communicateParent.classList.remove('engage');
                    }
                }
            });

            const communicates = communicateParent.querySelectorAll('.map-communicate');

            if ( communicates ) {
                communicates.forEach( communicateEl => {
                    const dialogues = communicateEl.querySelectorAll( 'p, .wp-block-orbem-paragraph-mp3' );
                    const communicateType = communicateEl.dataset.type;

                    communicateEl.addEventListener( 'click', () => {
                        if ( 'voicemail' === communicateType && true === communicateParent.classList.contains('engage') ) {
                            let textContainer = dialogues[0];

                            const text = textContainer.innerText;

                            const moveDialogueBox = (firstText = '') => {
                                const currentDialogue = communicateEl.querySelector('.wp-block-orbem-paragraph-mp3.engage');
                                let providedAudio = currentDialogue.querySelector('audio');
                                providedAudio = providedAudio ?? false;
                                let voice = currentDialogue.dataset.voice;

                                if ('' !== firstText) {
                                    makeTalk(firstText, voice, providedAudio);
                                }
                            };

                            moveDialogueBox(text);
                        } else if ( true === communicateParent.classList.contains('engage') ) {
                            communicateEl.classList.toggle( 'show' );
                        }
                    });

                    // start music if exists.
                    if ( communicateEl.dataset.music && '' !== communicateEl.dataset.music ) {
                        playSong( communicateEl.dataset.music, cleanClassName(communicateEl.className) );
                    }

                    // Mute current if mute is flagged.
                    if ('yes' === communicateEl.dataset?.mutemusic && window.currentMusic) {
                        window.currentMusic.pause();
                    }
                });
            }
        } );
    }
}

/**
 * Communicate logic
 */
function engageCommunicate( communicate, communicateTrigger ) {
    "use strict";

    const communicateEl = document.querySelector( '.' + communicate + '-map-communicate');
    const communicateParent = communicateEl.parentNode;

    communicateParent.classList.add('notify');

    if ( communicateTrigger ) {
        communicateTrigger.remove();
        persistItemRemoval(communicateEl.id, 'communicate', communicateParent.id, 2000, '');
    }

    // Show communicate.
    communicateEl.classList.add('engage');
}

/**
 * engage the sign to open.
 *
 * @param signname
 */
function engageSign( signname ) {
    "use strict";

    const item = document.querySelector( '.' + signname + '-map-item' );
    item.classList.add( 'open-up' );

    document.addEventListener( 'click', () => {item.classList.remove( 'open-up' );}, { once: true } );

    // Close on action key
    document.addEventListener('keydown', closeSign);

    /**
     * Close event using spacebar for focus view.
     * @param event
     */
    function closeSign(event) {
        if ('Space' === event.code) {
            item.classList.remove('open-up');
            document.removeEventListener('keydown', closeSign);
        }
    }
}

/**
 * Stuff that happens before a cutscene.
 * @param cutscene
 */
function beforeCutscene( cutscene ) {
    "use strict";

    const characterPosition = JSON.parse( cutscene.getAttribute( 'data-character-position' ) );
    const mapCharacter = document.getElementById( 'map-character' );

    // Face NPC before talking to them. Good manners.
    faceNPC(mapCharacter, cutscene.dataset.character, cutscene);

    if ( characterPosition && 0 < characterPosition.length && undefined !== characterPosition[0] ) {
        window.allowCutscene = false;
        // Trigger character move before cutscene starts.
        moveCharacter( mapCharacter, characterPosition[0].top, characterPosition[0].left, true, cutscene );
    }
}

function faceNPC(mapCharacter, npc, cutscene) {
    "use strict";

    const npcEl = document.querySelector( '.' + npc + '-map-item');
    const mcImage = mapCharacter.querySelector( '.map-character-icon.engage' );

    if ( npcEl ) {
        const npcLeft = parseInt( npcEl.style.left.replace( 'px', '')) + 25;
        const npcTop = parseInt( npcEl.style.top.replace( 'px', '' )) + 25;
        const npcRight = (npcLeft + npcEl.offsetWidth) - 50;
        const npcBottom = (npcTop + npcEl.offsetHeight) - 50;
        const mcLeftCont = parseInt(mapCharacter.style.left.replace( 'px', '' ));
        const mcTopCont = parseInt(mapCharacter.style.top.replace( 'px', ''));
        const mcLeft = mcLeftCont + ( 400 - (mcImage.offsetWidth / 2));
        const mcRight = mcLeft + mcImage.offsetWidth;
        const mcTop = mcTopCont + ( 400 - (mcImage.offsetHeight / 2));
        const mcBottom = mcTop + mcImage.offsetHeight;

        let direction;
        let npcDirection = false;

        direction = mcLeft > npcRight ? 'left' : false;
        direction = mcRight < npcLeft ? 'right' : direction;
        direction = mcTop > npcBottom ? 'up' : direction;
        direction = mcBottom < npcTop ? 'down' : direction;

        switch (direction) {
            case 'left' :
                npcDirection = 'right';
                break;
            case 'right' :
                npcDirection = 'left';
                break;
            case 'up' :
                npcDirection = 'down';
                break;
            case 'down' :
                npcDirection = 'up';
                break;
        }

        if (false !== direction) {
            setStaticMCImage( mapCharacter, direction, false );

            if ('no' !== cutscene.dataset?.npcfaceme) {
                setStaticNPCImage( npcDirection, npcEl );
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
function afterCutscene( cutscene, areaCutscene, character ) {
    "use strict";

    cutscene.classList.remove( 'engage' );

    window.nextAreaMissionComplete = '';
    const cutsceneName = cleanClassName( cutscene.className ).replace( ' ', '' );
    const bossFight = cutscene.dataset.boss;
    const cutsceneCharacter = character ? document.getElementById( character ) : false;
    const indicator = document.querySelector( '.indicator-icon' );
    const communicateDevice = cutscene.dataset?.communicate;
    const materializeCutscene = document.querySelector( '[data-materializecutscene="' + cutsceneName + '"]' );

    if ( materializeCutscene && false === materializeCutscene.classList.contains('enable') ) {
        materializeCutscene.classList.add( 'enable' );
    }

    // Show dependent communication devices.
    if ( communicateDevice && '' !== communicateDevice ) {
        const communicateDeviceEl = document.querySelector( '.' + communicateDevice + '-map-item' );

        if ( communicateDeviceEl ) {
            communicateDeviceEl.classList.add( 'dependent' );
        }
    }

    // Hide indicator.
    if ( indicator ) {
        indicator.classList.remove( 'engage' );
    }

    // Give points if value type is specified.
    if ( '' !== cutscene.dataset?.type && undefined !== cutscene.dataset?.type ) {
        runPointAnimation(cutscene, cutsceneName, false, cutscene.dataset.value, '');
    }

    // Hide cutscene images.
    const mcImage = document.querySelector('[data-character="' + window.mainCharacter + '"]');

    if ( mcImage ) {
        mcImage.classList.remove( 'engage' );
    }

    // restart music if it changed.
    if ( ( 'yes' === cutscene.dataset.mutemusic || cutscene.dataset.music && '' !== cutscene.dataset.music ) && OrbemOrder.musicNames[currentLocation] ) {
        playSong( OrbemOrder.musicNames[currentLocation], currentLocation );
    }

    // Stop talking.
    if ( '' !== talkAudio ) {
        talkAudio.pause();
        talkAudio.currentTime = 0;
    }

    // Trigger walking path if selected and has path.
    const pathTriggerPosition = document.querySelector( '[data-trigger-cutscene="' + cutsceneName + '"]' );
    const cutsceneHasPath = undefined !== cutscene.dataset?.path;

    // Push MC if NPC needs to walk after cutscene.
    if ( pathTriggerPosition || cutsceneHasPath ) {
        // Push MC away from character.
        pushMC(30);
    }

    if ( pathTriggerPosition ) {
        moveNPC( pathTriggerPosition, false );
    }

    // If cutscene has walking path. Move NPC after cutscene.
    if ( cutsceneHasPath ) {
        moveNPC( cutsceneCharacter, cutscene );
    }

    // Remove after cutscene.
    let removeThings = document.querySelectorAll('[data-removeaftercutscene]' );

    if ( removeThings ) {
        removeItems( removeThings, cutsceneName );
    }

    // Materialize item after cutscene.
    let showItems = document.querySelectorAll('[data-showaftercutscene="' + cutsceneName + '"]');

    if ( showItems ) {
        showItems.forEach( showItem => {
            showItem.classList.add('no-point');
            materializedItemsArray.push(cleanClassName(showItem.className));
        } );

        saveMaterializedItem(currentLocation, materializedItemsArray);
    }

    // Go to new area after cutscene if next area exists.
    const nextArea = cutscene.dataset.nextarea;
    const nextAreaPosition = cutscene.getAttribute( 'data-nextarea-position' );
    const areaMap = cutscene.dataset.mapurl;
    const weapon = document.querySelector( '.map-weapon' );

    // Complete mission if cutscene has one.
    const missionComplete = cutscene.dataset.missioncomplete;

    if ( missionComplete ) {
        const missionCompleteMission = document.querySelector( '.' + missionComplete + '-mission-item' );

        saveMission( missionComplete, missionCompleteMission, missionComplete );
        window.nextAreaMissionComplete = missionComplete;
    }

    // If nextArea exists then trigger new area change.
    if ( nextArea ) {
        enterNewArea( nextArea, weapon, areaMap, nextAreaPosition );
    }

    // Reengage hit.
    setTimeout(() => {
        window.allowHit = true;

        // Reset after cutscene for face npc logic:
        window.faceNPC = '';

        if ( pathTriggerPosition && 'true' === pathTriggerPosition.dataset?.cutscenebreak ) {
            pathTriggerPosition.dataset.cutscenebreak = 'false';
        }

        if ( cutsceneCharacter && 'true' === cutsceneCharacter.dataset?.cutscenebreak ) {
            cutsceneCharacter.dataset.cutscenebreak = 'false';
        }

        if ( bossFight && '' !== bossFight ) {
            const daBoss = document.querySelector( '.' + bossFight + '-map-item' );

            if ( daBoss ) {
                engageEnemy( daBoss );
            }
        }
    }, 100);
}

function removeItems( removeThings, cutsceneName ) {
    "use strict";

    removeThings.forEach( removeThing => {
        if ( cutsceneName === removeThing.dataset.removeaftercutscene ) {
            removeThing.remove();

            persistItemRemoval(cleanClassName(removeThing.className), 'point', 0, 2000, '');
        }
    } );
}

function playWalkSound() {
    "use strict";

    const walkingSound = document.getElementById('walking');

    if ( walkingSound && undefined !== walkingSound?.src && '' !== walkingSound.src ) {
        walkingSound.loop = true;

        if ( window.sfxVolume ) {
            walkingSound.volume = window.sfxVolume;
        }

        walkingSound.play();
    }

    return false;
}

function fadeInScene() {
    "use strict";

    const container = document.querySelector('.game-container');

    if ( container ) {
        container.dataset.fadeout = '';

        setTimeout( () => {
            container.dataset.fadeout = 'false';
        }, 1000);
    }
}

function fadeOutScene() {
    "use strict";

    const container = document.querySelector('.game-container');

    if ( container ) {
        container.dataset.fadeout = 'true';
    }
}

function stopWalkSound() {
    "use strict";

    const walkingSound = document.getElementById('walking');

    if ( walkingSound ) {
        walkingSound.pause();
        walkingSound.currentTime = 0;
    }

    return false;
}

/**
 * Enter an explore position if it is enterable.
 */
export function enterExplorePoint(value, mapUrl) {
    "use strict";

    // Add enter buttons to map items.
    const position = undefined !== value.className ? cleanClassName(value.className) : value;
    mapUrl = 'false' !== mapUrl ? mapUrl : value.getAttribute( 'data-map-url' );

    // Add data point to button.
    const weaponEl = document.querySelector( '.map-weapon' );

    if ( weaponEl ) {
        weaponEl.style.display = "none";
    }

    enterNewArea(position, weaponEl, mapUrl);
}

/**
 * Handles character movement on the map interface.
 * This function sets up event listeners for keyboard and touch inputs
 * to enable character movement. It also continuously updates the character's
 * position on the map based on user input.
 */
function movementIntFunc() {
    "use strict";

    const d = {};
    let $newest = false;
    window.allowMovement = true;
    window.keyDown = false;

    clearInterval(window.movementInt);

    // Add listeners for explore keyboard movement.
    document.addEventListener( 'keydown', function ( e ) {

        d[e.which] = true;

        $newest = e.which;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
        clearTimeout( window.coordinateTimeout );
    } );

    document.addEventListener( 'keyup', function ( e ) {
        stopWalkingFunction(e, false);
    } );

    document.addEventListener( 'touchend', function ( e ) {
        stopWalkingFunction(e, true);
    } );

    function stopWalkingFunction(e, touchEvent) {
        const keys = [37,38,39,40,87,65,83,68];
        const mapChar = document.querySelector('#map-character');

        d[e.which] = false;

        window.keyDown = false;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );

        // Set Coordinates.
        if ( true === keys.includes( e.which ) || true === touchEvent ) {
            window.coordinateTimeout = setTimeout(() => {
                const mapChar = document.querySelector('#map-character');
                const userLeft = mapChar.style.left;
                const userTop = mapChar.style.top;

                if ( false === window.keyDown && ( userLeft !== window.charCurrentLeft || userTop !== window.charCurrentTop ) ) {
                    addUserCoordianate(userLeft, userTop);
                    window.charCurrentLeft = userLeft;
                    window.charCurrentTop = userTop;

                    clearInterval(window.coordinateTimeout);
                }
            }, 1000);

            setStaticMCImage(mapChar, '', false);
        }
    }

    document.querySelector( '.top-left' ).addEventListener( 'touchstart', function ( e ) {
        e.preventDefault();
        d[37] = true;
        d[38] = true;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
        clearTimeout( window.coordinateTimeout );
    } );
    document.querySelector( '.top-left' ).addEventListener( 'touchend', function ( e ) {
        e.preventDefault();
        d[37] = false;
        d[38] = false;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
        // Set Coordinates.
        window.coordinateTimeout = setTimeout( () => {
            const mapChar = document.querySelector( '#map-character' );
            const userLeft = mapChar.style.left;
            const userTop = mapChar.style.top;

            addUserCoordianate(userLeft, userTop);
        }, 1000);
    } );
    document.querySelector( '.top-middle' ).addEventListener( 'touchstart', function ( e ) {
        e.preventDefault();
        d[38] = true;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.top-middle' ).addEventListener( 'touchend', function ( e ) {
        e.preventDefault();
        d[38] = false;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.top-right' ).addEventListener( 'touchstart', function ( e ) {
        e.preventDefault();
        d[38] = true;
        d[39] = true;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.top-right' ).addEventListener( 'touchend', function ( e ) {
        e.preventDefault();
        d[38] = false;
        d[39] = false;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.middle-left' ).addEventListener( 'touchstart', function ( e ) {
        e.preventDefault();
        d[37] = true;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.middle-left' ).addEventListener( 'touchend', function ( e ) {
        e.preventDefault();
        d[37] = false;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.middle-right' ).addEventListener( 'touchstart', function ( e ) {
        e.preventDefault();
        d[39] = true;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.middle-right' ).addEventListener( 'touchend', function ( e ) {
        e.preventDefault();
        d[39] = false;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.bottom-left' ).addEventListener( 'touchstart', function ( e ) {
        e.preventDefault();
        d[37] = true;
        d[40] = true;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.bottom-left' ).addEventListener( 'touchend', function ( e ) {
        e.preventDefault();
        d[37] = false;
        d[40] = false;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.bottom-middle' ).addEventListener( 'touchstart', function ( e ) {
        e.preventDefault();
        d[40] = true;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.bottom-middle' ).addEventListener( 'touchend', function ( e ) {
        e.preventDefault();
        d[40] = false;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.bottom-right' ).addEventListener( 'touchstart', function ( e ) {
        e.preventDefault();
        d[39] = true;
        d[40] = true;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );
    document.querySelector( '.bottom-right' ).addEventListener( 'touchend', function ( e ) {
        e.preventDefault();
        d[39] = false;
        d[40] = false;

        // Turn off arrow flash if character moved.
        clearInterval( window.buttonShow );
    } );


    window.movementInt = setInterval( function () {
        const box = document.getElementById( 'map-character' );
        const weapon = document.querySelector( '.map-weapon' );
        let leftVal = box.style.left;
        let topVal = box.style.top;
        const leftValInt = parseInt( leftVal, 10 );
        const topValInt = parseInt( topVal, 10 );
        const finalPos = blockMovement( topValInt, leftValInt, false );
        const draggableItem = document.querySelector( '.dragme' );

        if ( window.allowMovement ) {
            if (Object.values(d).includes(true) ) {
                window.keyDown = true;
            }

            const myTop = miroExplorePosition( finalPos.top, d[87] ? 87 : 38, d[83] ? 83 : 40, d, window.moveSpeed, $newest );
            const myLeft = miroExplorePosition( finalPos.left, d[65] ? 65 : 37, d[68] ? 68 : 39, d, window.moveSpeed, $newest );
            box.style.top = myTop + 'px';
            box.style.left = myLeft + 'px';

            if ( weapon && true === window.weaponConnection ) {
                weapon.style.top = ( myTop + weaponPosTop ) + 'px';
                weapon.style.left = ( myLeft + weaponPosLeft ) + 'px';
            }

            if ( draggableItem ) {
                if (window.dragTop && false !== window.dragTop) {
                    draggableItem.style.top = window.dragTop.higher ? ( ( myTop + 450 ) - window.dragTop.offset ) + 'px' : ( ( myTop + 450 ) + window.dragTop.offset ) + 'px';
                }

                if (window.dragLeft && false !== window.dragLeft) {
                    draggableItem.style.left = window.dragLeft.left ? ( ( myLeft + 450 ) - window.dragLeft.offset ) + 'px' : ( ( myLeft + 450 ) + window.dragLeft.offset ) + 'px';
                }
            }

           box.scrollIntoView({block: 'nearest'});
        }
    }, 16 );
}

/**
 * clean class name
 */
function cleanClassName(classes) {
    "use strict";

    if ( 'string' === typeof classes ) {
        return classes.replace('wp-block-group map-item ', '')
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
            .replace('mission-trigger ', '')
            .replace(' hit', '')
            .replace('-minigame-item', '')
            .replace('minigame ', '')
            .replace(' pulse-wave-engage', '')
            .replace(' barage-wave-engage', '')
            .replace( ' selected', '')
            .replace( '-cutscene-trigger', '')
            .replace( 'cutscene-trigger ', '')
            .replace( 'next-mission ', '')
            .replace( '-mission-item', '')
            .replace( 'mission-item ', '')
            .replace( 'wp-block-orbem-paragraph-mp3 ', '')
            .replace( 'explore-character-', '');
    }
}

function setStaticMCImage( mapChar, direction, weaponChange ) {
    "use strict";

    // Change to static image.
    const currentCharacterImage = document.querySelector('.map-character-icon.engage');

    if ( ( currentCharacterImage && '' === window.currentCharacterAutoDirection ) || ( currentCharacterImage && '' !== direction ) ) {
        let staticId = currentCharacterImage.id.replace('left-punch', 'left').replace('right-punch', 'right').replace('up-punch', 'up').replace('down-punch', 'down').replace( window.mainCharacter + '-', window.mainCharacter + '-static-' );

        direction = '' !== window.isDragging ? window.draggingDirection : direction;

        if ( '' !== direction ) {
            staticId = window.mainCharacter + '-static-' + direction + window.isDragging;
        }

        const thisIsWeapon = weaponChange && defaultWeapon !== window.currentWeapon ? window.currentWeapon : '';
        const staticVersion = document.getElementById(staticId + thisIsWeapon);

        if ( staticVersion ) {
            currentCharacterImage.classList.remove( 'engage' );
            staticVersion.classList.add( 'engage' );

            mapChar.dataset.static = 'true';
        }
    }
}

/**
 * Add character hit/interaction ability to spacebar (key 32).
 */
function addCharacterHit() {
    "use strict";

    let weaponTime = 200;
    let heavyAttackInProgress = false;
    let chargeAttackInProgress = false;

    // Reset shiftispressed if you let go of it.
    document.addEventListener('keydown', (event) => {
        const weapon = document.querySelector( '.map-weapon' );

        if ( false !== window.allowHit ) {
            if (true === ['ShiftLeft', 'ShiftRight'].includes(event.code)) {
                shiftIsPressed = true;
            }

            if ('Space' === event.code) {
                spaceIsPressed = true;

                chargeAttackTimeout = setTimeout(() => {
                    if (true === spaceIsPressed) {
                        weapon.classList.add('charge-engage');
                        chargeAttackInProgress = true;
                    }
                }, 1000);
            }
        }
    } );

    document.addEventListener('keyup', (event) => {
        const weapon = document.querySelector( '.map-weapon' );
        const weaponType = defaultWeapon === weapon.dataset.weapon ? '' : '-' + weapon.dataset.weapon;
        const direction = 'top' === weapon.dataset.direction ? 'up' : weapon.dataset.direction;
        const mapChar =  document.querySelector( '#map-character' );
        let currentImageMapCharacter = mapChar.querySelector( '.map-character-icon.engage');
        const weaponAnimation = mapChar.querySelector( `#${window.mainCharacter}-${direction}-punch${weaponType}`);

        if ( false !== window.allowHit ) {
            const manaPoints = document.querySelector(`#explore-points .mana-amount`);
            const currentPoints = manaPoints ? manaPoints.dataset.amount : 0;

            if (true === ['ShiftLeft', 'ShiftRight'].includes(event.code)) {
                shiftIsPressed = false;
            }

            if ('Space' === event.code) {
                // Trigger charge attack if started.
                spaceIsPressed = false;
                clearTimeout(chargeAttackTimeout);

                if (weapon && false === heavyAttackInProgress) {
                    const isSpell = weapon.classList.contains('spell');
                    weaponTime = weapon.classList.contains('protection') ? 8000 : 100;

                    // Only engage if not a spell or mana is not 0.
                    if ('true' === weapon.dataset.projectile || (true === isSpell && 0 < currentPoints) || false === isSpell && false === chargeAttackInProgress) {
                        weapon.classList.add('engage');

                        // Move weapon based on direction
                        switch (direction) {
                            case 'up':
                                weaponPosTop = 310;
                                break;
                            case 'down':
                                weaponPosTop = 490;
                                break;
                            case 'left':
                                weaponPosLeft = 350;
                                break;
                            case 'right':
                                weaponPosLeft = 450;
                                break;
                        }

                        if ( currentImageMapCharacter ) {
                            currentImageMapCharacter.classList.add('punched');

                            weaponAnimation.classList.add( 'engage' );
                        }
                    }

                    // If spell, take manna away if above 0.
                    if (0 < currentPoints && true === isSpell) {
                        // Use mana.
                        const objectAmount = weapon.getAttribute('data-value');

                        // Remove amount to current points.
                        manaPoints.setAttribute('data-amount', parseInt(currentPoints) - parseInt(objectAmount));

                        // Add class for notification of point gain.
                        manaPoints.classList.add('engage');

                        // Get new amount.
                        let newAmount = parseInt(currentPoints) - parseInt(objectAmount);
                        newAmount = 0 > newAmount ? 0 : newAmount;

                        // Add new point count to DB.
                        addUserPoints(newAmount, 'mana', 'magic', false, '');

                        // Remove highlight on point bar.
                        setTimeout(() => {
                            manaPoints.classList.remove('engage');
                        }, 500);
                    }

                    // If spell or user has not hit weapon 3 time consecutively then reset weapon or is projectile.
                    if ('true' === weapon.dataset.projectile || true === isSpell || (false === isSpell && false === heavyAttackInProgress && false === shiftIsPressed)) {
                        setTimeout(() => {
                            // If heavy attack is not happening then you reset weapon.
                            if (false === weapon.classList.contains('heavy-engage')) {
                                weapon.classList.remove('engage');
                                currentImageMapCharacter.classList.remove('punched');

                                weaponAnimation.classList.remove( 'engage' );

                                // Reset weapon based on direction
                                switch (direction) {
                                    case 'up':
                                        weaponPosTop = 400;
                                        break;
                                    case 'down':
                                        weaponPosTop = 400;
                                        break;
                                    case 'left':
                                        weaponPosLeft = 400;
                                        break;
                                    case 'right':
                                        weaponPosLeft = 400;
                                        break;
                                }
                            }
                        }, weaponTime);
                    } else if (true === shiftIsPressed) {
                        const weaponAnimation = mapChar.querySelector( `#${window.mainCharacter}-${direction}-punch${weaponType}`);

                        weapon.classList.add('heavy-engage');
                        heavyAttackInProgress = true;

                        setTimeout(() => {
                            heavyAttackInProgress = false;
                            weapon.classList.remove('heavy-engage');
                            weapon.classList.remove('engage');
                            currentImageMapCharacter.classList.remove('punched');
                            weaponAnimation.classList.remove( 'engage' );

                            // Reset weapon based on direction
                            switch (direction) {
                                case 'up':
                                    weaponPosTop = 400;
                                    break;
                                case 'down':
                                    weaponPosTop = 400;
                                    break;
                                case 'left':
                                    weaponPosLeft = 400;
                                    break;
                                case 'right':
                                    weaponPosLeft = 400;
                                    break;
                            }

                            shiftIsPressed = false;
                        }, 500);
                    }

                    // For shooting.
                    if ( ( 0 < currentPoints && weapon ) && ( 'yes' === weapon.dataset.projectile || true === isSpell )) {
                        let weaponLeft = parseInt(weapon.style.left.replace('px', ''));
                        let weaponTop = parseInt(weapon.style.top.replace('px', ''));
                        const weaponClass = true === isSpell ? '.magic-weapon' : '.map-weapon';
                        const playerDirection = weapon.getAttribute('data-direction');

                        switch (playerDirection) {
                            case 'down' :
                                weaponTop = weaponTop + 10000;
                                break;
                            case 'top' :
                                weaponTop = weaponTop - 10000;
                                break;
                            case 'left' :
                                weaponLeft = weaponLeft - 10000;
                                break;
                            case 'right' :
                                weaponLeft = weaponLeft + 10000;
                                break;
                        }

                        shootProjectile(weapon, weaponLeft, weaponTop, document, 2, isSpell, weaponClass, weapon.dataset.projectile);
                    }

                    if (true === chargeAttackInProgress) {
                        chargeAttackInProgress = false;
                        weapon.classList.remove('charge-engage');
                        weapon.classList.add('charge-attack-engage');

                        // Remove highlight on point bar.
                        setTimeout(() => {
                            weapon.classList.remove('charge-attack-engage');
                            currentImageMapCharacter.classList.remove('punched');
                            weaponAnimation.classList.remove( 'engage' );
                        }, 700);
                    }
                }
            }
        } else {
            if ('Space' === event.code) {
                const indicator = document.querySelector('.indicator-icon');

                if (indicator && true === indicator.classList.contains('engage')) {
                    const cutscene = indicator.dataset?.cutscene;
                    const sign = indicator.dataset?.sign;
                    const minigame = indicator.dataset?.minigame;
                    const minigameEl = minigame ? document.querySelector('[data-minigame=' + minigame + ']') : false;

                    if (cutscene && '' !== cutscene) {
                        engageCutscene( cutscene, false );
                        indicator.dataset.cutscene = '';
                    }

                    if ( sign && '' !== sign ) {
                        engageSign( sign );
                        indicator.dataset.sign = '';
                    }

                    if ( minigame && minigameEl && '' !== minigame ) {
                        engageMinigameLogic( minigameEl );
                        indicator.dataset.minigame = '';
                    }
                }
            }
        }
    });
}

/**
 * Block movement if intersecting with the walls.
 * @param top
 * @param left
 * @param box
 * @returns {{top, left}}
 */
function blockMovement( top, left, box ) {
    "use strict";

    let finalTop = top;
    let finalLeft = left;
    const mainChar = box !== false ? '.map-character-icon.engage, ' : '';
    const mainCharEl = document.getElementById('map-character');
    box = box ? box : document.querySelector( '.map-character-icon.engage' );
    const hazardClass = false !== box && 'hazard' === mainCharEl.dataset.ability ? ':not([data-hazard="true"])' : '';

    const collisionWalls = document.querySelectorAll(
        mainChar + '.default-map svg rect, .map-item' + hazardClass + ':not([data-wanderer="yes"]):not(.explainer-container):not(.materialize-item-trigger):not(.drag-dest):not([data-trigger="true"]):not(.currently-dragging):not([data-passable="true"].no-point):not(.passable):not([data-genre="explore-sign"]):not([data-foreground="true"]):not([data-background="true"]), .enemy-item'
    );

    return getBlockDirection(collisionWalls, box, parseInt(finalTop), parseInt(finalLeft), false, ('' !== mainChar));
}

/**
 * Get left and top locations to move collider.
 *
 * @param collisionWalls
 * @param box
 * @param finalTop The top position to move if not blocked.
 * @param finalLeft The left position to move if not blocked.
 * @param enemy The enemy.
 * @param npc
 * @returns {{top: *, left: *, collide: *}}
 */
function getBlockDirection(collisionWalls, box, finalTop, finalLeft, enemy, npc) {
    "use strict";

    const left = finalLeft;
    const top = finalTop;
    let final = {top: finalTop, left: finalLeft, collide: false};
    const mapChar = document.getElementById('map-character');
    const mainCharPos = {
        offsetLeft: mapChar.offsetLeft + (400 - (box.offsetWidth / 2 )),
        offsetWidth: box.offsetWidth,
        offsetTop: mapChar.offsetTop + (400 - (box.offsetHeight / 2 )),
        offsetHeight: box.offsetHeight,
    };

    const finalCharPos = true === npc ? box : mainCharPos;

    if ( collisionWalls && ( ( false === window.godMode && true !== npc ) || true === npc ) ) {
        collisionWalls.forEach( collisionWallEle => {
            let collisionWall = collisionWallEle;

            if (true === collisionWall.id.includes('mc-')) {
                collisionWall = mainCharPos;
            }

            if ( box !== collisionWallEle && elementsOverlap( finalCharPos, collisionWall, 0 ) ) {
                const collisionWallRight = collisionWall.offsetLeft + collisionWall.offsetWidth;
                const collisionWallLeft = collisionWall.offsetLeft;
                const collisionWallTop = collisionWall.offsetTop;
                const collisionWallBottom = collisionWall.offsetTop + collisionWall.offsetHeight;
                const characterRight = finalCharPos.offsetLeft + finalCharPos.offsetWidth;
                const characterLeft = finalCharPos.offsetLeft;
                const characterTop = finalCharPos.offsetTop;
                const characterBottom = finalCharPos.offsetTop + finalCharPos.offsetHeight;

                // set collide true since we're overlapping.
                final.collide = true;

                const topCollision = collisionWallBottom > characterTop && collisionWallTop < characterTop && collisionWallBottom < ( characterTop + 10 );
                const bottomCollision = collisionWallTop < characterBottom && collisionWallBottom > characterBottom && collisionWallTop > ( characterBottom - 10 );
                const leftCollision = collisionWallRight > characterLeft && collisionWallLeft < characterLeft;
                const rightCollision = collisionWallLeft < characterRight && collisionWallRight > characterRight;
                let adjust = true === enemy ? 5 : window.moveSpeed;
                adjust = true === npc ? 1 : adjust;

                if (leftCollision && !rightCollision && !topCollision && !bottomCollision) {
                    final.left = left + adjust;
                    final.collide = true;
                }

                if (rightCollision && !leftCollision && !topCollision && !bottomCollision) {
                    final.left = left - adjust;
                    final.collide = true;
                }

                if (topCollision && !bottomCollision) {
                    final.top = top + adjust;
                    final.collide = true;
                }

                if (bottomCollision && !topCollision) {
                    final.top = top - adjust;
                    final.collide = true;
                }
            }
        } );
    }

    return final;
}

/**
 * Check if elements are touching.
 *
 * @param rect1
 * @param rect2
 * @param buffer
 * @returns {boolean}
 */
function elementsOverlap( rect1, rect2, buffer ) {
    "use strict";

    const rect1Right = rect1.offsetLeft + rect1.offsetWidth;
    const rect1Left = rect1.offsetLeft;
    const rect1Top = rect1.offsetTop;
    const rect1Bottom = rect1.offsetTop + rect1.offsetHeight;
    const rect2Right = rect2.offsetLeft + rect2.offsetWidth;
    const rect2Left = rect2.offsetLeft;
    const rect2Top = rect2.offsetTop;
    const rect2Bottom = rect2.offsetTop + rect2.offsetHeight;

    return false === ((rect1Right + buffer) < ( rect2Left - buffer ) ||
        ( rect1Left + buffer ) > ( rect2Right - buffer ) ||
        ( rect1Bottom + buffer ) < ( rect2Top - buffer ) ||
        ( rect1Top - buffer ) > ( rect2Bottom + buffer ));
}

/**
 * Map for menu types.
 *
 * @param type type.
 */
function getMenuType( type ) {
    "use strict";

    const menuTypes = {
        'health' : 'items',
        'mana' : 'items',
        'gear' : 'gear',
        'weapons' : 'weapons'
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
function runPointAnimation( value, position, isMission, missionPoints, missionName ) {
    "use strict";

    let positionType = value.dataset.type;
    positionType = positionType && '' !== positionType ? positionType : 'point';

    if ( false === value.classList.contains('map-cutscene')) {
        value.classList.add('engage');
    }

    const thePoints = document.querySelector( `#explore-points .${ positionType }-amount` );
    let currentPoints = 100;

    const objectAmount = true === isMission ? parseInt(missionPoints) : value.dataset?.value;

    if ( thePoints ) {
        currentPoints = thePoints.dataset.amount;
        if ( 'point' === positionType ) {
            const newPoints = parseInt( currentPoints ) + parseInt( objectAmount ?? '0' );

            // Add amount to current points.
            thePoints.setAttribute( 'data-amount', newPoints );

            // Add level check.
            const oldLevel = getCurrentLevel( currentPoints );
            const newLevel = getCurrentLevel( newPoints );
            window.nextLevelPointAmount = JSON.parse(OrbemOrder.levelMaps)[newLevel];

            // If new level is different than the old, then set UI to new.
            if ( oldLevel !== newLevel ) {
                const currentLevelEl = document.querySelector( '.current-level' );

                if ( currentLevelEl ) {
                    currentLevelEl.textContent = 'lvl. ' + newLevel;

                    const nextLevelPoints = document.querySelector( '.next-level-points' );

                    nextLevelPoints.textContent = window.nextLevelPointAmount;
                }
            }

            // Update point count.
            const myPoints = document.querySelector( '.my-points' );


            if ( myPoints ) {
                myPoints.textContent = newPoints;
            }
        }

        // Add class for notification of point gain.
        thePoints.classList.add( 'engage' );

        setTimeout( function () {
            thePoints.classList.remove( 'engage' );
        }, 2000 );

        // Check if it's a storage item.
        const collectable = value.classList.contains( 'storage-item' );

        // Play sound effect for points.
        playPointSound(positionType);

        // Add new point count to DB.
        addUserPoints( parseInt( currentPoints ) + parseInt( objectAmount ), positionType, position, collectable, missionName );
    }
}

function playPointSound( pointType ) {
    "use strict";

    const character = document.getElementById('map-character');

    // Show point graphic.
    character.classList.add( 'point' );

    // Add point type
    if ( '' !== pointType ) {
        character.classList.add( pointType );
    }

    setTimeout(function() {
        character.classList.add( 'over');

        setTimeout(function() {
            // Add point type
            if ( '' !== pointType ) {
                character.classList.remove( pointType );
            }

            character.classList.remove( 'point');
            character.classList.remove( 'over');
        }, 500);
    }, 1000 );

    const pointSound = document.getElementById('ching');

    if (pointSound) {
        pointSound.volume = window.sfxVolume;
        pointSound.play();
    }

    return false;
}

/**
 * This will hold all in-game transport functionality.
 */
function engageTransportFunction() {
    "use strict";

    const container = document.querySelector('.game-container');
    const character = document.querySelector( '#map-character' );

    document.addEventListener( 'keydown', e => {
        // If Shift is pressed start transport sequence.
        if ( 16 === e.keyCode && canCharacterInteract( '', character, 'programming') ) {
            container.addEventListener( 'click', clickTransport );
        }
    } );

    document.addEventListener( 'keyup', e => {
        if ( 16 === e.keyCode && canCharacterInteract( '', character, 'programming') ) {
            container.removeEventListener( 'click', clickTransport );
        }
    } );
}

/**
 * This will hold all in-game draggable functionality.
 */
function engageDraggableFunction() {
    "use strict";

    document.addEventListener( 'keydown', e => {
        const dragmeitem = document.querySelector( '.dragme' );
        // If Shift is pressed start transport sequence.
        if ( 'Space' === e.code ) {
            if ( dragmeitem && true === dragmeitem.classList.contains( 'currently-dragging' ) ) {
                // Reengage hit.
                setTimeout( () => {
                    window.allowHit = true;
                }, 100 );

                const dragmeitemTop = parseInt( dragmeitem.style.top.replace('px', '') );

                dragmeitem.classList.remove( 'currently-dragging' );
                dragmeitem.classList.remove( 'dragme' );

                dragmeitem.style.left = window.dragLeft.left ? ( parseInt( dragmeitem.style.left.replace('px', '') ) - 2 ) + 'px' : ( parseInt( dragmeitem.style.left.replace('px', '') ) + 2 ) + 'px';
                dragmeitem.style.top = window.dragTop.higher ? ( dragmeitemTop - 2 ) + 'px' : ( dragmeitemTop + 2 ) + 'px';

                window.dragLeft = false;
                window.dragTop = false;
                window.isDragging = '';
                window.draggingDirection = '';

                // Check if drop position is on draggable destination.
                const cleanClass = cleanClassName( dragmeitem.className );
                const dragDest = document.querySelector( '.' + cleanClass + '-drag-dest-map-item' );

                if ( dragDest ) {
                    const dragDestLeft = parseInt( dragDest.style.left.replace( 'px', '' ) ) + ( dragDest.offsetWidth / 2 );
                    const dragDestTop = parseInt( dragDest.style.top.replace( 'px', '' ) ) + ( dragDest.offsetHeight / 2 );
                    const dragItemLeft = parseInt( dragmeitem.style.left.replace('px', '') ) + ( dragDest.offsetWidth / 2 );
                    const dragItemTop = dragmeitemTop + ( dragmeitem.offsetHeight / 2 );
                    const topOffset = dragItemTop < dragDestTop ? dragDestTop - dragItemTop : dragItemTop - dragDestTop;
                    const leftOffset = dragItemLeft < dragDestLeft ? dragDestLeft - dragItemLeft : dragItemLeft - dragDestLeft;

                    if ( topOffset < parseInt(dragDest.dataset.offset) && leftOffset < parseInt(dragDest.dataset.offset) && false === dragDest.classList.contains( 'completed-mission' ) ) {
                        saveMission(dragDest.dataset.mission, document.querySelector( '.' + dragDest.dataset.mission + '-mission-item' ), cleanClass );

                        // Add completed mission so you can't keep getting points.
                        dragDest.classList.add( 'completed-mission' );
                        dragmeitem.classList.add( 'no-point' );

                        if ('true' === dragDest.dataset.removable) {
                            dragDest.remove();
                            persistItemRemoval(cleanClassName(dragDest.className), 'point', 0, 2000, '')
                        }

                        // Remove drag item if disappear is yes.
                        if ('yes' === dragmeitem.dataset.disappear) {
                            dragmeitem.remove();
                            persistItemRemoval(cleanClass, 'point', 0, 2000, '')
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

                // Save position of item.
                fetch(filehref, {
                    method: 'POST', // Specify the HTTP method
                    headers: {
                        'Content-Type': 'application/json', // Set the content type to JSON
                        'X-WP-Nonce': OrbemOrder.orbemNonce
                    },
                    body: JSON.stringify(jsonString) // The JSON stringified payload
                })
                .then(response => {
                    // Check if the response status is in the range 200-299
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
                    }
                });
            } else {
                dragItem();
            }
        }
    } );
}

/**
 * Dragg item function.
 */
function dragItem() {
    "use strict";

    const itemToDrag = document.querySelector( '.dragme' );
    const mapCharacter = document.querySelector( '#map-character' );
    const currentlyDragging = document.querySelector('.currently-dragging');
    const mapCharacterImage = mapCharacter.querySelector( '.map-character-icon.engage' );
    let dragDirection;

    if ( itemToDrag ) {
        window.allowHit = false;

        const itemToDragTop = parseInt( itemToDrag.style.top.replace( 'px', '' ) );
        const itemToDragLeft = parseInt( itemToDrag.style.left.replace( 'px', '' ) );
        const mapCharacterTop = parseInt( mapCharacter.style.top.replace( 'px', '' ) ) + 450;
        const mapCharacterLeft = parseInt( mapCharacter.style.left.replace( 'px', '' ) ) + 450;

        const itemIsHigher = itemToDragTop < mapCharacterTop;
        const itemIsLeft = itemToDragLeft < mapCharacterLeft;
        const topOffset = itemIsHigher ? mapCharacterTop - itemToDragTop : itemToDragTop - mapCharacterTop;
        const leftOffset = itemIsLeft ? mapCharacterLeft - itemToDragLeft : itemToDragLeft - mapCharacterLeft;
        const itemIsActuallyHigher = itemToDragTop < ( mapCharacterTop - 50 );
        const itemIsActuallyLeft = itemToDragLeft < ( mapCharacterLeft - 50 );
        const topActuallyOffset = itemIsActuallyHigher ? ( mapCharacterTop - (50 ) ) - itemToDragTop : itemToDragTop - ( mapCharacterTop - 50 );
        const leftActuallyOffset = itemIsActuallyLeft ? ( mapCharacterLeft - ( 45 + ( mapCharacterImage.offsetWidth / 2 ) )) - itemToDragLeft : itemToDragLeft - ( mapCharacterLeft - ( 55 + ( mapCharacterImage.offsetWidth / 2 ) ));

        window.dragTop = {'offset': topOffset, 'higher': itemIsHigher};
        window.dragLeft = {'offset': leftOffset, 'left': itemIsLeft};

        dragDirection = itemIsActuallyHigher && topActuallyOffset >= itemToDrag.offsetHeight ? 'up' : dragDirection;
        dragDirection = false === itemIsActuallyHigher && topActuallyOffset >= mapCharacterImage.offsetHeight ? 'down' : dragDirection;
        dragDirection = itemIsActuallyLeft && leftActuallyOffset >= itemToDrag.offsetWidth ? 'left' : dragDirection;
        dragDirection = false === itemIsActuallyLeft && leftActuallyOffset >= mapCharacterImage.offsetWidth ? 'right' : dragDirection;

        if ( undefined === dragDirection ) {
            window.dragTop = false;
            window.dragLeft = false;

            return;
        }

        if ( currentlyDragging ) {
            currentlyDragging.classList.remove( 'currently-dragging' );
        }

        itemToDrag.classList.add( 'currently-dragging' );
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
function clickTransport( clickE ) {
    "use strict";

    const container = document.querySelector('.game-container');
    const rect = container.getBoundingClientRect();
    const x = ( clickE.clientX - rect.left ) - 400;
    const y = ( clickE.clientY - rect.top ) - 400;
    const mapCharacter = document.getElementById( 'map-character' );
    const bar = document.querySelector('.power-amount');
    const gauge = bar.querySelector('.gauge');
    const powerAmount = bar.getAttribute( 'data-amount' );

    // Stop recharge.
    clearInterval(window.rechargeInterval);

    if (0 < powerAmount) {
        if ( mapCharacter && 'rect' !== clickE.target.tagName && ("true" === clickE.target.dataset.collectable || false === clickE.target.classList.contains( 'map-item' ) || 'true' === clickE.target.dataset.hazard ) ) {
            moveCharacter(mapCharacter, y, x, false, false);
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
 */
function moveCharacter( mapCharacter, newTop, newLeft, gradual, cutscene ) {
    "use strict";

    const currentLeft = parseInt(mapCharacter.style.left.replace( 'px', '' ));
    const currentTop = parseInt(mapCharacter.style.top.replace( 'px', '' ));

    // Top bigger/smaller.
    const leftBigger = currentLeft > newLeft;
    const topBigger = currentTop > newTop;
    const leftDiff = leftBigger ? currentLeft - newLeft : newLeft - currentLeft;
    const topDiff = topBigger ? currentTop - newTop : newTop - currentTop;
    let moveCount = 0;
    const weapon = document.querySelector( '.map-weapon' );

    if ( gradual ) {
        clearInterval( window.movementInt );

        // Add class to note movement.
        mapCharacter.classList.add( 'auto-move' );

        const biggestDiff = Math.max(topDiff, leftDiff);

        // Top move.
        const moveInt = setInterval( () => {
            if ( moveCount <= biggestDiff ) {
                let topDown = '';
                let leftRight = '';

                if ( topBigger ) {
                    mapCharacter.style.top = moveCount <= topDiff ? ( currentTop - moveCount ) + 'px' : newTop + 'px';
                    weapon.style.top = ( parseInt( mapCharacter.style.top.replace('px', '') ) + 400 ) + 'px';
                    topDown = 'up';
                } else {
                    mapCharacter.style.top = moveCount <= topDiff ? ( currentTop + moveCount ) + 'px' : newTop + 'px';
                    weapon.style.top = ( parseInt( mapCharacter.style.top.replace('px', '') ) + 400 ) + 'px';
                    topDown = 'down';
                }

                if ( leftBigger ) {
                    mapCharacter.style.left = moveCount <= leftDiff ? ( currentLeft - moveCount ) + 'px' : newLeft + 'px';
                    weapon.style.left = ( parseInt( mapCharacter.style.left.replace('px', '') ) + 400 ) + 'px';
                    leftRight = 'left';
                } else {
                    mapCharacter.style.left = moveCount <= leftDiff ? ( currentLeft + moveCount ) + 'px' : newLeft + 'px';
                    weapon.style.left = ( parseInt( mapCharacter.style.left.replace('px', '') ) + 400 ) + 'px';
                    leftRight = 'right';
                }

                // Change character image based on direction;
                directCharacter( topDown, leftRight, mapCharacter );
            } else {
                // Reenable cutscene click events.
                window.allowCutscene = true;

                // Change character to static.
                const currentMovementImage = mapCharacter.querySelector( '.map-character-icon.engage' );

                if ( currentMovementImage && false === currentMovementImage.id.includes('static') ) {
                    currentMovementImage.classList.remove( 'engage' );

                    const newStaticImage = document.getElementById( currentMovementImage.id.replace( window.mainCharacter, window.mainCharacter + '-static' + window.currentWeapon ) );

                    if ( newStaticImage ) {
                        newStaticImage.classList.add( 'engage' );

                        // Reset so you can use static image swap again.
                        window.currentCharacterAutoDirection = '';
                    }
                }

                // Once cutscene is over reinstate walking privileges. Also only clear this interval after cutscene is over so you know when to walk again.
                if ( false === cutscene || false === cutscene.classList.contains( 'engage' ) ) {
                    clearInterval(moveInt);
                    movementIntFunc();
                }
            }

            moveCount++;
        }, window.moveSpeed );
    } else {
        mapCharacter.style.left = newLeft + 'px';
        mapCharacter.style.top = newTop + 'px';
    }
}

function directCharacter( topDown, leftRight, mapCharacter ) {
    "use strict";

    let direction = '' === topDown ? leftRight : topDown;
    const currentImage = mapCharacter.querySelector( '.map-character-icon.engage' );

    if ( direction !== window.currentCharacterAutoDirection ) {
        const newImage = mapCharacter.querySelector( '#' + window.mainCharacter + '-' + direction + window.currentWeapon );

        window.currentCharacterAutoDirection = direction;
        mapCharacter.classList.add( direction + '-dir' );

        if ( currentImage ) {
            currentImage.classList.remove( 'engage' );
        }

        if ( newImage ) {
            newImage.classList.add( 'engage' );
        }

        mapCharacter.className = '';
    }
}

/**
 * Get the current level.
 * @param currentPoints
 * @returns {number|string}
 */
function getCurrentLevel( currentPoints ) {
    "use strict";

    if ( OrbemOrder.levelMaps ) {
        const levels = JSON.parse( OrbemOrder.levelMaps );

        for (const key in levels) {

            if (currentPoints > levels[key] && currentPoints < levels[parseInt(key) + 1] || currentPoints === levels[key]) {
                return parseInt(key) + 1;
            }
        }
    }

    return 1;
}

/**
 *  Recharge power.
 * @param gauge
 * @param bar
 */
function startPowerRecharge(gauge, bar) {
    "use strict";

    window.rechargeInterval = setInterval( () => {
        const currentAmount = parseInt(bar.getAttribute( 'data-amount' ));

        if (100 <= currentAmount ) {
            clearInterval(window.rechargeInterval);
        } else {
            bar.setAttribute( 'data-amount', currentAmount + 1 );
            gauge.style.width = (currentAmount + 1) + 'px';
        }
    }, 1500);
}

/**
 * All the logic for minigames.
 */
function engageMinigameLogic(minigameTrigger) {
    "use strict";

    const theMinigame = document.querySelector( '.' + minigameTrigger.dataset.minigame + '-minigame-item');

    if ( theMinigame ) {
        const music = theMinigame.dataset.music;
        let missionElExists = false;
        const minigameMission = theMinigame.dataset.mission;
        let missionEl = false;

        if (minigameMission && '' !== minigameMission) {
            missionEl = document.querySelector('.' + minigameMission + '-mission-item');

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
                        minigames.forEach(minigame => {
                            const computerChip = minigame.querySelector('.computer-chip');
                            const solderPoints = computerChip.querySelectorAll('ellipse');
                            const wireWrap = minigame.querySelector('.draggable-images');
                            const wires = wireWrap.querySelectorAll('.minigame-draggable-image');

                            function isOverlapping(wire, solderPoint) {
                                const wireRect = wire.getBoundingClientRect();
                                const solderPointBBox = solderPoint.getBoundingClientRect();

                                return !(
                                    wireRect.right < solderPointBBox.left ||
                                    wireRect.left > solderPointBBox.right ||
                                    wireRect.bottom < solderPointBBox.top ||
                                    wireRect.top > solderPointBBox.bottom
                                );
                            }

                            function areAllSVGsCovered(wires, solderPoints) {
                                for (let solderPoint of solderPoints) {
                                    let covered = false;
                                    for (let wire of wires) {
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

                                engageProgrammingStep(minigameMission, missionEl, minigame);
                            }
                        });
                    }
                }
            };

            // Get all container elements within the .wp-block-group.wires container
            const containers = document.querySelectorAll('.minigame-draggable-image');

            // Add the dragstart and dragend event listeners to each container
            containers.forEach(container => {
                container.addEventListener('dragstart', handleDragStart);
                container.addEventListener('mouseup', handleDragEnd);
            });
        }
    }
}

function engageProgrammingStep(minigameMission, missionEl, minigame) {
    "use strict";

    const programmingOutput = minigame.querySelector( '.programming-output' );
    const minigameProgramming = minigame.querySelector( '.minigame-programming' );
    const programmingSubject = minigame.querySelector( '.programming-subject' );
    const textAreaInput = programmingOutput.querySelector( 'textarea' );

    if ( minigameProgramming && programmingSubject ) {
        minigameProgramming.classList.add('engage');
        programmingSubject.classList.add( 'engage' );
    }

    if ( programmingOutput && programmingSubject && textAreaInput ) {
        programmingOutput.prepend( programmingSubject );
        textAreaInput.focus();
        const programmingWord = programmingSubject.querySelector('strong');
        const binaryAnswer = textToBinary(programmingWord.textContent);

        textAreaInput.addEventListener( 'keyup', (e) => {
            if ( 13 === e.which ) {
                const textAreaToCheck = programmingOutput.querySelector( 'textarea' );

                if (parseInt(textAreaToCheck.value) === parseInt(binaryAnswer)) {
                    saveMission(minigameMission, missionEl, minigameMission);
                    minigame.classList.remove( 'engage' );

                    // Reengage walking.
                    window.allowMovement = true;

                    // Trigger after minigame is complete.
                    afterMinigame(minigame);
                }
            }
        } );
    }
}

/**
 * What happens after a minigame is completed
 * @param minigame
 */
function afterMinigame(minigame) {
    "use strict";

    const minigameName = cleanClassName(minigame.className);
    const cutscene = document.querySelector('.map-cutscene[data-minigame="' + minigameName + '"]');

    if (cutscene) {
        engageCutscene( cleanClassName( cutscene.className ), false );
    }

    // restart level music.
    if ( minigame.dataset.music && '' !== minigame.dataset.music && OrbemOrder.musicNames ) {
        playSong( OrbemOrder.musicNames[currentLocation], currentLocation );
    }
}

function textToBinary(str) {
    "use strict";

    let output = "";
    str.split("").forEach((element) => {
        let char = element.charCodeAt(0).toString(2);
        output += ("00000" + char).slice(-5).concat("");
    });
    return output;
}

async function makeTalk( text, voiceName, providedAudio ) {
    "use strict";

    if ( true === text.includes('**') || '' === text || '…' === text || '...' === text ) {
        setTimeout( () => {
            window.nextDialogue = true;
        }, 1500 );
        return;
    }

    if ( false !== providedAudio ) {
        talkAudio = providedAudio;
        talkAudio.volume = scaleDbToUnit(parseInt(window.talkingVolume));
        talkAudio.play();

        talkAudio.addEventListener('ended', () => {
            window.nextDialogue = true;
        });
    }

    if ( false === providedAudio ) {
        const apiKey = OrbemOrder.TTSAPIKEY ?? '';
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
        let pitch = 0;

        let speakingRate = 1.2;

        const requestBody = {
            input: { ssml: '<speak>' + text + '</speak>' },
            voice: {
                name: voiceName,
                languageCode: "en-US" // Make sure this matches the language of the voice name
            },
            audioConfig: {
                audioEncoding: "MP3",
                volumeGainDb: (parseInt(window.talkingVolume) + 7),
            },
        };

        if (pitch && speakingRate) {
            requestBody.audioConfig.pitch = pitch;
            requestBody.audioConfig.speakingRate = speakingRate;
        }

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                return;
            }

            const data = await response.json();
            const audioContent = data?.audioContent;

            // Play the audio
            talkAudio = new Audio(`data:audio/mp3;base64,${audioContent}`);
            talkAudio.volume = 0.5;
            talkAudio.play();

            talkAudio.addEventListener('ended', () => {
                window.nextDialogue = true;
            });
        } catch (error) {
            window.audioError = error.message;
        }
    }

    function scaleDbToUnit(value, dbMin = -40, dbMax = 16) {
        return (value - dbMin) / (dbMax - dbMin);
    }
}

function startTheTimer(timeAmount) {
    "use strict";

    if ( false === timerCountDownHit ) {
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
            if ( 0 !== previousContent ) {
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

function playStartScreenMusic( play ) {
    "use strict";

    const startMusic = document.getElementById('start-screen-music');
    const musicUnmute = document.getElementById( 'music-unmute' );
    const fadeDuration = 3000; // 3 seconds
    const fadeStep = 0.1; // Volume increment step
    const intervalTime = fadeDuration * fadeStep;

    if ( startMusic && false !== play ) {
        startMusic.volume = 0; // Start with volume at 0
        startMusic.play(); // Start playing the audio
        startMusic.muted = false;

        if ( musicUnmute ) {
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
    } else if ( startMusic ) {
        startMusic.remove();
        musicUnmute.remove();
    }
}

/**
 * Check if you should be hurt by the hazard.
 */
function checkIfHazardHurts() {
    "use strict";

    setInterval( () => {
        if ( true === inHazard ) {
            const hurtAmount = window.theHazardValue;
            const currentHealth = getCurrentPoints('health');
            const newAmount = parseInt(currentHealth) - parseInt(hurtAmount);
            hurtAnimation();

            addUserPoints(newAmount, 'health', 'hazard', '');
        }

        if ( false !== hazardItem ) {
            const mapChar = document.getElementById( 'map-character' );

            // Push character away from hazard center.
            pushCharacter(25, hazardItem, mapChar);
        }
    }, 1000);
}

function hurtAnimation() {
    "use strict";

    clearTimeout(hurtTimeout);
    const mapCharacter = document.getElementById('map-character');

    if ( mapCharacter ) {
        mapCharacter.dataset.hurt = true;

        hurtTimeout = setTimeout( () => {
            mapCharacter.dataset.hurt = false;
        }, 1000);
    }
}

/**
 * Helper function for logo spin and adds/removes class shortly.
 *
 * @param element
 * @param name
 */
function spinMiroLogo(element,name) {
    "use strict";

    if (element) {
        element.classList.add(name);
        setTimeout(
            function() {
                element.classList.remove(name);
            },
            1000
        );
    }
}

// Add the SSO response function for login/signin if it doesn't exist in the theme.
if (typeof window.exploreHandleCredentialResponse !== 'function') {
    window.exploreHandleCredentialResponse = function(response) {
        "use strict";
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
                'X-WP-Nonce': OrbemOrder.orbemNonce
            },
            body: JSON.stringify(jsonString) // The JSON stringified payload
        })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
            .then(data => {
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
    "use strict";

    const mc = document.getElementById('map-character' );
    const left = parseInt(mc.style.left.replace('px', ''));
    const top = parseInt(mc.style.top.replace('px', ''));
    const dir = mc.className.replace('-dir', '');

    switch(dir) {
        case 'right' :
            mc.style.left = (left - dist) + 'px';
            break;
        case 'left' :
            mc.style.left = (left + dist) + 'px';
            break;
        case 'top' :
            mc.style.top = (top + dist) + 'px';
            break;
        case 'down' :
            mc.style.top = (left - dist) + 'px';
            break;
    }
}
