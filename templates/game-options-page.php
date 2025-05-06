<?php
/**
 * This is the game options menu.
 */
?>
<form method="post" action="options.php">
    <?php
    settings_fields('options_group');
    do_settings_sections( 'options-page' );
    submit_button();
    ?>
</form>
