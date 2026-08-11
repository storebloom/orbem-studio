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
class Util
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
        $this->plugin->util = $this;
    }

    /**
     * The explainer assigned to the "lose-message" placement area, or null.
     */
    public static function getLoseExplainer(): ?\WP_Post
    {
        $needle = 'lose-message';

        $lose_explainer = get_posts([
            'post_type'      => 'explore-explainer',
            'post_status'    => 'publish',
            'posts_per_page' => 1,
            'no_found_rows'  => true,
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
            'meta_query'     => [
                [
                    'key'     => 'explore-area',
                    'value'   => 's:' . strlen($needle) . ':"' . $needle . '";',
                    'compare' => 'LIKE',
                ],
            ],
        ]);

        return !empty($lose_explainer[0]) ? $lose_explainer[0] : null;
    }

    public static function getLoseMessage(?\WP_Post $lose_explainer = null) {
        if (null === $lose_explainer) {
            $lose_explainer = self::getLoseExplainer();
        }

        if ($lose_explainer instanceof \WP_Post) {
            $sound_byte = get_post_meta($lose_explainer->ID, 'explore-sound-byte', true);
            $sound_html = '';

            if (false === empty($sound_byte)) {
                $sound_html = '<audio id="' . esc_attr($lose_explainer->ID) . '-s" src="' . esc_url($sound_byte) . '"></audio>';
            }

            return do_blocks($lose_explainer->post_content) . $sound_html;
        }

        return 'You lost. <button class="try-again">Try again</button>';
    }

    /**
     * util to get post types.
     * @return string[]
     */
    public static function getCurrentPostTypes(): array
    {
        return [
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
    }

    /**
     * Get the list of posts by post type. Just the post names.
     *
     * @param string $post_type
     * @param bool $taxo
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
        $explore_array = [];

        $post_type = sanitize_key($post_type);
        $meta_key  = sanitize_key($meta_key);

        if ($taxo) {
            $terms = get_terms([
                'taxonomy'   => $post_type,
                'hide_empty' => false,
            ]);

            if (!is_wp_error($terms)) {
                foreach ($terms as $term) {
                    $explore_array[] = $term->name;
                }
            }

            return $explore_array;
        }

        $args = [
            'post_status'    => 'publish',
            'post_type'      => $post_type,
            'numberposts'    => -1,
            'no_found_rows'  => true,
        ];

        if ($meta_key !== '') {
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
            $args['meta_query'] = [
                [
                    'key'   => $meta_key,
                    'value' => $meta_value,
                    'compare' => '=',
                ]
            ];
        }

        $posts = get_posts($args);

        foreach ($posts as $post) {
            $explore_array[$post->post_title] = $post->post_name;
        }

        return $explore_array;
    }
}
