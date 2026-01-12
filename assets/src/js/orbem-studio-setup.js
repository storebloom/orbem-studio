document.addEventListener( 'DOMContentLoaded', function () {
	const tutorialStep = document.querySelector(
		'.tutorial-step[data-step="3"]'
	);

	if (
		tutorialStep &&
		true === tutorialStep.classList.contains( 'engage' )
	) {
		const pageSelectOption = document.querySelector(
			'.form-table tbody tr'
		);
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

		if ( pageSelectOption ) {
			pageSelectOption.classList.add( 'engage' );

			const pageSelectSelect = pageSelectOption.querySelector( 'select' );

			if ( pageSelectSelect ) {
				pageSelectSelect.addEventListener( 'change', () => {
					pageSelectOption.classList.remove( 'engage' );
					areaSelectOption.classList.add( 'engage' );
					areaSelectOption.scrollIntoView( {
						behavior: 'instant',
						block: 'center',
						inline: 'center',
					} );

					if ( tutorialStep4 ) {
						tutorialStep.classList.remove( 'engage' );
						tutorialStep4.classList.add( 'engage' );
					}
				} );
			}

			if ( areaSelectOption ) {
				areaSelectOption.addEventListener( 'change', () => {
					areaSelectOption.classList.remove( 'engage' );
					characterSelectOption.classList.add( 'engage' );
					characterSelectOption.scrollIntoView( {
						behavior: 'instant',
						block: 'center',
						inline: 'center',
					} );

					if ( tutorialStep5 ) {
						tutorialStep4.classList.remove( 'engage' );
						tutorialStep5.classList.add( 'engage' );
					}
				} );
			}

			if ( characterSelectOption ) {
				characterSelectOption.addEventListener( 'change', () => {
					characterSelectOption.classList.remove( 'engage' );
					scrollTo( 0, 80000 );

					if ( tutorialStep6 ) {
						tutorialStep5.classList.remove( 'engage' );
						tutorialStep6.classList.add( 'engage' );
					}
				} );
			}
		}
	}
} );
