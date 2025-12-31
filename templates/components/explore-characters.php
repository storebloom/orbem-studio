<?php
/**
 * Characters panel for game.
 *
 * @var int $orbem_studio_userid
 */

use OrbemStudio\Explore;

$orbem_studio_characters = get_user_meta($orbem_studio_userid, 'explore_characters', true);
?>
<div class="characters-form">
    <span class="close-settings">X</span>
    <h2>Crew</h2>
    <div class="character-list">
        <?php
        if (false === empty($orbem_studio_characters)) :
        foreach($orbem_studio_characters as $orbem_studio_character) :
            if (!is_string($orbem_studio_character) || $orbem_studio_character !== sanitize_title($orbem_studio_character)) {
                continue;
            }

            $orbem_studio_character_post   = get_posts(['name' => $orbem_studio_character, 'post_type' => 'explore-character', 'post_status' => 'publish', 'posts_per_page' => 1]);
            $orbem_studio_character_images = Explore::getCharacterImages($orbem_studio_character_post[0], '');

            if (empty($orbem_studio_character_post) || ! $orbem_studio_character_post[0] instanceof \WP_Post) {
                continue;
            }

            $orbem_studio_character_name = get_post_meta($orbem_studio_character_post[0]->ID, 'explore-character-name', true) ?? $orbem_studio_character_post[0]->post_title;
        ?>
            <div class="character-item" data-ability="<?php echo esc_attr($orbem_studio_character_images['ability']); ?>" data-charactername="<?php echo esc_attr($orbem_studio_character_post[0]->post_name); ?>" data-weapon="<?php echo false === empty($orbem_studio_character_images['weapon']) ? esc_attr($orbem_studio_character_images['weapon']) : ''; ?>">
                <div class="character-images">
                    <?php $orbem_studio_non_main_direction_images = $orbem_studio_character_images['direction_images'] ?? false; ?>

                    <?php if ($orbem_studio_non_main_direction_images) :
                    foreach ($orbem_studio_non_main_direction_images as $orbem_studio_direction_label => $orbem_studio_non_main_direction_image) :
                        $orbem_studio_height = false === empty($orbem_studio_character_images['height']) ? $orbem_studio_character_images['height'] : '185';
                        $orbem_studio_width = false === empty($orbem_studio_character_images['width']) ? $orbem_studio_character_images['width'] : '115';
                        ?>
                        <img
                            height="<?php echo esc_attr($orbem_studio_height); ?>"
                            width="<?php echo esc_attr($orbem_studio_width); ?>"
                            class="character-icon<?php echo $orbem_studio_direction_label === 'static' ? ' engage' : ''; ?>"
                            id="<?php echo esc_attr($orbem_studio_character_post[0]->post_name . '-' . $orbem_studio_direction_label); ?>"
                            src="<?php echo esc_url($orbem_studio_non_main_direction_image); ?>"
                        />
                    <?php endforeach;
                    endif;
                    ?>
                </div>
                <span class="character-name">
                    <?php echo esc_html($orbem_studio_character_name); ?>
                </span>
            </div>
        <?php endforeach; endif; ?>
    </div>
</div>
