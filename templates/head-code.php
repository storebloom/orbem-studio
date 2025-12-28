<?php
/**
 * Template holding <head> code.
 */

echo '<meta name="viewport" content="width=device-width, initial-scale=1">';

$orbem_studio_first_area = get_option('explore_first_area', false);
$orbem_studio_current_location = get_user_meta(get_current_user_id(), 'current_location', true);
$orbem_studio_position = false === empty($orbem_studio_current_location) ? $orbem_studio_current_location : get_post_field('post_name', $orbem_studio_first_area);
$orbem_studio_explore_points = self::getExplorePoints($orbem_studio_position);
$orbem_studio_music_names = '';
$orbem_studio_setting_icon = get_option('explore_settings_icon', $this->plugin->dir_url . '/assets/src/images/settings-default.svg');
$orbem_studio_setting_icon = false === empty($orbem_studio_setting_icon) ? $orbem_studio_setting_icon : $this->plugin->dir_url . '/assets/src/images/settings-default.svg';
$orbem_studio_storage_icon = get_option('explore_storage_icon', $this->plugin->dir_url . '/assets/src/images/storage-default.svg');
$orbem_studio_storage_icon = false === empty($orbem_studio_storage_icon) ? $orbem_studio_storage_icon : $this->plugin->dir_url . '/assets/src/images/storage-default.svg';
$orbem_studio_characters_icon = get_option('explore_crew_icon', $this->plugin->dir_url . '/assets/src/images/crew-default.svg');
$orbem_studio_characters_icon = false === empty($orbem_studio_characters_icon) ? $orbem_studio_characters_icon : $this->plugin->dir_url . '/assets/src/images/crew-default.svg';
$orbem_studio_cutscene_border_color = get_option('explore_cutscene_border_color', '');
$orbem_studio_cutscene_border_radius = get_option('explore_cutscene_border_radius', '');
$orbem_studio_cutscene_border_style = get_option('explore_cutscene_border_style', '');
$orbem_studio_cutscene_border_size = get_option('explore_cutscene_border_size', '');
$orbem_studio_character_hover_border = get_option('explore_crewmate_hover_border_color', '');
$orbem_studio_skip_button_color = get_option('explore_skip_button_color', '');
?>
<style id="menu-styles">
    #settings:not(.engage):before {
        color: #000;
        content: url("<?php echo esc_html($orbem_studio_setting_icon); ?>");
        cursor: pointer;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 50px;
    }

    #storage:not(.engage):before {
        color: #000;
        content: url("<?php echo esc_html($orbem_studio_storage_icon); ?>");
        cursor: pointer;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 50px;
    }

    #characters:not(.engage):before {
        color: #000;
        content: url("<?php echo esc_html($orbem_studio_characters_icon); ?>");
        cursor: pointer;
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        width: 50px;
    }

    .map-cutscene .character-name {
        border: <?php echo esc_html($orbem_studio_cutscene_border_color); ?> solid 2px;
    }

    .map-cutscene .wp-block-orbem-paragraph-mp3 {
        border: <?php echo esc_html($orbem_studio_cutscene_border_size . 'px ' . $orbem_studio_cutscene_border_style . ' ' . $orbem_studio_cutscene_border_color); ?>;
        border-radius: <?php echo esc_html($orbem_studio_cutscene_border_radius); ?>px;
    }

    #skip-intro-video, #skip-cutscene-video {
        background: <?php echo esc_html($orbem_studio_skip_button_color); ?>;
    }

    html body .game-container #characters .characters-content .characters-form .character-list .character-item:hover {
        border: 4px solid <?php echo esc_html($orbem_studio_character_hover_border); ?>;
    }
</style>
<style id="map-item-styles">
    <?php
    if (true === is_array($orbem_studio_explore_points)) :
     foreach($orbem_studio_explore_points as $orbem_studio_explore_point) :
        if (false === isset($orbem_studio_explore_point->ID) || false === get_post($orbem_studio_explore_point->ID)) {
            continue;
        }

        $orbem_studio_top            = get_post_meta($orbem_studio_explore_point->ID, 'explore-top', true) . 'px';
        $orbem_studio_left           = get_post_meta($orbem_studio_explore_point->ID, 'explore-left', true) . 'px';
        $orbem_studio_height         = get_post_meta($orbem_studio_explore_point->ID, 'explore-height', true) . 'px';
        $orbem_studio_width          = get_post_meta($orbem_studio_explore_point->ID, 'explore-width', true) . 'px';
        $orbem_studio_map_url        = get_the_post_thumbnail_url($orbem_studio_explore_point->ID);
        $orbem_studio_background_url = true === in_array($orbem_studio_explore_point->post_type, ['explore-weapon', 'explore-point'], true) && false === empty($orbem_studio_map_url) ? "background: url(" . esc_url($orbem_studio_map_url) . ") no-repeat;" : '';
        $orbem_studio_point_type     = 'explore-enemy' === $orbem_studio_explore_point->post_type ? '.enemy-item' : '.map-item';
        ?>

    body .game-container .default-map <?php echo esc_html($orbem_studio_point_type); ?>.<?php echo esc_html($orbem_studio_explore_point->post_name); ?>-map-item[data-genre="<?php echo esc_attr($orbem_studio_explore_point->post_type); ?>"] {
    <?php echo esc_html($orbem_studio_background_url); ?>
        background-size: cover;
        top: <?php echo esc_html($orbem_studio_top); ?>;
        left: <?php echo esc_html($orbem_studio_left); ?>;
    <?php echo '0px' !== $orbem_studio_height ? 'height: ' . esc_html($orbem_studio_height) . ';' : ''; ?>
    <?php echo '0px' !== $orbem_studio_width ? 'width: ' . esc_html($orbem_studio_width) . ';' : ''; ?>
    }
    <?php endforeach; endif; ?>
</style>
<?php
