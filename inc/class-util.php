<?php
/**
 * Explore
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
}