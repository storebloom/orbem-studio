<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * This is the game options menu.
 */

$orbem_studio_setup_triggered = get_option( 'orbem_studio_setup_triggered', 'false' );

if ( 'false' !== $orbem_studio_setup_triggered ) {
	include $this->plugin->dir_path . '/templates/setup.php';
}
?>
<div class="title-section">
	<img src="<?php echo esc_url( $this->plugin->dir_url ); ?>/assets/src/images/logo.svg" alt="orbem studio logo" width="80px" />
	<span>
		<h1>Orbem Studio</h1>
		<span class="subtitle-h3">Where Stories Become Playable Worlds</span>
	</span>
</div>
<hr style="margin-bottom: 2rem;">
<form method="post" action="options.php">
	<?php
	settings_fields( 'options_group' );
	do_settings_sections( 'game_options' );
	submit_button();
	?>
</form>
