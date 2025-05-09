import { initImageUpload } from './image-upload';
document.addEventListener("DOMContentLoaded", function() {
    const items = document.querySelectorAll('.map-item');
    const triggers = document.querySelectorAll('[data-trigger="true"], [data-genre="explore-area"], .map-cutscene');
    const findItems = document.querySelectorAll('.find-explore-item');
    const mainCharacter = document.getElementById('map-character');
    const addNewListItems = document.querySelectorAll('#add-new-list li');
    const godMode = document.getElementById( 'god-mode' );
    const noTouch = document.getElementById( 'no-touch' );

    window.godMode = false;
    window.noTouch = false;

    if ( godMode && noTouch ) {
        godMode.addEventListener('change', () => {
            if ( godMode.checked ) {
                window.godMode = true;
            } else {
                window.godMode = false;
            }
        });

        noTouch.addEventListener('change', () => {
            if ( noTouch.checked ) {
                window.noTouch = true;
            } else {
                window.noTouch = false;
            }
        });
    }

    if ( addNewListItems ) {
        addNewListItems.forEach(function (item) {
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

                        if ( addNewFields ) {
                            addNewFields.innerHTML = data.data;

                            if ( typeof initImageUpload === 'function' ) {
                                initImageUpload();
                                makeNewFormSub();
                            }
                        }
                });
            })
        })
    }

    if ( findItems && findItems.length > 0 ) {
        findItems.forEach( item => {
            const itemTitle = item.querySelector('.find-title');
            const editButton = item.querySelector('.edit-item-button');
            const closeButton = item.querySelector('.close-item-button');

            if (editButton) {
                const findContainer = editButton.closest('.find-explore-item');
                const theID = findContainer.id.replace('-f', '');
                const theNewSizeItem = document.getElementById(theID);

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
                        item.appendChild(sizeContainer);
                        editButton.classList.add('created');

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

                                        if ( theNewSizeItem ) {
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
                const theItem = document.querySelector('.' + e.target.closest('.find-explore-item').dataset.class);
                const currentSelected = document.querySelector( '.map-item.selected');
                const currentListSelected = document.querySelector('.find-explore-item.selected');

                if ( currentSelected ) {
                    currentSelected.classList.remove( 'selected' );
                }

                if ( currentListSelected ) {
                    currentListSelected.classList.remove( 'selected' );
                }

                if ( theItem ) {
                    mainCharacter.style.left = (parseInt(theItem.style.left.replace('px', '')) - 200) + 'px';
                    mainCharacter.style.top = (parseInt(theItem.style.top.replace('px', '')) - 200) + 'px';
                    theItem.scrollIntoView();
                    theItem.classList.add('selected');
                    item.classList.add('selected');
                }
            })
        })
    }

    if ( items && items.length ) {

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
                const mapRect = document.querySelector( '.game-container' ).getBoundingClientRect();
                const mouseX = event.clientX - mapRect.left;
                const mouseY = event.clientY - mapRect.top;

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
                        });

                    // Clear the reference to the dragged container.
                    draggedContainer = null;
                }, 1000);

                // Remove mousemove event listener
                document.removeEventListener('mousemove', handleMouseMove);
            }
        }

        items.forEach( item => {
            item.draggable = true;
            item.addEventListener('dragstart', handleDragStart);
            item.addEventListener('mouseup', handleDragEnd);
        });
    }

    if ( triggers ) {
        triggers.forEach( trigger => {
            trigger.style.backgroundColor = 'rgba(0,146,255,0.31)';
        });
    }
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