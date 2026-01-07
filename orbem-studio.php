<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Plugin Name: Orbem Studio
 * Plugin URI: https://orbem.studio/
 * Description: Build your own RPG video game using the power of WordPress
 * Version: 1.0.0
 * Author: orbemorder
 * Author URI: https://orbemorder.com/
 * Text Domain: orbem-studio
 * Domain Path: /languages
 * License: GPL v2 or later
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
const ORBEM_STUDIO_VERSION = '1.0.0';

if (version_compare(phpversion(), '8.1.0', '>=')) {
	require_once __DIR__ . '/instance.php';
} else {
	if (defined('WP_CLI' ) ) {
		WP_CLI::warning(orbem_studio_php_version_text());
	} else {
		add_action('admin_notices', 'orbem_studio_php_version_error');
	}
}

/**
 * Admin notice for incompatible versions of PHP.
 */
function orbem_studio_php_version_error(): void
{
	printf( '<div class="error"><p>%s</p></div>', esc_html(orbem_studio_php_version_text()));
}

/**
 * String describing the minimum PHP version.
 *
 * @return string
 */
function orbem_studio_php_version_text(): string
{
	return __(
		'Orbem Game Engine plugin error: Your version of PHP is too old to run this plugin. You must be running PHP 8.1 or higher.',
		'orbem-studio'
	);
}

add_filter('plugin_action_links_' . plugin_basename(__FILE__), 'orbem_studio_add_action_links');

/**
 * Add a link to the settings page.
 *
 * @param array $links The links shown in the plugin page.
 *
 * @return array
 */
function orbem_studio_add_action_links(array $links): array
{
	$mylinks = ['<a href="' . admin_url('admin.php?page=orbem-studio') . '">Options</a>'];

	return array_merge($links, $mylinks);
}
