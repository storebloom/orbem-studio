/**
 * Free camera: let go of the character and look around the map.
 *
 * @package OrbemStudio
 */

/* eslint-disable no-console */

/** What a press on means "move this", not "move the map". */
const DRAGGABLE = '.default-map .map-item, .default-map .enemy-item, #map-character .map-character-icon.engage, '
    + '.item-resize-handle, .item-rotate-handle, [data-genre="explore-wall"]';

/** How far a pointer must travel before a click becomes a drag. */
const DRAG_THRESHOLD = 4;

/** Pixels per arrow-key press, and per wheel notch when the browser sends lines. */
const KEY_STEP = 120;
const LINE_HEIGHT = 16;

/** Keys that pan, mapped to their direction. */
const PAN_KEYS = {
    ArrowUp: [0, -1],
    ArrowDown: [0, 1],
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    w: [0, -1],
    s: [0, 1],
    a: [-1, 0],
    d: [1, 0],
};

const state = {
    active: false,
    dragging: false,
    moved: false,
    startX: 0,
    startY: 0,
    startLeft: 0,
    startTop: 0,
    // What allowMovement was before we suspended it, so leaving free camera does not hand movement back to a player the game had deliberately frozen — mid-cutscene, say.
    previousAllowMovement: null,
};

/**
 * The thing that scrolls for one axis.
 *
 * @param {'x'|'y'} axis
 */
function portFor(axis) {
    const container = document.querySelector('.game-container');

    if (!container) {
        return null;
    }

    let el = container.parentElement;

    while (el && el !== document.body && el !== document.documentElement) {
        const overflows = 'x' === axis
            ? el.scrollWidth > el.clientWidth
            : el.scrollHeight > el.clientHeight;

        if (overflows) {
            return el;
        }

        el = el.parentElement;
    }

    return window;
}

/** Reading and writing the camera, one axis at a time, without the caller having to know whether it landed on an element or the window. */
const camera = {
    get x() {
        const port = portFor('x');

        return port === window ? window.scrollX : (port?.scrollLeft ?? 0);
    },

    set x(value) {
        const port = portFor('x');

        if (port === window) {
            window.scrollTo(value, window.scrollY);
        } else if (port) {
            port.scrollLeft = value;
        }
    },

    get y() {
        const port = portFor('y');

        return port === window ? window.scrollY : (port?.scrollTop ?? 0);
    },

    set y(value) {
        const port = portFor('y');

        if (port === window) {
            window.scrollTo(window.scrollX, value);
        } else if (port) {
            port.scrollTop = value;
        }
    },
};

/** Whether there is anywhere to point the camera yet. */
function cameraReady() {
    return !!document.querySelector('.game-container');
}

/** Whether this visitor may take the camera at all. */
function isBuilder() {
    return !!document.querySelector('[data-freecamera="true"]');
}

export function isFreeCameraActive() {
    return state.active;
}

/** Point the camera at something, unless the player has taken the camera. */
export function centerCamera(el, options) {
    if (state.active || !el) {
        return;
    }

    el.scrollIntoView(options);
}

// Panning

function panBy(dx, dy) {
    if (!cameraReady()) {
        return;
    }

    // Each port clamps to its own bounds, so the map edge is the camera's limit and there is nothing to check here.
    camera.x += dx;
    camera.y += dy;
}

function onPointerDown(e) {
    // Left button only, and never on a control.
    if (!state.active || (e.pointerType === 'mouse' && e.button !== 0)) {
        return;
    }

    // Not every pointer target is an element — it can be the document itself, which has no closest().
    const target = e.target instanceof Element ? e.target : null;

    if (target?.closest('button, a, input, select, textarea, [role="button"]')) {
        return;
    }

    // Nor on something on the map.
    if (target?.closest(DRAGGABLE)) {
        return;
    }

    if (!cameraReady()) {
        return;
    }

    state.dragging = true;
    state.moved = false;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.startLeft = camera.x;
    state.startTop = camera.y;

    document.body.classList.add('orbem-free-camera-dragging');
}

function onPointerMove(e) {
    if (!state.dragging) {
        return;
    }

    const dx = e.clientX - state.startX;
    const dy = e.clientY - state.startY;

    if (!state.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
        return;
    }

    state.moved = true;

    // Dragging the map moves it with the pointer, so the camera goes the other way.
    camera.x = state.startLeft - dx;
    camera.y = state.startTop - dy;

    e.preventDefault();
}

function onPointerUp(e) {
    if (!state.dragging) {
        return;
    }

    state.dragging = false;
    document.body.classList.remove('orbem-free-camera-dragging');

    // A drag that ended on something clickable must not also click it.
    if (state.moved) {
        const swallow = (ev) => {
            ev.stopPropagation();
            ev.preventDefault();
        };

        window.addEventListener('click', swallow, { capture: true, once: true });

        // If no click follows — a drag ending on empty map.
        setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
    }

    state.moved = false;
    e.preventDefault();
}

function onWheel(e) {
    if (!state.active) {
        return;
    }

    const scale = e.deltaMode === 1 ? LINE_HEIGHT : 1;

    panBy(e.deltaX * scale, e.deltaY * scale);
    e.preventDefault();
}

function onKeyDown(e) {
    if (!state.active) {
        return;
    }

    if (e.key === 'Escape') {
        disable();
        return;
    }

    const direction = PAN_KEYS[e.key] || PAN_KEYS[e.key.toLowerCase()];

    if (!direction) {
        return;
    }

    panBy(direction[0] * KEY_STEP, direction[1] * KEY_STEP);

    // Or the game's own movement handler walks the character at the same time.
    e.preventDefault();
    e.stopPropagation();
}

// Turning it on and off

export function enable() {
    if (state.active) {
        return;
    }

    if (!isBuilder() || !cameraReady()) {
        return;
    }

    state.active = true;

    // Suspend walking.
    state.previousAllowMovement = window.allowMovement;
    window.allowMovement = false;

    bindPanListeners(true);

    document.body.classList.add('orbem-free-camera');
    document.querySelector('.game-container')?.classList.add('free-camera');
    syncButton();
}

export function disable({ recenter = true } = {}) {
    if (!state.active) {
        return;
    }

    state.active = false;
    state.dragging = false;

    bindPanListeners(false);

    window.allowMovement = state.previousAllowMovement ?? true;
    state.previousAllowMovement = null;

    document.body.classList.remove('orbem-free-camera', 'orbem-free-camera-dragging');
    document.querySelector('.game-container')?.classList.remove('free-camera');
    syncButton();

    // Put the camera back where the game expects it, or the character is offscreen and the next thing that moves them looks like a teleport.
    if (recenter) {
        const mapChar = document.getElementById('map-character');

        mapChar?.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    }
}

export function toggle() {
    return state.active ? disable() : enable();
}

function syncButton() {
    const button = document.getElementById('free-camera-toggle');

    if (!button) {
        return;
    }

    button.classList.toggle('engage', state.active);
    button.setAttribute('aria-pressed', state.active ? 'true' : 'false');
    button.title = state.active
        ? 'Free camera on — drag the map, or press Esc'
        : 'Free camera: look around without walking';
}

// Wiring

/** The pan listeners, attached only while the camera is actually free. */
function bindPanListeners(on) {
    const method = on ? 'addEventListener' : 'removeEventListener';

    document[method]('pointerdown', onPointerDown);
    document[method]('pointermove', onPointerMove);
    document[method]('pointerup', onPointerUp);
    document[method]('pointercancel', onPointerUp);

    // Not passive: the ports are `overflow.
    document[method]('wheel', onWheel, { passive: false });

    // Capture, so panning wins over the game's own movement keys.
    document[method]('keydown', onKeyDown, true);
}

/** Hold the camera through a change of area. */
function reassertAfterAreaChange() {
    if (!state.active) return;

    [0, 250, 700].forEach((delay) => {
        window.setTimeout(() => {
            if (!state.active) return;

            // The engine has just set this to true, so that is what disabling free camera should hand back.
            state.previousAllowMovement = true;
            window.allowMovement = false;

            // Loading an area rewrites the container's whole class attribute.
            document.querySelector('.game-container')?.classList.add('free-camera');

            // The button is rebuilt with the container, so whatever it was showing is gone with it.
            syncButton();
        }, delay);
    });

    // Arriving somewhere and being shown a corner of it is worse than not having the camera at all, so centre once on the new area and pan from there.
    window.setTimeout(() => {
        if (!state.active) return;

        document.getElementById('map-character')
            ?.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    }, 750);
}

/** Watch for the area changing. */
function watchAreaChanges() {
    const container = document.querySelector('.game-container');

    if (!container) return;

    let last = container.className;

    new MutationObserver(() => {
        if (container.className === last) return;

        last = container.className;
        reassertAfterAreaChange();
    }).observe(container, { attributes: true, attributeFilter: ['class'] });
}

function init() {
    // The bundle is registered with in_footer => false, so this file runs in the head.
    if (!isBuilder()) {
        return;
    }

    // Delegated, and that is the whole point of it.
    document.addEventListener('click', (e) => {
        if (!e.target.closest?.('#free-camera-toggle')) return;

        e.preventDefault();
        toggle();
    });

    // So a builder's own tooling — the world builder's menu, anything outside this bundle.
    window.orbemFreeCamera = {
        enable,
        disable,
        toggle,
        get active() {
            return state.active;
        },
    };

    watchAreaChanges();
    syncButton();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
