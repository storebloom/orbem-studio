<?php
/**
 * Explore storage panel for game.
 *
 * @package OrbemStudio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Explore storage panel for game.
 *
 * @var int $orbem_studio_userid
 */

$orbem_studio_storage                = get_user_meta( $orbem_studio_userid, 'explore_storage', true );
$orbem_studio_default_weapon         = get_option( 'explore_default_weapon', false );
$orbem_studio_default_weapon_obj     = false === empty( $orbem_studio_default_weapon ) ? get_posts(
	array(
		'name'           => $orbem_studio_default_weapon,
		'posts_per_page' => 1,
		'post_type'      => 'explore-weapon',
		'no_found_rows'  => true,
		'fields'         => 'ids',
		'post_status'    => 'publish',
	)
) : false;
$orbem_studio_default_weapon_id      = isset( $orbem_studio_default_weapon_obj[0]->ID ) && false !== $orbem_studio_default_weapon_obj ? $orbem_studio_default_weapon_obj[0]->ID : '';
$orbem_studio_default_storage        = '' !== $orbem_studio_default_weapon_id ? array(
	'items'   => array(),
	'weapons' => array(
		array(
			'name' => $orbem_studio_default_weapon,
			'id'   => $orbem_studio_default_weapon_id,
			'type' => 'weapons',
		),
	),
	'gear'    => array(),
) : array(
	'items'   => array(),
	'weapons' => array(),
	'gear'    => array(),
);
$orbem_studio_storage                = false === empty( $orbem_studio_storage ) && true === is_array( $orbem_studio_storage ) ? $orbem_studio_storage : $orbem_studio_default_storage;
$orbem_studio_storage_limit          = get_user_meta( $orbem_studio_userid, 'storage_limit', true );
$orbem_studio_storage_limit          = false === empty( $orbem_studio_storage_limit ) ? $orbem_studio_storage_limit : 11;
$orbem_studio_current_explore_gear   = get_user_meta( $orbem_studio_userid, 'explore_current_gear', true ) ?? array();
$orbem_studio_current_explore_weapon = get_user_meta( $orbem_studio_userid, 'explore_current_weapons', true ) ?? array( $orbem_studio_default_weapon_id );
?>
<div class="storage-form">
	<span class="close-settings">X</span>
	<h2>Retrieval Points</h2>
	<div class="retrieval-points">
		<div class="menu-tabs">
			<div class="items-tab engage">Items</div>
			<div class="weapons-tab">Weapons</div>
			<div class="gear-tab">Gear</div>
		</div>
		<?php foreach ( $orbem_studio_storage as $orbem_studio_storage_type => $orbem_studio_storage_items ) : ?>
			<div data-menu="<?php echo esc_attr( $orbem_studio_storage_type ); ?>" class="storage-menu <?php echo 'items' === $orbem_studio_storage_type ? 'engage' : ''; ?>">
				<?php
				$orbem_studio_storage_limit = intval( $orbem_studio_storage_limit );
				for ( $orbem_studio_x = 0; $orbem_studio_x <= $orbem_studio_storage_limit; $orbem_studio_x++ ) :
					$orbem_studio_item             = isset( $orbem_studio_storage_items[ $orbem_studio_x ] ) && is_array( $orbem_studio_storage_items[ $orbem_studio_x ] )
						? $orbem_studio_storage_items[ $orbem_studio_x ]
						: array();
					$orbem_studio_item_id          = false === empty( $orbem_studio_item['id'] ) ? (int) $orbem_studio_item['id'] : '';
					$orbem_studio_item_exists      = get_post( $orbem_studio_item_id );
					$orbem_studio_current_gear     = false;
					$orbem_studio_current_weapon   = $orbem_studio_default_weapon;
					$orbem_studio_attack           = false !== $orbem_studio_item_exists ? get_post_meta( $orbem_studio_item_id, 'explore-attack', true ) : '';
					$orbem_studio_is_projectile    = false !== $orbem_studio_item_exists ? get_post_meta( $orbem_studio_item_id, 'explore-projectile', true ) : '';
					$orbem_studio_character        = false === empty( $orbem_studio_item['character'] ) ? $orbem_studio_item['character'] : '';
					$orbem_studio_weapons_and_gear = false === empty( $orbem_studio_item['type'] ) && ( 'gear' === $orbem_studio_item['type'] || 'weapons' === $orbem_studio_item['type'] );
					$orbem_studio_width            = isset( $orbem_studio_item['width'] ) ? (int) $orbem_studio_item['width'] : 50;
					$orbem_studio_height           = isset( $orbem_studio_item['height'] ) ? (int) $orbem_studio_item['height'] : 50;
					?>
					<span
							data-empty="<?php echo false === empty( $orbem_studio_item['type'] ) ? 'false' : 'true'; ?>"
							data-type="<?php echo false === empty( $orbem_studio_item['type'] ) ? esc_attr( $orbem_studio_item['type'] ) : ''; ?>"
							<?php
							if ( false === empty( $orbem_studio_item['subtype'] ) && false === empty( $orbem_studio_current_explore_gear[ $orbem_studio_item['subtype'] ] ) ) :
								if ( true === is_array( $orbem_studio_current_explore_gear[ $orbem_studio_item['subtype'] ] ) ) {
									foreach ( $orbem_studio_current_explore_gear[ $orbem_studio_item['subtype'] ] as $orbem_studio_current_array ) {
										if ( true === in_array( intval( $orbem_studio_item_id ), array_keys( $orbem_studio_current_array ), true ) ) {
											$orbem_studio_current_gear = true;
										}
									}
								}
								?>
							data-subtype="<?php echo esc_attr( $orbem_studio_item['subtype'] ); ?>"
								<?php
							endif;

							if ( true === is_array( $orbem_studio_current_explore_weapon ) && ( intval( $orbem_studio_item_id ) === intval( $orbem_studio_current_explore_weapon[0] ) ) ) {
								$orbem_studio_current_weapon = true;
							}
							?>
							data-id="<?php echo esc_attr( $orbem_studio_item_id ); ?>"
							data-value="<?php echo false === empty( $orbem_studio_item['value'] ) ? esc_attr( $orbem_studio_item['value'] ) : ''; ?>"
							data-width="<?php echo false === empty( $orbem_studio_width ) ? esc_attr( $orbem_studio_width ) : 50; ?>"
							data-height="<?php echo false === empty( $orbem_studio_height ) ? esc_attr( $orbem_studio_height ) : 50; ?>"
							data-character="<?php echo false === empty( $orbem_studio_character ) ? esc_attr( $orbem_studio_character ) : ''; ?>"

							<?php if ( true === $orbem_studio_weapons_and_gear ) : ?>
							data-strength=<?php echo false === empty( $orbem_studio_attack ) ? wp_json_encode( $orbem_studio_attack ) : '""'; ?>
							data-projectile="<?php echo false === empty( $orbem_studio_is_projectile ) ? esc_attr( $orbem_studio_is_projectile ) : 'no'; ?>"
							<?php endif; ?>

							title="<?php echo false === empty( $orbem_studio_item['name'] ) ? esc_attr( $orbem_studio_item['name'] ) : ''; ?>"
							<?php echo false === empty( $orbem_studio_item['count'] ) ? 'data-count="' . esc_attr( $orbem_studio_item['count'] ) . '"' : ''; ?>
							class="storage-item<?php echo $orbem_studio_current_gear || true === $orbem_studio_current_weapon ? ' equipped' : ''; ?>">
						<?php if ( true === $orbem_studio_weapons_and_gear ) : ?>
							<img alt="<?php echo esc_attr( $orbem_studio_item['name'] ); ?>" src="<?php echo esc_url( get_the_post_thumbnail_url( $orbem_studio_item_id ) ); ?>" width="30px" height="30px" />
						<?php endif; ?>
					</span>
				<?php endfor; ?>
			</div>
		<?php endforeach; ?>
		<div id="item-description">
		</div>
	</div>
</div>
