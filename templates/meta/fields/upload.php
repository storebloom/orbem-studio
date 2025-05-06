<?php
use OrbemGameEngine\Explore;

echo Explore::imageUploadHTML(esc_html(ucfirst(str_replace(['-'],[' '],$key))), $key, (false === $main_key ? $meta_values[$key] ?? '' : $meta_values[$main_key][$main_key][$key] ?? ''));
