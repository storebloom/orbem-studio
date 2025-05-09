"use strict";

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
let timerCountDownInterval;
let currentLocation = ''
let timerCountDownHit = false;
window.godMode = false;
window.noTouch = false;

document.addEventListener("DOMContentLoaded", function(){
    currentLocation = document.querySelector( '.game-container' );
    currentLocation = currentLocation.className.replace( 'game-container ', '');

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

        introVideo.addEventListener('ended', () => {
           if ( introVideoContainer ) {
               introVideoContainer.classList.remove( 'engage' );
               playStartScreenMusic();
           }
        });

        const skipButton = document.getElementById('skip-intro-video');

        if ( skipButton ) {
            skipButton.addEventListener('click', () => {
                introVideo.pause();

                if ( introVideoContainer ) {
                    introVideoContainer.classList.remove( 'engage' );
                }

                playStartScreenMusic();
            });
        }
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
    if ( 'undefined' !== typeof exploreAbilities && 0 < exploreAbilities.length && exploreAbilities.includes('transportation') ) {
        engageTransportFunction();
    }

    // Engage draggable function.
    engageDraggableFunction();

    // Spell clicks.
    const spells = document.querySelectorAll('.spell');
    const weapon = document.getElementById( 'weapon' );

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
    }

    // Set points.
    const thePoints = document.querySelectorAll( '#explore-points .point-bar' );

    if ( thePoints ) {
        thePoints.forEach( point => {
            const amount = point.getAttribute('data-amount');
            const gauge = point.querySelector('.gauge');

            if ( gauge && false === point.classList.contains( 'point-amount' ) ) {
                point.setAttribute( 'data-amount', amount );
                gauge.style.width = amount + 'px';
            } else {
                const newLevel = getCurrentLevel( amount );
                if ( levelMaps ) {
                    window.nextLevelPointAmount = JSON.parse(levelMaps)[newLevel];

                    point.setAttribute('data-amount', amount);
                    gauge.style.width = getPointsGaugeAmount(amount);
                }
            }
        } );
    }

    document.body.style.position = 'fixed';
    const engageExplore = document.getElementById('engage-explore');

    if (engageExplore) {
        engageExplore.addEventListener( 'click', function () {
            engageExploreGame();
        } );
    }

    // Reset triggered so start game.
    const primary = document.getElementById( 'primary' );
    if ( primary && true === primary.classList.contains('reset')) {
        engageExploreGame();
    }

    // Settings.
    const settingCogs = document.querySelectorAll('#settings, #storage, #characters, #new-addition');

    if ( settingCogs ) {
        settingCogs.forEach( settingCog => {
            if ( 'storage' === settingCog.id ) {
                // Show item description in storage menu.
                const menuItems = document.querySelectorAll('.retrieval-points .storage-item' );

                if ( menuItems ) {
                    menuItems.forEach( menuItem => {
                        menuItem.addEventListener( 'click', () => {
                            showItemDescription(menuItem);
                        });
                    } );
                }
            }

            settingCog.addEventListener('click', (e) => {
                if ( false === e.target.classList.contains( 'close-settings') && false === e.target.parentNode.classList.contains( 'character-item') ) {
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

                console.log(window.talkingVolume);
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

    // Storage menu functionality.
    // Tab logic.
    const storageTabs = document.querySelectorAll( '.menu-tabs div' );

    if ( storageTabs ) {
        storageTabs.forEach( ( storageTab, storageIndex ) => {
            storageTab.addEventListener( 'click', () => {
                const currentTab = document.querySelector( '.menu-tabs .engage' );

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

    // New game reset.
    const newGame = document.getElementById( 'new-explore' );

    if ( newGame ) {
        newGame.addEventListener('click', async () => {
            confirm( 'Are you sure you want to start a new game? All your previously saved data will be lost.' );
            await resetExplore();

            setTimeout(() => {
                window.location.href = gameURL;
            }, 1000);
        });
    }
});

function unlockAbilities( pointAmount ) {
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
 */
function moveNPC( npc ) {
    if ( npc ) {
        const walkingPath = npc.dataset.path;
        const walkingSpeed = npc.dataset.speed;
        const timeBetween = npc.dataset.timebetween;
        const repeatPath = npc.dataset.repeat;

        // Check if walking path exists.
        if ( walkingPath ) {
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

            if (pathArray && 1 !== pathArray.length) {
                let currentWorldX = pathArray[position].left;
                let currentWorldY = pathArray[position].top;
                let didPauseNPC = false;

                window.walkingInterval = setInterval(() => {
                    if ( 'false' !== npc.dataset?.canmove ) {
                        const currentImage = npc.querySelector('.character-icon.engage');

                        // Set next position to 0 if position is at the end.
                        nextPosition = position === pathCount ? 0 : position + 1;

                        // Get loop amount for how many times to loop interval before switching to next position.
                        loopAmount = getLoopAmount(pathArray[position].left, pathArray[position].top, pathArray[nextPosition].left, pathArray[nextPosition].top, walkingSpeed, timeBetween);

                        // If loopAmount equals loop count, transition to next walking path.
                        if (loopCount === (loopAmount - 1) || firstRun) {
                            // Check that current position is not the last position. And move npc if it is not.
                            if (pathCount > position || (firstRun && pathCount === position)) {
                                currentImage.classList.remove('engage');

                                // Get user direction of movement path.
                                moveDirection = regulateTransitionSpeed(pathArray[position].left, pathArray[position].top, pathArray[nextPosition].left, pathArray[nextPosition].top, npc, walkingSpeed);

                                npc.style.left = pathArray[nextPosition].left + 'px';
                                npc.style.top = pathArray[nextPosition].top + 'px';

                                // Update NPC direction image.
                                newImage = npc.querySelector('#' + cleanClassName(npc.className) + moveDirection);

                                if (newImage) {
                                    newImage.classList.add('engage');
                                }
                            }

                            // If it is not the first run do this.
                            if (false === firstRun) {
                                // If the current position is not the last position, iterate on position count and reset loop count to 0.
                                if (pathCount > nextPosition) {
                                    loopCount = 0;
                                    firstRun = true;

                                    if (0 !== nextPosition) {
                                        position++
                                    } else {
                                        position = 0;
                                    }

                                    // If it is the last position, and repeat is set to true, then reset position to 0.
                                } else if ('true' === repeatPath) {
                                    firstRun = true;
                                    position = pathCount;
                                    loopCount = 0;

                                    // If not repeat and position is at end, clear interval.
                                }

                                // if it is the first run, set to false and iterate on position and loopcount.
                            } else {
                                firstRun = false;
                                loopCount++;
                            }
                        } else {
                            loopCount++
                        }

                        // Live track NPC movement.
                        function trackNPC() {
                            currentWorldX = npc.offsetLeft;
                            currentWorldY = npc.offsetTop;
                            requestAnimationFrame(trackNPC);
                        }

                        trackNPC();

                        didPauseNPC = false;
                    } else {
                        if ( false === didPauseNPC ) {
                            // Set current position so paused movement can restart at point of pause.
                            loopAmount = loopAmount + 1;
                            position = 0 < position ? position - 1 : pathCount;


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
        }
    }
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
function addUserPoints(amount, type, position, collectable, missionName = '') {
    // If collectable, remove from menu.
    if ( true === collectable ) {
        removeItemFromStorage(position, type);
    }

    // Make sure amount is always 100 or less. NOt for points.
    if ( amount > 100 && 'point' !== type ) {
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
    if ( explorePoints && explorePoints[type] && false === explorePoints[type].positions.includes(position) && false === Array.isArray(position) ) {
        explorePoints[type].positions.push( position );
    } else if ( explorePoints && explorePoints[type] && false === explorePoints[type].positions.includes(position) && true === Array.isArray(position) ) {
        position.forEach( positionName => {
            explorePoints[type].positions.push( positionName );
        });
    }

    if ( gauge && 'point' !== type ) {
        bar.setAttribute( 'data-amount', amount );
        gauge.style.width = amount + 'px';
    } else if ( 'point' === type ) {
        bar.setAttribute( 'data-amount', amount );

        gauge.style.width = getPointsGaugeAmount( amount );

        // Unlock abilities as points grow.
        unlockAbilities( amount );
    }

    if ( 'health' === type && 0 === amount ) {
        triggerGameOver();
    }

    if ( '' !== position && true === ['point', 'health', 'mana'].includes( type ) && position !== missionName ) {
        persistItemRemoval( position, type, amount );
    }
}

/**
 * Trigger the game over notice and add restart logic.
 */
function triggerGameOver() {
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
 */
function persistItemRemoval( item, type = 'point', amount = 0, timeoutTime = 2000, reset = '' ) {
    const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/add-explore-points/`;

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
                userid: currentUserId,
                amount: amount,
                reset: reset,
            }
            // Save position of item.
            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                  'Content-Type': 'application/json', // Set the content type to JSON
                },
                body: JSON.stringify(jsonString) // The JSON stringified payload
            })
                .then(response => {
                    // Check if the response status is in the range 200-299
                    if (!response.ok) {
                        throw new Error('Network response was not ok ' + response.statusText);
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
    return ( ( amount / window.nextLevelPointAmount ) * 100 ) + '%'
}

/**
 * Save mission once completed.
 * @param mission
 * @param value
 * @param position
 */
function saveMission( mission, value, position ) {
    clearTimeout(saveMissionTimeout);

    saveMissionTimeout = setTimeout(() => {
        // Cross off mission.
        const theMission = document.querySelector('.' + mission + '-mission-item');

        if (theMission) {
            const missionPoints = theMission.dataset.points;
            const hazardRemoveText = theMission.dataset.hazardremove;
            const missionAbility = theMission.dataset.ability;

            showNextMission(theMission);

            const missionBlockade = theMission.dataset.blockade;

            // Remove blockade if exists.
            if ('' !== missionBlockade && '0' !== JSON.parse(missionBlockade).top) {
                document.querySelector('.' + theMission.className.replace('mission-item ', '') + '-blockade').remove();
            }

            theMission.style.textDecoration = 'line-through';

            // Remove hazard if set.
            if (null !== hazardRemoveText && hazardRemoveText) {
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
                            persistItemRemoval(hazardRemove);
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

            if ( value ) {
                // Trigger cutscene if mission is attached.
                const theCutscene = document.querySelector( `.map-cutscene[data-mission="${mission}"]` );

                if ( theCutscene ) {
                    const cutsceneName = cleanClassName(theCutscene.className);
                    engageCutscene( cutsceneName, false, true );
                }

                // Give points.
                runPointAnimation(value, position, true, missionPoints, mission);
            }
        }

        const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/mission/`;

        const jsonString = {
            userid: currentUserId,
            mission,
        }
        // Save position of item.
        fetch(filehref, {
            method: 'POST', // Specify the HTTP method
            headers: {
                'Content-Type': 'application/json', // Set the content type to JSON
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
    const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/add-character/`;

    const jsonString = {
        userid: currentUserId,
        slug: character,
    }
    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
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
 */
function equipNewItem(type, id, amount, unequip) {
    const jsonString = {
        type: type,
        itemid: id,
        amount: amount,
        userid: currentUserId,
        unequip: unequip
    }
    // Save position of item.
    fetch(`https://${wpThemeURL}/wp-json/orbemorder/v1/equip-explore-item/`, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
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
 * Add new spell.
 *
 * @param id The spell id.
 */
function addNewSpell(id) {
    const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/addspell/`;

    const jsonString = {
        spellid: id,
        userid: currentUserId,
    }
    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
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
    const jsonString = {
        music,
        sfx,
        talking,
        userid: currentUserId
    }
    // Save position of item.
    fetch(`https://${wpThemeURL}/wp-json/orbemorder/v1/save-settings/`, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
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
    const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/save-storage-item/`;

    const jsonString = {
        user: currentUserId,
        id,
        name,
        value,
        type,
        remove
    }
    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
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
    const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/resetexplore/`;

    const jsonString = {
        userid: currentUserId,
    }
    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
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
    const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/coordinates/`;

    const jsonString = {
        left: left.replace('px', ''),
        top: top.replace('px', ''),
        userid: currentUserId,
    }
    // Save position of item.
    fetch(filehref, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
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
    let called = false;

    return function(theWeapon, value) {
        if (
            value && theWeapon && elementsOverlap( theWeapon.getBoundingClientRect(), value.getBoundingClientRect() )
        ) {
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


                    // If weapon type is defined and matches the current weapon or its not defined, then hurt the enemy.
                    if ( '' !== weaponType && theWeapon.dataset.weapon === weaponType || '' === weaponType ) {
                        value.setAttribute('data-health', newHealth);
                    }

                    if ( 'boss' === value.getAttribute( 'data-enemy-type' ) ) {
                        if (newHealth <= (enemyFullHealth * .75) && false === secondWaveHit) {
                            secondWaveHit = true;
                            updateBossWave(value)
                        } else if (newHealth <= (enemyFullHealth * .50) && false === thirdWaveHit) {
                            thirdWaveHit = true;
                            updateBossWave(value);
                        } else if (newHealth <= (enemyFullHealth * .25) && false === fourthWaveHit) {
                            fourthWaveHit = true;
                            updateBossWave(value)
                        }
                    }

                    if ( 0 === newHealth ) {
                        clearInterval(window.shooterInt);
                        clearInterval(window.runnerInt);
                        value.remove();

                        // Save new health.
                        const position = cleanClassName(value.className);
                        const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/enemy/`;

                        const jsonString = {
                            userid: currentUserId,
                            health: 0,
                            position
                        }
                        // Save position of item.
                        fetch(filehref, {
                            method: 'POST', // Specify the HTTP method
                            headers: {
                                'Content-Type': 'application/json', // Set the content type to JSON
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
    }
})();

/**
 * Pull new area html.
 *
 */
const enterNewArea = (function () {
    window.runningPointFunction = false;
    let called = false;

    return function(position, weapon, mapUrl, nextAreaPosition) {
        window.allowMovement = false;
        // Clear enemy interval.
        clearInterval(window.shooterInt);
        clearInterval(window.runnerInt);
        clearInterval(window.walkingInterval);

        // Remove old items.
        const defaultMap = document.querySelector( '.default-map' );

        if ( defaultMap ) {
            defaultMap.remove();
        }

        // Don't repeat enter.
        if ( false === called ) {
            const filehref = `https://${ wpThemeURL }/wp-json/orbemorder/v1/area/`;
            let newMusic = '';

            if ( musicNames ) {
                newMusic = musicNames[position];
            }

            const jsonString = {
                userid: currentUserId,
                position
            }

            // Save position of item.
            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                    'Content-Type': 'application/json', // Set the content type to JSON
                },
                body: JSON.stringify(jsonString) // The JSON stringified payload
            })
            .then(response => {
                // Check if the response status is in the range 200-299
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                }
                return response.json();
            })
                .then(data => {

                let newMapItems =  data;
                newMapItems = JSON.parse( newMapItems.data );
                const mapItemStyles = document.getElementById( 'map-item-styles' );
                const chracterItem = document.getElementById( 'map-character' );
                const container = document.querySelector( '.game-container' );
                const head = document.querySelector( 'head' );

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
                            }, 500)

                        }
                    }
                }

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

                    // Add close menu event.
                    const characterMenu = document.getElementById( 'characters' );
                    const closeCharacter = characterMenu.querySelector( '.close-settings' );

                    if ( closeCharacter ) {
                        closeCharacter.addEventListener( 'click', () => {
                            characterMenu.classList.remove( 'engage' );
                        } );
                    }
                }

                // Add new map styles and map urls.
                if (head) {
                    head.append( newStyles );
                }

                // Replace items.
                if ( defaultMap ) {
                    setTimeout(() => {
                        // Create new default map.
                        const newDefaultMap = document.createElement( 'div' );
                        newDefaultMap.className = 'default-map';
                        newDefaultMap.innerHTML = newMapItems['map-items'] + newMapItems['map-cutscenes'] + newMapItems['minigames'] + newMapItems['map-svg'];

                        if ( container ) {
                            container.append( newDefaultMap );

                            // Run no point class adder again
                            addNoPoints();
                        }

                        // Move npcs
                        const moveableCharacters = document.querySelectorAll( '.path-onload[data-path]:not([data-path=""])');

                        if ( moveableCharacters ) {
                            moveableCharacters.forEach( moveableCharacter => {
                                moveNPC( moveableCharacter );
                            } );
                        }

                        // Load materialize item logic.
                        materializeItemLogic();

                        // Load blockades.
                        loadMissionBlockades()

                        // Set all first cutscene dialogues to engage.
                        const allFirstDialogues = document.querySelectorAll( '.map-cutscene .wp-block-orbem-paragraph-mp3:first-of-type' );

                        if ( allFirstDialogues ) {
                            allFirstDialogues.forEach( firstDialogue => {
                                firstDialogue.classList.add( 'engage' );
                            });
                        }

                        // engage cutscene.
                        if ( 'yes' === newMapItems['is-cutscene'] ) {
                            newDefaultMap.dataset.iscutscene = 'yes';
                            engageCutscene( position, true );

                            const container = document.querySelector( '.game-container' );

                            if ( container ) {
                                window.previousCutsceneArea = container.className.replace( 'game-container ', '');
                            }
                        }

                        // Set starting position incase you die.
                        newDefaultMap.dataset.starttop = newMapItems['start-top'];
                        newDefaultMap.dataset.startleft = newMapItems['start-left'];

                        // If the previous area was a cutscene, remove items set to be removed after that cutscene area.
                        if ( '' !== window.previousCutsceneArea ) {
                            removeItems( document.querySelectorAll('[data-removeaftercutscene]' ), window.previousCutsceneArea );
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

                                characterCount++
                            }, 1000);
                        }
                    }, 700 );
                }

                setTimeout(() => {
                    if ( nextAreaPosition ) {
                        newMapItems['start-top'] = JSON.parse( nextAreaPosition ).top;
                        newMapItems['start-left'] = JSON.parse( nextAreaPosition ).left;
                    }

                    chracterItem.style.top = newMapItems['start-top'] + 'px';
                    chracterItem.style.left = newMapItems['start-left'] + 'px';
                    chracterItem.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });

                    const mapContainer = document.querySelector( '.game-container' );

                    mapContainer.className = 'game-container ' + position;
                    mapContainer.style.backgroundImage = 'url(' + mapUrl + ')';
                    currentLocation = position;

                    playSong(newMusic, position);
                    window.allowMovement = true;
                    weapon.style.display = "block";
                }, 100 );
            });

            called = true;

            // Reset called var.
            setTimeout(() => {
                called = false;
            }, 1000);
        }
    }
})();

/**
 * Show loading screen.
 */
function startLoading() {
    const loadingScreen = document.querySelector( '.loading-screen' );

    if ( loadingScreen ) {
        loadingScreen.classList.add('engage');
    }
}

/**
 * Show loading screen.
 */
function stopLoading() {
    const loadingScreen = document.querySelector( '.loading-screen' );

    if ( loadingScreen ) {
        loadingScreen.classList.remove('engage');
    }
}


/**
 * Pull item description content.
 *
 */
const showItemDescription = (function () {
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
            const filehref = `https://${ wpThemeURL }/wp-json/orbemorder/v1/get-item-description/`;

            const jsonString = {
                userid: currentUserId,
                id
            }

            fetch(filehref, {
                method: 'POST', // Specify the HTTP method
                headers: {
                    'Content-Type': 'application/json', // Set the content type to JSON
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
                let newItemDescription = data;
                newItemDescription = JSON.parse( newItemDescription.data );
                const description = document.querySelector( '.retrieval-points #item-description' );
                const selectedItem = document.querySelector( '.storage-item.engage' );

                // Replace current description content.
                description.innerHTML = newItemDescription;

                // Add use and drop features.
                const useButton = description.querySelector( '.use-button' );
                const dropButton = description.querySelector( '.drop-button' );
                const equipButton = description.querySelector( '.equip-button' );
                const unequipButton = description.querySelector( '.unequip-button' );
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
                            const currentWeaponImg = currentWeapon.querySelector('img');

                            if ( currentWeapon && currentWeaponButton ) {
                                currentWeaponImg.src = itemImage.src;
                                currentWeaponButton.src = itemImage.src;
                                currentWeapon.dataset.weapon = selectedItem.title;
                                currentWeaponImg.style.width = selectedItem.dataset.width + 'px';
                                currentWeaponImg.style.height = selectedItem.dataset.height + 'px';
                                currentWeapon.dataset.strength = selectedItem.dataset.strength;
                            }

                            selectedItem.classList.add( 'equipped' );
                            selectedItem.classList.add( 'being-equipped' );
                        }

                        // Reset point calculations.
                        updatePointBars(false);

                        description.innerHTML = '';
                        equipNewItem( selectedType, itemId, amount, false );
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
                        equipNewItem( selectedType, itemId, amount, true );
                    } );
                }
            });

            called = true;

            // Reset called var.
            setTimeout(() => {
                called = false;
            }, 1000);
        }
    }
})();

/**
 * Temporarily change weapon player is using. Previously equipped weapon will still be noted as equipped to allow for change back.
 * @param selectedItem
 */
function changeWeapon( selectedItem ) {
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
        }
    }
}

function updatePointBars(unequip) {
    const gear = document.querySelector( '.storage-item.being-equipped[data-type="gear"]' );
    const allWeapons = document.querySelector( '.store-item.being-equipped[data-type="weapons"]' );
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
    const thePoints = document.querySelector( `#explore-points .${ type }-amount` );

    return parseInt( thePoints.getAttribute('data-amount') );
}

function playSong(path, name) {
    const audio = document.createElement('audio');
    audio.setAttribute('loop', '');
    audio.src = path;
    audio.id = name

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

function selectNewCharacter(character) {
    const charImage = character.querySelector('img');
    charImage.removeAttribute('srcset');
    const currentCharacter = document.querySelector( '#map-character' );

    if ( charImage && currentCharacter ) {
        const oldCurrentCharName = undefined === currentCharacter.dataset.currentchar ? 'mc' : currentCharacter.dataset.currentchar;
        const mainCharacter = document.querySelectorAll( '#map-character .map-character-icon' );
        const newCharacter = character.querySelectorAll( '.character-images .character-icon' );

        if ( mainCharacter ) {
            mainCharacter.forEach( (mainCharacterImage, index) => {
                const mainCharacterImageUrl = mainCharacterImage.src;
                const mainCharacterAbility = currentCharacter.dataset.ability;
                mainCharacterImage.src = newCharacter[index].src;
                newCharacter[index].src = mainCharacterImageUrl;

                // set new character
                currentCharacter.setAttribute( 'data-currentchar', character.dataset.charactername );
                currentCharacter.setAttribute( 'data-ability', character.dataset.ability );
                character.dataset.ability = mainCharacterAbility;
            } );
        }

        // Set speed level if ioana.
        if ( true === character.dataset.charactername.includes( 'ioana' ) ) {
            clearInterval(window.movementInt);
            window.moveSpeed = 10;
            window.attackMultiplier = 5;
            movementIntFunc();

            // Change weapon to fist.
            const fist = document.querySelector( '.storage-item[title="fist"]');
            changeWeapon( fist );
        } else if ( true === character.dataset.charactername.includes( 'mc' ) ) {
            const equipped = document.querySelector('.storage-item[data-type="weapons"].equipped')
            changeWeapon(equipped);

            // Normal Speed.
            clearInterval(window.movementInt);
            window.moveSpeed = 20;
            window.attackMultiplier = 0;
            movementIntFunc();

        } else if ( true === character.dataset.charactername.includes( 'john' ) ) {
            clearInterval(window.movementInt);
            window.moveSpeed = 20;
            movementIntFunc();

            // Change weapon to fist.
            const fist = document.querySelector('.storage-item[title="fist"]');
            window.attackMultiplier = 10;
            changeWeapon(fist);
        } else if ( true === character.dataset.charactername.includes( 'genie' ) ) {
            clearInterval(window.movementInt);
            window.moveSpeed = 20;
            movementIntFunc();

            // Change weapon to fist.
            const knives = document.querySelector('.storage-item[title="throwing-knives"]');
            window.attackMultiplier = 0;
            changeWeapon(knives);
        } else {
            clearInterval(window.movementInt);
            window.moveSpeed = 20;
            movementIntFunc();
        }

        character.dataset.charactername = oldCurrentCharName ? oldCurrentCharName : 'mc';
    }
}

/**
 * Start enemies.
 */
function engageEnemy( enemy, trigger ){
    const projSpeed = enemy.getAttribute('data-speed' );
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
            const mapCharacterTop = parseInt(mapCharacter.style.top.replace('px', '')) + 300;

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
                const newBlockedPosition = getBlockDirection(collisionWalls, newEnemy.getBoundingClientRect(), topValInt, leftValInt, true);

                newEnemy.style.left = newBlockedPosition.left + 'px';
                newEnemy.style.top = newBlockedPosition.top + 'px';
            }
        }, 20 );
    }

    if ( 'boss' === enemyType ) {
        updateBossWave(enemy);
    }
}

/**
 * Switch boss wave type.
 * @param enemy
 */
function updateBossWave(enemy) {
    const bossWaves = enemy.dataset.waves.split(',');

    // Remove current wave classes.
    if ( bossWaves ) {
        bossWaves.forEach( bossWave => {
            enemy.classList.remove( bossWave + '-wave-engage' );
        } );

        enemy.classList.add(bossWaves[bossWaveCount] + '-wave-engage')

        if ( 'pulse' === bossWaves[bossWaveCount]) {
            pulsewaveInterval = setInterval( () => {
                enemy.classList.toggle( 'pulse-in' );
            }, 13000 );
        } else if ( pulsewaveInterval ) {
            clearInterval(pulsewaveInterval);
            enemy.classList.remove( 'pulse-in' );
        }

        if ('barrage' === bossWaves[bossWaveCount]) {
            engageShooter(enemy);
        } else {
            clearInterval( shooterInterval );
        }
    }

    bossWaveCount++;
}

function engageShooter(enemy) {
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
function shootProjectile(projectile, mapCharacterLeft, mapCharacterTop, enemy, projSpeed, spell, projectileClass, isProjectile = 'no') {
    const newProjectile = projectile.cloneNode( true );

    // Remove engage class and transition style before using new projectile.
    newProjectile.classList.remove( 'engage' );
    newProjectile.style.transition = '';

    // Move projectile.
    if (true !== spell && 'no' === isProjectile ) {
        moveEnemy( projectile, mapCharacterLeft, mapCharacterTop, projSpeed, enemy );
    } else if ( true === spell ) {
        projectile.classList.remove( 'map-weapon' );
        projectile.classList.add( 'magic-weapon' )

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
            collisionWalls.forEach( collisionWall => {
                if ( elementsOverlap( projectile.getBoundingClientRect(), collisionWall.getBoundingClientRect() ) ) {
                    // If projectile collides with player than take health of player.
                    if ( true === collisionWall.classList.includes('map-character-icon') && '.map-weapon' !== projectileClass ) {
                        const enemyValue = parseInt(projectile.getAttribute('data-value'));

                        // Immediately remove the projectile when hits.
                        const currentHealth = document.querySelector('#explore-points .health-amount');
                        const healthAmount = parseInt(currentHealth.getAttribute('data-amount'));

                        if (currentHealth && 0 <= healthAmount) {
                            const currentHealthLevel = healthAmount;
                            const newAmount = currentHealthLevel >= enemyValue ? currentHealthLevel - enemyValue : 0;

                            addUserPoints(newAmount, 'health', 'projectile');
                        }
                    }

                    projectile.remove();

                    // Link weapon back to player.
                    window.weaponConnection = true;
                }
            } );
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
    let leftDifference = 0;
    let topDifference = 0;
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
function regulateTransitionSpeed(aPositionx, aPositiony, bPositionx, bPositiony, projectile, multiple) {
    const diffDist = Math.hypot(aPositionx - bPositionx, aPositiony - bPositiony);
    const transitionDist = ( diffDist * .075 ) * multiple;
    let moveDirection = 'down';

    projectile.style.transition = 'all ' + transitionDist + 'ms linear 0s';

    if (aPositiony < bPositiony) {
        moveDirection = 'up';
    } else if (aPositiony > bPositiony) {
        moveDirection = 'down';
    } else if (aPositionx < bPositionx) {
        moveDirection = 'right';
    } else if (aPositionx > bPositionx) {
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
function getLoopAmount(aPositionx, aPositiony, bPositionx, bPositiony, multiple, timeBetween = '0.75') {
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
    const types = ['health', 'mana', 'point', 'gear', 'weapons']

    types.forEach( type => {
        const selectedCharacterPositions = undefined !== explorePoints[type] ? explorePoints[type]['positions'] : [];

        // Add no point class to positions already gotten.
        if ( selectedCharacterPositions ) {
            selectedCharacterPositions.forEach( value => {
                const mapItem = document.querySelector('.' + value + '-map-item');
                const materializeMapItem = document.querySelector( '.' + value + '-materialize-item-map-item' );
                const dragDestMapItem = document.querySelector( '.' + value + '-drag-dest-map-item' );

                if (mapItem) {
                    // If collected already don't show item.
                    if (shouldRemoveItemOnload( mapItem )) {
                        mapItem.remove();

                        if ( materializeMapItem ) {
                            materializeMapItem.remove();
                        }

                        if ( dragDestMapItem && 'true' === dragDestMapItem.dataset.removable ) {
                            dragDestMapItem.remove();
                        }
                    }

                    if ( 'false' === mapItem.dataset?.disappear) {
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
    if (
        (undefined !== mapItem.dataset.timer && null !== mapItem.dataset.timer) ||
        'explore-character' === mapItem.dataset.genre ||
        'true' === mapItem.dataset.hazard ||
        'true' === mapItem.dataset.collectable ||
        ( 'true' === mapItem.dataset.breakable && 'false' !== mapItem.dataset?.disappear )  ||
        ('true' === mapItem.dataset.removable && 'false' !== mapItem.dataset?.disappear )
    ) {
        return true;
    }

    return false;
}

/**
 * Engages the explore page game functions.
 */
function engageExploreGame() {
    const touchButtons = document.querySelector( '.touch-buttons' );

    // Set all first cutscene dialogues to engage.
    const allFirstDialogues = document.querySelectorAll( '.map-cutscene .wp-block-orbem-paragraph-mp3:first-of-type' );

    if ( allFirstDialogues ) {
        allFirstDialogues.forEach( firstDialogue => {
            firstDialogue.classList.add( 'engage' );
        });
    }

    // Stop start music.
    playStartScreenMusic(false);

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
    window.moveSpeed = 20;

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
    document.querySelector( '.explore-overlay' ).remove();
    document.body.style.position = 'unset';

    if ( touchButtons ) {
        touchButtons.classList.add( 'do-mobile' );
    }

    let newMusic = '';

    if ( musicNames && currentLocation ) {
        newMusic = musicNames[currentLocation];
    }

    // Start music.
    playSong( newMusic, currentLocation );

    // Show leave map link and keys guide.
    const explorePoints = document.getElementById( 'explore-points' );
    const missions = document.getElementById( 'missions' );

    if ( explorePoints && missions ) {
        explorePoints.style.opacity = '1';
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
    const moveableCharacters = document.querySelectorAll( '.path-onload[data-path]:not([data-path=""])');

    if ( moveableCharacters ) {
        moveableCharacters.forEach( moveableCharacter => {
            moveNPC( moveableCharacter );
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
        const cutSceneName = currentLocation;
        window.previousCutsceneArea = cutSceneName;
        engageCutscene(cutSceneName, true);
    }

    // Trigger mission dependent cutscenes if mission are complete.
    const dependentCutscenes = document.querySelectorAll( '.map-cutscene[data-dependent="yes"]' );

    if ( dependentCutscenes && 0 < dependentCutscenes.length ) {
        const dependentMinigame = dependentCutscenes[0].dataset.minigame;
        let dependentMission = dependentCutscenes[0].dataset.mission;

        if ( dependentMinigame && '' !== dependentMinigame ) {
            dependentMission = document.querySelector( '.' + dependentMinigame + '-minigame-item' );

            if (dependentMission) {
                dependentMission = dependentMission.dataset.mission;
            }
        }

        if ( '' !== dependentMission ) {
            const missionEl = document.querySelector('.' + dependentMission + '-mission-item');

            if ( undefined === missionEl || null === missionEl ) {
                engageCutscene(cleanClassName(dependentCutscenes[0].className));
            }
        }
    }

    if ( '' !== window.previousCutsceneArea ) {
        removeItems( document.querySelectorAll('[data-removeaftercutscene]' ), window.previousCutsceneArea );
    }

    // Hazard hurt me check.
    checkIfHazardHurts();

    // Scroll to center.
    const mapChar = document.getElementById( 'map-character' );

    if ( mapChar ) {
        mapChar.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
    }
}

/**
 * For the talking tone mechanics.
 * @param amount
 * @returns {Float32Array}
 */
function makeDistortionCurve(amount) {
    const k = typeof amount === "number" ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < n_samples; i++) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

/**
 * Run materialize item logic.
 */
function materializeItemLogic() {
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

function playFrequency(frequency, audioContext) {
    // create 2 second worth of audio buffer, with single channels and sampling rate of your device.
    var sampleRate = audioContext.sampleRate;
    var duration = sampleRate;
    var numChannels = 1;
    var buffer  = audioContext.createBuffer(numChannels, duration, sampleRate);
    // fill the channel with the desired frequency's data
    var channelData = buffer.getChannelData(0);
    for (var i = 0; i < sampleRate; i++) {
        channelData[i]=Math.sin(2*Math.PI*frequency*i/(sampleRate));
    }

    const gainNode = audioContext.createGain()
    gainNode.gain.value = window.talkingVolume; // 10 %
    gainNode.connect(audioContext.destination);

    const distortion = audioContext.createWaveShaper();

    // create audio source node.
    source = audioContext.createBufferSource();
    source.buffer = buffer;

    distortion.curve = makeDistortionCurve(400);
    distortion.oversample = "4x";
    distortion.connect(gainNode);

    source.connect(distortion);

    // finally start to play
    source.start(0, 0, .1 );
}

/**
 * Load blockades from missions.
 */
function loadMissionBlockades() {
    // Add mission blockade.
    const missions = document.querySelectorAll( '.mission-list .mission-item' );

    if ( missions ) {
        missions.forEach( mission => {
            const blockade = mission.dataset.blockade;

            if ( '' !== blockade ) {
                const blockadeSpecs = JSON.parse( blockade );

                if ( '0' !== blockadeSpecs.height ) {
                    const missionBlockadeEl = document.createElement('div');
                    const blockadeClasses = mission.className.replace('mission-item', '');
                    const defaultMap = document.querySelector('.default-map');

                    missionBlockadeEl.className = 'wp-block-group map-item is-layout-flow wp-block-group-is-layout-flow ' + blockadeClasses + '-blockade';
                    missionBlockadeEl.style.top = blockadeSpecs.top + 'px';
                    missionBlockadeEl.style.left = blockadeSpecs.left + 'px';
                    missionBlockadeEl.style.width = blockadeSpecs.width + 'px';
                    missionBlockadeEl.style.height = blockadeSpecs.height + 'px';

                    if (true === missionBlockadeEl.classList.contains('next-mission')) {
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
    const pane = document.querySelector( '.game-container' );
    const mapChar = document.querySelector( '#map-character' );
    let box = mapChar.querySelector( '.map-character-icon.engage' );
    const modal = document.querySelectorAll( '.map-item:not(.drag-dest), .projectile, .enemy-item, [data-hazard="true"]' );
    let weaponEl = document.querySelector( '.map-weapon' );
    const magicEl = document.querySelector( '.magic-weapon' );

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

            // Touching with buffer.
            if (value && box && elementsOverlap(box.getBoundingClientRect(), value.getBoundingClientRect(), 5)) {
                // Pause NPC from moving if touching MC.
                if ( 'explore-character' === value.dataset.genre && '' !== value.dataset.path ) {
                    value.dataset.canmove = 'false';
                }
            } else if ( 'false' === value.dataset?.canmove ) {
                // Reset NPC to allow movement.
                value.dataset.canmove = 'true';
            }

            if (value && box && elementsOverlap(box.getBoundingClientRect(), value.getBoundingClientRect())) {
                navigator.vibrate(1000);

                // Add indicator if touching sign.
                if ('explore-sign' === value.dataset.genre && false === value.classList.contains( 'engage' ) ) {
                    triggerIndicator(value, false);
                    value.classList.add( 'engage' );
                    window.allowHit = false;
                }

                // Check if collided point is enterable.
                if ('explore-area' === value.getAttribute('data-genre')) {
                    enterExplorePoint(value);

                    return;
                }

                // If in hazard set to true.
                if ('true' === value.dataset.hazard && false === canCharacterInteract(value, mapChar, 'hazard')) {
                    inHazard = true;
                    window.theHazardValue = value.dataset.value;
                    hazardItem = value.closest('.enemy-item') ?? value;
                } else if ('true' === value.dataset.hazard && true === canCharacterInteract(value, mapChar, 'hazard')) {
                    setTimeout(() => {
                        inHazard = false;
                    }, 100);
                }

                if (dragDest) {
                    dragMission = document.querySelector('.' + dragDest.dataset.mission + '-mission-item');
                }

                // Draggable logic.
                if (
                    'true' === value.dataset.draggable &&
                    false === value.classList.contains('dragme') &&
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

                    if (triggee) {
                        triggee.classList.add('engage');
                        value.classList.add('already-hit');

                        const arrow = triggee.querySelector('img');
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
                                    {transform: animate1},
                                    {transform: animate2},
                                    {transform: animate3},
                                ];

                                const arrowTiming = {
                                    duration: 1000,
                                    iterations: Infinity,
                                };

                                arrow.animate(moveArrow, arrowTiming);
                            }
                        }

                        // Close explainer on click.
                        triggee.addEventListener('click', () => {
                            triggee.classList.remove('engage');
                        });
                    }
                }

                // NPC Walking Path Trigger.
                if (true === value.classList.contains('path-trigger') && false === value.classList.contains('already-hit')) {
                    const triggee = document.querySelector('.' + value.getAttribute('data-triggee'));

                    // Move triggered NPC.
                    moveNPC(triggee);

                    value.classList.add('already-hit');
                }

                // For collectables.
                if ('true' === value.getAttribute('data-collectable') ) {
                    if (value.dataset.mission && '' !== value.dataset.mission) {
                        saveMission(value.dataset.mission, value, position);
                    }

                    // Add item to storage menu.
                    storeExploreItem(value);

                    // If just points. store it.
                    if ('point' === value.dataset.type) {
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

                const cutsceneTriggee = value.getAttribute('data-triggee');

                // Change position to triggee if cutscene trigger hit.
                position = cutsceneTriggee && '' !== cutsceneTriggee ? cleanClassName(cutsceneTriggee) : position;
                const theCutScene = document.querySelector('.' + position + '-map-cutscene');

                // Trigger cutscene if overlapping cutscene trigger item.
                if (false === value.classList.contains('engage') && theCutScene && false === theCutScene.classList.contains('been-viewed') && true === value.classList.contains('cutscene-trigger')) {
                    const triggerType = value.dataset.triggertype;

                    if ('engagement' !== triggerType) {
                        if (value.dataset.mission && '' !== value.dataset.mission) {
                            saveMission(value.dataset.mission, value, position);
                        }

                        engageCutscene(position);

                        // Remove trigger.
                        value.remove();
                    } else {
                        value.classList.add('engage');
                        triggerIndicator(document.querySelector('.' + position + '-map-item'));
                    }
                }

                // Trigger item creation if you walk on this trigger.
                if (true === value.classList.contains('materialize-item-trigger')) {
                    clearTimeout(saveMaterializedItemTimeout)
                    const itemName = cleanClassName(value.className);

                    const itemEl = document.querySelector('.' + itemName + '-map-item');
                    const dragDest = document.querySelector('.' + itemName + '-drag-dest-map-item');

                    if (itemEl) {
                        itemEl.style.display = 'block';
                    }

                    if (dragDest) {
                        dragDest.style.display = 'block';
                    }

                    const area = document.querySelector('.game-container').className.replace('game-container ', '');
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
            } else if ('true' === value.dataset.hazard || true === value.classList.contains('engage') || true === value.classList.contains('dragme') ) {
                value.classList.remove('engage');
                value.classList.remove('dragme');

                if (indicator) {
                    indicator.classList.remove('engage');
                    window.allowHit = true;
                }

                setTimeout(() => {
                    inHazard = false;
                    hazardItem = false;
                }, 100);
            } else {
                setTimeout(() => {
                    inHazard = false;
                    hazardItem = false;
                }, 100);
            }

            // For breakables and other interactions.
            if (weaponEl) {
                if (elementsOverlap(weaponEl.getBoundingClientRect(), value.getBoundingClientRect())) {

                    // Timer trigger logic.
                    const triggeeName = cleanClassName(value.className);
                    const triggee = document.querySelector('[data-timertriggee="' + triggeeName + '"]');
                    const hasTrigger = value.dataset.timertriggee;

                    // Timer scenario.
                    const startTimerItem = document.querySelector('.start-timer');

                    if ((triggee || undefined !== hasTrigger) && (startTimerItem && false === value.classList.contains('start-timer'))) {
                        const timerPosition = 'true' === startTimerItem.dataset.removable ? '' : [position, cleanClassName(startTimerItem.className)];
                        saveMission(value.dataset.mission, value, timerPosition);
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
                        'false' !== value.dataset?.disappear
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
        const direction = getKeyByValue(d, true);
        const goThisWay = true === d[$newest] ? $newest : parseInt(direction);
        let newCharacterImage;

        if ( false === box.classList.contains( 'fight-image' ) ) {
            switch (goThisWay) {
                case 38 :
                    box.classList.remove('engage');
                    newCharacterImage = document.getElementById('mc-up');
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
                    newCharacterImage = document.getElementById('mc-left');
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
                    newCharacterImage = document.getElementById('mc-right');
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
                    newCharacterImage = document.getElementById('mc-down');
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
                    newCharacterImage = document.getElementById('mc-up');
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
                    newCharacterImage = document.getElementById('mc-left');
                    if (newCharacterImage) {
                        newCharacterImage.classList.add('engage');
                    }
                    mapChar.className = '';
                    mapChar.classList.add('left-dir')
                    if (weaponEl) {
                        weaponEl.setAttribute('data-direction', 'left');
                    }
                    break;
                case 68 :
                    box.classList.remove('engage');
                    newCharacterImage = document.getElementById('mc-right');
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
                    newCharacterImage = document.getElementById('mc-down');
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
        for (var key in array) {
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
    // Push user away from hazard center.
    let targetX = parseInt(pushee.style.left.replace('px', ''));
    let targetY = parseInt(pushee.style.top.replace( 'px', '' ));

    if ( pushElement ) {
        const enemyLeft = parseInt(pushElement.style.left.replace('px'));
        const enemyTop = parseInt(pushElement.style.top.replace('px'));

        targetX = ( targetX + 400 ) < enemyLeft ? targetX - distanceMult : targetX + distanceMult;
        targetY = ( targetY + 300 ) < enemyTop ? targetY - distanceMult : targetY + distanceMult;

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
    if ( type === 'strength') {
        return ('yes' === item.dataset.isstrong && 'strength' === character.dataset.ability) ||
            (undefined === item.dataset.isstrong || 'no' === item.dataset.isstrong);
    }

    return type === character.dataset.ability
}

/**
 * Drag item
 */

/**
 * When user hits an item with weapon
 * @param item
 */
function interactWithItem( item, mapChar ) {
    // For explore signs.
    if ( 'explore-sign' === item.dataset.genre ) {
        item.classList.add( 'open-up' );

        document.addEventListener( 'click', () => {item.classList.remove( 'open-up' );}, { once: true } );
    }

    // For minigames.
    if ( ( ( 'true' === item.dataset.draggable &&
                true === item.classList.contains( 'no-point') ) ||
            ( null === item.dataset.draggable ||
                'false' === item.dataset.draggable ) &&
            false === item.classList.contains( 'hit' ) )
        &&
        canCharacterInteract( '', mapChar, 'programming' )
    )
    {
        engageMinigameLogic(item);
    }

    // If item is breakable.
    if ('false' !== item.dataset?.disappear && 'true' === item.dataset.breakable && 'explore-sign' !== item.dataset.genre ) {
        item.style.display = 'none';
    }

    // If disappear set to false change image.
    if ('false' === item.dataset?.disappear) {
        swapInteractedImage(item);
    }
}

/**
 * Swatch alt image for intereacted items like breakables that don't disappear.
 * @param item
 */
function swapInteractedImage(item) {
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
    const jsonString = {
        area: area,
        item: materializedItemsArray,
        userid: currentUserId
    }
    // Save position of item.
    fetch(`https://${wpThemeURL}/wp-json/orbemorder/v1/save-materialized-item/`, {
        method: 'POST', // Specify the HTTP method
        headers: {
            'Content-Type': 'application/json', // Set the content type to JSON
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
    const jsonString = {
        slug: ability,
        userid: currentUserId
    }
    // Save position of item.
    fetch(`https://${wpThemeURL}/wp-json/orbemorder/v1/enable-ability/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
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
function triggerIndicator(indicateMe, isCutscene = true) {
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
                indicator.dataset.cutscene =  positionName;
            }

            if ( false === isCutscene ) {
                indicator.dataset.cutscene = '';
                indicator.dataset.sign = positionName;
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
                    showItemDescription(menuItem);
                });
            }

            // Add item to database.
            saveStorageItem(id, name, type, value, false);
        } else {
            //TODO CREATE NOTICE.
        }
    }
}

/**
 * cut scene logic
 */
function engageCutscene( position, areaCutscene = false, isVideo = false ) {
    const cutscene = document.querySelector('.' + position + '-map-cutscene');

    if ( cutscene && ( undefined === cutscene.dataset.video || 'false' === cutscene.dataset.video ) ) {
        const dialogues = cutscene.querySelectorAll( 'p, .wp-block-orbem-paragraph-mp3' );

        if ( false === cutscene.classList.contains( 'been-viewed' ) ) {
            // stop movement.
            window.allowMovement = false;
            window.allowHit = false;
            cutscene.classList.add('engage');

            // start music if exists.
            if ( cutscene.dataset.music && '' !== cutscene.dataset.music ) {
                playSong( cutscene.dataset.music, position );
            }

            let textContainer = dialogues[0];

            // on load.
            if ( dialogues[0] && dialogues[0].classList.contains( 'wp-block-orbem-paragraph-mp3' ) ) {
                textContainer = dialogues[0].querySelector( 'p' );
            }

            const text = textContainer.innerText;
            textContainer.innerText = '';
            typeWriter(textContainer, text, 0);

            cutscene.classList.add( 'been-viewed' );

            // Set allow be default.
            window.allowCutscene = true;

            // Before Cutscene.
            beforeCutscene(cutscene);

            // Close cutscene if click out.
            cutscene.addEventListener( 'click', ( e ) => {
                if ( false === cutscene.contains( e.target ) ) {
                    dialogues.forEach( dialogue => {
                        dialogue.classList.remove( 'engage' )
                    } );

                    cutscene.classList.remove( 'engage' );

                    // reset dialogue.
                    dialogues[0].classList.add( 'engage' );

                    // Stop typewriter.
                    clearTimeout( typeWriterTimeout );
                    clearTimeout( window.nextDialogueTimeout );

                    // After cutscene.
                    afterCutscene( cutscene );
                }
            } );

            moveDialogueBox(text);

            // Add a keydown event listener to the document to detect spacebar press
            document.addEventListener( 'keydown', cutsceneKeys );
        }

        function moveDialogueBox(firstText = '') {
            const currentDialogue = cutscene.querySelector( '.wp-block-orbem-paragraph-mp3.engage' );
            let providedAudio = currentDialogue.querySelector( 'audio' );
            providedAudio = providedAudio ?? false;
            const dialogueChar = currentDialogue.className.replace(' engage', '').replace('engage ', '').replace('wp-block-orbem-paragraph-mp3 ', '');
            const dialogueCharClass = '.' + dialogueChar + '-map-item';
            const currentDialogueChar = '.mc-map-item' !== dialogueCharClass ? document.querySelector( dialogueCharClass ) : document.querySelector( '#map-character' );
            let voice = currentDialogue.dataset.voice;
            const theCharacter = currentDialogue.className.replace( 'wp-block-orbem-paragraph-mp3', '' ).replace( 'engage', '').trim();
            const theCharacterEl = document.querySelector( '.cut-character[data-character="' + theCharacter + '"]' );

            // Move dialogue box to talker.
            if ( true === areaCutscene ) {
                if ( currentDialogueChar && cutscene ) {
                    const currentDialogueCharLeft = '.mc-map-item' !== dialogueCharClass ? parseInt( currentDialogueChar.style.left.replace('px', '') ) + 20 : parseInt( currentDialogueChar.style.left.replace('px', '') ) + 470;
                    const currentDialogueCharTop = '.mc-map-item' !== dialogueCharClass ? parseInt( currentDialogueChar.style.top.replace('px', '') ) + 20 : parseInt( currentDialogueChar.style.top.replace('px', '') ) + 470;

                    cutscene.style.position = 'absolute';
                    cutscene.style.display = 'table';
                    cutscene.style.width = '300px';
                    cutscene.style.maxHeight = 'unset';
                    cutscene.style.height = 'unset';
                    cutscene.style.transform = 'unset';
                    cutscene.style.left = ( currentDialogueCharLeft - 300 ) + 'px';
                    cutscene.style.top = ( currentDialogueCharTop - cutscene.offsetHeight ) + 'px';
                }
            } else {
                const currentCharImage = document.querySelector( '.engage.cut-character' );
                if ( currentCharImage ) {
                    currentCharImage.classList.remove('engage');
                    theCharacterEl.classList.add( 'engage' );
                }
            }

            if ('' !== firstText) {
                makeTalk(firstText, voice, providedAudio);

                if ( theCharacterEl ) {
                    theCharacterEl.classList.add( 'engage' );
                }
            }
        }

        /**
         * Handles key events during a cutscene, allowing progression through dialogue and ending the cutscene.
         * @param {KeyboardEvent} event - The keyboard event object.
         */
        function cutsceneKeys ( event ) {
            if ( true === window.allowCutscene ) {
                if ( ( event.code === 'ArrowRight' ||  event.code === 'Space' ) && dialogues && cutscene.classList.contains( 'engage' ) ) {
                    nextDialogue();
                }
            }
        }

        function closeCutscene() {
            window.allowMovement = true;

            cutscene.classList.remove( 'engage' );
            cutscene.removeEventListener( 'click', cutsceneKeys );
            document.removeEventListener( 'keydown', cutsceneKeys );

            // reset dialogue.
            dialogues.forEach( dialogue => {
                dialogue.classList.remove( 'engage' )
            } );

            dialogues[0].classList.add( 'engage' );

            // Stop talking noise.
            clearTimeout( window.nextDialogueTimeout );
            clearTimeout( typeWriterTimeout );

            // After cutscene.
            afterCutscene( cutscene );
        }

        let wordCount = 0;

        function typeWriter(element, text, i) {
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
                window.nextDialogueTimeout = setTimeout( () => {
                    nextDialogue();
                }, 2000 );
            }
        }

        function nextDialogue() {
            if ('' !== source ) {
                source.stop();
            }

            if ( '' !== talkAudio ) {
                talkAudio.pause();
                talkAudio.currentTime = 0;
            }

            // Clear timeout incase manually triggered.
            clearTimeout( window.nextDialogueTimeout );

            const currentDialogue = cutscene.querySelector( 'p.engage, .wp-block-orbem-paragraph-mp3.engage' );
            let nextDialogue = currentDialogue.nextElementSibling;

            dialogues.forEach( dialogue => {
                dialogue.classList.remove( 'engage' )
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
                clearTimeout( window.nextDialogueTimeout );

                // At end of dialogue. Close cutscene and make walking available.
                cutscene.classList.remove( 'engage' );
                cutscene.removeEventListener( 'click', cutsceneKeys );
                document.removeEventListener( 'keydown', cutsceneKeys );

                // If not area cutscene reset MC cutscene character.
                if ( 'yes' !== document.querySelector( '.default-map' ).dataset.iscutscene ) {
                    document.querySelector('div[data-character="mc"]').classList.remove('engage');
                }

                // Reengage movement.
                window.allowMovement = true;

                // reset dialogue.
                dialogues[0].classList.add( 'engage' );

                // After cutscene.
                afterCutscene( cutscene, areaCutscene );

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
        }
    } else if ( 'true' === cutscene.dataset.video ) {
        if ( false === cutscene.classList.contains( 'been-viewed' ) ) {
            const cutsceneVideo = cutscene.querySelector( 'video' );
            // stop movement.
            window.allowMovement = false;
            cutscene.classList.add('engage');

            if ( cutsceneVideo ) {
                cutsceneVideo.play();

                cutsceneVideo.addEventListener( 'ended', () => {
                    // Reengage movement.
                    window.allowMovement = true;

                    // After cutscene.
                    afterCutscene( cutscene, areaCutscene );
                } );
            }
        }
    }
}

/**
 * engage the sign to open.
 *
 * @param signname
 */
function engageSign( signname ) {
    const item = document.querySelector( '.' + signname + '-map-item' );
    item.classList.add( 'open-up' );

    document.addEventListener( 'click', () => {item.classList.remove( 'open-up' );}, { once: true } );
}

/**
 * Stuff that happens before a cutscene.
 * @param cutscene
 */
function beforeCutscene( cutscene ) {
    const characterPosition = JSON.parse( cutscene.getAttribute( 'data-character-position' ) );

    if ( characterPosition && 0 < characterPosition.length && undefined !== characterPosition[0] ) {
        window.allowCutscene = false;
        // Trigger character move before cutscene starts.
        moveCharacter( document.getElementById( 'map-character' ), characterPosition[0].top, characterPosition[0].left, true, cutscene );
    }
}

/**
 * Stuff that happens after a cutscene.
 * @param cutscene
 * @param areaCutscene
 */
function afterCutscene( cutscene, areaCutscene = false ) {
    window.nextAreaMissionComplete = '';
    const cutsceneName = cleanClassName( cutscene.className ).replace( ' ', '' );
    const bossFight = cutscene.dataset.boss;
    const indicator = document.querySelector( '.indicator-icon' );

    // Hide indicator.
    if ( indicator ) {
        indicator.classList.remove( 'engage' );
    }

    // Hide cutscene images.
    const mcImage = document.querySelector('[data-character="mc"]');

    if ( mcImage ) {
        mcImage.classList.remove( 'engage' );
    }

    // restart music if it changed.
    if ( cutscene.dataset.music && '' !== cutscene.dataset.music && musicNames[currentLocation] ) {
        playSong( musicNames[currentLocation], currentLocation );
    }

    // Stop talking.
    if ( '' !== talkAudio ) {
        talkAudio.pause();
        talkAudio.currentTime = 0;
    }

    // Trigger walking path if selected and has path.
    const pathTriggerPosition = document.querySelector( '[data-trigger-cutscene="' + cutsceneName + '"]' );

    if ( pathTriggerPosition ) {
        moveNPC( pathTriggerPosition );
    }

    // Remove after cutscene.
    let removeThings = document.querySelectorAll('[data-removeaftercutscene]' );

    if ( removeThings ) {
        removeItems( removeThings, cutsceneName );
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

        if ( bossFight && '' !== bossFight ) {
            const daBoss = document.querySelector( '.' + bossFight + '-map-item' );

            if ( daBoss ) {
                engageEnemy( daBoss );
            }
        }
    }, 100);
}

function removeItems( removeThings, cutsceneName ) {
    removeThings.forEach( removeThing => {
        if ( cutsceneName === removeThing.dataset.removeaftercutscene ) {
            removeThing.remove();

            persistItemRemoval(cleanClassName(removeThing.className));
        }
    } );

    if ( removeThings && 0 < removeThings.length && '' !== window.previousCutsceneArea ) {
        window.previousCutsceneArea = '';
    }
}

function playWalkSound() {
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

function stopWalkSound() {
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
function enterExplorePoint(value) {
    // Add enter buttons to map items.
    const position = cleanClassName(value.className);
    const mapUrl = value.getAttribute( 'data-map-url' );

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
    const d = {};
    const x = 3;
    let $newest = false;
    window.allowMovement = true;
    window.keyDown = false;

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

            // Change to static image.
            const currentCharacterImage = document.querySelector('.map-character-icon.engage');

            if ( currentCharacterImage && '' === window.currentCharacterAutoDirection ) {
                const staticVersion = document.getElementById(currentCharacterImage.id.replace('left-punch', 'left').replace('right-punch', 'right').replace('up-punch', 'up').replace('down-punch', 'down').replace( 'mc-', 'mc-static-' ) );

                if ( staticVersion ) {
                    currentCharacterImage.classList.remove( 'engage' );
                    staticVersion.classList.add( 'engage' );

                    mapChar.dataset.static = 'true';
                }
            }
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
        const finalPos = blockMovement( topValInt, leftValInt );
        const draggableItem = document.querySelector( '.dragme' );

        if ( window.allowMovement ) {
            if (Object.values(d).includes(true) ) {
                window.keyDown = true;
            }

            const myTop = miroExplorePosition( finalPos.top, d[87] ? 87 : 38, d[83] ? 83 : 40, d, x, $newest );
            const myLeft = miroExplorePosition( finalPos.left, d[65] ? 65 : 37, d[68] ? 68 : 39, d, x, $newest );
            box.style.top = myTop + 'px';
            box.style.left = myLeft + 'px';

            if ( weapon && true === window.weaponConnection ) {
                weapon.style.top = ( myTop + 300 ) + 'px';
                weapon.style.left = ( myLeft + 400 ) + 'px';
            }

            if ( draggableItem ) {
                if (window.dragTop && false !== window.dragTop) {
                    draggableItem.style.top = window.dragTop.higher ? ( ( myTop + 450 ) - window.dragTop.offset ) + 'px' : ( ( myTop + 450 ) + window.dragTop.offset ) + 'px';
                }

                if (window.dragLeft && false !== window.dragLeft) {
                    draggableItem.style.left = window.dragLeft.left ? ( ( myLeft + 450 ) - window.dragLeft.offset ) + 'px' : ( ( myLeft + 450 ) + window.dragLeft.offset ) + 'px';
                }
            }
        }

        box.scrollIntoView({block: 'nearest'});
    }, 20 );
}

/**
 * clean class name
 */
function cleanClassName(classes) {
    if ( 'string' === typeof classes ) {
        return classes.replace('wp-block-group map-item ', '')
            .replace('-map-item', '')
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
            .replace( ' selected', '');
    }
}

/**
 * Add character hit/interaction ability to spacebar (key 32).
 */
function addCharacterHit() {
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
        const weaponType = 'fist' === weapon.dataset.weapon ? 'punch' : weapon.dataset.weapon;
        const direction = 'top' === weapon.dataset.direction ? 'up' : weapon.dataset.direction;
        const mapChar =  document.querySelector( '#map-character' );
        let currentImageMapCharacter = mapChar.querySelector( '.map-character-icon.engage');
        const weaponAnimation = mapChar.querySelector( `#mc-${direction}-${weaponType}`);

        if ( false !== window.allowHit ) {
            const manaPoints = document.querySelector(`#explore-points .mana-amount`);
            const currentPoints = manaPoints.getAttribute('data-amount');

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
                        addUserPoints(newAmount, 'mana', 'magic');

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
                            }
                        }, weaponTime);
                    } else if (true === shiftIsPressed) {
                        weapon.classList.add('heavy-engage');
                        heavyAttackInProgress = true;

                        setTimeout(() => {
                            heavyAttackInProgress = false;
                            weapon.classList.remove('heavy-engage');
                            weapon.classList.remove('engage');

                            currentImageMapCharacter.classList.remove('punched');

                            weaponAnimation.classList.remove( 'engage' );

                            shiftIsPressed = false;
                        }, 500);
                    }

                    // FOr shooting.
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
                        weapon.classList.add('charge-attack-engage')

                        // Remove highlight on point bar.
                        setTimeout(() => {
                            weapon.classList.remove('charge-attack-engage')

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

                    if (cutscene && '' !== cutscene) {
                        engageCutscene(cutscene, false, false);
                        indicator.dataset.cutscene = '';
                    }
                    
                    if ( sign && '' !== sign ) {
                        engageSign( sign );
                        indicator.dataset.sign = '';
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
 * @returns {{top, left}}
 */
function blockMovement(top, left) {
    let finalTop = top;
    let finalLeft = left;
    const box = document.querySelector( '.map-character-icon.engage' ).getBoundingClientRect();
    const collisionWalls = document.querySelectorAll(
        '.default-map svg rect, .map-item:not(.materialize-item-trigger):not(.drag-dest):not([data-hazard="true"]):not([data-trigger="true"]):not(.currently-dragging):not(.passable):not([data-genre="explore-sign"]):not([data-foreground="true"]), .enemy-item'
    );

    return getBlockDirection(collisionWalls, box, finalTop, finalLeft, false);
}

/**
 * Get left and top locations to move collider.
 *
 * @param collisionWalls
 * @param box
 * @param finalTop The top position to move if not blocked.
 * @param finalLeft The left position to move if not blocked.
 * @param enemy The enemy.
 * @returns {{top: *, left: *, collide: *}}
 */
function getBlockDirection(collisionWalls, box, finalTop, finalLeft, enemy) {
    const left = finalLeft;
    const top = finalTop;
    let final = {top: finalTop, left: finalLeft, collide: false};

    if ( collisionWalls && false === window.godMode ) {
        collisionWalls.forEach( collisionWall => {
            collisionWall = collisionWall.getBoundingClientRect();

            if ( elementsOverlap( box, collisionWall ) ) {
                // set collide true since we're overlapping.
                final.collide = true;

                const topCollision = collisionWall.bottom > box.top && collisionWall.top < box.top && collisionWall.bottom < ( box.top + 10 );
                const bottomCollision = collisionWall.top < box.bottom && collisionWall.bottom > box.bottom && collisionWall.top > ( box.bottom - 10 );
                const leftCollision = collisionWall.right > box.left && collisionWall.left < box.left;
                const rightCollision = collisionWall.left < box.right && collisionWall.right > box.right;
                const adjust = true === enemy ? 5 : 3;

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
function elementsOverlap(rect1, rect2, buffer = 0) {
    return !((rect1.right + buffer) < ( rect2.left - buffer ) ||
        ( rect1.left + buffer ) > ( rect2.right - buffer ) ||
        ( rect1.bottom - buffer ) < ( rect2.top + buffer ) ||
        ( rect1.top + buffer ) > ( rect2.bottom - buffer ));
}

/**
 * Map for menu types.
 *
 * @param type type.
 */
function getMenuType( type ) {
    const menuTypes = {
        'health' : 'items',
        'mana' : 'items',
        'gear' : 'gear',
        'weapons' : 'weapons'
    }

    return menuTypes[type];
}

/**
 * Do the point animation stuff.
 *
 * @param value
 * @param position
 * @param isMission
 * @param missionPoints
 */
function runPointAnimation( value, position, isMission, missionPoints, missionName ) {
    value.classList.add( 'engage' );

    let positionType = value.getAttribute('data-type');
    positionType = positionType && '' !== positionType ? positionType : 'point';
    const thePoints = document.querySelector( `#explore-points .${ positionType }-amount` );
    let currentPoints = 100;
    const objectAmount = true === isMission ? parseInt(missionPoints) : value.getAttribute('data-value');

    if ( thePoints ) {
        currentPoints = thePoints.dataset.amount;
        if ( 'point' === positionType ) {
            const newPoints = parseInt( currentPoints ) + parseInt( objectAmount );

            // Add amount to current points.
            thePoints.setAttribute( 'data-amount', newPoints );

            // Add level check.
            const oldLevel = getCurrentLevel( currentPoints );
            const newLevel = getCurrentLevel( newPoints );
            window.nextLevelPointAmount = JSON.parse(levelMaps)[newLevel];

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
        playPointSound();

        // Add new point count to DB.
        addUserPoints( parseInt( currentPoints ) + parseInt( objectAmount ), positionType, position, collectable, missionName );
    }
}

function playInterestSound() {
    const interestSound = document.getElementById('interest');

    interestSound.volume = window.sfxVolume;
    interestSound.play();

    return false;
}

function playPointSound() {
    const character = document.getElementById('map-character');

    // Show point graphic.
    character.classList.add( 'point' );

    setTimeout(function() {
        character.classList.add( 'over');

        setTimeout(function() {
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
    document.addEventListener( 'keydown', e => {
        const dragmeitem = document.querySelector( '.dragme' );
        // If Shift is pressed start transport sequence.
        if ( 16 === e.keyCode || 32 === e.keyCode ) {
            if ( dragmeitem && true === dragmeitem.classList.contains( 'currently-dragging' ) ) {
                // Reengage hit.
                setTimeout( () => {
                    window.allowHit = true;
                }, 100 );

                dragmeitem.classList.remove( 'currently-dragging' );
                dragmeitem.classList.remove( 'dragme' );

                dragmeitem.style.left = window.dragLeft.left ? ( parseInt( dragmeitem.style.left.replace('px', '') ) - 2 ) + 'px' : ( parseInt( dragmeitem.style.left.replace('px', '') ) + 2 ) + 'px';
                dragmeitem.style.top = window.dragTop.higher ? ( parseInt( dragmeitem.style.top.replace('px', '') ) - 2 ) + 'px' : ( parseInt( dragmeitem.style.top.replace('px', '') ) + 2 ) + 'px';

                window.dragLeft = false;
                window.dragTop = false;

                // Check if drop position is on draggable destination.
                const cleanClass = cleanClassName( dragmeitem.className );
                const dragDest = document.querySelector( '.' + cleanClass + '-drag-dest-map-item' );

                if ( dragDest ) {
                    const dragDestLeft = parseInt( dragDest.style.left.replace( 'px', '' ) );
                    const dragDestTop = parseInt( dragDest.style.top.replace( 'px', '' ) );
                    const dragItemLeft = parseInt( dragmeitem.style.left.replace('px', '') );
                    const dragItemTop = parseInt( dragmeitem.style.top.replace('px', '') );
                    const topOffset = dragItemTop < dragDestTop ? dragDestTop - dragItemTop : dragItemTop - dragDestTop;
                    const leftOffset = dragItemLeft < dragDestLeft ? dragDestLeft - dragItemLeft : dragItemLeft - dragDestLeft;

                    if ( topOffset < 10 && leftOffset < 10 && false === dragDest.classList.contains( 'completed-mission' ) ) {
                        saveMission(dragDest.dataset.mission, document.querySelector( '.' + dragDest.dataset.mission + '-mission-item' ), cleanClass );

                        // Add completed mission so you can't keep getting points.
                        dragDest.classList.add( 'completed-mission' );
                    }
                }

                // Save position of item.
                const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/save-drag/`;

                const jsonString = {
                    slug: cleanClass,
                    top: dragmeitem.style.top.replace('px', ''),
                    left: dragmeitem.style.left.replace('px', ''),
                    userid: currentUserId
                }
                // Save position of item.
                fetch(filehref, {
                    method: 'POST', // Specify the HTTP method
                    headers: {
                        'Content-Type': 'application/json', // Set the content type to JSON
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
    const itemToDrag = document.querySelector( '.dragme' );
    const mapCharacter = document.querySelector( '#map-character' );

    if ( itemToDrag ) {
        window.allowHit = false;

        const itemToDragTop = parseInt( itemToDrag.style.top.replace( 'px', '' ) );
        const itemToDragLeft = parseInt( itemToDrag.style.left.replace( 'px', '' ) );
        const mapCharacterTop = parseInt( mapCharacter.style.top.replace( 'px', '' ) ) + 450;
        const mapCharacterLeft = parseInt( mapCharacter.style.left.replace( 'px', '' ) ) + 450;

        const itemIsHigher = itemToDragTop < mapCharacterTop;
        const itemIsLeft = itemToDragLeft < mapCharacterLeft;
        const topOffset = itemToDragTop < mapCharacterTop ? mapCharacterTop - itemToDragTop : itemToDragTop - mapCharacterTop;
        const leftOffset = itemToDragLeft < mapCharacterLeft ? mapCharacterLeft - itemToDragLeft : itemToDragLeft - mapCharacterLeft;

        window.dragTop = {'offset': topOffset, 'higher': itemIsHigher};
        window.dragLeft = {'offset': leftOffset, 'left': itemIsLeft};

        itemToDrag.classList.add( 'currently-dragging' );
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
    const container = document.querySelector('.game-container');
    const rect = container.getBoundingClientRect();
    const x = ( clickE.clientX - rect.left ) - 400;
    const y = ( clickE.clientY - rect.top ) - 300;
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

        bar.setAttribute('data-amount', newAmount)
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
function moveCharacter(mapCharacter, newTop, newLeft, gradual, cutscene ) {
    const currentLeft = parseInt(mapCharacter.style.left.replace( 'px', '' ));
    const currentTop = parseInt(mapCharacter.style.top.replace( 'px', '' ));

    // Top bigger/smaller.
    const leftBigger = currentLeft > newLeft;
    const topBigger = currentTop > newTop;
    const leftDiff = leftBigger ? currentLeft - newLeft : newLeft - currentLeft;
    const topDiff = topBigger ? currentTop - newTop : newTop - currentTop;
    let moveCount = 0;
    const box = mapCharacter.querySelector( 'img' );
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
                    weapon.style.top = ( parseInt( mapCharacter.style.top.replace('px', '') ) + 300 ) + 'px';
                    topDown = 'up';
                } else {
                    mapCharacter.style.top = moveCount <= topDiff ? ( currentTop + moveCount ) + 'px' : newTop + 'px';
                    weapon.style.top = ( parseInt( mapCharacter.style.top.replace('px', '') ) + 300 ) + 'px';
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
                directCharacter( topDown, leftRight, box, mapCharacter );

                mapCharacter.scrollIntoView();
            } else {
                // Reenable cutscene click events.
                window.allowCutscene = true;

                // Change character to static.
                const currentMovementImage = mapCharacter.querySelector( '.map-character-icon.engage' );

                if ( currentMovementImage && false === currentMovementImage.id.includes('static') ) {
                    currentMovementImage.classList.remove( 'engage' );

                    const newStaticImage = document.getElementById( currentMovementImage.id.replace( 'mc', 'mc-static' ) );

                    if ( newStaticImage ) {
                        newStaticImage.classList.add( 'engage' );

                        // Reset so you can use static image swap again.
                        window.currentCharacterAutoDirection = '';
                    }
                }

                // Once cutscene is over reinstate walking privileges. Also only clear this interval after cutscene is over so you know when to walk again.
                if ( false === cutscene ) {
                    clearInterval( moveInt );
                    movementIntFunc();
                } else if ( false === cutscene.classList.contains( 'engage' ) ) {
                    clearInterval( moveInt );
                    movementIntFunc();
                }
            }

            moveCount++
        }, 10 );
    } else {
        mapCharacter.style.left = newLeft + 'px';
        mapCharacter.style.top = newTop + 'px';
    }
}

function directCharacter( topDown, leftRight, box, mapCharacter ) {
    let direction = '' === topDown ? leftRight : topDown;
    const currentImage = mapCharacter.querySelector( '.map-character-icon.engage' );

    if ( direction !== window.currentCharacterAutoDirection ) {
        const newImage = mapCharacter.querySelector( '#mc-' + direction );

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
    if ( levelMaps ) {
        const levels = JSON.parse( levelMaps );

        for (const key in levels) {

            if (currentPoints > levels[key] && currentPoints < levels[parseInt(key) + 1] || currentPoints === levels[key]) {
                return parseInt(key) + 1
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
    const theMinigame = document.querySelector( '.' + minigameTrigger.dataset.minigame + '-minigame-item');

    if ( theMinigame ) {
        const music = theMinigame.dataset.music;
        let missionElExists = false;

        if (theMinigame) {
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
                function handleDragStart(event) {
                    event.preventDefault();
                    draggedContainer = event.target.closest('.wp-block-image'); // Get the container element
                    if (draggedContainer) {
                        // Calculate the offset of the mouse from the top-left corner of the container
                        const rect = draggedContainer.getBoundingClientRect();
                        offsetX = event.clientX - rect.left;
                        offsetY = event.clientY - rect.top;

                        event.dataTransfer.setData('text/plain', '');

                        // Add mousemove event listener to update container position
                        document.addEventListener('mousemove', handleMouseMove);
                    }
                }

                // Handle the mousemove event to update container position
                function handleMouseMove(event) {
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
                }

                // Handle the dragend event
                function handleDragEnd() {
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
                                const wireWrap = minigame.querySelector('.wires');
                                const wires = wireWrap.querySelectorAll('.wp-block-image');
                                let overlapping = false;
                                let solderingPointValue = [];

                                if (solderPoints) {
                                    solderPoints.forEach(solderPoint => {
                                        if (wires) {
                                            wires.forEach(wire => {
                                                if (elementsOverlap(solderPoint.getBoundingClientRect(), wire.getBoundingClientRect())) {
                                                    overlapping = true;
                                                }
                                            });
                                        }

                                        solderingPointValue.push(overlapping)
                                    });
                                }

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
                }

                // Get all container elements within the .wp-block-group.wires container
                const containers = document.querySelectorAll('.wp-block-group.wires .wp-block-image');

                // Add the dragstart and dragend event listeners to each container
                containers.forEach(container => {
                    container.addEventListener('dragstart', handleDragStart);
                    container.addEventListener('mouseup', handleDragEnd);
                });
            }
        }
    }
}

function engageProgrammingStep(minigameMission, missionEl, minigame) {
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
        const binaryAnswer = textToBinary(programmingWord.textContent)

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
    const minigameName = cleanClassName(minigame.className);
    const cutscene = document.querySelector('.map-cutscene[data-minigame="' + minigameName + '"]');
    const isVideo = cutscene.dataset.video;

    if (cutscene) {
        engageCutscene(cleanClassName(cutscene.className), false, 'true' === isVideo);
    }

    // restart level music.
    if ( minigame.dataset.music && '' !== minigame.dataset.music && musicNames ) {
        playSong( musicNames[currentLocation], currentLocation );
    }
}

function textToBinary(str) {
    let output = "";
    str.split("").forEach((element) => {
        let char = element.charCodeAt(0).toString(2);
        output += ("00000" + char).slice(-5).concat("");
    });
    return output;
}

async function makeTalk(text, voiceName, providedAudio = false) {
    if ( true === text.includes('**') || '' === text || '...' === text ) {
        return;
    }

    text = fixPronounciations(text);

    const apiKey = "AIzaSyAH-bCanQ6GonagayBj-ojshasRn1v2h_Y"; // Replace with your actual API key
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
            volumeGainDb: window.talkingVolume,
        }
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
            const errorText = await response.text();
            throw new Error(`API Error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        const audioContent = data.audioContent;

        // Play the audio
        talkAudio = new Audio(`data:audio/mp3;base64,${audioContent}`);

        if ( false !== providedAudio ) {
            talkAudio = providedAudio;
        }

        talkAudio.play();
    } catch (error) {
        console.error("Error during TTS request:", error.message);
    }
}

function fixPronounciations(text) {
    if ( true === text.includes( 'Graeme' ) ) {
        text = text.replace( 'Graeme', '<phoneme alphabet="ipa" ph="gɹeɪm">Graeme</phoneme>' );
    }

    if ( true === text.includes( ' eh' ) ) {
        text = text.replace( ' eh', '<phoneme alphabet="ipa" ph="eɪ"> eh</phoneme>');
    }

    return text;
}

function startTheTimer(timeAmount) {
    if ( false === timerCountDownHit ) {
        timerCountDownHit = true;

        const timer = document.createElement('div');
        timer.className = 'timer-countdown';
        let countDown = parseInt(timeAmount / 1000);
        timer.style.position = 'fixed';
        timer.style.right = '2rem';
        timer.style.bottom = '2rem';
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

function playStartScreenMusic(play = true) {
    const startMusic = document.getElementById('start-screen-music');
    const fadeDuration = 3000; // 3 seconds
    const fadeStep = 0.1; // Volume increment step
    const intervalTime = fadeDuration * fadeStep;

    if ( startMusic && play ) {
        startMusic.volume = 0; // Start with volume at 0
        startMusic.play(); // Start playing the audio

        const fadeInInterval = setInterval(() => {
            if (startMusic.volume < .7) {
                startMusic.volume += fadeStep; // Gradually increase volume
            } else {
                clearInterval(fadeInInterval); // Stop the interval when volume reaches 1
            }
        }, intervalTime);
    } else if (startMusic && false === play) {
        startMusic.pause();
    }
}

function checkIfHazardHurts() {
    setInterval( () => {
        if ( true === inHazard ) {
            const hurtAmount = window.theHazardValue;
            const currentHealth = getCurrentPoints('health');
            const newAmount = parseInt(currentHealth) - parseInt(hurtAmount);

            addUserPoints(newAmount, 'health', 'hazard');
        }

        if ( false !== hazardItem ) {
            const mapChar = document.getElementById( 'map-character' );

            // Push character away from hazard center.
            pushCharacter(25, hazardItem, mapChar);
        }
    }, 1000);
}

/**
 * Helper function for logo spin and adds/removes class shortly.
 *
 * @param element
 * @param elementArr
 * @param name
 */
function spinMiroLogo(element,name) {
    element.classList.add( name );
    setTimeout(
        function() {
            element.classList.remove( name );
        },
        1000
    );
}
