<?php
/**
 * Explore
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

use WP_Error;
use WP_Post;

/**
 * Explore Class
 *
 * @package OrbemStudio
 */
class Explore
{

	/**
	 * Theme instance.
	 *
	 * @var Plugin
	 */
	public Plugin $plugin;

    /**
     * Class constructor.
     *
     * @param Plugin $plugin Plugin class.
     */
	public function __construct(Plugin $plugin)
    {
		$this->plugin          = $plugin;
        $this->plugin->explore = $this;
	}

    /**
     * Register API field.
     *
     * @action rest_api_init
     */
    public function createApiPostsMetaField(): void
    {
        $permission_callback = function() { return current_user_can( 'read' ); };
        $namespace           = 'orbemorder/v1';

        // Google oauth handle for logging in.
        register_rest_route($namespace, '/google-oauth-callback/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'handleGoogleOauthCallback'],
            'permission_callback' => '__return_true',
        ]);

        // Register route for getting event by location.
        register_rest_route($namespace, '/add-explore-points/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'addCharacterPoints'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for saving storage item.
        register_rest_route($namespace, '/save-storage-item/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveStorageItem'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for getting event by location.
        register_rest_route($namespace, '/area/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'getOrbemArea'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for getting item description.
        register_rest_route($namespace, '/get-item-description/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'getItemDescription'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for getting event by location.
        register_rest_route($namespace, '/coordinates/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveCoordinates'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for getting event by location.
        register_rest_route($namespace, '/resetexplore/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'resetExplore'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for getting event by location.
        register_rest_route($namespace, '/addspell/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'addSpell'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for saving settings.
        register_rest_route($namespace, '/save-settings/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveSettings'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for saving enemy info.
        register_rest_route($namespace, '/enemy/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveEnemy'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for equipping new item.
        register_rest_route($namespace, '/equip-explore-item/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'equipNewItem'],
            'permission_callback' => $permission_callback
        ]);

        // Register route for saving completed missions.
        register_rest_route($namespace, '/mission/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveMission'],
            'permission_callback' => $permission_callback
        ]);

        // Save draggable drop position.
        register_rest_route($namespace, '/save-drag/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveDrag'],
            'permission_callback' => $permission_callback
        ]);

        // Save draggable drop position.
        register_rest_route($namespace, '/save-materialized-item/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'saveMaterializedItem'],
            'permission_callback' => $permission_callback
        ]);

        // Add character to crew list.
        register_rest_route($namespace, '/add-character/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'addCharacter'],
            'permission_callback' => $permission_callback
        ]);

        // Add character to crew list.
        register_rest_route($namespace, '/enable-ability/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'enableAbility'],
            'permission_callback' => $permission_callback
        ]);

        // Set previous cutscene area.
        register_rest_route($namespace, '/set-previous-cutscene-area/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'setPreviousCutsceneArea'],
            'permission_callback' => $permission_callback
        ]);
    }

    /**
     * Call back function for rest route that saves the previous cutscene area.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function setPreviousCutsceneArea(\WP_REST_Request $request): \WP_REST_Response
    {
        $user     = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data     = $request->get_json_params();
        $cutscene = isset($data['cutscene']) ? sanitize_text_field(wp_unslash($data['cutscene'])) : '';

        update_user_meta($userid, 'explore_previous_cutscene_area', $cutscene);

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that adds spell to the explore_magic user meta
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function addSpell(\WP_REST_Request $request): \WP_REST_Response
    {
        $user     = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data     = $request->get_json_params();
        $spell_id = isset($data['spellid']) ? intval($data['spellid']) : 0;

        if (0 < $spell_id) {
            $explore_magic  = get_user_meta($userid, 'explore_magic', true);
            $explore_magic  = false === empty($explore_magic) ? $explore_magic : ['defense' => [], 'offense' => []];
            $spell_type     = get_the_terms($spell_id, 'magic-type');
            $the_spell_type = '';

            if (false === is_wp_error($spell_type) && true === is_array($spell_type)) {
                foreach($spell_type as $type) {
                    if (true === in_array($type->slug, ['defense', 'offense'], true)) {
                        $the_spell_type = $type->slug;
                    }
                }
            }

            if ( '' !== $the_spell_type ) {
                $explore_magic[$the_spell_type][] = $spell_id;

                update_user_meta($userid, 'explore_magic', $explore_magic);

                return rest_ensure_response( [
                    'success' => true,
                    'data'    => esc_html__('Spell added', 'orbem-studio'),
                ] );
            } else {
                return rest_ensure_response( [
                    'success' => false,
                    'data'    => esc_html__('No type selected', 'orbem-studio'),
                ] );
            }
        }

        return rest_ensure_response( [
            'success' => false,
            'data'    => esc_html__('User id or spell id invalid', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that adds points to user's explore game.
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function addCharacterPoints(\WP_REST_Request $request): \WP_REST_Response
    {
        $user     = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data   = $request->get_json_params();
        $type   = isset($data['type']) ? sanitize_text_field($data['type']) : '';
        $item   = $data['item'] ?? '';
        $item   = is_array($item) ? array_map('sanitize_text_field', $item) : sanitize_text_field($item);
        $amount = isset($data['amount']) ? intval($data['amount']) : 0;
        $reset  = isset($data['reset']) && 'true' === $data['reset'];

        if ('' === $type || '' === $item) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid request data', 'orbem-studio'),
            ]);
        }

        $this->savePoint($userid, $type, $amount, $item, $reset);

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Save explore points to array.
     *
     * @param $userid
     * @param $type
     * @param $amount
     * @param $item
     * @param bool $reset Is this being called by reset function.
     * @return void
     */
    public function savePoint($userid, $type, $amount, $item, bool $reset = false): void
    {
        if (0 < $userid && false === empty($item)) {
            $current_explore_points = get_user_meta($userid, 'explore_points', true);
            $explore_points         = false === empty($current_explore_points) && is_array($current_explore_points) ? $current_explore_points : [
                'health'  => ['points' => 100, 'positions' => []],
                'mana'    => ['points' => 100, 'positions' => []],
                'point'   => ['points' => 0, 'positions' => []],
                'money'   => ['points' => 0, 'positions' => []],
                'gear'    => ['positions' => []],
                'weapons' => ['positions' => []]
            ];

            if ('communicate' === $type) {
                $current_communicates = get_user_meta($userid, 'explore_received_communicates', true);
                $current_communicates = is_array($current_communicates) ? $current_communicates : [];
                $value_to_add         = is_array($item) && isset($item[0]) ? intval($item[0]) : intval($item);

                if (false === isset($current_communicates[$amount]) || false === in_array($value_to_add, $current_communicates[$amount], true)) {
                    $current_communicates[$amount][] = $value_to_add;
                }

                update_user_meta($userid, 'explore_received_communicates', $current_communicates);
            }

            if (true === $reset) {
                $explore_points['health']['points'] = 100;
                $explore_points['mana']['points']   = 100;
            }

            if ('communicate' !== $type) {
                $explore_points[$type]['points'] = $amount;
            } else {
                $type = 'point';
            }

            $type = sanitize_key($type);

            // Add position to list of positions received points on.
            if (true === is_array($item)) {
                if (!isset($explore_points[$type]['positions']) || !is_array($explore_points[$type]['positions'])) {
                    $explore_points[$type]['positions'] = [];
                }

                $existing_values = array_intersect($item, $explore_points[$type]['positions']);
                foreach( $existing_values as $existing_value ) {
                    $item_index = array_search($existing_value, $item, true);
                    unset($item[$item_index]);
                }

                $explore_points[$type]['positions'] = array_merge($explore_points[$type]['positions'], $item);
            } elseif (false === in_array($item, $explore_points[$type]['positions']) ) {
                $explore_points[$type]['positions'][] = sanitize_text_field($item);
            }

            update_user_meta($userid, 'explore_points', $explore_points);
        }
    }

    /**
     * Call back function for rest route that save draggable items positions when dropped.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function saveDrag(\WP_REST_Request $request): \WP_REST_Response
    {
        $user     = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data  = $request->get_json_params();
        $top   = isset($data['top']) ? intval($data['top']) : '';
        $left  = isset($data['left']) ? intval($data['left']) : '';
        $slug  = isset($data['slug']) ? sanitize_text_field(wp_unslash($data['slug'])) : '';

        if ('' === $top || '' === $left || '' === $slug) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Missing data point', 'orbem-studio'),
            ]);
        }

        $current_explore_drag = get_user_meta($userid, 'explore_drag_items', true);

        if (false === empty($current_explore_drag)) {
            $current_explore_drag[$slug] = [
                'top' => $top,
                'left' => $left,
            ];
        } else {
            $current_explore_drag = [$slug => [
                'top' => $top,
                'left' => $left,
            ]];
        }

        update_user_meta($userid, 'explore_drag_items', $current_explore_drag);

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that save materialized items per location when triggered.
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function saveMaterializedItem(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data  = $request->get_json_params();
        $area  = isset($data['area']) ? sanitize_text_field($data['area']) : '';
        $item  = $data['item'] ?? '';

        $current_materialized_items = get_user_meta($userid, 'explore_materialized_items', true);
        $current_materialized_items = false === empty($current_materialized_items) ? $current_materialized_items : [];
        $final_items                = [];

        if (true === is_array($item)) {
            foreach( $item as $value ) {
                if ( true === empty($final_items[$area][$value])) {
                    $final_items[$area][] = is_numeric($value) ? intval($value) : sanitize_text_field(wp_unslash($value));
                }
            }
        } elseif ('' !== $item) {
            if ( true === empty($final_items[$area][$item])) {
                $final_items[$area][] = is_numeric($item) ? intval($item) : sanitize_text_field(wp_unslash($item));
            }
        }

        update_user_meta($userid, 'explore_materialized_items', array_merge($current_materialized_items, $final_items));

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that save materialized items per location when triggered.
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function enableAbility(\WP_REST_Request $request): \WP_REST_Response
    {
        $user     = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data              = $request->get_json_params();
        $slug              = isset($data['slug']) ? sanitize_text_field($data['slug']) : '';
        $current_abilities = get_user_meta($userid, 'explore_abilities', true);
        $current_abilities = false === empty($current_abilities) ? $current_abilities : [];

        if ( false === in_array($slug, $current_abilities, true) ) {
            $current_abilities[] = $slug;
        }

        update_user_meta($userid, 'explore_abilities', $current_abilities);

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that save draggable items positions when dropped.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function addCharacter(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data  = $request->get_json_params();
        $slug  = isset($data['slug']) ? sanitize_text_field(wp_unslash($data['slug'])) : '';

        if ('' === $slug || 0 >= $userid) {
            return rest_ensure_response([
                'success' => false,
                'data' => esc_html__('Missing slug or user id', 'orbem-studio'),
            ]);
        }

        $current_characters = get_user_meta($userid, 'explore_characters', true);

        if (false === empty($current_characters) && false === in_array($slug, $current_characters, true)) {
            $current_characters[] = $slug;
        } elseif (true === empty($current_characters)) {
            $current_characters = [$slug];
        }

        update_user_meta($userid, 'explore_characters', $current_characters);

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that saves fallen enemies in game.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function saveEnemy(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data     = $request->get_json_params();
        $health   = isset($data['health']) ? intval($data['health']) : '';
        $position = isset($data['position']) ? sanitize_text_field(wp_unslash($data['position'])) : '';

        if (0 !== $health || '' === $position || 0 >= $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Missing required data point', 'orbem-studio'),
            ]);
        }

        $explore_enemies = get_user_meta($userid, 'explore_enemies', true);

        if (false === empty($explore_enemies)) {
            $explore_enemies[] = $position;
        } else {
            $explore_enemies = [$position];
        }

        update_user_meta($userid, 'explore_enemies', $explore_enemies);

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that saves completed missions.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function saveMission(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data    = $request->get_json_params();
        $mission = isset($data['mission']) ? sanitize_text_field(wp_unslash($data['mission'])) : '';

        if ('' === $mission || 0 >= $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Missing mission or invalid user', 'orbem-studio'),
            ]);
        }

        $explore_missions = get_user_meta($userid, 'explore_missions', true);
        $explore_missions = is_array($explore_missions) ? $explore_missions : [];

        if (false === empty($explore_missions)) {
            if (false === in_array($mission, $explore_missions, true)) {
                $explore_missions[] = $mission;
            }
        } else {
            $explore_missions = [$mission];
        }

        update_user_meta($userid, 'explore_missions', $explore_missions);

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that equips a new item on the player.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function equipNewItem(\WP_REST_Request $request): \WP_REST_Response
    {
        $user     = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data             = $request->get_json_params();
        $type             = isset($data['type']) ? sanitize_key($data['type']) : '';
        $item_id          = isset($data['itemid']) ? intval($data['itemid']) : '';
        $amount           = isset($data['amount']) ? intval($data['amount']) : '';
        $unequip          = false === empty($data['unequip']) ? 'true' === sanitize_text_field(wp_unslash($data['unequip'])) : '';
        $current_equipped = get_user_meta($userid, 'explore_current_' . $type, true);
        $current_equipped = false === empty($current_equipped) ? $current_equipped : [];
        $the_effect_type  = '';

        if (!$item_id || !get_post($item_id)) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid item', 'orbem-studio'),
            ]);
        }

        $effect_type = '' !== $item_id ? get_post_meta($item_id, 'explore-value-type', true) : '';

        if ( true === in_array($effect_type, ['mana', 'health', 'power'], true)) {
            $the_effect_type = $effect_type;
        }

        if (false === $unequip && false === empty($current_equipped[$the_effect_type])) {
            if (true === is_array($current_equipped[$the_effect_type])) {
                foreach ($current_equipped[$the_effect_type] as $current_array) {
                    if (false === in_array($item_id, array_keys($current_array), true)) {
                        $current_equipped[$the_effect_type][] = [$item_id => $amount];
                    }
                }
            }
        } elseif (true === $unequip && false === empty($current_equipped[$the_effect_type])) {
            $equip_position = array_search($item_id, $current_equipped[$the_effect_type]);
            unset($current_equipped[$the_effect_type][$equip_position]);
        }

        // Weapons.
        if ('' === $unequip && $current_equipped !== [$item_id]) {
            $current_equipped = [$item_id];
        }

        if (0 >= $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid user', 'orbem-studio'),
            ]);
        }

        update_user_meta(
            $userid,
            'explore_current_' . $type,
            $current_equipped
        );

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('equipped', 'orbem-studio') . esc_html($item_id),
        ] );
    }

    /**
     * Call back function for rest route that storages items.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function saveStorageItem(\WP_REST_Request $request): \WP_REST_Response
    {
        $user     = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data                 = $request->get_json_params();
        $default_weapon       = get_option('explore_default_weapon', false);
        $default_weapon_obj   = false !== $default_weapon ?
            get_posts(
                [
                    'name'             => sanitize_text_field($default_weapon),
                    'posts_per_page'   => 1,
                    'post_type'        => 'explore-weapon',
                    'suppress_filters' => false,
                    'post_status'      => 'publish',
                    'no_found_rows'    => true,
                ]
            ) :
            '';
        $default_weapon_obj_id = true === isset($default_weapon_obj[0]) ? $default_weapon_obj[0]->ID : false;
        $id                    = isset($data['id']) ? intval($data['id']) : '';
        $value                 = isset($data['value']) ? intval($data['value']) : '';
        $type                  = isset($data['type']) ? sanitize_text_field(wp_unslash($data['type'])) : '';
        $name                  = isset($data['name']) ? sanitize_text_field(wp_unslash($data['name'])) : '';
        $remove                = isset($data['remove']) && 'true' === sanitize_text_field(wp_unslash($data['remove']));

        if ('' === $type || '' === $name || '' === $value || 0 >= $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Missing data point', 'orbem-studio'),
            ]);
        }

        if ('' === $id || !get_post($id)) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid post id', 'orbem-studio'),
            ]);
        }

        $menu_map = match($type) {
            'gear' => 'gear',
            'weapons' => 'weapons',
            default => 'items'
        };

        $current_storage_items = get_user_meta($userid, 'explore_storage', true);
        $current_storage_items = false === empty($current_storage_items) ? $current_storage_items : [];
        $item_subtype          = get_post_meta($id, 'explore-value-type', true);
        $subtype               = '';
        $menu_map_array        = $current_storage_items[$menu_map] ?? [];

        if ($type !== $item_subtype) {
            $subtype = $item_subtype;
        }

        // If remove is true then remove the provided item.
        if (true === $remove) {
            foreach($menu_map_array as $index => $storage_item) {
                $storage_item_name = $storage_item['name'] ?? '';

                if ($name === $storage_item_name) {
                    if (false === empty($storage_item['count']) && 1 < $storage_item['count']) {
                        $menu_map_array[$index]['count'] = $storage_item['count'] - 1;
                    } else {
                        unset($menu_map_array[$index]);
                    }
                }
            }
        } else {
            $new_item = [
                'id'    => $id,
                'name'  => $name,
                'type'  => $type,
                'value' => $value,
            ];

            if (false === empty($subtype)) {
                $new_item['subtype'] = $subtype;
            }

            $has_dupe             = false;
            $default_weapon_array = false !== $default_weapon_obj_id ? ['name' => $default_weapon, 'type' => 'weapons', 'id' => $default_weapon_obj_id] : [];

            if (true === empty($current_storage_items)) {
                $menu_map_array = ['items' => [], 'weapons' => [$default_weapon_array], 'gear' => []];
            } else {
                foreach ($menu_map_array as $index => $item) {
                    if ($name === $item['name']) {
                        $count                           = $item['count'] ?? 1;
                        $menu_map_array[$index]['count'] = 'weapons'=== $menu_map ? 1 : $count + 1;
                        $has_dupe                        = true;
                    }
                }
            }

            if (false === $has_dupe) {
                $menu_map_array[] = $new_item;
            }
        }

        $current_storage_items[$menu_map] = $menu_map_array;

        update_user_meta($userid, 'explore_storage', $current_storage_items);

        if (true === in_array($menu_map, ['gear', 'weapons'])) {
            $this->savePoint($userid, $menu_map, 0 , $name);
        }

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that saves game settings.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function saveSettings(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data    = $request->get_json_params();
        $music   = isset($data['music']) ? intval($data['music']) : '';
        $sfx     = isset($data['sfx']) ? intval($data['sfx']) : '';
        $talking = isset($data['talking']) ? intval($data['talking']) : '';

        if (!is_numeric($music)|| !is_numeric($sfx) || !is_numeric($talking)) {
            return rest_ensure_response( [
                'success' => false,
                'data'    => esc_html__('Missing data point', 'orbem-studio'),
            ] );
        }

        update_user_meta($userid, 'explore_settings', ['music' => $music, 'sfx' => $sfx, 'talking' => $talking,]);

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function for rest route that adds points to user's explore game.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function getOrbemArea(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data     = $request->get_json_params();
        $position = isset($data['position']) ? sanitize_title(wp_unslash($data['position'])) : '';
        $area     = '' !== $position ? get_posts([
            'post_type'        => 'explore-area',
            'name'             => $position,
            'posts_per_page'   => 1,
            'suppress_filters' => false,
            'post_status'      => 'publish',
            'no_found_rows'    => true,
        ]) : '';

        if (true === empty($area[0])) {
            return rest_ensure_response( [
                'success' => false,
                'data'    => esc_html__('Area not provided', 'orbem-studio'),
            ] );
        }

        $area_id            = $area[0]->ID ?? false;
        $is_area_cutscene   = false !== $area_id ? get_post_meta($area_id, 'explore-is-cutscene', true) : false;
        $orbem_studio_explore_points     = self::getExplorePoints($position);
        $explore_cutscenes  = self::getExplorePosts($position, 'explore-cutscene');
        $explore_minigames  = self::getExplorePosts($position, 'explore-minigame');
        $orbem_studio_explore_missions   = self::getExplorePosts($position, 'explore-mission');
        $explore_walls      = self::getExplorePosts($position, 'explore-wall');
        $explore_explainers = self::getExplorePosts($position, 'explore-explainer');
        $explore_abilities  = Explore::getExploreAbilities();

        // HTML generated internally from trusted templates.
        $map_items             = self::getMapItemHTML($orbem_studio_explore_points, $position);
        $explainers_menu       = self::getExplainerHTML($explore_explainers, 'menu');
        $explainers_map        = self::getExplainerHTML($explore_explainers, 'map');
        $explainers_fullscreen = self::getExplainerHTML($explore_explainers, 'fullscreen');
        $minigames             = self::getMinigameHTML($explore_minigames);
        $map_communicate       = self::getMapCommunicateHTML($position, $userid);
        $map_cutscenes         = self::getMapCutsceneHTML($explore_cutscenes, $position, $userid);
        $map_abilities         = self::getMapAbilitiesHTML($explore_abilities);

        $is_admin = user_can($userid, 'manage_options');
        $dev_mode = '';

        ob_start();
        include_once $this->plugin->dir_path . '/templates/style-scripts.php';
        $area_item_styles_scripts = ob_get_clean();

        ob_start();
        include_once $this->plugin->dir_path . '/templates/components/explore-missions.php';
        $map_missions = ob_get_clean();

        ob_start();
        include_once $this->plugin->dir_path . '/templates/components/explore-characters.php';
        $map_characters = ob_get_clean();

        update_user_meta($userid, 'current_location', $position);

        // Only administrators can view dev mode.
        if ($is_admin) {
            $dev_mode  = Dev_Mode::getDevModeHTML();
        }

        $start_direction = false !== $area_id ? get_post_meta($area_id, 'explore-start-direction', true) : '';
        $start_direction = false === empty($start_direction) ? $start_direction : 'down';

        return rest_ensure_response([
            'success' => true,
            'data'    => [
                'map-items'               => $map_items,
                'minigames'               => $minigames,
                'map-cutscenes'           => $map_cutscenes,
                'map-missions'            => $map_missions,
                'map-characters'          => $map_characters,
                'map-communicate'         => $map_communicate,
                'map-explainers'          => $explainers_map,
                'menu-explainers'         => $explainers_menu,
                'fullscreen-explainers'   => $explainers_fullscreen,
                'map-abilities'           => $map_abilities,
                'map-item-styles-scripts' => $area_item_styles_scripts,
                'start-top'               => false !== $area_id ? get_post_meta($area_id, 'explore-start-top', true) : '',
                'start-left'              => false !== $area_id ? get_post_meta($area_id, 'explore-start-left', true) : '',
                'start-direction'         => $start_direction,
                'map-svg'                 => self::getMapSVG($area[0]),
                'is-cutscene'             => $is_area_cutscene,
                'dev-mode'                => $dev_mode,
            ],
        ] );
    }

    /**
     * Call back function for rest route that returns item description.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function getItemDescription(\WP_REST_Request $request): \WP_REST_Response
    {
        $user     = wp_get_current_user();
        $userid   = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data  = $request->get_json_params();
        $item  = isset($data['id']) ? intval($data['id']) : false;

        if (false === $item) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Item id not provided', 'orbem-studio'),
            ]);
        }

        // Get content from the new explore-area post type.
        $item_obj = get_post($item);

        if (!$item_obj || false === in_array($item_obj->post_type, ['explore-point', 'explore-weapon', 'explore-gear'])) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Item provided is in correct or non existent', 'orbem-studio'),
            ]);
        }

        // Check if equipped.
        $gear_equipped = get_user_meta($userid, 'explore_current_gear', true);
        // Raw content for game engine; do not apply WordPress filters.
        $content       = $item_obj->post_content;
        $type          = get_post_meta($item_obj->ID, 'explore-value-type', true);
        $item_type     = '';

        if (true === in_array($type, ['mana', 'health', 'power'], true)) {
            $item_type = $type;
        }

        // Check equipped gear. IF so change button to unequip.
        if (false === empty($gear_equipped[$item_type]) && true === is_array($gear_equipped[$item_type])) {
            foreach ($gear_equipped[$item_type] as $current_array) {
                if (true === in_array($item, array_keys($current_array), true)) {
                    // Modify button label for equipped items (content is controlled).
                    $content = str_replace(['Equip', 'equip', 'Ununequip'],
                        ['Unequip', 'unequip', 'Unequip'],
                        $content);
                }
            }
        }

        // Return the post content for the supplied item.
        return rest_ensure_response( [
            'success' => true,
            'data'    => $content,
        ] );
    }

    /**
     * Call back function for rest route that adds coordinates user's explore game.
     * @param \WP_REST_Request $request The arg values from rest route.
     * @return \WP_REST_Response
     */
    public function saveCoordinates(\WP_REST_Request $request): \WP_REST_Response
    {
        $user     = wp_get_current_user();
        $userid   = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data = $request->get_json_params();

        if (
            ! isset($data['left'], $data['top']) ||
            ! is_numeric($data['left']) ||
            ! is_numeric($data['top'])
        ) {
            return rest_ensure_response( [
                'success' => false,
                'data'    => esc_html__('Incorrect coordinate provided', 'orbem-studio'),
            ] );
        }

        $left = intval($data['left']);
        $top  = intval($data['top']);

        update_user_meta($userid, 'current_coordinates', ['left'=>$left,'top'=>$top]);

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Call back function to reset explore game.
     * @return \WP_REST_Response
     */
    public function resetExplore(): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        if (0 === $userid) {
            return rest_ensure_response( [
                'success' => false,
                'data'    => esc_html__('Invalid user provided', 'orbem-studio'),
            ] );
        }

        delete_user_meta($userid, 'current_coordinates');
        delete_user_meta($userid, 'current_location');
        delete_user_meta($userid, 'explore_points');
        delete_user_meta($userid, 'explore_enemies');
        delete_user_meta($userid, 'explore_missions');
        delete_user_meta($userid, 'explore_storage');
        delete_user_meta($userid, 'explore_magic');
        delete_user_meta($userid, 'explore_current_gear');
        delete_user_meta($userid, 'explore_current_weapons');
        delete_user_meta($userid, 'explore_drag_items');
        delete_user_meta($userid, 'explore_characters');
        delete_user_meta($userid, 'explore_materialized_items');
        delete_user_meta($userid, 'explore_abilities');
        delete_user_meta($userid, 'explore_received_communicates');
        delete_user_meta($userid, 'explore_previous_cutscene_area');

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * Get map SVG content.
     *
     * @param WP_Post $explore_area
     * @return string|false
     */
    public static function getMapSVG(WP_Post $explore_area): false|string
    {
        $map_url = get_the_post_thumbnail_url($explore_area->ID, 'full');

        if (empty($map_url)) {
            return false;
        }

        $response = wp_remote_get($map_url, ['timeout'   => 10]);

        if (is_wp_error($response)) {
            return false;
        }

        $image_data = wp_remote_retrieve_body($response);

        if (empty($image_data)) {
            return false;
        }

        $position = strpos($image_data, '<svg');

        if (false === $position) {
            return false;
        }

        return substr($image_data, $position);
    }

    /**
     * Get SVG content from image URL.
     *
     * @param string $image_url
     * @return string
     */
    public static function getSVGCode(string $image_url): string
    {
        if (empty( $image_url)) {
            return '';
        }

        $args = ['timeout' => 10];

        if ( wp_get_environment_type() === 'local' ) {
            $args['sslverify'] = false;
        }

        $response = wp_remote_get($image_url, $args);

        if (is_wp_error($response)) {
            return '';
        }

        $image_data = wp_remote_retrieve_body($response);

        if (empty($image_data)) {
            return '';
        }

        $position = strpos($image_data, '<svg');

        if (false === $position) {
            return '';
        }

        return substr($image_data, $position);
    }

    /**
     * Grab all the points you can collide with.
     *
     * @param string $position The area to get game posts from.
     * @return int[]|WP_Post[]
     */
    public static function getExplorePoints($position): array
    {
        $position   = sanitize_key($position);
        $first_area = sanitize_key(get_option('explore_first_area', ''));

        if ($position || $first_area) {
            $args = [
                'posts_per_page' => -1,
                'post_type'      => ['explore-weapon', 'explore-area', 'explore-point', 'explore-character', 'explore-enemy', 'explore-sign', 'explore-wall'],
                // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
                'meta_query'     => [
                    [
                        'key'     => 'explore-area',
                        'value'   => $position ?: $first_area,
                        'compare' => '='
                    ]
                ],
                'no_found_rows'  => true,
                'post_status'    => 'publish',
            ];

            return get_posts($args);
        }

        return [];
    }

    /**
     * Return post object of currently equipped weapon.
     * @param string $weapon_name
     *
     * @return WP_Post|null
     */
    public static function getWeaponByName(string $weapon_name): ?WP_Post
    {
        if ('' === $weapon_name) {
            return null;
        }

        $args = [
            'post_type'      => 'explore-weapon',
            'name'           => sanitize_key($weapon_name),
            'posts_per_page' => 1,
            'post_status'    => 'publish',
            'no_found_rows'  => true,
        ];

        $posts = get_posts($args);

        if (false === empty($posts[0])) {
            return $posts[0];
        }

        return null;
    }

    /**
     * Grab all the points you can collide with.
     * @param string $position
     * @param string $post_type
     * @return int[]|WP_Post[]
     */
    public static function getExplorePosts(string $position, string $post_type): array
    {
        $allowed_post_types = [
            'explore-point',
            'explore-character',
            'explore-enemy',
            'explore-sign',
            'explore-wall',
            'explore-minigame',
            'explore-mission',
            'explore-cutscene',
            'explore-explainer',
        ];

        if (false === in_array($post_type, $allowed_post_types, true)) {
            return [];
        }

        $first_area = get_option('explore_first_area', '');
        $args       = [
            'post_type'      => $post_type,
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
            'meta_query'     => [
                [
                    'key'     => 'explore-area',
                    'value'   => false === empty($position) ? sanitize_text_field($position) : $first_area,
                    'compare' => '='
                ]
            ],
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'no_found_rows'  => true,
        ];

        return get_posts($args);
    }

    /**
     * Grab all the abilities you can unlock.
     * @return int[]|WP_Post[]
     */
    public static function getExploreAbilities(): array
    {
        $args = [
            'post_type'      => 'explore-magic',
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'no_found_rows'  => true,
        ];

        return get_posts($args);
    }

    /**
     * Add map item styles.
     *
     * @action wp_head
     * @return void
     */
    public function inlineExploreStyles(): void
    {
        $game_page = get_option('explore_game_page', '');

        if (false === empty($game_page) && is_page($game_page)) {
            include_once $this->plugin->dir_path . '/templates/head-code.php';
        }
    }

    /**
     * Build html for map items.
     * @param array $explore_points
     * @param string $current_location
     * @return string
     */
    public static function getMapItemHTML(array $explore_points, string $current_location): string
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;
        $dead_ones = '';

        if (0 !== $userid) {
            $dead_ones = get_user_meta($userid, 'explore_enemies', true);
        }

        $html               = '';
        $dead_ones          = false === empty($dead_ones) ? $dead_ones : [];
        $health             = '';
        $explore_enemy_type = '';
        $all_missions       = get_posts(
            [
                'post_type'      => 'explore-mission',
                'posts_per_page' => -1,
                'no_found_rows'  => true,
                'post_status'    => 'publish',
                // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
                'meta_query'     => [
                    [
                        'key'     => 'explore-area',
                        'value'   => sanitize_key($current_location),
                        'compare' => '='
                    ]
                ]
            ]
        );

        $mission_trigger_html = '';

        // Grab mission trigger points.
        if (true === is_array($all_missions)) {
            foreach ($all_missions as $mission) {
                $mission_trigger = get_post_meta($mission->ID, 'explore-mission-trigger', true);
                $mission_trigger = false === empty($mission_trigger) ? $mission_trigger : '';
                $trigger_left    = $mission_trigger['left'] ?? '0';
                $trigger_top     = $mission_trigger['top'] ?? '0';
                $trigger_height  = $mission_trigger['height'] ?? '0';
                $trigger_width   = $mission_trigger['width'] ?? '0';

                if (false === empty($mission_trigger['top'])) {
                    $mission_trigger_html .= '<div id="' . esc_attr($mission->ID) . '-t" class="mission-trigger wp-block-group map-item ' . esc_attr($mission->post_name) . '-mission-trigger-map-item is-layout-flow wp-block-group-is-layout-flow"';
                    $mission_trigger_html .= ' style="left:' . esc_attr($trigger_left) . 'px;top:' . esc_attr($trigger_top) . 'px;height:' . esc_attr($trigger_height) . 'px; width:' . esc_attr($trigger_width) . 'px;"';
                    $mission_trigger_html .= ' data-trigger="true" data-triggee="' . esc_attr($mission->post_name) . '"';
                    $mission_trigger_html .= ' data-meta="explore-mission-trigger"';
                    $mission_trigger_html .= '></div>';
                }
            }
        }

        if (false === empty($explore_points)) {
            foreach ($explore_points as $explore_point) {
                $explore_point_meta = [];
                $raw_meta = get_post_meta($explore_point->ID);

                foreach ($raw_meta as $key => $values) {
                    $explore_point_meta[$key] = maybe_unserialize($values[0] ?? null);
                }

                $missions       = [];
                $enemy_missions = [];

                if ('explore-enemy' === $explore_point->post_type) {
                    $health             = $explore_point_meta['explore-health'] ?? '';
                    $explore_enemy_type = $explore_point_meta['explore-enemy-type'] ?? '';

                    if (true === isset($dead_ones[$explore_point->post_name])) {
                        continue;
                    }
                }

                $boss_waves                     = $explore_point_meta['explore-boss-waves'] ?? '';
                $value                          = $explore_point_meta['explore-value'] ?? '';
                $timer                          = $explore_point_meta['explore-timer'] ?? '';
                $type                           = $explore_point_meta['explore-value-type'] ?? '';
                $interaction_type               = $explore_point_meta['explore-interaction-type'] ?? '';
                $breakable                      = 'breakable' === $interaction_type;
                $collectable                    = 'collectable' === $interaction_type;
                $draggable                      = 'draggable' === $interaction_type;
                $is_hazard                      = 'hazard' === $interaction_type;
                $is_strong                      = $explore_point_meta['explore-is-strong'] ?? '';
                $is_strong                      = false === empty($is_strong) ? $is_strong : false;
                $top                            = $explore_point_meta['explore-top'] ?? '';
                $left                           = $explore_point_meta['explore-left'] ?? '';
                $height                         = $explore_point_meta['explore-height'] ?? '';
                $width                          = $explore_point_meta['explore-width'] ?? '';
                $walking_path                   = $explore_point_meta['explore-path'] ?? '';
                $walking_speed                  = $explore_point_meta['explore-speed'] ?? '';
                $time_between                   = $explore_point_meta['explore-time-between'] ?? '';
                $remove_after_cutscene          = $explore_point_meta['explore-remove-after-cutscene'] ?? '';
                $repeat                         = $explore_point_meta['explore-repeat'] ?? '';
                $disappear                      = $explore_point_meta['explore-disappear'] ?? '';
                $layer                          = $explore_point_meta['explore-layer'] ?? '';
                $passable                       = (($explore_point_meta['explore-passable'] ?? '') === 'yes');
                $interacted_with                = $explore_point_meta['explore-interacted'] ?? '';
                $crew_mate                      = $explore_point_meta['explore-crew-mate'] ?? '';
                $path_trigger                   = $explore_point_meta['explore-path-trigger'] ?? '';
                $path_trigger                   = false === empty($path_trigger) ? $path_trigger : '';
                $path_trigger_left              = false === empty($path_trigger['left']) ? $path_trigger['left'] : '';
                $path_trigger_top               = false === empty($path_trigger['top']) ? $path_trigger['top'] : '';
                $path_trigger_height            = false === empty($path_trigger['height']) ? $path_trigger['height'] : '';
                $path_trigger_width             = false === empty($path_trigger['width']) ? $path_trigger['width'] : '';
                $path_trigger_cutscene          = false === empty($path_trigger['cutscene']) ? $path_trigger['cutscene'] : '';
                $materialize_item_trigger       = $explore_point_meta['explore-materialize-item-trigger'] ?? '';
                $materialize_after_cutscene     = $explore_point_meta['explore-materialize-after-cutscene'] ?? '';
                $wanderer                       = $explore_point_meta['explore-wanderer'] ?? '';
                $materialize_item_trigger       = $materialize_item_trigger ?? false;
                $is_materialized_item_triggered = self::isMaterializedItemTriggered($explore_point->post_name, $current_location, $userid);
                $has_minigame                   = $explore_point_meta['explore-minigame'] ?? '';
                $hazard_remove                  = false;
                $explore_attack                 = $explore_point_meta['explore-attack'] ?? '';
                $weapon_strength                = false === empty($explore_attack) ? wp_json_encode($explore_attack) : '""';
                $rotation                       = $explore_point_meta['explore-rotation'] ?? '';
                $item_image                     = get_the_post_thumbnail_url($explore_point->ID);
                $video_override                 = $explore_point_meta['explore-video-override'] ?? '';

                // Create onload class:
                $path_onload = true === empty($path_trigger_left) && true === empty($path_trigger_cutscene) && ('explore-character' === $explore_point->post_type || 'explore-enemy' === $explore_point->post_type) ? ' path-onload' : '';
                $classes     = $path_onload;

                // If it's an enemy, and they have health show or if not an enemy show.
                if (
                    'explore-enemy' !== $explore_point->post_type ||
                    false === in_array($explore_point->post_name, array_keys($dead_ones), true)
                ) {
                    // Highjack top/left if draggable and has save drag values.
                    // Read-only user meta used for client-side rendering only.
                    if (true === $draggable && 0 < $userid) {
                        $current_drag = get_user_meta($userid, 'explore_drag_items', true);

                        if (false === empty($current_drag) && true === isset($current_drag[$explore_point->post_name])) {
                            $top = $current_drag[$explore_point->post_name]['top'] ?? '0';
                            $left = $current_drag[$explore_point->post_name]['left'] ?? '0';
                        }
                    }

                    // Add z index change if layer number is defined.
                    $layer = false === empty($layer) ? 'z-index: ' . esc_attr($layer) . ';' : '';

                    $html .= '<div style="' . esc_attr($layer) . 'transform: rotate(' . esc_attr($rotation) . 'deg);left:' . esc_attr($left) . 'px; top:' . esc_attr($top) . 'px;" id="' . esc_attr($explore_point->ID) . '" data-genre="' . esc_attr($explore_point->post_type) . '" data-type="' . esc_attr($type) . '" data-value="' . esc_attr($value) . '"';
                    $html .= ' data-image="' . esc_attr($item_image) . '"';

                    if ('explore-area' === $explore_point->post_type) {
                        $map_url = $explore_point_meta['explore-map'] ?? '';

                        $html .= ' data-map-url="' . esc_attr($map_url) . '"';
                    }

                    if (false === empty($wanderer)) {
                        $html .= ' data-wanderer="' . esc_attr($wanderer) . '"';
                    }

                    // Explore character crew mate.
                    if ('explore-character' === $explore_point->post_type && 'yes' === $crew_mate) {
                        $html .= ' data-crewmate="' . esc_attr($crew_mate) . '"';
                    }

                    // If hazard, add hazard class.
                    if ($is_hazard) {
                        $html .= ' data-hazard="true"';
                    }

                    // Is item breakable.
                    if (true === $breakable) {
                        $html .= ' data-breakable="true"';
                    }

                    // Will disappear?
                    $html .= ' data-disappear="' . esc_attr($disappear) . '"';

                    // Will be passable?
                    if (true === $passable) {
                        $html .= ' data-passable="true"';
                    }

                    if (false === empty($height) && false === empty($width)) {
                        $html .= ' data-height="' . esc_attr($height) . '"';
                        $html .= ' data-width="' . esc_attr($width) . '"';
                    }

                    // Interacted with image.
                    if (false === empty($interacted_with)) {
                        $html .= ' data-interacted="' . esc_url($interacted_with) . '"';
                    }

                    if ('explore-point' === $explore_point->post_type && false === empty($timer['time']) && 0 < intval($timer['time'])) {
                        $html .= ' data-timer="' . esc_attr($timer['time']) . '"';
                        $html .= ' data-timertriggee="' . esc_attr($timer['trigger']) . '"';
                    }

                    // Has Minigame.
                    if (false === empty($has_minigame)) {
                        $html .= ' data-minigame="' . esc_attr($has_minigame) . '"';
                    }

                    // Is strong.
                    if ('yes' === $is_strong) {
                        $html .= ' data-isstrong="yes"';
                    }

                    // Get item and enemy triggered missions.
                    if (0 < count($all_missions)) {
                        foreach ($all_missions as $mission) {
                            $trigger_item       = get_post_meta($mission->ID, 'explore-trigger-item', true);
                            $trigger_item       = is_array($trigger_item) && false === empty($trigger_item) ? array_keys($trigger_item)[0] : $trigger_item;
                            $trigger_item       = is_array($trigger_item) ? '' : $trigger_item;
                            $enemy_trigger_item = get_post_meta($mission->ID, 'explore-trigger-enemy', true);

                            if ((false === empty($trigger_item) && is_array($trigger_item) && true === in_array($explore_point->post_name, $trigger_item, true)) || (false === empty($trigger_item) && false === is_array($trigger_item) && str_contains($explore_point->post_name, $trigger_item))) {
                                $missions[] = $mission;
                            }

                            if ($explore_point->post_name === $enemy_trigger_item) {
                                $enemy_missions[] = $mission;
                            }
                        }
                    }

                    // Is item attached to a mission.
                    if (false === empty($missions[0])) {
                        $html .= ' data-mission="' . esc_attr($missions[0]->post_name) . '"';

                        $hazard_remove = get_post_meta($missions[0]->ID, 'explore-hazard-remove', true);
                        $hazard_remove = false === empty($hazard_remove) && true === in_array($explore_point->post_name, explode(',', $hazard_remove));
                    }

                    if (false === empty($enemy_missions[0])) {
                        $html .= ' data-mission="' . esc_attr($enemy_missions[0]->post_name) . '"';

                        $hazard_remove = get_post_meta($enemy_missions[0]->ID, 'explore-hazard-remove', true);
                        $hazard_remove = false === empty($hazard_remove) && true === in_array($explore_point->post_name, explode(',', $hazard_remove));
                    }

                    $explore_path = false === empty($walking_path) ? wp_json_encode($walking_path) : '[{"top":"0","left":"0"}]';

                    if ($walking_speed) {
                        $html .= ' data-speed="' . esc_attr($walking_speed) . '"';
                    }

                    if ($time_between) {
                        $html .= ' data-timebetween="' . esc_attr($time_between) . '"';
                    }

                    if ('[{"top":"0","left":"0"}]' !== $explore_path && true === in_array($explore_point->post_type, ['explore-character', 'explore-enemy'])) {
                        $html .= ' data-path=\'' . esc_attr($explore_path) . '\'';

                        if ('yes' === $repeat) {
                            $html .= ' data-repeat="true"';
                        }

                        if (false === empty($path_trigger_cutscene)) {
                            $html .= ' data-trigger-cutscene="' . esc_attr($path_trigger_cutscene) . '"';
                        }
                    }

                    if ('explore-weapon' === $explore_point->post_type) {
                        $html .= ' data-strength=\'' . esc_attr($weapon_strength) . '\'';
                    }

                    if (true === $collectable || 'explore-weapon' === $explore_point->post_type) {
                        $html .= ' data-collectable="true"';
                    }

                    // Materialize this item after this cutscene.
                    if (false === empty($materialize_after_cutscene)) {
                        $html .= ' data-showaftercutscene="' . esc_attr($materialize_after_cutscene) . '"';
                    }

                    if (true === $draggable) {
                        $html .= ' data-draggable="true"';
                    }

                    if (true === $hazard_remove) {
                        $html .= ' data-removable="true"';
                    }

                    // Remove this after cutscene specified in data att.
                    if (false === empty($remove_after_cutscene)) {
                        $html .= ' data-removeaftercutscene="' . esc_attr($remove_after_cutscene) . '"';
                    }

                    $pulse_wave = false;
                    $barrage_wave = false;

                    // Enemy specific data-points.
                    if ('explore-enemy' === $explore_point->post_type) {
                        $speed = $explore_point_meta['explore-speed'] ?? '';
                        $enemy_speed = $explore_point_meta['explore-enemy-speed'] ?? '';
                        $enemy_weapon_type = $explore_point_meta['explore-weapon-weakness'] ?? '';

                        if (false === empty($enemy_weapon_type)) {
                            $html .= ' data-weapon="' . esc_attr($enemy_weapon_type) . '"';
                        }

                        $html .= ' data-health="' . esc_attr($health) . '" data-healthamount="' . esc_attr($health) . '" data-enemyspeed="' . esc_attr($enemy_speed) . '" data-speed="' . esc_attr($speed) . '" data-enemy-type="' . esc_attr($explore_enemy_type) . '"';
                        $wave_html = ' data-waves="';

                        // Boss waves.
                        if (true === is_array($boss_waves)) {
                            foreach ($boss_waves as $boss_wave_name => $boss_wave) {
                                if ('pulse-wave' === $boss_wave_name && 'on' === $boss_wave) {
                                    $pulse_wave = true;
                                }

                                if ('projectile' === $boss_wave_name && 'on' === $boss_wave) {
                                    $barrage_wave = true;
                                }

                                $wave_html .= $boss_wave_name . ',';
                            }
                        }

                        // Add boss waves.
                        $html .= wp_kses_post($wave_html) . '"';

                        $html .= ' class="wp-block-group enemy-item ' . esc_attr($explore_point->post_name) . '-map-item is-layout-flow wp-block-group-is-layout-flow' . esc_attr($classes) . '"';
                    } else {
                        $html .= ' class="wp-block-group map-item ' . esc_attr($explore_point->post_name) . '-map-item is-layout-flow wp-block-group-is-layout-flow' . esc_attr($classes) . '"';
                    }

                    $html .= '>';

                    // If item is video.
                    if (false === empty($video_override)) {
                        $html .= '<video style="position:absolute;z-index: 1;width: 100%;height:100%;top:0; left:0;" src="' . esc_url($video_override) . '" autoplay loop muted></video>';
                    }

                    // Sign.
                    if ('explore-sign' === $explore_point->post_type) {
                        $html .= '<img src="' . esc_url($item_image) . '" class="sign-image" />';
                    }

                    // Raw content for game engine; do not apply WordPress filters.
                    $html .= true === in_array($explore_point->post_type, ['explore-character', 'explore-sign'], true) ? wp_kses_post($explore_point->post_content) : '';

                    if (true === in_array($explore_point->post_type, ['explore-character', 'explore-enemy'], true)) {
                        $character_info = self::getCharacterImages($explore_point, '');
                        $direction_images = $character_info['direction_images'] ?? false;

                        if ($direction_images) {
                            foreach ($direction_images as $direction_label => $direction_image) {
                                $fight_animation = false !== stripos($direction_label, 'punch') ? ' fight-image' : '';

                                $html .= '<img height = "';
                                $html .= false === empty($character_info['height']) ? esc_attr($character_info['height']) : '185';
                                $html .= 'px" width = "';
                                $html .= false === empty($character_info['width']) ? esc_attr($character_info['width']) : '115';
                                $html .= 'px" class="character-icon' . esc_attr($fight_animation);
                                $html .= 'static' === $direction_label ? ' engage' : '';
                                $html .= '" id = "' . esc_attr($explore_point->post_name);
                                $html .= esc_attr($direction_label);
                                $html .= '" src = "';
                                $html .= esc_url($direction_image) . '" />';
                            }
                        }
                    }

                    // Projectile html for enemy.
                    if ('explore-enemy' === $explore_point->post_type && ('shooter' === $explore_enemy_type || true === $barrage_wave)) {
                        $projectile = $explore_point_meta['explore-projectile'][0] ?? '';

                        if (false !== $projectile) {
                            $projectile_width = $projectile['width'] ?? '0';
                            $projectile_height = $projectile['height'] ?? '0';
                            $projectile_image_url = $projectile['image-url'] ?? '';

                            $html .= '<div class="projectile" data-value="' . esc_attr($value) . '"><img alt="projectile" style="width:' . esc_attr($projectile_width) . 'px; height: ' . esc_attr($projectile_height) . 'px;" src="' . esc_url($projectile_image_url) . '" /></div>';
                        }
                    }

                    // Boss data / html.
                    if ('explore-enemy' === $explore_point->post_type && false === empty($boss_waves)) {
                        if (true === $pulse_wave) {
                            $html .= '<div class="pulse-wave-container" data-value="' . esc_attr($value) . '" data-hazard="true">';
                            $html .= self::getSVGCode(
                                plugin_dir_url(dirname(__FILE__)) . '../assets/src/images/pulse.svg'
                            );
                            $html .= '</div>';
                        }
                    }

                    $html .= '</div>';

                    // Trigger HTML.
                    $projectile_trigger = $explore_point_meta['explore-projectile-trigger'] ?? '';

                    if ('explore-enemy' === $explore_point->post_type && false === empty($projectile_trigger['left'])) {
                        $projectile_trigger_width  = $projectile_trigger['width'] ?? '0';
                        $projectile_trigger_height = $projectile_trigger['height'] ?? '0';
                        $projectile_trigger_top    = $projectile_trigger['top'] ?? '0';
                        $projectile_trigger_left   = $projectile_trigger['left'];


                        $html .= '<div id="' . esc_attr($explore_point->ID) . '-t" class="wp-block-group map-item ' . esc_attr($explore_point->post_name) . '-trigger-map-item is-layout-flow wp-block-group-is-layout-flow"';
                        $html .= ' style="left:' . esc_attr($projectile_trigger_left) . 'px;top:' . esc_attr($projectile_trigger_top) . 'px;height:' . esc_attr($projectile_trigger_height) . 'px; width:' . esc_attr($projectile_trigger_width) . 'px;"';
                        $html .= ' data-trigger="true" data-triggee="' . esc_attr($explore_point->post_name) . '-map-item"';
                        $html .= ' data-meta="explore-projectile-trigger"';
                        $html .= '></div>';
                    }

                    // Trigger Walking Path.
                    if (true === in_array($explore_point->post_type, ['explore-enemy', 'explore-character'], true) && false === in_array('', [$path_trigger_width, $path_trigger_height], true)) {
                        $html .= '<div id="' . esc_attr($explore_point->ID) . '-t" class="path-trigger wp-block-group map-item ' . esc_attr($explore_point->post_name) . '-trigger-map-item is-layout-flow wp-block-group-is-layout-flow"';
                        $html .= ' style="left:' . esc_attr($path_trigger_left) . 'px;top:' . esc_attr($path_trigger_top) . 'px;height:' . esc_attr($path_trigger_height) . 'px; width:' . esc_attr($path_trigger_width) . 'px;"';
                        $html .= ' data-trigger="true" data-triggee="' . esc_attr($explore_point->post_name) . '-map-item"';
                        $html .= ' data-meta="explore-path-trigger"';
                        $html .= '></div>';
                    }

                    // Draggable Destination.
                    if (true === $draggable) {
                        $drag_dest = $explore_point_meta['explore-drag-dest'] ?? '';

                        if (false === empty($drag_dest)) {
                            $drag_top = $drag_dest['top'] ?? '';
                            $drag_left = $drag_dest['left'] ?? '';
                            $drag_height = $drag_dest['height'] ?? '';
                            $drag_width = $drag_dest['width'] ?? '';
                            $drag_image = $drag_dest['image'] ?? '';
                            $drag_mission = $drag_dest['mission'] ?? '';
                            $remove = $drag_dest['remove-after'] ?? 'no';
                            $offset = $drag_dest['offset'] ?? '10';
                            $materialize_after_cutscene = $drag_dest['materialize-after-cutscene'] ?? 'none';

                            $html .= '<div id="' . esc_attr($explore_point->ID) . '-d" class="drag-dest wp-block-group map-item ' . esc_attr($explore_point->post_name) . '-drag-dest-map-item is-layout-flow wp-block-group-is-layout-flow"';
                            $html .= ' style="z-index:0;left:' . esc_attr($drag_left) . 'px;top:' . esc_attr($drag_top) . 'px;height:' . esc_attr($drag_height) . 'px; width:' . esc_attr($drag_width) . 'px;"';

                            if ('yes' === $remove) {
                                $html .= ' data-removable="true"';
                            }

                            if (false === empty($materialize_after_cutscene) && 'none' !== $materialize_after_cutscene) {
                                $html .= ' data-showaftercutscene="' . esc_attr($materialize_after_cutscene) . '"';
                            }

                            $html .= ' data-offset="' . esc_attr($offset) . '"';
                            $html .= ' data-meta="explore-drag-dest" ';
                            $html .= ' data-mission="' . esc_attr($drag_mission) . '">';
                            $html .= '<img height="' . esc_attr($drag_height) . 'px" width="' . esc_attr($drag_width) . 'px" src="' . esc_attr($drag_image) . '" alt="' . esc_attr($explore_point->post_title) . '-drag-dest">';
                            $html .= '</div>';
                        }
                    }

                    if (false === empty($materialize_item_trigger['top']) && false === $is_materialized_item_triggered) {
                        $materialize_item_top = $materialize_item_trigger['top'];
                        $materialize_item_left = $materialize_item_trigger['left'] ?? '';
                        $materialize_item_height = $materialize_item_trigger['height'] ?? '';
                        $materialize_item_width = $materialize_item_trigger['width'] ?? '';

                        $html .= '<div class="materialize-item-trigger wp-block-group map-item ' . esc_attr($explore_point->post_name) . '-materialize-item-map-item is-layout-flow wp-block-group-is-layout-flow" data-type="point" data-value="0"';
                        $html .= ' data-meta="explore-materialize-item-trigger"';
                        $html .= ' style="z-index:0;left:' . esc_attr($materialize_item_left) . 'px;top:' . esc_attr($materialize_item_top) . 'px;height:' . esc_attr($materialize_item_height) . 'px; width:' . esc_attr($materialize_item_width) . 'px;"';
                        $html .= '">';
                        $html .= '</div>';
                    }
                }
            }
        }

        $indicator = get_option('explore_indicator_icon', plugin_dir_url(__FILE__) . '../assets/src/images/indicator.svg');
        $indicator = false === empty($indicator) ? $indicator : plugin_dir_url(__FILE__) . '../assets/src/images/indicator.svg';

        $html .= '<div class="indicator-icon"><img src="' . esc_url($indicator) . '" width="15" height="15" /></div>';


        // Trigger Mission complete.
        if (false === empty($mission_trigger_html)) {
            $html .= $mission_trigger_html;
        }

        return $html;
    }

    /**
     * @param string $item_name
     * @param string $location
     * @param integer $userid
     * @return bool
     */
    public static function isMaterializedItemTriggered(string $item_name, string $location, int $userid): bool
    {
        if (0 >= $userid) {
            $user   = wp_get_current_user();
            $userid = $user->ID;
        }

        if (0 >= $userid) {
            return false;
        }

        $materialize_items = get_user_meta($userid, 'explore_materialized_items', true);

        if (
            ! is_array($materialize_items)
            || ! isset($materialize_items[$location])
            || ! is_array($materialize_items[$location])
        ) {
            return false;
        }

        return in_array($item_name, $materialize_items[$location], true);
    }

    /**
     * Build html for map items.
     * @param array $explore_cutscenes
     * @param string $position
     * @param integer $userid
     * @return string
     */
    public static function getMapCutsceneHTML(array $explore_cutscenes, string $position, int $userid): string
    {
        if (0 >= $userid) {
            $user   = wp_get_current_user();
            $userid = $user->ID;
        }

        $html   = '';
        $area   = get_posts(
            [
                'post_type'      => 'explore-area',
                'name'           => sanitize_key($position),
                'posts_per_page' => 1,
                'no_found_rows'  => true,
                'post_status'    => 'publish',
            ]
        );

        $is_area_cutscene = false === empty($area[0]) && 'yes' === get_post_meta($area[0]->ID, 'explore-is-cutscene', true);
        $area_name        = false === empty($area[0]) ? $area[0]->post_name : '';

        foreach( $explore_cutscenes as $explore_cutscene ) {
            $cutscene_post_meta = [];
            $raw_meta = get_post_meta($explore_cutscene->ID);

            foreach ($raw_meta as $key => $values) {
                $cutscene_post_meta[$key] = maybe_unserialize($values[0] ?? null);
            }

            $character                  = $cutscene_post_meta['explore-character'] ?? '';
            $next_area                  = $cutscene_post_meta['explore-next-area'] ?? '';
            $minigame                   = $cutscene_post_meta['explore-cutscene-minigame'] ?? '';
            $mute_music                 = $cutscene_post_meta['explore-mute-music'] ?? '';
            $value_type                 = $cutscene_post_meta['explore-value-type'] ?? '';
            $value                      = $cutscene_post_meta['explore-value'] ?? '';
            $has_video                  = has_block('video', $explore_cutscene->post_content);
            $cutscene_trigger           = $cutscene_post_meta['explore-cutscene-trigger'] ?? '';
            $character_position         = $cutscene_post_meta['explore-cutscene-character-position'] ?? '';
            $next_area_position         = $cutscene_post_meta['explore-cutscene-next-area-position'] ?? '';
            $npc_face_me                = $cutscene_post_meta['explore-npc-face-me'] ?? '';
            $character_position_left    = $character_position['left'] ?? '';
            $character_position_top     = $character_position['top'] ?? '';
            $next_area_position_left    = $next_area_position['left'] ?? '';
            $next_area_position_top     = $next_area_position['top'] ?? '';
            $walking_path               = $cutscene_post_meta['explore-path-after-cutscene'] ?? '';
            $walking_speed              = $cutscene_post_meta['explore-speed'] ?? '';
            $time_between               = $cutscene_post_meta['explore-time-between'] ?? '';
            $character_position_trigger = $cutscene_post_meta['explore-cutscene-move-npc'] ?? '';
            $mission_cutscene           = $cutscene_post_meta['explore-mission-cutscene'] ?? '';
            $music                      = $cutscene_post_meta['explore-cutscene-music'] ?? '';
            $materialize_cutscene       = $cutscene_post_meta['explore-materialize-after-cutscene'] ?? ''; // The cutscene that materializes this cutscene.
            $mission_complete_cutscene  = $cutscene_post_meta['explore-mission-complete-cutscene'] ?? '';
            $boss_fight                 = $cutscene_post_meta['explore-cutscene-boss'] ?? '';
            $cutscene_trigger_type      = $cutscene_post_meta['explore-trigger-type'] ?? '';
            $next_area_datapoint        = false === empty($next_area) ? ' data-nextarea="' . esc_attr($next_area) . '"' : '';
            $cutscene_name              = $explore_cutscene->post_name;
            $is_cutscene_triggered      = self::isMaterializedItemTriggered($explore_cutscene->post_name, $area_name, $userid);
            $communicate_engage         = $cutscene_post_meta['explore-engage-communicate'] ?? '';
            $character_ids              = [];

            $html .= '<div class="wp-block-group map-cutscene ' . esc_attr($cutscene_name) . '-map-cutscene is-layout-flow wp-block-group-is-layout-flow"';
            $html .= ' id="' . esc_attr($explore_cutscene->ID) . '"';

            if (false === empty($mission_cutscene)) {
                $html .= ' data-mission="' . esc_attr($mission_cutscene) . '"';
            }

            if (false === empty($cutscene_trigger_type)) {
                $html .= ' data-triggertype="' . esc_attr($cutscene_trigger_type) . '"';
            }

            if (false === empty($npc_face_me)) {
                $html .= ' data-npcfaceme="' . esc_attr($npc_face_me) . '"';
            }

            if (false === empty($communicate_engage)) {
                $html .= ' data-communicate="' . esc_attr(str_replace(' ', '-', strtolower($communicate_engage))) . '"';
            }

            $explore_path = false === empty($walking_path) ? wp_json_encode($walking_path) : '[{"top":"0","left":"0"}]';

            if ( $walking_speed ) {
                $html .= ' data-speed="' . esc_attr($walking_speed) . '"';
            }

            if ( $time_between ) {
                $html .= ' data-timebetween="' . esc_attr($time_between) . '"';
            }

            if ('[{"top":"0","left":"0"}]' !== $explore_path) {
                $html .= ' data-path=\'' . esc_attr($explore_path) . '\'';
            }

                // Add for use in making cutscene triggered by touching character.
            if (false === empty($character)) {
                $html .= ' data-character="' . esc_attr($character) . '"';
            }

            // Add for type of value you receive once completing this cutscene.
            if (false === empty($value_type)) {
                $html .= ' data-type="' . esc_attr($value_type) . '"';
            }

            // Add for type of value you receive once completing this cutscene.
            if (false === empty($value)) {
                $html .= ' data-value="' . esc_attr($value) . '"';
            }

            if (false === empty($music)) {
                $html .= ' data-music="' . esc_attr($music) . '"';
            }

            if (false === empty($mute_music) && 'yes' === $mute_music) {
                $html .= ' data-mutemusic="' . esc_attr($mute_music) . '"';
            }

            // Minigame that triggers cutscene.
            if (false === empty($minigame) && false === is_array($minigame)) {
                $html .= ' data-minigame="' . esc_attr($minigame) . '"';
            }

            // Has video in content.
            if (true === $has_video) {
                $html .= ' data-video="true"';
            }

            // Boss Fight.
            if (false === empty($boss_fight)) {
                $html .= ' data-boss="' . esc_attr($boss_fight) . '"';
            }

            // Add data point for the mission that is complete by having this cutscene.
            if (false === empty($mission_complete_cutscene)) {
                $html .= ' data-missioncomplete="' . esc_attr($mission_complete_cutscene) . '"';
            }

            // Add character position point if selected.
            if (false === empty($character_position_top)) {
                $data = wp_json_encode([
                    [
                        'left'    => $character_position_left,
                        'top'     => $character_position_top,
                        'trigger' => $character_position_trigger,
                    ],
                ]);

                $html .= " data-character-position='" . esc_attr( $data ) . "'";
            }

            if (false === empty($next_area)) {
                $area_obj = get_posts(
                    [
                        'name'           => sanitize_key($next_area),
                        'post_type'      => 'explore-area',
                        'post_status'    => 'publish',
                        'posts_per_page' => 1,
                        'no_found_rows'  => true,
                    ]
                );

                $html .= $next_area_datapoint;

                if (false === empty($next_area_position_top)) {
                    $next_area_position_data = wp_json_encode([
                        'left' => $next_area_position_left,
                        'top'  => $next_area_position_top,
                    ]);

                    $html .= " data-nextarea-position='" . esc_attr( $next_area_position_data ) . "'";
                }

                if (isset($area_obj[0]->ID)) {
                    $html .= ' data-mapurl="' . esc_url(get_post_meta($area_obj[0]->ID, 'explore-map', true)) . '"';
                }
            }

            $html .= '>';

            $blocks = parse_blocks( (string) $explore_cutscene->post_content );

            if (is_array($blocks)) {
                foreach ($blocks as $block) {
                    $character_ids[] = $block['attrs']['selectedCharacter'] ?? '';
                }
            }

            $unique_character_ids = array_unique($character_ids);

            if (false === $is_area_cutscene) {
                $html .= '<div class="character-image-wrapper">';
                foreach($unique_character_ids as $character_id) {
                    if ( false === empty($character_id) ) {
                        $html .= '<div data-character="' . esc_attr($character_id) . '" class="cut-character"><img src="' . esc_url(get_the_post_thumbnail_url($character_id)) . '"/></div>';
                    }
                }
                $html .= '</div>';
            }

            $html .= '<div class="character-name-wrapper">';
            foreach($unique_character_ids as $character_id) {
                if ( false === empty($character_id) ) {
                    $character_name = get_post_meta($character_id, 'explore-character-name', true);
                    $character_name = false === empty($character_name) ? $character_name : get_post_field('post_title', $character_id);

                    $html .= '<div data-character="' . esc_attr($character_id) . '" class="character-name">' . esc_html($character_name) . '</div>';
                }
            }

            // Raw content for game engine; do not apply WordPress filters.
            $html .= 'explore-area' !== $explore_cutscene->post_type ? wp_kses_post($explore_cutscene->post_content) : '';
            $html .= '</div>';

            if (true === $has_video) {
                $html .= '<span id="skip-cutscene-video">SKIP</span>';
            }

            $html .= '</div>';

            $path_trigger_left   = false === empty($cutscene_trigger['left']) && 0 !== $cutscene_trigger['left'] ? $cutscene_trigger['left'] : '0';
            $path_trigger_top    = false === empty($cutscene_trigger['top']) && 0 !== $cutscene_trigger['top'] ? $cutscene_trigger['top'] : '0';
            $path_trigger_height = false === empty($cutscene_trigger['height']) && 0 !== $cutscene_trigger['height'] ? $cutscene_trigger['height'] : '0';
            $path_trigger_width  = false === empty($cutscene_trigger['width']) && 0 !== $cutscene_trigger['width'] ? $cutscene_trigger['width'] : '0';

            // Trigger Cutscene.
            if (false === in_array( '0', [$path_trigger_width, $path_trigger_height], true) && false === $is_cutscene_triggered) {
                $html .= '<div id="' . esc_attr($explore_cutscene->ID) . '-t" class="cutscene-trigger wp-block-group map-item ' . esc_attr($explore_cutscene->post_name) . '-cutscene-trigger-map-item is-layout-flow wp-block-group-is-layout-flow"';
                $html .= ' style="left:' . esc_attr($path_trigger_left) . 'px;top:' . esc_attr($path_trigger_top) . 'px;height:' . esc_attr($path_trigger_height) . 'px; width:' . esc_attr($path_trigger_width) . 'px;"';
                $html .= ' data-trigger="true" data-triggee="' . esc_attr($explore_cutscene->post_name) . '"';
                $html .= ' data-triggertype="' . esc_attr($cutscene_trigger_type) . '"';

                if (false === empty($materialize_cutscene)) {
                    $html .= ' data-materializecutscene="' . esc_attr($materialize_cutscene) . '"';
                }

                $html .= ' data-meta="explore-cutscene-trigger"';
                $html .= '></div>';
            }
        }

        return $html;
    }

    /**
     * Build html for map items.
     *
     * @param string $location
     * @param integer $userid
     * @return string
     */
    public static function getMapCommunicateHTML(string $location, int $userid): string
    {
        if (0 >= $userid) {
            $user   = wp_get_current_user();
            $userid = $user->ID;
        }

        $html   = '';
        $trhtml = '';

        $location_obj = get_posts(
            [
                'name'           => sanitize_key($location),
                'post_type'      => 'explore-area',
                'posts_per_page' => 1,
                'post_status'    => 'publish',
                'no_found_rows'  => true,
            ]
        );

        $location_communicate_type = isset($location_obj[0]->ID) ? get_post_meta($location_obj[0]->ID, 'explore-communicate-type', true) : '';
        $communication_type        = false === empty($location_communicate_type) ? get_term_by('name', $location_communicate_type, 'explore-communication-type') : '';
        $communication_background  = false === empty($communication_type) ? get_term_meta($communication_type->term_id, 'explore-background', true) : '';
        $current_received          = 0 < $userid ? get_user_meta($userid, 'explore_received_communicates', true) : '';

        if (false === empty($communication_background)) {
            $html .= '<div style="background: url(' . esc_url($communication_background) . ') no-repeat; background-size: contain;" class="communication-wrapper ' . esc_attr($communication_type->slug) . '-map-item" id="' . esc_attr($communication_type->term_id) . '">';

            $explore_communicates = get_posts(
                [
                    'posts_per_page' => -1,
                    'post_type'      => 'explore-communicate',
                    'post_status'    => 'publish',
                    'no_found_rows'  => true,
                    // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_tax_query
                    'tax_query'      => [
                        [
                            'taxonomy' => 'explore-communication-type',
                            'field'    => 'name',
                            'terms'    => sanitize_key($location_communicate_type),
                        ]
                    ],
                    // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
                    'meta_query' => [
                        [
                            'key'     => 'explore-area',
                            'value'   => sanitize_key($location),
                            'compare' => '=',
                        ]
                    ],
                ]
            );

            $included_posts = get_posts([
                'posts_per_page' => 500,
                'post_type'      => 'explore-communicate',
                'post__in'       => (
                    is_array($current_received)
                    && isset($current_received[$communication_type->term_id])
                    && is_array($current_received[ $communication_type->term_id])
                ) ? $current_received[$communication_type->term_id] : [],
                'post_status'    => 'publish',
                'no_found_rows'  => true,
            ]);

            $explore_communicates = is_array($explore_communicates) ? $explore_communicates : [];
            $included_posts       = is_array($included_posts) ? $included_posts : [];
            $explore_communicates = array_unique(
                array_merge($explore_communicates, $included_posts),
                SORT_REGULAR
            );

            foreach ($explore_communicates as $explore_communicate) {
                $explore_communicate_meta = [];
                if (!$communication_type || !isset($communication_type->term_id, $communication_type->slug)) {
                    return '';
                }

                $raw_meta = get_post_meta($explore_communicate->ID);

                foreach ($raw_meta as $key => $values) {
                    $explore_communicate_meta[$key] = maybe_unserialize($values[0] ?? null);
                }

                $materialize_after_mission  = $explore_communicate_meta['explore-materialize-after-mission'] ?? ''; // The mission that makes this communicate appear.
                $mute_music                 = $explore_communicate_meta['explore-mute-music'] ?? '';
                $communicate_trigger_top    = $explore_communicate_meta['explore-top'] ?? '';
                $communicate_trigger_left   = $explore_communicate_meta['explore-left'] ?? '';
                $communicate_trigger_height = $explore_communicate_meta['explore-height'] ?? '';
                $communicate_trigger_width  = $explore_communicate_meta['explore-width'] ?? '';
                $communicate_type           = $explore_communicate_meta['explore-communicate-type'] ?? '';
                $mission_communicate        = $explore_communicate_meta['explore-mission-communicate'] ?? '';
                $music                      = $explore_communicate_meta['explore-communicate-music'] ?? '';
                $communicate_name           = $explore_communicate->post_name;

                $html .= '<div class="wp-block-group map-communicate ' . esc_attr($communicate_name) . '-map-communicate is-layout-flow wp-block-group-is-layout-flow"';
                $html .= ' id="' . esc_attr($explore_communicate->ID) . '"';

                // The mission that will start a communication.
                if (false === empty($mission_communicate)) {
                    $html .= ' data-mission="' . esc_attr($mission_communicate) . '"';
                }

                if (false === empty($music)) {
                    $html .= ' data-music="' . esc_attr($music) . '"';
                }

                if (false === empty($mute_music) && 'yes' === $mute_music) {
                    $html .= ' data-mutemusic="' . esc_attr($mute_music) . '"';
                }

                if (false === empty($communicate_type)) {
                    $html .= ' data-type="' . esc_attr($communicate_type) . '"';
                }

                $html .= '>';

                $blocks = parse_blocks((string) $explore_communicate->post_content);
                $character_id = '';

                if (is_array($blocks) && isset($blocks[0]['attrs']['selectedCharacter'])) {
                    $character_id = $blocks[0]['attrs']['selectedCharacter'];
                }

                $html .= '<div data-character="' . esc_attr($character_id) . '" class="communicate-character"><img src="' . esc_url(get_the_post_thumbnail_url($character_id)) . '"/></div>';
                $html .= '<div class="message-wrapper">';
                $html .= '<span class="communicate-name">' . esc_html(get_the_title($character_id)) . '</span>';
                // Raw content for game engine; do not apply WordPress filters.
                $html .= wp_kses_post($explore_communicate->post_content);
                $html .= '</div>';
                $html .= '</div>';

                // Trigger communicate.

                if ('' !== $communicate_trigger_top && '' !== $communicate_trigger_height) {
                    $trhtml .= '<div id="' . esc_attr($explore_communicate->ID) . '-t" class="communicate-trigger wp-block-group map-item ' . esc_attr($explore_communicate->post_name) . '-communicate-trigger-map-item is-layout-flow wp-block-group-is-layout-flow"';
                    $trhtml .= ' style="left:' . esc_attr($communicate_trigger_left) . 'px;top:' . esc_attr($communicate_trigger_top) . 'px;height:' . esc_attr($communicate_trigger_height) . 'px; width:' . esc_attr($communicate_trigger_width) . 'px;"';
                    $trhtml .= ' data-trigger="true" data-triggee="' . esc_attr($explore_communicate->post_name) . '"';
                    $trhtml .= ' data-materializemission="' . esc_attr($materialize_after_mission) . '"';
                    $trhtml .= ' data-meta="explore-communicate-trigger"';
                    $trhtml .= '></div>';
                }
            }

            $html .= '</div>';
            $html .= $trhtml;
        }

        return $html;
    }

    /**
     * Build html for minigame items.
     * @param array $explore_minigames
     *
     * @return string
     */
    public static function getMinigameHTML(array $explore_minigames): string
    {
        $html = '';

        foreach($explore_minigames as $minigame) {
            if (isset($minigame->ID)) {
                $minigame_mission      = get_post_meta($minigame->ID, 'explore-mission', true);
                $music                 = get_post_meta($minigame->ID, 'explore-minigame-music', true);
                $minigame_type         = get_post_meta($minigame->ID, 'explore-minigame-type', true);
                $binary_translate_word = get_post_meta($minigame->ID, 'explore-translate-binary-word', true);
                $draggable_images      = get_post_meta($minigame->ID, 'explore-draggable-items', true);

                $html .= '<div class="minigame ' . esc_attr($minigame->post_name) . '-minigame-item" data-music="' . esc_attr($music) . '" data-mission="' . esc_attr($minigame_mission) . '">';
                $html .= '<div class="computer-chip">' . self::getSVGCode(get_the_post_thumbnail_url($minigame->ID)) . '</div>';
                $html .= '<div class="draggable-images">';

                if (false === empty($draggable_images) && true === is_array($draggable_images)) {
                    foreach ($draggable_images as $draggable_image) {
                        $html .= '<img class="minigame-draggable-image" src="' . esc_url($draggable_image['draggable-item'] ?? '') . '" draggable="true" />';
                    }
                }

                $html .= '</div>';

                if (false === empty($minigame_type) && 'draggable' === $minigame_type && false === empty($binary_translate_word)) {
                    $html .= '<div class="minigame-programming" >';
                    $html .= '<div class="input-section">';
                    $html .= '<div class="programming-output">';
                    $html .= '<textarea style="max-width:100%;" cols="150" rows="20"></textarea>';
                    $html .= '</div>';
                    $html .= '</div>';
                    $html .= '<p class="programming-subject">Translate the <strong>' . esc_html($binary_translate_word) . '</strong> into binary:</p>';
                    $html .= '<img class="alignnone size-full wp-image-3674" src="' . esc_url(plugin_dir_url(__FILE__) . '../assets/src/images/binary.svg') . '" alt="" />';
                    $html .= '</div>';
                }

                $html .= '</div>';
            }
        }

        return $html;
    }

    /**
     * Build html for explainers.
     * @param array $explore_explainers
     * @param string $type
     *
     * @return string
     */
    public static function getExplainerHTML(array $explore_explainers, string $type): string
    {
        if (true === empty($explore_explainers) || true === empty($type)) {
            return '';
        }

        $html          = '';
        $border_color  = get_option('explore_explainer_border_color', '');
        $border_radius = absint(get_option('explore_explainer_border_radius', '0'));
        $border_size   = absint(get_option('explore_explainer_border_size', '0'));
        $border_style  = get_option('explore_explainer_border_style', '');

        foreach($explore_explainers as $explainer) {
            $explainer_meta = [];
            $raw_meta = get_post_meta($explainer->ID);

            foreach ($raw_meta as $key => $values) {
                $explainer_meta[$key] = maybe_unserialize($values[0] ?? null);
            }

            $explainer_type = $explainer_meta['explore-explainer-type'] ?? '';
            $sound_byte     = $explainer_meta['explore-sound-byte'] ?? '';

            if ($type === $explainer_type) {
                $trigger                    = $explainer_meta['explore-explainer-trigger'] ?? '';
                $explainer_left             = $explainer_meta['explore-left'] ?? '0';
                $explainer_top              = $explainer_meta['explore-top'] ?? '0';
                $width_value                = $explainer_meta['explore-width'] ?? '0';
                $explainer_width            = ('fullscreen' === $type)
                    ? 'width: 100%; max-width:' . $width_value
                    : 'width:' . $width_value;
                $arrow_style                = $explainer_meta['explore-explainer-arrow'] ?? '';
                $materialize_after_cutscene = $explainer_meta['explore-materialize-after-cutscene'] ?? '';
                $materialize_after_mission  = $explainer_meta['explore-materialize-after-mission'] ?? '';
                $trigger                    = is_array($trigger) ? $trigger : [];
                $arrow_style                = is_array($arrow_style) ? $arrow_style : [];
                $path_trigger_top           = false === empty($trigger['top']) && '0' !== $trigger['top'] ? $trigger['top'] : false;
                $path_trigger_left          = false === empty($trigger['left']) && '0' !== $trigger['left'] ? $trigger['left'] : false;
                $path_trigger_width         = false === empty($trigger['width']) && '0' !== $trigger['width'] ? $trigger['width'] : false;
                $path_trigger_height        = false === empty($trigger['height']) && '0' !== $trigger['height'] ? $trigger['height'] : false;
                $arrow_img                  = get_option('explore_arrow_icon', plugin_dir_url(__FILE__) . '../assets/src/images/arrow-icon.svg');
                $arrow_img                  = false === empty($arrow_img) ? $arrow_img : plugin_dir_url(__FILE__) . '../assets/src/images/arrow-icon.svg';
                $orientation                = $arrow_style['orientation'] ?? 'top';
                $side                       = $arrow_style['side'] ?? 'right';
                $rotation                   = $arrow_style['rotate'] ?? '0';
                $arrow_style_css            = 'transform: rotate(' . esc_attr($rotation) . 'deg); ' . esc_attr($orientation) . ': -130px;' . ' ' . esc_attr($side) . ': 0;';
                $fullscreen                 = 'fullscreen' === $type ? ' fullscreen' : '';

                if (false !== $path_trigger_top) {
                    $html .= '<div id="' . esc_attr($explainer->ID) . '-t" data-trigger="true" class="' . esc_attr($explainer->post_name) . '-explainer-trigger-map-item explainer-trigger map-item" data-triggee="' . esc_attr($explainer->post_name) . '"';
                    $html .= ' data-meta="explore-explainer-trigger"';

                    // Materialize this item after this cutscene.
                    if (false === empty($materialize_after_cutscene)) {
                        $html .= ' data-showaftercutscene="' . esc_attr($materialize_after_cutscene) . '"';
                    }

                    // Materialize this item after this mission.
                    if (false === empty($materialize_after_mission)) {
                        $html .= ' data-materializemission="' . esc_attr($materialize_after_mission) . '"';
                    }

                    $html .= ' style="left:' . esc_attr($path_trigger_left) . 'px;top:' . esc_attr($path_trigger_top) . 'px;height:' . esc_attr($path_trigger_height) . 'px; width:' . esc_attr($path_trigger_width) . 'px;"';
                    $html .= '></div>';
                }

                if (false === empty($explainer_top)) {
                    $html .= '<div id="' . esc_attr($explainer->ID) . '" class="' . esc_attr($explainer->post_name) . '-explainer-item explainer-container map-item' . esc_attr($fullscreen) . '"';
                    $html .= ' style="left:' . esc_attr($explainer_left) . 'px;top:' . esc_attr($explainer_top) . 'px;height:auto; ' . esc_attr($explainer_width) . 'px; border: ' . esc_attr($border_size) . 'px ' . esc_attr($border_style) . ' ' . esc_attr($border_color) . '; border-radius: ' . esc_attr($border_radius) . 'px;"';
                    $html .= ' data-type="' . esc_attr($explainer_type) . '"';
                    $html .= '>';
                    $html .= $arrow_img && 'fullscreen' !== $type ? '<img data-rotate="' . esc_attr($rotation) . '" width="120" height="120" style="'. esc_attr($arrow_style_css) . '" src="' . esc_url($arrow_img) . '" />' : '';
                    // Raw content for game engine; do not apply WordPress filters.
                    $html .= wp_kses_post($explainer->post_content);

                    if (false === empty($sound_byte)) {
                        $html .= '<audio id="' . esc_attr($explainer->ID) . '-s" src="' . esc_url($sound_byte) . '"></audio>';
                    }

                    $html .= '</div>';
                }
            }
        }

        return $html;
    }

    /**
     * Build html for map abilities.
     * @param array $explore_abilities
     *
     * @return string
     */
    public static function getMapAbilitiesHTML(array $explore_abilities): string
    {
        $html   = '';
        $user   = wp_get_current_user();
        $userid = $user->ID;
        $magics = 0 !== $userid ? get_user_meta($userid, 'explore_magic', true) : [];

        foreach($explore_abilities as $explore_ability) {
            if (!isset($explore_ability->ID)) {
                continue;
            }

            if (false === is_array($magics) || false === in_array($explore_ability->ID, $magics, true)) {
                $explore_ability_id = $explore_ability->ID ?? '';
                $unlockable = '' !== $explore_ability_id ? get_post_meta($explore_ability->ID, 'explore-unlock-level', true) : '';

                $html .= '<div class="map-ability"';
                $html .= ' id="' . esc_attr($explore_ability_id) . '"';
                $html .= ' data-genre="explore-magic"';

                if (false === empty($unlockable)) {
                    $html .= ' data-unlockable="' . esc_attr($unlockable) . '"';
                }

                $html .= '></div>';
            }
        }

        return $html;
    }

    /**
     * Register post type for page components.
     *
     * @action init
     */
    public function registerPostType(): void
    {
        $post_types = [
            'explore-area'        => [
                'Area',
                'supports' => ['title']
            ],
            'explore-point'       => [
                'Item',
                'supports' => ['title', 'thumbnail']
            ],
            'explore-character'   => [
                'Character',
                'supports' => ['title', 'thumbnail']
            ],
            'explore-cutscene'    => [
                'Cutscene',
                'supports' => ['title', 'editor']
            ],
            'explore-enemy'       => [
                'Enemy',
                'supports' => ['title', 'thumbnail']
            ],
            'explore-weapon'      => [
                'Weapon',
                'supports' => ['title', 'editor', 'thumbnail']
            ],
            'explore-mission'     => [
                'Mission',
                'supports' => ['title']
            ],
            'explore-sign'        => [
                'Focus View',
                'supports' => ['title', 'editor', 'thumbnail']
            ],
            'explore-minigame'    => [
                'Minigame',
                'supports' => ['title', 'thumbnail']
            ],
            'explore-explainer'   => [
                'Explainer',
                'supports' => ['title', 'editor']
            ],
            'explore-wall'      => [
                'Wall',
                'supports' => ['title']
            ],
            'explore-communicate' => [
                'Communication',
                'supports' => ['title', 'editor', 'thumbnail']
            ],
        ];

        $taxo_types = [
            'explore-communication-type' => [
                'name'       => 'Communication Type',
                'post-types' => ['explore-communicate']
            ]
        ];

        foreach($post_types as $slug => $info) {
            $labels = [];

            if (isset($info[0])) {
                $singular = $info[0];
                $plural   = $info[0] . 's';

                $labels = [
                    'name'                  => esc_html($plural),
                    'singular_name'         => esc_html($singular),
                    'menu_name'             => esc_html($plural),
                    'name_admin_bar'        => esc_html($singular),

                    'attributes' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('%s Attributes', 'orbem-studio'),
                        $singular
                    ),

                    'parent_item_colon' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('Parent %s:', 'orbem-studio'),
                        $singular
                    ),

                    'all_items' => sprintf(
                    /* translators: %s: Plural post type name */
                        esc_html__('All %s', 'orbem-studio'),
                        $plural
                    ),

                    'add_new_item' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('Add New %s', 'orbem-studio'),
                        $singular
                    ),

                    'add_new' => esc_html__('Add New', 'orbem-studio'),

                    'new_item' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('New %s', 'orbem-studio'),
                        $singular
                    ),

                    'edit_item' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('Edit %s', 'orbem-studio'),
                        $singular
                    ),

                    'update_item' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('Update %s', 'orbem-studio'),
                        $singular
                    ),

                    'view_item' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('View %s', 'orbem-studio'),
                        $singular
                    ),

                    'view_items' => sprintf(
                    /* translators: %s: Plural post type name */
                        esc_html__('View %s', 'orbem-studio'),
                        $plural
                    ),

                    'search_items' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('Search %s', 'orbem-studio'),
                        $singular
                    ),

                    'not_found' => sprintf(
                    /* translators: %s: Plural post type name */
                        esc_html__('No %s found', 'orbem-studio'),
                        $plural
                    ),

                    'not_found_in_trash' => sprintf(
                    /* translators: %s: Plural post type name */
                        esc_html__('No %s found in Trash', 'orbem-studio'),
                        $plural
                    ),

                    'featured_image' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('%s Image', 'orbem-studio'),
                        $singular
                    ),

                    'set_featured_image' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('Set %s image', 'orbem-studio'),
                        $singular
                    ),

                    'remove_featured_image' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('Remove %s image', 'orbem-studio'),
                        $singular
                    ),

                    'use_featured_image' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('Use as %s image', 'orbem-studio'),
                        $singular
                    ),

                    'uploaded_to_this_item' => sprintf(
                    /* translators: %s: Singular post type name */
                        esc_html__('Uploaded to this %s', 'orbem-studio'),
                        $singular
                    ),

                    'items_list' => sprintf(
                    /* translators: %s: Plural post type name */
                        esc_html__('%s list', 'orbem-studio'),
                        $plural
                    ),

                    'items_list_navigation' => sprintf(
                    /* translators: %s: Plural post type name */
                        esc_html__('%s list navigation', 'orbem-studio'),
                        $plural
                    ),

                    'filter_items_list' => sprintf(
                    /* translators: %s: Plural post type name */
                        esc_html__('Filter %s list', 'orbem-studio'),
                        $plural
                    ),
                ];
            }

            $args = [
                'labels'             => $labels,
                'menu_icon'          => 'dashicons-location-alt',
                'public'             => false,
                'publicly_queryable' => false,
                'show_ui'            => true,
                'show_in_menu'       => true,
                'query_var'          => true,
                'rewrite'            => ['slug' => $slug],
                'capability_type'    => 'page',
                'has_archive'        => false,
                'hierarchical'       => false,
                'map_meta_cap'       => true,
                'menu_position'      => null,
                'show_in_rest'       => true,
                'supports'           => $info['supports'],
            ];

            register_post_type( $slug, $args );
        }

        foreach($taxo_types as $slug => $stuff) {
            // Add explore area sync with explore point taxo.
            $arg2s = [
                'label'             => esc_html($stuff['name']),
                'hierarchical'      => true,
                'public'            => true,
                'show_ui'           => true,
                'show_admin_column' => true,
                'query_var'         => true,
                'rewrite'           => ['slug' => $slug],
                'show_in_rest'      => true,
            ];

            register_taxonomy($slug, $stuff['post-types'], $arg2s);
        }
    }

    /**
     * Get current point width based on equipped weapons and gear.
     * @return array
     */
    public static function getCurrentPointWidth(): array
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        $base_amounts = [
            'health' => 100,
            'mana'   => 100,
            'power'  => 100,
            'money'  => 0,
        ];

        if (0 === $userid) {
            return $base_amounts;
        }

        $gear = get_user_meta($userid, 'explore_current_gear', true);

        if (!is_array($gear)) {
            return $base_amounts;
        }

        foreach ($base_amounts as $type => $base_value) {
            if (!empty($gear[$type]) && is_array($gear[$type])) {
                foreach ($gear[$type] as $gear_amount) {
                    if (is_array($gear_amount)) {
                        $value = (int) reset($gear_amount);
                        $base_amounts[$type] += $value;
                    }
                }
            }
        }

        return $base_amounts;
    }

    /**
     * Map of levels.
     * @return int[]
     */
    public static function getLevelMap(): array
    {
        return [
            0,
            200,
            600,
            1200,
            2000,
            3000,
            4200,
            5600,
            7200,
        ];
    }

    /**
     * Get current level.
     *
     * @return int
     */
    public static function getCurrentLevel(): int
    {
        $levels = self::getLevelMap();

        if (empty($levels) || !is_array($levels)) {
            return 1;
        }

        sort($levels, SORT_NUMERIC);

        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        if (0 === $userid) {
            return 1;
        }

        $meta   = get_user_meta($userid, 'explore_points', true);
        $points = 0;

        if (is_array($meta) && isset($meta['point']['points'])) {
            $points = (int) $meta['point']['points'];
        }

        $count = count($levels);

        for ($i = 0; $i < $count; $i++) {
            $current = $levels[$i];
            $next    = $levels[$i + 1] ?? null;

            if ($points === $current) {
                return $i + 1;
            }

            if (null !== $next && $points > $current && $points < $next) {
                return $i + 1;
            }
        }

        // If points exceed all thresholds, return max level
        return $count;
    }

    /**
     * register the mp3 paragraph block.
     *
     * @action enqueue_block_editor_assets
     * @return void
     */
    public function customRegisterParagraphMp3Block(): void
    {
        Plugin::enqueueScript('orbem-order/paragraph-mp3-block');
    }

    /**
     * Register new block category for orbem studio.
     *
     * @param array $categories The current block categories.
     * @param WP_Block_Editor_Context $context
     *
     * @filter block_categories_all
     */
    public function blockCategory(array $categories, \WP_Block_Editor_Context $context): array
    {
        if (empty($context->post)) {
            return $categories;
        }

        return array_merge(
            $categories,
            [
                [
                    'slug'  => 'orbem-order-studio',
                    'title' => esc_html__('Orbem Studio', 'orbem-studio'),
                ],
            ]
        );
    }

    /**
     * Get the main character's images.
     *
     * @param string|\WP_Post $main_character
     * @return array
     */
    public static function getCharacterImages(string|\WP_Post $main_character): array
    {
        $meta = [];

        if (is_string($main_character)) {
            $posts = get_posts([
                'post_type'      => ['explore-character', 'explore-enemy'],
                'name'           => sanitize_key($main_character),
                'post_status'    => 'publish',
                'posts_per_page' => 1,
                'no_found_rows'  => true,
            ]);

            if (empty($posts) || ! $posts[0] instanceof \WP_Post) {
                return [];
            }

            $main_character = $posts[0];
        }

        if (!isset($main_character->ID)) {
            return [];
        }

        $raw_meta = get_post_meta($main_character->ID);
        foreach ($raw_meta as $key => $values) {
            $meta[$key] = maybe_unserialize($values[0] ?? null);
        }

        $images        = $meta['explore-character-images'] ?? [];
        $weapon_images = $meta['explore-weapon-images'] ?? [];

        if (!is_array($images)) {
            $images = [];
        }

        if (is_array($weapon_images)) {
            $images = array_merge($images, $weapon_images);
        }

        if (empty($images)) {
            return [];
        }

        $name = $meta['explore-character-name'] ?? $main_character->post_title;

        return [
            'direction_images' => $images,
            'height'           => $meta['explore-height'] ?? '',
            'width'            => $meta['explore-width'] ?? '',
            'ability'          => $meta['explore-ability'] ?? '',
            'weapon'           => $meta['explore-weapon-choice'] ?? '',
            'id'               => $main_character->ID,
            'name'             => $name,
            'voice'            => $meta['explore-voice'] ?? '',
        ];
    }

    /**
     * Google SSO oauth callback.
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function handleGoogleOauthCallback(\WP_REST_Request $request): \WP_REST_Response
    {
        $data       = $request->get_json_params();
        $nonce      = isset($data['nonce']) ? sanitize_text_field($data['nonce']) : '';
        $credential = isset($data['credential']) ? sanitize_text_field(wp_unslash($data['credential'])) : '';
        $client_id  = get_option('explore_google_login_client_id', '');

        if (
            empty($nonce)
            || empty($credential)
            || empty($client_id)
            || !wp_verify_nonce($nonce, 'google_sso_nonce')
        ) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Missing or invalid data point', 'orbem-studio'),
            ]);
        }

        $response = wp_remote_get(
            'https://oauth2.googleapis.com/tokeninfo?id_token=' . rawurlencode($credential),
            ['timeout' => 10]
        );

        if (is_wp_error($response)) {
            return rest_ensure_response(['success' => false]);
        }

        $payload = json_decode(wp_remote_retrieve_body($response), true);

        if (empty($payload['aud']) || $payload['aud'] !== $client_id) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid credentials', 'orbem-studio'),
            ]);
        }

        $payload = json_decode(base64_decode(str_replace('_', '/', str_replace('-', '+', explode('.', $credential)[1]))), true);
        if ($payload['aud'] !== $client_id || $payload['iss'] !== 'https://accounts.google.com') {
            return rest_ensure_response([
                'success' => false,
                'data' => esc_html__('Invalid audience or issuer', 'orbem-studio'),
            ]);
        }

        if ($payload['email_verified'] !== 'true') {
            return rest_ensure_response([
                'success' => false,
                'data' => esc_html__('Invalid email provided to google', 'orbem-studio'),
            ]);
        }

        $email = sanitize_email($payload['email']);
        $first_name = sanitize_user($payload['given_name']);
        $user = get_user_by('email', $email);

        if (!$user) {
            // Create new user
            $username = sanitize_user($first_name);
            if (username_exists($username)) {
                $username .= '_' . wp_generate_password(4, false);
            }
            $user_id = wp_create_user($username, wp_generate_password(), $email);
            wp_update_user([
                'ID' => $user_id,
                'first_name' => $first_name,
            ]);
            $user = get_user_by('id', $user_id);
        }

        // Log in the user
        wp_set_current_user($user->ID);
        wp_set_auth_cookie($user->ID);

        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
        do_action('wp_login', $user->user_login, $user);

        return rest_ensure_response([
            'success' => true,
            'data' => esc_html__('Success', 'orbem-studio'),
        ]);
    }

    /**
     * Call back for google login.
     * @return false|string
     */
    public static function googleLogin(): false|string
    {
        ob_start();
        ?>
        <div id="g_id_onload"
             data-client_id="<?php echo esc_attr(get_option('explore_google_login_client_id', '')); ?>"
             data-nonce="<?php echo esc_attr(wp_create_nonce('google_sso_nonce')); ?>"
             data-context="signin"
             data-ux_mode="popup"
             data-callback="exploreHandleCredentialResponse"
             data-auto_prompt="false">
        </div>

        <div class="g_id_signin"
             data-type="standard"
             data-shape="rectangular"
             data-theme="outline"
             data-text="sign_in_with"
             data-size="large"
             data-logo_alignment="left">
        </div>
        <?php
        return ob_get_clean();
    }
}
