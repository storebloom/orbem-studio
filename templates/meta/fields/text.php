<p>
<label>
    <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],\OrbemStudio\Meta_Box::getMetaboxLabel($key)))); ?>
    </br>
<input class="top"
       type="text"
       name="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>"
       id="<?php echo esc_attr($key); ?>"
       value="<?php echo false === $main_key ? esc_html($meta_values[$key] ?? '') : esc_html($meta_values[$main_key][$key] ?? ''); ?>"
/>
</label>
</p>
