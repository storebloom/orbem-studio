<?php
/**
 * Settings panel for game.
 */
$storage = get_user_meta($userid, 'explore_storage', true);
$storage = false === empty($storage) ? $storage : ['items' => [], 'weapons' => [['name' => 'fist', 'id' => '1641', 'type' => 'weapons', 'character' => '']], 'gear' => []];
$characters = get_user_meta($userid, 'explore_characters', true);

// Get character weapons.
$characters = get_posts(['post_type' => 'explore-character', 'posts_per_page' => 1000]);

if ( false === is_wp_error($characters)) {
    foreach ($characters as $character) {
        $weapon_choice = get_post_meta($character->ID, 'explore-weapon-choice');

        if (false === is_wp_error($weapon_choice) && false === in_array($storage['weapons'], [$weapon_choice[0]->slug])) {
            $weapon_id = get_posts(['post_type' => 'explore-weapon', 'post_name' => $weapon_choice[0]->slug, 'posts_per_page' => 1]);

            if (false === empty($weapon_id[0])) {
                $storage['weapons'][] = ['name' => $weapon_choice, 'id' => $weapon_id[0]->ID, 'type' => 'weapons', 'character' => $character->post_name];
            }
        }
    }
}

$storage_limit = get_user_meta($userid, 'storage_limit', true);
$storage_limit = false === empty($storage_limit ) ? $storage_limit : 11;
$current_explore_gear = get_user_meta($userid, 'explore_current_gear', true) ?? [];
$current_explore_weapon = get_user_meta($userid, 'explore_current_weapons', true) ?? [];
?>
<div class="storage-form">
    <span class="close-settings">X</span>
    <h2>Retrieval Points</h2>
    <div class="retrieval-points">
        <div class="menu-tabs">
            <div class="items-tab engage">Items</div>
            <div class="weapons-tab">Weapons</div>
            <div class="gear-tab">Gear</div>
        </div>
        <?php foreach($storage as $storage_type => $storage_items):?>
            <div data-menu="<?php echo esc_attr($storage_type); ?>" class="storage-menu <?php echo 'items' === $storage_type ? 'engage' : ''; ?>">
                <?php for ( $x = 0; $x <= intval($storage_limit); $x++ ) :
                    $item_id = false === empty($storage_items[$x]["id"]) ? esc_attr($storage_items[$x]["id"]) : '';
                    $current_gear = false;
                    $current_weapon = 'fist';
                    $width = get_post_meta($item_id, 'explore-width', true);
                    $height = get_post_meta($item_id, 'explore-height', true);
                    $attack = get_post_meta($item_id, 'explore-attack', true);
                    $is_projectile = get_post_meta($item_id, 'explore-projectile', true);
                    $character = false === empty($storage_items[$x]["character"]) ? $storage_items[$x]["character"] : '';
                    $weapons_and_gear = false === empty($storage_items[$x]["type"]) && ('gear' === $storage_items[$x]["type"] || 'weapons' === $storage_items[$x]["type"]);
                    ?>
                    <span
                            data-empty="<?php echo false === empty( $storage_items[$x]["type"] ) ? 'false' : 'true'; ?>"
                            data-type="<?php echo false === empty( $storage_items[$x]["type"] ) ? esc_attr($storage_items[$x]["type"]) : ''; ?>"
                            <?php if (false === empty( $storage_items[$x]["subtype"]) && false === empty($current_explore_gear[$storage_items[$x]["subtype"]])):
                                if (true === is_array($current_explore_gear[$storage_items[$x]["subtype"]])) {
                                    foreach ($current_explore_gear[$storage_items[$x]["subtype"]] as $current_array) {
                                        if (true === in_array(intval($item_id), array_keys($current_array), true)) {
                                            $current_gear = true;
                                        }
                                    }
                                }
                                ?>
                            data-subtype="<?php echo esc_attr($storage_items[$x]["subtype"]); ?>"
                            <?php endif;

                            if (true === is_array($current_explore_weapon) &&  (intval($item_id) === intval($current_explore_weapon[0]))) {
                                $current_weapon = true;
                            }
                            ?>
                            data-id="<?php echo esc_attr($item_id); ?>"
                            data-value="<?php echo false === empty($storage_items[$x]["value"]) ? esc_attr($storage_items[$x]["value"]) : ''; ?>"
                            data-width="<?php echo false === empty($width) ? $width: 50; ?>"
                            data-height="<?php echo false === empty($height) ? $height: 50; ?>"
                            data-character="<?php echo false === empty($character) ? $character : ''; ?>"

                            <?php if (true === $weapons_and_gear) : ?>
                            data-strength=<?php echo false === empty($attack) ? wp_json_encode($attack['explore-attack']) : '""'; ?>
                            data-projectile="<?php echo false === empty($is_projectile) ? esc_attr($is_projectile) : 'no'; ?>"
                            <?php endif; ?>

                            title="<?php echo false === empty($storage_items[$x]["name"]) ? esc_attr($storage_items[$x]["name"]) : ''; ?>"
                            <?php echo false === empty($storage_items[$x]["count"]) ? 'data-count="' . intval($storage_items[$x]["count"]) . '"' : ''; ?>
                            class="storage-item<?php echo $current_gear || $current_weapon ? ' equipped' : ''; ?>">
                        <?php if (true === $weapons_and_gear) : ?>
                            <img src="<?php echo esc_url(get_the_post_thumbnail_url($item_id)); ?>" width="30px" height="30px" />
                        <?php endif; ?>
                    </span>
                <?php endfor; ?>
            </div>
        <?php endforeach; ?>
        <div id="item-description">
        </div>
    </div>
</div>