/**
 * Putting the characters back where you left them.
 *
 * @package OrbemStudio
 */

/* global OrbemOrder */

/** How often to write down where everybody is. */
const SAVE_EVERY = 4000;

/** Everybody we have ever seen move, by area. */
const movers = new Map();

/** Where each character was when we first saw it, so movement can be noticed. */
const drawnAt = new Map();

let saveTimer = null;
let lastArea = '';

function rest() {
    return (window.OrbemOrder && OrbemOrder.siteRESTURL) || '';
}

function nonce() {
    return (window.OrbemOrder && OrbemOrder.orbemNonce) || '';
}

function currentArea() {
    const box = document.querySelector('.game-container');

    if (!box) return '';

    return (String(box.className).match(/game-container\s+([a-z0-9-]+)/) || [, ''])[1];
}

/** Not a spawner or anything it sent. */
function isTemporary(el) {
    return !!(el.dataset && (el.dataset.spawner || el.dataset.spawned));
}

/** Everybody on the map who could be somewhere other than where they started. */
function people() {
    return Array.from(document.querySelectorAll(
        '.default-map .map-item[data-genre="explore-character"], .default-map .enemy-item'
    )).filter(el => !isTemporary(el));
}

function positionOf(el) {
    return {
        left: parseInt(el.style.left, 10) || el.offsetLeft || 0,
        top: parseInt(el.style.top, 10) || el.offsetTop || 0,
    };
}

/** Put back what this player remembers, for the area they are now in. */
function restore(area) {
    const saved = ((window.OrbemOrder && OrbemOrder.npcPositions) || {})[area];

    if (!saved) {
        return;
    }

    Object.keys(saved).forEach((id) => {
        const el = document.getElementById(id);

        if (!el || !el.classList.contains('map-item') && !el.classList.contains('enemy-item') || isTemporary(el)) {
            return;
        }

        el.style.left = `${saved[id].left}px`;
        el.style.top = `${saved[id].top}px`;

        // Put back means they have moved before, so they are a mover now.
        mark(area, id);
    });
}

function mark(area, id) {
    if (!movers.has(area)) {
        movers.set(area, new Set());
    }

    movers.get(area).add(String(id));
}

/** Notice anybody who is not where we first saw them. */
function watch(area) {
    people().forEach((el) => {
        const key = `${area}:${el.id}`;
        const at = positionOf(el);

        if (!drawnAt.has(key)) {
            drawnAt.set(key, at);

            return;
        }

        const was = drawnAt.get(key);

        if (was.left !== at.left || was.top !== at.top) {
            mark(area, el.id);
        }
    });
}

function save(area, beacon) {
    const moved = movers.get(area);

    if (!area || !moved || !moved.size) {
        return;
    }

    const payload = { area, people: {} };

    moved.forEach((id) => {
        const el = document.getElementById(id);

        if (el) {
            payload.people[id] = positionOf(el);
        }
    });

    if (!Object.keys(payload.people).length) {
        return;
    }

    const url = `${rest()}/npc-positions/`;
    const body = JSON.stringify(payload);

    // Leaving the page: a normal request is usually cancelled on the way out, and the whole point of this is the state surviving a reload.
    if (beacon && navigator.sendBeacon) {
        navigator.sendBeacon(
            `${url}?_wpnonce=${encodeURIComponent(nonce())}`,
            new Blob([body], { type: 'application/json' })
        );

        return;
    }

    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce() },
        credentials: 'same-origin',
        keepalive: true,
        body,
    }).catch(() => {});
}

function tick() {
    const area = currentArea();

    if (!area) {
        return;
    }

    // Walking through a door swaps the map without reloading, so the new room's people have to be put back the moment it changes.
    if (area !== lastArea) {
        if (lastArea) {
            save(lastArea, false);
        }

        lastArea = area;
        restore(area);
    }

    watch(area);
}

export function startNpcPositions() {
    // Nobody to remember for.
    if (!window.OrbemOrder || !OrbemOrder.npcPositions || saveTimer) {
        return;
    }

    // Once now, so a reload puts everybody back before the first frame rather than visibly snapping into place a moment later.
    tick();

    saveTimer = setInterval(() => {
        tick();
        save(currentArea(), false);
    }, SAVE_EVERY);

    window.addEventListener('pagehide', () => save(currentArea(), true));
}
