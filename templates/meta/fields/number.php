<p>
<label>
    <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '], \OrbemStudio\Meta_Box::getMetaboxLabel($key)))); ?>
</br>
<input class="top"
       type="number"
       step="0.01"
       name="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>"
       id="<?php echo esc_attr($key); ?>"
       value="<?php echo floatval(false !== $main_key ? ($meta_values[$main_key][$key] ?? 0) : ($meta_values[$key] ?? 0)); ?>"
/>
</label>
</p>
