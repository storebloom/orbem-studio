<?php
/**
 * Characters panel for game.
 */

use OrbemGameEngine\Explore;

$characters = get_user_meta($userid, 'explore_characters', true);
?>

<div class="characters-form">
    <span class="close-settings">X</span>
    <h2>Crew</h2>
    <div class="character-list">
        <?php
        if (false === empty($characters)) :
        foreach( $characters as $character ) :
            $character_post = get_posts(['name' => $character, 'post_type' => 'explore-character', 'post_status' => 'publish', 'posts_per_page' => 1]);
            $character_weapon = get_post_meta($character_post[0]->ID, 'explore-weapon-choice', true);
            $character_ability = get_post_meta($character_post[0]->ID, 'explore-ability', true);
            $character_images = Explore::getCharacterImages($character_post[0], '');
        ?>
            <div class="character-item" data-ability="<?php echo esc_attr( $character_ability ); ?>" data-charactername="<?php echo esc_attr( $character_post[0]->post_name ); ?>" data-weapon="<?php echo false === empty($character_weapon) ? esc_attr($character_weapon) : ''; ?>">
                <div class="character-images">
                    <?php $non_main_direction_images = $character_images['direction_images'] ?? false; ?>

                    <?php if ( $non_main_direction_images ) :
                    foreach ($non_main_direction_images as $direction_label => $non_main_direction_image) :
                    $html = '<img height = "';
                            $html .= false === empty($character_images['height']) ? esc_attr($character_images['height']) : '185';
                            $html .= 'px" width="';
                            $html .= false === empty($character_images['width']) ? esc_attr($character_images['width']) : '115';
                            $html .= 'px" class="character-icon';
                            $html .= 'static' === $direction_label ? ' engage"' : '"';
                            $html .= ' id="' . $character_post[0]->post_name . '-' . esc_attr($direction_label) . '"';
                            $html .= ' src="' . esc_url($non_main_direction_image) . '" />';
                            echo $html;
                    endforeach;
                    endif;
                    ?>
                </div>
            </div>
        <?php endforeach; endif; ?>
    </div>
</div>