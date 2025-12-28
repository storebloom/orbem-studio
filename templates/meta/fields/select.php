<?php
/**
 * @var string         $orbem_studio_key
 * @var boolean|string $orbem_studio_main_key
 * @var array          $orbem_studio_sub_value
 */

$orbem_studio_final_value = false === empty($orbem_studio_meta_values[$orbem_studio_key]) ? $orbem_studio_meta_values[$orbem_studio_key] : '';
?>
<p>
<?php if (false !== $orbem_studio_main_key): ?>
    <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$orbem_studio_key))); ?>
    <br>
<?php endif; ?>
<select name="<?php echo false === $orbem_studio_main_key ? esc_attr($orbem_studio_key) : esc_attr($orbem_studio_main_key . '[' . $orbem_studio_key. ']'); ?>" id="<?php echo false === $orbem_studio_main_key ? esc_attr($orbem_studio_key) : esc_attr($orbem_studio_main_key . '[' . $orbem_studio_key. ']'); ?>">
    <option value="" selected="selected">None</option>
    <?php if (true === is_array($orbem_studio_sub_value)): ?>
        <?php foreach($orbem_studio_sub_value as $orbem_studio_option): ?>
            <option value="<?php echo false !== isset($orbem_studio_option['name']) ? esc_html($orbem_studio_option['name']) : esc_html($orbem_studio_option); ?>" <?php selected(false === $orbem_studio_main_key ? $orbem_studio_final_value : $orbem_studio_meta_value[$orbem_studio_main_key][$orbem_studio_key] ?? '', (false !== isset($orbem_studio_option['name']) ? esc_html($orbem_studio_option['name']) : esc_html($orbem_studio_option))); ?>>
                <?php echo false !== isset($orbem_studio_option['name']) ? esc_html($orbem_studio_option['name']) . ' : ' : esc_html(ucfirst(str_replace('-', ' ', $orbem_studio_option))); ?><?php echo false !== isset($orbem_studio_option['gender']) ? esc_html($orbem_studio_option['gender']) : '' ?>
            </option>
    <?php endforeach; endif; ?>
</select>
</p>