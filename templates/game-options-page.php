<?php
/**
 * This is the game options menu.
 */
?>
<h1>Welcome to the Orbem Game Engine</h1>
<h2>The world's first WordPress powered game engine.</h2>
<form method="post" action="options.php">
    <?php
    settings_fields('options_group');
    do_settings_sections( 'options-page' );
    submit_button();
    ?>
</form>
