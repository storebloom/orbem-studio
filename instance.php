<?php
/**
 * Instantiates the Orbem Studio plugin
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Bootstrap the plugin.
 */
require_once __DIR__ . '/inc/class-plugin-base.php';
require_once __DIR__ . '/inc/class-plugin.php';
require_once __DIR__ . '/inc/class-explore.php';
require_once __DIR__ . '/inc/class-meta-box.php';
require_once __DIR__ . '/inc/class-dev-mode.php';
require_once __DIR__ . '/inc/class-util.php';
require_once __DIR__ . '/inc/class-menu.php';

$orbem_studio_studio = new Plugin();
