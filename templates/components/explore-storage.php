<?php
/**
 * Settings panel for game.
 *
 * @var int $userid
 */

$storage                = get_user_meta($userid, 'explore_storage', true);
$default_weapon         = get_option('explore_default_weapon', false);
$default_weapon_obj     = false === empty($default_weapon) ? get_posts(
    [
        'name'           => $default_weapon,
        'posts_per_page' => 1,
        'post_type'      => 'explore-weapon',
        'no_found_rows'  => true,
        'fields'         => 'ids',
        'post_status'    => 'publish'
    ]
) : false;
$default_weapon_id      = isset($default_weapon_obj[0]) && false !== $default_weapon_obj ? $default_weapon_obj[0]->ID : '';
$default_storage        = '' !== $default_weapon_id ? ['items' => [], 'weapons' => [['name' => $default_weapon, 'id' => $default_weapon_id, 'type' => 'weapons']], 'gear' => []] : ['items' => [], 'weapons' => [], 'gear' => []];
$storage                = false === empty($storage) && true === is_array($storage) ? $storage : $default_storage;
$storage_limit          = get_user_meta($userid, 'storage_limit', true);
$storage_limit          = false === empty($storage_limit ) ? $storage_limit : 11;
$current_explore_gear   = get_user_meta($userid, 'explore_current_gear', true) ?? [];
$current_explore_weapon = get_user_meta($userid, 'explore_current_weapons', true) ?? [$default_weapon_id];
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
        <?php foreach($storage as $storage_type => $storage_items): ?>
            <div data-menu="<?php echo esc_attr($storage_type); ?>" class="storage-menu <?php echo 'items' === $storage_type ? 'engage' : ''; ?>">
                <?php for ( $x = 0; $x <= intval($storage_limit); $x++ ) :
                    $item = isset($storage_items[$x]) && is_array($storage_items[$x])
                        ? $storage_items[$x]
                        : [];
                    $item_id          = false === empty($item["id"]) ? (int) $item["id"] : '';
                    $item_exists      = get_post($item_id);
                    $current_gear     = false;
                    $current_weapon   = $default_weapon;
                    $attack           = false !== $item_exists ? get_post_meta($item_id, 'explore-attack', true) : '';
                    $is_projectile    = false !== $item_exists ? get_post_meta($item_id, 'explore-projectile', true) : '';
                    $character        = false === empty($item["character"]) ? $item["character"] : '';
                    $weapons_and_gear = false === empty($item["type"]) && ('gear' === $item["type"] || 'weapons' === $item["type"]);
                    $width            = isset($item['width']) ? (int) $item['width'] : 50;
                    $height           = isset($item['height']) ? (int) $item['height'] : 50;
                    ?>
                    <span
                            data-empty="<?php echo false === empty($item["type"]) ? 'false' : 'true'; ?>"
                            data-type="<?php echo false === empty($item["type"]) ? esc_attr($item["type"]) : ''; ?>"
                            <?php if (false === empty( $item["subtype"]) && false === empty($current_explore_gear[$item["subtype"]])):
                                if (true === is_array($current_explore_gear[$item["subtype"]])) {
                                    foreach ($current_explore_gear[$item["subtype"]] as $current_array) {
                                        if (true === in_array(intval($item_id), array_keys($current_array), true)) {
                                            $current_gear = true;
                                        }
                                    }
                                }
                                ?>
                            data-subtype="<?php echo esc_attr($item["subtype"]); ?>"
                            <?php endif;

                            if (true === is_array($current_explore_weapon) &&  (intval($item_id) === intval($current_explore_weapon[0]))) {
                                $current_weapon = true;
                            }
                            ?>
                            data-id="<?php echo esc_attr($item_id); ?>"
                            data-value="<?php echo false === empty($item["value"]) ? esc_attr($item["value"]) : ''; ?>"
                            data-width="<?php echo false === empty($width) ? esc_attr($width): 50; ?>"
                            data-height="<?php echo false === empty($height) ? esc_attr($height): 50; ?>"
                            data-character="<?php echo false === empty($character) ? esc_attr($character) : ''; ?>"

                            <?php if (true === $weapons_and_gear) : ?>
                            data-strength="<?php echo false === empty($attack) ? wp_json_encode($attack) : '""'; ?>"
                            data-projectile="<?php echo false === empty($is_projectile) ? esc_attr($is_projectile) : 'no'; ?>"
                            <?php endif; ?>

                            title="<?php echo false === empty($item["name"]) ? esc_attr($item["name"]) : ''; ?>"
                            <?php echo false === empty($item["count"]) ? 'data-count="' . esc_attr($item["count"]) . '"' : ''; ?>
                            class="storage-item<?php echo $current_gear || true === $current_weapon ? ' equipped' : ''; ?>">
                        <?php if (true === $weapons_and_gear) : ?>
                            <img alt="<?php echo esc_attr($item["name"]); ?>" src="<?php echo esc_url(get_the_post_thumbnail_url($item_id)); ?>" width="30px" height="30px" />
                        <?php endif; ?>
                    </span>
                <?php endfor; ?>
            </div>
        <?php endforeach; ?>
        <div id="item-description">
        </div>
    </div>
</div>
