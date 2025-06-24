<?php /**
* Finder list for dev mode.
 */
?>
<div class="open-close-item-list">open/close item list ></div>
<div class="explore-item-list">
    <?php $class_end = '-map-item';
    foreach($post_types as $post_type) : $item_available = true; ?>
    <div class="explore-list-group"><?php foreach($item_list as $explore_item) :
            if ( $post_type === $explore_item->post_type ) :
                if ( true === $item_available) : ?>
                    <h3 class="item-post-type"><?php echo esc_html(ucwords(str_replace('-', ' ', $post_type))); ?></h3>
               <?php $item_available = false; endif;
        switch ($explore_item->post_type) {
            case 'explore-explainer':
                $class_end = '-explainer-item';
                break;
            case 'explore-cutscene':
                $class_end = '-map-cutscene';
                break;
            default:
                $class_end = '-map-item';
        }
        $class = $explore_item->post_name . $class_end;
        $meta = false !== stripos($explore_item->ID, 't') ? 'data-meta=' . $explore_item->post_type . '' : '';
        ?>
        <p class="find-explore-item" <?php echo esc_attr($meta); ?> id="<?php echo esc_html($explore_item->ID); ?>-f" data-class="<?php echo esc_attr($class); ?>" data-posttype="<?php echo esc_attr($explore_item->post_type); ?>">
                            <span class="find-title">
                                <?php echo esc_html(ucfirst(str_replace(['-', 'explore '], [' ', ''], $explore_item->post_name))); ?>
                                <small><em><strong> | <?php echo esc_html(ucfirst(str_replace(['explore-', 'point'], ['', 'item'], $explore_item->post_type))); ?></strong></em></small>
                            </span>
            <span class="edit-item-button"> | size ✎</span> | <span class="show-hide-item show">👁</span>
            <br/>
            <a href="<?php echo esc_url(admin_url() . 'post.php?post=' . $explore_item->ID . '&action=edit'); ?>" />edit item</a>
            <span class="close-item-button" style="display: none;">X</span>
        </p>
        <?php endif; endforeach;?></div>
   <?php endforeach;
    ?>
</div>