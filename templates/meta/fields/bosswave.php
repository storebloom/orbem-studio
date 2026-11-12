<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Which attack one step of a boss's wave sequence is, inside its repeater.
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

$orbem_studio_boss_waves = [
    'projectile' => 'Projectile',
    'pulse-wave' => 'Pulse Wave',
    'rush'       => 'Rush',
    'auto-shoot' => 'Auto Shoot',
];
?>
<p>
<label>
    Wave
    <br>
    <select name="<?php echo esc_attr($orbem_studio_final_key); ?>">
        <?php foreach ($orbem_studio_boss_waves as $orbem_studio_wave_value => $orbem_studio_wave_label) : ?>
            <option value="<?php echo esc_attr($orbem_studio_wave_value); ?>" <?php selected($orbem_studio_final_value, $orbem_studio_wave_value); ?>><?php echo esc_html($orbem_studio_wave_label); ?></option>
        <?php endforeach; ?>
    </select>
</label>
</p>
