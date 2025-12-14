<?php
/**
 * @var string         $key
 * @var boolean|string $main_key
 * @var boolean|int    $repeat_index
 */
$final_value = $meta_values[$key] ?? '';
// Start with the simple case.
$final_key = $key;

// If there's a main key, build on it.
if (false !== $main_key) {
    $final_key = $main_key . '[';
    $final_value = $meta_values[$main_key][$key] ?? '';

    if (false !== $repeat_index) {
        // main[repeat][key]
        $final_key .= $repeat_index . '][' . $key;
        $final_value = $meta_values[$main_key][$repeat_index][$key] ?? '';
    } else {
        // main[key]
        $final_key .= $key;
    }

    $final_key .= ']';
}
?>
<p>
<label>
    <?php if (false !== $main_key): ?>
        <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$key))); ?>
        <br>
    <?php endif; ?>
<input class="top"
       type="number"
       step="0.01"
       name="<?php echo esc_attr($final_key); ?>"
       id="<?php echo esc_attr($key); ?>"
       value="<?php echo floatval($final_value); ?>"
/>
</label>
</p>
