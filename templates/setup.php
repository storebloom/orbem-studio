<?php $this->plugin::enqueueScript('orbem-order/orbem-studio-setup'); ?>
<div class="tutorial-wrap<?php echo $things_made ? ' hide-overlay' : '' ; ?>">
    <div class="tutorial-container<?php echo $things_made ? ' hide-overlay' : '' ; ?>">
        <div class="tutorial-step<?php echo true !== $finished_area ? ' engage' : ''; ?>" data-step="1">
            Go <a href="<?php echo admin_url('post-new.php?post_type=explore-area'); ?>">here</a> to create your first "area" where your game will start.
        </div>
        <div class="tutorial-step<?php echo true === $finished_area && true !== $finished_character ? ' engage' : ''; ?>" data-step="2">
            Go <a href="<?php echo admin_url('post-new.php?post_type=explore-character'); ?>">here</a> to create your first main character.
        </div>
        <div class="tutorial-step<?php echo true === $finished_area && true === $finished_character && true !== $finished_weapon ? ' engage' : ''; ?>" data-step="3">
            Go <a href="<?php echo admin_url('post-new.php?post_type=explore-weapon'); ?>">here</a> to create your default weapon.
        </div>
        <div class="tutorial-step<?php echo $things_made ? ' engage' : ''; ?>" data-step="4">
            Choose the page you want to display your game on.
        </div>
        <div class="tutorial-step" data-step="5">
            Choose the area you want as your starting level.
        </div>
        <div class="tutorial-step" data-step="6">
            Choose the character you want to be your playable character.
        </div>
        <div class="tutorial-step" data-step="7">
            Choose the weapon you want as your default weapon.
        </div>
        <div class="tutorial-step" data-step="8">
            Now save your selections.
        </div>
    </div>
</div>