<?php
/**
 * Meta Box Template
 *
 * The template wrapper for post/page meta box.
 *
 * @package OrbemStudio
 *
 * @var boolean $front_end
 * @var array   $meta_data
 * @var array   $values
 */
use OrbemStudio\Meta_Box;
?>
<div id="explore-meta-box">
    <?php if (true === $front_end) : ?>
        <form id="add-new-form">
            <label>
                Title<br>
            <input type="text" placeholder="Enter title" name="title" id="title" />
            </label>
        <?php echo Meta_Box::imageUploadHTML('Featured Image', 'featured-image', ''); ?>
    <?php endif;?>
    <?php foreach($meta_data as $key => $value):
        $character_image_class = true === str_contains($key, 'character-images') || true === str_contains($key, 'weapon-images') ? ' character-images-wrapper' : '';
        ?>
        <hr>
        <h2><?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '], $key))); ?></h2>
        <h4><?php echo esc_html($value[1]); ?></h4>
        <?php if (false === is_array($value[0])) : ?>
            <?php echo Meta_Box::getMetaHtml($key, $value[0], $values); ?>
        <?php else : ?>
            <div class="meta-box-array-wrap<?php echo esc_attr($character_image_class); ?>">
            <?php foreach($value[0] as $sub_key => $sub_value): ?>

                <?php if (false === is_array($sub_value) || true === in_array($sub_key, ['select', 'radio', 'repeater', 'multiselect'])) :
                    if (false === in_array($sub_key, ['select', 'radio', 'repeater', 'multiselect'])) : ?>
                            <?php echo Meta_Box::getMetaHtml($sub_key, $sub_value, $values, $key); ?>
                    <?php elseif ('repeater' !== $sub_key) :?>
                        <?php echo Meta_Box::getMetaHtml($key, $sub_key, $values, false, $sub_value); ?>
                    <?php else :?>
                        <div class="repeater-container">
                            <?php echo Meta_Box::getMetaHtml($key, $sub_key, $values, false, $sub_value); ?>
                        </div>
                    <?php endif;
                else :
                    foreach($sub_value as $sub_value_key_1 => $sub_value_value_1):?>
                        <?php if (false === in_array($sub_value_key_1, ['select', 'radio', 'repeater', 'multiselect'])) : ?>
                            <?php echo Meta_Box::getMetaHtml($sub_value_key_1, $sub_value_value_1, $values, $key); ?>
                        <?php elseif ('repeater' !== $sub_value_key_1) : ?>
                            <?php echo Meta_Box::getMetaHtml($sub_key, $sub_value_key_1, $values, $key, $sub_value_value_1); ?>
                        <?php else :?>
                            <div class="repeater-container">
                                <?php echo Meta_Box::getMetaHtml($sub_key, $sub_value_key_1, $values, $key, $sub_value_value_1); ?>
                            </div>
                        <?php endif;
                    endforeach;
                endif; ?>
            <?php endforeach; ?>
            </div>
    <?php endif; endforeach; ?>
    <?php if (true === $front_end) :?>
        <button type="submit" id="submit-new">Submit</button>
        </form>
    <?php endif;?>
</div>
