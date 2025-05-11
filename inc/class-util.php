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
    public function getOrbemArray($post_type)
    {
        $explore_array = ['none'];
        $explore_posts = get_posts(['post_status' => 'publish', 'post_type' => $post_type, 'numberposts' => -1, 'fields' => ['post_name']]);

        foreach ($explore_posts as $explore_post) {
            $explore_array[] = $explore_post->post_name;
        }

        return $explore_array;
    }
}