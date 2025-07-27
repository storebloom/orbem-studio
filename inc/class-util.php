<?php
/**
 * Util
 *
 * @package OrbemGameEngine
 */

namespace OrbemGameEngine;

/**
 * Util Class
 *
 * @package OrbemGameEngine
 */
class Util
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
     * Get the list of posts by post type. Just the post names.
     *
     * @param $post_type
     * @return array
     */
    public function getOrbemArray($post_type, $taxo = false, $meta_key = '', $meta_value = '')
    {
        $explore_array = [];
        if ($taxo) {
            $explore_taxos = get_terms($post_type);
            foreach($explore_taxos as $explore_taxo) {
                $explore_array[] = $explore_taxo->name;
            }
        } else {
            $meta_query = '';

            if (false === empty($meta_key)) {
                $meta_query = [
                    'meta_query' => [
                        'key' => $meta_key,
                        'value' => $meta_value,
                        'compare' => '=',
                    ]
                ];
            }
            $explore_posts = get_posts(['post_status' => 'publish', 'post_type' => $post_type, 'numberposts' => -1, 'fields' => ['post_name'], $meta_query]);

            foreach ($explore_posts as $explore_post) {
                $explore_array[] = $explore_post->post_name;
            }
        }

        return $explore_array;
    }
}