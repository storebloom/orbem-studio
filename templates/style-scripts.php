<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The per-item rules for one area, sent with an area change.
 *
 * @var array $orbem_studio_explore_points
 * @var string $position The area being rendered.
 */

echo \OrbemStudio\Explore::itemStyles(
    $orbem_studio_explore_points,
    isset($position) ? (string) $position : ''
); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from escaped parts.
