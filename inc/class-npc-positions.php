<?php
/**
 * Where the characters were when you left.
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

    /** Everything this player remembers about where people are. */
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

    /** Remember where a player last saw everybody in one area. */
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
