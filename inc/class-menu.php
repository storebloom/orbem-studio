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

    /**
     * Class constructor.
     *
     * @param object $plugin Plugin class.
     */
    public function __construct(object $plugin)
    {
        $this->plugin = $plugin;
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

        $post_types = Util::getCurrentPostTypes();

        add_menu_page(
            $parent_title,
            $parent_title,
            'edit_posts',
            $parent_slug,
            '',
            'dashicons-games',
            25
        );

        add_submenu_page(
            $parent_slug,
            'Game Options',
            'Game Options',
            'edit_posts',
            $parent_slug,
            [$this, 'gameOptionsPage']
        );

        foreach ($post_types as $cpt) {
            $obj = get_post_type_object($cpt);
            if (!$obj) continue;

            $cpt_menu_slug = "edit.php?post_type=$cpt";

            // Add CPT as submenu under Orbem Studio.
            add_submenu_page(
                $parent_slug,
                $obj->labels->menu_name,
                $obj->labels->menu_name,
                $obj->cap->edit_posts,
                $cpt_menu_slug
            );

            // Add its taxonomies directly underneath.
            $taxonomies = get_object_taxonomies($cpt, 'objects');

            foreach ($taxonomies as $tax) {
                if (false === $tax->show_ui || false === $tax->show_in_menu) {
                    continue;
                }

                add_submenu_page(
                    $parent_slug,
                    '— ' . $tax->labels->name, // visually indented
                    '— ' . $tax->labels->menu_name,
                    $tax->cap->manage_terms,
                    "edit-tags.php?taxonomy=$tax->name&post_type=$cpt"
                );
            }

            // Remove original top-level CPT menu.
            remove_menu_page($cpt_menu_slug);

            // Also remove the CPT's submenu entries that WordPress auto-creates.
            // This prevents get_admin_page_parent() from finding the wrong parent.
            remove_submenu_page($cpt_menu_slug, $cpt_menu_slug);
            remove_submenu_page($cpt_menu_slug, "post-new.php?post_type=$cpt");

            // Remove taxonomy submenu items from the original CPT menu.
            // WordPress auto-creates these and they interfere with parent detection.
            foreach ($taxonomies as $tax) {
                if (false === $tax->show_ui || false === $tax->show_in_menu) {
                    continue;
                }

                remove_submenu_page($cpt_menu_slug, "edit-tags.php?taxonomy=$tax->name&post_type=$cpt");
            }
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
     *
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
        $settings = $this->getGameOptionSettings();

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
    }

    /**
     * Helper to get game option settings.
     *
     * @return array
     */
    protected function getGameOptionSettings(): array
    {
        $pages = get_posts(['post_type' => 'page', 'post_status' => 'publish', 'posts_per_page' => -1, 'no_found_rows' => true]);
        $areas = get_posts(['post_type' => 'explore-area', 'post_status' => 'publish', 'posts_per_page' => -1, 'no_found_rows' => true]);
        $characters = get_posts(['post_type' => 'explore-character', 'post_status' => 'publish', 'posts_per_page' => -1, 'no_found_rows' => true]);
        $weapons = get_posts(['post_type' => 'explore-weapon', 'post_status' => 'publish', 'posts_per_page' => -1, 'no_found_rows' => true]);

        return [
            'explore_game_page' => ['select', 'Page For Game', 'This is the page on your website that users will play your game on.', $pages],
            'explore_first_area' => ['select', 'Starting Area', 'The starting area/level of the game.', $areas],
            'explore_main_character' => ['select', 'Main Character', 'Your main character that users will control first.', $characters],
            'explore_default_weapon' => ['select', 'Default Weapon', 'The starting weapon your main character will have. (Can be "fist" for no weapon)', $weapons],
            'explore_require_login' => ['checkbox', 'Require Login', 'Require users to login in order to play or give a "logged out" option.'],
            'explore_google_login_client_id' => ['text', 'Google Login ClientID', 'Add your Google client id to allow SSO login. (Search google how if you this is confusing)'],
            'explore_google_tts_api_key' => ['text', 'Google TTS API Key', 'Add your Google TTS API key to allow cutscenes and explainers to talk using text to speech.'],
            'explore_hud_bars'     => ['multiselect', 'HUD bars', 'Choose which bars you wish to use for your game.', ['health', 'mana', 'power', 'money', 'points']],
            'explore_settings_icon' => ['upload', 'Settings Icon', 'Override settings icon in HUD'],
            'explore_hide_storage' => ['checkbox', 'Hide Storage Menu', 'If checked the storage menu will not appear in HUD.'],
            'explore_storage_icon' => ['upload', 'Storage Menu Icon', 'Override storage menu icon in HUD'],
            'explore_crew_icon'   => ['upload', 'Crewmate Menu Icon', 'Override crewmate menu icon in HUD'],
            'explore_money_image' => ['upload', 'Money Icon', 'Override money icon for in game currency.'],
            'explore_indicator_icon' => ['upload', 'Indicator Icon', 'Override your indicator icon that shows when "focus view" or "character" game assets are interactable.'],
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
            'explore_walking_sound' => ['upload', 'Walking Sound Effect', 'The sound that will play when your main character walks.'],
            'explore_points_sound' => ['upload', 'Sound When Points Are Given', 'The sound that will play when you complete a mission or collect something.']
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

        $settings = $this->getGameOptionSettings();

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
        $weapons = get_posts(
            [
                'post_type' => 'explore-weapon',
                'posts_per_page' => -1,
                'no_found_rows'  => true,
            ]
        );
        $finished_weapon = false === empty($weapons) && 0 < count($weapons);
        $things_made = true === $finished_area && true === $finished_character;

        include $this->plugin->dir_path . '/templates/game-options-page.php';
    }
}