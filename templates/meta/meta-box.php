<?php
/**
 * Meta Box Template
 *
 * The template wrapper for post/page meta box.
 *
 * @package ShareThisShareButtons
 */
use OrbemGameEngine\Meta_Box;
use OrbemGameEngine\Explore;
?>
<div id="explore-meta-box">
    <?php if (true === $front_end) : ?>
        <form id="add-new-form">
            <label>
                Title<br>
            <input type="text" placeholder="Enter title" name="title" id="title" />
            </label>
        <?php echo Explore::imageUploadHTML('Featured Image', 'featured-image', ''); ?>
    <?php endif;?>
    <?php foreach($meta_data as $key => $value): ?>
        <?php if (false === is_array($value)) : ?>
            <?php echo Meta_Box::getMetaHtml($key, $value, $values); ?>
        <?php else : ?>
            <h2><?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],\OrbemGameEngine\Meta_Box::getMetaboxLabel($key)))); ?></h2>
            <?php foreach($value as $sub_key => $sub_value):
                if (false === is_array($sub_value) || true === in_array($sub_key, ['select', 'radio', 'repeater', 'multiselect'])) :
                    if (false === in_array($sub_key, ['select', 'radio', 'repeater', 'multiselect'])) : ?>
                        <?php echo Meta_Box::getMetaHtml($sub_key, $sub_value, $values, $key); ?>
                    <?php elseif ('repeater' !== $sub_key) :?>
                        <?php foreach($sub_value as $sub_value_key => $sub_value_value): ?>
                            <?php echo Meta_Box::getMetaHtml($key, $sub_key, $values, false, $sub_value_value); ?>
                        <?php endforeach; ?>
                    <?php else :?>
                        <div class="repeater-container">
                            <?php echo Meta_Box::getMetaHtml($key, $sub_key, $values, false, $sub_value); ?>
                        </div>
                    <?php endif;
                else :
                    foreach($sub_value as $sub_value_key_1 => $sub_value_value_1):?>
                        <h2><?php echo esc_html(ucfirst(str_replace(['explore-', '-'],['', ' '],\OrbemGameEngine\Meta_Box::getMetaboxLabel($sub_key)))); ?></h2>
                        <?php if (false === in_array($sub_value_key_1, ['select', 'radio', 'repeater', 'multiselect'])) : ?>
                            <?php echo Meta_Box::getMetaHtml($sub_value_key_1, $sub_value_value_1, $values, $key); ?>
                        <?php elseif ('repeater' !== $sub_value_key_1) :?>

                            <?php foreach($sub_value_value_1 as $sub_value_key_key => $sub_value_value_value): ?>
                                <?php echo Meta_Box::getMetaHtml($sub_key, $sub_value_key_1, $values, $key, $sub_value_value_value); ?>
                            <?php endforeach; ?>

                        <?php else :?>
                            <div class="repeater-container">
                                <?php echo Meta_Box::getMetaHtml($sub_key, $sub_value_key_1, $values, $key, $sub_value_value_1); ?>
                            </div>
                        <?php endif;
                    endforeach;
                endif; ?>
            <?php endforeach; ?>
    <?php endif; endforeach; ?>
    <?php if (true === $front_end) :?>
        <button type="submit" id="submit-new">Submit</button>
        </form>
    <?php endif;?>
</div>
