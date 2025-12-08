<?php
/**
 * Menu
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

use OrbemStudio\Util;

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
        $parent_slug  = 'orbem-studio';
        $parent_title = 'Orbem Studio';

        $post_types = Util::getCurrentPostTypes();

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
            [$this, 'gameOptionsPage']
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

            // Remove original top-level CPT menu.
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
            'explore-wall',
            'explore-communicate'
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

        $menu_slug = 'orbem-studio';

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
        $pages = get_posts(['post_type' => 'page', 'post_status' => 'publish', 'posts_per_page' => 200]);
        $areas = get_posts(['post_type' => 'explore-area', 'post_status' => 'publish', 'posts_per_page' => 200]);
        $characters = get_posts(['post_type' => 'explore-character', 'post_status' => 'publish', 'posts_per_page' => 200]);
        $weapons = get_posts(['post_type' => 'explore-weapon', 'post_status' => 'publish', 'posts_per_page' => 200]);

        $settings = [
            'explore_game_page' => ['select', 'Page For Game', 'This is the page on your website that users will play your game on.', $pages],
            'explore_first_area' => ['select', 'Starting Area', 'The starting area/level of the game.', $areas],
            'explore_main_character' => ['select', 'Main Character', 'Your main character that users will control first.', $characters],
            'explore_default_weapon' => ['select', 'Default Weapon', 'The starting weapon your main character will have. (Can be "fist" for no weapon)', $weapons],
            'explore_require_login' => ['checkbox', 'Require Login', 'Require users to login in order to play or give a "logged out" option.'],
            'explore_money_image' => ['upload', 'Money Icon', 'Override money icon for in game currency.'],
            'explore_indicator_icon' => ['upload', 'Indicator Icon', 'Your indicator icon that shows when "focus view" or "character" game assets are interactable.'],
            'explore_arrow_icon' => ['upload', 'Arrow Icon', 'The arrow icon that is used to point for explainer popups.'],
            'explore_intro_video' => ['upload', 'Intro Video', 'The video that will play when users first visit the game page.'],
            'explore_start_music' => ['upload', 'Start Screen Music', 'The music that will play after the intro video and on the start screen.'],
            'explore_signin_screen' => ['upload', 'Sign In Screen Background Image', 'The image/video that will show on the start screen.'],
            'explore_walking_sound' => ['upload', 'Walking Sound Effect', 'The sound that will play when your main character walks.'],
            'explore_points_sound' => ['upload', 'Sound When Points Are Given', 'The sound that will play when you complete a mission or collect something.']
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
                            <?php if ('' !== $indicator && false === str_contains($indicator, 'webm') && false === str_contains($indicator, 'mp4') && false === str_contains($indicator, 'mp3') && false === str_contains($indicator, '.wav')) : ?>
                                <img src="<?php echo $indicator; ?>" width="60"/>
                                <br>
                            <?php endif; ?>
                            <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                            <p>
                                <input type="text" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" value="<?php echo esc_attr($indicator); ?>" class="widefat explore-upload-field" readonly />
                            </p>
                            <p>
                                <button type="button" class="upload_image_button button"><?php _e('Select Image', 'orbem-studio'); ?></button>
                                <button type="button" class="remove_image_button button"><?php _e('Remove Image', 'orbem-studio'); ?></button>
                            </p>
                        </div>
                    <?php elseif (isset($value[0]) && $value[0] === 'text') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <input type="text" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" value="<?php echo esc_attr($indicator); ?>" />
                    <?php elseif (isset($value[0]) && $value[0] === 'select') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <select name="<?php echo esc_attr($field_key); ?>">
                            <option disabled selected value>Select...</option>
                            <?php foreach($value[3] as $option) : ?>
                                <option value="<?php echo esc_attr($option->post_name); ?>" <?php selected($option->post_name, $indicator, true); ?>><?php echo esc_attr($option->post_title); ?></option>
                            <?php endforeach; ?>
                        </select>
                    <?php elseif (isset($value[0]) && $value[0] === 'checkbox') : ?>
                        <sub><?php echo esc_html($value[2] ?? ''); ?></sub>
                        <input type="checkbox" id="<?php echo esc_attr($field_key); ?>" name="<?php echo esc_attr($field_key); ?>" <?php checked('on', $indicator, true); ?> />
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
        $areas = get_posts(['post_type' => 'explore-area']);
        $finished_area = false === empty($areas) && 0 < count($areas);

        $characters = get_posts(['post_type' => 'explore-character']);
        $finished_character = false === empty($characters) && 0 < count($characters);

        $weapons = get_posts(['post_type' => 'explore-weapon']);
        $finished_weapon = false === empty($weapons) && count($weapons);

        $things_made = true === $finished_area && true === $finished_character && true === $finished_weapon;

        include $this->plugin->dir_path . '/templates/game-options-page.php';
    }
}