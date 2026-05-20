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

    public static function getLoseMessage() {
        $lose_message_explainer = get_option('explore_lose_message');
        $lose_explainer = get_posts([
            'post_type'      => ['explore-explainer'],
            'name'           => sanitize_key($lose_message_explainer),
            'post_status'    => 'any',
            'posts_per_page' => 1,
            'no_found_rows'  => true,
        ]);
        $sound_html = '';

        if (!empty($lose_explainer[0]) && $lose_message_explainer === $lose_explainer[0]->post_name) {
            $sound_byte = get_post_meta($lose_explainer[0]->ID, 'explore-sound-byte', true);

            if (false === empty($sound_byte)) {
                $sound_html = '<audio id="' . esc_attr($lose_explainer[0]->ID) . '-s" src="' . esc_url($sound_byte) . '"></audio>';
            }

            return do_blocks($lose_explainer[0]->post_content) . $sound_html;
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
