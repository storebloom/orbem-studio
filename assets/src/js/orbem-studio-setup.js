document.addEventListener("DOMContentLoaded", function(){
    const tutorialStep = document.querySelector( '.tutorial-step[data-step="4"]' );

    if ( tutorialStep && true === tutorialStep.classList.contains( 'engage' ) ) {
        const pageSelectOption = document.querySelector( '.form-table tbody tr');
        const areaSelectOption = document.querySelector( '.form-table tbody tr:nth-of-type(2)' );
        const characterSelectOption = document.querySelector( '.form-table tbody tr:nth-of-type(3)' );
        const weaponSelectOption = document.querySelector( '.form-table tbody tr:nth-of-type(4)' );
        const tutorialStep5 = document.querySelector( '.tutorial-step[data-step="5"]' );
        const tutorialStep6 = document.querySelector( '.tutorial-step[data-step="6"]' );
        const tutorialStep7 = document.querySelector( '.tutorial-step[data-step="7"]' );
        const tutorialStep8 = document.querySelector( '.tutorial-step[data-step="8"]' );

        if ( pageSelectOption ) {
            pageSelectOption.classList.add('engage');

            const pageSelectSelect = pageSelectOption.querySelector( 'select' );

            if ( pageSelectSelect ) {
                pageSelectSelect.addEventListener('change', e => {
                    pageSelectOption.classList.remove('engage');
                    areaSelectOption.classList.add( 'engage' );
                    areaSelectOption.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });

                    if ( tutorialStep5 ) {
                        tutorialStep.classList.remove('engage');
                        tutorialStep5.classList.add( 'engage' );
                    }
                });
            }

            if ( areaSelectOption ) {
                areaSelectOption.addEventListener('change', e => {
                    areaSelectOption.classList.remove('engage');
                    characterSelectOption.classList.add( 'engage' );
                    characterSelectOption.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });

                    if ( tutorialStep6 ) {
                        tutorialStep5.classList.remove('engage');
                        tutorialStep6.classList.add( 'engage' );
                    }
                });
            }

            if ( characterSelectOption ) {
                characterSelectOption.addEventListener('change', e => {
                    characterSelectOption.classList.remove('engage');
                    weaponSelectOption.classList.add( 'engage' );
                    weaponSelectOption.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });

                    if ( tutorialStep7 ) {
                        tutorialStep6.classList.remove('engage');
                        tutorialStep7.classList.add( 'engage' );
                    }
                });
            }

            if ( weaponSelectOption ) {
                weaponSelectOption.addEventListener('change', e => {
                    weaponSelectOption.classList.remove('engage');
                    scrollTo(0, 80000);

                    if ( tutorialStep8 ) {
                        tutorialStep7.classList.remove('engage');
                        tutorialStep8.classList.add( 'engage' );
                    }
                });
            }
        }
    }
} );