<?php
/**
 * Multiplayer: seeing the other people who are here.
 *
 * Off by default, and turned on for a whole game rather than per area — "is
 * this a game you play with other people" is a fact about the game, not
 * something that should change as you walk through a door.
 *
 * WHAT THIS IS AND IS NOT
 *
 * It is presence. Everyone standing in the same area sees everyone else
 * standing in it, moving as they move. It is not a shared simulation: doors,
 * items, enemies and missions stay each player's own, so two people in one
 * room are two games running side by side with the other person drawn in.
 * That is the honest scope of what a WordPress site can keep in step, and it
 * is most of what "there are other people here" feels like.
 *
 * WHY POLLING LIVES HERE
 *
 * A socket server is the better transport and it is not one this plugin can
 * assume: it ships to anyone with a WordPress site, and most of them cannot
 * run a long-lived process next to it. So the engine owns a transport that
 * works everywhere — a REST endpoint you tell where you are and which answers
 * with who else is there — and the network that can run a socket server
 * replaces it by filtering `orbem_multiplayer_transport`. Nothing above this
 * knows which one it got.
 *
 * WHY THE STORE IS A TRANSIENT
 *
 * Presence is worth nothing a moment after it is written, so it never goes in
 * a table. One transient per area holds everybody in it, which is a single
 * read and a single write per tick — and on a site with a persistent object
 * cache, which is what a busy one will have, it never touches the database at
 * all.
 *
 * Two players writing at the same instant can lose one of the two updates.
 * That is left alone deliberately: the cost is one stale tick for one player,
 * the next tick corrects it, and the locking needed to prevent it would cost
 * more than the thing it prevents.
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

class Multiplayer
{
    /** How many other players you may see at once, before the world decides otherwise. */
    public const CAP = 16;

    /** Seconds without a word before somebody is treated as gone. */
    public const STALE = 10;

    /** How often a client should report in, in milliseconds. */
    public const TICK = 250;

    /** Whether fighting is allowed here. Per area, because a town is not an arena. */
    public const PVP_META = 'explore-pvp';

    public $plugin;

    public function __construct($plugin = null)
    {
        $this->plugin = $plugin;
    }

    // =========================================================================
    // Settings
    // =========================================================================

    /** Whether this game is played with other people in it. */
    public static function enabled(): bool
    {
        return 'Yes' === (string) get_option('explore_multiplayer', 'No');
    }

    /**
     * How many other players to draw.
     *
     * A cap rather than everybody, because the cost of a crowd is paid by the
     * slowest device in it. Past the cap the nearest are kept — the people you
     * can see are the people you are next to, which is the useful half of a
     * crowd and the half that would be missed.
     */
    public static function cap(): int
    {
        $cap = (int) get_option('explore_multiplayer_cap', self::CAP);

        return (int) apply_filters('orbem_multiplayer_cap', $cap > 0 ? $cap : self::CAP);
    }

    /**
     * Whether players may fight each other in this area.
     *
     * Off unless the area says otherwise. A builder who has not thought about
     * it has made somewhere to walk around, not somewhere to be killed.
     */
    public static function pvp(string $area): bool
    {
        $post = get_page_by_path($area, OBJECT, 'explore-area');

        if (!$post) {
            return false;
        }

        return 'yes' === strtolower((string) get_post_meta($post->ID, self::PVP_META, true));
    }

    /**
     * Every area where fighting is allowed.
     *
     * Sent up front rather than answered per area, because the socket
     * transport never asks the server a question — it pushes positions and
     * nothing else — and an area change does not reload the page. A client
     * that had to ask would either be wrong for a moment after every door or
     * need a round trip the socket was meant to remove.
     *
     * The list is short by construction: it is the areas a builder deliberately
     * turned fighting on in, not every area that exists.
     */
    public static function pvpAreas(): array
    {
        $areas = get_posts([
            'post_type'      => 'explore-area',
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'no_found_rows'  => true,
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
            'meta_query'     => [['key' => self::PVP_META, 'value' => 'yes']],
        ]);

        return array_map(static fn(\WP_Post $a): string => $a->post_name, $areas);
    }

    /**
     * Every area played alone. None, unless something says otherwise.
     *
     * Sent up front for the same reason as the fighting areas: the client
     * must know the moment it walks through a door, without asking.
     */
    public static function soloAreas(): array
    {
        return array_values(array_unique(array_map('strval', (array) apply_filters('orbem_multiplayer_solo_areas', []))));
    }

    /** What the client needs to know before it starts talking. */
    public static function settings(string $area = ''): array
    {
        return [
            'enabled' => self::enabled(),
            'cap'     => self::cap(),
            'tick'    => (int) apply_filters('orbem_multiplayer_tick', self::TICK),
            'pvp'     => '' !== $area && self::pvp($area),
            'pvpAreas' => self::enabled() ? self::pvpAreas() : [],
            // Areas where nobody else is drawn and you are drawn to nobody,
            // even with multiplayer on: a game meant to be played alone.
            'soloAreas' => self::enabled() ? self::soloAreas() : [],
            // Who "you" are, so a client never draws itself as somebody else.
            'me'      => Explore::playerId(),
            // The network swaps this for a socket url. Empty means "talk to
            // the REST endpoint below", which every install can do.
            'socket'  => (string) apply_filters('orbem_multiplayer_transport', ''),
        ];
    }

    // =========================================================================
    // Who is where
    // =========================================================================

    private static function key(string $area): string
    {
        return 'orbem_presence_' . md5($area);
    }

    /** Everybody currently in one area, the stale ones dropped. */
    private static function roster(string $area): array
    {
        $roster = get_transient(self::key($area));
        $roster = is_array($roster) ? $roster : [];
        $cutoff = time() - self::STALE;

        return array_filter(
            $roster,
            static fn(array $who): bool => (int) ($who['ts'] ?? 0) >= $cutoff
        );
    }

    private static function store(string $area, array $roster): void
    {
        // Twice the stale window, so the key outlives the people in it and a
        // quiet area cleans itself up rather than being swept by anything.
        set_transient(self::key($area), $roster, self::STALE * 2);
    }

    /**
     * Say where you are, and find out who else is here.
     *
     * One call because they are one thought, and because a player who told the
     * world where they were and then asked who was there would be paying for
     * two round trips to learn one thing.
     */
    public static function tick(int $user_id, string $area, array $at): array
    {
        if ($user_id <= 0 || '' === $area || !self::enabled()) {
            return [];
        }

        // Cleaned once, here, so whichever roster answers below is handed
        // the same safe values.
        $at['attack']       = self::attackCount($at['attack'] ?? 0);
        $at['attackSprite'] = self::slot($at['attackSprite'] ?? '');
        $at['weapon']       = self::weapon($at['weapon'] ?? null);
        $at['said']         = self::said($at['said'] ?? []);

        /**
         * Somewhere better to keep the roster.
         *
         * A network running a realtime service has players held in it that
         * this will never see, and two rosters means the people in one are
         * invisible to the people in the other — which is not an edge case:
         * it happens on every reconnect and to anybody whose network will not
         * hold a socket. So whatever answers here answers for everybody, and
         * the transient below is what a plain WordPress install uses because
         * it has nothing else.
         *
         * Returning null means "no, use the built-in one".
         */
        $elsewhere = apply_filters('orbem_multiplayer_roster', null, $user_id, $area, $at);

        if (is_array($elsewhere)) {
            return $elsewhere;
        }

        $roster = self::roster($area);

        $roster[$user_id] = [
            'l'  => (int) ($at['left'] ?? 0),
            't'  => (int) ($at['top'] ?? 0),
            'd'  => self::direction($at['dir'] ?? ''),
            's'  => self::slot($at['sprite'] ?? ''),
            'a'  => $at['attack'],
            'as' => $at['attackSprite'],
            'w'  => $at['weapon'],
            'ts' => time(),
        ];

        self::store($area, $roster);

        unset($roster[$user_id]);

        foreach ($at['said'] as $event) {
            foreach (array_keys($roster) as $other) {
                self::tell((int) $other, $user_id, $event);
            }
        }

        return self::nearest($roster, $at, self::cap());
    }

    /**
     * The name of a sprite slot, and nothing that could be anything else.
     *
     * A slot is how a player says what they look like right now — `static-left`,
     * `down`, `right-punch-sword-heavy`. It is handed back to other clients,
     * which use it to look up an element id, so it is held to the characters an
     * id can contain and a length no real slot reaches. Nothing here needs to
     * know what the slots are, which is the point: art added later works
     * without this changing.
     */
    private static function slot($raw): string
    {
        $slot = is_scalar($raw) ? strtolower((string) $raw) : '';
        $slot = preg_replace('/[^a-z0-9-]/', '', $slot);

        return substr((string) $slot, 0, 64);
    }

    /** How many attacks somebody has thrown: a count, and nothing else. */
    private static function attackCount($raw): int
    {
        return is_numeric($raw) ? max(0, min(1000000000, (int) $raw)) : 0;
    }

    /**
     * What somebody is holding, held to what a weapon can be.
     *
     * Handed back to every other client, which puts the picture in an img and
     * the rest in data attributes and lengths, so each part is kept to the
     * shape it is used as: a web address, a few known words, small numbers.
     */
    private static function weapon($raw): ?array
    {
        if (!is_array($raw)) {
            return null;
        }

        $src = esc_url_raw(is_scalar($raw['src'] ?? null) ? (string) $raw['src'] : '');

        if ('' === $src || strlen($src) > 500) {
            return null;
        }

        $word = static function ($value): string {
            return substr(sanitize_key(is_scalar($value) ? (string) $value : ''), 0, 24);
        };

        $size = static function ($value): int {
            return is_numeric($value) ? max(-2000, min(2000, (int) $value)) : 0;
        };

        $motion = $word($raw['motion'] ?? '');

        return [
            'src'        => $src,
            'shown'      => !empty($raw['shown']),
            'motion'     => in_array($motion, ['swing', 'thrust', 'shoot'], true) ? $motion : 'swing',
            'facing'     => $word($raw['facing'] ?? ''),
            'resting'    => $word($raw['resting'] ?? ''),
            'visibility' => $word($raw['visibility'] ?? ''),
            'width'      => $size($raw['width'] ?? 0),
            'height'     => $size($raw['height'] ?? 0),
            'range'      => $size($raw['range'] ?? 0),
            'offset'     => $size($raw['offset'] ?? 0),
        ];
    }

    /** Only the directions the engine draws, so a client cannot invent one. */
    private static function direction($raw): string
    {
        $dir = sanitize_key(is_scalar($raw) ? (string) $raw : '');

        return in_array($dir, ['up', 'down', 'left', 'right'], true) ? $dir : 'down';
    }

    /**
     * The closest few, named and dressed.
     *
     * Sorted before the cap is applied rather than after, so a crowded area
     * shows you the people around you instead of whichever rows happened to be
     * stored first.
     */
    private static function nearest(array $roster, array $at, int $cap): array
    {
        $left = (int) ($at['left'] ?? 0);
        $top  = (int) ($at['top'] ?? 0);

        uasort($roster, static function (array $a, array $b) use ($left, $top): int {
            $da = (($a['l'] - $left) ** 2) + (($a['t'] - $top) ** 2);
            $db = (($b['l'] - $left) ** 2) + (($b['t'] - $top) ** 2);

            return $da <=> $db;
        });

        $out = [];

        foreach (array_slice($roster, 0, $cap, true) as $id => $who) {
            $out[] = [
                'id'   => (int) $id,
                'l'    => (int) $who['l'],
                't'    => (int) $who['t'],
                'd'    => (string) $who['d'],
                's'    => (string) ($who['s'] ?? ''),
                'a'    => (int) ($who['a'] ?? 0),
                'as'   => (string) ($who['as'] ?? ''),
                'w'    => $who['w'] ?? null,
                'name' => self::nameOf((int) $id),
            ];
        }

        return $out;
    }

    /**
     * What to call somebody.
     *
     * Their display name, or the name they typed at the start screen if the
     * game asks for one — the same name their own dialogue uses, so a player
     * is called one thing everywhere.
     */
    private static function nameOf(int $user_id): string
    {
        $chosen = (string) get_user_meta($user_id, 'explore_player_name', true);

        if ('' !== $chosen) {
            return $chosen;
        }

        $user = get_userdata($user_id);

        return $user ? $user->display_name : '';
    }

    /**
     * Who is standing in an area, by id.
     *
     * Asked separately from tick() because asking that would also announce the
     * asker as being somewhere, and checking whether a punch is allowed should
     * not move anybody. The filter exists for the same reason tick()'s does: a
     * network holding its roster in a realtime service has players in it this
     * will never see, and validating a hit against a list that is missing half
     * the world refuses hits that plainly landed.
     *
     * @return int[]
     */
    public static function present(string $area): array
    {
        $elsewhere = apply_filters('orbem_multiplayer_present', null, $area);

        if (is_array($elsewhere)) {
            return array_map('intval', $elsewhere);
        }

        return array_map('intval', array_keys(self::roster($area)));
    }

    /** Leave, without waiting to go stale. */
    public static function leave(int $user_id, string $area): void
    {
        if ($user_id <= 0 || '' === $area) {
            return;
        }

        $roster = self::roster($area);

        if (!isset($roster[$user_id])) {
            return;
        }

        unset($roster[$user_id]);
        self::store($area, $roster);
    }

    // =========================================================================
    // Fighting
    // =========================================================================

    /** Where a player's unread hits wait for them. */
    private static function inbox(int $user_id): string
    {
        return 'orbem_hits_' . $user_id;
    }

    /**
     * One player hits another.
     *
     * The attacker's browser decides it connected and says so; this decides
     * whether it was allowed to and passes it on. That split is deliberate:
     * the engine already resolves a hit in the browser and duplicating its
     * collision on the server would mean two rules to keep in step, so what is
     * checked here is everything a lie could gain — that the area allows
     * fighting, that the victim is really in it, and that the damage is a
     * number this game hands out.
     *
     * WHY THIS DOES NOT SUBTRACT THE HEALTH
     *
     * The victim's own browser does, through the same path an enemy's punch
     * takes. That is worth more than doing it here: being hurt already means
     * the hurt animation, the HUD, the death that follows and everything a
     * world hangs off dying, and a second place that writes health would be a
     * second place all of that has to be remembered. One writer, one pipeline,
     * and a hit from a player is a hit like any other by the time it lands.
     *
     * A modified client can claim a hit it did not land, and a modified victim
     * can ignore one. Those are the same trade in both directions, taken with
     * eyes open while worlds are small and played among people who chose to be
     * there together, and the shape below is where an authoritative check goes
     * when it stops being true.
     */
    public static function hit(int $attacker, int $victim, string $area, int $damage): array
    {
        if (!self::enabled() || !self::pvp($area)) {
            return ['success' => false, 'message' => __('Not here.', 'orbem-studio')];
        }

        if ($attacker <= 0 || $victim <= 0 || $attacker === $victim) {
            return ['success' => false, 'message' => __('Nobody to hit.', 'orbem-studio')];
        }

        // Both have to be standing in the same room. It is the same roster the
        // drawing uses, so anybody you can see you can hit and anybody you
        // cannot, you cannot — which only holds if it really is the same one.
        $present = self::present($area);

        if (!in_array($attacker, $present, true) || !in_array($victim, $present, true)) {
            return ['success' => false, 'message' => __('Nobody to hit.', 'orbem-studio')];
        }

        $damage = max(1, min((int) apply_filters('orbem_multiplayer_max_damage', 25), $damage));

        $blow = [
            'from'   => $attacker,
            'name'   => self::nameOf($attacker),
            'damage' => $damage,
            'at'     => time(),
        ];

        self::deliver($victim, $blow);

        /**
         * Somebody was hit by somebody else.
         *
         * Where a world hangs what a fight means — who gets the credit, what
         * the loser drops, whether it is worth logging — and where the socket
         * transport picks the blow up to push it straight at the victim.
         */
        do_action('orbem_multiplayer_hit', $victim, $blow, $area);

        return ['success' => true, 'victim' => $victim, 'damage' => $damage];
    }

    /**
     * Leave a hit where the victim will find it.
     *
     * The queue is what the polling transport reads on its next tick. A socket
     * client is told directly and never looks, so the entry expires unread —
     * which is why this is a short-lived transient and not a table. Being hit
     * while your browser is shut is a hit that did not happen, and that is the
     * right answer rather than a punch waiting for you tomorrow.
     */
    private static function deliver(int $victim, array $blow): void
    {
        $waiting = get_transient(self::inbox($victim));
        $waiting = is_array($waiting) ? $waiting : [];

        // A cap, so a flood cannot grow one player's row without limit.
        $waiting[] = $blow;
        $waiting = array_slice($waiting, -20);

        set_transient(self::inbox($victim), $waiting, self::STALE * 2);
    }

    // =========================================================================
    // Said to the room
    // =========================================================================

    /** What has been said to a player's room and not yet carried back to them. */
    private static array $heard = [];

    /**
     * What a client says to its room, kept small: at most 20 things a tick,
     * each an object of no more than a kilobyte. The engine relays it and does
     * not read it — whatever listens decides what it means.
     */
    private static function said($raw): array
    {
        $out = [];

        foreach (array_slice(is_array($raw) ? $raw : [], 0, 20) as $event) {
            if (is_array($event) && $event && strlen((string) wp_json_encode($event)) <= 1024) {
                $out[] = $event;
            }
        }

        return $out;
    }

    private static function saidBox(int $user_id): string
    {
        return 'orbem_said_' . $user_id;
    }

    /** Leave something said to the room for one of the others in it. */
    private static function tell(int $to, int $from, array $event): void
    {
        $waiting = get_transient(self::saidBox($to));
        $waiting = is_array($waiting) ? $waiting : [];

        $waiting[] = ['from' => $from, 'e' => $event];

        set_transient(self::saidBox($to), array_slice($waiting, -100), self::STALE * 2);
    }

    /**
     * Something said to this player's room that arrived some other way — from
     * a realtime service holding the roster (see orbem_multiplayer_roster).
     */
    public static function heard(array $said): void
    {
        foreach ($said as $one) {
            if (is_array($one) && isset($one['from'], $one['e']) && is_array($one['e'])) {
                self::$heard[] = ['from' => (int) $one['from'], 'e' => $one['e']];
            }
        }
    }

    /** Take what was said to this player's room since they last asked. */
    public static function drainSaid(int $user_id): array
    {
        $waiting = get_transient(self::saidBox($user_id));
        $heard   = self::$heard;

        self::$heard = [];

        if (is_array($waiting) && $waiting) {
            delete_transient(self::saidBox($user_id));
            $heard = array_merge($waiting, $heard);
        }

        return $heard;
    }

    /** Take this player's unread hits and leave the queue empty. */
    public static function drain(int $user_id): array
    {
        $waiting = get_transient(self::inbox($user_id));

        if (!is_array($waiting) || !$waiting) {
            return [];
        }

        delete_transient(self::inbox($user_id));

        return $waiting;
    }

    // =========================================================================
    // REST
    // =========================================================================

    /**
     * @action rest_api_init
     */
    public function registerRoutes(): void
    {
        $namespace = 'orbemorder/v1';

        register_rest_route($namespace, '/presence/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restTick'],
            'permission_callback' => '__return_true',
        ]);

        // Where fighting is allowed, asked again now and then: it can be
        // switched while people are playing, and the page is not reloaded.
        register_rest_route($namespace, '/presence/pvp-areas/', [
            'methods'             => 'GET',
            'callback'            => [$this, 'restPvpAreas'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($namespace, '/presence/leave/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restLeave'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route($namespace, '/presence/hit/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restHit'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function restTick(\WP_REST_Request $request): \WP_REST_Response
    {
        $data = (array) $request->get_json_params();
        $area = sanitize_title((string) ($data['area'] ?? ''));

        $player = Explore::playerId();

        return rest_ensure_response([
            'success' => true,
            'players' => self::tick($player, $area, [
                'left'   => $data['left'] ?? 0,
                'top'    => $data['top'] ?? 0,
                'dir'    => $data['dir'] ?? '',
                'sprite' => $data['sprite'] ?? '',
                'attack' => $data['attack'] ?? 0,
                'attackSprite' => $data['attackSprite'] ?? '',
                'weapon' => $data['weapon'] ?? null,
                'said'   => $data['said'] ?? [],
            ]),
            // Anything that hit them since they last asked. The socket
            // transport gets these pushed instead and never reads this.
            'hits'    => self::drain($player),
            // And what the others in the room said, the same way.
            'said'    => self::drainSaid($player),
            'pvp'     => '' !== $area && self::pvp($area),
        ]);
    }

    public function restPvpAreas(): \WP_REST_Response
    {
        return rest_ensure_response([
            'success'  => true,
            'pvpAreas' => self::enabled() ? self::pvpAreas() : [],
            // Areas where nobody else is drawn and you are drawn to nobody,
            // even with multiplayer on: a game meant to be played alone.
            'soloAreas' => self::enabled() ? self::soloAreas() : [],
        ]);
    }

    public function restLeave(\WP_REST_Request $request): \WP_REST_Response
    {
        $data = (array) $request->get_json_params();

        self::leave(Explore::playerId(), sanitize_title((string) ($data['area'] ?? '')));

        return rest_ensure_response(['success' => true]);
    }

    public function restHit(\WP_REST_Request $request): \WP_REST_Response
    {
        $data = (array) $request->get_json_params();

        return rest_ensure_response(self::hit(
            Explore::playerId(),
            (int) ($data['victim'] ?? 0),
            sanitize_title((string) ($data['area'] ?? '')),
            (int) ($data['damage'] ?? 0)
        ));
    }
}
