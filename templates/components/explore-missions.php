<?php
/**
 * Settings panel for game.
 *
 * @package OrbemStudio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Explore missions panel for game.
 *
 * @var int $orbem_studio_userid
 * @var array $orbem_studio_explore_missions
 * @var string $orbem_studio_position
 */

$orbem_studio_explore_missions        = is_array( $orbem_studio_explore_missions ) ? $orbem_studio_explore_missions : array();
$orbem_studio_completed_missions      = get_user_meta( $orbem_studio_userid, 'explore_missions', true );
$orbem_studio_completed_missions      = false === empty( $orbem_studio_completed_missions ) && true === is_array( $orbem_studio_completed_missions ) ? $orbem_studio_completed_missions : array();
$orbem_studio_current_location        = $orbem_studio_position ?? get_user_meta( $orbem_studio_userid, 'current_location', true );
$orbem_studio_current_location        = false === empty( $orbem_studio_current_location ) ? $orbem_studio_current_location : 'foresight';
$orbem_studio_linked_mission          = array();
$orbem_studio_missions_from_cutscenes = array();
$orbem_studio_next_mission_index      = 0;
?>
<div class="mission-list">
	<?php
	foreach ( $orbem_studio_explore_missions as $orbem_studio_mission ) {
		$orbem_studio_linked_mission[ $orbem_studio_mission->post_name ] = get_post_meta( $orbem_studio_mission->ID, 'explore-next-mission', true );
		$orbem_studio_linked_mission[ $orbem_studio_mission->post_name ] = false === empty( $orbem_studio_linked_mission[ $orbem_studio_mission->post_name ] ) ? $orbem_studio_linked_mission[ $orbem_studio_mission->post_name ] : '';
	}

	foreach ( $orbem_studio_explore_missions as $orbem_studio_mission ) :
		if ( false === $orbem_studio_mission instanceof WP_Post ) {
			continue;
		}

		$orbem_studio_next_mission                                       = get_post_meta( $orbem_studio_mission->ID, 'explore-next-mission', true );
		$orbem_studio_linked_mission[ $orbem_studio_mission->post_name ] = false === empty( $orbem_studio_next_mission ) ? $orbem_studio_next_mission : '';
		$orbem_studio_parent_mission                                     = '';

		// Check if any mission are complete. If not, show.
		if ( false === in_array( $orbem_studio_mission->post_name, $orbem_studio_completed_missions, true ) ) :
			// Loop through the linked missions and check if the mission is part of the next-mission value of another mission.
			foreach ( $orbem_studio_linked_mission as $orbem_studio_mission_name => $orbem_studio_linked_mission_item ) {
				if ( is_array( $orbem_studio_linked_mission_item ) ) {
					$orbem_studio_parent_mission = array_search( $orbem_studio_mission->post_name, array_keys( $orbem_studio_linked_mission_item ), true );

					if ( false !== $orbem_studio_parent_mission ) {
						$orbem_studio_next_mission_index = $orbem_studio_parent_mission;
						$orbem_studio_parent_mission     = $orbem_studio_mission_name;

						break;
					}
				}
			}

			$orbem_studio_mission_points             = get_post_meta( $orbem_studio_mission->ID, 'explore-value', true );
			$orbem_studio_mission_points             = false === empty( $orbem_studio_mission_points ) ? $orbem_studio_mission_points : 0;
			$orbem_studio_ability                    = get_post_meta( $orbem_studio_mission->ID, 'explore-ability', true );
			$orbem_studio_is_cutscene_mission        = true === in_array( $orbem_studio_mission->post_name, $orbem_studio_missions_from_cutscenes, true );
			$orbem_studio_mission_blockade           = array();
			$orbem_studio_mission_blockade['top']    = get_post_meta( $orbem_studio_mission->ID, 'explore-top', true );
			$orbem_studio_mission_blockade['left']   = get_post_meta( $orbem_studio_mission->ID, 'explore-left', true );
			$orbem_studio_mission_blockade['height'] = get_post_meta( $orbem_studio_mission->ID, 'explore-height', true );
			$orbem_studio_mission_blockade['width']  = get_post_meta( $orbem_studio_mission->ID, 'explore-width', true );
			$orbem_studio_mission_blockade           = false === in_array( '', $orbem_studio_mission_blockade, true ) ? $orbem_studio_mission_blockade : '';
			$orbem_studio_classes                    = true === in_array( $orbem_studio_parent_mission, $orbem_studio_completed_missions, true ) ? 'engage ' : '';

			$orbem_studio_classes      .= ( false === empty( $orbem_studio_parent_mission ) ) || true === $orbem_studio_is_cutscene_mission ? 'next-mission mission-item ' : 'mission-item ';
			$orbem_studio_classes      .= esc_attr( $orbem_studio_mission->post_name ) . '-mission-item';
			$orbem_studio_hazard_remove = get_post_meta( $orbem_studio_mission->ID, 'explore-hazard-remove', true );
			?>
			<div
				id="<?php echo esc_attr( $orbem_studio_mission->ID ); ?>"
				class="<?php echo esc_attr( $orbem_studio_classes ); ?>"
				data-nextmission="<?php echo esc_attr( implode( ',', ( is_array( $orbem_studio_next_mission ) ? array_keys( $orbem_studio_next_mission ) : array( $orbem_studio_next_mission ) ) ) ); ?>"
				data-hazardremove="<?php echo esc_attr( $orbem_studio_hazard_remove ) ?? ''; ?>"
				data-points="<?php echo esc_attr( $orbem_studio_mission_points ); ?>"
				data-blockade="<?php echo false === empty( $orbem_studio_mission_blockade ) ? esc_attr( wp_json_encode( $orbem_studio_mission_blockade ) ) : ''; ?>"

				<?php if ( false === empty( $orbem_studio_mission_blockade ) ) : ?>
					data-ability="<?php echo esc_attr( $orbem_studio_ability ); ?>"
				<?php endif; ?>
			>
			<?php echo esc_html( $orbem_studio_mission->post_title ); ?>
			</div>
		<?php endif; ?>
	<?php endforeach; ?>
</div>
