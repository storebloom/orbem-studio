<?php
/**
 * This is the game options menu.
 */

$setup_triggered = get_option('orbem_studio_setup_triggered', '');

if ('false' !== $setup_triggered) {
    include $this->plugin->dir_path . 'templates/setup.php';
}
?>
<h1><img src="<?php echo $this->plugin->dir_url; ?>/assets/src/images/logo.svg" alt="orbem studio logo" width="80px" /><span>Orbem Studio<h3>Where Stories Become Playable Worlds</h3></span></h1>
<hr style="margin-bottom: 2rem;">
<form method="post" action="options.php">
    <?php
    settings_fields('options_group');
    do_settings_sections('game_options');
    submit_button();
    ?>
</form>
