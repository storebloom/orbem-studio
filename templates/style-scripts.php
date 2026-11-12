<?php
if ( ! defined( 'ABSPATH' ) ) exit;

/**
 * The per-item rules for one area, sent with an area change.
 *
 * Nothing is decided here. Walking through a door and loading the page are two
 * ways into the same room, and a player cannot tell which one drew it, so both
 * ask Explore::itemStyles() for the rules and this template only prints them.
 *
 * It used to have its own copy of that loop, which drifted from the one used on
 * a page load: no wall textures, and sizes read from the wrong meta. Walls lost
 * their surface and doors lost their size the moment anybody walked anywhere,
 * and both came back on refresh. Having one generator is what stops that
 * happening again to the next thing added here.
 *
 * @var array  $orbem_studio_explore_points
 * @var string $position The area being rendered.
 */

echo \OrbemStudio\Explore::itemStyles(
    $orbem_studio_explore_points,
    isset($position) ? (string) $position : ''
); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- assembled from escaped parts.
