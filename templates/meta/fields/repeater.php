<?php
/**
 * @var string $key
 * @var boolean|array $sub_value
 * @var array $meta_values
 */

use OrbemStudio\Meta_Box;

$repeat_index = 0;
$final_value = false === empty($meta_values[$key]) ? $meta_values[$key] : [1];
$sub_value = true === is_array($sub_value) ? $sub_value : [];
?>
<p>
<label>
    <div class="field-container-wrap">
        <?php for ($i = 0; $i < count($final_value); $i++) : ?>
            <div class="field-container">
                <span class="container-index"><?php echo esc_html($repeat_index); ?></span>
                <?php foreach($sub_value as $repeater_key => $repeater_type) : ?>
                    <p>
                        <?php echo Meta_Box::getMetaHtml($repeater_key, $repeater_type, $meta_values, $key, false, $repeat_index); ?>
                    </p>
                <?php endforeach; ?>
                <div class="remove-field">-</div>
            </div>
        <?php $repeat_index++; endfor; ?>
    </div>
    <div class="add-field">+</div>
</label>
</p>
