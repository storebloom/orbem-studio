/**
 * Free camera: let go of the character and look around the map.
 *
 * Normally the camera is welded to the main character — it centres on them and
 * re-centres whenever the game moves them. That is right for playing and wrong
 * for building: reaching a trigger on the far side of the map means walking
 * there, and walking there means the whole route has to already work.
 *
 * Free camera breaks the weld. The character stays where they are, movement is
 * suspended so the arrow keys pan instead of walk, and the map can be dragged,
 * scrolled or nudged around freely. Everything on the map stays live, so a
 * thing can be clicked and finished from across the world without the trip.
 *
 * BUILDERS ONLY
 *
 * That last sentence is the feature when you are building and cheating when
 * you are playing — reaching a task without making the journey is the point of
 * the tool and the whole of the exploit. So it is gated on the same capability
 * as dev mode, decided on the server, and the template only renders the button
 * for a builder. This file re-checks that flag rather than trusting the button
 * to be absent, and does not publish its API to anyone who fails it.
 *
 * None of which is a security boundary — nothing running in a browser is. It
 * means free camera is genuinely not part of the game, not that a determined
 * player cannot move their own view. Anything that pays out has to be decided
 * on the server regardless.
 *
 * HOW THE CAMERA ACTUALLY WORKS
 *
 * There is no camera object and nothing is transformed. `.game-container` is a
 * fixed 5000 x 4517 box, and some ancestor of it is a scroll port — an element
 * with `overflow: hidden` that is narrower than the box and therefore scrolls
 * programmatically even though the user cannot scroll it by hand. The game
 * points the camera by calling `scrollIntoView()` on the character, which
 * scrolls that ancestor.
 *
 * Which ancestor it is is not fixed. `main#primary` from this plugin's own
 * template is the usual answer, but whether it is the element that overflows
 * depends on the layout the surrounding theme puts it in. So it is found
 * rather than named — the nearest ancestor that actually overflows.
 *
 * And the two axes are not always the same element. In the stock theme
 * `main#primary` is narrower than the map and scrolls horizontally, but it is
 * as tall as the map, so vertical panning happens on the window instead.
 * Assuming one element for both is the obvious version of this code and it
 * pans left and right only — which is why each axis is resolved separately
 * below, and why body and html are skipped: they report a scrollable height
 * that does not respond to being written to.
 *
 * @package OrbemStudio
 */

/* eslint-disable no-console */

/**
 * What a press on means "move this", not "move the map": a thing on the map,
 * the player, and the handles a selected thing is resized and turned by.
 */
const DRAGGABLE = '.default-map .map-item, .default-map .enemy-item, #map-character .map-character-icon.engage, '
    + '.item-resize-handle, .item-rotate-handle, [data-genre="explore-wall"]';

/** How far a pointer must travel before a click becomes a drag. */
const DRAG_THRESHOLD = 4;

/** Pixels per arrow-key press, and per wheel notch when the browser sends lines. */
const KEY_STEP = 120;
const LINE_HEIGHT = 16;

/** Keys that pan, mapped to their direction. Matches the game's own movement keys. */
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
    // What allowMovement was before we suspended it, so leaving free camera
    // does not hand movement back to a player the game had deliberately frozen
    // — mid-cutscene, say.
    previousAllowMovement: null,
};

/**
 * The thing that scrolls for one axis: an ancestor of the game container, or
 * the window when no ancestor takes it.
 *
 * Body and html are deliberately not candidates. They report a scrollable
 * height here, but writing to their scrollTop does nothing — the viewport
 * scroll is the window's — so accepting either produces a camera that silently
 * refuses to move.
 *
 * Recomputed on every call rather than cached: the game replaces areas in
 * place, and a cached node that has since been detached scrolls nothing at
 * all, silently.
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

/**
 * Reading and writing the camera, one axis at a time, without the caller
 * having to know whether it landed on an element or the window.
 */
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

/**
 * Whether this visitor may take the camera at all.
 *
 * Read from the server's own flag on every call, not cached at load: the game
 * swaps areas without a reload, and a permission that was true once should not
 * stay true because it was read early.
 */
function isBuilder() {
    return !!document.querySelector('[data-freecamera="true"]');
}

export function isFreeCameraActive() {
    return state.active;
}

/**
 * Point the camera at something, unless the player has taken the camera.
 *
 * Every place the game used to call `el.scrollIntoView()` to move the camera
 * calls this instead. That is the whole of the integration: free camera works
 * by this returning early, so a centring call added later is the only way the
 * feature can be broken, and it breaks visibly rather than subtly.
 */
export function centerCamera(el, options) {
    if (state.active || !el) {
        return;
    }

    el.scrollIntoView(options);
}

// =============================================================================
// Panning
// =============================================================================

function panBy(dx, dy) {
    if (!cameraReady()) {
        return;
    }

    // Each port clamps to its own bounds, so the map edge is the camera's
    // limit and there is nothing to check here.
    camera.x += dx;
    camera.y += dy;
}

function onPointerDown(e) {
    // Left button only, and never on a control — the point of free camera is
    // to reach things and click them, so a click must still be a click.
    if (!state.active || (e.pointerType === 'mouse' && e.button !== 0)) {
        return;
    }

    // Not every pointer target is an element — it can be the document itself,
    // which has no closest(). Letting that throw kills the whole gesture, and
    // the map is exactly where a pointer lands on nothing in particular.
    const target = e.target instanceof Element ? e.target : null;

    if (target?.closest('button, a, input, select, textarea, [role="button"]')) {
        return;
    }

    // Nor on something on the map. Building is what free camera is for, and
    // a builder pressing on a thing means to move it: starting a pan there
    // slid the whole map out from under the drag, so nothing could be moved
    // except from where the character stood. Panning is from open ground,
    // the wheel or the arrow keys.
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

    // Dragging the map moves it with the pointer, so the camera goes the other
    // way. Absolute from the drag's origin rather than accumulated per event,
    // which would drift as the port clamps at an edge.
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

        // If no click follows — a drag ending on empty map — the listener would
        // sit there and eat the next real click instead.
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

// =============================================================================
// Turning it on and off
// =============================================================================

export function enable() {
    if (state.active) {
        return;
    }

    if (!isBuilder() || !cameraReady()) {
        return;
    }

    state.active = true;

    // Suspend walking. Remembered rather than assumed, so turning free camera
    // off during a cutscene does not hand control back early.
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

    // Put the camera back where the game expects it, or the character is
    // offscreen and the next thing that moves them looks like a teleport.
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

// =============================================================================
// Wiring
// =============================================================================

/**
 * The pan listeners, attached only while the camera is actually free.
 *
 * Leaving them on permanently costs something real rather than nothing. A
 * non-passive `wheel` listener on the document tells the browser that any
 * scroll might be cancelled, so it can no longer scroll on the compositor and
 * every notch waits on the main thread — on a page laying out a 5000 x 4517
 * map that is exactly the wrong thing to give up. `pointermove` fires
 * continuously for the whole session to do nothing. Both only matter while
 * panning, so both exist only while panning is possible.
 *
 * The click on the toggle is not in here: that one has to work when the
 * feature is off, which is most of the time.
 */
function bindPanListeners(on) {
    const method = on ? 'addEventListener' : 'removeEventListener';

    document[method]('pointerdown', onPointerDown);
    document[method]('pointermove', onPointerMove);
    document[method]('pointerup', onPointerUp);
    document[method]('pointercancel', onPointerUp);

    // Not passive: the ports are `overflow: hidden`, so the browser will not
    // scroll them for us — the default has to be prevented and the scrolling
    // done by hand.
    document[method]('wheel', onWheel, { passive: false });

    // Capture, so panning wins over the game's own movement keys.
    document[method]('keydown', onKeyDown, true);
}

/**
 * Hold the camera through a change of area.
 *
 * Loading an area is a rebuild: the engine swaps the map, re-registers the
 * movement handlers and sets allowMovement back to true, because as far as it
 * is concerned you have just arrived somewhere and should be able to walk. So
 * free camera survives the trip as a flag and stops being true in practice —
 * the class is still on the body, the mode still says it is on, and the
 * character starts walking again under a camera that is no longer following
 * them. Re-asserting is what makes the mode mean the same thing on both sides
 * of a door.
 *
 * Said more than once on purpose. The engine re-enables movement and centres
 * the view at its own pace during the load, and the order of those against
 * this is not something this file can arrange — so it is repeated across the
 * window in which the area settles rather than guessed at once.
 */
function reassertAfterAreaChange() {
    if (!state.active) return;

    [0, 250, 700].forEach((delay) => {
        window.setTimeout(() => {
            if (!state.active) return;

            // The engine has just set this to true, so that is what disabling
            // free camera should hand back.
            state.previousAllowMovement = true;
            window.allowMovement = false;

            // Loading an area rewrites the container's whole class attribute
            // — `game-container <slug>` — which takes this marker with it.
            // Nothing styles it today, but a mode whose own markers disagree
            // with each other is a bug waiting for the first rule that does.
            document.querySelector('.game-container')?.classList.add('free-camera');

            // The button is rebuilt with the container, so whatever it was
            // showing is gone with it.
            syncButton();
        }, delay);
    });

    // Arriving somewhere and being shown a corner of it is worse than not
    // having the camera at all, so centre once on the new area and pan from
    // there. Deliberately not through centerCamera(), which exists to refuse
    // exactly this — here it is wanted.
    window.setTimeout(() => {
        if (!state.active) return;

        document.getElementById('map-character')
            ?.scrollIntoView({ behavior: 'instant', block: 'center', inline: 'center' });
    }, 750);
}

/**
 * Watch for the area changing.
 *
 * The engine writes the area's slug into the container's class when it loads
 * one — `game-container <slug>` — and keeps the element itself, so watching
 * that one attribute is the whole signal and it survives every swap.
 */
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
    // The bundle is registered with in_footer => false, so this file runs in
    // the head — before <main> and its permission flag have been parsed.
    // Everything that reads the DOM therefore has to wait for this point, and
    // publishing the API at module scope would read the flag too early and
    // withhold the API from the builders it is for.
    if (!isBuilder()) {
        return;
    }

    // Delegated, and that is the whole point of it.
    //
    // The toggle sits inside .game-container so it can float over the game.
    // Loading an area rebuilds that container with
    // `container.innerHTML = … + container.innerHTML + …`, which serialises
    // every child to a string and parses it back — so the button that comes
    // out is a different element wearing the same id, with none of its
    // listeners. Bound directly, free camera worked until you walked through
    // a door and then never again, while the mode underneath it was perfectly
    // fine. A listener on the document cannot be rebuilt away.
    document.addEventListener('click', (e) => {
        if (!e.target.closest?.('#free-camera-toggle')) return;

        e.preventDefault();
        toggle();
    });

    // So a builder's own tooling — the world builder's menu, anything outside
    // this bundle — can drive the camera without importing it. Never published
    // to a player: a one-line way to switch the feature on would undo the gate
    // for the sake of a convenience they have no use for.
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
