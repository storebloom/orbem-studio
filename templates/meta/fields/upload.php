<?php
if ( ! defined( 'ABSPATH' ) ) exit;

use OrbemStudio\Meta_Box;

/**
 * @var string         $orbem_studio_key
 * @var boolean|string $orbem_studio_main_key
 * @var boolean|int    $orbem_studio_repeat_index
 * @var array          $orbem_studio_meta_values
 * @var boolean        $orbem_studio_required
 */

$orbem_studio_key_no_required = str_replace('-required', '', $orbem_studio_key);
$orbem_studio_final_value = false === empty($orbem_studio_meta_values[$orbem_studio_key_no_required]) ? $orbem_studio_meta_values[$orbem_studio_key_no_required] : '';

// Start with the simple case.
$orbem_studio_final_key = $orbem_studio_key_no_required;

// If there's a main key, build on it.
if (false !== $orbem_studio_main_key) {
    $orbem_studio_final_key = $orbem_studio_main_key . '[';
    $orbem_studio_final_value = $orbem_studio_meta_values[$orbem_studio_main_key][$orbem_studio_key_no_required] ?? '';

    if (false !== $orbem_studio_repeat_index) {
        // main[repeat][key]
        $orbem_studio_final_key .= $orbem_studio_repeat_index . '][' . $orbem_studio_key_no_required;
        $orbem_studio_final_value = $orbem_studio_meta_values[$orbem_studio_main_key][$orbem_studio_repeat_index][$orbem_studio_key_no_required] ?? '';
    } else {
        // main[key]
        $orbem_studio_final_key .= $orbem_studio_key_no_required;
    }

    $orbem_studio_final_key .= ']';
}

$orbem_studio_allowed_tags          = wp_kses_allowed_html('post');
$orbem_studio_allowed_tags['input'] = [
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
];

$orbem_studio_name = false !== $orbem_studio_main_key ? esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '], $orbem_studio_key))) : '';

echo wp_kses(Meta_Box::imageUploadHTML($orbem_studio_name, $orbem_studio_final_key, $orbem_studio_final_value, $orbem_studio_required), $orbem_studio_allowed_tags);
