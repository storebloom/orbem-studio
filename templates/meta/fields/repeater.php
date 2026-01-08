<?php
if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * @var string $orbem_studio_key
 * @var boolean|array $orbem_studio_sub_value
 * @var array $orbem_studio_meta_values
 */

use OrbemStudio\Meta_Box;

$orbem_studio_repeat_index          = 0;
$orbem_studio_final_value           = false === empty( $orbem_studio_meta_values[ $orbem_studio_key ] ) ? $orbem_studio_meta_values[ $orbem_studio_key ] : array( 1 );
$orbem_studio_sub_value             = true === is_array( $orbem_studio_sub_value ) ? $orbem_studio_sub_value : array();
$orbem_studio_allowed_tags          = wp_kses_allowed_html( 'post' );
$orbem_studio_allowed_tags['input'] = array(
	'type'        => true,
	'name'        => true,
	'value'       => true,
	'id'          => true,
	'class'       => true,
	'checked'     => true,
	'disabled'    => true,
	'readonly'    => true,
	'placeholder' => true,
	'required'    => true,
	'data-*'      => true,
);
?>
<p>
<label>
	<div class="field-container-wrap">
		<?php for ( $orbem_studio_i = 0; $orbem_studio_i < count( $orbem_studio_final_value ); $orbem_studio_i++ ) : ?>
			<div class="field-container">
				<span class="container-index"><?php echo esc_html( $orbem_studio_repeat_index ); ?></span>
				<?php foreach ( $orbem_studio_sub_value as $orbem_studio_repeater_key => $orbem_studio_repeater_type ) : ?>
					<p>
						<?php echo wp_kses( Meta_Box::getMetaHtml( $orbem_studio_repeater_key, $orbem_studio_repeater_type, $orbem_studio_meta_values, $orbem_studio_key, false, $orbem_studio_repeat_index ), $orbem_studio_allowed_tags ); ?>
					</p>
				<?php endforeach; ?>
				<div class="remove-field">-</div>
			</div>
			<?php
			++$orbem_studio_repeat_index;
endfor;
		?>
	</div>
	<div class="add-field">+</div>
</label>
</p>
