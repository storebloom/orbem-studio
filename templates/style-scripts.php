<?php
/**
 * Style scripts template.
 *
 * @package OrbemStudio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Style scripts template.
 *
 * @var array $orbem_studio_explore_points
 */

foreach ( $orbem_studio_explore_points as $orbem_studio_explore_point ) :
	if ( false === isset( $orbem_studio_explore_point->ID, $orbem_studio_explore_point->post_type ) || 'explore-character' === $orbem_studio_explore_point->post_type || false === get_post( $orbem_studio_explore_point->ID ) ) {
		continue;
	}

	$orbem_studio_height         = get_post_meta( $orbem_studio_explore_point->ID, 'explore-height', true ) . 'px';
	$orbem_studio_width          = get_post_meta( $orbem_studio_explore_point->ID, 'explore-width', true ) . 'px';
	$orbem_studio_map_url        = get_the_post_thumbnail_url( $orbem_studio_explore_point->ID );
	$orbem_studio_background_url = true === in_array( $orbem_studio_explore_point->post_type, array( 'explore-weapon', 'explore-point', 'explore-character', 'explore-enemy' ), true ) ? 'background: url(' . esc_url( $orbem_studio_map_url ) . ') no-repeat;' : '';
	$orbem_studio_point_type     = 'explore-enemy' === $orbem_studio_explore_point->post_type ? '.enemy-item' : '.map-item';
	?>
	body .game-container .default-map <?php echo esc_html( $orbem_studio_point_type ); ?>.<?php echo esc_html( $orbem_studio_explore_point->post_name ); ?>-map-item[data-genre="<?php echo esc_attr( $orbem_studio_explore_point->post_type ); ?>"] {
	<?php echo esc_html( $orbem_studio_background_url ); ?>
		background-size: cover;
		<?php echo '0px' !== $orbem_studio_height ? 'height: ' . esc_html( $orbem_studio_height ) . ';' : ''; ?>
		<?php echo '0px' !== $orbem_studio_width ? 'width: ' . esc_html( $orbem_studio_width ) . ';' : ''; ?>
	}
	<?php
endforeach;