<?php
/**
 * Meta Box Template
 *
 * The template wrapper for post/page meta box.
 *
 * @package OrbemStudio
 *
 * @var boolean $orbem_studio_front_end
 * @var array   $orbem_studio_meta_data
 * @var array   $orbem_studio_values
 */
use OrbemStudio\Meta_Box;

$orbem_studio_meta_data             = is_array($orbem_studio_meta_data) ? $orbem_studio_meta_data : [];
$orbem_studio_allowed_tags          = wp_kses_allowed_html( 'post' );
$orbem_studio_allowed_tags['input'] = [
    'type'        => true,
    'name'        => true,
    'value'       => true,
    'id'          => true,
    'class'       => true,
    'checked'     => true,
    'disabled'    => true,
    'readonly'    => true,
    'placeholder' => true,
    'required'    => true,
    'data-*'      => true,
];

/**
 * Allow <select> and <option>
 */
$orbem_studio_allowed_tags['select'] = [
    'name'     => true,
    'id'       => true,
    'class'    => true,
    'multiple' => true,
    'required' => true,
    'disabled' => true,
    'data-*'   => true,
];

$orbem_studio_allowed_tags['option'] = [
    'value'    => true,
    'selected' => true,
    'disabled' => true,
    'label'    => true,
];
?>
<div id="explore-meta-box">
    <?php if (true === $orbem_studio_front_end) : ?>
        <form id="add-new-form">
            <label>
                Title<br>
            <input type="text" placeholder="Enter title" name="title" id="title" />
            </label>
        <?php echo wp_kses(Meta_Box::imageUploadHTML('Featured Image', 'featured-image', ''), $orbem_studio_allowed_tags); ?>
    <?php endif;?>
    <?php foreach($orbem_studio_meta_data as $orbem_studio_key => $orbem_studio_value):
        $orbem_studio_character_image_class = true === str_contains($orbem_studio_key, 'character-images') || true === str_contains($orbem_studio_key, 'weapon-images') ? ' character-images-wrapper' : '';
        ?>
        <hr>
        <h2><?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '], $orbem_studio_key))); ?></h2>
        <h4><?php echo esc_html($orbem_studio_value[1]); ?></h4>
        <?php if (false === is_array($orbem_studio_value[0])) : ?>
            <?php echo wp_kses(Meta_Box::getMetaHtml($orbem_studio_key, $orbem_studio_value[0], $orbem_studio_values), $orbem_studio_allowed_tags); ?>
        <?php else : ?>
            <div class="meta-box-array-wrap<?php echo esc_attr($orbem_studio_character_image_class); ?>">
            <?php foreach($orbem_studio_value[0] as $orbem_studio_sub_key => $orbem_studio_sub_value): ?>

                <?php if (false === is_array($orbem_studio_sub_value) || true === in_array($orbem_studio_sub_key, ['select', 'radio', 'repeater', 'multiselect'])) :
                    if (false === in_array($orbem_studio_sub_key, ['select', 'radio', 'repeater', 'multiselect'])) : ?>
                            <?php echo wp_kses(Meta_Box::getMetaHtml($orbem_studio_sub_key, $orbem_studio_sub_value, $orbem_studio_values, $orbem_studio_key), $orbem_studio_allowed_tags); ?>
                    <?php elseif ('repeater' !== $orbem_studio_sub_key) :?>
                        <?php echo wp_kses(Meta_Box::getMetaHtml($orbem_studio_key, $orbem_studio_sub_key, $orbem_studio_values, false, $orbem_studio_sub_value), $orbem_studio_allowed_tags); ?>
                    <?php else :?>
                        <div class="repeater-container">
                            <?php echo wp_kses(Meta_Box::getMetaHtml($orbem_studio_key, $orbem_studio_sub_key, $orbem_studio_values, false, $orbem_studio_sub_value), $orbem_studio_allowed_tags); ?>
                        </div>
                    <?php endif;
                else :
                    foreach($orbem_studio_sub_value as $orbem_studio_sub_value_key_1 => $orbem_studio_sub_value_value_1):?>
                        <?php if (false === in_array($orbem_studio_sub_value_key_1, ['select', 'radio', 'repeater', 'multiselect'])) : ?>
                            <?php echo wp_kses(Meta_Box::getMetaHtml($orbem_studio_sub_value_key_1, $orbem_studio_sub_value_value_1, $orbem_studio_values, $orbem_studio_key), $orbem_studio_allowed_tags); ?>
                        <?php elseif ('repeater' !== $orbem_studio_sub_value_key_1) : ?>
                            <?php echo wp_kses(Meta_Box::getMetaHtml($orbem_studio_sub_key, $orbem_studio_sub_value_key_1, $orbem_studio_values, $orbem_studio_key, $orbem_studio_sub_value_value_1), $orbem_studio_allowed_tags); ?>
                        <?php else :?>
                            <div class="repeater-container">
                                <?php echo wp_kses(Meta_Box::getMetaHtml($orbem_studio_sub_key, $orbem_studio_sub_value_key_1, $orbem_studio_values, $orbem_studio_key, $orbem_studio_sub_value_value_1), $orbem_studio_allowed_tags); ?>
                            </div>
                        <?php endif;
                    endforeach;
                endif; ?>
            <?php endforeach; ?>
            </div>
    <?php endif; endforeach; ?>
    <?php if (true === $orbem_studio_front_end) :?>
        <button type="submit" id="submit-new">Submit</button>
        </form>
    <?php endif;?>
</div>
