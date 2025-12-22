<?php
/**
 * Template holding <head> code.
 */

echo '<script src="https://accounts.google.com/gsi/client" async defer></script>';
echo '<meta name="viewport" content="width=device-width, initial-scale=1">';

$first_area = get_option('explore_first_area', false);
$current_location = get_user_meta(get_current_user_id(), 'current_location', true);
$position = false === empty($current_location) ? $current_location : get_post_field('post_name', $first_area);
$explore_points = self::getExplorePoints($position);
$explore_areas = get_posts(['post_type' => 'explore-area', 'numberposts' => -1]);
$music_names = '';
$setting_icon = get_option('explore_settings_icon', $this->plugin->dir_url . '/assets/src/images/settings-default.svg');
$setting_icon = false === empty($setting_icon) ? $setting_icon : $this->plugin->dir_url . '/assets/src/images/settings-default.svg';
$storage_icon = get_option('explore_storage_icon', $this->plugin->dir_url . '/assets/src/images/storage-default.svg');
$storage_icon = false === empty($storage_icon) ? $storage_icon : $this->plugin->dir_url . '/assets/src/images/storage-default.svg';
$characters_icon = get_option('explore_crew_icon', $this->plugin->dir_url . '/assets/src/images/crew-default.svg');
$characters_icon = false === empty($characters_icon) ? $characters_icon : $this->plugin->dir_url . '/assets/src/images/crew-default.svg';
$cutscene_border_color = get_option('explore_cutscene_border_color', '');
$cutscene_border_radius = get_option('explore_cutscene_border_radius', '');
$cutscene_border_style = get_option('explore_cutscene_border_style', '');
$cutscene_border_size = get_option('explore_cutscene_border_size', '');
$character_hover_border = get_option('explore_crewmate_hover_border_color', '');
$skip_button_color = get_option('explore_skip_button_color', '');
?>
<style id="menu-styles">
    #settings:not(.engage):before {
        color: #000;
        content: url("<?php echo esc_html($setting_icon); ?>");
        cursor: pointer;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 50px;
    }

    #storage:not(.engage):before {
        color: #000;
        content: url("<?php echo esc_html($storage_icon); ?>");
        cursor: pointer;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 50px;
    }

    #characters:not(.engage):before {
        color: #000;
        content: url("<?php echo esc_html($characters_icon); ?>");
        cursor: pointer;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 50px;
    }

    .map-cutscene .character-name {
        border: <?php echo esc_html($cutscene_border_color); ?> solid 2px;
    }

    .map-cutscene .wp-block-orbem-paragraph-mp3 {
        border: <?php echo esc_html($cutscene_border_size . 'px ' . $cutscene_border_style . ' ' . $cutscene_border_color); ?>;
        border-radius: <?php echo esc_html($cutscene_border_radius); ?>px;
    }

    #skip-intro-video, #skip-cutscene-video {
        background: <?php echo esc_html($skip_button_color); ?>;
    }

    html body .game-container #characters .characters-content .characters-form .character-list .character-item:hover {
        border: 4px solid <?php echo esc_html($character_hover_border); ?>;
    }
</style>
<style id="map-item-styles">
    <?php
    if (true === is_array($explore_points)) :
     foreach($explore_points as $explore_point) :
        if (false === isset($explore_point->ID) || false === get_post($explore_point->ID)) {
            continue;
        }

        $top            = get_post_meta($explore_point->ID, 'explore-top', true) . 'px';
        $left           = get_post_meta($explore_point->ID, 'explore-left', true) . 'px';
        $height         = get_post_meta($explore_point->ID, 'explore-height', true) . 'px';
        $width          = get_post_meta($explore_point->ID, 'explore-width', true) . 'px';
        $map_url        = get_the_post_thumbnail_url($explore_point->ID);
        $background_url = true === in_array($explore_point->post_type, ['explore-weapon', 'explore-point'], true) && false === empty($map_url) ? "background: url(" . esc_url($map_url) . ") no-repeat;" : '';
        $point_type     = 'explore-enemy' === $explore_point->post_type ? '.enemy-item' : '.map-item';
        ?>

    body .game-container .default-map <?php echo esc_html($point_type); ?>.<?php echo esc_html($explore_point->post_name); ?>-map-item[data-genre="<?php echo esc_attr($explore_point->post_type); ?>"] {
    <?php echo esc_html($background_url); ?>
        background-size: cover;
        top: <?php echo esc_html($top); ?>;
        left: <?php echo esc_html($left); ?>;
    <?php echo '0px' !== $height ? 'height: ' . esc_html($height) . ';' : ''; ?>
    <?php echo '0px' !== $width ? 'width: ' . esc_html($width) . ';' : ''; ?>
    }
    <?php endforeach; endif; ?>
</style>
<?php

foreach($explore_areas as $explore_area):
    if (false === isset($explore_area->ID) || false === get_post($explore_area->ID)) {
        continue;
    }

    $music = get_post_meta($explore_area->ID, 'explore-music', true);
    $music_names .= '"' . esc_html($explore_area->post_name) . '":"' . esc_html($music) . '",';
endforeach;?>
    <script id="enterable-maps">
        const musicNames = {<?php echo wp_kses_post($music_names); ?>}
    </script>
<?php
