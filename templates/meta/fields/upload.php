<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

use OrbemStudio\Meta_Box;

/**
 * @var string         $orbem_studio_key
 * @var boolean|string $orbem_studio_main_key
 * @var boolean|int    $orbem_studio_repeat_index
 * @var array          $orbem_studio_meta_values
 */

$orbem_studio_final_value = false === empty( $orbem_studio_meta_values[ $orbem_studio_key ] ) ? $orbem_studio_meta_values[ $orbem_studio_key ] : '';

// Start with the simple case.
$orbem_studio_final_key = $orbem_studio_key;

// If there's a main key, build on it.
if ( false !== $orbem_studio_main_key ) {
	$orbem_studio_final_key   = $orbem_studio_main_key . '[';
	$orbem_studio_final_value = $orbem_studio_meta_values[ $orbem_studio_main_key ][ $orbem_studio_key ] ?? '';

	if ( false !== $orbem_studio_repeat_index ) {
		// main[repeat][key]
		$orbem_studio_final_key  .= $orbem_studio_repeat_index . '][' . $orbem_studio_key;
		$orbem_studio_final_value = $orbem_studio_meta_values[ $orbem_studio_main_key ][ $orbem_studio_repeat_index ][ $orbem_studio_key ] ?? '';
	} else {
		// main[key]
		$orbem_studio_final_key .= $orbem_studio_key;
	}

	$orbem_studio_final_key .= ']';
}

$orbem_studio_allowed_tags          = wp_kses_allowed_html( 'post' );
$orbem_studio_allowed_tags['input'] = array(
	'type'        => true,
	'name'        => true,
	'value'       => true,
	'id'          => true,
	'class'       => true,
	'checked'     => true,
	'disabled'    => true,
	'readonly'    => true,
	'placeholder' => true,
	'required'    => true,
	'data-*'      => true,
);

echo wp_kses( Meta_Box::imageUploadHTML( false !== $orbem_studio_main_key ? esc_html( ucfirst( str_replace( array( 'explore-', '-' ), array( '', ' ' ), $orbem_studio_key ) ) ) : '', $orbem_studio_final_key, $orbem_studio_final_value ), $orbem_studio_allowed_tags );
