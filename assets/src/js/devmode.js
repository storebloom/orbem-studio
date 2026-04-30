/* global OrbemOrder */

import { initImageUpload } from './image-upload';
import { enterExplorePoint, engageExploreGame } from './explore';

export function engageDevMode() {
	'use strict';

	let recordThePath = false;

	window.devmode = false;
    window.devZoom = window?.devZoom ?? 1;

	// Drag logic.
	let draggedContainer = null;
	let offsetX = 0;
	let offsetY = 0;
	let sendItemCoodinateTimeout;

	// Handle the dragstart event
	function handleDragStart(event) {
		clearTimeout(sendItemCoodinateTimeout);
		event.preventDefault();
		draggedContainer = event.target.closest('.map-item, .enemy-item'); // Get the container element

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
			const mapRect = document
				.querySelector('.game-container')
				.getBoundingClientRect();

			const mouseX =
				'menu' === draggedContainer.dataset.type
					? event.clientX
					: event.clientX - mapRect.left;
			const mouseY =
				'menu' === draggedContainer.dataset.type
					? event.clientY
					: event.clientY - mapRect.top;

			// Update container position based on mouse position relative to the container
			draggedContainer.style.left = `${mouseX / window.devZoom - offsetX}px`;
			draggedContainer.style.top = `${mouseY / window.devZoom - offsetY}px`;
		}
	}

	// Handle the dragend event
	function handleDragEnd() {
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
							'Network response was not ok ' + response.statusText
						);
					}
				});

				// Clear the reference to the dragged container.
				draggedContainer = null;
			}, 1000);

			// Remove mousemove event listener
			document.removeEventListener('mousemove', handleMouseMove);
		}
	}

	// Settings.
	const settingCog = document.querySelector('#new-addition');

	if (settingCog) {
		settingCog.addEventListener('click', (e) => {
			if (
				false === e.target.classList.contains('close-settings') &&
				false ===
					e.target.parentNode.classList.contains('character-item')
			) {
				settingCog.classList.add('engage');
			}
		});

		settingCog
			.querySelector('.close-settings')
			.addEventListener('click', () => {
				const description = document.querySelector(
					'.retrieval-points #item-description'
				);
				settingCog.classList.remove('engage');

				if (description) {
					description.innerHTML = '';
				}
			});
	}

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
			const devModeMenu = document.querySelector('.dev-mode-menu');

			if (devModeMenu) {
				devModeMenu.classList.toggle('engage');
				devmodeMenuToggle.classList.toggle('engage');
				const triggers = document.querySelectorAll(
					'.explainer-container, .materialize-item-trigger, [data-genre="explore-wall"], [data-trigger="true"], [data-genre="explore-area"], [data-genre="blockade"]'
				);

				if (devModeMenu.classList.contains('engage')) {
					if (triggers) {
						triggers.forEach((trigger) => {
                            if ('true' === trigger.dataset?.trigger) {
                                trigger.style.backgroundColor = 'rgb(27,170,0)';
                            }

                            if (true === trigger.classList.contains('materialize-item-trigger')) {
                                trigger.style.backgroundColor = 'rgb(0,146,255)';
                            }

                            if (true === trigger.classList.contains('explainer-container')) {
                                trigger.style.backgroundColor = 'rgb(170,0,255)';
                            }

                            if (true === trigger.classList.contains('cutscene-trigger')) {
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
					triggers.forEach((trigger) => {
						trigger.style.backgroundColor = '';
						trigger.style.opacity = '';
					});
				}
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
						trackMouseCoordinates
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

		if (items && items.length) {
			items.forEach((item) => {
				item.draggable = true;
				item.addEventListener('dragstart', handleDragStart);
				item.addEventListener('mouseup', handleDragEnd);
			});
		}

		const engageWallBuilder = document.getElementById('engage-wallbuilder');
		const wallBuilderContainer = document.querySelector(
			'.wallbuilder-container'
		);
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
					document.removeEventListener(
						'mousedown',
						handleWallDragStart
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

				// Calculate the mouse position relative to the .default-map element
				const mapRect = document
					.querySelector('.game-container')
					.getBoundingClientRect();

				const mouseX = (event.clientX - mapRect.left) / window.devZoom;
				const mouseY = (event.clientY - mapRect.top) / window.devZoom;

				// Set the starting position of the wall basedon when you began to drag the mouse.
				wallElement.className = 'wp-block-group map-item';
				wallElement.style.left = `${mouseX - offsetX}px`;
				wallElement.style.top = `${mouseY - offsetY}px`;
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
						const mapRect = document
							.querySelector('.game-container')
							.getBoundingClientRect();

						const mouseX = (event.clientX - mapRect.left) / window.devZoom;
						const mouseY = (event.clientY - mapRect.top) / window.devZoom;
						const wallElementLeft = parseFloat(
							wallElement.style.left.replace('px', '')
						);
						const wallElementTop = parseFloat(
							wallElement.style.top.replace('px', '')
						);

						wallElement.style.width =
							mouseX - wallElementLeft + 'px';
						wallElement.style.height =
							mouseY - wallElementTop + 'px';
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
						''
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
											response.statusText
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
									'dragstart',
									handleDragStart
								);
								wallElement.addEventListener(
									'mouseup',
									handleDragEnd
								);
							});
					} else {
						wallElement.addEventListener(
							'dragstart',
							handleDragStart
						);
						wallElement.addEventListener('mouseup', handleDragEnd);
					}
					document.removeEventListener(
						'mousemove',
						handleWallMouseMove
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

    const devMode = document.querySelector('main[data-devmode=true]');

    if ( devMode ) {
        engageDevMode();
    }
});
