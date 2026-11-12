<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Whether a row's stock runs out, inside a shop's repeater.
 *
 * Separate from the count because "unlimited" is not a number, and encoding it
 * as one — nought meaning endless, say — makes sold out and never runs out the
 * same value.
 *
 * @var string         $orbem_studio_key
 * @var boolean|string $orbem_studio_main_key
 * @var boolean|int    $orbem_studio_repeat_index
 * @var array          $orbem_studio_meta_values
 */

$orbem_studio_final_key   = $orbem_studio_key;
$orbem_studio_final_value = $orbem_studio_meta_values[$orbem_studio_key] ?? '';

if (false !== $orbem_studio_main_key) {
    $orbem_studio_final_key = $orbem_studio_main_key . '[';

    if (false !== $orbem_studio_repeat_index) {
        $orbem_studio_final_key  .= $orbem_studio_repeat_index . '][' . $orbem_studio_key;
        $orbem_studio_final_value = $orbem_studio_meta_values[$orbem_studio_main_key][$orbem_studio_repeat_index][$orbem_studio_key] ?? '';
    } else {
        $orbem_studio_final_key  .= $orbem_studio_key;
        $orbem_studio_final_value = $orbem_studio_meta_values[$orbem_studio_main_key][$orbem_studio_key] ?? '';
    }

    $orbem_studio_final_key .= ']';
}
?>
<p>
<label>
    Stock
    <br>
    <select name="<?php echo esc_attr($orbem_studio_final_key); ?>">
        <option value="limited" <?php selected($orbem_studio_final_value, 'limited'); ?>>Limited</option>
        <option value="unlimited" <?php selected($orbem_studio_final_value, 'unlimited'); ?>>Unlimited</option>
    </select>
</label>
</p>
