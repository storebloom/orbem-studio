<?php
/**
 * multiselect field template.
 *
 * @var array  $orbem_studio_sub_value
 * @var string $orbem_studio_key
 */
?>
<div class="multiselect-wrapper">
    <?php if (true === is_array($orbem_studio_sub_value)): ?>
        <?php foreach($orbem_studio_sub_value as $orbem_studio_option): ?>
        <p>
        <label>
            <input
                type="checkbox"
                <?php checked($meta_values[$orbem_studio_key][$orbem_studio_option] ?? '', 'on'); ?>
                name="<?php echo esc_attr($orbem_studio_key . '[' . $orbem_studio_option . ']'); ?>"
                id="<?php echo esc_attr($orbem_studio_key . '[' . $orbem_studio_option . ']'); ?>"
            >
            <?php echo esc_html(ucwords(str_replace('-',' ', $orbem_studio_option))); ?>
        </label>
        </p>
    <?php endforeach; endif; ?>
</div>
