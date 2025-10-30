<?php
/**
 * Plugin Name: Orbem Studio
 * Plugin URI: https://orbemorder.com/
 * Description: Build your own RPG video game using the power of WordPress
 * Version: 1.0.0
 * Author: OrbemOrder
 * Author URI: https://orbemorder.com/
 * Text Domain: orbem-studio
 * Domain Path: /languages
 * License:     GPL v2 or later
 *
 * Copyright 2025 Orbem Order
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * @package OrbemStudio
 */

/**
 * Plugin version constant.
 */
const ORBEM_GAME_ENGINE_VERSION = '1.0.0';

if ( version_compare( phpversion(), '7.0.0', '>=' ) ) {
	require_once __DIR__ . '/instance.php';
} else {
	if ( defined( 'WP_CLI' ) ) {
		WP_CLI::warning( _orbem_game_engine_php_version_text() );
	} else {
		add_action( 'admin_notices', '_orbem_game_engine_php_version_error' );
	}
}

/**
 * Admin notice for incompatible versions of PHP.
 */
function _orbem_game_engine_php_version_error() {
	printf( '<div class="error"><p>%s</p></div>', esc_html( _orbem_game_engine_php_version_text() ) );
}

/**
 * String describing the minimum PHP version.
 *
 * @return string
 */
function _orbem_game_engine_php_version_text() {
	return __(
		'Orbem Game Engine plugin error: Your version of PHP is too old to run this plugin. You must be running PHP 5.3 or higher.',
		'orbem-game-engine'
	);
}

add_filter( 'plugin_action_links_' . plugin_basename( __FILE__ ), '_orbem_game_engine_add_action_links' );

/**
 * Add a link to the settings page.
 *
 * @param string $links The links shown in the plugin page.
 *
 * @return array
 */
function _orbem_game_engine_add_action_links( $links ) {
	$mylinks = array(
		'<a href="' . admin_url( 'admin.php?page=orbem-game-engine' ) . '">Options</a>',
	);

	return array_merge( $links, $mylinks );
}
