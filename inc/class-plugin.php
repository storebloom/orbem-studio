<?php
/**
 * Bootstraps the Orbem Game Engine plugin.
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

/**
 * Main plugin bootstrap file.
 */
class Plugin extends Plugin_Base {

    /**
     * Util instance
     *
     * @var Util
     */
    public Util $util;

    /**
     * Explore instance
     *
     * @var Explore
     */
    public Explore $explore;
    private Telemetry $telemetry;

    /**
	 * Plugin constructor.
	 */
	public function __construct() {
		parent::__construct();

        $meta_box  = new Meta_Box( $this );
        $telemetry = new Telemetry( $this );
        $this->telemetry = $telemetry;

		// Initiate classes.
		$classes = array(
            new Util( $this ),
			new Explore( $this ),
            $meta_box,
            new Dev_Mode( $this, $meta_box ),
            new Menu( $this, $telemetry ),
            $telemetry
		);

		// Add classes doc hooks.
		foreach ( $classes as $instance ) {
			$this->add_doc_hooks( $instance );
		}

        // Configure your game.
        register_activation_hook(
            $this->dir_path . '/orbem-studio.php',
            [$this, 'activateOrbemStudio']
        );

        register_deactivation_hook(
            $this->dir_path . '/orbem-studio.php',
            [$this, 'deactivateOrbemStudio']
        );
	}

    /**
     * Trigger the setup flow for orbem studio.
     */
    public function activateOrbemStudio(): void
    {
        $setup_triggered = get_option('orbem_studio_setup_triggered', 'false');

        if ('false' === $setup_triggered) {
            update_option('orbem_studio_setup_triggered', 'true');

            // Tag game site.
            if (!get_option('orbem_install_id')) {
                update_option('orbem_install_id', wp_generate_uuid4());
            }
        }
    }

    /**
     * Remove all global options on deactivate.
     */
    public function deactivateOrbemStudio(): void
    {
        $options = Menu::getGameOptionSettings();

        foreach(array_keys($options) as $option) {
            delete_option($option);
        }

        // Setup data.
        delete_option('explore_setup');
    }

    /**
     * Enqueue Frontend Assets
     *
     * @action wp_enqueue_scripts
     */
    public function enqueueFrontAssets(): void
    {
        $game_page = get_option('explore_game_page', '');
        $page      = get_queried_object();

        if (false === empty($game_page) && false === empty($page->post_name) && $page instanceof \WP_Post && $game_page === $page->post_name) {
            wp_enqueue_script('google-gsi', 'https://accounts.google.com/gsi/client', [], '1.0.0',
                [
                    'strategy' => 'defer',
                    'in_footer' => false
                ]
            );
            self::enqueueScript('orbem-order/app');
            self::enqueueStyle('orbem-order/app');
            self::enqueueStyle('orbem-order/explore');
        }
    }

	/**
	 * Enqueue admin scripts/styles.
	 *
	 * @action admin_enqueue_scripts
	 */
	public function enqueueAdminAssets(): void
    {
        if (true === current_user_can('manage_options') && (str_starts_with(get_post_type(), 'explore-')) || 'toplevel_page_orbem-studio' === get_current_screen()->base) {
            self::enqueueScript('orbem-order/admin');
            self::enqueueScript('orbem-order/required');
            self::enqueueStyle('orbem-order/admin');
            self::enqueueScript('orbem-order/image-upload');
            wp_enqueue_media();
            wp_enqueue_style('wp-color-picker');
            wp_enqueue_script('wp-color-picker');
        }
	}

    /**
     * Auto register assets.
     *
     * @action init
     */
    public function autoRegisterAssets(): void {
        $asset_root = $this->dir_path . '/assets/build/';
        $asset_uri  = $this->dir_url . '/assets/build/';

        $asset_files = glob( $asset_root . '*.asset.php' );

        // Enqueue runtime.js, if it exists.
        if ( true === is_readable( $asset_root . 'runtime.js' ) ) {
            self::enqueueScript(
                'orbem-order/runtime',
                $this->dir_url . 'assets/build/runtime.js',
                array(),
                filemtime( $this->dir_path . 'assets/build/runtime.js' )
            );
        }

        foreach ( $asset_files as $asset_file ) {
            $asset_script = require $asset_file;

            $asset_filename = basename( $asset_file );

            $asset_slug_parts = explode( '.asset.php', $asset_filename );
            $asset_slug       = array_shift( $asset_slug_parts );

            $asset_handle = sprintf( 'orbem-order/%s', $asset_slug );

            $stylesheet_path = $asset_root . $asset_slug . '.css';
            $stylesheet_uri  = $asset_uri . $asset_slug . '.css';

            $javascript_path = $asset_root . $asset_slug . '.js';
            $javascript_uri  = $asset_uri . $asset_slug . '.js';

            if ( true === is_readable( $stylesheet_path ) ) {
                // Filter dependencies to only include registered styles.
                $style_dependencies = array_filter(
                    $asset_script['dependencies'],
                    function ( $dep ) {
                        return wp_style_is( $dep, 'registered' );
                    }
                );

                wp_register_style(
                    $asset_handle,
                    $stylesheet_uri,
                    $style_dependencies,
                    $asset_script['version']
                );
            }

            if ( true === is_readable( $javascript_path ) ) {
                // Filter dependencies to only include registered scripts.
                $script_dependencies_before = $asset_script['dependencies'];
                $script_dependencies_after  = array_filter(
                    $asset_script['dependencies'],
                    function ( $dep ) {
                        return wp_script_is( $dep, 'registered' );
                    }
                );

                wp_register_script(
                    $asset_handle,
                    $javascript_uri,
                    $asset_script['dependencies'],
                    $asset_script['version'],
                    [
                        'in_footer' => false,
                    ]
                );
            }
        }
    }

    /**
     * Enqueue script.
     *
     * @param string $handle       Script handle.
     * @param string $src          Script source.
     * @param array  $dependencies Script dependencies.
     * @param false|string $version      Script version.
     * @param bool   $in_footer    Whether to enqueue in footer.
     */
    public static function enqueueScript(
        string       $handle,
        string       $src = '',
        array        $dependencies = [],
        false|string $version = false,
        bool         $in_footer = false
    ): void
    {
        $localizes = [];

        $current_user_id = get_current_user_id();
        $explore_points = get_user_meta($current_user_id, 'explore_points', true);
        $explore_points = $explore_points ?? [];
        $default_weapon  = get_option('explore_default_weapon', '');
        $explore_abilities = get_user_meta($current_user_id, 'explore_abilities', true);
        $explore_abilities = $explore_abilities ?? [];

        if (true === empty($explore_points)) {
            $explore_points = [
                'health' => ['points' => 100, 'positions' => []],
                'mana' => ['points' => 100, 'positions' => []],
                'point' => ['points' => 0, 'positions' => []],
                'gear' => ['positions' => []],
                'weapons' => ['positions' => []]
            ];
        }

        $explore_areas = get_posts(['post_type' => 'explore-area', 'numberposts' => 500, 'no_found_rows' => true, 'post_status' => 'publish']);
        $music_names = [];

        foreach($explore_areas as $explore_area):
            if (false === isset($explore_area->ID) || false === get_post($explore_area->ID)) {
                continue;
            }

            $music = get_post_meta($explore_area->ID, 'explore-music', true);
            $music_names[$explore_area->post_name] = esc_url($music);
        endforeach;

        $localizes[] = array(
            'object_name' => 'OrbemOrder',
            'value'       => [
                'explorePoints' => $explore_points,
                'exploreAbilities' => $explore_abilities,
                'levelMaps' => wp_json_encode(Explore::getLevelMap()),
                'gameURL' => get_permalink(get_page_by_path(get_option('explore_game_page', ''))),
                'wpThemeURL' => str_replace(['https://', 'http://', 'www'], '', get_home_url()),
                'defaultWeapon' => $default_weapon,
                'TTSAPIKEY' => get_option('explore_google_tts_api_key', ''),
                'orbemNonce' => wp_create_nonce('wp_rest'),
                'siteRESTURL' => rest_url('orbemorder/v1'),
                'previousCutsceneArea' => get_user_meta($current_user_id, 'explore_previous_cutscene_area', true),
                'musicNames' => wp_json_encode($music_names)
            ]
        );

        wp_enqueue_script( $handle, $src, $dependencies, $version, $in_footer );

        if ( 0 < count( $localizes ) ) {
            foreach ( $localizes as $localize ) {
                $object_name  = $localize['object_name'] ?? '';
                $local_params = true === isset( $localize['value'] ) && true === is_array( $localize['value'] ) ?
                    $localize['value'] :
                    array();

                wp_localize_script(
                    $handle,
                    $object_name,
                    $local_params
                );
            }
        }
    }

    /**
     * Enqueue style.
     *
     * @param string           $handle       Style handle.
     * @param string           $src          Style source.
     * @param string[]         $dependencies Style dependencies.
     * @param bool|string|null $version      Style version.
     * @param string           $media        Style media.
     *
     * @return void
     */
    public static function enqueueStyle(
        string           $handle,
        string           $src = '',
        array            $dependencies = array(),
        bool|string|null $version = false,
        string           $media = 'all'
    ): void
    {
        wp_enqueue_style( $handle, $src, $dependencies, $version, $media );
    }

    /**
     * Use template file if page matches option.
     *
     * @filter template_include
     * @param $template
     * @return string
     */
    public function exploreIncludeTemplate($template): string
    {
        $game_page = get_option('explore_game_page', '');
        $page = get_queried_object();

        if (false === empty($game_page) && false === empty($page->post_name) && $page instanceof \WP_Post && $game_page === $page->post_name) {
            $this->telemetry->orbemTlmEventOnce('game_play_viewed', [
                'play_page_id' => get_queried_object_id(),
                'has_game_data' => true,
            ], 'install');

            return plugin_dir_path(__FILE__) . '../templates/explore.php';
        }

        return $template;
    }


    /**
     * Add filter to posts in taxo.
     * @action restrict_manage_posts
     * @return void
     */
    public function addFilterToTaxo(): void
    {
        global $typenow;

        // Only target post types starting with "explore-"
        if (!str_starts_with($typenow, 'explore-')) return;

        $taxonomy = 'explore-area-point';
        $tax_obj = get_taxonomy($taxonomy);
        if (!$tax_obj) return;

        wp_dropdown_categories([
            'show_option_all' => sprintf('All %s', $tax_obj->label),
            'taxonomy'        => $taxonomy,
            'name'            => $taxonomy,
            'orderby'         => 'name',
            'selected'        => esc_attr($tax_obj->term_id),
            'hierarchical'    => true,
            'depth'           => 0,
            'show_count'      => false,
            'hide_empty'      => false,
        ]);
    }


    /**
     * Filter the taxo in CPT.
     * @filter parse_query
     * @param $query
     * @return void
     */
    public function filterPostsAdminList ($query): void
    {
        if (!is_admin() || !$query->is_main_query()) return;

        $post_type = $query->get('post_type');
        $taxonomy  = 'explore-area-point';

        if (!str_starts_with($post_type, 'explore-')) return;

        $term_id = filter_input(INPUT_GET, $taxonomy, FILTER_SANITIZE_NUMBER_INT);

        if (
            isset($term_id) &&
            $term_id !== 0
        ) {
            $term = get_term($term_id, $taxonomy);
            if ($term && !is_wp_error($term)) {
                $query->set($taxonomy, $term->slug); // Use slug, not term ID
            }
        }
    }

    /**
     * Block Gutenberg blocks.
     *
     * @filter allowed_block_types_all
     *
     * @param bool|array $allowed_blocks
     * @param \WP_Block_Editor_Context $editor_context
     * @return bool|array
     */
    public function blockGutenbergBlocks(bool|array $allowed_blocks, \WP_Block_Editor_Context $editor_context): bool|array
    {
        // Always preserve behavior if context is missing
        if (empty($editor_context->post)) {
            return $allowed_blocks;
        }

        $post_type = $editor_context->post->post_type;

        // Only target explore-* post types
        if (!str_starts_with($post_type, 'explore-')) {
            return $allowed_blocks;
        }

        if (in_array($post_type, ['explore-magic', 'explore-explainer', 'explore-sign'], true)) {
            return [
                'core/paragraph',
                'core/image',
            ];
        }

        if ($post_type === 'explore-weapons') {
            return [
                'core/paragraph',
            ];
        }

        if ($post_type === 'explore-minigame') {
            return [
                'core/paragraph',
                'core/image',
                'core/group',
            ];
        }

        if (in_array($post_type, ['explore-cutscene', 'explore-communicate'], true)) {
            return [
                'orbem/paragraph-mp3',
                'core/video',
            ];
        }

        return $allowed_blocks;
    }

    /**
     * Detect when explore_game_page option is saved.
     *
     * @action admin_init
     */
    public function saveGamePageOption(): void
    {
        // Mark tutorial complete.
        $game_page = get_option('explore_game_page', '');

        if (false === empty($game_page)) {
            update_option( 'orbem_studio_setup_triggered', 'false' );
        }
    }

    /**
     * Remove image scaling to allow users to upload large maps.
     * @filter big_image_size_threshold
     * @return false
     */
    public function disableImageScaling()
    {
        // Correct way to disable scaling
        return false;
    }
}
