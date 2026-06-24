document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // Explainer post type: explore-top and explore-left are only required for
    // map / menu explainers. Fullscreen explainers are centered overlays and
    // don't use top/left positioning.
    function syncExplainerTypeRequired() {
        const typeRadios = document.querySelectorAll(
            'input[name="explore-explainer-type"]'
        );
        if (0 === typeRadios.length) return;

        const checked = document.querySelector(
            'input[name="explore-explainer-type"]:checked'
        );
        const isFullscreen = checked && 'fullscreen' === checked.value;

        ['explore-top', 'explore-left'].forEach(function (fieldName) {
            const input = document.querySelector(
                'input[name="' + fieldName + '"]'
            );
            if (!input) return;

            if (isFullscreen) {
                input.removeAttribute('required');
                input.classList.remove('orbem-studio-error');
            } else {
                input.setAttribute('required', '');
            }

            // Walk up to the wrapper, then back to the field's H3 label so
            // we can show/hide the required asterisk too.
            let el = input.closest('p');
            while (el && 'H3' !== el.tagName) {
                el = el.previousElementSibling;
            }
            if (el) {
                const sup = el.querySelector('sup');
                if (sup) sup.style.display = isFullscreen ? 'none' : '';
            }
        });
    }

    syncExplainerTypeRequired();

    document.addEventListener('change', function (e) {
        if (e.target && 'explore-explainer-type' === e.target.name) {
            syncExplainerTypeRequired();
        }
    });

    // Required field check.
    const publishButtons = document.querySelectorAll(
        '#publish, .editor-post-publish-button, .editor-post-update-button'
    );

    if (0 < publishButtons.length) {
        function isFieldInvalid(field) {
            if (field.disabled || field.offsetParent === null) {
                return false;
            }

            const tag = field.tagName.toLowerCase();
            const value = field.value;

            if (tag === 'select') {
                return !value || value === 'none';
            }

            if (tag === 'input' || tag === 'textarea') {
                return !value || value === 0 || value === '' || value === '0';
            }

            return false;
        }

        function validateRequiredFields(event) {
            const requiredFields = document.querySelectorAll('[required]');
            let firstInvalid = null;
            let hasErrors = false;

            // Clear previous errors
            if (requiredFields) {
                requiredFields.forEach((requiredField) => {
                    requiredField.classList.remove('orbem-studio-error');
                });

                requiredFields.forEach((requiredField) => {
                    const field = requiredField;

                    if (isFieldInvalid(field)) {
                        field.classList.add('orbem-studio-error');

                        if (!firstInvalid) {
                            firstInvalid = field;
                        }

                        hasErrors = true;
                    }
                });
            }

            if (hasErrors) {
                event.preventDefault();
                event.stopPropagation();

                alert(
                    'There is one or more required fields that need attending to.'
                );

                if (firstInvalid) {
                    firstInvalid.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                    });
                    firstInvalid.focus();
                }

                return false;
            }

            return true;
        }

        for (let k = 0; k < publishButtons.length; k++) {
            publishButtons[k].addEventListener('click', validateRequiredFields);
        }
    }

    if (!window.wp || !wp.data || !wp.data.dispatch) return;

    const LOCK_KEY = 'orbem-required-fields';
    let isLocked = false; // track whether Gutenberg saving is currently locked

    const isGuteFieldInvalid = (field) => {
        if (field.disabled || field.offsetParent === null) return false;

        const tag = field.tagName.toLowerCase();
        const value = field.value;

        if (tag === 'select') return !value || value === 'none';
        if (tag === 'input' || tag === 'textarea') return !value || value === 0 || value === '' || value === '0';
        return false;
    };

    const checkRequiredFields = () => {
        const requiredFields = document.querySelectorAll('[required]');
        let hasErrors = false;

        requiredFields.forEach(field => {
            field.classList.remove('orbem-studio-error');
            if (isGuteFieldInvalid(field)) {
                field.classList.add('orbem-studio-error');
                hasErrors = true;
            }
        });

        const dispatcher = wp.data.dispatch('core/editor');

        // Only call lock/unlock if state actually changes
        if (hasErrors && !isLocked) {
            dispatcher.lockPostSaving(LOCK_KEY);
            isLocked = true;
        } else if (!hasErrors && isLocked) {
            dispatcher.unlockPostSaving(LOCK_KEY);
            isLocked = false;
        }
    };

    // Initial check on page load
    checkRequiredFields();

    // Subscribe to Gutenberg changes safely
    wp.data.subscribe(() => {
        // Use a timeout to prevent recursive synchronous updates
        setTimeout(checkRequiredFields, 0);
    });

    // Optional: alert and scroll on actual Publish/Update click
    document.addEventListener('click', (e) => {
        const publishBtn = e.target.closest('.editor-post-publish-button, .editor-post-update-button');
        if (!publishBtn) return;

        const requiredFields = document.querySelectorAll('[required]');
        let firstInvalid = null;
        let hasErrors = false;

        requiredFields.forEach(field => {
            field.classList.remove('orbem-studio-error');
            if (isGuteFieldInvalid(field)) {
                field.classList.add('orbem-studio-error');
                if (!firstInvalid) firstInvalid = field;
                hasErrors = true;
            }
        });

        if (hasErrors) {
            e.preventDefault();
            e.stopPropagation();

            alert('There is one or more required fields that need attending to.');

            if (firstInvalid) {
                firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
                firstInvalid.focus();
            }
        }
    });
} );