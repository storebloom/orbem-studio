<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * @var boolean $things_made
 * @var boolean $finished_area
 * @var boolean $finished_character
 */

$orbem_studio_choose_setup = get_option('explore_setup', 'false');
?>
<?php $this->plugin::enqueueScript('orbem-order/orbem-studio-setup'); ?>
<div class="tutorial-wrap<?php echo $things_made ? ' hide-overlay' : '' ; ?>">
    <div class="tutorial-container<?php echo $things_made ? ' hide-overlay' : '' ; ?>">
        <div class="tutorial-step<?php echo 'true' !== $orbem_studio_choose_setup && true !== $finished_area && true !== $finished_character ? ' engage' : ''; ?>" data-step="0">
            <h3 class="generate-title">How would you like to start?</h3>
            <span class="choose-setup-type-buttons">
                <button id="generate-starter-game">Generate a Starter Game</button>
                <br>
                <small>(Creates components with prefilled assets for instant play.)</small>
                <br>
                <button id="start-manual-setup">Manual Setup</button>
            </span>
            <div class="game-generating">
                <span class="game-generating-load"><img src="<?php echo esc_url(str_replace('templates/', '', plugin_dir_url(__FILE__))); ?>assets/src/images/orbem-loading.gif" height="100px" /></span>
                <span class="game-generating-finished">Your game is ready!</span>
            </div>
        </div>
        <div class="tutorial-step<?php echo 'true' === $orbem_studio_choose_setup && true !== $finished_area ? ' engage' : ''; ?>" data-step="1">
            Go <a href="<?php echo esc_url(admin_url('post-new.php?post_type=explore-area')); ?>">here</a> to create your first "area" where your game will start.
        </div>
        <div class="tutorial-step<?php echo true === $finished_area && true !== $finished_character ? ' engage' : ''; ?>" data-step="2">
            Go <a href="<?php echo esc_url(admin_url('post-new.php?post_type=explore-character')); ?>">here</a> to create your first main character.
        </div>
        <div class="tutorial-step<?php echo $things_made ? ' engage' : ''; ?>" data-step="3">
            <h3>Choose where to play your game</h3>
            <button id="generate-game-page">Create a new page for me</button>
        </div>
        <div class="tutorial-step" data-step="4">
            Choose the area you want as your starting level.
        </div>
        <div class="tutorial-step" data-step="5">
            Choose the character you want to be your playable character.
        </div>
        <div class="tutorial-step" data-step="6">
            Now save your selections.
        </div>
    </div>
</div>