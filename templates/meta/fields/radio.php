<?php
/**
 * @var string $orbem_studio_key
 * @var array $orbem_studio_sub_value
 * @var boolean|string $orbem_studio_main_key
 */
$orbem_studio_final_value = false === empty($orbem_studio_meta_values[$orbem_studio_key]) ? $orbem_studio_meta_values[$orbem_studio_key] : '';
?>
<?php foreach ($orbem_studio_sub_value as $orbem_studio_sub_value_value) : ?>
<p>
<label>
    <?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],$orbem_studio_sub_value_value))); ?>
    <br>
    <input class="repeat"
           type="radio"
           name="<?php echo false === $orbem_studio_main_key ? esc_attr($orbem_studio_key) : esc_attr($orbem_studio_main_key . '[' . $orbem_studio_key. ']'); ?>"
           id="<?php echo false === $orbem_studio_main_key ? esc_attr($orbem_studio_key) : esc_attr($orbem_studio_main_key . '[' . $orbem_studio_key. ']'); ?>"
           value="<?php echo esc_attr($orbem_studio_sub_value_value); ?>"
    <?php checked($orbem_studio_sub_value_value, (false !== $orbem_studio_main_key ? $orbem_studio_meta_values[$orbem_studio_main_key][$orbem_studio_key] ?? '' : $orbem_studio_final_value)); ?>
    />
</label>
</p>
<?php endforeach; ?>
