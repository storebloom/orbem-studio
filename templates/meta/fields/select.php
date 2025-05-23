<p>
<select name="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>" id="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>">
    <option value="" selected="selected">None</option>
    <?php if (true === is_array($sub_value)): ?>
        <?php foreach($sub_value as $option): ?>
            <option value="<?php echo false !== isset($option['name']) ? esc_html($option['name']) : esc_html($option); ?>" <?php selected(false === $main_key ? $meta_values[$key] ?? '' : $meta_values[$main_key][$key] ?? '', (false !== isset($option['name']) ? esc_html($option['name']) : esc_html($option)), true); ?>>
                <?php echo false !== isset($option['name']) ? esc_html($option['name']) . ' : ' : esc_html(ucfirst($option)); ?><?php echo false !== isset($option['gender']) ? esc_html($option['gender']) : '' ?>
            </option>
    <?php endforeach; endif; ?>
</select>
</p>