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
     * Meta Box instance
     *
     * @var meta_box
     */
    public $meta_box;

    /**
     * Explore instance
     *
     * @var Explore
     */
    public Explore $explore;

	/**
	 * Plugin constructor.
	 */
	public function __construct() {
		parent::__construct();

        $meta_box = new Meta_Box( $this );

		// Initiate classes.
		$classes = array(
            new Util( $this ),
			new Explore( $this ),
            $meta_box,
            new Dev_Mode( $this, $meta_box ),
            new Menu( $this )
		);

		// Add classes doc hooks.
		foreach ( $classes as $instance ) {
			$this->add_doc_hooks( $instance );
		}

        // Configure your game.
        register_activation_hook(
            $this->dir_path . 'orbem-studio.php',
            [$this, 'activateOrbemStudio']
        );
	}

    /**
     * Trigger the setup flow for orbem studio.
     */
    public function activateOrbemStudio(): void
    {
        $setup_triggered = get_option('orbem_studio_setup_triggered', false);

        if (false === $setup_triggered) {
            update_option('orbem_studio_setup_triggered', true);
        }
    }

    /**
     * Enqueue Frontend Assets
     *
     * @action wp_enqueue_scripts
     */
    public function enqueueFrontAssets(): void
    {
        $game_page = get_option('explore_game_page', '');
        $page = get_queried_object();

        if (false === empty($game_page) && false === empty($page->post_name) && $page instanceof \WP_Post && $game_page === $page->post_name) {
            self::enqueueScript('orbem-order/app');
            self::enqueueStyle('orbem-order/app');

            $current_user_id = get_current_user_id();

            // Register the WebSocket script.
            //wp_enqueue_script('socket-io', 'https://cdn.socket.io/4.0.1/socket.io.min.js', array(), null, true);
            wp_add_inline_script('orbem-order/app',
                'const gameURL = ' . wp_json_encode(get_option('explore_game_url', get_home_url())) . ';
                const siteRESTURL = ' . rest_url('orbemorder/v1') . ';
                const previousCutsceneArea = ' . wp_json_encode(get_user_meta($current_user_id, 'explore_previous_cutscene_area', true)) . ';',
            );

            $explore_points = get_user_meta($current_user_id, 'explore_points', true);
            $explore_points = $explore_points ?? [];

            $explore_abilities = get_user_meta($current_user_id, 'explore_abilities', true);
            $explore_abilities = $explore_abilities ?? [];
            $default_weapon    = get_option('explore_default_weapon', '');

            if (true === empty($explore_points)) {
                $explore_points = [
                    'health'  => ['points' => 100, 'positions' => []],
                    'mana'    => ['points' => 100, 'positions' => []],
                    'point'   => ['points' => 0, 'positions' => []],
                    'gear'    => ['positions' => []],
                    'weapons' => ['positions' => []],
                    'money'   => ['positions' => []],
                ];
            }

            wp_add_inline_script(
                'orbem-order/app',
                'const currentUserId ="' . get_current_user_id() . '";' .
                'const explorePoints = ' . wp_json_encode($explore_points) . ';' .
                'const exploreAbilities = ' . wp_json_encode($explore_abilities) . ';' .
                'const levelMaps = ' . wp_json_encode(Explore::getLevelMap()) . ';' .
                'const defaultWeapon = "' . sanitize_text_field(wp_unslash(($default_weapon))) . '";' .
                'const TTSAPIKEY = "' . sanitize_text_field(get_option('explore_google_tts_api_key', '')) . '";' .
                'const orbemNonce = "' . wp_create_nonce('orbem_wp_rest') . '";',
            );
        }
    }

	/**
	 * Enqueue admin scripts/styles.
	 *
	 * @action admin_enqueue_scripts
     * @action wp_enqueue_scripts
	 */
	public function enqueueAdminAssets(): void
    {
        if (true === current_user_can('manage_options')) {
            self::enqueueScript('orbem-order/admin');
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
        $asset_root = $this->dir_path . 'assets/build/';
        $asset_uri  = $this->dir_url . 'assets/build/';

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
                    false
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
        array        $dependencies = array(),
        false|string $version = false,
        bool         $in_footer = false
    ): void
    {
        $localizes = array();

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

        $localizes[] = array(
            'object_name' => 'OrbemOrder',
            'value'       => [
                'currentUserId' => $current_user_id,
                'explorePoints' => $explore_points,
                'exploreAbilities' => $explore_abilities,
                'levelMaps' => Explore::getLevelMap(),
                'gameURL' => get_permalink(get_page_by_path(get_option('explore_game_page', ''))),
                'wpThemeURL' => str_replace(['https://', 'http://', 'www'], '', get_home_url()),
                'defaultWeapon' => $default_weapon,
                'TTSAPIKEY' => get_option('explore_google_tts_api_key', '')
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
    public function exploreIncludeTemplate( $template ): string
    {
        $game_page = get_option('explore_game_page', '');
        $page = get_queried_object();

        if (false === empty($game_page) && false === empty($page->post_name) && $page instanceof \WP_Post && $game_page === $page->post_name) {
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
            'selected'        => $_GET[$taxonomy] ?? '',
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

        if (
            isset($_GET[$taxonomy]) &&
            is_numeric($_GET[$taxonomy]) &&
            intval($_GET[$taxonomy]) !== 0
        ) {
            $term_id = intval($_GET[$taxonomy]);
            $term = get_term($term_id, $taxonomy);
            if ($term && !is_wp_error($term)) {
                $query->set($taxonomy, $term->slug); // Use slug, not term ID
            }
        }
    }

    /**
     * Block blocks.
     * @filter allowed_block_types_all
     * @param $allowed_blocks
     * @param $editor_context
     * @return string[]
     */
    public function blockGutenbergBlocks( $allowed_blocks, $editor_context ): array
    {
        // Target only your custom post type
        if (!empty($editor_context->post) && true === in_array($editor_context->post->post_type, ['explore-magic', 'explore-explainer', 'explore-sign'])) {
            return [
                'core/paragraph',
                'core/image',
            ];
        }

        if (!empty($editor_context->post) && 'explore-weapons' === $editor_context->post->post_type) {
            return [
                'core/paragraph',
            ];
        }

        if (!empty($editor_context->post) && $editor_context->post->post_type === 'explore-minigame') {
            return [
                'core/paragraph',
                'core/image',
                'core/group'
            ];
        }

        if (!empty($editor_context->post) && true === in_array($editor_context->post->post_type, ['explore-cutscene', 'explore-communicate'])) {
            return [
                'orbem/paragraph-mp3',
                'core/video'
            ];
        }

        return $allowed_blocks; // Default for all other post types
    }

    /**
     * Detect when explore_game_page option is saved.
     *
     * @action update_option_explore_game_page
     */
    public function saveGamePageOption(): void
    {
        // Mark tutorial complete.
        update_option( 'orbem_studio_setup_triggered', 'false' );
    }
}
