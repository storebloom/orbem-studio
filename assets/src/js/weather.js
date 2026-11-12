/**
 * Weather: drizzle, rain, snow, wind and lightning over an area.
 *
 * An area's builder picks the kinds (explore-weather) and how often they come
 * (explore-frequency). The engine keeps them on the game container as data,
 * the same way it keeps the time of day, and updates them on every area
 * change. This reads that data and shows the weather; nothing else in the
 * game knows it is raining.
 *
 * DRAWN WITH CSS
 *
 * Each kind is one or two layers (near and far). A layer is a tile of drops
 * or flakes, drawn once as an SVG and repeated as a background, and a CSS
 * animation slides it exactly one tile down (and across, in wind) and starts
 * again. The repeat makes that seamless, and only transform and opacity ever
 * change, so the browser moves the layers on the GPU without repainting.
 *
 * ON THE MAP, NOT THE SCREEN
 *
 * The weather is pinned to the map: each layer is shifted by where the area's
 * map is on screen (to within one tile, which is all a repeating pattern
 * needs). Walk up and the snow moves down with the ground while it falls,
 * rather than hanging in front of the camera and seeming to rise. That shift
 * is the one thing worked out every frame, and only while there is weather.
 *
 * WHEN IT COMES
 *
 * "Always" never clears. The others are counted in days of the area's clock
 * (the day-night cycle's: in a world on Orbem Standard Time, its biome's
 * day). Each day has up to MOST stretches of weather — Rarely one, Often
 * three — and how many, from none to that, is a hash of the area and the
 * day, so some days stay clear. The day is shared out evenly between that
 * day's stretches; each lasts a few hours (SPELL) somewhere in its share,
 * with clear sky either side, so two never run together.
 *
 * WHICH, WHEN SEVERAL ARE CHOSEN
 *
 * They take turns, a stretch each (under "Always", a CYCLE each), rather
 * than all falling at once: rain one time, snow the next. Lightning is a storm (rain with lightning) and takes
 * its own turn. Wind is the exception: it can join another's turn (about half
 * of them, by the hash) and also has turns of its own. Changing from one to
 * the next fades the old out before the new comes in, even under "Always".
 *
 * The clock is the server's (data-weather-now), so every player in an area
 * gets the same weather at the same time. It fades in and out over a few
 * seconds, as a CSS transition.
 *
 * Under the HUD (z 9; menus are 10 and up) and over the world. The engine
 * wraps any area with weather in its world layer (.game-world), its own
 * stacking context, so the depth-sorted things inside stay under it.
 */

import '../sass/weather.scss';

/** How long each kind has its turn under "Always". */
const CYCLE = 10 * 60 * 1000;

/** The most stretches of weather in a day, by frequency. */
const MOST = { often: 3, occasionally: 2, rarely: 1 };

/** How long a stretch lasts, shortest and longest, as a share of a day. */
const SPELL = [2 / 24, 4 / 24];

/** Clear sky kept either side of a stretch, as a share of its part of the day. */
const MARGIN = 0.125;

/**
 * The layers. tw × th is the tile; each loop it moves one tile down (th) and,
 * in wind, one tile across (tw), so the slant of a streak is tw / th.
 * Speeds are px per second. Near and far tiles are different sizes so their
 * patterns never line up, and big enough that the repeat does not show.
 */
const LAYERS = {
    rain: [
        { name: 'near', tw: 256, th: 512, count: 26, len: 20, width: 1.3, alpha: 0.55, speed: 1050 },
        { name: 'far', tw: 224, th: 448, count: 34, len: 12, width: 1, alpha: 0.3, speed: 700 },
    ],
    drizzle: [
        { name: 'near', tw: 256, th: 512, count: 18, len: 9, width: 1, alpha: 0.45, speed: 560 },
        { name: 'far', tw: 224, th: 448, count: 22, len: 6, width: 1, alpha: 0.28, speed: 400 },
    ],
    snow: [
        { name: 'near', tw: 512, th: 512, count: 30, radius: [1.6, 3], alpha: 0.9, speed: 55, sway: 3.2 },
        { name: 'far', tw: 416, th: 416, count: 34, radius: [0.8, 1.6], alpha: 0.6, speed: 32, sway: 4.6 },
    ],
    wind: [
        { name: 'gust', tw: 896, th: 448, count: 3, len: 160, alpha: 0.16, speed: 760 },
    ],
};

/** How dark each kind makes the area. Drizzle and snow leave it be. */
const DIM = { rain: 0.18, lightning: 0.28 };

/** How long the fade in and out takes (the CSS transition), in ms. */
const FADE = 6000;

const state = {
    root: null,
    layers: [],
    key: '',
    chosen: [],
    kinds: [],
    kindsKey: '',
    swapTimer: 0,
    frequency: 'always',
    seed: 0,
    skew: 0,
    on: false,
    shown: false,
    loop: 0,
    strikeTimer: 0,
};

function container() {
    return document.querySelector('.game-container');
}

/** The game is showing: no start screen, and the player is drawn. */
function playing() {
    return !document.querySelector('.explore-overlay')
        && !!document.querySelector('#map-character .map-character-icon.engage');
}

/** What is falling right now (not everything the builder chose). */
function has(kind) {
    return state.kinds.includes(kind);
}

// =============================================================================
// When
// =============================================================================

/** 0–1 from two whole numbers, the same on every page. */
function hash(a, b) {
    let h = Math.imul(a ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(b + 0x632be5ab, 0xc2b2ae35);
    h ^= h >>> 15;
    h = Math.imul(h, 0x2c1b3c6d);
    h ^= h >>> 12;

    return (h >>> 0) / 4294967296;
}

/** Days since the area's clock began, and how far into today: the day-night cycle's clock. */
function days(now) {
    const data = container()?.dataset || {};
    const minutes = parseFloat(data.dayNightCycle) || 60;
    const epoch = parseFloat(data.dayNightEpoch) || 0;
    const offset = parseFloat(data.dayNightOffset) || 0;

    return (now - epoch) / (minutes * 60000) + offset;
}

/**
 * Whether the area has weather right now, and whose turn it is: a number
 * that goes up by one each stretch (each CYCLE, under "Always").
 */
function spell() {
    const now = Date.now() + state.skew;

    if (!MOST[state.frequency]) {
        return { wet: true, turn: Math.floor(now / CYCLE) };
    }

    const time = days(now);
    const day = Math.floor(time);
    const into = time - day;
    const count = Math.floor(hash(state.seed, day) * (MOST[state.frequency] + 1));

    for (let i = 0; i < count; i++) {
        const part = 1 / count;
        const margin = part * MARGIN;
        const length = Math.min(SPELL[0] + hash(state.seed + 101 + i, day) * (SPELL[1] - SPELL[0]), part - 2 * margin);
        const begins = i * part + margin + hash(state.seed + 211 + i, day) * (part - 2 * margin - length);

        if (into >= begins && into < begins + length) {
            return { wet: true, turn: day * 3 + i };
        }
    }

    return { wet: false, turn: day * 3 };
}

/**
 * What falls now: one of the chosen kinds, their turn by the cycle, with wind
 * now and then on top. Empty for clear skies.
 */
function plan() {
    const chosen = state.chosen;
    const { wet, turn: n } = spell();

    if (!wet || !chosen.length) {
        return [];
    }

    const turns = [];

    ['drizzle', 'rain', 'snow'].forEach((kind) => chosen.includes(kind) && turns.push([kind]));

    if (chosen.includes('lightning')) {
        turns.push(['rain', 'lightning']);
    }

    const windy = chosen.includes('wind');

    if (windy) {
        turns.push(['wind']);
    }

    // The area's seed starts each area at a different place in the rotation.
    const turn = turns[(n + state.seed) % turns.length].slice();

    if (windy && !turn.includes('wind') && hash(state.seed + 7919, n) < 0.5) {
        turn.push('wind');
    }

    return turn;
}

// =============================================================================
// The tiles
// =============================================================================

/** A small seeded random, so a tile is the same every time it is drawn. */
function random(seed) {
    let a = seed >>> 0;

    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function svg(w, h, body) {
    return `url("data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`
    )}")`;
}

/**
 * One tile of a layer. Everything is kept clear of the tile's edges, so no
 * drop is cut in half where the tiles meet.
 */
function tile(kind, layer, windy, seed) {
    const rand = random(seed);
    const { tw, th } = layer;
    let body = '';

    if ('rain' === kind || 'drizzle' === kind) {
        // In wind it falls one tile across for every tile down; still, nearly straight.
        const slant = windy ? tw / th : 0;

        for (let i = 0; i < layer.count; i++) {
            const run = slant * layer.len;
            const x = run + 2 + rand() * (tw - run - 4);
            const y = layer.len + 2 + rand() * (th - layer.len - 4);

            body += `<line x1="${x.toFixed(1)}" y1="${y.toFixed(1)}" x2="${(x - run).toFixed(1)}" y2="${(y - layer.len).toFixed(1)}"/>`;
        }

        return svg(tw, th, `<g stroke="rgb(190,210,235)" stroke-opacity="${layer.alpha}" stroke-width="${layer.width}" stroke-linecap="round">${body}</g>`);
    }

    if ('snow' === kind) {
        for (let i = 0; i < layer.count; i++) {
            const r = layer.radius[0] + rand() * (layer.radius[1] - layer.radius[0]);
            const x = r + 1 + rand() * (tw - 2 * r - 2);
            const y = r + 1 + rand() * (th - 2 * r - 2);

            body += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}"/>`;
        }

        return svg(tw, th, `<g fill="#fff" fill-opacity="${layer.alpha}">${body}</g>`);
    }

    // Wind: a couple of long, faint, slightly bent streaks.
    for (let i = 0; i < layer.count; i++) {
        const x = 8 + rand() * (tw - layer.len - 16);
        const y = 30 + rand() * (th - 60);
        const bend = (rand() - 0.5) * 24;

        body += `<path d="M${x.toFixed(1)} ${y.toFixed(1)} q${(layer.len / 2).toFixed(1)} ${bend.toFixed(1)} ${layer.len} 0"/>`;
    }

    return svg(tw, th, `<g fill="none" stroke="rgb(235,240,245)" stroke-opacity="${layer.alpha}" stroke-width="1.5" stroke-linecap="round">${body}</g>`);
}

// =============================================================================
// The layers
// =============================================================================

function build() {
    const root = document.createElement('div');
    root.id = 'orbem-weather';
    root.setAttribute('aria-hidden', 'true');
    root.hidden = true;
    root.innerHTML = '<div class="ow-wx-dim"></div><div class="ow-wx-particles"></div>'
        + '<div class="ow-wx-flash"></div><svg class="ow-wx-bolt" xmlns="http://www.w3.org/2000/svg"><path/></svg>';
    document.body.appendChild(root);

    // A strike's class comes off as soon as it has played. Left on, the flash
    // and the bolt would play again every time the weather is hidden and shown
    // (a door, a cutscene), lightning or not.
    root.querySelectorAll('.ow-wx-flash, .ow-wx-bolt').forEach((el) => {
        el.addEventListener('animationend', () => el.classList.remove('is-striking'));
        el.addEventListener('animationcancel', () => el.classList.remove('is-striking'));
    });

    state.root = root;
}

/** Lay out the layers for this area's kinds, from nothing. */
function dress() {
    const particles = state.root.querySelector('.ow-wx-particles');
    const windy = has('wind');

    particles.innerHTML = '';
    state.layers = [];

    state.root.querySelectorAll('.is-striking').forEach((el) => el.classList.remove('is-striking'));

    ['snow', 'drizzle', 'rain', 'wind'].forEach((kind, k) => {
        (has(kind) ? LAYERS[kind] : []).forEach((layer, n) => {
            const gust = 'wind' === kind;
            const dx = gust || windy ? layer.tw : 0;
            const dy = gust ? 0 : layer.th;
            const seconds = (gust ? layer.tw : layer.th) / layer.speed;

            // The anchor is pinned to the map; the fall inside it loops.
            const anchor = document.createElement('div');
            anchor.className = `ow-wx-layer ow-wx-${kind} ow-wx-${layer.name}`;
            anchor.style.setProperty('--tw', `${layer.tw}px`);
            anchor.style.setProperty('--th', `${layer.th}px`);

            // Snow drifts from side to side as it falls; the drift is its own
            // element because one element has only one transform to animate.
            const sway = document.createElement('div');
            sway.className = 'ow-wx-sway';

            if (layer.sway && !windy) {
                sway.style.animationDuration = `${layer.sway}s`;
                sway.classList.add('is-swaying');
            }

            const fall = document.createElement('div');
            fall.className = 'ow-wx-fall';
            fall.style.backgroundImage = tile(kind, layer, windy, (state.seed * 31 + k * 7 + n) | 0);
            fall.style.setProperty('--dx', `${dx}px`);
            fall.style.setProperty('--dy', `${dy}px`);
            fall.style.animationDuration = `${seconds.toFixed(3)}s`;

            sway.appendChild(fall);
            anchor.appendChild(sway);
            particles.appendChild(anchor);

            state.layers.push({ el: anchor, tw: layer.tw, th: layer.th });
        });
    });

    const dim = Math.max(has('rain') ? DIM.rain : 0, has('lightning') ? DIM.lightning : 0);

    state.root.style.setProperty('--wx-dim', String(dim));
}

/** Where the area's map is on screen: the weather's ground. */
function mapOrigin() {
    const map = document.querySelector('.game-container img.container-image')
        || document.querySelector('.game-container .default-map');
    const rect = map ? map.getBoundingClientRect() : null;

    return rect ? [rect.left, rect.top] : [0, 0];
}

/** Shift each layer by the map's place on screen, to within one of its tiles. */
function pin() {
    const [x, y] = mapOrigin();

    state.layers.forEach((layer) => {
        const ox = ((x % layer.tw) + layer.tw) % layer.tw - layer.tw;
        const oy = ((y % layer.th) + layer.th) % layer.th - layer.th;

        layer.el.style.transform = `translate3d(${ox.toFixed(1)}px, ${oy.toFixed(1)}px, 0)`;
    });
}

/** Under a night sky the weather is darker too. */
function nightDim() {
    const shade = document.querySelector('.game-world > .day-night-shade');

    state.root.style.setProperty('--wx-night', shade && 'yes' === shade.dataset.dark ? '0.6' : '1');
}

function follow() {
    state.loop = 0;

    if (!state.shown || document.hidden) {
        return;
    }

    pin();
    state.loop = window.requestAnimationFrame(follow);
}

// =============================================================================
// Lightning
// =============================================================================

function boltPath() {
    const w = window.innerWidth;
    const bottom = window.innerHeight * (0.35 + Math.random() * 0.3);
    let x = w * (0.15 + Math.random() * 0.7);
    let y = 0;
    let d = `M${x.toFixed(0)} 0`;

    while (y < bottom) {
        y += 18 + Math.random() * 26;
        x += (Math.random() - 0.5) * 60;
        d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
    }

    return d;
}

function strike() {
    clearTimeout(state.strikeTimer);

    if (!has('lightning')) {
        return;
    }

    state.strikeTimer = setTimeout(() => {
        if (state.on && state.shown && !document.hidden) {
            const flash = state.root.querySelector('.ow-wx-flash');
            const bolt = state.root.querySelector('.ow-wx-bolt');

            bolt.querySelector('path').setAttribute('d', boltPath());

            // Off and on again restarts a CSS animation.
            [flash, bolt].forEach((el) => {
                el.classList.remove('is-striking');
                void el.getBoundingClientRect();
                el.classList.add('is-striking');
            });

            // And in case neither event comes (a tab in the background never
            // runs the animation at all), off again once it would be over.
            setTimeout(() => {
                flash.classList.remove('is-striking');
                bolt.classList.remove('is-striking');
            }, 700);
        }

        strike();
    }, 6000 + Math.random() * 12000);
}

// =============================================================================
// Keeping up with the area
// =============================================================================

/** Read the area's weather off the game container. True when it changed. */
function read() {
    const box = container();
    const data = box ? box.dataset : {};
    const key = [data.weather || '', data.weatherFrequency || '', data.weatherSeed || ''].join('|');

    if (data.weatherNow) {
        state.skew = parseFloat(data.weatherNow) - Date.now();
        data.weatherNow = '';
    }

    if (key === state.key) {
        return false;
    }

    state.key = key;
    state.chosen = (data.weather || '').split(' ').filter(Boolean);
    state.frequency = data.weatherFrequency || 'always';
    state.seed = parseInt(data.weatherSeed, 10) || 0;

    return true;
}

/** Lay out what falls now and fade it in (or, with instant, just show it). */
function begin(kinds, instant) {
    const root = state.root;

    state.kinds = kinds;
    state.kindsKey = kinds.join(' ');
    state.on = kinds.length > 0;

    root.classList.add('is-instant');
    root.classList.remove('is-on');
    dress();
    strike();
    void root.getBoundingClientRect();

    if (!instant) {
        root.classList.remove('is-instant');
    }

    root.classList.toggle('is-on', state.on);

    if (instant) {
        void root.getBoundingClientRect();
        root.classList.remove('is-instant');
    }
}

function check() {
    const root = state.root;
    const next = plan();
    const nextKey = next.join(' ');

    if (read()) {
        // A new area: its weather is already there, not arriving.
        clearTimeout(state.swapTimer);
        state.swapTimer = 0;
        begin(plan(), true);
    } else if (nextKey !== state.kindsKey && !state.swapTimer) {
        if (state.on) {
            // Fade the old weather out, then bring the new in.
            state.on = false;
            root.classList.remove('is-on');
            state.swapTimer = setTimeout(() => {
                state.swapTimer = 0;
                begin(plan(), false);
            }, FADE);
        } else {
            begin(next, false);
        }
    }

    const show = state.chosen.length > 0 && playing();

    if (show !== state.shown) {
        state.shown = show;
        root.hidden = !show;
    }

    if (show) {
        nightDim();

        if (!state.loop) {
            follow();
        }
    }
}

function start() {
    if (document.getElementById('orbem-weather')) {
        return;
    }

    build();
    check();

    // Area changes, spells and the start screen going away, once a second.
    setInterval(check, 1000);
    document.addEventListener('visibilitychange', check);
}

if ('loading' === document.readyState) {
    document.addEventListener('DOMContentLoaded', start);
} else {
    start();
}