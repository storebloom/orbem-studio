<?php
/**
 * Multiplayer: seeing the other people who are here.
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

    /** Whether fighting is allowed here. */
    public const PVP_META = 'explore-pvp';

    public $plugin;

    public function __construct($plugin = null)
    {
        $this->plugin = $plugin;
    }

    // Settings

    /** Whether this game is played with other people in it. */
    public static function enabled(): bool
    {
        return 'Yes' === (string) get_option('explore_multiplayer', 'No');
    }

    /** How many other players to draw. */
    public static function cap(): int
    {
        $cap = (int) get_option('explore_multiplayer_cap', self::CAP);

        return (int) apply_filters('orbem_multiplayer_cap', $cap > 0 ? $cap : self::CAP);
    }

    /** Whether players may fight each other in this area. */
    public static function pvp(string $area): bool
    {
        $post = get_page_by_path($area, OBJECT, 'explore-area');

        if (!$post) {
            return false;
        }

        return 'yes' === strtolower((string) get_post_meta($post->ID, self::PVP_META, true));
    }

    /** Every area where fighting is allowed. */
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

    /** Every area played alone. */
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
            // Areas where nobody else is drawn and you are drawn to nobody, even with multiplayer on.
            'soloAreas' => self::enabled() ? self::soloAreas() : [],
            // Who "you" are, so a client never draws itself as somebody else.
            'me'      => Explore::playerId(),
            // The network swaps this for a socket url.
            'socket'  => (string) apply_filters('orbem_multiplayer_transport', ''),
        ];
    }

    // Who is where

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
        // Twice the stale window, so the key outlives the people in it and a quiet area cleans itself up rather than being swept by anything.
        set_transient(self::key($area), $roster, self::STALE * 2);
    }

    /** Say where you are, and find out who else is here. */
    public static function tick(int $user_id, string $area, array $at): array
    {
        if ($user_id <= 0 || '' === $area || !self::enabled()) {
            return [];
        }

        // Cleaned once, here, so whichever roster answers below is handed the same safe values.
        $at['attack']       = self::attackCount($at['attack'] ?? 0);
        $at['attackSprite'] = self::slot($at['attackSprite'] ?? '');
        $at['weapon']       = self::weapon($at['weapon'] ?? null);
        $at['said']         = self::said($at['said'] ?? []);

        /** Somewhere better to keep the roster. */
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

    /** The name of a sprite slot, and nothing that could be anything else. */
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

    /** What somebody is holding, held to what a weapon can be. */
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

    /** The closest few, named and dressed. */
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

    /** What to call somebody. */
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

    // Fighting

    /** Where a player's unread hits wait for them. */
    private static function inbox(int $user_id): string
    {
        return 'orbem_hits_' . $user_id;
    }

    /** One player hits another. */
    public static function hit(int $attacker, int $victim, string $area, int $damage): array
    {
        if (!self::enabled() || !self::pvp($area)) {
            return ['success' => false, 'message' => __('Not here.', 'orbem-studio')];
        }

        if ($attacker <= 0 || $victim <= 0 || $attacker === $victim) {
            return ['success' => false, 'message' => __('Nobody to hit.', 'orbem-studio')];
        }

        // Both have to be standing in the same room.
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

        /** Somebody was hit by somebody else. */
        do_action('orbem_multiplayer_hit', $victim, $blow, $area);

        return ['success' => true, 'victim' => $victim, 'damage' => $damage];
    }

    /** Leave a hit where the victim will find it. */
    private static function deliver(int $victim, array $blow): void
    {
        $waiting = get_transient(self::inbox($victim));
        $waiting = is_array($waiting) ? $waiting : [];

        // A cap, so a flood cannot grow one player's row without limit.
        $waiting[] = $blow;
        $waiting = array_slice($waiting, -20);

        set_transient(self::inbox($victim), $waiting, self::STALE * 2);
    }

    // Said to the room

    /** What has been said to a player's room and not yet carried back to them. */
    private static array $heard = [];

    /** What a client says to its room, kept small. */
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

    /** Something said to this player's room that arrived some other way. */
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

        // Where fighting is allowed, asked again now and then.
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
            // Anything that hit them since they last asked.
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
            // Areas where nobody else is drawn and you are drawn to nobody, even with multiplayer on.
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
