<?php
/**
 * @var string         $key
 * @var boolean|string $main_key
 * @var array          $sub_value
 */

$final_value = false === empty($meta_values[$key]) ? $meta_values[$key] : '';
?>
<p>
<?php if (false !== $main_key): ?>
    <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$key))); ?>
    <br>
<?php endif; ?>
<select name="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>" id="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>">
    <option value="" selected="selected">None</option>
    <?php if (true === is_array($sub_value)): ?>
        <?php foreach($sub_value as $option): ?>
            <option value="<?php echo false !== isset($option['name']) ? esc_html($option['name']) : esc_html($option); ?>" <?php selected(false === $main_key ? $final_value : $meta_values[$main_key][$key] ?? '', (false !== isset($option['name']) ? esc_html($option['name']) : esc_html($option))); ?>>
                <?php echo false !== isset($option['name']) ? esc_html($option['name']) . ' : ' : esc_html(ucfirst(str_replace('-', ' ', $option))); ?><?php echo false !== isset($option['gender']) ? esc_html($option['gender']) : '' ?>
            </option>
    <?php endforeach; endif; ?>
</select>
</p>