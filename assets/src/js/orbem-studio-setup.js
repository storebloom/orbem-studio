document.addEventListener('DOMContentLoaded', function () {
    "use strict";

	const tutorialStep = document.querySelector(
		'.tutorial-step[data-step="3"]'
	);
    const starterTutorial = document.querySelector('.tutorial-step[data-step="0"]');

    if (starterTutorial && true === starterTutorial.classList.contains('engage')) {
        const generateButton = starterTutorial.querySelector('#generate-starter-game');
        const manualButton = starterTutorial.querySelector('#start-manual-setup');

        if (manualButton) {
            manualButton.addEventListener('click', function () {
                chooseSetupType('manual');
            });
        }

        if (generateButton) {
            generateButton.addEventListener('click', function () {
                chooseSetupType('generate');
            });
        }
    }

    const pageGenerate = document.querySelector('#generate-game-page');

    if (pageGenerate) {
        pageGenerate.addEventListener('click', function () {
            chooseSetupType('page');
        });
    }

	if (tutorialStep && true === tutorialStep.classList.contains('engage')) {
		const pageSelectOption = document.querySelector('.form-table tbody tr');
		const areaSelectOption = document.querySelector(
			'.form-table tbody tr:nth-of-type(2)'
		);
		const characterSelectOption = document.querySelector(
			'.form-table tbody tr:nth-of-type(3)'
		);
		const tutorialStep4 = document.querySelector(
			'.tutorial-step[data-step="4"]'
		);
		const tutorialStep5 = document.querySelector(
			'.tutorial-step[data-step="5"]'
		);
		const tutorialStep6 = document.querySelector(
			'.tutorial-step[data-step="6"]'
		);

		if (pageSelectOption) {
			pageSelectOption.classList.add('engage');

			const pageSelectSelect = pageSelectOption.querySelector('select');

			if (pageSelectSelect) {
				pageSelectSelect.addEventListener('change', () => {
					pageSelectOption.classList.remove('engage');
					areaSelectOption.classList.add('engage');
					areaSelectOption.scrollIntoView({
						behavior: 'instant',
						block: 'center',
						inline: 'center',
					});

					if (tutorialStep4) {
						tutorialStep.classList.remove('engage');
						tutorialStep4.classList.add('engage');
					}
				});
			}

			if (areaSelectOption) {
				areaSelectOption.addEventListener('change', () => {
					areaSelectOption.classList.remove('engage');
					characterSelectOption.classList.add('engage');
					characterSelectOption.scrollIntoView({
						behavior: 'instant',
						block: 'center',
						inline: 'center',
					});

					if (tutorialStep5) {
						tutorialStep4.classList.remove('engage');
						tutorialStep5.classList.add('engage');
					}
				});
			}

			if (characterSelectOption) {
				characterSelectOption.addEventListener('change', () => {
					characterSelectOption.classList.remove('engage');
					scrollTo(0, 80000);

					if (tutorialStep6) {
						tutorialStep5.classList.remove('engage');
						tutorialStep6.classList.add('engage');
					}
				});
			}
		}
	}

    /**
     * Choose which type of wizard setup to use.
     * @param type
     */
    function chooseSetupType(type)
    {
        const filehref = `${OrbemOrder.siteRESTURL}/choose-setup-type/`;
        const jsonString = {
            type,
        };

        if ('generate' === type) {
            const generateLoadWrap = document.querySelector('.game-generating');
            const generateLoader = document.querySelector('.game-generating-load');
            const generateTitle = document.querySelector('.generate-title');
            const chooseSetupButtons = document.querySelector('.choose-setup-type-buttons');

            if (generateLoadWrap) {
                generateLoadWrap.classList.add('engage');
                generateLoader.classList.add('engage');
                generateTitle.style.display = 'none';
                chooseSetupButtons.style.display = 'none';
            }
        }

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

                if ('manual' === type) {
                    starterTutorial.classList.remove('engage');
                    starterTutorial.nextElementSibling.classList.add('engage');
                }

                if ('generate' === type) {
                    const generateLoader = document.querySelector('.game-generating-load');
                    const generateMessage = document.querySelector('.game-generating-finished');

                    if (generateMessage && generateLoader) {
                        generateLoader.classList.remove('engage');
                        generateMessage.classList.add('engage');

                        setTimeout( () => {
                            window.location.reload();
                        }, 2000);
                    }
                }

                if ('page' === type) {
                    return response.json();
                }
            }).then((data) => {
                window.location.href = data.data;
        });
    }
});
