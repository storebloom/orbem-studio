<?php
/**
 * @var string $key
 * @var array $sub_value
 * @var boolean|string $main_key
 */
$final_value = false === empty($meta_values[$key]) ? $meta_values[$key] : '';
?>
<?php foreach ($sub_value as $sub_value_value) : ?>
<p>
<label>
    <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$sub_value_value))); ?>
    <br>
    <input class="repeat"
           type="radio"
           name="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>"
           id="<?php echo false === $main_key ? esc_attr($key) : esc_attr($main_key . '[' . $key. ']'); ?>"
           value="<?php echo esc_attr($sub_value_value); ?>"
    <?php checked( $sub_value_value, (false !== $main_key ? $meta_values[$main_key][$key] ?? '' : $final_value)); ?>
    />
</label>
</p>
<?php endforeach; ?>
