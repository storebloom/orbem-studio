<?php
/**
 * Characters panel for game.
 *
 * @var int $userid
 */

use OrbemStudio\Explore;

$characters = get_user_meta($userid, 'explore_characters', true);
?>

<div class="characters-form">
    <span class="close-settings">X</span>
    <h2>Crew</h2>
    <div class="character-list">
        <?php
        if (false === empty($characters)) :
        foreach($characters as $character) :
            if (!is_string($character) || $character !== sanitize_title($character)) {
                continue;
            }

            $character_post   = get_posts(['name' => $character, 'post_type' => 'explore-character', 'post_status' => 'publish', 'posts_per_page' => 1]);
            $character_images = Explore::getCharacterImages($character_post[0], '');

            if (empty($character_post) || ! $character_post[0] instanceof WP_Post) {
                continue;
            }

            $character_name = get_post_meta($character_post[0]->ID, 'explore-character-name', true) ?? $character_post[0]->post_title;
        ?>
            <div class="character-item" data-ability="<?php echo esc_attr($character_images['ability']); ?>" data-charactername="<?php echo esc_attr($character_post[0]->post_name); ?>" data-weapon="<?php echo false === empty($character_images['weapon']) ? esc_attr($character_images['weapon']) : ''; ?>">
                <div class="character-images">
                    <?php $non_main_direction_images = $character_images['direction_images'] ?? false; ?>

                    <?php if ($non_main_direction_images) :
                    foreach ($non_main_direction_images as $direction_label => $non_main_direction_image) :
                        $height = false === empty($character_images['height']) ? $character_images['height'] : '185';
                        $width = false === empty($character_images['width']) ? $character_images['width'] : '115';
                        ?>
                        <img
                            height="<?php echo esc_attr($height); ?>"
                            width="<?php echo esc_attr($width); ?>"
                            class="character-icon<?php echo $direction_label === 'static' ? ' engage' : ''; ?>"
                            id="<?php echo esc_attr($character_post[0]->post_name . '-' . $direction_label); ?>"
                            src="<?php echo esc_url($non_main_direction_image); ?>"
                        />
                    <?php endforeach;
                    endif;
                    ?>
                </div>
                <span class="character-name">
                    <?php echo esc_html($character_name); ?>
                </span>
            </div>
        <?php endforeach; endif; ?>
    </div>
</div>
