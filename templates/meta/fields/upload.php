<?php
use OrbemStudio\Explore;

echo Explore::imageUploadHTML(esc_html(ucfirst(str_replace(['-'],[' '],$key))), (false === $main_key ? $key ?? '' : $main_key . '[' . $key . ']'), (false === $main_key ? $meta_values[$key] ?? '' : $meta_values[$main_key][$key] ?? ''));
