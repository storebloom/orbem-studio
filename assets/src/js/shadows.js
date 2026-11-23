/* global OrbemOrder */

const ASPECT = 6 / 35;
const BASE_SHARE = 0.35;
const BASE_OVER = 1.08;
const ALPHA = 40;
const SAMPLE = 256;
const shapes = new Map();
const waiting = new Map();

function readable(src) {
    try {
        const url = new URL(src, window.location.href);

        if (url.origin !== window.location.origin && url.pathname.startsWith('/wp-content/')) {
            return window.location.origin + url.pathname + url.search;
        }
    } catch (e) {
        return src;
    }

    return src;
}

function shapeOf(src, onReady) {
    if (!src) {
        return null;
    }

    if (shapes.has(src)) {
        if (!shapes.get(src) && onReady && waiting.has(src)) {
            waiting.get(src).push(onReady);
        }

        return shapes.get(src);
    }

    shapes.set(src, null);
    waiting.set(src, onReady ? [onReady] : []);

    const probe = new Image();

    probe.onload = () => {
        try {
            const scale = Math.min(1, SAMPLE / Math.max(probe.naturalWidth, probe.naturalHeight));
            const w = Math.max(1, Math.round(probe.naturalWidth * scale));
            const h = Math.max(1, Math.round(probe.naturalHeight * scale));
            const canvas = document.createElement('canvas');

            canvas.width = w;
            canvas.height = h;

            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            ctx.drawImage(probe, 0, 0, w, h);

            const data = ctx.getImageData(0, 0, w, h).data;
            const rows = [];
            let top = -1;
            let feet = -1;
            let left = w;
            let right = -1;

            for (let y = 0; y < h; y++) {
                let a = w;
                let b = -1;

                for (let x = 0; x < w; x++) {
                    if (data[(y * w + x) * 4 + 3] > ALPHA) {
                        a = Math.min(a, x);
                        b = x;
                    }
                }

                rows.push([a, b]);

                if (b >= 0) {
                    top = top < 0 ? y : top;
                    feet = y;
                    left = Math.min(left, a);
                    right = Math.max(right, b);
                }
            }

            if (feet < 0) {
                return;
            }

            const from = Math.max(top, feet - Math.max(1, Math.round((feet - top + 1) * BASE_SHARE)));
            let baseLeft = w;
            let baseRight = -1;

            for (let y = from; y <= feet; y++) {
                if (rows[y][1] >= 0) {
                    baseLeft = Math.min(baseLeft, rows[y][0]);
                    baseRight = Math.max(baseRight, rows[y][1]);
                }
            }

            shapes.set(src, {
                ratio: probe.naturalWidth / probe.naturalHeight,
                left: left / w,
                right: (right + 1) / w,
                baseLeft: baseLeft / w,
                baseRight: (baseRight + 1) / w,
                feet: (feet + 1) / h,
            });
            (waiting.get(src) || []).forEach(fn => fn(shapes.get(src)));
        } catch (e) {
            shapes.set(src, null);
        }

        waiting.delete(src);
    };
    probe.src = readable(src);

    return null;
}

function offset(value, room) {
    const word = { left: 0, top: 0, center: 50, right: 100, bottom: 100 }[value];

    if (undefined !== word) {
        return room * word / 100;
    }

    return String(value).endsWith('%') ? room * parseFloat(value) / 100 : parseFloat(value) || 0;
}

function drawnRect(box, size, position, shape) {
    const W = box.w;
    const H = box.h;
    let w = W;
    let h = H;

    if ('contain' === size || 'cover' === size) {
        w = 'contain' === size ? Math.min(W, H * shape.ratio) : Math.max(W, H * shape.ratio);
        h = w / shape.ratio;
    }

    const [px = '50%', py = '50%'] = String(position || '').split(/\s+/);

    return { x: box.x + offset(px, W - w), y: box.y + offset(py, H - h), w, h };
}

function ovalFor(shape, rect, pct) {
    if (!shape) {
        const width = rect.w * pct / 100;
        const height = Math.max(4, Math.min(width * 0.45, Math.max(width * ASPECT, 10)));

        return { left: rect.x + (rect.w - width) / 2, top: rect.y + rect.h - height, width, height };
    }

    const base = (shape.baseRight - shape.baseLeft) * rect.w;
    const drawn = (shape.right - shape.left) * rect.w;
    const width = Math.max(drawn * 0.7, base * BASE_OVER, Math.min(base * 4, 48), 16) * pct / 70;
    const height = Math.max(4, Math.min(width * 0.45, Math.max(width * ASPECT, 10)));

    return {
        left: rect.x + (shape.baseLeft + shape.baseRight) / 2 * rect.w - width / 2,
        top: rect.y + shape.feet * rect.h - height * 0.9,
        width,
        height,
    };
}

const SETTINGS = (window.OrbemOrder && OrbemOrder.shadows) || {};
const KINDS = {
    'explore-point': 'item',
    'explore-weapon': 'item',
    'explore-area': 'item',
    'explore-character': 'character',
    'explore-enemy': 'enemy',
};
const ovals = new Map();

let layer = null;

window.orbemShadowShape = { shapeOf, drawnRect, ovalFor };

function percentOf(el, kind) {
    const own = el.dataset.shadow;

    if (undefined !== own && '' !== own) {
        return Number(own) || 0;
    }

    if ('function' === typeof window.orbemShadowFor) {
        const given = window.orbemShadowFor(el, kind);

        if (null !== given && undefined !== given) {
            return Number(given) || 0;
        }
    }

    if ('player' === kind) {
        return null !== SETTINGS.player && undefined !== SETTINGS.player ? Number(SETTINGS.player) || 0 : Number(SETTINGS.character) || 0;
    }

    return Number(SETTINGS[kind]) || 0;
}

function shown(el) {
    if (el.checkVisibility) {
        return el.checkVisibility({ opacityProperty: true, visibilityProperty: true });
    }

    return null !== el.offsetParent;
}

function backgroundOf(el) {
    const key = el.getAttribute('style') || '';

    if (el._orbemShadowBg && el._orbemShadowBg.key === key) {
        return el._orbemShadowBg;
    }

    const css = getComputedStyle(el);
    const match = /url\(["']?(.*?)["']?\)/.exec(css.backgroundImage || '');

    el._orbemShadowBg = { key, src: match ? match[1] : '', size: css.backgroundSize, position: css.backgroundPosition };

    return el._orbemShadowBg;
}

function spriteOf(el) {
    const img = el.querySelector('img.engage') || el.querySelector('img');

    return img && shown(img) ? img : null;
}

function measure(el, kind, origin, scale) {
    const pct = percentOf(el, kind);

    if (!(pct > 0) || !shown(el)) {
        return null;
    }

    const toMap = (r) => ({ x: (r.left - origin.left) / scale, y: (r.top - origin.top) / scale, w: r.width / scale, h: r.height / scale });

    if ('item' === kind) {
        const picture = backgroundOf(el);

        if (!picture.src) {
            return null;
        }

        const box = { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
        const shape = shapeOf(picture.src);

        return ovalFor(shape, shape ? drawnRect(box, picture.size, picture.position, shape) : box, pct);
    }

    const img = spriteOf(el);

    if (!img) {
        return null;
    }

    const rect = img.getBoundingClientRect();

    if (!rect.width || !rect.height) {
        return null;
    }

    const src = img.getAttribute('data-look-src') || img.currentSrc || img.src;

    return ovalFor(shapeOf(src), toMap(rect), pct);
}

function ensureLayer(map) {
    if (layer && layer.parentNode === map) {
        return layer;
    }

    layer = document.createElement('div');
    layer.className = 'orbem-shadows';
    layer.setAttribute('aria-hidden', 'true');
    map.prepend(layer);

    return layer;
}

function frame() {
    const map = document.querySelector('.game-container .default-map');

    if (map && map.offsetWidth) {
        const origin = map.getBoundingClientRect();
        const scale = origin.width / map.offsetWidth || 1;
        const wanted = new Map();

        for (const el of map.children) {
            const kind = KINDS[el.dataset.genre];

            if (kind && el.id) {
                const at = measure(el, kind, origin, scale);

                if (at) {
                    wanted.set(el.id, at);
                }
            }
        }

        const player = document.getElementById('map-character');

        if (player) {
            const at = measure(player, 'player', origin, scale);

            if (at) {
                wanted.set('map-character', at);
            }
        }

        const into = ensureLayer(map);

        ovals.forEach((oval, id) => {
            if (!wanted.has(id) || oval.parentNode !== into) {
                oval.remove();
                ovals.delete(id);
            }
        });

        wanted.forEach((at, id) => {
            let oval = ovals.get(id);

            if (!oval) {
                oval = document.createElement('span');
                oval.className = 'orbem-shadow';
                oval.dataset.for = id;
                into.appendChild(oval);
                ovals.set(id, oval);
            }

            const next = `${Math.round(at.left)},${Math.round(at.top)},${Math.round(at.width)},${Math.round(at.height)}`;

            if (oval._at !== next) {
                oval._at = next;
                Object.assign(oval.style, { left: `${Math.round(at.left)}px`, top: `${Math.round(at.top)}px`, width: `${Math.round(at.width)}px`, height: `${Math.round(at.height)}px` });
            }
        });
    }

    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
