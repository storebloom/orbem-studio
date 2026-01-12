import '../sass/admin.scss';

document.addEventListener('DOMContentLoaded', function () {
	'use strict';

	// Repeater field functionality.
	const repeaterContainers = document.querySelectorAll('.repeater-container');

	if (repeaterContainers) {
		repeaterContainers.forEach((repeaterContainer) => {
			const containerWrap = repeaterContainer.querySelector(
				'.field-container-wrap'
			);
			const addField = repeaterContainer.querySelector('.add-field');
			const removeFields =
				containerWrap.querySelectorAll('.remove-field');

			// Remove field.
			if (removeFields) {
				removeFields.forEach((removingField) => {
					removeField(removingField, repeaterContainer);
				});
			}

			// Add new field.
			if (addField) {
				addField.addEventListener('click', () => {
					const fieldContainers =
						repeaterContainer.querySelectorAll('.field-container');
					const newField = fieldContainers[0].cloneNode(true);
					const newFields = newField.querySelectorAll('[name]');
					const fieldIndex = fieldContainers.length;

					if (newFields) {
						newFields.forEach((newFielder) => {
							newFielder.name = newFielder.name.replaceAll(
								'0',
								fieldIndex
							);
							newFielder.id = newFielder.id.replaceAll(
								'0',
								fieldIndex
							);
						});
					}

					newField.querySelector('.container-index').textContent =
						fieldIndex;
					containerWrap.appendChild(newField);
					const newestRemove =
						newField.querySelector('.remove-field');

					// For upload fields.
					const uploadImageButton = newField.querySelector(
						'.upload_image_button'
					);
					const removeImageButton = newField.querySelector(
						'.remove_image_button'
					);

					if (uploadImageButton && removeImageButton) {
						window.initExploreUploadButton(uploadImageButton);
						window.initExploreRemoveButton(removeImageButton);
					}

					removeField(newestRemove, repeaterContainer);
				});
			}
		});
	}

	function removeField(removeField, repeaterContainer) {
		const fieldContainers =
			repeaterContainer.querySelectorAll('.field-container');

		removeField.addEventListener('click', () => {
			const closestContainer = removeField.closest('.field-container');

			// Remove.
			closestContainer.remove();

			if (closestContainer) {
				// Reset Indexes.
				const fieldContainersNew =
					repeaterContainer.querySelectorAll('.field-container');

				if (fieldContainers) {
					fieldContainersNew.forEach((fieldContainer, index) => {
						const fcInputs =
							fieldContainer.querySelectorAll('input');
						const containerIndex =
							fieldContainer.querySelector('.container-index');
						const oldIndex = containerIndex.textContent;

						if (containerIndex) {
							containerIndex.textContent = index;
						}

						fcInputs.forEach((fcInput) => {
							const firstInputName = fcInput.id.replace(
								oldIndex,
								index
							);
							fcInput.setAttribute('data-index', index);
							fcInput.id = firstInputName;
							fcInput.setAttribute('name', firstInputName);
						});
					});
				}
			}
		});
	}

	const colorFields = document.querySelectorAll('.explore-color-field');

	if (colorFields) {
		colorFields.forEach((field) => {
			jQuery(field).iris({
				// jQuery required one time or else I have to build a color picker.
				defaultColor: field.dataset.defaultColor,
				change(event, ui) {
					field.value = ui.color.toString();
				},
			});

			// Hide Iris UI until user clicks the input
			const irisContainer =
				field.parentNode.querySelector('.iris-picker');
			irisContainer.style.display = 'none';

			field.addEventListener('focus', () => {
				irisContainer.style.display = 'block';
			});

			document.addEventListener('click', (e) => {
				if (
					!field.contains(e.target) &&
					!irisContainer.contains(e.target)
				) {
					irisContainer.style.display = 'none';
				}
			});
		});
	}

	// Collapse logic for extra fields.
	const metaGroups = document.querySelectorAll('.grouped-meta-data');

	if (0 < metaGroups.length) {
		metaGroups.forEach((metaGroup) => {
			const isRequired = metaGroup.querySelector('[required]');

			if (!isRequired) {
				metaGroup.classList.add('not-required-group');
				const accordionButton = metaGroup.querySelector('h2');

				if (accordionButton) {
					accordionButton.addEventListener('click', () => {
						metaGroup.classList.toggle('engage');
					});
				}
			}
		});
	}
});
