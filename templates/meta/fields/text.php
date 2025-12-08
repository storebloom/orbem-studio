<?php
$final_value = false === empty($meta_values[$key]) ? $meta_values[$key] : '';
?>
<p>
<label>
    <?php if (false !== $main_key): ?>
        <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$key))); ?>
        </br>
    <?php endif; ?>
<input class="top"
       type="text"
       name="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>"
       id="<?php echo esc_attr($key); ?>"
       value="<?php echo false === $main_key ? esc_html($final_value) : esc_html($meta_values[$main_key][$key] ?? ''); ?>"
/>
</label>
</p>
