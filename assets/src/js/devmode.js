import { initImageUpload } from './image-upload';
import { enterExplorePoint, engageExploreGame } from './explore';

export function engageDevMode() {
    window.devmode = false;

    // Settings.
    const settingCog = document.querySelector('#new-addition');

    if ( settingCog ) {

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
    }

    // Select level
    const levels = document.querySelector('.level-selector');
    const levelButton = document.getElementById('select-level');

    if (levels && levelButton) {
        levelButton.addEventListener('click', function(e) {
            levels.classList.add('engage');

            levels.querySelectorAll('img').forEach(level => {
                level.addEventListener('click', event => {
                    const mapUrl = level.src;
                    const area = level.dataset.name;
                    engageExploreGame();
                    enterExplorePoint(area, mapUrl);
                })
            })
        })
    }
    const devmodeMenuToggle = document.querySelector(".dev-mode-menu-toggle");

    if (devmodeMenuToggle) {
        devmodeMenuToggle.addEventListener("click", function() {
            const devModeMenu = document.querySelector(".dev-mode-menu");

            if (devModeMenu) {
                devModeMenu.classList.toggle("engage");
                devmodeMenuToggle.classList.toggle("engage");
                const triggers = document.querySelectorAll('.explainer-container, [data-genre="explore-wall"], [data-trigger="true"], [data-genre="explore-area"], [data-genre="blockade"]');

                if (devModeMenu.classList.contains('engage')) {
                    if (triggers) {
                        triggers.forEach(trigger => {
                            trigger.style.backgroundColor = 'rgb(0,146,255)';
                            trigger.style.opacity = .3;
                            trigger.style.zIndex = 1;
                        });
                    }
                } else {
                    if (triggers) {
                        triggers.forEach(trigger => {
                            trigger.style.backgroundColor = '';
                            trigger.style.opacity = '';
                        });
                    }
                }
            }
        })
    }

    setTimeout(() => {
        const items = document.querySelectorAll('.map-item');
        const findItems = document.querySelectorAll('.find-explore-item');
        const mainCharacter = document.getElementById('map-character');
        const addNewListItems = document.querySelectorAll('#add-new-list li');
        const godMode = document.getElementById('god-mode');
        const noTouch = document.getElementById('no-touch');
        const showCollision = document.getElementById('show-collision-map');
        let recordThePath = false;

        // Pinpoint.
        const pinPointIcon = document.getElementById('open-pinpoint');
        const pinPointContainer = document.querySelector('.pinpoint-container');

        if (pinPointIcon) {
            pinPointIcon.addEventListener('click', () => {
                document.body.style.cursor = 'copy';
                pinPointContainer.classList.add('engage');

                setTimeout(() => {
                    document.addEventListener('click', getMouseCoordinates);
                    document.addEventListener('mousemove', trackMouseCoordinates);
                }, 0);
            });

            function getMouseCoordinates(e) {
                e.stopPropagation();
                const topPinpoint = document.getElementById('top-pinpoint');
                const leftPinpoint = document.getElementById('left-pinpoint');

                topPinpoint.value = mouseY;
                leftPinpoint.value = mouseX;

                pinPointContainer.classList.remove('engage');

                document.removeEventListener('click', getMouseCoordinates);
                document.removeEventListener('mousemove', trackMouseCoordinates);
                document.body.style.cursor = 'default';
            }

            function trackMouseCoordinates(event) {
                const mapRect = document.querySelector('.game-container').getBoundingClientRect();
                window.mouseX = parseInt(event.clientX - mapRect.left);
                window.mouseY = parseInt(event.clientY - mapRect.top);
            }
        }

        window.godMode = false;
        window.noTouch = false;

        if (godMode && noTouch && showCollision) {
            showCollision.addEventListener('change', () => {
                const collisionMap = document.querySelector('.default-map > svg');

                if (showCollision.checked) {
                    collisionMap.style.opacity = '1';
                } else {
                    collisionMap.style.opacity = '0';
                }
            });

            godMode.addEventListener('change', () => {
                if (godMode.checked) {
                    window.godMode = true;
                } else {
                    window.godMode = false;
                }
            });

            noTouch.addEventListener('change', () => {
                if (noTouch.checked) {
                    window.noTouch = true;
                    mainCharacter.style.zIndex = '0';
                } else {
                    window.noTouch = false;
                }
            });
        }

        if (addNewListItems) {
            addNewListItems.forEach(function(item) {
                item.addEventListener('click', () => {
                    const postType = item.dataset.type;

                    item.classList.add('engage');

                    const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/get-new-fields/`;
                    const jsonString = {
                        type: postType,
                    }
                    // Save position of item.
                    fetch(filehref, {
                        method: 'POST', // Specify the HTTP method.
                        headers: {
                            'Content-Type': 'application/json', // Set the content type to JSON.
                        },
                        body: JSON.stringify(jsonString) // The JSON stringified payload.
                    })
                        .then(response => {
                            // Check if the response status is in the range 200-299.
                            if (!response.ok) {
                                throw new Error('Network response was not ok ' + response.statusText);
                            }

                            return response.json();
                        }).then(data => {
                        const addNewFields = document.querySelector('.add-new-fields');

                        if (addNewFields) {
                            addNewFields.innerHTML = data.data;

                            if (typeof initImageUpload === 'function') {
                                initImageUpload();
                                makeNewFormSub();
                            }
                        }
                    });
                })
            })
        }

        if (findItems && findItems.length > 0) {
            findItems.forEach(item => {
                const itemTitle = item.querySelector('.find-title');
                const editButton = item.querySelector('.edit-item-button');
                const showItem = item.querySelector('.show-hide-item');
                const closeButton = item.querySelector('.close-item-button');

                if (editButton && showItem) {
                    const findContainer = editButton.closest('.find-explore-item');
                    const theID = findContainer.id.replace('-f', '');
                    const theNewSizeItem = document.getElementById(theID);

                    showItem.addEventListener('click', e => {
                        if (true === showItem.classList.contains('show')) {
                            theNewSizeItem.style.display = 'none';
                            showItem.textContent = '🫣';
                        } else {
                            theNewSizeItem.style.display = 'block';
                            showItem.textContent = '👁️';
                        }

                        showItem.classList.toggle('show');
                    });


                    editButton.addEventListener('click', e => {
                        if (true !== editButton.classList.contains('created')) {
                            const sizeContainer = document.createElement('div');
                            const heightLabel = document.createElement('label');
                            const heightInput = document.createElement('input');
                            const widthLabel = document.createElement('label');
                            const widthInput = document.createElement('input');
                            const submitSize = document.createElement('button');
                            let definedHeight = theNewSizeItem.style.height;
                            definedHeight = definedHeight ? definedHeight.replace('px', '') : '';
                            let definedWidth = theNewSizeItem.style.width;
                            definedWidth = definedWidth ? definedWidth.replace('px', '') : '';

                            closeButton.style.display = 'block';

                            heightLabel.textContent = 'Height';
                            widthLabel.textContent = 'Width';
                            sizeContainer.classList.add('size-input');
                            heightInput.type = 'number';
                            heightInput.value = definedHeight && '' !== definedHeight ? definedHeight : theNewSizeItem.dataset?.height;
                            widthInput.type = 'number';
                            widthInput.value = definedWidth && '' !== definedWidth ? definedWidth : theNewSizeItem.dataset?.width;
                            submitSize.classList.add('submit-size');
                            submitSize.textContent = 'submit';
                            heightLabel.appendChild(heightInput);
                            widthLabel.appendChild(widthInput);
                            sizeContainer.appendChild(heightLabel);
                            sizeContainer.appendChild(widthLabel);
                            sizeContainer.appendChild(submitSize);

                            if ('explore-character' === item.dataset.posttype || 'explore-enemy' === item.dataset.posttype) {
                                const recordPathLabel = document.createElement('label');
                                const recordPathInput = document.createElement('input');
                                recordPathInput.type = 'checkbox';
                                recordPathLabel.textContent = 'Record Walking Path';
                                recordPathLabel.appendChild(recordPathInput);
                                sizeContainer.appendChild(recordPathLabel);

                                // Start and stop recording walking path.
                                recordPathInput.addEventListener('change', () => {
                                    if (recordPathInput.checked) {
                                        recordThePath = theID;
                                    } else {
                                        recordThePath = false;
                                    }
                                });
                            }

                            item.appendChild(sizeContainer);
                            editButton.classList.add('created');

                            // Submit the new size for the find item.
                            submitSize.addEventListener('click', e => {

                                const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/set-item-size/`;
                                const jsonString = {
                                    height: heightInput.value,
                                    width: widthInput.value,
                                    id: theID,
                                    meta: item.dataset?.meta
                                }
                                // Save position of item.
                                fetch(filehref, {
                                    method: 'POST', // Specify the HTTP method.
                                    headers: {
                                        'Content-Type': 'application/json', // Set the content type to JSON.
                                    },
                                    body: JSON.stringify(jsonString) // The JSON stringified payload.
                                })
                                    .then(response => {
                                        // Check if the response status is in the range 200-299.
                                        if (!response.ok) {
                                            throw new Error('Network response was not ok ' + response.statusText);
                                        } else {
                                            sizeContainer.remove();
                                            editButton.classList.remove('created');
                                            closeButton.style.display = 'none';

                                            if (theNewSizeItem) {
                                                theNewSizeItem.style.height = `${heightInput.value}px`;
                                                theNewSizeItem.style.width = `${widthInput.value}px`;
                                            }
                                        }
                                    });
                            });

                            closeButton.addEventListener('click', e => {
                                sizeContainer.remove();
                                editButton.classList.remove('created');
                                closeButton.style.display = 'none';
                            });
                        }
                    });
                }

                itemTitle.addEventListener('click', (e) => {
                    const theFinderItem = e.target.closest('.find-explore-item');
                    const theItem = document.querySelector('.' + theFinderItem.dataset.class + '[data-genre="' + theFinderItem.dataset.posttype + '"]');
                    const currentSelected = document.querySelector('.map-item.selected');
                    const currentListSelected = document.querySelector('.find-explore-item.selected');

                    if (currentSelected) {
                        currentSelected.classList.remove('selected');
                    }

                    if (currentListSelected) {
                        currentListSelected.classList.remove('selected');
                    }

                    if (theItem) {
                        mainCharacter.style.left = (parseInt(theItem.style.left.replace('px', '')) - 200) + 'px';
                        mainCharacter.style.top = (parseInt(theItem.style.top.replace('px', '')) - 200) + 'px';
                        theItem.scrollIntoView();
                        theItem.classList.add('selected');
                        item.classList.add('selected');
                    }
                })
            })
        }

        if (items && items.length) {

            // Drag logic.
            let draggedContainer = null;
            let offsetX = 0;
            let offsetY = 0;
            let sendItemCoodinateTimeout;

            // Handle the dragstart event
            function handleDragStart(event) {
                clearTimeout(sendItemCoodinateTimeout);
                event.preventDefault();
                draggedContainer = event.target.closest('.map-item'); // Get the container element

                // Remove transition for items that moved.
                draggedContainer.style.transition = '';

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
                    const mapRect = document.querySelector('.game-container').getBoundingClientRect();

                    const mouseX = 'menu' === draggedContainer.dataset.type ? event.clientX : event.clientX - mapRect.left;
                    const mouseY = 'menu' === draggedContainer.dataset.type ? event.clientY : event.clientY - mapRect.top;

                    // Update container position based on mouse position relative to the container
                    draggedContainer.style.left = `${mouseX - offsetX}px`;
                    draggedContainer.style.top = `${mouseY - offsetY}px`;
                }
            }

            // Handle the dragend event
            function handleDragEnd() {
                if (draggedContainer) {
                    sendItemCoodinateTimeout = setTimeout(() => {
                        const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/set-item-position/`;
                        const theID = 'true' === draggedContainer.dataset.trigger ? draggedContainer.id.replace('-t', '') : draggedContainer.id;
                        const jsonString = {
                            top: draggedContainer.style.top.replace('px', ''),
                            left: draggedContainer.style.left.replace('px', ''),
                            height: draggedContainer.style.height.replace('px', ''),
                            width: draggedContainer.style.width.replace('px', ''),
                            id: theID,
                            meta: draggedContainer.dataset?.meta,
                        }

                        if (theID === recordThePath) {
                            jsonString.walkingPath = 'true';
                        }

                        // Save position of item.
                        fetch(filehref, {
                            method: 'POST', // Specify the HTTP method.
                            headers: {
                                'Content-Type': 'application/json', // Set the content type to JSON.
                            },
                            body: JSON.stringify(jsonString) // The JSON stringified payload.
                        })
                            .then(response => {
                                // Check if the response status is in the range 200-299.
                                if (!response.ok) {
                                    throw new Error('Network response was not ok ' + response.statusText);
                                }

                                // draggedContainer.style.border = '4px solid lightblue';
                                // draggedContainer.transition = 'border .3s';
                                //
                                // setTimeout( () => {
                                //     draggedContainer.style.border = 'none';
                                //     draggedContainer.style.transition = '';
                                // }, 500);
                            });

                        // Clear the reference to the dragged container.
                        draggedContainer = null;
                    }, 1000);

                    // Remove mousemove event listener
                    document.removeEventListener('mousemove', handleMouseMove);
                }
            }

            items.forEach(item => {
                item.draggable = true;
                item.addEventListener('dragstart', handleDragStart);
                item.addEventListener('mouseup', handleDragEnd);
            });

            const engageWallBuilder = document.getElementById('engage-wallbuilder');
            const wallBuilderContainer = document.querySelector('.wallbuilder-container');
            const defaultMap = document.querySelector('.default-map');
            let isDragging = false;

            if (engageWallBuilder) {
                engageWallBuilder.addEventListener('click', () => {
                    wallBuilderContainer.classList.toggle('engage');

                    if (wallBuilderContainer.classList.contains('engage')) {
                        document.body.style.cursor = 'cell';

                        document.addEventListener('mousedown', handleWallDragStart);
                    } else {
                        document.body.style.cursor = 'default';
                        document.removeEventListener('mousedown', handleWallDragStart);
                    }
                });

                let offsetX = 0;
                let offsetY = 0;

                // Handle the dragstart event
                function handleWallDragStart(event) {
                    isDragging = true;
                    event.preventDefault();
                    const wallElement = document.createElement('div');
                    wallElement.draggable = true;

                    // Calculate the mouse position relative to the .default-map element
                    const mapRect = document.querySelector('.game-container').getBoundingClientRect();

                    const mouseX = event.clientX - mapRect.left;
                    const mouseY = event.clientY - mapRect.top;

                    // Set the starting position of the wall basedon when you began to drag the mouse.
                    wallElement.className = 'wp-block-group map-item';
                    wallElement.style.left = `${mouseX - offsetX}px`;
                    wallElement.style.top = `${mouseY - offsetY}px`;
                    wallElement.style.backgroundColor = 'rgb(0,146,255)';
                    wallElement.style.opacity = .3;
                    wallElement.style.zIndex = 1;
                    wallElement.dataset.genre = 'explore-wall';

                    defaultMap.appendChild(wallElement);

                    // Handle the mousemove event to update container position
                    function handleWallMouseMove(event) {
                        if (!isDragging) return;

                        if (wallElement) {
                            const mapRect = document.querySelector('.game-container').getBoundingClientRect();

                            const mouseX = event.clientX - mapRect.left;
                            const mouseY = event.clientY - mapRect.top;
                            const wallElementLeft = parseInt(wallElement.style.left.replace('px', ''));
                            const wallElementTop = parseInt(wallElement.style.top.replace('px', ''));

                            wallElement.style.width = (mouseX - wallElementLeft) + 'px';
                            wallElement.style.height = (mouseY - wallElementTop) + 'px';
                        }
                    }

                    // Handle the dragend event
                    function handleWallDragEnd() {
                        isDragging = false;
                        const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/add-new/`;

                        let currentLocation = document.querySelector('.game-container');
                        currentLocation = currentLocation.className.replace('game-container ', '');
                        const topPos = wallElement.style.top.replace('px', '');
                        const leftPos = wallElement.style.left.replace('px', '');
                        const width = wallElement.style.width.replace('px', '');
                        const height = wallElement.style.height.replace('px', '');

                        const jsonString = {
                            type: 'explore-wall',
                            area: currentLocation ?? '',
                            values: {
                                'title': 'wall-' + currentLocation + '-' + topPos + '-' + leftPos,
                                'explore-width': width,
                                'explore-height': height,
                                'explore-top': topPos,
                                'explore-left': leftPos,
                            },
                        }
                        // Save position of item.
                        fetch(filehref, {
                            method: 'POST', // Specify the HTTP method.
                            headers: {
                                'Content-Type': 'application/json', // Set the content type to JSON.
                            },
                            body: JSON.stringify(jsonString) // The JSON stringified payload.
                        })
                            .then(response => {
                                // Check if the response status is in the range 200-299.
                                if (!response.ok) {
                                    throw new Error('Network response was not ok ' + response.statusText);
                                }

                                return response.json();
                            })
                            .then(data => {
                                wallElement.id = data.data;
                                wallElement.className = wallElement.className + ' wall-' + currentLocation + '-' + topPos.toString().replace('.', '-') + '-' + leftPos.toString().replace('.', '-') + '-map-item is-layout-flow wp-block-group-is-layout-flow';
                                wallElement.dataset.width = width;
                                wallElement.dataset.height = height;

                                wallElement.addEventListener('dragstart', handleDragStart);
                                wallElement.addEventListener('mouseup', handleDragEnd);
                            });
                        document.removeEventListener('mousemove', handleWallMouseMove);
                        document.removeEventListener('mouseup', handleWallDragEnd);
                    }

                    // Add mousemove event listener to update container position
                    document.addEventListener('mousemove', handleWallMouseMove);
                    document.addEventListener('mouseup', handleWallDragEnd);
                }
            }
        }
    }, 2500);

    // Open close item list.
    const exploreItemList = document.querySelector('.explore-item-list');

    if (exploreItemList) {
        const openClose = document.querySelector('.open-close-item-list');

        if (openClose) {
            openClose.addEventListener('click', event => {
                exploreItemList.classList.toggle('engage');
            });
        }
    }
}
document.addEventListener("DOMContentLoaded", function() {
    engageDevMode();
} );

function makeNewFormSub() {
    const submitNewItem = document.getElementById('add-new-form');

    if ( submitNewItem ) {
        submitNewItem.addEventListener('submit', function (e) {
            e.preventDefault();

            const formData = new FormData(submitNewItem);
            const values = parseFormDataToNestedObject(formData);
            const filehref = `https://${wpThemeURL}/wp-json/orbemorder/v1/add-new/`;
            const selectedPostType = document.querySelector('#add-new-list li.engage' );
            let postType = '';

            if (selectedPostType) {
                postType = selectedPostType.dataset.type;
            }

            let currentLocation = document.querySelector( '.game-container' );
            currentLocation = currentLocation.className.replace( 'game-container ', '');


            const jsonString = {
                type: postType,
                area: currentLocation ?? '',
                values,
            }
            // Save position of item.
            fetch(filehref, {
                method: 'POST', // Specify the HTTP method.
                headers: {
                    'Content-Type': 'application/json', // Set the content type to JSON.
                },
                body: JSON.stringify(jsonString) // The JSON stringified payload.
            })
            .then(response => {
                // Check if the response status is in the range 200-299.
                if (!response.ok) {
                    throw new Error('Network response was not ok ' + response.statusText);
                } else {
                    window.location.reload();
                }
            });
        });
    }
}

function parseFormDataToNestedObject(formData) {
    const entries = Object.fromEntries(formData.entries());
    const result = {};

    for (const [key, value] of Object.entries(entries)) {
        const path = key
            .replace(/\]/g, '')
            .split('[');

        let current = result;
        while (path.length > 1) {
            const segment = path.shift();
            if (!(segment in current)) current[segment] = {};
            current = current[segment];
        }
        current[path[0]] = value;
    }

    return result;
}
