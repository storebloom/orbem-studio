<?php
/**
 * Instantiates the Orbem Game Engine plugin
 *
 * @package OrbemGameEngine
 */

namespace OrbemGameEngine;

/**
 * Bootstrap the plugin.
 */
require_once __DIR__ . '/inc/class-plugin-base.php';
require_once __DIR__ . '/inc/class-plugin.php';
require_once __DIR__ . '/inc/class-explore.php';
require_once __DIR__ . '/inc/class-meta-box.php';
require_once __DIR__ . '/inc/class-dev-mode.php';
require_once __DIR__ . '/inc/class-util.php';

$orbem_game_engine = new Plugin();