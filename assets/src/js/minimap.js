/**
 * A small map of the area you are standing in.
 *
 * Without one, a big area hides everything past the edge of the screen: the
 * door to the next place, the building over the hill, the thing you were sent
 * to find. This draws the whole area in the corner — its map, the walls, the
 * doors, the things in it — with the player as an arrow pointing the way they
 * are walking, and a faint box for what is on screen right now.
 *
 * Turned on per game (the "Minimap" game option). Off, none of this runs.
 *
 * WHAT IS DRAWN
 *
 * Read off the page, not fetched: what is on the map is what the engine has
 * drawn, in the places it has them now — moved by drags, gravity and wandering
 * since the database last heard. Everything is in the area's own coordinates,
 * the same left/top the engine positions things with, scaled down to fit.
 *
 * Things that stay put — the map, roads and other ground drawn over it, walls,
 * doors, scenery, items — are drawn once into a layer and redrawn when the
 * area changes, or every so often in case something was built or picked up.
 * Things that move — people, enemies, the player — are drawn over that layer
 * several times a second.
 *
 * Only what a player could see: anything hidden (display:none, invisible, a
 * spawner, a trigger, an item not yet materialised) is left off, so the map
 * shows where to go, not what is secret.
 *
 * WALKING BETWEEN AREAS
 *
 * The map lives outside the game container, which is rebuilt from its own HTML
 * on every area change, so it is never thrown away with the room — it notices
 * the room is different and draws the new one.
 *
 * THE TIME OF DAY
 *
 * Under the map, in an area with a day and night cycle: the whole day as a
 * strip, night to dawn to day to dusk and back, with a mark at the time now,
 * and how long until it gets dark or light. Read off the same clock the
 * engine lights the area by (the game container's day-night data, kept in
 * step with the server), so the meter and the sky always agree.
 */

/* global OrbemOrder */

const SIZES = { small: 200, large: 420 };

/** How often moving things are redrawn, and how often the still ones are re-read, in ms. */
const MOVING_EVERY = 150;
const STILL_EVERY = 2500;

/** What each kind of thing looks like on the map. */
const COLOURS = {
    wall: '#2f3337',
    door: '#2cadd5',
    collectable: '#f5c542',
    scenery: 'rgba(120, 160, 100, 0.85)',
    point: 'rgba(170, 178, 186, 0.9)',
    sign: '#e8e2d0',
    person: '#5be37d',
    enemy: '#ff4d4d',
    player: '#ffffff',
    view: 'rgba(255, 255, 255, 0.55)',
};

const STORE_KEY = 'orbem_minimap_size';

const state = {
    root: null,
    canvas: null,
    still: document.createElement('canvas'),
    ground: document.createElement('canvas'),
    groundKey: '',
    areaKey: '',
    area: { width: 0, height: 0 },
    stillReadAt: 0,
    size: 'small',
    lastPlayer: null,
    angle: Math.PI / 2,
};

function enabled() {
    return !!(window.OrbemOrder && 'yes' === OrbemOrder.minimap);
}

function container() {
    return document.querySelector('.game-container');
}

/** The area's map picture, which is also the size of the area. */
function mapImage() {
    return document.querySelector('.game-container img.container-image');
}

function areaSize() {
    const img = mapImage();
    const map = document.querySelector('.default-map');

    return {
        width: (img && img.offsetWidth) || (map && map.scrollWidth) || 5000,
        height: (img && img.offsetHeight) || (map && map.scrollHeight) || 4517,
    };
}

function shown(el) {
    const cs = window.getComputedStyle(el);

    return 'none' !== cs.display && 'hidden' !== cs.visibility && '0' !== cs.opacity;
}

/** Where a thing is in the area, from the engine's own left/top. */
function boxOf(el) {
    const cs = window.getComputedStyle(el);

    return {
        left: parseFloat(el.style.left) || parseFloat(cs.left) || 0,
        top: parseFloat(el.style.top) || parseFloat(cs.top) || 0,
        width: el.offsetWidth || parseFloat(cs.width) || 0,
        height: el.offsetHeight || parseFloat(cs.height) || 0,
    };
}

/** What colour a still thing is, or null for something left off the map. */
function kindOf(el) {
    const genre = el.dataset.genre || '';

    if ('true' === el.dataset.trigger || /trigger|explainer|drag-dest/.test(el.className) || 'yes' === el.dataset.spawner) {
        return null;
    }

    if ('explore-wall' === genre) {
        return 'wall';
    }

    if ('explore-area' === genre) {
        return 'door';
    }

    if ('explore-sign' === genre) {
        return 'sign';
    }

    if ('explore-point' === genre) {
        // Ingredients are for finding by looking about, not by reading the map.
        if ('ingredients' === el.dataset.type) {
            return null;
        }

        if ('true' === el.dataset.collectable) {
            return 'collectable';
        }

        return 'true' === el.dataset.passable || el.classList.contains('passable') ? 'scenery' : 'point';
    }

    return null;
}

// =============================================================================
// Drawing
// =============================================================================

/** Pictures read from CSS backgrounds, loaded once each. */
const pictures = new Map();

/** A loaded picture for a URL, or null while it is still loading. */
function picture(url) {
    let img = pictures.get(url);

    if (!img) {
        img = new Image();
        img.src = url;
        pictures.set(url, img);
    }

    return img.complete && img.naturalWidth ? img : null;
}

/** Whether a thing covers most of the area: the ground, not something on it. */
function covers(el, area) {
    const box = boxOf(el);

    return box.width >= area.width * 0.5 && box.height >= area.height * 0.5;
}

/**
 * The picture a thing that covers the area shows — a road, a drawn wall —
 * whether it is an image inside it or its own CSS background.
 */
function coverImage(el) {
    const img = el.querySelector('img:not(.character-icon)');

    if (img && img.complete && img.naturalWidth) {
        return img;
    }

    const bg = (window.getComputedStyle(el).backgroundImage || '').match(/url\(["']?(.*?)["']?\)/);

    return bg ? picture(bg[1]) : null;
}

/**
 * The ground: the area's map picture and everything drawn over the whole of
 * it (roads, drawn walls), shrunk to the minimap once and kept.
 *
 * These are playfield-sized pictures, 5000 × 4517. Shrinking them is cheap
 * while the browser still has them decoded, and costs most of a second when
 * it has let them go and must decode them again — which froze the game,
 * player and all, every so often. So they are shrunk again only when one of
 * them changes: another area, another size, a road redrawn, a picture that
 * has finished loading.
 */
function drawGround(area, width, height, covering) {
    const map = mapImage();
    const ready = (img) => !!(img && img.complete && img.naturalWidth);
    const pictured = covering.map((el) => [el, coverImage(el)]);
    const key = [
        width,
        height,
        map ? map.getAttribute('src') + ':' + ready(map) : '',
        ...pictured.map(([el, img]) => {
            const box = boxOf(el);

            return (img ? img.currentSrc || img.src : '') + ':' + ready(img) + '@' + [box.left, box.top, box.width, box.height].join(',');
        }),
    ].join('|');

    if (key === state.groundKey) {
        return;
    }

    const scale = width / area.width;
    const ctx = state.ground.getContext('2d');

    state.groundKey = key;
    state.ground.width = width;
    state.ground.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#1b2a1f';
    ctx.fillRect(0, 0, width, height);

    if (ready(map)) {
        try {
            ctx.drawImage(map, 0, 0, width, height);
        } catch (e) {
            // A picture from a host that does not allow reading it back is
            // still drawable; one that failed to load simply is not.
        }
    }

    // Roads and anything else drawn over the whole area, over the map.
    pictured.forEach(([el, cover]) => {
        if (!cover) {
            return;
        }

        const box = boxOf(el);

        try {
            ctx.drawImage(cover, box.left * scale, box.top * scale, box.width * scale, box.height * scale);
        } catch (e) {
            // As above.
        }
    });
}

/** The layer of things that stay put. */
function drawStill() {
    const area = areaSize();
    const width = SIZES[state.size];
    const height = Math.round(width * (area.height / area.width));
    const scale = width / area.width;
    const ctx = state.still.getContext('2d');
    const items = Array.from(document.querySelectorAll('.default-map .map-item'));

    state.area = area;

    drawGround(area, width, height, items.filter((el) => shown(el) && covers(el, area)));

    state.still.width = width;
    state.still.height = height;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(state.ground, 0, 0);

    // Never drawn as a box: a box the size of the area hides the whole map.
    items.forEach((el) => {
        if ('explore-character' === el.dataset.genre || 'yes' === el.dataset.wanderer || !shown(el) || covers(el, area)) {
            return;
        }

        const kind = kindOf(el);

        if (!kind) {
            return;
        }

        const box = boxOf(el);
        const x = box.left * scale;
        const y = box.top * scale;
        const w = Math.max(2, box.width * scale);
        const h = Math.max(2, box.height * scale);

        ctx.fillStyle = COLOURS[kind];
        ctx.fillRect(x, y, w, h);

        // The way to somewhere else is the thing most worth seeing.
        if ('door' === kind) {
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(x, y, w, h);
        }
    });

    state.stillReadAt = performance.now();
}

/** Where the player is in the area, measured off the screen. */
function playerAt() {
    const icon = document.querySelector('#map-character .map-character-icon.engage');
    const map = mapImage() || document.querySelector('.default-map');

    if (!icon || !map) {
        return null;
    }

    const a = icon.getBoundingClientRect();
    const m = map.getBoundingClientRect();
    const scale = m.width ? m.width / state.area.width : 1;

    return {
        x: (a.left + a.width / 2 - m.left) / scale,
        y: (a.top + a.height / 2 - m.top) / scale,
        // What is on screen, in the same space.
        view: {
            left: -m.left / scale,
            top: -m.top / scale,
            width: window.innerWidth / scale,
            height: window.innerHeight / scale,
        },
    };
}

/** The way the player is facing: from how they last moved, or their sprite. */
function facing(player) {
    const last = state.lastPlayer;

    if (last) {
        const dx = player.x - last.x;
        const dy = player.y - last.y;

        if (Math.hypot(dx, dy) > 1.5) {
            state.angle = Math.atan2(dy, dx);

            return state.angle;
        }
    }

    const icon = document.querySelector('#map-character .map-character-icon.engage');
    const named = icon && String(icon.id).match(/(up|down|left|right)/);

    if (named && !last) {
        state.angle = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 }[named[1]];
    }

    return state.angle;
}

function drawArrow(ctx, x, y, angle, size) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size * 0.7, size * 0.65);
    ctx.lineTo(-size * 0.35, 0);
    ctx.lineTo(-size * 0.7, -size * 0.65);
    ctx.closePath();
    ctx.fillStyle = COLOURS.player;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

/** The still layer, then everything that moves, then the player. */
function drawMoving() {
    const canvas = state.canvas;
    const ctx = canvas.getContext('2d');
    const scale = state.still.width / state.area.width;

    if (canvas.width !== state.still.width || canvas.height !== state.still.height) {
        canvas.width = state.still.width;
        canvas.height = state.still.height;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(state.still, 0, 0);

    const dot = (el, colour) => {
        if (!shown(el)) {
            return;
        }

        const box = boxOf(el);

        ctx.beginPath();
        ctx.arc((box.left + box.width / 2) * scale, (box.top + box.height / 2) * scale, 'large' === state.size ? 4 : 3, 0, Math.PI * 2);
        ctx.fillStyle = colour;
        ctx.fill();
    };

    document.querySelectorAll('.default-map .map-item[data-genre="explore-character"]').forEach(el => dot(el, COLOURS.person));
    document.querySelectorAll('.default-map .enemy-item').forEach((el) => {
        if ('yes' !== el.dataset.spawner && '0' !== el.dataset.health) {
            dot(el, COLOURS.enemy);
        }
    });

    const player = playerAt();

    if (player) {
        ctx.strokeStyle = COLOURS.view;
        ctx.lineWidth = 1;
        ctx.strokeRect(player.view.left * scale, player.view.top * scale, player.view.width * scale, player.view.height * scale);

        drawArrow(ctx, player.x * scale, player.y * scale, facing(player), 'large' === state.size ? 9 : 7);
        state.lastPlayer = player;
    }
}

// =============================================================================
// The time of day
// =============================================================================

/** When it counts as getting light, and getting dark: mid-dawn and mid-dusk. */
const LIGHT_AT = 6;
const DARK_AT = 19.5;

/** The hour now (0–24) on the area's clock, as the engine works it out. */
function hourNow(box) {
    const minutes = parseFloat(box.dataset.dayNightCycle) || 60;
    const epoch = parseFloat(box.dataset.dayNightEpoch) || 0;
    const offset = parseFloat(box.dataset.dayNightOffset) || 0;
    const day = (Date.now() + (window.dayNightSkew || 0) - epoch) / (minutes * 60000) + offset;

    return (((day % 1) + 1) % 1) * 24;
}

/** "in 12 min", from game hours ahead and how many real minutes a day lasts. */
function wait(hours, dayMinutes) {
    const minutes = Math.round((hours / 24) * dayMinutes);

    if (minutes < 1) {
        return 'soon';
    }

    if (minutes < 60) {
        return `in ${minutes} min`;
    }

    return `in ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
}

const STAYS = { day: 'Always day', dusk: 'Always dusk', night: 'Always night' };

function drawTime(box) {
    const meter = state.meter;
    const mode = box.dataset.dayNight || '';

    if (!meter || (!STAYS[mode] && 'cycle' !== mode)) {
        if (meter) {
            meter.hidden = true;
        }

        return;
    }

    meter.hidden = false;

    const hour = 'cycle' === mode ? hourNow(box) : { day: 12, dusk: 18.75, night: 0 }[mode];
    const light = hour >= LIGHT_AT && hour < DARK_AT;

    meter.querySelector('.orbem-daynight-now').style.left = `${(hour / 24) * 100}%`;
    meter.classList.toggle('is-night', !light);

    let text = STAYS[mode] || '';

    if ('cycle' === mode) {
        const dayMinutes = parseFloat(box.dataset.dayNightCycle) || 60;
        const ahead = light ? DARK_AT - hour : (LIGHT_AT - hour + 24) % 24;

        text = `${light ? 'Dark' : 'Light'} ${wait(ahead, dayMinutes)}`;
    }

    const label = meter.querySelector('.orbem-daynight-label');

    if (label.textContent !== text) {
        label.textContent = text;
    }
}

// =============================================================================
// The loop
// =============================================================================

function build() {
    const root = document.createElement('div');
    root.id = 'orbem-minimap';
    root.title = 'Map — click to make it bigger or smaller';
    root.innerHTML = '<canvas></canvas>'
        + '<div class="orbem-daynight" hidden>'
        + '<div class="orbem-daynight-strip"><span class="orbem-daynight-now"></span></div>'
        + '<span class="orbem-daynight-label"></span>'
        + '</div>';
    document.body.appendChild(root);

    state.root = root;
    state.canvas = root.querySelector('canvas');
    state.meter = root.querySelector('.orbem-daynight');

    try {
        state.size = 'large' === window.localStorage.getItem(STORE_KEY) ? 'large' : 'small';
    } catch (e) {
        state.size = 'small';
    }

    root.classList.toggle('is-large', 'large' === state.size);

    root.addEventListener('click', () => {
        state.size = 'large' === state.size ? 'small' : 'large';
        root.classList.toggle('is-large', 'large' === state.size);

        try {
            window.localStorage.setItem(STORE_KEY, state.size);
        } catch (e) {
            // Remembering is a nicety; the map works without it.
        }

        drawStill();
    });
}

function tick() {
    const box = container();

    // Not until the game is showing: no start screen with a map over it.
    if (!box || !shown(box) || !document.querySelector('#map-character .map-character-icon.engage')) {
        state.root.hidden = true;
        return;
    }

    state.root.hidden = false;

    const map = mapImage();
    const key = box.className + '|' + (map ? map.getAttribute('src') : '');

    if (key !== state.areaKey) {
        state.areaKey = key;
        state.lastPlayer = null;
        drawStill();
    } else if (performance.now() - state.stillReadAt > STILL_EVERY) {
        drawStill();
    }

    drawMoving();
    drawTime(box);
}

function start() {
    if (!enabled() || document.getElementById('orbem-minimap')) {
        return;
    }

    build();
    tick();
    setInterval(tick, MOVING_EVERY);
}

if ('loading' === document.readyState) {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}
