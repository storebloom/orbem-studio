<?php
/**
 * Where the characters were when you left.
 *
 * A wandering character is somewhere because of everything that happened
 * before now. Sending them back to the spot the builder dropped them on every
 * time the page loads undoes that: you walk up to somebody, refresh, and they
 * are gone — which reads as the world forgetting rather than as a page
 * reloading.
 *
 * So a character who moves is remembered the same way the player is, and for
 * the same reason.
 *
 * WHAT IS REMEMBERED, AND FOR WHOM
 *
 * Per player, like their own coordinates. Two people in the same world are
 * playing two games, and one of them walking a guard across a courtyard is not
 * a thing that should happen in somebody else's world. It is also why this
 * only applies to somebody signed in: there is nowhere to put it otherwise,
 * and guessing would mean one anonymous visitor moving another one's people.
 *
 * WHICH CHARACTERS
 *
 * The ones that move. Not by asking what kind of movement they have — that is
 * the engine's business and it may grow more — but by noticing that one is not
 * where it was drawn. A character who stands still is never written down, so a
 * builder repositioning them is never fighting a saved position.
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

class NPC_Positions
{
    /** Where a player's memory of everybody else lives. */
    public const META = 'explore_npc_positions';

    /** Most characters remembered per area, so one world cannot fill a row. */
    private const PER_AREA = 60;

    public $plugin;

    public function __construct($plugin = null)
    {
        $this->plugin = $plugin;
    }

    /**
     * Everything this player remembers about where people are.
     *
     * The whole world rather than the area they are standing in: walking
     * through a door does not reload the page, so a list fetched for one area
     * is the wrong list as soon as anybody moves.
     *
     * Nested under the site id because user meta is shared across a network,
     * and a character in one world has nothing to do with a character in
     * another that happens to have the same id.
     */
    public static function all(int $user_id): array
    {
        if ($user_id <= 0) {
            return [];
        }

        $saved = get_user_meta($user_id, self::META, true);
        $site  = (string) get_current_blog_id();

        return is_array($saved) && isset($saved[$site]) && is_array($saved[$site])
            ? $saved[$site]
            : [];
    }

    /**
     * Remember where a player last saw everybody in one area.
     *
     * Replaces that area wholesale rather than merging: the client sends
     * everybody it can see who has moved, so anything missing from the list is
     * somebody who is no longer there to have a position.
     */
    public static function remember(int $user_id, string $area, array $people): void
    {
        if ($user_id <= 0 || '' === $area) {
            return;
        }

        $clean = [];

        foreach ($people as $id => $at) {
            $id = (int) $id;

            if ($id <= 0 || !is_array($at)) {
                continue;
            }

            $clean[$id] = [
                'left' => (int) round((float) ($at['left'] ?? 0)),
                'top'  => (int) round((float) ($at['top'] ?? 0)),
            ];

            if (count($clean) >= self::PER_AREA) {
                break;
            }
        }

        $saved = get_user_meta($user_id, self::META, true);
        $saved = is_array($saved) ? $saved : [];
        $site  = (string) get_current_blog_id();

        if ($clean) {
            $saved[$site][$area] = $clean;
        } else {
            unset($saved[$site][$area]);
        }

        update_user_meta($user_id, self::META, $saved);
    }

    /**
     * @action rest_api_init
     */
    public function registerRoutes(): void
    {
        register_rest_route('orbemorder/v1', '/npc-positions/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restRemember'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function restRemember(\WP_REST_Request $request): \WP_REST_Response
    {
        $data = (array) $request->get_json_params();

        self::remember(
            Explore::playerId(),
            sanitize_title((string) ($data['area'] ?? '')),
            (array) ($data['people'] ?? [])
        );

        return rest_ensure_response(['success' => true]);
    }
}
