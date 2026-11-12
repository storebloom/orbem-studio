/**
 * The other people standing in the same area.
 *
 * @package OrbemStudio
 */

/* global OrbemOrder */

/** Half the character container: stored position plus this is where a player is. */
const ANCHOR = 400;

/** How long a remote player takes to slide to their new position. */
const SMOOTHING = 'left 0.25s linear, top 0.25s linear';

/** One swing is one hit, however many frames it is drawn over. */
const HIT_COOLDOWN = 600;

/** How long somebody else's punch pose is held, so a short one is seen at all. */
const ATTACK_SHOW = 550;

const MOTIONS = ['weapon-swing', 'weapon-thrust', 'weapon-shoot'];

const drawn = new Map();

let settings = { enabled: false, cap: 16, tick: 250, pvp: false, pvpAreas: [], soloAreas: [], socket: '' };
let timer = null;
let socket = null;
let lastArea = '';
let lastRoom = '';
let sending = false;

/** Whether this player has been moved out of the shared rooms for a solo area. */
let soloSent = false;

/** What has been said to the room and not yet carried by a poll. */
const outbox = [];
const OUTBOX_MAX = 20;

/** When it is worth trying the socket again, and how long to wait next time. */
const RETRY_MIN = 2000;
const RETRY_MAX = 30000;
let retryAt = 0;
let retryDelay = RETRY_MIN;

/** This player's attacks, counted. */
/** When the list of fighting areas was last asked for. */
const PVP_REFRESH = 30000;
let pvpAskedAt = 0;

let attacks = 0;
let attackSlot = '';
let watchedWeapon = null;
let watchedCharacter = null;
let attackWatch = null;

function rest() {
    return (window.OrbemOrder && OrbemOrder.siteRESTURL) || '';
}

function nonce() {
    return (window.OrbemOrder && OrbemOrder.orbemNonce) || '';
}

function container() {
    return document.querySelector('.game-container .default-map');
}

/** The area the engine is currently showing, which changes without a reload. */
function currentArea() {
    const box = document.querySelector('.game-container');

    if (!box) return '';

    return (String(box.className).match(/game-container\s+([a-z0-9-]+)/) || [, ''])[1];
}

/** The game's character slug, which every sprite id is prefixed with. */
function characterSlug() {
    return window.mainCharacter || 'main-character';
}

/** `main-character-static-left` -> `static-left`. */
function slotOf(id) {
    const prefix = `${characterSlug()}-`;

    return id.startsWith(prefix) ? id.slice(prefix.length) : '';
}

/** Where this player is, and which of their own sprites is showing. */
function me() {
    const mapChar = document.getElementById('map-character');

    if (!mapChar) return null;

    // Not the one a punch has stepped in front of.
    const engaged = mapChar.querySelector('.map-character-icon.engage:not(.punched)')
        || mapChar.querySelector('.map-character-icon.engage');

    return {
        left: parseInt(mapChar.style.left, 10) || 0,
        top: parseInt(mapChar.style.top, 10) || 0,
        dir: mapChar.dataset.direction || 'down',
        // The slot, not the id: `main-character-static-left` is sent as `static-left`, so the other end resolves it against their own character's images rather than against this one's markup.
        sprite: engaged ? slotOf(engaged.id) : '',
        attack: attacks,
        attackSprite: attackSlot,
        weapon: heldWeapon(),
    };
}

/** What this player is holding, enough for somebody else to draw it. */
function heldWeapon() {
    const weapon = document.querySelector('.map-weapon');
    const overlay = weapon && weapon.querySelector('.weapon-overlay');
    const src = overlay ? overlay.getAttribute('src') : '';

    if (!src || weapon.classList.contains('spell')) {
        return null;
    }

    const px = (value) => parseInt(value, 10) || 0;
    const style = window.getComputedStyle(overlay);

    return {
        src,
        // Whether it is actually on screen here.
        shown: 'none' !== style.display && '0' !== style.opacity && 'hidden' !== style.visibility,
        motion: weapon.dataset.motion || 'swing',
        facing: weapon.dataset.facing || '',
        resting: weapon.dataset.resting || '',
        visibility: weapon.dataset.visibility || '',
        width: px(overlay.style.width),
        height: px(overlay.style.height),
        range: px(weapon.style.getPropertyValue('--weapon-range')),
        offset: px(weapon.style.getPropertyValue('--weapon-vertical-offset')),
    };
}

/** Count this player's attacks as the engine shows them. */
function watchAttacks() {
    const weapon = document.querySelector('.map-weapon');
    const character = document.getElementById('map-character');

    if (weapon === watchedWeapon && character === watchedCharacter) {
        return;
    }

    attackWatch?.disconnect();
    watchedWeapon = weapon;
    watchedCharacter = character;

    attackWatch = new MutationObserver((records) => {
        records.forEach((record) => {
            const el = record.target;
            const was = String(record.oldValue || '');

            if (el === watchedWeapon) {
                const started = MOTIONS.some(motion => el.classList.contains(motion) && !was.split(/\s+/).includes(motion));

                if (started) {
                    struck('');
                }

                return;
            }

            if (el.classList.contains('map-character-icon') && el.classList.contains('engage')
                && !/\bengage\b/.test(was) && /-punch/.test(el.id)) {
                struck(slotOf(el.id));
            }
        });
    });

    if (weapon) {
        attackWatch.observe(weapon, { attributes: true, attributeFilter: ['class'], attributeOldValue: true });
    }

    if (character) {
        attackWatch.observe(character, { attributes: true, attributeFilter: ['class'], attributeOldValue: true, subtree: true });
    }
}

/** An attack began: count it, and say so now rather than at the next tick. */
function struck(slot) {
    attacks++;
    attackSlot = slot;
    tick();
}

/** The sprite to draw somebody else with. */
function spriteFor(slot, direction) {
    const usable = (id) => {
        const el = document.getElementById(id);

        return (el && el.getAttribute('src')) ? el.getAttribute('src') : '';
    };

    const me = characterSlug();

    // Their slot first, then the same fallback chain the engine walks when a character has not been given art for every pose.
    return (slot ? usable(`${me}-${slot}`) : '')
        || usable(`${me}-static-${direction}`)
        || usable(`${me}-static`);
}

/** Somebody's own look, when players have their own (a plugin that lets them supplies `window.orbemLookFor`). */
function lookOf(id) {
    if ('function' !== typeof window.orbemLookFor) {
        return undefined;
    }

    const look = window.orbemLookFor(id);

    return look && look.images ? look : (null === look ? null : undefined);
}

/** A pose from somebody's own look, along the same fallback chain spriteFor walks. */
function lookSprite(look, slot, direction) {
    const images = look.images;

    return (slot ? images[slot] : '')
        || images[`static-${direction}`]
        || images.static
        || '';
}

/** How big a character is drawn in this game. */
function characterSize() {
    const mine = document.querySelector('#map-character .map-character-icon.engage');

    if (!mine || !mine.offsetWidth) {
        return null;
    }

    return { width: mine.offsetWidth, height: mine.offsetHeight };
}

function escapeName(value) {
    return String(value ?? '').replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
}

function makePlayer(player) {
    const el = document.createElement('div');

    el.className = 'orbem-other-player';
    el.dataset.player = String(player.id);
    // Their weapon is the engine's own weapon markup, so it is drawn, aimed and swung by the same styles as the local player's.
    el.innerHTML = `<img alt="" /><div class="map-weapon orbem-other-weapon"><img class="weapon-overlay" alt="" /></div><span class="orbem-other-player-name"></span>`;

    const weapon = el.querySelector('.orbem-other-weapon');

    weapon.style.left = '0';
    weapon.style.top = '0';
    weapon.style.width = '100%';
    weapon.style.height = '100%';
    weapon.style.pointerEvents = 'none';

    // No transform: this element's layout box is what the engine's hit test measures, so it has to be the sprite and nothing else.
    el.style.position = 'absolute';
    el.style.pointerEvents = 'none';
    el.style.transition = SMOOTHING;

    container()?.appendChild(el);

    return el;
}

function paint(players) {
    const seen = new Set();

    const self = Number(settings.me || 0);

    players.forEach((player) => {
        // Never yourself.
        if (self && Number(player.id) === self) {
            return;
        }

        seen.add(player.id);

        let el = drawn.get(player.id);
        let fresh = false;

        if (!el || !el.isConnected) {
            el = makePlayer(player);
            drawn.set(player.id, el);
            fresh = true;
        }

        el._player = player;

        const attack = Number(player.a || 0);

        // Somebody first seen mid-fight has not just attacked; only a count that moves while they are watched is a blow.
        if (!fresh && attack > Number(el._attack || 0)) {
            playAttack(el, player);
        }

        el._attack = attack;

        dressWeapon(el, player);
        drawSprite(el, player);

        const img = el.querySelector(':scope > img');
        const look = lookOf(player.id);

        // The size has to be settled before the position, because the position is worked out from it.
        const size = (look && look.width ? { width: look.width, height: look.height } : null)
            || characterSize()
            || { width: 100, height: 162 };

        img.style.width = `${size.width}px`;
        img.style.height = `${size.height}px`;
        el.style.width = `${size.width}px`;
        el.style.height = `${size.height}px`;

        el.style.left = `${player.l + ANCHOR - Math.round(size.width / 2)}px`;
        el.style.top = `${player.t + ANCHOR - Math.round(size.height / 2)}px`;

        const label = el.querySelector('.orbem-other-player-name');
        const name = escapeName(player.name);

        if (label.textContent !== name) {
            label.textContent = name;
        }
    });

    // Anybody who stopped reporting has left, gone stale or walked into another area.
    drawn.forEach((el, id) => {
        if (!seen.has(id)) {
            el.remove();
            drawn.delete(id);
        }
    });
}

/** The picture for a pose of theirs: their own look's, or the game's character. */
function poseSrc(player, slot) {
    const look = lookOf(player.id);

    return look ? lookSprite(look, slot, player.d) : (null === look ? '' : spriteFor(slot, player.d));
}

/** Their current pose. */
function drawSprite(el, player) {
    if (Date.now() < Number(el._attackUntil || 0)) {
        return;
    }

    const img = el.querySelector(':scope > img');
    const src = poseSrc(player, player.s);

    if (src && img.getAttribute('src') !== src) {
        img.setAttribute('src', src);
    }
}

/** An attack pose, from its first frame. */
let poseTurn = 0;

function freshPose(src) {
    poseTurn++;

    return `${src}${src.includes('?') ? '&' : '?'}orbem-pose=${poseTurn}`;
}

/** Their weapon, as they hold it: shown at rest only if theirs is. */
function dressWeapon(el, player) {
    const weapon = el.querySelector('.orbem-other-weapon');
    const overlay = weapon && weapon.querySelector('.weapon-overlay');
    const held = player.w;

    if (!weapon || !overlay) {
        return;
    }

    if (!held || !held.src) {
        weapon.hidden = true;
        return;
    }

    weapon.hidden = false;

    const set = (name, value) => {
        if (weapon.dataset[name] !== value) {
            weapon.dataset[name] = value;
        }
    };

    set('direction', 'up' === player.d ? 'top' : (player.d || 'down'));
    set('motion', held.motion || 'swing');
    set('facing', held.facing || '');
    set('resting', held.resting || '');
    set('visibility', held.visibility || '');

    if (overlay.getAttribute('src') !== held.src) {
        overlay.setAttribute('src', held.src);
    }

    if (!MOTIONS.some(name => weapon.classList.contains(name))) {
        overlay.style.opacity = false === held.shown ? '0' : '';
    }

    overlay.style.width = held.width ? `${held.width}px` : '';
    overlay.style.height = held.height ? `${held.height}px` : '';
    weapon.style.setProperty('--weapon-range', `${held.range || 0}px`);
    weapon.style.setProperty('--weapon-vertical-offset', `${held.offset || 0}px`);
}

/** Play the blow they just struck: a swing of their weapon, or their punch pose. */
function playAttack(el, player) {
    if (player.as) {
        const src = poseSrc(player, player.as);

        if (!src) {
            return;
        }

        el._attackUntil = Date.now() + ATTACK_SHOW;

        clearTimeout(el._attackTimer);
        el._attackTimer = setTimeout(() => {
            el._attackUntil = 0;

            if (el.isConnected && el._player) {
                drawSprite(el, el._player);
            }
        }, ATTACK_SHOW);

        el.querySelector(':scope > img')?.setAttribute('src', freshPose(src));

        return;
    }

    const weapon = el.querySelector('.orbem-other-weapon');

    if (!weapon || !player.w || !player.w.src) {
        return;
    }

    dressWeapon(el, player);

    const motion = `weapon-${player.w.motion || 'swing'}`;

    const overlay = weapon.querySelector('.weapon-overlay');

    MOTIONS.forEach(name => weapon.classList.remove(name));
    void weapon.offsetWidth;
    overlay.style.opacity = '';
    weapon.classList.add(motion);

    const done = () => {
        weapon.classList.remove(motion);

        if (el._player) {
            dressWeapon(el, el._player);
        }
    };

    overlay.addEventListener('animationend', done, { once: true });
    clearTimeout(el._swingTimer);
    el._swingTimer = setTimeout(done, 600);
}

function clear() {
    drawn.forEach(el => el.remove());
    drawn.clear();
}

// Transports

async function pollOnce(area, at) {
    // One request in flight at a time.
    if (sending) return;

    sending = true;

    // Whatever was said since the last poll goes with this one, and is put back if it does not arrive.
    const said = outbox.splice(0);

    try {
        const res = await fetch(`${rest()}/presence/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce() },
            credentials: 'same-origin',
            body: JSON.stringify({ area, ...at, said }),
        });

        if (!res.ok) {
            outbox.unshift(...said);
            return;
        }

        const data = await res.json();

        if (data && data.success) {
            paint(data.players || []);
            (data.hits || []).forEach(announceHit);
            (data.said || []).forEach(hear);
        }
    } catch (e) {
        // A dropped tick is not worth reporting: the next one says the same thing and this runs several times a second.
    } finally {
        sending = false;
    }
}

function openSocket() {
    if (Date.now() < retryAt) {
        return;
    }

    // Booked before the attempt, not after it fails, so a connection that hangs rather than erroring does not let every tick start another.
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX);
    retryAt = Date.now() + retryDelay + Math.floor(Math.random() * 1000);

    try {
        socket = new WebSocket(settings.socket);
    } catch (e) {
        socket = null;

        return;
    }

    socket.addEventListener('open', () => {
        // Connected, so the next drop starts counting from the short delay again rather than from wherever the last outage left it.
        retryDelay = RETRY_MIN;
        retryAt = 0;
    });

    socket.addEventListener('message', (event) => {
        try {
            const data = JSON.parse(event.data);

            if (data && 'players' in data) {
                paint(data.players || []);
            }

            if (data && data.hit) {
                announceHit(data.hit);
            }

            if (data && Array.isArray(data.said)) {
                data.said.forEach(hear);
            }
        } catch (e) {
            // Not ours, or malformed. Either way there is nothing to draw.
        }
    });

    // Falling back rather than going quiet.
    socket.addEventListener('close', () => {
        socket = null;
    });

    socket.addEventListener('error', () => {
        socket = null;
    });
}

function send(area, at) {
    if (socket && WebSocket.OPEN === socket.readyState) {
        socket.send(JSON.stringify({ type: 'where', area, ...at }));

        return;
    }

    if (settings.socket && !socket) {
        openSocket();
    }

    pollOnce(area, at);
}

function leave(area) {
    if (!area) return;

    const body = JSON.stringify({ area });

    // sendBeacon so leaving actually reaches the server while the page is being torn down, which a fetch at that moment often does not.
    if (navigator.sendBeacon) {
        navigator.sendBeacon(`${rest()}/presence/leave/?_wpnonce=${encodeURIComponent(nonce())}`,
            new Blob([body], { type: 'application/json' }));

        return;
    }

    fetch(`${rest()}/presence/leave/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce() },
        credentials: 'same-origin',
        keepalive: true,
        body,
    }).catch(() => {});
}

// The loop

function tick() {
    const area = currentArea();

    watchAttacks();

    const at = me();

    if (!area || !at) return;

    const room = isSolo(area) ? '' : roomFor(area);

    // Walking through a door does not reload the page.
    if (room !== lastRoom) {
        if (lastRoom) leave(lastRoom);

        clear();
        lastRoom = room;
        soloSent = false;
    }

    if (area !== lastArea) {
        lastArea = area;
        pvpAskedAt = 0;
    }

    refreshPvpAreas();

    // Played alone, or not in a room yet: out of the room just left, and quiet until there is one.
    if (!room) {
        if (!soloSent && socket && WebSocket.OPEN === socket.readyState) {
            socket.send(JSON.stringify({ type: 'where', area: `solo-${settings.me}-${area}`.slice(0, 96), ...at }));
            soloSent = true;
        }

        return;
    }

    send(room, at);
}

/** Who an area is shared with. */
function roomFor(area) {
    if ('function' === typeof window.orbemMultiplayerRoom) {
        const room = window.orbemMultiplayerRoom(area);

        if ('string' === typeof room) {
            return room.replace(/[^a-z0-9-]/gi, '').slice(0, 96);
        }
    }

    return area;
}

/** Whether an area is one played alone. */
function isSolo(area) {
    return (settings.soloAreas || []).includes(area);
}

/** Where fighting is allowed, kept current. */
function refreshPvpAreas() {
    if (Date.now() - pvpAskedAt < PVP_REFRESH) {
        return;
    }

    pvpAskedAt = Date.now();

    fetch(`${rest()}/presence/pvp-areas/`, { credentials: 'same-origin' })
        .then(res => (res.ok ? res.json() : null))
        .then((data) => {
            if (data && Array.isArray(data.pvpAreas)) {
                settings.pvpAreas = data.pvpAreas;
            }

            if (data && Array.isArray(data.soloAreas)) {
                settings.soloAreas = data.soloAreas;
            }
        })
        .catch(() => {});
}

/** Tell the game somebody hit you. */
function announceHit(blow) {
    if (!blow || !blow.damage) {
        return;
    }

    document.dispatchEvent(new CustomEvent('orbem:player-hit', { detail: blow }));
}

/** Whether players may fight in the area being stood in. */
export function pvpAllowed() {
    if (!settings.enabled) return false;

    return !isSolo(currentArea()) && (settings.pvpAreas || []).includes(currentArea());
}

/**
 * Land an attack on anybody standing in it.
 *
 * @param {Element} weaponEl the swing, for the overlap test
 * @param {number} strength what it costs
 * @param {Function} overlaps the engine's own hit test, passed in so the reach of a punch is judged the one way
 */
export function hitPlayersInReach(weaponEl, strength, overlaps) {
    if (!weaponEl || !pvpAllowed() || 'function' !== typeof overlaps) {
        return;
    }

    const now = Date.now();

    drawn.forEach((el, id) => {
        if (now < Number(el.dataset.nextAllowedHit || 0)) {
            return;
        }

        if (!overlaps(weaponEl, el, 0)) {
            return;
        }

        el.dataset.nextAllowedHit = String(now + HIT_COOLDOWN);

        // Shown straight away rather than waited on.
        el.classList.add('is-hit');
        setTimeout(() => el.classList.remove('is-hit'), 220);

        reportHit(id, strength).then((result) => {
            if (result && result.success) {
                return;
            }

            // Refused.
            el.classList.remove('is-hit');
            el.dataset.nextAllowedHit = '0';

            if (result && result.message) {
                console.warn(`[orbem] hit refused: ${result.message}`);
            }
        });
    });
}

/** Tell the server this player hit another one. */
export async function reportHit(victim, damage) {
    if (!pvpAllowed() || !victim) return null;

    try {
        const res = await fetch(`${rest()}/presence/hit/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': nonce() },
            credentials: 'same-origin',
            body: JSON.stringify({ area: currentArea(), victim, damage }),
        });

        return await res.json();
    } catch (e) {
        return null;
    }
}

// Saying things to the room

/**
 * Tell everybody else in your room something happened.
 *
 * @param {object} event small and JSON-safe
 * @return {boolean} whether it was sent
 */
export function say(event) {
    if (!settings.enabled || !lastRoom || !event || 'object' !== typeof event) {
        return false;
    }

    if (socket && WebSocket.OPEN === socket.readyState) {
        socket.send(JSON.stringify({ type: 'say', event }));

        return true;
    }

    outbox.push(event);
    outbox.splice(0, Math.max(0, outbox.length - OUTBOX_MAX));

    return true;
}

function hear(said) {
    if (!said || !said.e || Number(said.from) === Number(settings.me)) {
        return;
    }

    document.dispatchEvent(new CustomEvent('orbem:room-said', {
        detail: { from: Number(said.from), event: said.e },
    }));
}

export function startMultiplayer() {
    settings = (window.OrbemOrder && OrbemOrder.multiplayer) || settings;

    if (!settings.enabled || timer) {
        return;
    }

    if (settings.socket) {
        openSocket();
    }

    timer = setInterval(tick, settings.tick || 250);

    window.orbemRoomSay = say;

    // Leaving for real, rather than waiting to go stale.
    window.addEventListener('pagehide', () => leave(lastRoom));
}

export function stopMultiplayer() {
    clearInterval(timer);
    timer = null;
    socket?.close();
    socket = null;
    leave(lastRoom);
    clear();
}
