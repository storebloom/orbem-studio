<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Settings panel for game.
 *
 * @var int $orbem_studio_userid
 */

$orbem_studio_storage                = get_user_meta($orbem_studio_userid, 'explore_storage', true);
$orbem_studio_default_weapon         = get_option('explore_default_weapon', false);
$orbem_studio_default_weapon_obj     = false === empty($orbem_studio_default_weapon) ? get_posts(
    [
        'name'           => $orbem_studio_default_weapon,
        'posts_per_page' => 1,
        'post_type'      => 'explore-weapon',
        'no_found_rows'  => true,
        'fields'         => 'ids',
        'post_status'    => 'publish'
    ]
) : false;
$orbem_studio_default_weapon_id      = false === empty($orbem_studio_default_weapon_obj) && isset($orbem_studio_default_weapon_obj[0]) ? (int) $orbem_studio_default_weapon_obj[0] : '';
$orbem_studio_default_storage        = '' !== $orbem_studio_default_weapon_id ? ['items' => [], 'weapons' => [['name' => $orbem_studio_default_weapon, 'id' => $orbem_studio_default_weapon_id, 'type' => 'weapons']], 'gear' => []] : ['items' => [], 'weapons' => [], 'gear' => []];
$orbem_studio_storage                = false === empty($orbem_studio_storage) && true === is_array($orbem_studio_storage) ? $orbem_studio_storage : $orbem_studio_default_storage;
// Guarantee exactly the three storage buckets, each a list (defensive against
// older malformed data where one type got nested inside another).
$orbem_studio_storage                = [
    'items'   => isset($orbem_studio_storage['items'])   && is_array($orbem_studio_storage['items'])   ? $orbem_studio_storage['items']   : [],
    'weapons' => isset($orbem_studio_storage['weapons']) && is_array($orbem_studio_storage['weapons']) ? $orbem_studio_storage['weapons'] : [],
    'gear'    => isset($orbem_studio_storage['gear'])    && is_array($orbem_studio_storage['gear'])    ? $orbem_studio_storage['gear']    : [],
];
// Guarantee the default weapon is always present (rendered hidden) in the
// weapons bucket so unequipping another weapon can always fall back to it,
// even when the player's saved storage doesn't include it.
if ('' !== $orbem_studio_default_weapon_id) {
    $orbem_studio_has_default_weapon = false;
    foreach ($orbem_studio_storage['weapons'] as $orbem_studio_weapon_item) {
        if (
            is_array($orbem_studio_weapon_item)
            && (($orbem_studio_weapon_item['name'] ?? '') === $orbem_studio_default_weapon
                || intval($orbem_studio_weapon_item['id'] ?? 0) === intval($orbem_studio_default_weapon_id))
        ) {
            $orbem_studio_has_default_weapon = true;
            break;
        }
    }
    if (false === $orbem_studio_has_default_weapon) {
        array_unshift(
            $orbem_studio_storage['weapons'],
            ['name' => $orbem_studio_default_weapon, 'id' => $orbem_studio_default_weapon_id, 'type' => 'weapons']
        );
    }
}
$orbem_studio_storage_limit          = get_user_meta($orbem_studio_userid, 'storage_limit', true);
$orbem_studio_storage_limit          = false === empty($orbem_studio_storage_limit ) ? $orbem_studio_storage_limit : 11;
$orbem_studio_current_explore_gear   = get_user_meta($orbem_studio_userid, 'explore_current_gear', true) ?? [];
$orbem_studio_current_explore_weapon = get_user_meta($orbem_studio_userid, 'explore_current_weapons', true) ?? [$orbem_studio_default_weapon_id];
$orbem_studio_storage_tabs           = get_option('explore_storage_tabs', []);
$orbem_studio_storage_tabs_items     = $orbem_studio_storage_tabs['items'] ?? '';
$orbem_studio_storage_tabs_weapons   = $orbem_studio_storage_tabs['weapons'] ?? '';
$orbem_studio_storage_tabs_gear      = $orbem_studio_storage_tabs['gear'] ?? '';
?>
<?php
// Only the first available tab (and its menu) starts active.
$orbem_studio_active_tab = '';
if ('on' === $orbem_studio_storage_tabs_items) {
    $orbem_studio_active_tab = 'items';
} elseif ('on' === $orbem_studio_storage_tabs_weapons) {
    $orbem_studio_active_tab = 'weapons';
} elseif ('on' === $orbem_studio_storage_tabs_gear) {
    $orbem_studio_active_tab = 'gear';
}
?>
<div class="storage-form">
    <span class="close-settings">✕</span>
    <div class="retrieval-points">
        <div class="menu-tabs">
            <?php if (is_array($orbem_studio_storage_tabs) && true === in_array('on', $orbem_studio_storage_tabs)) : ?>
                <?php if ('on' === $orbem_studio_storage_tabs_items) :?><div class="items-tab<?php echo 'items' === $orbem_studio_active_tab ? ' engage' : ''; ?>" data-menu="items">Items</div><?php endif; ?>
                <?php if ('on' === $orbem_studio_storage_tabs_weapons) :?><div class="weapons-tab<?php echo 'weapons' === $orbem_studio_active_tab ? ' engage' : ''; ?>" data-menu="weapons">Weapons</div><?php endif; ?>
                <?php if ('on' === $orbem_studio_storage_tabs_gear) :?><div class="gear-tab<?php echo 'gear' === $orbem_studio_active_tab ? ' engage' : ''; ?>" data-menu="gear">Gear</div><?php endif; ?>
            <?php endif; ?>
        </div>
        <?php foreach($orbem_studio_storage as $orbem_studio_storage_type => $orbem_studio_storage_items):
            if (false === isset($orbem_studio_storage_tabs[$orbem_studio_storage_type]) || 'on' !== $orbem_studio_storage_tabs[$orbem_studio_storage_type]) {
                continue;
            }
            ?>
            <?php
            // The default weapon slot is rendered but hidden, so render one
            // extra empty slot per hidden default to keep the grid full.
            $orbem_studio_hidden_slots = 0;
            if ('weapons' === $orbem_studio_storage_type && false === empty($orbem_studio_default_weapon)) {
                foreach ($orbem_studio_storage_items as $orbem_studio_maybe_item) {
                    if (is_array($orbem_studio_maybe_item) && ($orbem_studio_maybe_item['name'] ?? '') === $orbem_studio_default_weapon) {
                        $orbem_studio_hidden_slots++;
                    }
                }
            }
            ?>
            <div data-menu="<?php echo esc_attr($orbem_studio_storage_type); ?>" class="storage-menu <?php echo $orbem_studio_storage_type === $orbem_studio_active_tab ? 'engage' : ''; ?>">
                <?php for ( $orbem_studio_x = 0; $orbem_studio_x <= intval($orbem_studio_storage_limit) + $orbem_studio_hidden_slots; $orbem_studio_x++ ) :
                    $orbem_studio_item = isset($orbem_studio_storage_items[$orbem_studio_x]) && is_array($orbem_studio_storage_items[$orbem_studio_x])
                        ? $orbem_studio_storage_items[$orbem_studio_x]
                        : [];
                    $orbem_studio_item_id          = false === empty($orbem_studio_item["id"]) ? (int) $orbem_studio_item["id"] : '';
                    $orbem_studio_item_exists      = get_post($orbem_studio_item_id);
                    $orbem_studio_current_gear     = false;
                    $orbem_studio_current_weapon   = $orbem_studio_default_weapon;
                    $orbem_studio_attack           = false !== $orbem_studio_item_exists ? get_post_meta($orbem_studio_item_id, 'explore-attack', true) : '';
                    $orbem_studio_is_projectile    = false !== $orbem_studio_item_exists ? get_post_meta($orbem_studio_item_id, 'explore-projectile', true) : '';
                    $orbem_studio_character        = false === empty($orbem_studio_item["character"]) ? $orbem_studio_item["character"] : '';
                    $orbem_studio_is_weapon        = false === empty($orbem_studio_item["type"]) && 'weapons' === $orbem_studio_item["type"];
                    $orbem_studio_item_visibility  = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? get_post_meta($orbem_studio_item_id, 'explore-weapon-visibility', true) : '';
                    $orbem_studio_item_visibility  = false === empty($orbem_studio_item_visibility) ? $orbem_studio_item_visibility : 'attack';
                    $orbem_studio_item_motion      = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? get_post_meta($orbem_studio_item_id, 'explore-weapon-motion', true) : '';
                    $orbem_studio_item_motion      = false === empty($orbem_studio_item_motion) ? $orbem_studio_item_motion : 'swing';
                    $orbem_studio_item_held_image  = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? \OrbemStudio\Explore::getWeaponHeldImage($orbem_studio_item_id) : '';
                    $orbem_studio_item_facing      = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? get_post_meta($orbem_studio_item_id, 'explore-weapon-facing', true) : '';
                    // Held size falls back to the weapon's placement (map)
                    // width/height when no dedicated held size is set.
                    $orbem_studio_item_held_width  = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? (get_post_meta($orbem_studio_item_id, 'explore-weapon-held-width', true) ?: get_post_meta($orbem_studio_item_id, 'explore-width', true)) : '';
                    $orbem_studio_item_held_height = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? (get_post_meta($orbem_studio_item_id, 'explore-weapon-held-height', true) ?: get_post_meta($orbem_studio_item_id, 'explore-height', true)) : '';
                    $orbem_studio_item_resting     = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? get_post_meta($orbem_studio_item_id, 'explore-weapon-resting-position', true) : '';
                    $orbem_studio_item_resting     = false === empty($orbem_studio_item_resting) ? $orbem_studio_item_resting : 'in-hand';
                    $orbem_studio_item_proj_cfg    = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? get_post_meta($orbem_studio_item_id, 'explore-weapon-projectile', true) : [];
                    $orbem_studio_item_proj_cfg    = is_array($orbem_studio_item_proj_cfg) ? $orbem_studio_item_proj_cfg : [];
                    $orbem_studio_item_proj_facing = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? get_post_meta($orbem_studio_item_id, 'explore-weapon-projectile-facing', true) : '';
                    $orbem_studio_item_ammo_cost   = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? intval(get_post_meta($orbem_studio_item_id, 'explore-weapon-ammo-cost', true)) : 0;
                    $orbem_studio_item_sound       = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? get_post_meta($orbem_studio_item_id, 'explore-weapon-sound', true) : '';
                    $orbem_studio_item_proj_image  = $orbem_studio_item_proj_cfg['image-url'] ?? '';
                    $orbem_studio_item_proj_width  = $orbem_studio_item_proj_cfg['width'] ?? '';
                    $orbem_studio_item_proj_height = $orbem_studio_item_proj_cfg['height'] ?? '';
                    $orbem_studio_item_range       = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? intval(get_post_meta($orbem_studio_item_id, 'explore-weapon-range', true)) : 0;
                    $orbem_studio_item_voffset     = $orbem_studio_is_weapon && false !== $orbem_studio_item_exists ? intval(get_post_meta($orbem_studio_item_id, 'explore-weapon-vertical-offset', true)) : 0;
                    $orbem_studio_weapons_and_gear = false === empty($orbem_studio_item["type"]) && ('gear' === $orbem_studio_item["type"] || 'weapons' === $orbem_studio_item["type"]);
                    $orbem_studio_width            = isset($orbem_studio_item['width']) ? (int) $orbem_studio_item['width'] : 50;
                    $orbem_studio_height           = isset($orbem_studio_item['height']) ? (int) $orbem_studio_item['height'] : 50;
                    ?>
                    <span
                            data-empty="<?php echo false === empty($orbem_studio_item["type"]) ? 'false' : 'true'; ?>"
                            data-type="<?php echo false === empty($orbem_studio_item["type"]) ? esc_attr($orbem_studio_item["type"]) : ''; ?>"
                            <?php if (false === empty( $orbem_studio_item["subtype"]) && false === empty($orbem_studio_current_explore_gear[$orbem_studio_item["subtype"]])):
                                if (true === is_array($orbem_studio_current_explore_gear[$orbem_studio_item["subtype"]])) {
                                    foreach ($orbem_studio_current_explore_gear[$orbem_studio_item["subtype"]] as $orbem_studio_current_array) {
                                        if (true === in_array(intval($orbem_studio_item_id), array_keys($orbem_studio_current_array), true)) {
                                            $orbem_studio_current_gear = true;
                                        }
                                    }
                                }
                                ?>
                            data-subtype="<?php echo esc_attr($orbem_studio_item["subtype"]); ?>"
                            <?php endif;

                            if (true === is_array($orbem_studio_current_explore_weapon) &&  (intval($orbem_studio_item_id) === intval($orbem_studio_current_explore_weapon[0]))) {
                                $orbem_studio_current_weapon = true;
                            }
                            ?>
                            data-id="<?php echo esc_attr($orbem_studio_item_id); ?>"
                            data-value="<?php echo false === empty($orbem_studio_item["value"]) ? esc_attr($orbem_studio_item["value"]) : ''; ?>"
                            data-width="<?php echo false === empty($orbem_studio_width) ? esc_attr($orbem_studio_width): 50; ?>"
                            data-height="<?php echo false === empty($orbem_studio_height) ? esc_attr($orbem_studio_height): 50; ?>"
                            data-character="<?php echo false === empty($orbem_studio_character) ? esc_attr($orbem_studio_character) : ''; ?>"

                            <?php if (true === $orbem_studio_weapons_and_gear) : ?>
                            data-strength=<?php echo false === empty($orbem_studio_attack) ? wp_json_encode($orbem_studio_attack) : '""'; ?>
                            data-projectile="<?php echo false === empty($orbem_studio_is_projectile) ? esc_attr($orbem_studio_is_projectile) : 'no'; ?>"
                            <?php endif; ?>
                            <?php if (true === $orbem_studio_is_weapon) : ?>
                            data-visibility="<?php echo esc_attr($orbem_studio_item_visibility); ?>"
                            data-motion="<?php echo esc_attr($orbem_studio_item_motion); ?>"
                            data-facing="<?php echo esc_attr($orbem_studio_item_facing); ?>"
                            data-resting="<?php echo esc_attr($orbem_studio_item_resting); ?>"
                            data-range="<?php echo esc_attr($orbem_studio_item_range); ?>"
                            data-vertical-offset="<?php echo esc_attr($orbem_studio_item_voffset); ?>"
                            data-held-width="<?php echo esc_attr($orbem_studio_item_held_width); ?>"
                            data-held-height="<?php echo esc_attr($orbem_studio_item_held_height); ?>"
                            data-held-image="<?php echo esc_url($orbem_studio_item_held_image); ?>"
                            data-projectile-image="<?php echo esc_url($orbem_studio_item_proj_image); ?>"
                            data-projectile-width="<?php echo esc_attr($orbem_studio_item_proj_width); ?>"
                            data-projectile-height="<?php echo esc_attr($orbem_studio_item_proj_height); ?>"
                            data-projectile-facing="<?php echo esc_attr($orbem_studio_item_proj_facing); ?>"
                            data-ammo-cost="<?php echo esc_attr($orbem_studio_item_ammo_cost); ?>"
                            data-sound="<?php echo esc_url($orbem_studio_item_sound); ?>"
                            <?php endif; ?>

                            title="<?php echo false === empty($orbem_studio_item["name"]) ? esc_attr($orbem_studio_item["name"]) : ''; ?>"
                            <?php echo false === empty($orbem_studio_item["count"]) ? 'data-count="' . esc_attr($orbem_studio_item["count"]) . '"' : ''; ?>
                            <?php
                            // The default weapon is the fallback and is kept in
                            // the DOM (for the unequip-to-default behaviour) but
                            // hidden from the weapon grid.
                            $orbem_studio_is_default_weapon = $orbem_studio_is_weapon && false === empty($orbem_studio_default_weapon) && ($orbem_studio_item["name"] ?? '') === $orbem_studio_default_weapon;
                            ?>
                            class="storage-item<?php echo $orbem_studio_current_gear || true === $orbem_studio_current_weapon ? ' equipped' : ''; ?><?php echo $orbem_studio_is_default_weapon ? ' default-weapon' : ''; ?>">
                        <?php if (true === $orbem_studio_weapons_and_gear) : ?>
                            <img alt="<?php echo esc_attr($orbem_studio_item["name"]); ?>" src="<?php echo esc_url(get_the_post_thumbnail_url($orbem_studio_item_id)); ?>" width="30px" height="30px" />
                        <?php endif; ?>
                    </span>
                <?php endfor; ?>
            </div>
        <?php endforeach; ?>
        <div id="item-description">
        </div>
    </div>
</div>
