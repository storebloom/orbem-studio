<?php
/**
 * Template Name: Explore
 * Register form template.
 */

use OrbemGameEngine\Explore;

$first_area = get_option('explore_first_area', false);

if (false === $first_area) {
    echo '<h1>A first area selection is required to play a game. Select one <strong><a href="/wp-admin/admin.php?page=orbem-game-engine">here</a></strong></h1>';
    return;
}

$require_login = get_option('explore_require_login', false);
$plugin_dir = str_replace( '/templates/', '', plugin_dir_url( __FILE__ ));
$plugin_dir_path = plugin_dir_path( __FILE__ );
$userid = get_current_user_id();
$game_url = get_option('explore_game_page', '');
$game_url = false === empty($game_url) ? get_permalink(get_page_by_path($game_url)) : '/';
$walking_sound = get_option('explore_walking_sound', false);
$points_sound = get_option('explore_points_sound', false);
$points = get_user_meta($userid, 'explore_points', true);
$weapon = get_user_meta($userid, 'explore_current_weapons', true);
$equipped_weapon = false === empty($weapon) ? get_post($weapon[0]) : Explore::getWeaponByName('fist');
$is_projectile = false === empty($equipped_weapon) ? get_post_meta($equipped_weapon->ID, 'explore-projectile', true) : false;
$is_it_projectile = false === empty($is_projectile) ? $is_projectile : 'no';
$location = get_user_meta($userid, 'current_location', true);
$location = false === empty($location) ? $location : $first_area;
$coordinates = get_user_meta($userid, 'current_coordinates', true);
$back = false === empty($coordinates) ? ' Back' : '';
$explore_area = get_posts(['post_type' => 'explore-area', 'name' => $location]);
$explore_area = $explore_area[0] ?? false;

if (false === empty($explore_area)) {
    $is_area_cutscene = get_post_meta($explore_area->ID, 'explore-is-cutscene', true);
    $explore_area_map = get_post_meta($explore_area->ID, 'explore-map-svg', true);
    $explore_area_start_top = get_post_meta($explore_area->ID, 'explore-start-top', true);
    $explore_area_start_left = get_post_meta($explore_area->ID, 'explore-start-left', true);
}

$explore_points = Explore::getExplorePoints($location);
$explore_cutscenes = Explore::getExplorePosts($location, 'explore-cutscene');
$explore_minigames = Explore::getExplorePosts($location, 'explore-minigame');
$explore_explainers = Explore::getExplorePosts($location, 'explore-explainer');
$explore_missions = Explore::getExplorePosts($location, 'explore-mission');
$explore_abilities = Explore::getExploreAbilities();
$rst = 'true' === filter_input( INPUT_GET, 'rst', FILTER_UNSAFE_RAW) ? ' reset' :'';
$health = true === isset($points['health']['points']) ? $points['health']['points'] : 100;
$mana = true === isset($points['mana']['points']) ? $points['mana']['points'] : 100;
$point = true === isset($points['point']['points']) ? $points['point']['points'] : 0;
$point_widths = Explore::getCurrentPointWidth();
$current_level = Explore::getCurrentLevel();
$max_points = Explore::getLevelMap();
$explore_attack = false === empty($equipped_weapon) ? get_post_meta($equipped_weapon->ID, 'explore-attack', true) : false;
$weapon_strength = false === empty($explore_attack) ? wp_json_encode($explore_attack['explore-attack']) : '""';
$intro_video = get_option('explore_intro_video', false);
$signin_screen = get_option('explore_signin_screen', '');
$start_music = get_option('explore_start_music', false);
$main_character_info = Explore::getCharacterImages('mc', $location);
$direction_images = $main_character_info['direction_images'] ?? [];
$is_admin = user_can(get_current_user_id(), 'manage_options');
if ( $is_admin ) {
    $item_list = array_merge($explore_points, $explore_minigames, $explore_explainers);
    $triggers = \OrbemGameEngine\Dev_Mode::getTriggers($item_list, $explore_cutscenes, $explore_missions);
    $item_list = array_merge($item_list, $triggers);
}

include plugin_dir_path(__FILE__) . 'plugin-header.php';
?>
<main id="primary"<?php echo esc_attr(true === $is_admin ? ' data-devmode=true' : ''); ?> class="site-main<?php echo esc_attr($rst); ?>">
    <div class="explore-overlay engage" style="background: url(<?php echo esc_attr($signin_screen); ?>) no-repeat center;background-size: cover;height: 100svh;left: 0;position: fixed;top: 0;width: 100%; z-index: 4;">
        <div class="greeting-message engage" style="background: white;">
            <h1>
                <?php echo 'Welcome' . esc_html($back) . ' to Escape to Orbem!'; ?>
            </h1>
                <?php if ('' === $require_login || true === is_user_logged_in()) : ?>
                    <div class="greeting-buttons">
                        <button type="button" class="engage" id="engage-explore">
                            <?php echo false === empty($coordinates) ? esc_html__('Continue', 'miropelia') : esc_html__('Start Game', 'miropelia'); ?>
                        </button>
                        <?php if ( false === empty($coordinates) ) : ?>
                            <button type="button" class="engage" id="new-explore">
                                <?php esc_html_e('New Game', 'miropelia'); ?>
                            </button>
                        <?php endif; ?>
                    </div>
    			<?php endif; ?>
                <?php if (false === is_user_logged_in()) : ?>
                    <?php if ('' === $require_login) : ?>
                        <p>
                            <strong>OR</strong>
                        </p>
                    <?php endif; ?>
                        <h2><?php esc_html_e('Login or register.', 'miropelia'); ?></h2>
                        <h3><?php esc_html_e('If you want your game progress saved, login is required.', 'miropelia'); ?></h3>
                        <br>
                        <div class="login-form form-wrapper">
                            <?php echo \Miropelia\Register::googleLogin('Login with Google'); ?>
                            <span style="text-align: center; width: 100%; margin-top:30px;display:block;">--OR--</span>
                            <?php echo wp_login_form(); ?>
                        </div>

                        <div class="register-form" style="display: none;">
                            <?php echo do_shortcode('[register-form explore="true"]'); ?>
                        </div>
                    </p>
                    <p>
                    </p>
                    <p id="explore-create-account">
                        <?php esc_html_e('Create Account', 'miropelia'); ?>
                    </p>
                    <p id="explore-login-account" style="display: none;">
                        <?php esc_html_e('Already have an account', 'miropelia'); ?>
                    </p>
                <?php endif; ?>
        </div>
    </div>
    <div class="game-container <?php echo esc_attr($location); ?>" style="background: url(<?php echo esc_url($explore_area_map ?? ''); ?>) no-repeat left top; background-size: cover;">
        <?php if ((false === empty($explore_area_map) && false !== stripos($explore_area_map, '.webm')) || (false === empty($explore_area_map) && false !== stripos($explore_area_map, '.mp4'))): ?>
            <video style="position:absolute;z-index: 1;width: 100%;height:100%;top:0; left:0;" src="<?php echo esc_attr($explore_area_map); ?>" autoplay loop muted></video>
        <?php endif; ?>
        <div id="explore-points">
            <div class="health-amount point-bar" data-type="health" data-amount="<?php echo esc_attr($health + ($point_widths['health'] - 100)); ?>" style="width: <?php echo isset($point_widths['health']) ? esc_attr($point_widths['health']) : 100; ?>px;"><div class="gauge"></div></div>
            <div class="mana-amount point-bar" data-type="mana" data-amount="<?php echo esc_attr($mana + ($point_widths['mana'] - 100)); ?>" style="width: <?php echo isset($point_widths['mana']) ? esc_attr($point_widths['mana']) : 100; ?>px;"><div class="gauge"></div></div>
            <div class="power-amount point-bar" data-type="power" data-amount="100" style="width: <?php echo isset($point_widths['power']) ? esc_attr($point_widths['power']) : 100; ?>px;"><div class="gauge"></div></div>
            <div class="point-amount point-bar" data-type="point" data-amount="<?php echo esc_attr($point); ?>" style="width: <?php echo isset($point_widths['point']) ? esc_attr($point_widths['point']) : 100; ?>px;">
                <div class="gauge"></div>
            </div>
            <div class="point-info-wrap">
                <span class="current-level">lvl. <?php echo esc_html($current_level); ?></span>
                <span class="current-points">
                    <span class="my-points"><?php echo esc_html($point);?></span>/<span class="next-level-points"><?php echo esc_html($max_points[$current_level]); ?></span>
            </div>
            <?php if (true === $is_admin) : ?>
                <?php include $plugin_dir_path . '/components/finder-list.php'; ?>
                <?php include $plugin_dir_path . '/components/pinpoint.php'; ?>
            <?php endif; ?>
        </div>
        <div id="settings">
            <div class="setting-content">
                <?php include $plugin_dir_path . '/components/explore-settings.php'; ?>
            </div>
        </div>
        <div id="characters" style="display: none;">
            <div class="characters-content">
                <?php include $plugin_dir_path . '/components/explore-characters.php'; ?>
            </div>
        </div>
        <div id="missions">
            <div class="missions-content">
                <?php include $plugin_dir_path . '/components/explore-missions.php'; ?>
            </div>
        </div>
        <div id="storage">
            <div class="storage-content">
                <?php include $plugin_dir_path . '/components/explore-storage.php'; ?>
            </div>
        </div>
        <div id="weapon">
            <div class="weapon-content">
                <?php if (false === empty($equipped_weapon)) : ?>
                    <img src="<?php echo esc_url(get_the_post_thumbnail_url($equipped_weapon->ID)); ?>" width="60px" height="60px" />
                <?php endif; ?>
            </div>
        </div>
        <div id="magic">
            <div class="magic-content">
                <?php include $plugin_dir_path . '/components/explore-magic.php'; ?>
            </div>
        </div>
        <?php if (true === $is_admin) : ?>
            <div id="new-addition">
                <div class="addition-content">
                    <?php include $plugin_dir_path . '/components/new-additions.php'; ?>
                </div>
            </div>
        <?php endif; ?>
        <?php echo html_entity_decode(Explore::getExplainerHTML($explore_explainers, 'menu')); ?>
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
        </div>
        <span id="key-guide" href="<?php echo esc_url($game_url); ?>">
            <img src="<?php echo $plugin_dir . '/assets/src/images/keys.png'; ?>" />
        </span>
        <div style="top: <?php echo false === empty($coordinates['top']) ? esc_attr($coordinates['top']) : 3518; ?>px; left: <?php echo false === empty($coordinates['left']) ? esc_attr($coordinates['left']) : 1942; ?>px" class="down-dir" id="map-character" data-ability="<?php echo false === empty($main_character_info['ability']) ? esc_attr($main_character_info['ability']) : ''; ?>">
            <?php foreach($direction_images as $direction_label => $direction_image):
                $fight_animation = false !== stripos($direction_label, 'punch') ? ' fight-image' : '';
                ?>
                <img height="<?php echo false === empty($main_character_info['height']) ? esc_attr($main_character_info['height']) : 185; ?>px" width="<?php echo false === empty($main_character_info['width']) ? esc_attr($main_character_info['width']) : 115; ?>px" class="map-character-icon<?php echo 'static' === $direction_label ? ' engage' : ''; echo esc_attr($fight_animation); ?>" id="mc-<?php echo esc_attr($direction_label); ?>" src="<?php echo esc_url($direction_image); ?>" />
            <?php endforeach; ?>
        </div>
        <div style="top: <?php echo false === empty($coordinates['top']) ? esc_attr( intval($coordinates['top']) + 500) : 4018; ?>px; left: <?php echo false === empty($coordinates['left']) ? esc_attr(intval($coordinates['left'] + 500)) : 2442; ?>px" class="map-weapon" data-direction="down" data-projectile="<?php echo esc_attr($is_it_projectile); ?>" data-weapon="<?php echo esc_attr( $equipped_weapon->post_name ); ?>" data-strength=<?php echo esc_attr($weapon_strength); ?>>
            <img src="<?php echo get_the_post_thumbnail_url($equipped_weapon); ?>"
                 width="<?php echo intval(get_post_meta($equipped_weapon->ID, 'explore-width', true)); ?>px"
                 height="<?php echo intval(get_post_meta($equipped_weapon->ID, 'explore-height', true)); ?>px"
            />
        </div>
        <div class="default-map" data-iscutscene="<?php echo esc_attr($is_area_cutscene); ?>" data-startleft="<?php echo false === empty($explore_area_start_left) ? esc_attr($explore_area_start_left) : ''; ?>" data-starttop="<?php echo false === empty($explore_area_start_top) ? esc_attr($explore_area_start_top) : ''; ?>">
            <?php if (false !== $explore_area): ?>
                <?php echo Explore::getMapSVG($explore_area); ?>
                <?php echo html_entity_decode(Explore::getMapItemHTML($explore_points, get_current_user_id(), $explore_area->post_name)); ?>
                <?php echo html_entity_decode(Explore::getMapCutsceneHTML($explore_cutscenes, $explore_area->post_name)); ?>
            <?php endif;?>
            <?php echo html_entity_decode(Explore::getMinigameHTML($explore_minigames)); ?>
            <?php echo html_entity_decode(Explore::getMapAbilitiesHTML($explore_abilities)); ?>
            <?php echo html_entity_decode(Explore::getExplainerHTML($explore_explainers, 'map')); ?>
        </div>
    </div>

    <div class="loading-screen">
        LOADING...
    </div>
    <div class="game-over-notice" style="z-index: 999999; display: none; position:fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); max-width: 500px; padding: 2rem; border-radius: 6px;">
        <h2>Awww you died</h2>
        <button class="try-again">Try again</button>
    </div>
    <?php if (true === is_user_logged_in() && false === empty($intro_video) && true === empty($coordinates)) : ?>
        <div class="intro-video engage">
            <span id="skip-intro-video">SKIP</span>
            <video id="intro-video" src="<?php echo esc_attr($intro_video); ?>" autoplay></video>
        </div>
    <?php endif; ?>
    <?php if (false === empty($start_music)) : ?>
        <audio id="start-screen-music" src="<?php echo esc_attr($start_music); ?>" loop <?php echo false === empty($coordinates) ? 'autoplay' : ''; ?>></audio>
    <?php endif; ?>
    <?php if (false !== $walking_sound) : ?>
        <audio id="walking" src="<?php echo esc_attr($walking_sound); ?>"></audio>
    <?php endif; ?>
    <?php if (false !== $points_sound) : ?>
        <audio id="ching" src="<?php echo esc_attr($points_sound); ?>"></audio>
    <?php endif; ?>
</main>
<?php
include plugin_dir_path(__FILE__) . '/plugin-footer.php';
