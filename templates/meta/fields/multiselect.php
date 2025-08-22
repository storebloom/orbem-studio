<?php
/**
 * multiselect field template.
 */
?>
<div class="multiselect-wrapper">
    <?php if (true === is_array($sub_value)): ?>
        <?php foreach($sub_value as $option): ?>
        <p>
        <label>
            <input
                type="checkbox"
                <?php checked($meta_values[$key][$option] ?? '', 'on', true); ?>
                name="<?php echo esc_attr($key . '[' . $option . ']'); ?>"
                id="<?php echo esc_attr($key . '[' . $option . ']'); ?>"
            >
            <?php echo ucwords(str_replace('-',' ', $option)); ?>
        </label>
        </p>
    <?php endforeach; endif; ?>
</div>
