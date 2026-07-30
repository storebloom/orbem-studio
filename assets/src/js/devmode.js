/* global OrbemOrder */

import { initImageUpload } from './image-upload';
import { enterExplorePoint, engageExploreGame } from './explore';

export function engageDevMode() {
    'use strict';

    let recordThePath = false;

    window.devmode = false;
    // In a zoomed area the world is drawn at the area's scale, so mouse->world
    // placement math must divide by that same factor. devZoom already drives
    // that division throughout devmode; seed it from the area scale.
    const devGameContainer = document.querySelector('.game-container');
    const devAreaScale =
        parseFloat(devGameContainer?.dataset.areaScale) || window.areaScale || 1;
    window.devZoom = devAreaScale;

    // Let pointer events pass through the character container so map items stay draggable,
    // but keep the icon images themselves clickable for devmode selection.
    const mapCharacterContainer = document.getElementById('map-character');
    if (mapCharacterContainer) {
        mapCharacterContainer.style.pointerEvents = 'none';
        mapCharacterContainer
            .querySelectorAll('img.map-character-icon')
            .forEach((img) => {
                img.style.pointerEvents = 'auto';
            });
    }

    // Drag logic.
    let draggedContainer = null;
    let offsetX = 0;
    let offsetY = 0;
    let sendItemCoodinateTimeout;

    // Wall click-to-delete state.
    let wallClickTarget = null;
    let wallMouseStartX = 0;
    let wallMouseStartY = 0;
    let selectedWall = null;

    // If the mouse moves more than 5px after mousedown, treat it as a drag, not a click.
    document.addEventListener('mousemove', function (e) {
        if (wallClickTarget) {
            if (
                Math.abs(e.clientX - wallMouseStartX) > 5 ||
                Math.abs(e.clientY - wallMouseStartY) > 5
            ) {
                wallClickTarget = null;
            }
        }
    });

    // Clicking outside any wall deselects the current one.
    document.addEventListener('mousedown', function (e) {
        if (selectedWall && !e.target.closest('[data-genre="explore-wall"]')) {
            deselectWall();
        }
    });

    function deselectWall() {
        if (selectedWall) {
            selectedWall.style.opacity = '0.3';
            selectedWall.style.outline = '';
            selectedWall.style.zIndex = '1';
            const btn = selectedWall.querySelector('.wall-delete-btn');
            if (btn) {
                btn.remove();
            }
            selectedWall = null;
        }
    }

    function handleWallSelect(wallEl) {
        if (selectedWall === wallEl) {
            return;
        }
        deselectWall();
        selectedWall = wallEl;
        wallEl.style.opacity = '0.65';
        wallEl.style.outline = '2px solid rgba(255,60,60,0.9)';
        wallEl.style.zIndex = '9998';

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'wall-delete-btn';
        deleteBtn.textContent = '✕';
        deleteBtn.style.cssText =
            'position:absolute;top:2px;right:2px;width:20px;height:20px;' +
            'background:rgba(220,40,40,0.9);color:#fff;border:none;border-radius:3px;' +
            'cursor:pointer;font-size:11px;line-height:1;padding:0;z-index:9999;';

        deleteBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            // eslint-disable-next-line no-alert
            if (window.confirm('Are you sure you want to remove this wall?')) {
                fetch(`${OrbemOrder.siteRESTURL}/delete-item/`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-WP-Nonce': OrbemOrder.orbemNonce,
                    },
                    body: JSON.stringify({ id: wallEl.id }),
                })
                    .then(function (response) {
                        if (!response.ok) {
                            throw new Error(
                                'Network response was not ok ' +
                                    response.statusText,
                            );
                        }
                        return response.json();
                    })
                    .then(function (data) {
                        if (data.success) {
                            wallEl.remove();
                            selectedWall = null;
                        }
                    });
            }
        });

        wallEl.appendChild(deleteBtn);
    }

    function attachWallClickBehavior(wallEl) {
        wallEl.addEventListener('mousedown', function (e) {
            wallClickTarget = wallEl;
            wallMouseStartX = e.clientX;
            wallMouseStartY = e.clientY;
        });

        wallEl.addEventListener('mouseup', function () {
            const wallBuilderActive = document
                .getElementById('engage-wallbuilder')
                ?.classList.contains('engage');
            if (wallClickTarget === wallEl && !wallBuilderActive) {
                // Walls are only selectable when "Show hidden" is active.
                if (!devmodeMenuToggle?.classList.contains('engage')) {
                    wallClickTarget = null;
                    return;
                }
                handleWallSelect(wallEl);
            }
            wallClickTarget = null;
        });
    }

    // Handle the mousedown event to begin custom drag (no HTML5 drag API)
    function handleDragStart(event) {
        if (event.button !== 0) return;
        clearTimeout(sendItemCoodinateTimeout);
        draggedContainer = event.target.closest('.map-item, .enemy-item');
        if (!draggedContainer) return;

        // Walls are only moveable when "Show hidden" is active.
        if (
            'explore-wall' === draggedContainer.dataset.genre &&
            !devmodeMenuToggle?.classList.contains('engage')
        ) {
            draggedContainer = null;
            return;
        }

        event.preventDefault();

        // Disable transition so the item follows the cursor instantly.
        draggedContainer.style.transition = 'none';

        const rect = draggedContainer.getBoundingClientRect();
        offsetX = event.clientX - rect.left;
        offsetY = event.clientY - rect.top;

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleDragEnd);
    }

    // Handle the mousemove event to update container position
    function handleMouseMove(event) {
        if (draggedContainer) {
            const isMenu = 'menu' === draggedContainer.dataset.type;
            const mapEl = document.querySelector('.game-container');
            const mapRect = mapEl.getBoundingClientRect();

            const mouseX = isMenu
                ? event.clientX
                : event.clientX - mapRect.left;
            const mouseY = isMenu ? event.clientY : event.clientY - mapRect.top;

            // offsetX/offsetY are in screen pixels; divide by devZoom to get CSS-pixel space.
            // Add the container's scroll offset so the item stays under the cursor even when
            // the map is scrolled (getBoundingClientRect is in viewport coords, but CSS
            // left/top are relative to the container's pre-scroll content edge).
            const zoom = isMenu ? 1 : window.devZoom || 1;
            const scrollX = isMenu ? 0 : mapEl.scrollLeft;
            const scrollY = isMenu ? 0 : mapEl.scrollTop;

            draggedContainer.style.left = `${(mouseX - offsetX) / zoom + scrollX}px`;
            draggedContainer.style.top = `${(mouseY - offsetY) / zoom + scrollY}px`;
        }
    }

    // Handle the mouseup event to end custom drag
    function handleDragEnd() {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleDragEnd);
        if (draggedContainer) {
            sendItemCoodinateTimeout = setTimeout(() => {
                const filehref = `${OrbemOrder.siteRESTURL}/set-item-position/`;
                const theID =
                    'true' === draggedContainer.dataset.trigger ||
                    true === draggedContainer.classList.contains('drag-dest')
                        ? draggedContainer.id
                              .replace('-t', '')
                              .replace('-d', '')
                        : draggedContainer.id;
                const jsonString = {
                    top: draggedContainer.style.top.replace('px', ''),
                    left: draggedContainer.style.left.replace('px', ''),
                    height: draggedContainer.style.height.replace('px', ''),
                    width: draggedContainer.style.width.replace('px', ''),
                    id: theID,
                    meta: draggedContainer.dataset?.meta,
                };

                if (theID === recordThePath) {
                    jsonString.walkingPath = 'true';
                }

                // Save position of item.
                fetch(filehref, {
                    method: 'POST', // Specify the HTTP method.
                    headers: {
                        'Content-Type': 'application/json', // Set the content type to JSON.
                        'X-WP-Nonce': OrbemOrder.orbemNonce,
                    },
                    body: JSON.stringify(jsonString), // The JSON stringified payload.
                }).then((response) => {
                    // Check if the response status is in the range 200-299.
                    if (!response.ok) {
                        throw new Error(
                            'Network response was not ok ' +
                                response.statusText,
                        );
                    }
                });

                // Clear the reference to the dragged container.
                draggedContainer = null;
            }, 1000);
        }
    }

    // Expose drag attachment so external code (e.g. pro plugin) can wire up dynamically injected elements.
    window.attachDevModeDrag = function (el) {
        el.addEventListener('mousedown', handleDragStart);
    };

    // Select level
    const levels = document.querySelector('.level-selector');
    const levelButton = document.getElementById('select-level');

    if (levels && levelButton) {
        levelButton.addEventListener('click', () => {
            levels.classList.add('engage');

            levels.querySelectorAll('img').forEach((level) => {
                level.addEventListener('click', () => {
                    const mapUrl = level.src;
                    const area = level.dataset.name;
                    engageExploreGame();
                    enterExplorePoint(area, mapUrl);
                });
            });
        });
    }
    const devmodeMenuToggle = document.querySelector('.dev-mode-menu-toggle');

    if (devmodeMenuToggle) {
        devmodeMenuToggle.addEventListener('click', () => {
            devmodeMenuToggle.classList.toggle('engage');

            const triggers = document.querySelectorAll(
                '.explainer-container, .materialize-item-trigger, [data-genre="explore-wall"], [data-trigger="true"], [data-genre="explore-area"], [data-genre="blockade"]',
            );

            if (devmodeMenuToggle.classList.contains('engage')) {
                devmodeMenuToggle.textContent =
                    devmodeMenuToggle.textContent.replace('Show', 'Hide');
                if (triggers) {
                    triggers.forEach((trigger) => {
                        if ('true' === trigger.dataset?.trigger) {
                            trigger.style.backgroundColor = 'rgb(27,170,0)';
                        }

                        if (
                            true ===
                            trigger.classList.contains(
                                'materialize-item-trigger',
                            )
                        ) {
                            trigger.style.backgroundColor = 'rgb(0,146,255)';
                        }

                        if (
                            true ===
                            trigger.classList.contains('explainer-container')
                        ) {
                            trigger.style.backgroundColor = 'rgb(170,0,255)';
                        }

                        if (
                            true ===
                            trigger.classList.contains('cutscene-trigger')
                        ) {
                            trigger.style.backgroundColor = 'rgb(0,255,157)';
                        }

                        if ('explore-wall' === trigger.dataset.genre) {
                            trigger.style.backgroundColor = 'rgb(255,203,0)';
                        }

                        if ('explore-area' === trigger.dataset.genre) {
                            trigger.style.backgroundColor = 'rgb(220,68,68)';
                        }

                        if ('blockade' === trigger.dataset.genre) {
                            trigger.style.backgroundColor = 'rgb(66,66,66)';
                        }

                        trigger.style.opacity = 0.3;
                        trigger.style.zIndex = 1;
                    });
                }
            } else if (triggers) {
                devmodeMenuToggle.textContent =
                    devmodeMenuToggle.textContent.replace('Hide', 'Show');
                triggers.forEach((trigger) => {
                    trigger.style.backgroundColor = '';
                    trigger.style.opacity = '';
                });
            }
        });
    }

    setTimeout(() => {
        const items = document.querySelectorAll('.map-item, .enemy-item');
        const mainCharacter = document.getElementById('map-character');
        const godMode = document.getElementById('god-mode');
        const noTouch = document.getElementById('no-touch');

        // Pinpoint.
        const pinPointIcon = document.getElementById('open-pinpoint');
        const pinPointContainer = document.querySelector('.pinpoint-container');

        if (pinPointIcon) {
            pinPointIcon.addEventListener('click', () => {
                document.body.style.cursor = 'copy';
                pinPointContainer.classList.add('engage');

                setTimeout(() => {
                    document.addEventListener('click', getMouseCoordinates);
                    document.addEventListener(
                        'mousemove',
                        trackMouseCoordinates,
                    );
                }, 0);
            });
        }

        function getMouseCoordinates(e) {
            e.stopPropagation();
            const topPinpoint = document.getElementById('top-pinpoint');
            const leftPinpoint = document.getElementById('left-pinpoint');

            topPinpoint.value = window.mouseY;
            leftPinpoint.value = window.mouseX;

            pinPointContainer.classList.remove('engage');

            document.removeEventListener('click', getMouseCoordinates);
            document.removeEventListener('mousemove', trackMouseCoordinates);
            document.body.style.cursor = 'default';
        }

        function trackMouseCoordinates(event) {
            const mapRect = document
                .querySelector('.game-container')
                .getBoundingClientRect();
            window.mouseX = parseInt(event.clientX - mapRect.left);
            window.mouseY = parseInt(event.clientY - mapRect.top);
        }

        window.godMode = false;
        window.noTouch = false;

        if (godMode && noTouch) {
            godMode.addEventListener('click', () => {
                godMode.classList.toggle('engage');

                if (godMode.classList.contains('engage')) {
                    window.godMode = true;
                    godMode.textContent = godMode.textContent.replace(
                        'Disable',
                        'Enable',
                    );
                } else {
                    window.godMode = false;
                    godMode.textContent = godMode.textContent.replace(
                        'Enable',
                        'Disable',
                    );
                }
            });

            noTouch.addEventListener('click', () => {
                noTouch.classList.toggle('engage');
                if (noTouch.classList.contains('engage')) {
                    noTouch.textContent = noTouch.textContent.replace(
                        'Disable',
                        'Enable',
                    );
                    window.noTouch = true;
                    mainCharacter.style.zIndex = '0';
                } else {
                    noTouch.textContent = noTouch.textContent.replace(
                        'Enable',
                        'Disable',
                    );
                    window.noTouch = false;
                }
            });
        }

        if (items && items.length) {
            items.forEach((item) => {
                item.addEventListener('mousedown', handleDragStart);
            });
        }

        document
            .querySelectorAll('[data-genre="explore-wall"]')
            .forEach(attachWallClickBehavior);

        const engageWallBuilder = document.getElementById('engage-wallbuilder');
        const wallBuilderContainer = document.querySelector(
            '.wallbuilder-container',
        );
        const defaultMap = document.querySelector('.default-map');
        let isDragging = false;

        if (engageWallBuilder) {
            engageWallBuilder.addEventListener('click', () => {
                engageWallBuilder.classList.toggle('engage');

                if (engageWallBuilder.classList.contains('engage')) {
                    document.body.style.cursor = 'cell';

                    document.addEventListener('mousedown', handleWallDragStart);
                } else {
                    document.body.style.cursor = 'default';
                    document.removeEventListener(
                        'mousedown',
                        handleWallDragStart,
                    );
                }
            });

            const offsetX = 0;
            const offsetY = 0;

            // Handle the dragstart event
            function handleWallDragStart(event) {
                isDragging = true;
                event.preventDefault();
                const wallElement = document.createElement('div');
                wallElement.draggable = true;

                // Calculate the mouse position in CSS-pixel space, accounting for
                // container scroll so the wall origin lands under the cursor.
                const mapEl = document.querySelector('.game-container');
                const mapRect = mapEl.getBoundingClientRect();

                const mouseX =
                    (event.clientX - mapRect.left) / window.devZoom +
                    mapEl.scrollLeft;
                const mouseY =
                    (event.clientY - mapRect.top) / window.devZoom +
                    mapEl.scrollTop;

                // Remember the drag origin so the wall's box can be normalized
                // regardless of which direction the user drags in.
                const startX = mouseX - offsetX;
                const startY = mouseY - offsetY;

                // Set the starting position of the wall basedon when you began to drag the mouse.
                wallElement.className = 'wp-block-group map-item';
                wallElement.style.left = `${startX}px`;
                wallElement.style.top = `${startY}px`;
                wallElement.style.backgroundColor = 'rgb(255,203,0)';
                wallElement.style.opacity = '0.3';
                wallElement.style.zIndex = '1';
                wallElement.dataset.genre = 'explore-wall';

                defaultMap.appendChild(wallElement);

                // Handle the mousemove event to update container position
                function handleWallMouseMove(event) {
                    if (!isDragging) {
                        return;
                    }

                    if (wallElement) {
                        const mapEl2 =
                            document.querySelector('.game-container');
                        const mapRect = mapEl2.getBoundingClientRect();

                        const mouseX =
                            (event.clientX - mapRect.left) / window.devZoom +
                            mapEl2.scrollLeft;
                        const mouseY =
                            (event.clientY - mapRect.top) / window.devZoom +
                            mapEl2.scrollTop;

                        // Normalize against the drag origin so dragging up
                        // and/or left resizes from the correct corner instead
                        // of producing a negative width/height.
                        wallElement.style.left =
                            Math.min(startX, mouseX) + 'px';
                        wallElement.style.top =
                            Math.min(startY, mouseY) + 'px';
                        wallElement.style.width =
                            Math.abs(mouseX - startX) + 'px';
                        wallElement.style.height =
                            Math.abs(mouseY - startY) + 'px';
                    }
                }

                // Handle the dragend event
                function handleWallDragEnd() {
                    isDragging = false;
                    const filehref = `${OrbemOrder.siteRESTURL}/add-new/`;

                    let currentLocation =
                        document.querySelector('.game-container');
                    currentLocation = currentLocation.className.replace(
                        'game-container ',
                        '',
                    );
                    const topPos = wallElement.style.top.replace('px', '');
                    const leftPos = wallElement.style.left.replace('px', '');
                    const width = wallElement.style.width.replace('px', '');
                    const height = wallElement.style.height.replace('px', '');

                    if (0 < parseInt(width) && 0 < parseInt(height)) {
                        const jsonString = {
                            type: 'explore-wall',
                            area: currentLocation ?? '',
                            values: {
                                title:
                                    'wall-' +
                                    currentLocation +
                                    '-' +
                                    topPos +
                                    '-' +
                                    leftPos,
                                'explore-width': width,
                                'explore-height': height,
                                'explore-top': topPos,
                                'explore-left': leftPos,
                            },
                        };
                        // Save position of item.
                        fetch(filehref, {
                            method: 'POST', // Specify the HTTP method.
                            headers: {
                                'Content-Type': 'application/json', // Set the content type to JSON.
                                'X-WP-Nonce': OrbemOrder.orbemNonce,
                            },
                            body: JSON.stringify(jsonString), // The JSON stringified payload.
                        })
                            .then((response) => {
                                // Check if the response status is in the range 200-299.
                                if (!response.ok) {
                                    throw new Error(
                                        'Network response was not ok ' +
                                            response.statusText,
                                    );
                                }

                                return response.json();
                            })
                            .then((data) => {
                                wallElement.id = data.data;
                                wallElement.className =
                                    wallElement.className +
                                    ' wall-' +
                                    currentLocation +
                                    '-' +
                                    topPos.toString().replace('.', '-') +
                                    '-' +
                                    leftPos.toString().replace('.', '-') +
                                    '-map-item is-layout-flow wp-block-group-is-layout-flow';
                                wallElement.dataset.width = width;
                                wallElement.dataset.height = height;

                                wallElement.addEventListener(
                                    'mousedown',
                                    handleDragStart,
                                );
                                attachWallClickBehavior(wallElement);
                            });
                    } else {
                        wallElement.addEventListener(
                            'mousedown',
                            handleDragStart,
                        );
                    }
                    document.removeEventListener(
                        'mousemove',
                        handleWallMouseMove,
                    );
                    document.removeEventListener('mouseup', handleWallDragEnd);
                }

                // Add mousemove event listener to update container position
                document.addEventListener('mousemove', handleWallMouseMove);
                document.addEventListener('mouseup', handleWallDragEnd);
            }
        }
    }, 2500);
}
document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    if (window.matchMedia('(pointer: coarse)').matches) {
        return;
    }

    const devMode = document.querySelector('main[data-devmode=true]');

    if (devMode) {
        engageDevMode();
    }
});
