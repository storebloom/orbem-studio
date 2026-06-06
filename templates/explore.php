<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * Template Name: Explore
 * Register form template.
 */

use OrbemStudio\Explore;
use OrbemStudio\Dev_Mode;

$orbem_studio_first_area = get_option('explore_first_area', false);

if (false === $orbem_studio_first_area && is_user_logged_in()) {
    echo '<h1>A first area selection is required to play a game. Select one <strong><a href="/wp-admin/admin.php?page=orbem-studio">here</a></strong></h1>';
    return;
}

if (false === $orbem_studio_first_area && !is_user_logged_in()) {
    echo '<h1>This Orbem Studio game is coming soon! Build your game at <strong><a href="https://orbem.studio/">Orbem.Studio</a></strong> today!</h1>';
    return;
}

$orbem_studio_allowed_tags = wp_kses_allowed_html('post');

$orbem_studio_allowed_tags['svg'] = [
    'class'           => true,
    'aria-hidden'     => true,
    'aria-labelledby' => true,
    'role'            => true,
    'xmlns'           => true,
    'width'           => true,
    'height'          => true,
    'viewbox'         => true,
    'fill'            => true,
];

$orbem_studio_allowed_tags['defs'] = [];
$orbem_studio_allowed_tags['g'] = [
    'class'        => true,
    'id'           => true,
    'fill'         => true,
    'stroke'       => true,
    'stroke-width' => true,
    'transform'    => true,
    'opacity'      => true,
];

$orbem_studio_allowed_tags['path'] = [
    'class'        => true,
    'd'            => true,
    'fill'         => true,
    'stroke'       => true,
    'stroke-width' => true,
    'opacity'      => true,
];

$orbem_studio_allowed_tags['ellipse'] = [
    'class'        => true,
    'cx'           => true,
    'cy'           => true,
    'rx'           => true,
    'ry'           => true,
    'fill'         => true,
    'stroke'       => true,
    'stroke-width' => true,
    'opacity'      => true,
];

$orbem_studio_allowed_tags['circle'] = [
    'class'        => true,
    'cx'           => true,
    'cy'           => true,
    'r'            => true,
    'fill'         => true,
    'stroke'       => true,
    'stroke-width' => true,
    'opacity'      => true,
];

$orbem_studio_allowed_tags['rect'] = [
    'class'        => true,
    'x'            => true,
    'y'            => true,
    'width'        => true,
    'height'       => true,
    'rx'           => true,
    'ry'           => true,
    'fill'         => true,
    'stroke'       => true,
    'stroke-width' => true,
    'opacity'      => true,
];

$orbem_studio_allowed_tags['line'] = [
    'x1'           => true,
    'y1'           => true,
    'x2'           => true,
    'y2'           => true,
    'stroke'       => true,
    'stroke-width' => true,
];

$orbem_studio_allowed_tags['polygon'] = [
    'points'       => true,
    'fill'         => true,
    'stroke'       => true,
    'stroke-width' => true,
];

$orbem_studio_allowed_tags['polyline'] = [
    'points'       => true,
    'fill'         => true,
    'stroke'       => true,
    'stroke-width' => true,
];

$orbem_studio_allowed_tags['title']     = [];
$orbem_studio_allowed_tags['desc']      = [];
$orbem_studio_allowed_tags['img']['draggable'] = true;
$orbem_studio_allowed_tags['style'] = [
    'type'  => true,
    'media' => true,
    'id'    => true,
];

$orbem_studio_allowed_tags['form'] = [
    'action'         => true,
    'method'         => true,
    'id'             => true,
    'class'          => true,
    'style'          => true,
    'novalidate'     => true,
    'target'         => true,
    'accept-charset' => true,
];

$orbem_studio_allowed_tags['input'] = [
    'type'          => true,
    'name'          => true,
    'value'         => true,
    'placeholder'   => true,
    'id'            => true,
    'class'         => true,
    'style'         => true,
    'checked'       => true,
    'selected'      => true,
    'disabled'      => true,
    'readonly'      => true,
    'required'      => true,
    'maxlength'     => true,
    'minlength'     => true,
    'size'          => true,
    'autocomplete'  => true,
    'aria-label'    => true,
    'aria-required' => true,
    'aria-invalid'  => true,
];

$orbem_studio_allowed_tags['select'] = [
    'name'         => true,
    'id'           => true,
    'class'        => true,
    'style'        => true,
    'required'     => true,
    'disabled'     => true,
    'multiple'     => true,
    'autocomplete' => true,
    'aria-label'   => true,
];

$orbem_studio_allowed_tags['option'] = [
    'value'    => true,
    'selected' => true,
    'disabled' => true,
];

$orbem_studio_allowed_tags['textarea'] = [
    'name'         => true,
    'id'           => true,
    'class'        => true,
    'style'        => true,
    'rows'         => true,
    'cols'         => true,
    'placeholder'  => true,
    'required'     => true,
    'disabled'     => true,
    'readonly'     => true,
    'maxlength'    => true,
    'minlength'    => true,
    'autocomplete' => true,
    'aria-label'   => true,
];

$orbem_studio_allowed_tags['button'] = [
    'type'       => true,
    'id'         => true,
    'class'      => true,
    'style'      => true,
    'disabled'   => true,
    'name'       => true,
    'value'      => true,
    'aria-label' => true,
];

$orbem_studio_allowed_tags['label'] = [
    'for'   => true,
    'class' => true,
    'style' => true,
];

$orbem_studio_allowed_tags['iframe'] = [
    'src'             => true,
    'width'           => true,
    'height'          => true,
    'class'           => true,
    'style'           => true,
    'frameborder'     => true,
    'allowfullscreen' => true,
    'loading'         => true,
    'title'           => true,
];

$orbem_studio_hide_storage                 = get_option('explore_hide_storage', false);
$orbem_studio_hud_bars                     = get_option('explore_hud_bars', []);
$orbem_studio_require_login                = get_option('explore_require_login', false);
$orbem_studio_money_img                    = get_option('explore_money_image', false);
$orbem_studio_player_name                  = get_option('explore_player_name', false);
$orbem_studio_mobile_dpad                  = get_option('explore_mobile_dpad', false);
$orbem_studio_mobile_dpad                  = true === empty($orbem_studio_mobile_dpad) ? plugin_dir_url(__FILE__) . '../assets/src/images/mobile-dpad.svg' : $orbem_studio_mobile_dpad;
$orbem_studio_mobile_action                = get_option('explore_mobile_action', false);
$orbem_studio_mobile_action                = true === empty($orbem_studio_mobile_action) ? plugin_dir_url(__FILE__) . '../assets/src/images/action-key.svg' : $orbem_studio_mobile_action;
$orbem_studio_player_name                  = 'Yes' === $orbem_studio_player_name;
$orbem_studio_plugin_dir                   = str_replace( '/templates/', '', plugin_dir_url(__FILE__));
$orbem_studio_plugin_dir_path              = plugin_dir_path(__FILE__);
$orbem_studio_default_weapon               = get_option('explore_default_weapon', '');
$orbem_studio_userid                       = get_current_user_id();
$orbem_studio_game_url                     = get_option('explore_game_page', '');
$orbem_studio_autoplay_cutscene            = get_option('explore_autoplay_cutscene', 'Yes');
$orbem_studio_game_url                     = false === empty($orbem_studio_game_url) ? get_permalink(get_page_by_path($orbem_studio_game_url)) : '/';
$orbem_studio_walking_sound                = get_option('explore_walking_sound', false);
$orbem_studio_points_sound                 = get_option('explore_points_sound', false);
$orbem_studio_points                       = get_user_meta($orbem_studio_userid, 'explore_points', true);
$orbem_studio_weapon                       = get_user_meta($orbem_studio_userid, 'explore_current_weapons', true);
$orbem_studio_equipped_weapon              = false === empty($orbem_studio_weapon) ? get_post($orbem_studio_weapon[0]) : Explore::getWeaponByName($orbem_studio_default_weapon);
$orbem_studio_is_projectile                = false === empty($orbem_studio_equipped_weapon) ? get_post_meta($orbem_studio_equipped_weapon->ID, 'explore-projectile', true) : false;
$orbem_studio_is_it_projectile             = false === empty($orbem_studio_is_projectile) ? $orbem_studio_is_projectile : 'no';
$orbem_studio_location                     = get_user_meta($orbem_studio_userid, 'current_location', true);
$orbem_studio_location                     = false === empty($orbem_studio_location) ? $orbem_studio_location : $orbem_studio_first_area;
$orbem_studio_coordinates                  = get_user_meta($orbem_studio_userid, 'current_coordinates', true);
$orbem_studio_back                         = false === empty($orbem_studio_coordinates) ? ' Back' : '';
$orbem_studio_explore_area                 = get_posts(['post_type' => 'explore-area', 'name' => $orbem_studio_location]);
$orbem_studio_explore_area                 = $orbem_studio_explore_area[0] ?? false;
$orbem_studio_is_area_cutscene             = $orbem_studio_explore_area ? get_post_meta($orbem_studio_explore_area->ID, 'explore-is-cutscene', true) : '';
$orbem_studio_explore_area_map             = $orbem_studio_explore_area ? get_post_meta($orbem_studio_explore_area->ID, 'explore-map', true) : '';
$orbem_studio_explore_area_height          = $orbem_studio_explore_area ? get_post_meta($orbem_studio_explore_area->ID, 'explore-area-height', true) : '';
$orbem_studio_explore_area_width           = $orbem_studio_explore_area ? get_post_meta($orbem_studio_explore_area->ID, 'explore-area-width', true) : '';
$orbem_studio_explore_area_start_top       = $orbem_studio_explore_area ? get_post_meta($orbem_studio_explore_area->ID, 'explore-start-top', true) : '';
$orbem_studio_explore_area_start_left      = $orbem_studio_explore_area ? get_post_meta($orbem_studio_explore_area->ID, 'explore-start-left', true) : '';
$orbem_studio_explore_start_direction      = $orbem_studio_explore_area ? get_post_meta($orbem_studio_explore_area->ID, 'explore-start-direction', true) : '';
$orbem_studio_explore_start_direction      = false === empty($orbem_studio_explore_start_direction) ? '-' . $orbem_studio_explore_start_direction : '';
$orbem_studio_explore_area_start_direction = $orbem_studio_explore_start_direction . '-dir';
$orbem_studio_explore_weapon_start         = true === isset($orbem_studio_equipped_weapon) && $orbem_studio_default_weapon !== $orbem_studio_equipped_weapon->post_name ? '-' . $orbem_studio_equipped_weapon->post_name : '';
$orbem_studio_explore_points               = Explore::getExplorePoints($orbem_studio_location);
$orbem_studio_explore_cutscenes            = Explore::getExplorePosts($orbem_studio_location, 'explore-cutscene');
$orbem_studio_explore_minigames            = Explore::getExplorePosts($orbem_studio_location, 'explore-minigame');
$orbem_studio_explore_walls                = Explore::getExplorePosts($orbem_studio_location, 'explore-wall');
$orbem_studio_explore_explainers           = Explore::getExplorePosts($orbem_studio_location, 'explore-explainer');
$orbem_studio_explore_missions             = Explore::getExplorePosts($orbem_studio_location, 'explore-mission');
$orbem_studio_explore_abilities            = Explore::getExploreAbilities();
$orbem_studio_rst                          = 'true' === wp_unslash(filter_input( INPUT_GET, 'rst', FILTER_UNSAFE_RAW)) ? ' reset' :'';
$orbem_studio_health                       = true === isset($orbem_studio_points['health']['points']) ? $orbem_studio_points['health']['points'] : 100;
$orbem_studio_mana                         = true === isset($orbem_studio_points['mana']['points']) ? $orbem_studio_points['mana']['points'] : 100;
$orbem_studio_point                        = true === isset($orbem_studio_points['point']['points']) ? $orbem_studio_points['point']['points'] : 0;
$orbem_studio_money                        = true === isset($orbem_studio_points['money']['points']) ? $orbem_studio_points['money']['points'] : 0;
$orbem_studio_point_widths                 = Explore::getCurrentPointWidth();
$orbem_studio_current_level                = Explore::getCurrentLevel();
$orbem_studio_max_points                   = Explore::getLevelMap();
$orbem_studio_explore_attack               = false === empty($orbem_studio_equipped_weapon) ? get_post_meta($orbem_studio_equipped_weapon->ID, 'explore-attack', true) : false;
$orbem_studio_weapon_sound                 = false === empty($orbem_studio_equipped_weapon) ? get_post_meta($orbem_studio_equipped_weapon->ID, 'explore-weapon-sound', true) : false;
$orbem_studio_weapon_strength              = false === empty($orbem_studio_explore_attack) ? wp_json_encode($orbem_studio_explore_attack) : '{&quot;normal&quot;:&quot;20&quot;,&quot;heavy&quot;:&quot;20&quot;,&quot;charged&quot;:&quot;20&quot;}';
$orbem_studio_intro_video                  = get_option('explore_intro_video', false);
$orbem_studio_signin_screen                = get_option('explore_signin_screen', '');
$orbem_studio_signin_screen_mobile         = get_option('explore_signin_screen_mobile', '');
$orbem_studio_start_music                  = get_option('explore_start_music', false);
$orbem_studio_main_character               = get_option('explore_main_character', false);
$orbem_studio_lose_message                 = \OrbemStudio\Util::getLoseMessage();
$orbem_studio_main_character_info          = Explore::getCharacterImages($orbem_studio_main_character);
$orbem_studio_direction_images             = $orbem_studio_main_character_info['direction_images'] ?? [];
$orbem_studio_main_character_id            = $orbem_studio_main_character_info['id'] ?? false;
$orbem_studio_hurt_sound                   = $orbem_studio_main_character_info['hurt_sound'] ?? false;
$orbem_studio_jump_sound                   = $orbem_studio_main_character_info['jump-sound'] ?? false;
$orbem_studio_jump                         = $orbem_studio_main_character_info['jump'] ?? '';
$orbem_studio_double_jump                  = $orbem_studio_main_character_info['double-jump'] ?? '';
$orbem_studio_area_physics                 = $orbem_studio_explore_area ? get_post_meta($orbem_studio_explore_area->ID, 'explore-physics', true) : '';
$orbem_studio_is_admin                     = user_can(get_current_user_id(), 'manage_options');
$orbem_studio_is_logged_in                 = is_user_logged_in();

if ( $orbem_studio_is_admin ) {
    $orbem_studio_item_list = array_merge($orbem_studio_explore_points, $orbem_studio_explore_minigames, $orbem_studio_explore_explainers, $orbem_studio_explore_walls);
    $orbem_studio_triggers  = Dev_Mode::getTriggers($orbem_studio_item_list, $orbem_studio_explore_cutscenes, $orbem_studio_explore_missions);
    $orbem_studio_item_list = array_merge($orbem_studio_item_list, $orbem_studio_triggers);
}

$orbem_studio_new_type   = false === empty($orbem_studio_coordinates) ? 'new-explore' : 'try-engage-explore';
$orbem_studio_new_type   = is_user_logged_in() && false !== empty($orbem_studio_coordinates) || 'No' === $orbem_studio_require_login ? 'engage-explore' : $orbem_studio_new_type;
$orbem_studio_new_type   = is_user_logged_in() && 'No' === $orbem_studio_require_login && false === empty($orbem_studio_coordinates) ? 'new-explore' : $orbem_studio_new_type;
$orbem_studio_health_bar = $orbem_studio_hud_bars['health'] ?? '';
$orbem_studio_mana_bar   = $orbem_studio_hud_bars['mana'] ?? '';
$orbem_studio_power_bar  = $orbem_studio_hud_bars['power'] ?? '';
$orbem_studio_points_bar = $orbem_studio_hud_bars['points'] ?? '';
$orbem_studio_money_bar  = $orbem_studio_hud_bars['money'] ?? '';

extract([
    'orbem_studio_userid' => $orbem_studio_userid,
]);

$orbem_studio_explore_area_height = false === empty($orbem_studio_explore_area_height) ? $orbem_studio_explore_area_height . 'px' : '100%';
$orbem_studio_explore_area_width = false === empty($orbem_studio_explore_area_width) ? $orbem_studio_explore_area_width . 'px' : '100%';

include plugin_dir_path(__FILE__) . 'plugin-header.php';
?>
<main id="primary"
    <?php echo esc_attr(true === $orbem_studio_is_admin ? ' data-devmode=true' : ''); ?>
    <?php echo esc_attr(true === $orbem_studio_is_logged_in ? ' data-loggedin=true' : ''); ?>
    <?php echo esc_attr(true === $orbem_studio_player_name ? ' data-playername=true' : ''); ?>
    <?php echo esc_attr('No' === $orbem_studio_autoplay_cutscene ? ' data-autoplaycutscene=false' : ''); ?>
      class="site-main<?php echo esc_attr($orbem_studio_rst); ?>">
    <?php include $orbem_studio_plugin_dir_path . 'start-screen.php'; ?>
    <?php if (true === $orbem_studio_is_admin) : ?>
        <?php echo wp_kses(html_entity_decode(Dev_Mode::getDevModeHTML()), $orbem_studio_allowed_tags); ?>
    <?php endif; ?>
    <div class="game-container <?php echo esc_attr($orbem_studio_location); ?>" data-main="<?php echo esc_attr($orbem_studio_main_character); ?>" data-fadeout="true" data-physics="<?php echo esc_attr($orbem_studio_area_physics); ?>">
        <?php if ((false === empty($orbem_studio_explore_area_map) && false !== stripos($orbem_studio_explore_area_map, '.webm')) || (false === empty($orbem_studio_explore_area_map) && false !== stripos($orbem_studio_explore_area_map, '.mp4'))): ?>
            <video class="container-image" style="position:absolute;z-index: 1;<?php echo esc_attr('height:' . $orbem_studio_explore_area_height . ';' . 'width:' . $orbem_studio_explore_area_width . ';'); ?>" src="<?php echo esc_attr($orbem_studio_explore_area_map); ?>" autoplay loop muted></video>
        <?php else : ?>
            <img class="container-image" style="position:absolute;z-index: -1;object-fit: cover;<?php echo esc_attr('height:' . $orbem_studio_explore_area_height . ';' . 'width:' . $orbem_studio_explore_area_width . ';'); ?>" src="<?php echo esc_url($orbem_studio_explore_area_map) ?? ''; ?>" decoding="async" fetchpriority="high" loading="eager" />
        <?php endif; ?>
        <div id="explore-points<?php echo false === in_array('on', [
            $orbem_studio_health_bar,
            $orbem_studio_mana_bar,
            $orbem_studio_power_bar,
            $orbem_studio_money_bar,
            $orbem_studio_points_bar
        ]) && true === empty($orbem_studio_explore_missions) ? ' empty' : ''; ?>">
            <?php if ('on' === $orbem_studio_health_bar) : ?>
                <div class="health-amount point-bar" data-type="health" data-amount="<?php echo esc_attr($orbem_studio_health + ($orbem_studio_point_widths['health'] - 100)); ?>" style="width: <?php echo isset($orbem_studio_point_widths['health']) ? esc_attr($orbem_studio_point_widths['health']) : 100; ?>px;"><div class="gauge"></div></div>
            <?php endif; ?>
            <?php if ('on' === $orbem_studio_mana_bar) : ?>
                <div class="mana-amount point-bar" data-type="mana" data-amount="<?php echo esc_attr($orbem_studio_mana + ($orbem_studio_point_widths['mana'] - 100)); ?>" style="width: <?php echo isset($orbem_studio_point_widths['mana']) ? esc_attr($orbem_studio_point_widths['mana']) : 100; ?>px;"><div class="gauge"></div></div>
            <?php endif; ?>
            <?php if ('on' === $orbem_studio_power_bar) : ?>
                <div class="power-amount point-bar" data-type="power" data-amount="100" style="width: <?php echo isset($orbem_studio_point_widths['power']) ? esc_attr($orbem_studio_point_widths['power']) : 100; ?>px;"><div class="gauge"></div></div>
            <?php endif; ?>
            <?php if ('on' === $orbem_studio_money_bar) : ?>
                <div class="money-amount point-bar" data-type="money" data-amount="<?php echo esc_attr($orbem_studio_money); ?>">
                    <div class="count">
                        <?php if (false === empty($orbem_studio_money_img)): ?>
                            <img alt="money icon" class="money-image" src="<?php echo esc_url($orbem_studio_money_img); ?>" />
                        <?php else : ?>
                            $
                        <?php endif; ?>
                        <span class="money-text"><?php echo esc_html($orbem_studio_money); ?></span>
                    </div>
                </div>
            <?php endif; ?>
            <?php if ('on' === $orbem_studio_points_bar) : ?>
                <div class="point-amount point-bar" data-type="point" data-amount="<?php echo esc_attr($orbem_studio_point); ?>" style="width: <?php echo isset($orbem_studio_point_widths['point']) ? esc_attr($orbem_studio_point_widths['point']) : 100; ?>px;">
                    <div class="gauge"></div>
                </div>
                <div class="point-info-wrap">
                    <span class="current-level">lvl. <?php echo esc_html($orbem_studio_current_level); ?></span>
                    <span class="current-points">
                        <span class="my-points"><?php echo esc_html($orbem_studio_point);?></span>/<span class="next-level-points"><?php echo esc_html($orbem_studio_max_points[$orbem_studio_current_level] ?? 1); ?></span>
                    </span>
                </div>
            <?php endif; ?>
            <div id="missions">
                <div class="missions-content">
                    <?php include $orbem_studio_plugin_dir_path . '/components/explore-missions.php'; ?>
                </div>
            </div>
        </div>
        <div id="settings">
            <div class="setting-content">
                <?php include $orbem_studio_plugin_dir_path . '/components/explore-settings.php'; ?>
            </div>
        </div>
        <div id="characters" style="display: none;">
            <div class="characters-content">
                <?php include $orbem_studio_plugin_dir_path . '/components/explore-characters.php'; ?>
            </div>
        </div>
        <?php if ('on' !== $orbem_studio_hide_storage) : ?>
            <div id="storage">
                <div class="storage-content">
                    <?php include $orbem_studio_plugin_dir_path . '/components/explore-storage.php'; ?>
                </div>
            </div>
        <?php endif; ?>
        <?php echo wp_kses_post(html_entity_decode(Explore::getExplainerHTML($orbem_studio_explore_explainers, 'menu'))); ?>
        <?php echo wp_kses(html_entity_decode(Explore::getExplainerHTML($orbem_studio_explore_explainers, 'fullscreen')), $orbem_studio_allowed_tags); ?>
        <div class="touch-buttons">
            <span class="top-left">
            </span>
            <span class="top-middle">
            </span>
            <span class="top-right">
            </span>
            <span class="middle-left">
            </span>
            <span class="middle-middle">
            </span>
            <span class="middle-right">
            </span>
            <span class="bottom-left">
            </span>
            <span class="bottom-middle">
            </span>
            <span class="bottom-right">
            </span>
            <?php if (false === empty($orbem_studio_mobile_dpad)) : ?>
                <img class="mobile-dpad" src="<?php echo esc_url($orbem_studio_mobile_dpad); ?>" />
            <?php endif; ?>
        </div>
        <div class="mobile-action-key">
            <?php if (false === empty($orbem_studio_mobile_action)) : ?>
                <img class="action-key" src="<?php echo esc_url($orbem_studio_mobile_action); ?>" />
            <?php else : ?>
                action key
            <?php endif; ?>
        </div>
        <div
            style="top: <?php echo false === empty($orbem_studio_coordinates['top']) ? esc_attr($orbem_studio_coordinates['top']) : esc_attr($orbem_studio_explore_area_start_top); ?>px; left: <?php echo false === empty($orbem_studio_coordinates['left']) ? esc_attr($orbem_studio_coordinates['left']) : esc_attr($orbem_studio_explore_area_start_left); ?>px"
            class="<?php echo esc_attr($orbem_studio_explore_area_start_direction); ?>"
            data-mainid="<?php echo esc_attr($orbem_studio_main_character_id); ?>"
            id="map-character"
            data-start-left="<?php echo esc_attr($orbem_studio_explore_area_start_left); ?>"
            data-name="<?php echo esc_attr(true !== $orbem_studio_player_name ? $orbem_studio_main_character_info['name'] ?? '' : '{{playerName}}'); ?>"
            data-voice="<?php echo esc_attr($orbem_studio_main_character_info['voice'] ?? '');?>"
            data-ability="<?php echo esc_attr($orbem_studio_main_character_info['ability'] ?? ''); ?>"
            data-hitbox-inset="<?php echo esc_attr($orbem_studio_main_character_info['hitbox-inset'] ?? ''); ?>"
            data-jump="<?php echo esc_attr($orbem_studio_jump); ?>"
            data-double-jump="<?php echo esc_attr($orbem_studio_double_jump); ?>"
        >
            <span class="misc-gauge-wrap"><span class="misc-gauge"></span></span>
            <?php if (false === empty($orbem_studio_hurt_sound)) : ?>
                <span class="hurt-sound">
                    <audio src="<?php echo esc_url($orbem_studio_hurt_sound); ?>"></audio>
                </span>
            <?php endif; ?>
            <?php if (false === empty($orbem_studio_jump_sound)) : ?>
                <span class="jump-sound">
                    <audio src="<?php echo esc_url($orbem_studio_jump_sound); ?>"></audio>
                </span>
            <?php endif; ?>
            <?php foreach($orbem_studio_direction_images as $orbem_studio_direction_label => $orbem_studio_direction_image):
                $orbem_studio_fight_animation = false !== stripos($orbem_studio_direction_label, 'punch') ? ' fight-image' : '';
                $orbem_studio_dir_image       = 'static' . $orbem_studio_explore_start_direction . $orbem_studio_explore_weapon_start;
                ?>
                <img
                    alt="<?php echo esc_attr($orbem_studio_main_character_info['name'] . ' ' . $orbem_studio_direction_label); ?>"
                    height="<?php echo false === empty($orbem_studio_main_character_info['height']) ? esc_attr($orbem_studio_main_character_info['height']) : 185; ?>px"
                    width="<?php echo false === empty($orbem_studio_main_character_info['width']) ? esc_attr($orbem_studio_main_character_info['width']) : 115; ?>px"
                    class="map-character-icon<?php echo esc_attr($orbem_studio_direction_label === $orbem_studio_dir_image ? ' engage' : ''); echo esc_attr($orbem_studio_fight_animation); ?>"
                    id="<?php echo esc_attr($orbem_studio_main_character . '-' . $orbem_studio_direction_label); ?>"
                    src="<?php echo esc_url($orbem_studio_direction_image); ?>"
                />
            <?php endforeach; ?>
        </div>
        <div style="top: <?php echo false === empty($orbem_studio_coordinates['top']) ? esc_attr(intval($orbem_studio_coordinates['top']) + 500) : 4018; ?>px; left: <?php echo false === empty($orbem_studio_coordinates['left']) ? esc_attr(intval($orbem_studio_coordinates['left'] + 500)) : 2442; ?>px" class="map-weapon" data-direction="<?php echo esc_attr($orbem_studio_explore_start_direction); ?>" data-projectile="<?php echo esc_attr($orbem_studio_is_it_projectile); ?>" data-weapon="<?php echo esc_attr($orbem_studio_equipped_weapon->post_name ?? $orbem_studio_default_weapon); ?>" data-strength=<?php echo esc_attr($orbem_studio_weapon_strength); ?>>
            <?php if (false === empty($orbem_studio_weapon_sound)) : ?>
                <audio id="weapon-sound" src="<?php echo esc_url($orbem_studio_weapon_sound); ?>"></audio>
            <?php endif; ?>
        </div>
        <div class="default-map" data-iscutscene="<?php echo esc_attr($orbem_studio_is_area_cutscene); ?>" data-startleft="<?php echo false === empty($orbem_studio_explore_area_start_left) ? esc_attr($orbem_studio_explore_area_start_left) : ''; ?>" data-starttop="<?php echo false === empty($orbem_studio_explore_area_start_top) ? esc_attr($orbem_studio_explore_area_start_top) : ''; ?>">
            <?php if (false !== $orbem_studio_explore_area): ?>
                <?php echo wp_kses_post(Explore::getMapSVG($orbem_studio_explore_area)); ?>
                <?php echo wp_kses(html_entity_decode(Explore::getMapItemHTML($orbem_studio_explore_points, ($orbem_studio_explore_area ? $orbem_studio_explore_area->post_name : ''))), $orbem_studio_allowed_tags); ?>
                <?php echo wp_kses_post(html_entity_decode(Explore::getMapCutsceneHTML($orbem_studio_explore_cutscenes, ($orbem_studio_explore_area ? $orbem_studio_explore_area->post_name : ''), $orbem_studio_userid))); ?>
            <?php endif;?>
            <?php echo wp_kses(html_entity_decode(Explore::getMinigameHTML($orbem_studio_explore_minigames)), $orbem_studio_allowed_tags ); ?>
            <?php echo wp_kses_post(html_entity_decode(Explore::getMapAbilitiesHTML($orbem_studio_explore_abilities))); ?>
            <?php echo wp_kses_post(html_entity_decode(Explore::getExplainerHTML($orbem_studio_explore_explainers, 'map'))); ?>
            <?php echo wp_kses_post(html_entity_decode(Explore::getMapCommunicateHTML($orbem_studio_location, $orbem_studio_userid))); ?>
        </div>
    </div>
    <div class="loading-screen">
        LOADING...
    </div>
    <div class="game-over-notice" style="z-index: 999999; display: none; position:fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); max-width: 500px; padding: 2rem; border-radius: 6px;">
        <?php echo wp_kses($orbem_studio_lose_message, $orbem_studio_allowed_tags); ?>
    </div>
    <?php if (false === empty($orbem_studio_intro_video) && true === empty($orbem_studio_coordinates)) : ?>
        <div class="intro-video engage">
            <span id="skip-intro-video">SKIP</span>
            <span id="unmute">🔇</span>
            <video id="intro-video" src="<?php echo esc_attr($orbem_studio_intro_video); ?>"  muted></video>
        </div>
    <?php endif; ?>
    <?php if (false === empty($orbem_studio_start_music)) : ?>
        <div class="start-screen-music">
            <span id="music-unmute">🔇</span>
        </div>
        <audio id="start-screen-music" src="<?php echo esc_attr($orbem_studio_start_music); ?>" loop <?php echo false === empty($orbem_studio_coordinates) ? 'autoplay' : ''; ?> muted></audio>
    <?php endif; ?>
    <?php if (false === empty($orbem_studio_walking_sound)) : ?>
        <audio id="walking" src="<?php echo esc_attr($orbem_studio_walking_sound); ?>"></audio>
    <?php endif; ?>
    <?php if (false === empty($orbem_studio_points_sound)) : ?>
        <audio id="ching" src="<?php echo esc_attr($orbem_studio_points_sound); ?>"></audio>
    <?php endif; ?>
</main>
<?php
include plugin_dir_path(__FILE__) . '/plugin-footer.php';
