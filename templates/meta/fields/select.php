<p>
<select name="<?php echo esc_attr($key); ?>" id="<?php echo esc_attr($key); ?>">
    <?php if (true === is_array($sub_value)): ?>
        <?php foreach($sub_value as $option): ?>
            <option value="<?php echo false !== isset($option['name']) ? esc_html($option['name']) : esc_html($option); ?>" <?php selected($meta_values[$key] ?? '', (false !== isset($option['name']) ? esc_html($option['name']) : esc_html($option)), true); ?>>
                <?php echo false !== isset($option['name']) ? esc_html($option['name']) . ' : ' : esc_html(ucfirst($option)); ?><?php echo false !== isset($option['gender']) ? esc_html($option['gender']) : '' ?>
            </option>
    <?php endforeach; endif; ?>
</select>
</p>