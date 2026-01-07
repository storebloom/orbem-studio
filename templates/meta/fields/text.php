<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * @var string         $orbem_studio_key
 * @var boolean|string $orbem_studio_main_key
 * @var boolean|int    $orbem_studio_repeat_index
 */

$orbem_studio_final_value = false === empty($orbem_studio_meta_values[$orbem_studio_key]) ? $orbem_studio_meta_values[$orbem_studio_key] : '';

// Start with the simple case.
$orbem_studio_final_key = $orbem_studio_key;

// If there's a main key, build on it.
if (false !== $orbem_studio_main_key) {
    $orbem_studio_final_key = $orbem_studio_main_key . '[';
    $orbem_studio_final_value = $meta_values[$orbem_studio_main_key][$orbem_studio_key] ?? '';

    if (false !== $orbem_studio_repeat_index) {
        $orbem_studio_final_key .= $orbem_studio_repeat_index . '][' . $orbem_studio_key;
        $orbem_studio_final_value = $meta_values[$orbem_studio_main_key][$orbem_studio_repeat_index][$orbem_studio_key] ?? '';
    } else {
        $orbem_studio_final_key .= $orbem_studio_key;
    }

    $orbem_studio_final_key .= ']';
}
?>
<p>
<label>
    <?php if (false !== $orbem_studio_main_key): ?>
        <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$orbem_studio_key))); ?>
        <br>
    <?php endif; ?>
<input class="top"
       type="text"
       name="<?php echo esc_attr($orbem_studio_final_key); ?>"
       id="<?php echo esc_attr($orbem_studio_key); ?>"
       value="<?php echo false === $orbem_studio_main_key ? esc_html($orbem_studio_final_value) : esc_html($orbem_studio_meta_values[$orbem_studio_main_key][$orbem_studio_key] ?? ''); ?>"
/>
</label>
</p>
