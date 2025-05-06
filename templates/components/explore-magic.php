<?php
/**
 * Magic panel for game.
 */
$magics = get_user_meta($userid, 'explore_magic', true);
$magics = false === empty($magics) ? $magics : false;

if (false === $magics) {
    return;
}
?>
<div class="magic-container">
    <?php foreach($magics as $magic_type => $spells): ?>
        <div class="magic-spells <?php echo esc_attr($magic_type); ?>-magic">
            <?php foreach($spells as $spell) :
                $spell_name = get_post_field('post_name', $spell);
                $spell_type = get_the_terms($spell, 'magic-type');
                $spell_value = get_post_meta($spell, 'value', true);
                $the_spell_type = '';

                if (true === is_array($spell_type)) {
                    foreach( $spell_type as $type ) {
                        if (false === in_array($type->slug, ['defense', 'offense'], true)) {
                            $the_spell_type = $type->slug;
                        }
                    }
                }
                ?>
                <span
                    data-type="<?php echo false === empty( $the_spell_type ) ? esc_attr($the_spell_type ) : ''; ?>"
                    data-value="<?php echo false === empty($spell_value) ? esc_attr($spell_value) : ''; ?>"
                    title="<?php echo false === empty($spell_name) ? esc_attr($spell_name) : ''; ?>"
                    class="spell">
                    <img src="<?php echo esc_url(get_the_post_thumbnail_url($spell)); ?>" width="60px" height="60px" />
                </span>
            <?php endforeach; ?>
        </div>
    <?php endforeach; ?>
</div>
