<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * One row's ingredient, inside a recipe's repeater: a select of every
 * ingredient, by slug — which is how a recipe names it, so the same recipe
 * reads the same in any world that has the ingredient.
 *
 * Its own template rather than the shared select, because that one takes its
 * options from the field definition and has no notion of the repeat index, so
 * every row would be named the same and only the last would survive the save.
 *
 * @var string         $orbem_studio_key
 * @var boolean|string $orbem_studio_main_key
 * @var boolean|int    $orbem_studio_repeat_index
 * @var array          $orbem_studio_meta_values
 */

$orbem_studio_final_key   = $orbem_studio_key;
$orbem_studio_final_value = $orbem_studio_meta_values[$orbem_studio_key] ?? '';

if (false !== $orbem_studio_main_key) {
    $orbem_studio_final_key = $orbem_studio_main_key . '[';

    if (false !== $orbem_studio_repeat_index) {
        $orbem_studio_final_key  .= $orbem_studio_repeat_index . '][' . $orbem_studio_key;
        $orbem_studio_final_value = $orbem_studio_meta_values[$orbem_studio_main_key][$orbem_studio_repeat_index][$orbem_studio_key] ?? '';
    } else {
        $orbem_studio_final_key  .= $orbem_studio_key;
        $orbem_studio_final_value = $orbem_studio_meta_values[$orbem_studio_main_key][$orbem_studio_key] ?? '';
    }

    $orbem_studio_final_key .= ']';
}

$orbem_studio_sellable = get_posts([
    'post_type'      => 'explore-ingredients',
    'post_status'    => 'publish',
    'posts_per_page' => -1,
    'orderby'        => 'title',
    'order'          => 'ASC',
    'no_found_rows'  => true,
]);
?>
<p>
<label>
    Ingredient
    <br>
    <select name="<?php echo esc_attr($orbem_studio_final_key); ?>">
        <option value="">None</option>
        <?php foreach ($orbem_studio_sellable as $orbem_studio_sellable_post) : ?>
            <option value="<?php echo esc_attr($orbem_studio_sellable_post->post_name); ?>"
                <?php selected($orbem_studio_final_value, $orbem_studio_sellable_post->post_name); ?>>
                <?php echo esc_html($orbem_studio_sellable_post->post_title); ?>
            </option>
        <?php endforeach; ?>
    </select>
</label>
</p>
