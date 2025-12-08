<?php
$final_value = false === empty($meta_values[$key]) ? $meta_values[$key] : '';
?>
<p>
<label>
    <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$sub_value))); ?>
    </br>
    <input class="repeat"
           type="radio"
           name="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>"
           id="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>"
           value="<?php echo esc_attr($sub_value); ?>"
    <?php checked( $sub_value, (false !== $main_key ? $meta_values[$main_key][$key] ?? '' : $final_value), true); ?>
    />
</label>
</p>
