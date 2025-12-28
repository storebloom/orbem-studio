<?php
/**
 * Settings panel for game.
 *
 * @var int $orbem_studio_userid
 * @var string $orbem_studio_game_url
 */

$orbem_studio_settings = get_user_meta($orbem_studio_userid, 'explore_settings', true);
$orbem_studio_settings = is_array($orbem_studio_settings) ? $orbem_studio_settings : [];
$orbem_studio_music    = true === isset($orbem_studio_settings['music']) ? intval($orbem_studio_settings['music']) : 5;
$orbem_studio_sfx      = true === isset($orbem_studio_settings['sfx']) ? intval($orbem_studio_settings['sfx']) : 5;
$orbem_studio_talking  = true === isset($orbem_studio_settings['talking']) ? intval($orbem_studio_settings['talking']) : -12;
?>
<div class="settings-form">
    <span class="close-settings">X</span>
    <h2>Game Settings</h2>
    <label for="music-volume">
        Music Volume
        <input id="music-volume" type="range" min="0" max="10" value="<?php echo esc_attr($orbem_studio_music); ?>"/>
    </label>
    <label for="sfx-volume">
        SFX Volume
        <input id="sfx-volume" type="range" min="0" max="10" value="<?php echo esc_attr($orbem_studio_sfx); ?>"/>
    </label>
    <label for="talking-volume">
        Talking Volume
        <input id="talking-volume" type="range" min="-40" max="16" value="<?php echo esc_attr($orbem_studio_talking); ?>"/>
    </label>
    <button type="button" id="update-settings">Save</button>

    <a href="<?php echo esc_url($orbem_studio_game_url); ?>">Leave Game</a>
</div>