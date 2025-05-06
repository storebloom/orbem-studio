<?php
/**
 * Explore
 *
 * @package OrbemGameEngine
 */

namespace OrbemGameEngine;

/**
 * Explore Class
 *
 * @package OrbemGameEngine
 */
class Explore
{

	/**
	 * Theme instance.
	 *
	 * @var object
	 */
	public $plugin;

	/**
	 * Class constructor.
	 *
	 * @param object $plugin Plugin class.
	 */
	public function __construct($plugin)
    {
		$this->plugin = $plugin;
	}

    /**
     * Add game options menu.
     *
     * @action admin_menu
     * @return void
     */
    public function addGameOptionMenu() {
        $parent_slug  = 'orbem-game-engine';
        $parent_title = 'Game Engine';

        $post_types = [
            'explore-area',
            'explore-point',
            'explore-character',
            'explore-cutscene',
            'explore-enemy',
            'explore-weapon',
            'explore-magic',
            'explore-mission',
            'explore-sign',
            'explore-minigame',
            'explore-explainer',
        ];

        add_menu_page(
            $parent_title,
            $parent_title,
            'manage_options',
            $parent_slug,
            '',
            'dashicons-games',
            25
        );

        add_submenu_page(
            $parent_slug,
            'Game Options',
            'Game Options',
            'manage_options',
            $parent_slug,
            function () {
                echo '<form method="post" action="options.php">';
                settings_fields('options_group');
                do_settings_sections('game_options');
                submit_button();
                echo '</form>';
            }
        );

        foreach ($post_types as $cpt) {
            $obj = get_post_type_object($cpt);
            if (!$obj) continue;

            // Add CPT
            add_submenu_page(
                $parent_slug,
                $obj->labels->menu_name,
                $obj->labels->menu_name,
                $obj->cap->edit_posts,
                "edit.php?post_type=$cpt"
            );

            // Add its taxonomies directly underneath
            $taxonomies = get_object_taxonomies($cpt, 'objects');
            foreach ($taxonomies as $tax) {
                if (!$tax->show_ui || !$tax->show_in_menu) continue;

                add_submenu_page(
                    $parent_slug,
                    '— ' . $tax->labels->name, // visually indented
                    '— ' . $tax->labels->menu_name,
                    $tax->cap->manage_terms,
                    "edit-tags.php?taxonomy={$tax->name}&post_type={$cpt}"
                );
            }

            // Remove original top-level CPT menu
            remove_menu_page("edit.php?post_type=$cpt");
        }
    }


    /**
     * @action admin_head
     * @return void
     */
    public function organizeTaxoMenuItems ()
    {
        global $submenu;

        $screen = get_current_screen();
        if (!$screen || empty($screen->post_type)) {
            return;
        }

        $post_types = [
            'explore-area',
            'explore-point',
            'explore-character',
            'explore-cutscene',
            'explore-enemy',
            'explore-weapon',
            'explore-magic',
            'explore-mission',
            'explore-sign',
            'explore-minigame',
            'explore-explainer',
        ];

        $current_post_type = $screen->post_type;

        if (!in_array($current_post_type, $post_types, true)) {
            return;
        }

        // Get allowed taxonomy slugs for the current CPT
        $allowed_tax_slugs = [];
        $taxonomies = get_object_taxonomies($current_post_type, 'names');
        foreach ($taxonomies as $taxonomy) {
            $allowed_tax_slugs[] = "edit-tags.php?taxonomy={$taxonomy}&post_type={$current_post_type}";
        }

        $menu_slug = 'orbem-game-engine';

        if (!empty($submenu[$menu_slug])) {
            foreach ($submenu[$menu_slug] as $index => $item) {
                $slug = $item[2];
                if (strpos($slug, 'edit-tags.php') === 0 && !in_array($slug, $allowed_tax_slugs, true)) {
                    unset($submenu[$menu_slug][$index]);
                }
            }
        }
    }

    /**
     * @action admin_init
     * @return void
     */
    public function registerGameOptions() {
        $settings = [
            'explore_game_page' => ['text', 'Game Page Title'],
            'explore_indicator_icon' => ['upload', 'Indicator Icon'],
            'explore_arrow_icon' => ['upload', 'Arrow Icon'],
            'explore_intro_video' => ['upload', 'Intro Video'],
            'explore_start_music' => ['upload', 'Start Screen Music'],
            'explore_signin_screen' => ['upload', 'Sign In Screen Background Image'],
            'explore_walking_sound' => ['upload', 'Walking Sound Effect'],
            'explore_points_sound' => ['upload', 'Sound When Points Are Given']
        ];

        add_settings_section('game_options_section', 'Global Game Options', function () {
            settings_fields('game_options');
        }, 'game_options');

        foreach ( $settings as $key => $value ) {
            register_setting('game_options', $key);

            add_settings_field(
                $key,
                $value[1],
                function($args) use ($key, $value) {
                    $field_key = $args[0];
                    $indicator = get_option($field_key, '');

                    if (isset($value[0]) && $value[0] === 'upload') : ?>
                    <div class="explore-image-field">
                        <p>
                            <input type="text" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" value="<?php echo esc_attr($indicator); ?>" class="widefat explore-upload-field" readonly />
                        </p>
                        <p>
                            <button type="button" class="upload_image_button button"><?php _e('Select Image', 'orbem-game-engine'); ?></button>
                            <button type="button" class="remove_image_button button"><?php _e('Remove Image', 'orbem-game-engine'); ?></button>
                        </p>
                    </div>
                    <?php else : ?>
                        <input type="text" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" value="<?php echo esc_attr($indicator); ?>" />
                    <?php endif;
                },
                'game_options',
                'game_options_section',
                [$key, $value]
            );
        }
    }

    /**
     * The callback function for game options menu.
     * @return void
     */
    public function gameOptionsPage() {
        include $this->plugin->plugin_dir . '/templates/game-options-page.php';
    }

    /**
     * Register API field.
     *
     * @action rest_api_init
     */
    public function create_api_posts_meta_field()
    {
        $namespace = 'orbemorder/v1';

        // Register route for getting event by location.
        register_rest_route($namespace, '/add-explore-points/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'addCharacterPoints'],
            'permission_callback' => '__return_true'
        ));

        // Register route for saving storage item.
        register_rest_route($namespace, '/save-storage-item/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'saveStorageItem'],
            'permission_callback' => '__return_true'
        ));

        // Register route for getting event by location.
        register_rest_route($namespace, '/area/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'getOrbemArea'],
            'permission_callback' => '__return_true'
        ));

        // Register route for getting item description.
        register_rest_route($namespace, '/get-item-description/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'getItemDescription'],
            'permission_callback' => '__return_true'
        ));

        // Register route for getting event by location.
        register_rest_route($namespace, '/coordinates/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'saveCoordinates'],
            'permission_callback' => '__return_true'
        ));

        // Register route for getting event by location.
        register_rest_route($namespace, '/resetexplore/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'resetExplore'],
            'permission_callback' => '__return_true'
        ));

        // Register route for getting event by location.
        register_rest_route($namespace, '/addspell/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'addSpell'],
            'permission_callback' => '__return_true'
        ));

        // Register route for saving settings.
        register_rest_route($namespace, '/save-settings/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'saveSettings'],
            'permission_callback' => '__return_true'
        ));

        // Register route for saving enemy info.
        register_rest_route($namespace, '/enemy/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'saveEnemy'],
            'permission_callback' => '__return_true'
        ));

        // Register route for equiping new item.
        register_rest_route($namespace, '/equip-explore-item/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'equipNewItem'],
            'permission_callback' => '__return_true'
        ));

        // Register route for saving completed missions.
        register_rest_route($namespace, '/mission/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'saveMission'],
            'permission_callback' => '__return_true'
        ));

        // Save draggable drop position.
        register_rest_route($namespace, '/save-drag/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'saveDrag'],
            'permission_callback' => '__return_true'
        ));

        // Save draggable drop position.
        register_rest_route($namespace, '/save-materialized-item/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'saveMaterializedItem'],
            'permission_callback' => '__return_true'
        ));

        // Add character to crew list.
        register_rest_route($namespace, '/add-character/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'addCharacter'],
            'permission_callback' => '__return_true'
        ));

        // Add character to crew list.
        register_rest_route($namespace, '/enable-ability/', array(
            'methods'  => 'POST',
            'callback' => [$this, 'enableAbility'],
            'permission_callback' => '__return_true'
        ));
    }

    /**
     * Call back function for rest route that adds spell to the explore_magic user meta
     * @param object $return The arg values from rest route.
     */
    public function addSpell($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $user = isset($return['userid']) ? intval($return['userid']) : '';
        $spell_id = isset($return['spellid']) ? intval($return['spellid']) : '';

        if (!in_array('', [$user, $spell_id], true)) {
            $explore_magic = get_user_meta($user, 'explore_magic', true);
            $explore_magic = false === empty($explore_magic) ? $explore_magic : ['defense' => [], 'offense' => []];
            $spell_type = get_the_terms($spell_id, 'magic-type');
            $the_spell_type = '';

            if (true === is_array($spell_type)) {
                foreach( $spell_type as $type) {
                    if ( true === in_array($type->slug, ['defense', 'offense'], true)) {
                        $the_spell_type = $type->slug;
                    }
                }
            }

            if ( '' !== $the_spell_type ) {
                $explore_magic[$the_spell_type][] = $spell_id;

                update_user_meta($user, 'explore_magic', $explore_magic);
                wp_send_json_success('SPELL ADDED');
            } else {
                wp_send_json_error('no type selected');
            }
        }
    }

    /**
     * Call back function for rest route that adds points to user's explore game.
     * @param $request \OrbemGameEngine\The arg values from rest route.
     */
    public function addCharacterPoints($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        // Process the data (e.g., register the user)
        // Assuming you expect 'username' and 'email' in the JSON data
        $type = sanitize_text_field($data['type']);
        $item = $data['item'];
        $userid = intval($data['userid']);
        $amount = intval($data['amount']);
        $reset = 'true' === $data['reset'];

        $this->savePoint($userid, $type, $amount, $item, $reset);

        wp_send_json_success('success');
    }

    /**
     * Save explore points to array.
     *
     * @param $userid
     * @param $type
     * @param $amount
     * @param $item
     * @return void
     */
    public function savePoint($userid, $type, $amount, $item, $reset = false) {
        if (false === in_array('', [$userid, $item], true)) {
            $current_explore_points = get_user_meta($userid, 'explore_points', true);
            $explore_points         = false === empty($current_explore_points) && is_array($current_explore_points) ? $current_explore_points : [
                'health' => ['points' => 100, 'positions' => []],
                'mana' => ['points' => 100, 'positions' => []],
                'point' => ['points' => 0, 'positions' => []],
                'gear' => ['positions' => []],
                'weapons' => ['positions' => []]
            ];

            if (true === $reset) {
                $explore_points['health']['points'] = 100;
                $explore_points['mana']['points'] = 100;
            }

            $explore_points[$type]['points'] = $amount;

            // Add position to list of positions received points on.
            if (true === is_array($item)) {
                $existing_values = array_intersect($item, $explore_points[$type]['positions']);
                foreach( $existing_values as $existing_value ) {
                    $item_index = array_search($existing_value, $item, true);
                    unset($item[$item_index]);
                }

                $explore_points[$type]['positions'] = array_merge($explore_points[$type]['positions'], $item);
            } elseif (false === in_array($item, $explore_points[$type]['positions']) ) {
                $explore_points[$type]['positions'][] = $item;
            }

            update_user_meta($userid, 'explore_points', $explore_points);
        }
    }

    /**
     * Call back function for rest route that save draggable items positions when dropped.
     * @param object $return The arg values from rest route.
     */
    public function saveDrag($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $user = isset($return['userid']) ? intval($return['userid']) : '';
        $top = isset($return['top']) ? intval($return['top']) : '';
        $left = isset($return['left']) ? intval($return['left']) : '';
        $slug = isset($return['slug']) ? sanitize_text_field(wp_unslash($return['slug'])) : '';

        if (false === in_array('', [$top, $left, $user], true)) {
            $current_explore_drag = get_user_meta($user, 'explore_drag_items', true);

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

            update_user_meta($user, 'explore_drag_items', $current_explore_drag);
        }
    }

    /**
     * Call back function for rest route that save materialized items per location when triggered.
     * @param $request
     */
    public function saveMaterializedItem($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        // Process the data (e.g., register the user)
        // Assuming you expect 'username' and 'email' in the JSON data
        $area = sanitize_text_field($data['area']);
        $item = $data['item'];
        $userid = intval($data['userid']);
        $current_materialized_items = get_user_meta($userid, 'explore_materialized_items', true);
        $current_materialized_items = false === empty($current_materialized_items) ? $current_materialized_items : [];
        $final_items = [];

        if (true === is_array($item)) {
            foreach( $item as $value ) {
                if ( true === empty($final_items[$area][$value])) {
                    $final_items[$area][] = sanitize_text_field(wp_unslash($value));
                }
            }
        }

        update_user_meta($userid, 'explore_materialized_items', array_merge($current_materialized_items, $final_items));

        wp_send_json_success('success');
    }

    /**
     * Call back function for rest route that save materialized items per location when triggered.
     * @param $request
     */
    public function enableAbility($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        // Process the data (e.g., register the user)
        // Assuming you expect 'username' and 'email' in the JSON data
        $slug = $data['slug'];
        $userid = intval($data['userid']);
        $current_abilities = get_user_meta($userid, 'explore_abilities', true);
        $current_abilities = false === empty($current_abilities) ? $current_abilities : [];

        if ( false === in_array($slug, $current_abilities, true) ) {
            $current_abilities[] = $slug;
        }

        update_user_meta($userid, 'explore_abilities', $current_abilities);

        wp_send_json_success('success');
    }

    /**
     * Call back function for rest route that save draggable items positions when dropped.
     * @param object $return The arg values from rest route.
     */
    public function addCharacter($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $user = isset($return['userid']) ? intval($return['userid']) : '';
        $slug = isset($return['slug']) ? sanitize_text_field(wp_unslash($return['slug'])) : '';

        if (false === in_array('', [$user, $slug], true)) {
            $current_characters = get_user_meta($user, 'explore_characters', true);

            if (false === empty($current_characters) && false === in_array($slug, $current_characters, true)) {
                $current_characters[] = $slug;
            } elseif (true === empty($current_characters)) {
                $current_characters = [$slug];
            }

            update_user_meta($user, 'explore_characters', $current_characters);
        }
    }

    /**
     * Call back function for rest route that adds points to user's explore game.
     * @param object $return The arg values from rest route.
     */
    public function saveEnemy($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $user = isset($return['userid']) ? intval($return['userid']) : '';
        $health = isset($return['health']) ? intval($return['health']) : '';
        $position = isset($return['position']) ? sanitize_text_field(wp_unslash($return['position'])) : '';

        if (false === in_array('', [$health, $user, $position], true) && 0 === $health) {
            $explore_enemies = get_user_meta($user, 'explore_enemies', true);

            if (false === empty($explore_enemies)) {
                $explore_enemies[] = $position;
            } else {
                $explore_enemies = [$position];
            }

            update_user_meta($user, 'explore_enemies', $explore_enemies);
        }
    }

    /**
     * Call back function for rest route that saves completed missions.
     * @param object $return The arg values from rest route.
     */
    public function saveMission($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $user = isset($return['userid']) ? intval($return['userid']) : '';
        $mission = isset($return['mission']) ? sanitize_text_field(wp_unslash($return['mission'])) : '';

        if (false === in_array('', [$user, $mission], true)) {
            $explore_missions = get_user_meta($user, 'explore_missions', true);

            if (false === empty($explore_missions)) {
                if (false === in_array($mission, $explore_missions, true)) {
                    $explore_missions[] = $mission;
                }
            } else {
                $explore_missions = [$mission];
            }

            update_user_meta($user, 'explore_missions', $explore_missions);
        }
    }

    /**
     * Call back function for rest route that equips a new item on the player.
     * @param $request \OrbemGameEngine\The arg values from rest route.
     */
    public function equipNewItem($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        // Process the data (e.g., register the user)
        // Assuming you expect 'username' and 'email' in the JSON data
        $type = sanitize_text_field($data['type']);
        $item_id = $data['itemid'];
        $user = intval($data['userid']);
        $amount = intval($data['amount']);
        $unequip = false === empty($data['unequip']) ? 'true' === sanitize_text_field(wp_unslash($data['unequip'])) : '';

        $current_equipped = get_user_meta($user, 'explore_current_' . $type, true);
        $current_equipped = false === empty($current_equipped) ? $current_equipped : [];
        $effect_types = get_the_terms($item_id, 'value-type');
        $the_effect_type = '';

        if (true === is_array($effect_types)) {
            foreach( $effect_types as $effect_type) {
                if ( true === in_array($effect_type->slug, ['mana', 'health', 'power'], true)) {
                    $the_effect_type = $effect_type->slug;
                }
            }
        }

        if (false === $unequip && false === empty($current_equipped[$the_effect_type])) {
            if (true === is_array($current_equipped[$the_effect_type])) {
                foreach ($current_equipped[$the_effect_type] as $current_array) {
                    if (false === in_array(intval($item_id), array_keys($current_array), true)) {
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

        update_user_meta(
            $user,
            'explore_current_' . $type,
            $current_equipped
        );

        wp_send_json_success('equipped ' . $item_id);
    }

    /**
     * Call back function for rest route that storages items.
     * @param object $return The arg values from rest route.
     */
    public function saveStorageItem($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $user = isset($return['user']) ? intval($return['user']) : '';
        $id = isset($return['id']) ? intval($return['id']) : '';
        $value = isset($return['value']) ? intval($return['value']) : '';
        $type = isset($return['type']) ? sanitize_text_field(wp_unslash($return['type'])) : '';
        $name = isset($return['name']) ? sanitize_text_field(wp_unslash($return['name'])) : '';
        $remove = isset($return['remove']) && 'true' === sanitize_text_field(wp_unslash($return['remove']));
        $menu_map = $this->getMenuType($type);

        if (false === in_array('', [$id, $type, $user, $name, $value], true)) {
            $current_storage_items = get_user_meta($user, 'explore_storage', true);
            $item_subtypes = get_the_terms($id, 'value-type');
            $subtype = '';

            foreach($item_subtypes as $item_subtype) {
                if ($type !== $item_subtype->slug) {
                    $subtype = $item_subtype->slug;
                }
            }

            // If remove is true then remove the provided item.
            if (true === $remove) {
                foreach($current_storage_items[$menu_map] as $index => $storage_item) {
                    if ($name === $storage_item['name']) {
                        if (false === empty($storage_item['count']) && 1 < $storage_item['count']) {
                            $current_storage_items[$menu_map][$index]['count'] = $storage_item['count'] - 1;
                        } else {
                            unset($current_storage_items[$menu_map][$index]);
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

                $has_dupe = false;

                if (true === empty($current_storage_items)) {
                    $current_storage_items = ['items' => [], 'weapons' => [['name' => 'fist', 'type' => 'weapons', 'id' => '1641']], 'gear' => []];
                } else {
                    foreach ($current_storage_items[$menu_map] as $index => $item) {
                        if ($name === $item['name']) {
                            $count                                             = $item['count'] ?? 1;
                            $current_storage_items[$menu_map][$index]['count'] = 'weapons' === $menu_map ? 1 : $count + 1;
                            $has_dupe                                          = true;
                        }
                    }
                }

                if (false === $has_dupe) {
                    $current_storage_items[$menu_map][] = $new_item;
                }
            }

            update_user_meta($user, 'explore_storage', $current_storage_items);

            if (true === in_array($menu_map, ['gear', 'weapons'])) {
                $this->savePoint($user, $menu_map, 0 , $name);
            }
        }
    }

    /**
     * Map for menu item versus item type.
     *
     * @param string $menu_type
     */
    public function getMenuType(string $menu_type )
    {
        $menu_map = [
            'health' => 'items',
            'mana' => 'items',
            'gear' => 'gear',
            'weapons' => 'weapons'
        ];

        return $menu_map[$menu_type];
    }

    /**
     * Call back function for rest route that saves game settings.
     * @param $return \OrbemGameEngine\The arg values from rest route.
     */
    public function saveSettings($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        // Process the data (e.g., register the user)
        // Assuming you expect 'username' and 'email' in the JSON data
        $music = intval($data['music']);
        $sfx = intval($data['sfx']);
        $talking = intval($data['talking']);
        $userid = intval($data['userid']);

        if (false === in_array('', [$music, $userid, $sfx, $talking], true)) {
            update_user_meta($userid, 'explore_settings', ['music' => $music, 'sfx' => $sfx, 'talking' => $talking,]);
        }
    }

    /**
     * Call back function for rest route that adds points to user's explore game.
     * @param object $return The arg values from rest route.
     */
    public function getOrbemArea($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $position = isset($return['position']) ? sanitize_text_field(wp_unslash($return['position'])) : '';
        $area = get_posts(['post_type' => 'explore-area', 'name' => $position]);
        $is_area_cutscene = get_post_meta($area[0]->ID, 'explore-is-cutscene', true);

        // Get content from the new explore-area post type.
        $userid = $return['userid'] ?? get_current_user_id();
        $explore_points = self::getExplorePoints($position);
        $explore_cutscenes = self::getExplorePosts($position, 'explore-cutscene');
        $explore_minigames = self::getExplorePosts($position, 'explore-minigame');
        $explore_abilities = Explore::getExploreAbilities();
        $map_items = self::getMapItemHTML($explore_points, $userid, $position);
        $minigames = self::getMinigameHTML($explore_minigames);
        $map_cutscenes = self::getMapCutsceneHTML($explore_cutscenes, $position);
        $map_abilities = self::getMapAbilitiesHTML($explore_abilities);

        ob_start();
        include_once $this->plugin->dir_path . '/../templates/style-scripts.php';
        $area_item_styles_scripts = ob_get_clean();

        ob_start();
        include_once $this->plugin->dir_path . '/../page-templates/components/explore-missions.php';
        $map_missions = ob_get_clean();

        ob_start();
        include_once $this->plugin->dir_path . '/../page-templates/components/explore-characters.php';
        $map_characters = ob_get_clean();

        update_user_meta($userid, 'current_location', $position);

        if (is_wp_error($area) || !isset($area[0])) {
            return;
        }

        wp_send_json_success(
            wp_json_encode(
                [
                    'map-items' => $map_items,
                    'minigames' => $minigames,
                    'map-cutscenes' => $map_cutscenes,
                    'map-missions' => $map_missions,
                    'map-characters' => $map_characters,
                    'map-abilities' => $map_abilities,
                    'map-item-styles-scripts' => $area_item_styles_scripts,
                    'start-top' => get_post_meta($area[0]->ID, 'explore-start-top', true),
                    'start-left' => get_post_meta($area[0]->ID, 'explore-start-left', true),
                    'map-svg' => self::getMapSVG($area[0]),
                    'is-cutscene' => $is_area_cutscene
                ]
            )
        );
    }

    /**
     * Call back function for rest route that returns item description.
     * @param object $return The arg values from rest route.
     */
    public function getItemDescription($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $item = isset($return['id']) ? intval($return['id']) : false;
        $userid = isset($return['userid']) ? intval($return['userid']) : false;

        if ( false !== $item ) {
            // Get content from the new explore-area post type.
            $item_obj = get_post($item);

            // Check if equipped.
            $gear_equipped = get_user_meta( $userid, 'explore_current_gear', true);
            $weapons_equipped = get_user_meta( $userid, 'explore_current_weapons', true);
            $content = $item_obj->post_content;
            $types = get_the_terms($item_obj->ID, 'value-type');
            $item_type = '';

            foreach($types as $type) {
                if (true === in_array($type->slug, ['mana', 'health', 'power'], true)) {
                    $item_type = $type->slug;
                }
            }

            // Check equipped gear. IF so change button to unequip.
            if (false === empty($gear_equipped[$item_type]) && true === is_array($gear_equipped[$item_type])) {
                foreach ($gear_equipped[$item_type] as $current_array) {
                    if (true === in_array(intval($item), array_keys($current_array), true)) {
                        $content = str_replace(['Equip', 'equip', 'Ununequip'],
                            ['Unequip', 'unequip', 'Unequip'],
                            $content);
                    }
                }
            }
            
            // Return the post content for the supplied item.
            wp_send_json_success(wp_json_encode($content));
        } else {
            wp_send_json_error('Item id not provided');
        }
    }

    /**
     * Call back function for rest route that adds coordinates user's explore game.
     * @param object $return The arg values from rest route.
     */
    public function saveCoordinates($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $left = isset($return['left']) ? intval($return['left']) : '';
        $top = isset($return['top']) ? intval($return['top']) : '';
        $current_user = isset($return['userid']) ? intval($return['userid']) : '';

        update_user_meta($current_user, 'current_coordinates', ['left'=>$left,'top'=>$top]);
    }

    /**
     * Call back function to reset explore game.
     * @param object $return The arg values from rest route.
     */
    public function resetExplore($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $return = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $current_user = isset($return['userid']) ? intval($return['userid']) : '';

        delete_user_meta($current_user, 'current_coordinates');
        delete_user_meta($current_user, 'current_location');
        delete_user_meta($current_user, 'explore_points');
        delete_user_meta($current_user, 'explore_enemies');
        delete_user_meta($current_user, 'explore_missions');
        delete_user_meta($current_user, 'explore_storage');
        delete_user_meta($current_user, 'explore_magic');
        delete_user_meta($current_user, 'explore_current_gear');
        delete_user_meta($current_user, 'explore_current_weapons');
        delete_user_meta($current_user, 'explore_missions');
        delete_user_meta($current_user, 'explore_drag_items');
        delete_user_meta($current_user, 'explore_characters');
        delete_user_meta($current_user, 'explore_materialized_items');
        delete_user_meta($current_user, 'explore_abilities');
    }

    /**
     * get Map svg content.
     */
    public static function getMapSVG($explore_area) {
        // Create a stream context with SSL options
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        // Fetch the image data using the created context
        $imageData = file_get_contents(get_the_post_thumbnail_url($explore_area->ID, 'full'), false, $context);
        $find_string   = '<svg';
        $position = strpos($imageData, $find_string);
        return substr($imageData, $position);
    }

    /**
     * get svg content.
     */
    public static function getSVGCode($image_url) {
        // Create a stream context with SSL options
        $context = stream_context_create([
            'ssl' => [
                'verify_peer' => false,
                'verify_peer_name' => false,
            ],
        ]);

        // Fetch the image data using the created context
        $imageData = file_get_contents($image_url, false, $context);
        $find_string   = '<svg';
        $position = strpos($imageData, $find_string);
        return substr($imageData, $position);
    }

    /**
     * Grab all the points you can collide with.
     * @return int[]|\WP_Post[]
     */
    public static function getExplorePoints($position)
    {
        $args = [
            'numberposts' => -1,
            'post_type' => ['explore-weapon', 'explore-area', 'explore-point', 'explore-character', 'explore-enemy', 'explore-sign'],
            'tax_query' => [
                [
                    'taxonomy' => 'explore-area-point',
                    'field' => 'slug',
                    'terms' => [false === empty($position) ? $position : 'foresight'],
                    'operator' => 'IN',
                ]
            ]
        ];

        return get_posts($args);
    }

    /**
     * Return post object of currently equipped weapon.
     * @param string $weapon_name
     *
     * @return int[]|\WP_Post
     */
    public static function getWeaponByName($weapon_name)
    {
        $args = [
            'post_type' => ['explore-weapon'],
            'name' => $weapon_name,
            'numberposts' => 1
        ];

        $posts = get_posts($args);

        if (false === empty($posts[0])) {
            return $posts[0];
        }

        return null;
    }

    /**
     * Grab all the points you can collide with.
     * @return int[]|\WP_Post[]
     */
    public static function getExplorePosts($position, $post_type)
    {
        $args = [
            'post_type' => [$post_type],
            'tax_query' => [
                [
                    'taxonomy' => 'explore-area-point',
                    'field' => 'slug',
                    'terms' => [false === empty($position) ? $position : 'foresight'],
                    'operator' => 'IN',
                ]
            ]
        ];

        return get_posts($args);
    }

    /**
     * Grab all the abilities you can unlock.
     * @return int[]|\WP_Post[]
     */
    public static function getExploreAbilities()
    {
        $args = [
            'post_type' => ['explore-magic'],
            'posts_per_page' => -1,
        ];

        return get_posts($args);
    }

    /**
     * Add map item styles.
     *
     * @action wp_head
     */
    public function inlineExploreStyles()
    {
        $game_page = get_option('explore_game_page', '');

        if (false === empty($game_page) && is_page($game_page)) {
            echo '<script src="https://accounts.google.com/gsi/client" async defer></script>';

            $position = get_user_meta(get_current_user_id(), 'current_location', true);
            $explore_points = self::getExplorePoints($position);
            $explore_areas = get_posts(['post_type' => 'explore-area', 'numberposts' => -1]);
            $music_names = '';
            ?>
            <style id="map-item-styles">
                html {
                    overflow: hidden;
                }

                <?php foreach($explore_points as $explore_point) :
                    $top = get_post_meta($explore_point->ID, 'explore-top', true) . 'px';
                    $left = get_post_meta($explore_point->ID, 'explore-left', true) . 'px';
                    $height = get_post_meta($explore_point->ID, 'explore-height', true) . 'px';
                    $width = get_post_meta($explore_point->ID, 'explore-width', true) . 'px';
                    $map_url = get_the_post_thumbnail_url($explore_point->ID);
                    $background_url = true === in_array($explore_point->post_type, ['explore-weapon', 'explore-point'], true) ? "background: url(" . $map_url . ") no-repeat;" : '';
                    $point_type = 'explore-enemy' === $explore_point->post_type ? '.enemy-item' : '.map-item';
                    ?>

                    .page-template-explore .container .default-map <?php echo esc_html($point_type); ?>.<?php echo esc_html($explore_point->post_name); ?>-map-item {
                    <?php echo esc_html($background_url); ?>
                        background-size: cover;
                        top: <?php echo esc_html($top); ?>;
                        left: <?php echo esc_html($left); ?>;
                        <?php echo '0px' !== $height ? 'height: ' . esc_html($height) . ';' : ''; ?>
                        <?php echo '0px' !== $width ? 'width: ' . esc_html($width) . ';' : ''; ?>
                    }
                <?php endforeach; ?>
            </style>
            <?php

            foreach($explore_areas as $explore_area):
                $music = get_post_meta($explore_area->ID, 'explore-music', true);
                $music_names .= '"' . $explore_area->post_name . '":"' . $music . '",';
            endforeach;?>
            <script id="enterable-maps">
				const musicNames = {<?php echo $music_names; ?>}
            </script>
            <?php
        }
    }

    /**
     * Build html for map items.
     * @param $explore_points
     *
     * @return string
     */
    public static function getMapItemHTML($explore_points, $userid, $current_location = 'foresight') {
        $html = '';
        $userid = $userid ?? get_current_user_id();
        $dead_ones = get_user_meta($userid, 'explore_enemies', true);
        $dead_ones = false === empty($dead_ones) ? $dead_ones : [];
        $missions_for_triggers = get_posts(
            [
                'post_type' => 'explore-mission',
                'numberposts' => 100,
                'post_status' => 'publish',
                'tax_query' => [
                    [
                        'taxonomy' => 'explore-area-point',
                        'field' => 'slug',
                        'terms' => $current_location,
                    ],
                ],
            ]
        );

        $mission_trigger_html = '';

        // Grab mission trigger points.
        foreach( $missions_for_triggers as $mission ) {
            $mission_trigger = get_post_meta($mission->ID, 'explore-mission-trigger', true);
            $mission_trigger = false === empty($mission_trigger) ? $mission_trigger['explore-mission-trigger'] : $mission_trigger;

            if (false === empty($mission_trigger['top'])) {
                $mission_trigger_html .= '<div id="' . $mission->ID . '-t" class="mission-trigger wp-block-group map-item ' . $mission->post_name . '-mission-trigger-map-item is-layout-flow wp-block-group-is-layout-flow"';
                $mission_trigger_html .= 'style="left:' . $mission_trigger['left'] . 'px;top:' . $mission_trigger['top'] . 'px;height:' . $mission_trigger['height'] . 'px; width:' . $mission_trigger['width'] . 'px;"';
                $mission_trigger_html .= 'data-trigger="true" data-triggee="' . $mission->post_name . '"';
                $mission_trigger_html .= ' data-meta="explore-mission-trigger"';
                $mission_trigger_html .= '></div>';
            }
        }

        foreach( $explore_points as $explore_point ) {
            if ('explore-enemy' === $explore_point->post_type) {
                $health = get_post_meta($explore_point->ID, 'explore-health', true);
                $explore_enemy_type = get_post_meta($explore_point->ID, 'explore-enemy-type', true);

                if (true === isset($dead_ones[$explore_point->post_name])) {
                    continue;
                }
            }

            $boss_waves = get_the_terms( $explore_point, 'explore-boss-waves' );
            $value = get_post_meta($explore_point->ID, 'value', true);
            $timer = get_post_meta($explore_point->ID, 'explore-timer', true);
            $timer = false === empty($timer['explore-timer']) ? $timer['explore-timer'] : $timer;
            $type = get_the_terms($explore_point->ID, 'value-type');
            $interaction_type = get_post_meta($explore_point->ID, 'explore-interaction-type', true);
            $breakable = false === empty($interaction_type) && 'breakable' === $interaction_type;
            $collectable = false === empty($interaction_type) && 'collectable' === $interaction_type;
            $draggable = false === empty($interaction_type) && 'draggable' === $interaction_type;
            $is_hazard = false === empty($interaction_type) && 'hazard' === $interaction_type;
            $is_strong = get_post_meta(  $explore_point->ID, 'explore-is-strong', true);
            $is_strong = false === empty($is_strong) ? $is_strong : false;
            $top = get_post_meta($explore_point->ID, 'explore-top', true) . 'px';
            $left = get_post_meta($explore_point->ID, 'explore-left', true) . 'px';
            $height = get_post_meta($explore_point->ID, 'explore-height', true);
            $width = get_post_meta($explore_point->ID, 'explore-width', true);
            $type = false === empty($type[0]->slug) ? $type[0]->slug : '';
            $walking_path = get_post_meta($explore_point->ID, 'explore-path', true);
            $walking_speed = get_post_meta($explore_point->ID, 'explore-speed', true);
            $time_between = get_post_meta($explore_point->ID, 'explore-time-between', true);
            $remove_after_cutscene = get_post_meta($explore_point->ID, 'explore-remove-after-cutscene', true);
            $repeat = get_post_meta($explore_point->ID, 'explore-repeat', true);
            $disappear = get_post_meta($explore_point->ID, 'explore-disappear', true);
            $disappear = false === empty($disappear) && 'no' === $disappear;
            $passable = get_post_meta($explore_point->ID, 'explore-passable', true);
            $passable = false === empty($passable) && 'yes' === $passable;
            $foreground = get_post_meta($explore_point->ID, 'explore-foreground', true);
            $foreground = false === empty($foreground) && 'yes' === $foreground;
            $interacted_with = get_post_meta($explore_point->ID, 'explore-interacted', true);
            $crew_mate = get_post_meta($explore_point->ID, 'explore-crew-mate', true);
            $path_trigger = get_post_meta($explore_point->ID, 'explore-path-trigger', true);
            $path_trigger = false === empty($path_trigger['explore-path-trigger']) ? $path_trigger['explore-path-trigger'] : '';
            $path_trigger_left = false === empty($path_trigger['left']) ? $path_trigger['left'] : '';
            $path_trigger_top = false === empty($path_trigger['top']) ? $path_trigger['top'] : '';
            $path_trigger_height = false === empty($path_trigger['height']) ? $path_trigger['height'] : '';
            $path_trigger_width = false === empty($path_trigger['width']) ? $path_trigger['width'] : '';
            $path_trigger_cutscene = false === empty($path_trigger['cutscene']) ? $path_trigger['cutscene'] : '';
            $materialize_item_trigger = get_post_meta($explore_point->ID, 'explore-materialize-item-trigger', true);
            $materialize_item_trigger = $materialize_item_trigger['explore-materialize-item-trigger'] ?? false;
            $is_materialized_item_triggered = self::isMaterializedItemTriggered($explore_point->post_name, $current_location, $userid);
            $has_minigame = get_post_meta($explore_point->ID, 'explore-minigame', true);
            $hazard_remove = false;
            $explore_attack = get_post_meta($explore_point->ID, 'explore-attack', true);
            $weapon_strength = false === empty($explore_attack) ? wp_json_encode($explore_attack['explore-attack']) : '""';
            $missions = get_posts(
                [
                    'post_type' => 'explore-mission',
                    'numberposts' => 1,
                    'post_status' => 'publish',
                    'tax_query' => [
                        [
                            'taxonomy' => 'explore-area-point',
                            'field' => 'slug',
                            'terms' => $current_location,
                        ],
                        [
                            'taxonomy' => 'explore-point-tax',
                            'field' => 'slug',
                            'terms' => $explore_point->post_name,
                        ],
                    ],
                ]
            );

            $enemy_missions = get_posts(
                [
                    'post_type' => 'explore-mission',
                    'numberposts' => 1,
                    'post_status' => 'publish',
                    'tax_query' => [
                        [
                            'taxonomy' => 'explore-area-point',
                            'field' => 'slug',
                            'terms' => $current_location,
                        ],
                        [
                            'taxonomy' => 'explore-enemy-tax',
                            'field' => 'slug',
                            'terms' => $explore_point->post_name,
                        ],
                    ],
                ]
            );

             // Create onload class:
             $path_onload = true === empty($path_trigger['left']) && true === empty($path_trigger['cutscene']) ? ' path-onload' : '';
             $classes = $path_onload;

            // If it's an enemy and they have health show or if not an enemy show.
            if (('explore-enemy' === $explore_point->post_type && false === in_array($explore_point->post_name, $dead_ones,
                        true)) || 'explore-enemy' !== $explore_point->post_type ) {

                // Highjack top/left if draggable and has save drag values.
                if (true === $draggable) {
                    $current_drag = get_user_meta($userid, 'explore_drag_items', true);

                    if (false === empty($current_drag) && true === isset($current_drag[$explore_point->post_name])) {
                        $top = $current_drag[$explore_point->post_name]['top'];
                        $left = $current_drag[$explore_point->post_name]['left'];
                    }
                }

                $html .= '<div style="left:' . intval($left) . 'px; top:' . intval($top) . 'px;" id="' . $explore_point->ID . '" data-genre="' . $explore_point->post_type . '" data-type="' . esc_attr($type) . '" data-value="' . intval($value) . '"';
                $html .= 'data-image="' . get_the_post_thumbnail_url($explore_point->ID) . '" ';
                if ('explore-area' === $explore_point->post_type) {
                    $map_url = get_post_meta($explore_point->ID, 'explore-map-svg', true);

                    $html .= ' data-map-url="' . $map_url . '" ';
                }

                // Explore character crew mate.
                if ('explore-character' === $explore_point->post_type && 'yes' === $crew_mate) {
                    $html .= ' data-crewmate="' . $crew_mate . '"';
                }

                // If hazard, add hazard class.
                if ($is_hazard) {
                    $html .= ' data-hazard="true"';
                }

                // Is item breakable.
                if (true === $breakable) {
                    $html .= ' data-breakable="true" ';
                }

                // Will disappear?
                if ( true === $disappear ) {
                    $html .= ' data-disappear="false" ';
                }

                // Will be passable?
                if ( true === $passable ) {
                    $html .= ' data-passable="true" ';
                }

                // Will be foreground?
                if ( true === $foreground ) {
                    $html .= ' data-foreground="true" ';
                }

                if ( false === empty($height) && false === empty($width) ) {
                    $html .= ' data-height="' . esc_attr($height) . '" ';
                    $html .= ' data-width="' . esc_attr($width) . '" ';
                }

                // Interacted with image.
                if ( false === empty($interacted_with)) {
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
                if ('yes' === $is_strong ) {
                    $html .= ' data-isstrong="yes"';
                }

                // Is item attached to a mission.
                if (false === empty($missions)) {
                    $html .= ' data-mission="' . $missions[0]->post_name . '"';

                    $hazard_remove = get_post_meta($missions[0]->ID, 'explore-hazard-remove', true);
                    $hazard_remove = false === empty($hazard_remove) && true === in_array($explore_point->post_name, explode(',', $hazard_remove));
                }

                if (false === empty($enemy_missions)) {
                    $html .= ' data-mission="' . $enemy_missions[0]->post_name . '"';

                    $hazard_remove = get_post_meta($enemy_missions[0]->ID, 'explore-hazard-remove', true);
                    $hazard_remove = false === empty($hazard_remove) && true === in_array($explore_point->post_name, explode(',', $hazard_remove));
                }

                $explore_path = false === empty($walking_path['explore-path']) ? wp_json_encode($walking_path["explore-path"]) : '[{"top":"0","left":"0"}]';

                if ('[{"top":"0","left":"0"}]' !== $explore_path) {
                    $html .= ' data-path=\'' . $explore_path . '\' ';
                    $html .= ' data-speed="' . $walking_speed . '" ';
                    $html .= ' data-timebetween="' . $time_between . '" ';

                    if ('yes' === $repeat) {
                        $html .= ' data-repeat="true" ';
                    }

                    if (false === empty($path_trigger_cutscene)) {
                        $html .= ' data-trigger-cutscene="' . $path_trigger_cutscene . '"';
                    }
                }

                if ('explore-weapon' === $explore_point->post_type ) {
                    $html .= ' data-strength=' . $weapon_strength . ' ';
                }

                if (true === $collectable || 'explore-weapon' === $explore_point->post_type) {
                    $html .= ' data-collectable="true" ';
                }

                if (true === $draggable) {
                    $html .= ' data-draggable="true" ';
                }

                if (true === $hazard_remove) {
                    $html .= ' data-removable="true" ';
                }

                // Remove this after cutscene specified in data att.
                if (false === empty($remove_after_cutscene)) {
                    $html .= ' data-removeaftercutscene="' . esc_attr($remove_after_cutscene) . '"';
                }

                // Eneemy specific data-points.
                if ('explore-enemy' === $explore_point->post_type) {
                    $pulse_wave = false;
                    $barrage_wave = false;
                    $speed = get_post_meta($explore_point->ID, 'explore-speed', true);
                    $enemy_speed = get_post_meta($explore_point->ID, 'explore-enemy-speed', true);
                    $enemy_weapon_type = get_the_terms($explore_point->ID, 'explore-weapon-type');

                    if ( false === empty($enemy_weapon_type)) {
                        $html .= 'data-weapon="' . $enemy_weapon_type[0]->slug . '" ';
                    }

                    $html .= 'data-health="' . intval($health) . '" data-healthamount="' . intval($health) . '" data-enemyspeed="' . intval($enemy_speed) . '" data-speed="' . intval($speed) . '" data-enemy-type="' . esc_attr($explore_enemy_type) . '"';
                    $wave_html = 'data-waves="';

                    // Boss waves.
                    if (true === is_array($boss_waves)) {
                        $boss_waves_count = 4 > count($boss_waves) ? 4 - count($boss_waves) : 4;

                        // Add waves if less than four
                        if (4 !== $boss_waves_count) {
                            for ($i = 0; $i < $boss_waves_count; $i++) {
                                $count = 3 !== $boss_waves_count ? $i : 0;
                                $boss_waves[] = $boss_waves[$count];
                            }
                        }

                        foreach ($boss_waves as $index => $boss_wave) {
                            if ('pulse' === $boss_wave->slug) {
                                $pulse_wave = true;
                            }

                            if ('barrage' === $boss_wave->slug) {
                                $barrage_wave = true;
                            }

                            $wave_html .= ($index + 1) === count($boss_waves) ? $boss_wave->slug : $boss_wave->slug . ',';
                        }
                    }

                    // Add boss waves.
                    $html .= $wave_html . '"';

                    $html .= 'class="wp-block-group enemy-item ' . $explore_point->post_name . '-map-item is-layout-flow wp-block-group-is-layout-flow' . $classes. '"';
                } else {
                    $html .= 'class="wp-block-group map-item ' . $explore_point->post_name . '-map-item is-layout-flow wp-block-group-is-layout-flow' . $classes. '"';
                }

                $html .= '>';

                // Sign.
                if ('explore-sign' === $explore_point->post_type) {
                    $html .= '<img src="' . get_the_post_thumbnail_url($explore_point->ID, 'full') . '" class="sign-image" />';
                }

                $html .= true === in_array($explore_point->post_type, ['explore-character', 'explore-sign'], true) ? $explore_point->post_content : '';

                if ( true === in_array($explore_point->post_type, ['explore-character','explore-enemy'], true)){
                    $character_info = self::getCharacterImages($explore_point, '');
                    $direction_images = $character_info['direction_images'] ?? false;

                    if ( $direction_images ) {
                        foreach ($direction_images as $direction_label => $direction_image) {
                            $fight_animation = false !== stripos($direction_label, 'punch') ? ' fight-image' : '';

                            $html .= '<img height = "';
                            $html .= false === empty($character_info['height']) ? esc_attr($character_info['height']) : '185';
                            $html .= 'px" width = "';
                            $html .= false === empty($character_info['width']) ? esc_attr($character_info['width']) : '115';
                            $html .= 'px" class="character-icon' . $fight_animation;
                            $html .= 'static' === $direction_label ? ' engage' : '';
                            $html .= '" id = "' . $explore_point->post_name;
                            $html .= esc_attr($direction_label);
                            $html .= '" src = "';
                            $html .= esc_url($direction_image) . '" />';
                        }
                    }
                }

                // Projectile html for enemy.
                if ('explore-enemy' === $explore_point->post_type && ( 'shooter' === $explore_enemy_type || true === $barrage_wave)) {
                    $projectile = get_post_meta($explore_point->ID, 'explore-projectile', true);
                    $projectile = $projectile['explore-projectile'] ?? false;

                    if (false !== $projectile) {
                        $html .= '<div class="projectile" data-value="' . intval($value) . '"><img alt="projectile" style="width:' . $projectile['width'] . 'px; height: ' . $projectile['height'] . 'px;" src="' . $projectile['url'] . '" /></div>';
                    }
                }

                // Boss data / html.
                if ('explore-enemy' === $explore_point->post_type && false === empty($boss_waves)) {
                    if (true === $pulse_wave) {
                        $html .= self::getSVGCode( str_replace('inc/class-explore.php', 'assets', __FILE__ ) . '/src/images/pulse.svg');
                    }
                }

                $html .= '</div>';

                // Trigger HTML.
                $projectile_trigger = get_post_meta($explore_point->ID, 'explore-projectile-trigger', true);

                if ('explore-enemy' === $explore_point->post_type && false === empty($projectile_trigger)) {
                    $html .= '<div id="' . $explore_point->ID . '-t" class="wp-block-group map-item ' . $explore_point->post_name . '-trigger-map-item is-layout-flow wp-block-group-is-layout-flow"';
                    $html .= 'style="left:' . $projectile_trigger['left'] ?? 0 . 'px;top:' . $projectile_trigger['top'] ?? 0 . 'px;height:' . $projectile_trigger['height'] ?? 0 . 'px; width:' . $projectile_trigger['width'] ?? 0 . 'px;"';
                    $html .= 'data-trigger="true" data-triggee="' . $explore_point->post_name . '-map-item"';
                    $html .= ' data-meta="explore-projectile-trigger"';
                    $html .= '></div>';
                }

                // Trigger Walking Path.
                if (true === in_array($explore_point->post_type, ['explore-enemy', 'explore-character'], true) && false === in_array( '', [$path_trigger_width, $path_trigger_height], true)) {
                    $html .= '<div id="' . $explore_point->ID . '-t" class="path-trigger wp-block-group map-item ' . $explore_point->post_name . '-trigger-map-item is-layout-flow wp-block-group-is-layout-flow"';
                    $html .= 'style="left:' . $path_trigger_left . 'px;top:' . $path_trigger_top . 'px;height:' . $path_trigger_height . 'px; width:' . $path_trigger_width . 'px;"';
                    $html .= 'data-trigger="true" data-triggee="' . $explore_point->post_name . '-map-item"';
                    $html .= ' data-meta="explore-path-trigger"';
                    $html .= '></div>';
                }

                // Draggable Destination.
                if (true === $draggable) {
                    $drag_dest = get_post_meta($explore_point->ID, 'explore-drag-dest', true);
                    $drag_dest = $drag_dest['explore-drag-dest'] ?? false;

                    if (false === empty($drag_dest)) {
                        $drag_top = $drag_dest['top'] ?? '';
                        $drag_left = $drag_dest['left'] ?? '';
                        $drag_height = $drag_dest['height'] ?? '';
                        $drag_width = $drag_dest['width'] ?? '';
                        $drag_image = $drag_dest['image'] ?? '';
                        $drag_mission = $drag_dest['mission'] ?? '';

                        $html .= '<div class="drag-dest wp-block-group map-item ' . $explore_point->post_name . '-drag-dest-map-item is-layout-flow wp-block-group-is-layout-flow"';
                        $html .= 'style="z-index:0;left:' . esc_html($drag_left) . 'px;top:' . $drag_top . 'px;height:' . $drag_height . 'px; width:' . $drag_width . 'px;"';

                        if (true === $hazard_remove) {
                            $html .= ' data-removable="true" ';
                        }

                        $html .= 'data-mission="' . $drag_mission . '">';
                        $html .= '<img height="' . $drag_height . 'px" width="' . $drag_width . 'px" src="' . $drag_image . '" alt="' . $explore_point->post_title . '-drag-dest">';
                        $html .= '</div>';
                    }
                }

                if (false === empty($materialize_item_trigger['top']) && false === $is_materialized_item_triggered) {
                    $materialize_item_top = $materialize_item_trigger['top'] ?? '';
                    $materialize_item_left = $materialize_item_trigger['left'] ?? '';
                    $materialize_item_height = $materialize_item_trigger['height'] ?? '';
                    $materialize_item_width = $materialize_item_trigger['width'] ?? '';

                    $html .= '<div class="materialize-item-trigger wp-block-group map-item ' . $explore_point->post_name . '-materialize-item-map-item is-layout-flow wp-block-group-is-layout-flow" data-type="point" data-value="0"';
                    $html .= ' data-meta="explore-materialize-item-trigger"';
                    $html .= 'style="z-index:0;left:' . esc_html($materialize_item_left) . 'px;top:' . $materialize_item_top . 'px;height:' . $materialize_item_height . 'px; width:' . $materialize_item_width . 'px;"';
                    $html .= '">';
                    $html .= '</div>';
                }
            }
         }

        $indicator = get_option('explore_indicator_icon');

        if (false === empty($indicator)) :
            $html .= '<div class="indicator-icon"><img src="' . esc_url($indicator) . '" width="15" height="15" /></div>';
        endif;

        // Trigger Mission complete.
        if (false === empty($mission_trigger_html)) {
            $html .= $mission_trigger_html;
        }

         return $html;
    }

    /**
     * @param $item_name
     * @param $location
     * @param $userid
     * @return bool
     */
    public static function isMaterializedItemTriggered($item_name, $location, $userid) {
        $materialize_items = get_user_meta($userid, 'explore_materialized_items', true);

        if (false === empty($materialize_items[$location]) && is_array($materialize_items[$location])) {
            foreach ($materialize_items[$location] as $materialize_item) {
                if ( $item_name  === $materialize_item) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Build html for map items.
     * @param $explore_cutscenes
     *
     * @return string
     */
    public static function getMapCutsceneHTML($explore_cutscenes, $position) {
        $html = '';
        $area = get_posts(['post_type' => 'explore-area', 'name' => $position, 'posts_per_page' => 1]);
        $is_area_cutscene = 'yes' === get_post_meta($area[0]->ID, 'explore-is-cutscene', true);
        $mc = get_posts( ['post_type' => 'explore-character', 'name' => 'mc', 'posts_per_page' => 1]);

        if (false === $is_area_cutscene) {
            $html .= '<div data-character="mc" class="cut-character"><img src="' . get_the_post_thumbnail_url($mc[0]). '"/></div>';
        }

        foreach( $explore_cutscenes as $explore_cutscene ) {
            $character = get_the_terms( $explore_cutscene->ID, 'explore-character-point' );
            $next_area = get_the_terms( $explore_cutscene->ID, 'explore-next-area' );
            $minigame = get_post_meta( $explore_cutscene->ID, 'explore-cutscene-minigame', true);
            $has_video = has_block( 'video', $explore_cutscene );
            $cutscene_trigger = get_post_meta($explore_cutscene->ID, 'explore-cutscene-trigger', true);
            $character_position = get_post_meta($explore_cutscene->ID, 'explore-cutscene-character-position', true);
            $next_area_position = get_post_meta($explore_cutscene->ID, 'explore-cutscene-next-area-position', true);
            $mission_dependent = get_post_meta($explore_cutscene->ID, 'explore-mission-dependent', true);
            $character_position_left = $character_position['explore-cutscene-character-position']['left'] ?? '';
            $character_position_top = $character_position['explore-cutscene-character-position']['top'] ?? '';
            $next_area_position_left = $next_area_position['explore-cutscene-next-area-position']['left'] ?? '';
            $next_area_position_top = $next_area_position['explore-cutscene-next-area-position']['top'] ?? '';
            $character_position_trigger = $character_position['explore-cutscene-character-position']['trigger'] ?? '';
            $mission_cutscene = get_post_meta($explore_cutscene->ID, 'explore-mission-cutscene', true);
            $music = get_post_meta($explore_cutscene->ID, 'explore-cutscene-music', true);
            $mission_complete_cutscene = get_post_meta($explore_cutscene->ID, 'explore-mission-complete-cutscene', true);
            $boss_fight = get_post_meta($explore_cutscene->ID, 'explore-cutscene-boss', true);
            $cutscene_trigger_type = get_post_meta($explore_cutscene->ID, 'explore-trigger-type', true) ?? '';

            $next_area_datapoint = false === empty($next_area[0]) ? ' data-nextarea="' . $next_area[0]->slug . '"' : '';

            if (false === $has_video) {
                $cutscene_name = false === $is_area_cutscene ? $character[0]->slug : $area[0]->post_name;
            } else {
                $cutscene_name = $explore_cutscene->post_name;
            }

            $html .= '<div class="wp-block-group map-cutscene ' . esc_attr($cutscene_name) . '-map-cutscene is-layout-flow wp-block-group-is-layout-flow"';
            $html .= ' id="' . esc_attr($explore_cutscene->ID) . '"';

            if (false === empty($mission_cutscene)) {
                $html .= ' data-mission="' . esc_attr($mission_cutscene) . '" ';
            }

            if (false === empty($mission_dependent)) {
                $html .= 'data-dependent="' . esc_attr($mission_dependent) . '" ';
            }

            if (false === empty($music)) {
                $html .= 'data-music="' . esc_attr($music) . '" ';
            }

            // Minigame that triggers cutscene.
            if (false === empty($minigame) && false === is_array($minigame)) {
                $html .= 'data-minigame="' . esc_attr($minigame) . '" ';
            }

            // Has video in content.
            if (true === $has_video) {
                $html .= 'data-video="true" ';
            }

            // Boss Fight.
            if (false === empty($boss_fight)) {
                $html .= 'data-boss="' . esc_attr($boss_fight) . '" ';
            }

            // Add data point for the mission that is complete by having this cutscene.
            if (false === empty($mission_complete_cutscene)) {
                $html .= 'data-missioncomplete="' . esc_attr($mission_complete_cutscene) . '" ';
            }

            // Add character position point if selected.
            if (false === empty($character_position_top)) {
                $html .= 'data-character-position=[{"left":"' . $character_position_left . '","top":"' . $character_position_top . '","trigger":"' . $character_position_trigger . '"}]';
            }

            if (false === empty($next_area)) {
                $area_obj = get_posts(['name' => $next_area[0]->slug, 'post_type' => 'explore-area', 'post_status' => 'publish', 'posts_per_page' => 1]);

                $html .= $next_area_datapoint;
                $html .= false === empty($next_area_position_top) ? ' data-nextarea-position={"left":"' . $next_area_position_left . '","top":"' . $next_area_position_top . '"}' : '';
                $html .= ' data-mapurl="' . get_the_post_thumbnail_url($area_obj[0]->ID) . '"';
            }

            $html .= '>';

            if (false === $is_area_cutscene && false === empty($character) && true === is_array($character)) {
                foreach ( $character as $char ) {
                    $character_post = get_posts( ['post_type' => ['explore-character', 'explore-enemy'], 'posts_per_page' => 1, 'name' => $char->slug] );

                    $html .= '<div data-character="' . $char->slug . '" class="cut-character"><img src="' . get_the_post_thumbnail_url($character_post[0]->ID) . '"/></div>';
                }
            }

            $html .= 'explore-area' !== $explore_cutscene->post_type ? $explore_cutscene->post_content : '';
            $html .= '</div>';

            $path_trigger_left = false === empty($cutscene_trigger['left']) && 0 !== $cutscene_trigger['left'] ? $cutscene_trigger['left'] : '';
            $path_trigger_top = false === empty($cutscene_trigger['top']) && 0 !== $cutscene_trigger['top'] ? $cutscene_trigger['top'] : '';
            $path_trigger_height = false === empty($cutscene_trigger['height']) && 0 !== $cutscene_trigger['height'] ? $cutscene_trigger['height'] : '';
            $path_trigger_width = false === empty($cutscene_trigger['width']) && 0 !== $cutscene_trigger['width'] ? $cutscene_trigger['width'] : '';

            // Trigger Cutscene.
            if (false === in_array( '', [$path_trigger_width, $path_trigger_height], true)) {
                $html .= '<div id="' . $explore_cutscene->ID . '-t" class="cutscene-trigger wp-block-group map-item ' . $explore_cutscene->post_name . '-cutscene-trigger-map-item is-layout-flow wp-block-group-is-layout-flow"';
                $html .= 'style="left:' . $path_trigger_left . 'px;top:' . $path_trigger_top . 'px;height:' . $path_trigger_height . 'px; width:' . $path_trigger_width . 'px;"';
                $html .= 'data-trigger="true" data-triggee="' . $character[0]->slug . '-map-item"';
                $html .= ' data-triggertype="' . $cutscene_trigger_type . '"';
                $html .= ' data-meta="explore-cutscene-trigger"';
                $html .= '></div>';
            }
        }

        return $html;
    }

    /**
     * Build html for map items.
     * @param $explore_cutscenes
     *
     * @return string
     */
    public static function getMinigameHTML($explore_minigames) {
        $html = '';

        foreach($explore_minigames as $minigame) {
            $minigame_content = $minigame->post_content;
            $minigame_mission = get_post_meta( $minigame->ID, 'explore-mission', true);
            $music = get_post_meta($minigame->ID, 'explore-minigame-music', true);
            $minigame_type = get_the_terms($minigame->ID, 'explore-minigame-type');

            $html .= '<div class="minigame ' . esc_attr($minigame->post_name) . '-minigame-item" data-music="' . esc_attr($music) . '" data-mission="' . esc_attr($minigame_mission) . '">';
            $html .= '<div class="computer-chip">' . self::getSVGCode(get_the_post_thumbnail_url($minigame->ID)) . '</div>';
            $html .= $minigame_content;

            if (false === empty($minigame_type[0]) && 'programming' === $minigame_type[0]->slug) {
                $html .= '<div class="minigame-programming" >';
                $html .= '<div class="input-section">';
                $html .= '<div class="programming-output">';
                $html .= '<textarea style="max-width:100%;" cols="150" rows="20"></textarea>';
                $html .= '</div>';
                $html .= '</div>';
                $html .= $minigame_type[0]->description;
                $html .= '</div>';
            }

            $html .= '</div>';
        }

        return $html;
    }

    /**
     * Build html for explainers.
     * @param $explore_explainers
     * @param $type
     *
     * @return string
     */
    public static function getExplainerHTML($explore_explainers, $type) {
        if (true === empty($explore_explainers)) {
            return '';
        }

        $html = '';

        foreach($explore_explainers as $explainer) {
            $explainer_type = get_post_meta($explainer->ID, 'explore-explainer-type', true);

            if ($type === $explainer_type) {
                $trigger = get_post_meta( $explainer->ID, 'explore-explainer-trigger', true);
                $explainer_left = get_post_meta( $explainer->ID, 'explore-left', true);
                $explainer_top = get_post_meta( $explainer->ID, 'explore-top', true);
                $explainer_width = get_post_meta( $explainer->ID, 'explore-width', true);
                $arrow_style = get_post_meta( $explainer->ID, 'explore-explainer-arrow', true);

                $path_trigger_top = false === empty($trigger['top']) && 0 !== $trigger['top'] ? $trigger['top'] : false;
                $path_trigger_left = false === empty($trigger['left']) && 0 !== $trigger['left'] ? $trigger['left'] : '';
                $path_trigger_width = false === empty($trigger['width']) && 0 !== $trigger['width'] ? $trigger['width'] : '';
                $path_trigger_height = false === empty($trigger['height']) && 0 !== $trigger['height'] ? $trigger['height'] : '';
                $arrow_img = get_option( 'explore_arrow_icon', false);
                $orientation = $arrow_style['explore-explainer-arrow']['orientation'] ?? 'top';
                $side = $arrow_style['explore-explainer-arrow']['side'] ?? 'right';
                $rotation = $arrow_style['explore-explainer-arrow']['rotate'] ?? '0';
                $arrow_style_css = 'transform: rotate(' . $rotation . 'deg); ' . $orientation . ': -130px;' . ' ' . $side . ': 0;';


                if (false !== $path_trigger_top) {
                    $html .= '<div id="' . $explainer->ID . '-t" data-trigger="true" class="' . $explainer->post_name . '-explainer-trigger-map-item explainer-trigger map-item" data-triggee="' . $explainer->post_name . '" ';
                    $html .= ' data-meta="explore-explainer-trigger"';
                    $html .= 'style="left:' . $path_trigger_left . 'px;top:' . $path_trigger_top . 'px;height:' . $path_trigger_height . 'px; width:' . $path_trigger_width . 'px;"';
                    $html .= '></div>';
                }

                if (false === empty($explainer_top)) {
                    $html .= '<div class="' . $explainer->post_name . '-explainer-item explainer-container" ';
                    $html .= 'style="left:' . $explainer_left . 'px;top:' . $explainer_top . 'px;height:auto; width:' . $explainer_width . 'px;"';
                    $html .= '>';
                    $html .= $arrow_img ? '<img data-rotate="' . $rotation . '" width="120" height="120" style="'. esc_attr($arrow_style_css) . '" src="' . $arrow_img . '" />' : '';
                    $html .= wp_kses_post($explainer->post_content);
                    $html .= '</div>';
                }
            }
        }

        return $html;
    }

    /**
     * Build html for map abilities.
     * @param $explore_cutscenes
     *
     * @return string
     */
    public static function getMapAbilitiesHTML($explore_abilities) {
        $html = '';
        $magics = get_user_meta(get_current_user_id(), 'explore_magic', true);

        foreach( $explore_abilities as $explore_ability ) {
            if (false === is_array($magics) || false === in_array($explore_ability->ID, $magics, true)) {
                $unlockable = get_post_meta($explore_ability->ID, 'explore-unlock-level', true);

                $html .= '<div class="map-ability" ';
                $html .= 'id="' . $explore_ability->ID . '" ';
                $html .= 'data-genre="explore-magic" ';

                if (false === empty($unlockable)) {
                    $html .= 'data-unlockable="' . intval($unlockable) . '" ';
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
    public function registerPostType() {
        $post_types = [
            'explore-area' => 'Areas',
            'explore-point' => 'Items',
            'explore-character' => 'Characters',
            'explore-cutscene' => 'Cutscenes',
            'explore-enemy' => 'Enemies',
            'explore-weapon' => 'Weapons',
            'explore-magic' => 'Magic',
            'explore-mission' => 'Missions',
            'explore-sign' => 'Focus View',
            'explore-minigame' => 'Minigames',
            'explore-explainer' => 'Explainers',
        ];

        $taxo_types = [
            'explore-area-point' => [
                'name' => 'Explore Area',
                'post-types' => ['explore-explainer', 'explore-minigame', 'explore-area', 'explore-point', 'explore-character', 'explore-cutscene', 'explore-enemy', 'explore-mission', 'explore-sign', 'explore-weapon']
            ],
            'explore-character-point' => [
                'name' => 'Explore Character',
                'post-types' => ['explore-cutscene', 'explore-explainer']
            ],
            'explore-point-tax' => [
                'name' => 'Explore Point',
                'post-types' => ['explore-mission']
            ],
            'explore-enemy-tax' => [
                'name' => 'Explore Enemy',
                'post-types' => ['explore-mission']
            ],
            'value-type' => [
                'name' => 'Value Type',
                'post-types' => ['explore-weapon', 'explore-point', 'explore-character', 'explore-area', 'explore-enemy']
            ],
            'magic-type' => [
                'name' => 'Magic Type',
                'post-types' => ['explore-magic']
            ],
            'explore-next-area' => [
                'name' => 'Next Area',
                'post-types' => ['explore-cutscene']
            ],
            'explore-minigame-type' => [
                'name' => 'Minigame Type',
                'post-types' => ['explore-minigame']
            ],
            'explore-boss-waves' => [
                'name' => 'Boss Wave Types',
                'post-types' => ['explore-enemy']
            ],
            'explore-weapon-type' => [
                'name' => 'Weapon Type',
                'post-types' => ['explore-enemy']
            ],
            'explore-weapon-choice' => [
                'name' => 'Weapon',
                'post-types' => ['explore-character']
            ],
        ];

        foreach($post_types as $slug => $name) {
            $args = array(
                'label'     => __( $name, 'sharethis-custom' ),
                'menu_icon' => 'dashicons-location-alt',
                'public'             => false,
                'publicly_queryable' => false,
                'show_ui'            => true,
                'show_in_menu'       => true,
                'query_var'          => true,
                'rewrite'            => array( 'slug' => $slug ),
                'capability_type'    => 'page',
                'has_archive'        => false,
                'hierarchical'       => false,
                'menu_position'      => null,
                'show_in_rest'       => true,
                'supports'           => array( 'title', 'editor', 'author', 'thumbnail', 'custom_fields'),
            );

            register_post_type( $slug, $args );
        }

        foreach($taxo_types as $slug => $stuff) {
            // Add explore area sync with explore point taxo.
            $arg2s = [
                'label'             => __($stuff['name'], 'orbem-game-engine'),
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
    public static function getCurrentPointWidth() {
        $user = get_current_user_id();
        $gear = get_user_meta($user, 'explore_current_gear', true);
        $weapons = get_user_meta($user, 'explore_current_weapons', true);
        $types = ['health', 'mana', 'power'];
        $final_amounts = [
            'mana' => 100,
            'health' => 100
        ];

        foreach($types as $type) {
            if ( isset($gear[$type]) && is_array($gear[$type]) ) {
                foreach($gear[$type] as $gear_amount) {
                    $final_amounts[$type] += array_values($gear_amount)[0] ?? 0;
                }
            }
        }

        return $final_amounts;
    }

    /**
     * Map of levels.
     * @return int[]
     */
    public static function getLevelMap() {
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
     */
    public static function getCurrentLevel() {
        $levels = self::getLevelMap();
        $points = get_user_meta(get_current_user_id(), 'explore_points', true);
        $points = true === isset($points['point']['points']) ? $points['point']['points'] : 0;

        if (false === empty($levels)) {
            foreach ($levels as $index => $level) {
                if (count($levels) === ($index - 1)) {
                    break;
                }

                if ($points > $level && $points < $levels[$index + 1] || $points === $level) {
                    return $index + 1;
                }
            }
        }

        return 1;
    }

    /**
     * register the mp3 paragraph block.
     *
     * @action enqueue_block_editor_assets
     * @return void
     */
    public function customRegisterParagraphMp3Block() {
        Plugin::enqueueScript('orbem-order/paragraph-mp3-block');
    }

    /**
     * Register new block category for share buttons.
     *
     * @param array    $categories The current block categories.
     * @param \WP_Post $post       Post object.
     *
     * @filter block_categories_all
     */
    public function st_block_category( $categories, $post ) {
        return array_merge(
            $categories,
            [
                [
                    'slug'  => 'orbem-order-game-engine',
                    'title' => __( 'Orbem Order Game Engine', 'orbem-game-engine' ),
                ],
            ]
        );
    }

    /**
     * Get the main character's images.
     * @param $character_slug
     * @param $location
     * @return array
     */
    public static function getCharacterImages($main_character, $location): array
    {
        $main_character = is_object($main_character) ? $main_character : get_posts(['post_type' => ['explore-character', 'explore-enemy'], 'name' => $main_character, 'post_status' => 'publish', 'posts_per_page' => 1]);

        if (false === is_wp_error($main_character)) {
            $main_character = false === empty($main_character) && is_array($main_character) ? $main_character[0] : $main_character;
            if (false === is_null($main_character) && false === empty($main_character)) {
                $images = get_post_meta($main_character->ID, 'explore-character-images', true);

                if (true === isset($images['explore-character-images']) && true === is_array($images['explore-character-images'])) {
                    return [
                        'direction_images' => [
                            'static' => $images['explore-character-images']['static'] ?? '',
                            'up' => $images['explore-character-images']['up'] ?? '',
                            'down' => $images['explore-character-images']['down'] ?? '',
                            'left' => $images['explore-character-images']['left'] ?? '',
                            'right' => $images['explore-character-images']['right'] ?? '',
                            'static-up' => $images['explore-character-images']['static-up'] ?? '',
                            'static-down' => $images['explore-character-images']['static-down'] ?? '',
                            'static-left' => $images['explore-character-images']['static-left'] ?? '',
                            'static-right' => $images['explore-character-images']['static-right'] ?? '',
                            'up-punch' => $images['explore-character-images']['up-punch'] ?? '',
                            'right-punch' => $images['explore-character-images']['right-punch'] ?? '',
                            'left-punch' => $images['explore-character-images']['left-punch'] ?? '',
                            'down-punch' => $images['explore-character-images']['down-punch'] ?? '',
                        ],
                        'height' => get_post_meta($main_character->ID, 'explore-height', true),
                        'width' => get_post_meta($main_character->ID, 'explore-width', true),
                        'ability' => get_post_meta($main_character->ID, 'explore-ability', true),
                    ];
                }
            }
        }

        return [];
    }

    /**
     * Util to add image upload html for fields
     * @param $name
     * @param $slug
     * @param $values
     * @return bool|string
     */
    public static function imageUploadHTML($name, $slug, $values)
    {
        ob_start();
        ?>
        <div class="explore-image-field">
            <p>
                <?php _e($name . ':', 'orbem-game-engine'); ?><br>
                <input type="text" id="<?php echo esc_attr($slug); ?>" name="<?php echo esc_attr($slug); ?>" value="<?php echo esc_attr($values); ?>" class="widefat explore-upload-field" readonly />
            </p>
            <p>
                <button type="button" class="upload_image_button button"><?php _e('Select', 'orbem-game-engine'); ?></button>
                <button type="button" class="remove_image_button button"><?php _e('Remove', 'orbem-game-engine'); ?></button>
            </p>
        </div>
        <?php
        return ob_get_clean();
    }
}
