<?php
use OrbemStudio\Meta_Box;

/**
 * @var string         $key
 * @var boolean|string $main_key
 * @var boolean|int    $repeat_index
 * @var array          $meta_values
 */

$final_value = false === empty($meta_values[$key]) ? $meta_values[$key] : '';

// Start with the simple case.
$final_key = $key;

// If there's a main key, build on it.
if (false !== $main_key) {
    $final_key = $main_key . '[';
    $final_value = $meta_values[$main_key][$key] ?? '';

    if (false !== $repeat_index) {
        // main[repeat][key]
        $final_key .= $repeat_index . '][' . $key;
        $final_value = $meta_values[$main_key][$repeat_index][$key] ?? '';
    } else {
        // main[key]
        $final_key .= $key;
    }

    $final_key .= ']';
}

echo Meta_Box::imageUploadHTML(false !== $main_key ? esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$key))) : '', $final_key, $final_value);
