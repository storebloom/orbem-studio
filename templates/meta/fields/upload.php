<?php
use OrbemStudio\Meta_Box;

$final_value = false === empty($meta_values[$key]) ? $meta_values[$key] : '';

echo Meta_Box::imageUploadHTML(false !== $main_key ? esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$key))) : '', (false === $main_key ? $key ?? '' : $main_key . '[' . $key . ']'), (false === $main_key ? $final_value : $meta_values[$main_key][$key] ?? ''));
