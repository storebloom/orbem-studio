<?php
/**
 * Characters panel for game.
 */

$post_types = get_post_types();
?>

<div class="add-new-form">
    <span class="close-settings">X</span>
    <h2>God Mode / No Touch</h2>
    <lable>
        God Mode
        <input type="checkbox" id="god-mode" />
    </lable>
    <br>
    <label>
        No Touch
        <input type="checkbox" id="no-touch" />
    </label>
    <br>
    <label>
        Show Collision Map
        <input type="checkbox" id="show-collision-map" />
    </label>
    <h2>Add New</h2>
    <ul id="add-new-list">
        <?php foreach($post_types as $post_type):
            if ( false !== stripos($post_type, 'explore')) :
            ?>
        <li data-type="<?php echo esc_attr($post_type); ?>"><?php echo esc_html(ucfirst(str_replace(['sign', 'explore-', 'point', '-'], ['focus view', '', 'item', ' '], $post_type))); ?></li>
        <?php endif; endforeach; ?>
    </ul>
    <div class="add-new-fields">

    </div>
</div>