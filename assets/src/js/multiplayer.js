/**
 * The other people standing in the same area.
 *
 * WHAT IS SHARED AND WHAT IS NOT
 *
 * Only where somebody is and which way they are facing. Doors, items, enemies
 * and missions stay each player's own, so two people in one room are two games
 * running side by side with the other person drawn in. That is the honest
 * scope of what a WordPress site can keep in step, and it is most of what
 * "there are other people here" feels like.
 *
 * TWO TRANSPORTS, ONE SHAPE
 *
 * A socket is the better way to do this and not one the engine can assume:
 * this plugin ships to anyone with a WordPress site and most of them cannot
 * run a long-lived process beside it. So the default is a poll — tell the
 * server where you are, it answers with who else is there — and a network that
 * can run a socket server hands one over in `OrbemOrder.multiplayer.socket`.
 * Everything below the transport is identical either way, and the poll is what
 * runs if the socket drops.
 *
 * WHERE THE OTHER PLAYERS ARE DRAWN
 *
 * At the same offset the local player is. A stored position is the corner of
 * the 800px container the engine gives a character, and the sprite is centred
 * in it, so a remote player drawn at their stored position would sit 400px up
 * and left of where that player actually is. Their centre is the one number
 * both sides agree on, and it is converted to a top-left here.
 *
 * Converted rather than centred with a transform, which is what this did
 * first. `elementsOverlap` — the engine's hit test, and the thing that decides
 * whether a swing landed — reads `offsetLeft` and `offsetTop`, and those
 * report the position *before* a transform is applied. A player centred by
 * `translate(-50%, -50%)` therefore measured as a box starting at their middle
 * and extending down and right, so every punch was tested against the wrong
 * half of them. The element is given the sprite's exact size for the same
 * reason: its own box has to be the thing being aimed at.
 *
 * They are deliberately not `.map-item`. That class is what the movement code
 * collects as walls, and a player who can be shoved into a corner by somebody
 * else's lag is worse than one you can walk through.
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

/**
 * When it is worth trying the socket again, and how long to wait next time.
 *
 * A socket server that is restarting gets one reconnection attempt per client
 * per few seconds, not one per tick. Without this every client in the world
 * retries four times a second for as long as it is down, which is the moment
 * it can least afford the traffic — and they all retry in step, because they
 * all noticed at the same time.
 *
 * The delay doubles up to a ceiling, and the jitter spreads the herd so a
 * server coming back up is not hit by everybody at once.
 */
const RETRY_MIN = 2000;
const RETRY_MAX = 30000;
let retryAt = 0;
let retryDelay = RETRY_MIN;

/**
 * This player's attacks, counted.
 *
 * A count rather than an "attacking" flag: a swing is over in about a fifth
 * of a second and a report goes out four times a second, so a flag is
 * missed as often as it is seen. A number that only goes up cannot be
 * missed — whoever sees it move knows a blow was struck since they last
 * looked, and plays it.
 */
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

/**
 * Where this player is, and which of their own sprites is showing.
 *
 * The sprite rather than a description of it. The engine already decides what
 * a character looks like from moment to moment — walking this way, standing
 * that way, mid-punch, hurt, holding a particular weapon — and it says so by
 * engaging one image out of the set. Sending which one it engaged means the
 * other end mirrors every one of those states without knowing what any of them
 * mean, and attack and hurt poses arrive for nothing the day they are added.
 *
 * The first attempt inferred movement from whether the position had changed
 * since the last message. That is wrong twice over: the engine holds a walking
 * frame while a key is held rather than re-deciding per frame, and the socket
 * pushes more often than a player reports, so every frame that carried no new
 * position read as "stopped" and the sprite flickered between walking and
 * standing several times a second.
 */
function me() {
    const mapChar = document.getElementById('map-character');

    if (!mapChar) return null;

    // Not the one a punch has stepped in front of: the engine leaves the
    // walking sprite engaged under the punch, and it comes first.
    const engaged = mapChar.querySelector('.map-character-icon.engage:not(.punched)')
        || mapChar.querySelector('.map-character-icon.engage');

    return {
        left: parseInt(mapChar.style.left, 10) || 0,
        top: parseInt(mapChar.style.top, 10) || 0,
        dir: mapChar.dataset.direction || 'down',
        // The slot, not the id: `main-character-static-left` is sent as
        // `static-left`, so the other end resolves it against their own
        // character's images rather than against this one's markup.
        sprite: engaged ? slotOf(engaged.id) : '',
        attack: attacks,
        attackSprite: attackSlot,
        weapon: heldWeapon(),
    };
}

/**
 * What this player is holding, enough for somebody else to draw it.
 *
 * Read off the engine's own weapon element, so whatever decides how a
 * weapon looks — its picture, the way it swings, which way the art points,
 * where it rests — is said once, there, and copied rather than restated.
 */
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
        // Whether it is actually on screen here: a look with the weapon
        // drawn into it hides the floating one, and the copy should too.
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

/**
 * Count this player's attacks as the engine shows them.
 *
 * Watched rather than hooked: the engine starts a swing by giving its weapon
 * a motion class, and a punch by engaging a punch sprite, and both are
 * visible from here without the engine having to tell anybody. Re-attached
 * when either element is replaced.
 */
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

/**
 * The sprite to draw somebody else with.
 *
 * The game's own main character, because which character is played is a
 * setting of the game rather than a choice each player makes — so everybody in
 * one world really does look the same, and this is accurate rather than a
 * stand-in. Where people bring their own look, lookOf answers first.
 *
 * Walking or standing, because a character that slides across the ground in a
 * standing pose reads as floating rather than moving. The engine ships both —
 * a gif per direction for walking and a still per direction for stopping — and
 * uses exactly this pair for the local player.
 *
 * Falls back along the same chain the engine's own does: the named sprite if
 * it has art, otherwise the plain static, because a character may only have
 * been given one frame.
 */
function spriteFor(slot, direction) {
    const usable = (id) => {
        const el = document.getElementById(id);

        return (el && el.getAttribute('src')) ? el.getAttribute('src') : '';
    };

    const me = characterSlug();

    // Their slot first, then the same fallback chain the engine walks when a
    // character has not been given art for every pose: the still for the way
    // they are facing, then the plain still.
    return (slot ? usable(`${me}-${slot}`) : '')
        || usable(`${me}-static-${direction}`)
        || usable(`${me}-static`);
}

/**
 * Somebody's own look, when players have their own (a plugin that lets them
 * supplies `window.orbemLookFor`).
 *
 * The answer is { images: {slot: url}, width, height } to draw them with; null
 * while it is still being found out — they are drawn without a picture for
 * that moment rather than briefly as somebody else; and undefined when there
 * is nobody to ask, which is every world where everybody is the game's own
 * character and spriteFor is exactly right.
 */
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

/**
 * How big a character is drawn in this game.
 *
 * Taken from the local player's own sprite rather than left to the image's
 * natural size. The engine sizes a character from the game's settings and the
 * art is usually much larger than it is displayed, so an unsized copy of the
 * same file comes out several times life size — which is what happened the
 * first time this drew anybody.
 */
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
    // Their weapon is the engine's own weapon markup, so it is drawn, aimed
    // and swung by the same styles as the local player's. It sits inside
    // the map, after the player's own weapon in the page, so the engine's
    // `querySelector('.map-weapon')` still finds the player's.
    el.innerHTML = `<img alt="" /><div class="map-weapon orbem-other-weapon"><img class="weapon-overlay" alt="" /></div><span class="orbem-other-player-name"></span>`;

    const weapon = el.querySelector('.orbem-other-weapon');

    weapon.style.left = '0';
    weapon.style.top = '0';
    weapon.style.width = '100%';
    weapon.style.height = '100%';
    weapon.style.pointerEvents = 'none';

    // No transform: this element's layout box is what the engine's hit test
    // measures, so it has to be the sprite and nothing else.
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
        // Never yourself. The server should not send you, and does not mean
        // to — this is the last word on it, for a refresh whose old page has
        // not finished leaving.
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

        // Somebody first seen mid-fight has not just attacked; only a count
        // that moves while they are watched is a blow.
        if (!fresh && attack > Number(el._attack || 0)) {
            playAttack(el, player);
        }

        el._attack = attack;

        dressWeapon(el, player);
        drawSprite(el, player);

        const img = el.querySelector(':scope > img');
        const look = lookOf(player.id);

        // The size has to be settled before the position, because the position
        // is worked out from it.
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

    // Anybody who stopped reporting has left, gone stale or walked into
    // another area. All three mean the same thing here.
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

/** Their current pose. A punch being shown is left alone until it is over. */
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

/**
 * An attack pose, from its first frame.
 *
 * Attack art plays once. An img given the same address again does not play it
 * again — the browser keeps one animation per address, finished — so the
 * first punch somebody threw was the only one anybody saw, and every one after
 * it was the last frame, standing there. A new query is a new address and a
 * new animation.
 *
 * A query rather than a blob: copy, which would save the small re-download:
 * the address still names the file, and styles that size a picture by its
 * name (a padded frame drawn larger than the body's box) still find it.
 */
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

// =============================================================================
// Transports
// =============================================================================

async function pollOnce(area, at) {
    // One request in flight at a time. A slow answer must not stack up a queue
    // of stale positions behind it.
    if (sending) return;

    sending = true;

    // Whatever was said since the last poll goes with this one, and is put
    // back if it does not arrive.
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
        // A dropped tick is not worth reporting: the next one says the same
        // thing and this runs several times a second.
    } finally {
        sending = false;
    }
}

function openSocket() {
    if (Date.now() < retryAt) {
        return;
    }

    // Booked before the attempt, not after it fails, so a connection that
    // hangs rather than erroring does not let every tick start another.
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX);
    retryAt = Date.now() + retryDelay + Math.floor(Math.random() * 1000);

    try {
        socket = new WebSocket(settings.socket);
    } catch (e) {
        socket = null;

        return;
    }

    socket.addEventListener('open', () => {
        // Connected, so the next drop starts counting from the short delay
        // again rather than from wherever the last outage left it.
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

    // Falling back rather than going quiet. A socket that will not stay up is
    // worse than a poll, and the poll needs nothing to be running anywhere.
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

    // sendBeacon so leaving actually reaches the server while the page is
    // being torn down, which a fetch at that moment often does not.
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

// =============================================================================
// The loop
// =============================================================================

function tick() {
    const area = currentArea();

    watchAttacks();

    const at = me();

    if (!area || !at) return;

    const room = isSolo(area) ? '' : roomFor(area);

    // Walking through a door does not reload the page. The people in the room
    // just left are not in this one, so they go before the first tick of the
    // new room rather than lingering until they time out.
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

    // Played alone, or not in a room yet: out of the room just left, and quiet
    // until there is one. A socket is moved into a room of its own, because it
    // is only taken out of the last one by being put somewhere else.
    if (!room) {
        if (!soloSent && socket && WebSocket.OPEN === socket.readyState) {
            socket.send(JSON.stringify({ type: 'where', area: `solo-${settings.me}-${area}`.slice(0, 96), ...at }));
            soloSent = true;
        }

        return;
    }

    send(room, at);
}

/**
 * Who an area is shared with. Everybody in it, unless something splits it
 * into rooms of its own (window.orbemMultiplayerRoom, given the area and
 * answering a room name, or '' for none yet).
 */
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

/**
 * Where fighting is allowed, kept current.
 *
 * Sent with the page, but a builder can switch an area while everybody is
 * playing in it, and nobody's page reloads. So it is asked again on the way
 * into every area and every half minute — a small GET, nothing like the
 * traffic of a position.
 */
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

/**
 * Tell the game somebody hit you.
 *
 * An event rather than a call, because what being hurt means belongs to the
 * engine — the animation, the HUD, the death and everything a world hangs off
 * dying — and this module has no business knowing any of it. It says what
 * happened; explore.js decides what that does.
 *
 * The same event fires whichever transport carried the blow, so being hit
 * feels identical on a socket and on a poll.
 */
function announceHit(blow) {
    if (!blow || !blow.damage) {
        return;
    }

    document.dispatchEvent(new CustomEvent('orbem:player-hit', { detail: blow }));
}

/**
 * Whether players may fight in the area being stood in.
 *
 * From the list sent at load rather than from an answer to a question. The
 * socket transport never asks the server anything — it pushes positions — and
 * walking through a door does not reload the page, so anything read from a
 * reply would be stale for whichever area was entered last.
 */
export function pvpAllowed() {
    if (!settings.enabled) return false;

    return !isSolo(currentArea()) && (settings.pvpAreas || []).includes(currentArea());
}

/**
 * Land an attack on anybody standing in it.
 *
 * Given the strength the engine already worked out for this swing, so a punch
 * costs a player exactly what it costs an enemy and there is no second damage
 * table to keep in step.
 *
 * The per-target cooldown is the same idea the enemy path uses: one swing is
 * one hit, however many frames it is drawn over, and a held attack cannot be
 * turned into a stream of them.
 *
 * @param {Element}  weaponEl the swing, for the overlap test
 * @param {number}   strength what it costs
 * @param {Function} overlaps the engine's own hit test, passed in so the
 *                            reach of a punch is judged the one way
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

        // Shown straight away rather than waited on: the damage lands on their
        // machine, so the round trip only ever confirms that the swing was
        // allowed, and a punch that waits for permission feels dead.
        el.classList.add('is-hit');
        setTimeout(() => el.classList.remove('is-hit'), 220);

        reportHit(id, strength).then((result) => {
            if (result && result.success) {
                return;
            }

            // Refused. Take the flash back and let the next swing through,
            // because a hit that did not happen should not look like one that
            // did — that is what made a whole broken fight look like a working
            // one with no damage.
            el.classList.remove('is-hit');
            el.dataset.nextAllowedHit = '0';

            if (result && result.message) {
                console.warn(`[orbem] hit refused: ${result.message}`);
            }
        });
    });
}

/**
 * Tell the server this player hit another one.
 *
 * The browser decides it connected; the server decides whether that was
 * allowed and what it cost. See the note on Multiplayer::hit() in PHP for why
 * the split is where it is.
 */
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

// =============================================================================
// Saying things to the room
// =============================================================================

/**
 * Tell everybody else in your room something happened — an enemy hurt, a door
 * gone — so a game played together can be one game rather than two side by
 * side. The engine relays it and nothing more: what it means is up to whoever
 * listens for `orbem:room-said`. Nothing is said while you are in no room
 * (played alone, or still waiting for a group).
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

    // Leaving for real, rather than waiting to go stale. pagehide rather than
    // unload because it is the one that fires on mobile.
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
