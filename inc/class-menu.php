<?php
/**
 * Menu
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

/**
 * Menu Class
 *
 * @package OrbemStudio
 */
class Menu
{

    /**
     * Theme instance.
     *
     * @var object
     */
    public object $plugin;
    private object $telemetry;

    /**
     * Class constructor.
     *
     * @param object $plugin Plugin class.
     * @param object $telemetry Telemetry class.
     */
    public function __construct(object $plugin, object $telemetry)
    {
        $this->plugin    = $plugin;
        $this->telemetry = $telemetry;
    }

    /**
     * Register API field.
     *
     * @action rest_api_init
     */
    public function addRestRoutes(): void
    {
        $permission_callback = function () {
            return current_user_can('read');
        };
        $namespace = 'orbemorder/v1';

        register_rest_route($namespace, '/choose-setup-type/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'chooseSetupTypes'],
            'permission_callback' => $permission_callback
        ]);
    }

    /**
     * Call back function for rest route that saves the setup type choice and creates game if generate type chosen.
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function chooseSetupTypes(\WP_REST_Request $request): \WP_REST_Response
    {
        $accepted_types = [
            'generate',
            'manual',
            'page'
        ];

        // Get request data.
        $data   = $request->get_json_params();
        $type   = isset($data['type']) && true === in_array($data['type'], $accepted_types, true) ? sanitize_text_field($data['type']) : '';

        if ('' === $type) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid request data', 'orbem-studio'),
            ]);
        }

        if ('generate' === $type) {
            // Generate the starter area.
            $this->generateStarterGame(
                'explore-area',
                [
                    'title' => 'Rovanar forest',
                    'meta'  => [
                        'explore-map'        => $this->plugin->dir_url . '/assets/src/images/starter-game/Rovanar_Forest.jpg',
                        'explore-start-top'  => 2900,
                        'explore-start-left' => 2276,
                    ]
                ]
            );
            update_option('explore_first_area', 'rovanar-forest');

            // Generate the starter character.
            $this->generateStarterGame(
                'explore-character',
                [
                    'title' => 'Trek',
                    'meta'  => [
                        'explore-area'   => 'rovanar-forest',
                        'explore-height' => 185,
                        'explore-width'  => 114,
                        'explore-character-images' => [
                            'static'       => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-static.png',
                            'static-down'  => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-static.png',
                            'static-up'    => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-static-up.png',
                            'static-left'  => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-static-left.png',
                            'static-right' => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-static-right.png',
                            'up'           => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-up-walk.gif',
                            'left'         => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-left-walk.gif',
                            'right'        => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-right-walk.gif',
                            'down'         => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-down-walk.gif',
                            'down-punch'   => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-static.png',
                            'up-punch'     => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-static-up.png',
                            'left-punch'   => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-static-left.png',
                            'right-punch'  => $this->plugin->dir_url . '/assets/src/images/starter-game/trek-static-right.png'
                        ],
                    ]
                ]
            );
            update_option('explore_main_character', 'trek');

            // Generate the walls.
            $this->generateStarterGame(
                'explore-wall',
                [
                    'title' => 'Wall 1',
                    'meta'  => [
                        'explore-area'   => 'rovanar-forest',
                        'explore-top'    => 2684,
                        'explore-left'   => 2982,
                        'explore-height' => 733,
                        'explore-width'  => 104
                    ]
                ]
            );

            $this->generateStarterGame(
                'explore-wall',
                [
                    'title' => 'Wall 2',
                    'meta'  => [
                        'explore-area'        => 'rovanar-forest',
                        'explore-top'    => 3414,
                        'explore-left'   => 2361,
                        'explore-height' => 58,
                        'explore-width'  => 726
                    ]
                ]
            );

            $this->generateStarterGame(
                'explore-wall',
                [
                    'title' => 'Wall 3',
                    'meta'  => [
                        'explore-area'   => 'rovanar-forest',
                        'explore-top'    => 2670,
                        'explore-left'   => 2365,
                        'explore-height' => 802,
                        'explore-width'  => 70
                    ]
                ]
            );

            $this->generateStarterGame(
                'explore-wall',
                [
                    'title' => 'Wall 5',
                    'meta'  => [
                        'explore-area'   => 'rovanar-forest',
                        'explore-top'    => 2365,
                        'explore-left'   => 2414,
                        'explore-height' => 418,
                        'explore-width'  => 122
                    ]
                ]
            );

            $this->generateStarterGame(
                'explore-wall',
                [
                    'title' => 'Wall 4',
                    'meta'  => [
                        'explore-area'   => 'rovanar-forest',
                        'explore-top'    => 2349,
                        'explore-left'   => 2861,
                        'explore-height' => 434,
                        'explore-width'  => 186
                    ]
                ]
            );

            $this->generateStarterGame(
                'explore-point',
                [
                    'title'         => 'Gate',
                    'meta'          => [
                        'explore-area'             => 'rovanar-forest',
                        'explore-top'              => 2294,
                        'explore-left'             => 2261,
                        'explore-height'           => 527,
                        'explore-width'            => 900,
                        'explore-interacted'       => $this->plugin->dir_url . '/assets/src/images/starter-game/gate-open.png',
                        'explore-passable'         => 'yes',
                        'explore-disappear'        => 'no',
                        'explore-interaction-type' => 'collectable'
                    ],
                    'featured_image' => $this->plugin->dir_path . '/assets/src/images/starter-game/gate.png',
                ]
            );

            $this->generateStarterGame(
                'explore-point',
                [
                    'title'         => 'Key',
                    'meta'          => [
                        'explore-area'             => 'rovanar-forest',
                        'explore-top'              => 3204,
                        'explore-left'             => 2941,
                        'explore-height'           => 100,
                        'explore-width'            => 40,
                        'explore-interaction-type' => 'collectable'
                    ],
                    'featured_image' => $this->plugin->dir_path . '/assets/src/images/starter-game/key.png',
                ]
            );

            // Generate starter missions with blockade.
            $this->generateStarterGame(
                'explore-mission',
                [
                    'title'         => 'Open the gate',
                    'meta'          => [
                        'explore-area'             => 'rovanar-forest',
                        'explore-trigger-item'     => ['gate' => 'on'],
                    ],
                ]
            );

            $this->generateStarterGame(
                'explore-mission',
                [
                    'title'         => 'Collect the key',
                    'meta'          => [
                        'explore-area'             => 'rovanar-forest',
                        'explore-top'              => 2834,
                        'explore-left'             => 2436,
                        'explore-height'           => 10,
                        'explore-width'            => 550,
                        'explore-trigger-item'     => ['key' => 'on'],
                        'explore-next-mission'     => ['open-the-gate' => 'on']
                    ],
                ]
            );

            // Generate starter mission with blockade.
            $this->generateStarterGame(
                'explore-explainer',
                [
                    'title'         => 'You win',
                    'content'       => '<!-- wp:paragraph {"align":"center","fontSize":"x-large"} -->
<p class="has-text-align-center has-x-large-font-size"><strong>Congratulations! You completed the game!</strong></p>
<!-- /wp:paragraph -->

<!-- wp:paragraph {"align":"center"} -->
<p class="has-text-align-center"><strong>Learn more about game building at <a href="https://orbem.studio/" target="_blank" rel="noreferrer noopener">Orbem.Studio</a></strong></p>
<!-- /wp:paragraph -->',
                    'meta'          => [
                        'explore-area'             => 'rovanar-forest',
                        'explore-width'            => 700,
                        'explore-explainer-type'   => 'fullscreen',
                        'explore-top'              => 2834,
                        'explore-left'             => 2436,
                        'explore-height'           => 10,
                        'explore-explainer-trigger' => [
                            'top' => 2264,
                            'left' => 2415,
                            'height' => 80,
                            'width' => 550
                        ]
                    ],
                ]
            );

            $this->telemetry->orbemTlmEvent('starter_game_generated', ['type' => 'starter']);
        }

        if ('page' === $type) {
            // Generate starter page.
            $this->generateStarterGame(
                'page',
                [
                    'title' => 'My Orbem Studio Game',
                ]
            );

            update_option('explore_game_page', 'my-orbem-studio-game');

            $this->telemetry->orbemTlmEvent('play_page_assigned', ['method' => 'auto_create']);

            return rest_ensure_response( [
                'success' => true,
                'data'    => home_url() . '/my-orbem-studio-game',
            ] );
        }

        $this->telemetry->orbemTlmEvent('wizard_mode_selected', ['mode' => $type]);

        update_option('explore_setup', 'true');

        return rest_ensure_response( [
            'success' => true,
            'data'    => esc_html__('success', 'orbem-studio'),
        ] );
    }

    /**
     * @param string $type
     * @param array $args
     * @return bool Did the post get created.
     */
    private function generateStarterGame(string $type, array $args): bool
    {
        $defaults = [
            'title' => 'New ' . $type,
            'content' => '',
            'status' => 'publish',
            'author' => get_current_user_id(),
            'meta' => [],
            'featured_image' => null,
        ];

        $args = wp_parse_args($args, $defaults);

        $post_data = [
            'post_type'    => $type,
            'post_title'   => wp_strip_all_tags($args['title']),
            'post_content' => $args['content'],
            'post_status'  => $args['status'],
            'post_author'  => $args['author'],
        ];

        $post_id = wp_insert_post($post_data, true);

        if (is_wp_error($post_id)) {
            return false;
        }

        // Save post meta if provided
        if (! empty($args['meta']) && is_array($args['meta'])) {
            foreach ($args['meta'] as $key => $value) {
                update_post_meta($post_id, $key, $value);
            }
        }

        // Handle featured image
        if ($args['featured_image']) {
            $image_id = $this->uploadAndAttachFeaturedImage(
                $args['featured_image'],
                $post_id
            );

            if (false === $image_id) {
                return false;
            }

            set_post_thumbnail($post_id, $image_id);
        }

        return true;
    }

    /**
     * Upload image and attach it to a post.
     *
     * @param array|string $image Image URL or $_FILES-style array
     * @param int $post_id
     *
     * @return int|bool Attachment ID or false
     */
    public function uploadAndAttachFeaturedImage(array|string $asset_url, int $post_id): int|bool
    {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';


        if (!file_exists($asset_url) || !is_readable($asset_url)) {
            return false;
        }

        // Copy to temp file for WP upload handler.
        $tmp = wp_tempnam(basename($asset_url));
        if (!$tmp) {
            return false;
        }

        if (!copy($asset_url, $tmp)) {
            wp_delete_file($tmp);
            return false;
        }

        $file = [
            'name' => basename($asset_url),
            'tmp_name' => $tmp,
        ];

        $attachment_id = media_handle_sideload($file, $post_id);

        wp_delete_file($tmp);

        if (is_wp_error($attachment_id)) {
            return false;
        }

        return (int) $attachment_id;
    }

    /**
     * Add game options menu.
     *
     * @action admin_menu
     * @return void
     */
    public function addGameOptionMenu(): void
    {
        if (!current_user_can('edit_posts')) {
            return;
        }

        $parent_slug  = 'orbem-studio';
        $parent_title = 'Orbem Studio';
        $post_types   = Util::getCurrentPostTypes();

        add_menu_page(
            $parent_title,
            $parent_title,
            'edit_posts',
            $parent_slug,
            '',
            'dashicons-games',
            25
        );

        foreach ($this->getStudioSubmenus($parent_slug) as $submenu) {
            add_submenu_page(
                $submenu['parent_slug'],
                $submenu['page_title'],
                $submenu['menu_title'],
                $submenu['capability'],
                $submenu['menu_slug'],
                $submenu['callback'] ?? null
            );
        }

        foreach ($post_types as $cpt) {
            $obj = get_post_type_object($cpt);

            if (!$obj) {
                continue;
            }

            $cpt_menu_slug = "edit.php?post_type={$cpt}";

            add_submenu_page(
                $parent_slug,
                $obj->labels->menu_name,
                $obj->labels->menu_name,
                $obj->cap->edit_posts,
                $cpt_menu_slug
            );

            $taxonomies = get_object_taxonomies($cpt, 'objects');

            foreach ($taxonomies as $tax) {
                if (false === $tax->show_ui || false === $tax->show_in_menu) {
                    continue;
                }

                add_submenu_page(
                    $parent_slug,
                    '— ' . $tax->labels->name,
                    '— ' . $tax->labels->menu_name,
                    $tax->cap->manage_terms,
                    "edit-tags.php?taxonomy={$tax->name}&post_type={$cpt}"
                );
            }

            $this->removeOriginalCptMenus($cpt_menu_slug, $taxonomies);
        }
    }

    /**
     * Central place for static Orbem Studio submenus.
     * Add future custom pages here.
     */
    private function getStudioSubmenus(string $parent_slug): array
    {
        return [
            [
                'parent_slug' => $parent_slug,
                'page_title' => 'Game Options',
                'menu_title' => 'Game Options',
                'capability' => 'edit_posts',
                'menu_slug'  => $parent_slug,
                'callback'   => [$this, 'gameOptionsPage'],
            ],
            [
                'parent_slug' => $parent_slug,
                'page_title' => 'Custom CSS',
                'menu_title' => 'Custom CSS',
                'capability' => 'edit_posts',
                'menu_slug'  => 'orbem-custom-css',
                'callback'   => [$this, 'settingsPage'],
            ],
        ];
    }

    /**
     * Remove original CPT/taxonomy menu locations so Orbem Studio is the only parent.
     */
    private function removeOriginalCptMenus(string $cpt_menu_slug, array $taxonomies): void
    {
        remove_menu_page($cpt_menu_slug);

        remove_submenu_page($cpt_menu_slug, $cpt_menu_slug);
        remove_submenu_page($cpt_menu_slug, str_replace('edit.php', 'post-new.php', $cpt_menu_slug));

        foreach ($taxonomies as $tax) {
            if (false === $tax->show_ui || false === $tax->show_in_menu) {
                continue;
            }

            remove_submenu_page(
                $cpt_menu_slug,
                "edit-tags.php?taxonomy={$tax->name}&post_type={$tax->object_type[0]}"
            );
        }
    }

    /**
     * Highlight the Orbem Studio menu for explore-* CPT and taxonomy pages.
     *
     * WordPress's get_admin_page_parent() doesn't handle taxonomy pages
     * with custom parents, so we need to use the parent_file filter.
     *
     * @filter parent_file
     * @param string $parent_file The current parent file.
     * @return string
     */
    public function highlightExploreMenuItems(string $parent_file): string
    {
        global $typenow, $submenu_file, $pagenow, $taxnow;

        // Handle both CPT pages (edit.php) and taxonomy pages (edit-tags.php).
        if (false === empty($typenow) && true === str_starts_with($typenow, 'explore-')) {
            // For taxonomy pages, also set the submenu_file so the item gets highlighted.
            if ($pagenow === 'edit-tags.php' && false === empty($taxnow)) {
                $submenu_file = "edit-tags.php?taxonomy={$taxnow}&post_type={$typenow}";
            }
            return 'orbem-studio';
        }

        return $parent_file;
    }

    /**
     * Filter taxonomy menu items to only show relevant ones.
     *
     * - On CPT pages: show only taxonomies for the current CPT
     * - On Game Options page: hide all taxonomy items
     * @action admin_head
     * @return void
     */
    public function organizeTaxoMenuItems(): void
    {
        global $submenu;

        $screen = get_current_screen();

        if (true === empty($screen)) {
            return;
        }

        $menu_slug = 'orbem-studio';

        if (empty($submenu[$menu_slug])) {
            return;
        }

        $post_types = [
            'explore-area',
            'explore-point',
            'explore-character',
            'explore-cutscene',
            'explore-enemy',
            'explore-weapon',
            'explore-mission',
            'explore-sign',
            'explore-minigame',
            'explore-explainer',
            'explore-wall',
            'explore-communicate'
        ];

        $current_post_type = $screen->post_type;

        // If we're on the Game Options page or a non-explore CPT, hide all taxonomy items.
        if (true === empty($current_post_type) || false === in_array($current_post_type, $post_types, true)) {
            foreach ($submenu[$menu_slug] as $index => $item) {
                $slug = $item[2];
                if (true === str_starts_with($slug, 'edit-tags.php')) {
                    unset($submenu[$menu_slug][$index]);
                }
            }

            return;
        }

        // On a CPT page, only show taxonomies for the current CPT.
        $allowed_tax_slugs = [];
        $taxonomies = get_object_taxonomies($current_post_type);

        foreach ($taxonomies as $taxonomy) {
            $allowed_tax_slugs[] = "edit-tags.php?taxonomy=$taxonomy&post_type=$current_post_type";
        }

        foreach ($submenu[$menu_slug] as $index => $item) {
            $slug = $item[2];
            if (
                true === str_starts_with($slug, 'edit-tags.php') &&
                false === in_array($slug, $allowed_tax_slugs, true)
            ) {
                unset($submenu[$menu_slug][$index]);
            }
        }
    }

    /**
     * @action admin_init
     * @return void
     */
    public function registerGameOptions(): void
    {
        $settings = self::getGameOptionSettings();
        $custom_css_settings = self::getCustomCssSettings();

        add_settings_section('game_options_section', 'Global Game Options', function () {
            settings_fields('game_options');
        }, 'game_options');

        foreach ( $settings as $key => $value ) {
            register_setting('game_options', $key, [
                'sanitize_callback' => [$this, 'sanitizeGameOption'],
            ]);

            add_settings_field(
                $key,
                $value[1],
                function($args) use ($key, $value) {
                    $field_key = $args[0];
                    $indicator = get_option($field_key, '');
                    if (isset($value[0]) && $value[0] === 'upload') : ?>
                        <div class="explore-image-field">
                            <?php if ('' !== $indicator && false === str_contains($indicator, 'webm') && false === str_contains($indicator, 'mp4') && false === str_contains($indicator, 'mp3') && false === str_contains($indicator, '.wav')) : ?>
                                <img alt="indicator icon" src="<?php echo esc_url($indicator); ?>" width="60"/>
                                <br>
                            <?php endif; ?>
                            <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                            <p>
                                <input type="text" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" value="<?php echo esc_attr($indicator); ?>" class="widefat explore-upload-field" readonly />
                            </p>
                            <p>
                                <button type="button" class="upload_image_button button"><?php esc_html_e('Select Image', 'orbem-studio'); ?></button>
                                <button type="button" class="remove_image_button button"><?php esc_html_e('Remove Image', 'orbem-studio'); ?></button>
                            </p>
                        </div>
                    <?php elseif (isset($value[0]) && $value[0] === 'text') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <input type="text" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" value="<?php echo esc_attr($indicator); ?>" />
                    <?php elseif (isset($value[0]) && $value[0] === 'color') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <input class="explore-color-field" type="text" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" value="<?php echo esc_attr($indicator); ?>" />
                    <?php elseif (isset($value[0]) && $value[0] === 'number') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <input type="number" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" value="<?php echo esc_attr($indicator); ?>" />
                    <?php elseif (isset($value[0]) && $value[0] === 'select') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <select name="<?php echo esc_attr($field_key); ?>">
                            <option disabled selected value>Select...</option>
                            <?php foreach($value[3] as $option) : ?>
                                <option value="<?php echo esc_attr(is_object($option) ? $option->post_name : $option); ?>" <?php selected(is_object($option) ? $option->post_name : $option, $indicator); ?>><?php echo esc_attr(is_object($option) ? $option->post_title : $option); ?></option>
                            <?php endforeach; ?>
                        </select>
                    <?php elseif (isset($value[0]) && $value[0] === 'checkbox') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <input type="checkbox" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" <?php checked('on', $indicator); ?> />
                    <?php elseif (isset($value[0]) && $value[0] === 'multiselect') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <div class="multiselect-wrapper">
                            <?php foreach($value[3] as $option): ?>
                                <p>
                                    <label>
                                        <input
                                            type="checkbox"
                                            <?php checked($indicator[$option] ?? '', 'on'); ?>
                                            name="<?php echo esc_attr($field_key . '[' . $option . ']'); ?>"
                                            id="<?php echo esc_attr($field_key . '[' . $option . ']'); ?>"
                                        >
                                        <?php echo esc_html(ucwords(str_replace('-',' ', $option))); ?>
                                    </label>
                                </p>
                            <?php endforeach;?>
                        </div>
                    <?php endif;
                },
                'game_options',
                'game_options_section',
                [$key, $value]
            );
        }

        add_settings_section('custom_css_section', 'Custom CSS', function () {
            settings_fields('custom_css_options');
        }, 'custom_css_options');

        foreach ($custom_css_settings as $key => $value) {
            register_setting('custom_css_options', $key, [
                'sanitize_callback' => [$this, 'sanitizeCustomCssOption'],
            ]);

            add_settings_field(
                $key,
                $value[1],
                function($args) use ($key, $value) {
                    $field_key = $args[0];
                    $indicator = get_option($field_key, '');

                    if (isset($value[0]) && $value[0] === 'textarea') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <textarea
                            id="<?php echo esc_attr($field_key); ?>"
                            name="<?php echo esc_attr($field_key); ?>"
                            rows="20"
                            class="large-text code"
                        ><?php echo esc_textarea($indicator); ?></textarea>
                    <?php endif;
                },
                'custom_css_options',
                'custom_css_section',
                [$key, $value]
            );
        }
    }

    /**
     * Helper to get game option settings.
     *
     * @return array
     */
    public static function getGameOptionSettings(): array
    {
        $pages = get_posts(['post_type' => 'page', 'post_status' => 'any', 'posts_per_page' => -1, 'no_found_rows' => true]);
        $explainers = get_posts(['post_type' => 'explore-explainer', 'post_status' => 'any', 'posts_per_page' => -1, 'no_found_rows' => true]);
        $areas = get_posts(['post_type' => 'explore-area', 'post_status' => 'publish', 'posts_per_page' => -1, 'no_found_rows' => true]);
        $characters = get_posts(['post_type' => 'explore-character', 'post_status' => 'publish', 'posts_per_page' => -1, 'no_found_rows' => true]);
        $weapons = get_posts(['post_type' => 'explore-weapon', 'post_status' => 'publish', 'posts_per_page' => -1, 'no_found_rows' => true]);

        return [
            'explore_game_page' => ['select', 'Page For Game', 'This is the page on your website that users will play your game on.', $pages],
            'explore_first_area' => ['select', 'Starting Area', 'The starting area/level of the game.', $areas],
            'explore_main_character' => ['select', 'Main Character', 'Your main character that users will control first.', $characters],
            'explore_default_weapon' => ['select', 'Default Weapon', 'The starting weapon your main character will have. (Can be "fist" for no weapon)', $weapons],
            'explore_require_login' => ['select', 'Require Login', 'Require users to login in order to play. "Both" gives a "logged out" option.', ['Yes', 'No', 'Both']],
            'explore_player_name' => ['select', 'Add player name input', 'Do you want to add an input field where people can enter their names to use for character and dialogues?', ['Yes', 'No']],
            'explore_autoplay_cutscene' => ['select', 'Autoplay cutscene dialogue', 'Do you want your cutscene dialogue to automatically go to the next line as it completes?', ['Yes', 'No']],
            'explore_google_login_client_id' => ['text', 'Google Login ClientID', 'Add your Google client id to allow SSO login. (Search google how if you this is confusing)'],
            'explore_google_tts_api_key' => ['text', 'Google TTS API Key', 'Add your Google TTS API key to allow cutscenes and explainers to talk using text to speech.'],
            'explore_hud_bars'     => ['multiselect', 'HUD bars', 'Choose which bars you wish to use for your game.', ['health', 'mana', 'power', 'money', 'points']],
            'explore_storage_tabs' => ['multiselect', 'Storage tabs', 'Choose which storage tabs your storage menu should offer.', ['items', 'weapons', 'gear']],
            'explore_settings_icon' => ['upload', 'Settings Icon', 'Override settings icon in HUD'],
            'explore_hide_storage' => ['checkbox', 'Hide Storage Menu', 'If checked the storage menu will not appear in HUD.'],
            'explore_storage_icon' => ['upload', 'Storage Menu Icon', 'Override storage menu icon in HUD'],
            'explore_crew_icon'   => ['upload', 'Crewmate Menu Icon', 'Override crewmate menu icon in HUD'],
            'explore_money_image' => ['upload', 'Money Icon', 'Override money icon for in game currency.'],
            'explore_indicator_icon' => ['upload', 'Indicator Icon', 'Override your indicator icon that shows when "focus view" or "character" game assets are interactable.'],
            'explore_mobile_dpad' => ['upload', 'Mobile D-pad', 'Override the mobile d-pad that allows users to move on mobile devices.'],
            'explore_mobile_action' => ['upload', 'Mobile Action Key', 'Override the mobile action key that allows users to interact on mobile devices.'],
            'explore_arrow_icon' => ['upload', 'Arrow Icon', 'Override the default arrow icon that is used to point for explainer popups.'],
            'explore_cutscene_border_color' => ['color', 'Cutscene Border Color', 'The cutscene popup border color.'],
            'explore_cutscene_border_size' => ['number', 'Cutscene Border Size', 'The border size of the Cutscene popups (in pixel).'],
            'explore_cutscene_border_radius' => ['number', 'Cutscene Border Radius', 'The border radius of the Cutscene popups.'],
            'explore_cutscene_border_style' => ['select', 'Cutscene Border Style', 'The border style of the Cutscene popups.', ['solid', 'dashed', 'dotted']],
            'explore_skip_button_color' => ['color', 'Skip Button Color', 'The skip button background color (text is white).'],
            'explore_explainer_border_color' => ['color', 'Explainer Border Color', 'The border color of the explainer popups.'],
            'explore_explainer_border_size' => ['number', 'Explainer Border Size', 'The border size of the explainer popups (in pixel).'],
            'explore_explainer_border_radius' => ['number', 'Explainer Border Radius', 'The border radius of the explainer popups.'],
            'explore_explainer_border_style' => ['select', 'Explainer Border Style', 'The border style of the explainer popups.', ['solid', 'dashed', 'dotted']],
            'explore_crewmate_hover_border_color' => ['color', 'Playable Character Border Color', 'The border color when you hover over a character in the crew mate selector.'],
            'explore_intro_video' => ['upload', 'Intro Video', 'The video that will play when users first visit the game page.'],
            'explore_start_music' => ['upload', 'Start Screen Music', 'The music that will play after the intro video and on the start screen.'],
            'explore_signin_screen' => ['upload', 'Sign In Screen Background Image', 'The image/video that will show on the start screen.'],
            'explore_signin_screen_mobile' => ['upload', 'Mobile Sign In Screen Background Image', 'The image/video that will show on the start screen on mobile devices.'],
            'explore_lose_message' => ['select', 'Lose Message', 'The message that pops up when you lose all your health (uses an Explainer)', $explainers],
            'explore_walking_sound' => ['upload', 'Walking Sound Effect', 'The sound that will play when your main character walks.'],
            'explore_points_sound' => ['upload', 'Sound When Points Are Given', 'The sound that will play when you complete a mission or collect something.']
        ];
    }

    /**
     * Helper to get custom CSS settings.
     *
     * @return array
     */
    public static function getCustomCssSettings(): array
    {
        return [
            'explore_custom_css' => ['textarea', 'Custom CSS', 'Add custom CSS for the explore/game experience.'],
        ];
    }

    /**
     * Sanitize function for game options.
     *
     * @param mixed $value
     * @return mixed
     */
    public function sanitizeGameOption(mixed $value): mixed
    {
        $option_name = current_filter() === 'sanitize_option'
            ? null
            : str_replace('sanitize_option_', '', current_filter());

        $settings = self::getGameOptionSettings();

        if (!$option_name || !isset($settings[$option_name])) {
            return sanitize_text_field($value);
        }

        $type    = $settings[$option_name][0];
        $choices = $settings[$option_name][3] ?? [];

        switch ($type) {
            case 'upload':
                return esc_url_raw($value);

            case 'color':
                return sanitize_hex_color($value);

            case 'number':
                return is_numeric($value) ? absint($value) : 0;

            case 'checkbox':
                return $value === 'on' ? 'on' : '';

            case 'select':
                $allowed = array_map(
                    static function ($option) {
                        return is_object($option) ? $option->post_name : $option;
                    },
                    $choices
                );

                return in_array($value, $allowed, true) ? $value : '';

            case 'multiselect':
                if ( ! is_array($value) ) {
                    return [];
                }

                $allowed = array_map('sanitize_key', $choices);
                $clean   = [];

                foreach ($value as $key => $checked) {
                    $key = sanitize_key($key);

                    if (in_array($key, $allowed, true) && $checked === 'on') {
                        $clean[$key] = 'on';
                    }
                }

                return $clean;

            default:
                return sanitize_text_field($value);
        }
    }

    /**
     * Sanitize function for custom CSS options.
     *
     * @param mixed $value
     * @return string
     */
    public function sanitizeCustomCssOption(mixed $value): string
    {
        return is_string($value) ? wp_strip_all_tags($value, true) : '';
    }

    /**
     * Enqueue admin assets for the Custom CSS page only.
     *
     * @action admin_enqueue_scripts
     * @param string $hook_suffix Current admin hook.
     * @return void
     */
    public function enqueueCustomCssEditorAssets(string $hook_suffix): void
    {
        $page = isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : '';

        if ('orbem-custom-css' !== $page) {
            return;
        }

        $settings = wp_enqueue_code_editor(
            [
                'type' => 'text/css',
                'codemirror' => [
                    'indentUnit' => 4,
                    'tabSize' => 4,
                    'lineNumbers' => true,
                    'lineWrapping' => true,
                    'matchBrackets' => true,
                    'autoCloseBrackets' => true,
                    'styleActiveLine' => true,
                ],
            ]
        );

        wp_enqueue_style('wp-codemirror');
        wp_enqueue_script('wp-theme-plugin-editor');

        wp_enqueue_script(
            'orbem-custom-css-editor',
            $this->plugin->dir_url . '/assets/src/js/admin/custom-css-editor.js',
            ['jquery', 'code-editor'],
            defined('ORBEM_STUDIO_VERSION') ? ORBEM_STUDIO_VERSION : null,
            true
        );

        wp_localize_script(
            'orbem-custom-css-editor',
            'orbemCustomCssEditor',
            [
                'selector' => '#explore_custom_css',
                'settings' => $settings ?: [],
            ]
        );
    }

    /**
     * Generic settings page renderer.
     *
     * @return void
     */
    public function settingsPage(): void
    {
        $page = isset($_GET['page']) ? sanitize_key(wp_unslash($_GET['page'])) : '';

        if ('orbem-custom-css' === $page) {
            $page_title    = 'Custom CSS';
            $option_group  = 'custom_css_options';
            $option_page   = 'custom_css_options';
        } else {
            $page_title    = 'Game Options';
            $option_group  = 'game_options';
            $option_page   = 'game_options';
        }
        ?>
        <div class="wrap">
            <h1><?php echo esc_html($page_title); ?></h1>
            <form method="post" action="options.php">
                <?php
                settings_fields($option_group);
                do_settings_sections($option_page);
                submit_button();
                ?>
            </form>
        </div>
        <?php
    }

    /**
     * The callback function for game options menu.
     * @return void
     */
    public function gameOptionsPage(): void
    {
        $areas = get_posts(
            [
                'post_type' => 'explore-area',
                'posts_per_page' => -1,
                'no_found_rows'  => true,
            ]
        );
        $finished_area = false === empty($areas) && 0 < count($areas);

        $characters = get_posts(
            [
                'post_type' => 'explore-character',
                'posts_per_page' => -1,
                'no_found_rows'  => true,
            ]
        );
        $finished_character = false === empty($characters) && 0 < count($characters);
        $weapons            = get_posts(
            [
                'post_type' => 'explore-weapon',
                'posts_per_page' => -1,
                'no_found_rows'  => true,
            ]
        );
        $finished_weapon              = false === empty($weapons) && 0 < count($weapons);
        $things_made                  = true === $finished_area && true === $finished_character;
        $orbem_studio_setup_triggered = get_option('orbem_studio_setup_triggered', 'false');

        if ('false' !== $orbem_studio_setup_triggered) {
            $this->telemetry->orbemTlmEventOnce('wizard_started', [
                'context' => 'setup_template',
            ]);
        }

        include $this->plugin->dir_path . '/templates/game-options-page.php';
        $this->settingsPage();
    }
}