<?php
use OrbemGameEngine\Explore;
if (true === $is_admin) {
    $areas = get_posts(['post_type' => 'explore-area', 'posts_per_page' => -1, 'fields' => ['ids', 'post_name']]);
}
?>
<div class="explore-overlay engage" style="background: url(<?php echo esc_attr($signin_screen); ?>) no-repeat center;background-size: cover;height: 100svh;left: 0;position: fixed;top: 0;width: 100%; z-index: 4;">
    <?php if ((false === empty($signin_screen) && false !== stripos($signin_screen, '.webm')) || (false === empty($signin_screen) && false !== stripos($signin_screen, '.mp4'))): ?>
        <video style="object-fit:cover;position:absolute;z-index: 0;width: 100%;height:100svh;top:0; left:0;" src="<?php echo esc_url($signin_screen); ?>" autoplay loop muted></video>
    <?php endif; ?>
    <div class="greeting-message engage">
        <div class="greeting-buttons">
            <?php the_content(); ?>

            <?php if (true === is_user_logged_in() && false === empty($coordinates) ) : ?>
                <button type="button" class="engage" id="engage-explore">
                    <?php esc_html_e('Continue', 'miropelia'); ?>
                </button>
            <?php endif; ?>
            <?php if ('' === $require_login || true === is_user_logged_in()) : ?>
                <button type="button" class="engage" id="<?php echo esc_attr($new_type); ?>">
                    <?php esc_html_e('New Game', 'miropelia'); ?>
                </button>
            <?php endif; ?>
            <?php if (false === is_user_logged_in()) : ?>
                <button type="button" class="engage" id="login-register">
                    <?php esc_html_e('Login or register.', 'miropelia'); ?>
                </button>
            <?php endif; ?>
        </div>

        <?php if (false === is_user_logged_in()) : ?>
            <div class="game-login-create-container">
                <h2><?php esc_html_e('Login or register.', 'miropelia'); ?></h2>
                <div class="login-form form-wrapper">
                    <?php echo Explore::googleLogin('Login with Google'); ?>
                    <span style="text-align: center; width: 100%; margin-top:30px;display:block;">--OR--</span>
                    <?php echo wp_login_form(); ?>
                </div>

                <div class="register-form" style="display: none;">
                    <?php echo do_shortcode('[register-form explore="true"]'); ?>
                </div>
                <p id="explore-create-account">
                    <?php esc_html_e('Create Account', 'miropelia'); ?>
                </p>
                <p id="explore-login-account" style="display: none;">
                    <?php esc_html_e('Already have an account', 'miropelia'); ?>
                </p>
            </div>
        <?php endif; ?>
        <?php if ('' === $require_login) : ?>
            <div class="non-login-warning">
                <h2>WARNING!</h2>
                <p>If you start a new game without logging in, your game progress will <strong>NOT</strong> be saved.</p>
                <p>
                    <button type="button" id="login-register">Login</button>
                    <button type="button" id="engage-explore">Continue</button>
                </p>
            </div>
        <?php endif; ?>
    </div>
    <?php if (true === $is_admin) : ?>
    <button type="button" id="select-level">Level Selector</button>
        <div class="level-selector" data-first="<?php echo esc_attr($first_area); ?>">
            <?php foreach($areas as $area): ?>
                <img data-name="<?php echo esc_attr($area->post_name ?? ''); ?>" src="<?php echo esc_url(get_post_meta($area->ID ?? 0, 'explore-map-svg', true)); ?>"/>
            <?php endforeach; ?>
        </div>
    <?php endif; ?>
</div>