<?php
/**
 * Settings panel for game.
 */
$settings = get_user_meta($userid, 'explore_settings', true);
$music = true === isset($settings['music']) ? intval($settings['music']) : 5;
$sfx = true === isset($settings['sfx']) ? intval($settings['sfx']) : 5;
$talking = true === isset($settings['talking']) ? intval($settings['talking']) : 5;
?>
<div class="settings-form">
    <span class="close-settings">X</span>
    <h2>Game Settings</h2>
    <label for="music-volume">
        Music Volume
        <input id="music-volume" type="range" min="0" max="10" value="<?php echo intval($music); ?>"/>
    </label>
    <label for="sfx-volume">
        SFX Volume
        <input id="sfx-volume" type="range" min="0" max="10" value="<?php echo intval($sfx); ?>"/>
    </label>
    <label for="talking-volume">
        Talking Volume
        <input id="talking-volume" type="range" min="-40" max="16" value="<?php echo intval($talking); ?>"/>
    </label>
    <button id="update-settings">Save</button>

    <a href="<?php echo esc_url($game_url); ?>">Leave Game</a>
</div>