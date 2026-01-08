<?php
/**
 * Util
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

/**
 * Util Class
 *
 * @package OrbemStudio
 */
class Util {


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
	public function __construct( Plugin $plugin ) {
		$this->plugin       = $plugin;
		$this->plugin->util = $this;
	}

	/**
	 * util to get post types.
	 *
	 * @return string[]
	 */
	public static function getCurrentPostTypes(): array {
		return array(
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
			'explore-communicate',
		);
	}

	/**
	 * Get the list of posts by post type. Just the post names.
	 *
	 * @param string $post_type
	 * @param bool   $taxo
	 * @param string $meta_key
	 * @param string $meta_value
	 * @return array
	 */
	public function getOrbemArray(
		string $post_type,
		bool $taxo = false,
		string $meta_key = '',
		string $meta_value = ''
	): array {
		$explore_array = array();

		$post_type = sanitize_key( $post_type );
		$meta_key  = sanitize_key( $meta_key );

		if ( $taxo ) {
			$terms = get_terms(
				array(
					'taxonomy'   => $post_type,
					'hide_empty' => false,
				)
			);

			if ( ! is_wp_error( $terms ) ) {
				foreach ( $terms as $term ) {
					$explore_array[] = $term->name;
				}
			}

			return $explore_array;
		}

		$args = array(
			'post_status'   => 'publish',
			'post_type'     => $post_type,
			'numberposts'   => -1,
			'no_found_rows' => true,
		);

		if ( $meta_key !== '' ) {
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
			$args['meta_query'] = array(
				array(
					'key'     => $meta_key,
					'value'   => $meta_value,
					'compare' => '=',
				),
			);
		}

		$posts = get_posts( $args );

		foreach ( $posts as $post ) {
			$explore_array[] = $post->post_name;
		}

		return $explore_array;
	}
}
