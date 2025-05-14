<p>
<label>
    <div class="field-container-wrap">
        <?php if (true === empty($meta_values[$key])) {
            $meta_values[$key] = [[
                'top' => 0,
                'left' => 0
            ]];
        }?>
            <?php foreach($meta_values[$key] as $index => $walking_point) : ?>
            <div class="field-container">
                <span class="container-index"><?php echo esc_html($index); ?></span>
                <?php foreach($walking_point as $repeat_key => $repeat_value) : ?>
                <p>
                    <?php echo ucfirst($repeat_key); ?>
                    <br>
                    <input type="<?php esc_attr($sub_value[$repeat_key]); ?>" data-index="<?php echo esc_attr($index); ?>" name="<?php echo $key . '[' . esc_attr($index) . '][' . $repeat_key . ']' ?>" id="<?php echo $key . '[' . esc_attr($index) . '][' . $repeat_key . ']' ?>" value="<?php echo intval($repeat_value); ?>">
                </p>
                <?php endforeach; ?>
                <div class="remove-field">-</div>
            </div>
            <?php endforeach; ?>
    </div>
    <div class="add-field">+</div>
</label>
</p>
