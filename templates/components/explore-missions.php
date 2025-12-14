<?php
/**
 * Settings panel for game.
 *
 * @var int $userid
 * @var array $explore_missions
 */

$completed_missions = get_user_meta($userid, 'explore_missions', true);
$completed_missions = false === empty($completed_missions) && true === is_array($completed_missions) ? $completed_missions : [];
$current_location = $position ?? get_user_meta($userid, 'current_location', true);
$current_location = false === empty($current_location) ? $current_location : 'foresight';
$linked_mission = [];
$missions_from_cutscenes = [];
$next_mission_index = 0;

// Get all linked missions.
foreach ($explore_missions as $mission)  {
    $linked_mission[$mission->post_name] = get_post_meta($mission->ID, 'explore-next-mission', true);
    $linked_mission[$mission->post_name] = false === empty($linked_mission[$mission->post_name]) ? $linked_mission[$mission->post_name] : '';
}
?>
<div class="mission-list">
    <?php foreach($explore_missions as $mission) : ?>
        <?php
        $next_mission = get_post_meta($mission->ID, 'explore-next-mission', true);
        $parent_mission = '';
        // Check if any mission are complete. If not, show.
        if (false === in_array($mission->post_name, $completed_missions, true)) :
            // Loop through the linked missions and check if the mission is part of the next-mission value of another mission.
            foreach ($linked_mission as $mission_name => $linked_mission_item) {
                if (is_array($linked_mission_item)) {
                    $parent_mission = array_search($mission->post_name, array_keys($linked_mission_item), true);

                    if (false !== $parent_mission) {
                        $next_mission_index = $parent_mission;
                        $parent_mission = $mission_name;

                        break;
                    }
                }
            }

            $mission_points = get_post_meta($mission->ID, 'value', true);
            $ability = get_post_meta($mission->ID, 'explore-ability', true);
            $is_cutscene_mission = true === in_array($mission->post_name, $missions_from_cutscenes, true);
            $mission_blockade = [];
            $mission_blockade['top'] = get_post_meta($mission->ID, 'explore-top', true);
            $mission_blockade['left'] = get_post_meta($mission->ID, 'explore-left', true);
            $mission_blockade['height'] = get_post_meta($mission->ID, 'explore-height', true);
            $mission_blockade['width'] = get_post_meta($mission->ID, 'explore-width', true);
            $mission_blockade = false === in_array('', $mission_blockade, true) ? $mission_blockade : '';
            $classes = true === in_array($parent_mission, $completed_missions, true) ? 'engage ' : '';

            $classes .= (false === empty($parent_mission)) || true === $is_cutscene_mission ? 'next-mission mission-item ' : 'mission-item ';
            $classes .= esc_attr($mission->post_name) . '-mission-item';
            $hazard_remove = get_post_meta($mission->ID, 'explore-hazard-remove', true);
            ?>
            <div
                    id="<?php echo esc_attr($mission->ID); ?>"
                    class="<?php echo esc_attr($classes); ?>"
                    data-nextmission="<?php echo implode(',', (is_array($next_mission) ? array_keys($next_mission) : [$next_mission])); ?>"
                    data-hazardremove="<?php echo $hazard_remove ?? ''; ?>"
                    data-points="<?php echo esc_attr($mission_points); ?>"
                    data-blockade="<?php echo false === empty($mission_blockade) ? esc_attr(wp_json_encode($mission_blockade)) : ''; ?>"

                    <?php if ( false === empty($mission_blockade) ) : ?>
                        data-ability="<?php echo esc_attr($ability);?>"
                    <?php endif; ?>
            >
            <?php echo esc_html($mission->post_title); ?>
            </div>
        <?php endif; ?>
    <?php endforeach; ?>
</div>