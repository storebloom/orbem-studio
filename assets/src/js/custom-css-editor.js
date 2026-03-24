(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        // Ensure WP CodeMirror exists
        if (
            typeof window.wp === 'undefined' ||
            typeof window.wp.codeEditor === 'undefined' ||
            typeof window.orbemCustomCssEditor === 'undefined'
        ) {
            return;
        }

        const selector =
            orbemCustomCssEditor.selector || '#explore_custom_css';

        const textarea = document.querySelector(selector);

        if (!textarea) {
            return;
        }

        const settings = orbemCustomCssEditor.settings || {};

        // Ensure CSS mode + UX enhancements
        if (settings.codemirror) {
            settings.codemirror.mode = 'css';
            settings.codemirror.lineNumbers = true;
            settings.codemirror.lineWrapping = true;
            settings.codemirror.matchBrackets = true;
            settings.codemirror.autoCloseBrackets = true;
            settings.codemirror.styleActiveLine = true;
        }

        // Enable linting if available
        if (settings.csslint) {
            settings.lint = true;
        }

        // Initialize CodeMirror
        window.wp.codeEditor.initialize(textarea, settings);
    });
})();