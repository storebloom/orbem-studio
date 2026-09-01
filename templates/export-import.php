<?php
if ( ! defined( 'ABSPATH' ) ) exit;

$orbem_studio_steam     = $this->plugin->steam_export;
$orbem_studio_status    = $orbem_studio_steam->getStatus();
$orbem_studio_game_page = get_option('explore_game_page', '');
$orbem_studio_can_build = current_user_can('manage_options');

// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only display of messages set by our own redirects.
$orbem_studio_notices = [
    'itch_error'          => isset($_GET['itch_error']) ? sanitize_text_field(wp_unslash($_GET['itch_error'])) : '',
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only display of messages set by our own redirects.
    'steam_error'         => isset($_GET['steam_error']) ? sanitize_text_field(wp_unslash($_GET['steam_error'])) : '',
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only display of messages set by our own redirects.
    'import_error'        => isset($_GET['import_error']) ? sanitize_text_field(wp_unslash($_GET['import_error'])) : '',
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only display of messages set by our own redirects.
    'import_success'      => isset($_GET['import_success']),
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only display of messages set by our own redirects.
    'runtime_deleted'     => isset($_GET['steam_runtime_deleted']),
    // phpcs:ignore WordPress.Security.NonceVerification.Recommended -- read-only display of messages set by our own redirects.
    'ids_saved'           => isset($_GET['steam_ids_saved']),
];

// A POST larger than post_max_size arrives with an empty $_POST, so no handler runs.
$orbem_studio_post_too_big = isset($_SERVER['REQUEST_METHOD'], $_SERVER['CONTENT_LENGTH']) &&
    'POST' === $_SERVER['REQUEST_METHOD'] &&
    empty($_POST) &&
    (int) $_SERVER['CONTENT_LENGTH'] > 0;

$orbem_studio_box  = 'background:#fff; padding:24px; border:1px solid #ddd; border-radius:6px;';

// Two equal publishing cards side by side, stacking on narrow screens.
$orbem_studio_publish_card = 'flex:1 1 420px; min-width:320px; ' . $orbem_studio_box;
$orbem_studio_card         = 'flex:1 1 300px; min-width:280px; ' . $orbem_studio_box;
?>
<div class="wrap">
    <h1>Export / Import Game</h1>

    <?php if ($orbem_studio_notices['import_success']) : ?>
        <div class="notice notice-success"><p>Game imported successfully.</p></div>
    <?php endif; ?>

    <?php if ($orbem_studio_notices['runtime_deleted']) : ?>
        <div class="notice notice-success"><p>Cached Windows runtime deleted. The next build will download it again.</p></div>
    <?php endif; ?>

    <?php if ($orbem_studio_notices['ids_saved']) : ?>
        <div class="notice notice-success"><p>Steam IDs saved. New builds will have their upload scripts filled in.</p></div>
    <?php endif; ?>

    <?php if ('' !== $orbem_studio_notices['import_error']) : ?>
        <div class="notice notice-error"><p>Import failed: <?php echo esc_html($orbem_studio_notices['import_error']); ?></p></div>
    <?php endif; ?>

    <?php if ('' !== $orbem_studio_notices['itch_error']) : ?>
        <div class="notice notice-error"><p>itch.io export failed: <?php echo esc_html($orbem_studio_notices['itch_error']); ?></p></div>
    <?php endif; ?>

    <?php if ('' !== $orbem_studio_notices['steam_error']) : ?>
        <div class="notice notice-error"><p>Steam export failed: <?php echo esc_html($orbem_studio_notices['steam_error']); ?></p></div>
    <?php endif; ?>

    <?php if ($orbem_studio_post_too_big) : ?>
        <div class="notice notice-error">
            <p>
                That upload was larger than this server accepts (<code>post_max_size</code> is
                <code><?php echo esc_html(ini_get('post_max_size')); ?></code>), so nothing was imported.
                Raise that limit in your PHP configuration and try again.
            </p>
        </div>
    <?php endif; ?>

    <h2 style="margin-top:32px;">Publish Your Game</h2>

    <div style="display:flex; flex-wrap:wrap; gap:32px; align-items:stretch;">

        <div style="<?php echo esc_attr($orbem_studio_publish_card); ?>">
            <h3 style="margin-top:0;">itch.io (plays in the browser)</h3>
            <p>Download a <code>.zip</code> containing a single <code>index.html</code> built from your live game page, ready to upload to itch.io.</p>
            <p><strong>On itch.io:</strong> upload the zip, tick <em>This file will be played in the browser</em>, and set <strong>Kind of project</strong> to <strong>HTML</strong>.</p>
            <?php if (empty($orbem_studio_game_page)) : ?>
                <p><em>Set <strong>Game Options &rarr; Page For Game</strong> before exporting.</em></p>
            <?php endif; ?>
            <?php if ($orbem_studio_can_build) : ?>
                <form method="post" style="margin-top:16px;">
                    <?php wp_nonce_field('orbem_export_itch', 'orbem_itch_nonce'); ?>
                    <input type="hidden" name="orbem_action" value="export_itch">
                    <input type="submit" class="button button-primary button-hero" value="Download itch.io Zip">
                </form>
            <?php else : ?>
                <p><em>Only administrators can build the itch.io file.</em></p>
            <?php endif; ?>
            <p class="description" style="margin-top:16px;">Styles and scripts are inlined into the file. Images, audio, video and save data still load from this site, so keep it online and published. Games that require login may not be able to sign in from inside itch's player frame.</p>
        </div>

        <div style="<?php echo esc_attr($orbem_studio_publish_card); ?>">
            <h3 style="margin-top:0;">Steam (Windows desktop)</h3>
            <p>Build a Windows desktop version of your game, ready to upload to Steam with the Steamworks ContentBuilder. Nothing is compiled here. Your game is injected into the official Electron runtime.</p>

            <?php if (empty($orbem_studio_game_page)) : ?>
                <p><em>Set <strong>Game Options &rarr; Page For Game</strong> before exporting.</em></p>
            <?php endif; ?>

            <?php if ($orbem_studio_status['cached']) : ?>
                <p>
                    <span class="dashicons dashicons-yes" style="color:#00a32a;"></span>
                    Electron <?php echo esc_html($orbem_studio_status['version']); ?> runtime cached
                    (<?php echo esc_html($orbem_studio_status['size']); ?>). Builds take a few seconds.
                </p>
            <?php else : ?>
                <p>
                    <span class="dashicons dashicons-download" style="color:#2271b1;"></span>
                    First build downloads the Electron <?php echo esc_html($orbem_studio_status['version']); ?>
                    runtime (about 150&nbsp;MB) from GitHub and verifies its official checksum. That happens once.
                    Every build after it reuses the cached copy.
                </p>
            <?php endif; ?>

            <?php if ($orbem_studio_can_build) : ?>
                <form method="post" style="margin:20px 0; padding:16px; background:#f6f7f7; border-radius:4px;">
                    <?php wp_nonce_field('orbem_save_steam_ids', 'orbem_steam_ids_nonce'); ?>
                    <input type="hidden" name="orbem_action" value="save_steam_ids">
                    <p style="margin-top:0;">
                        <strong>Steamworks IDs.</strong> Enter these once and every build ships with its
                        upload scripts already filled in. You get them from your app's page on
                        <a href="https://partner.steamgames.com" target="_blank" rel="noopener">Steamworks</a>.
                    </p>
                    <p>
                        <label for="orbem-steam-app-id" style="display:inline-block; min-width:90px;">App ID</label>
                        <input
                            type="text" inputmode="numeric" pattern="[0-9]*" id="orbem-steam-app-id"
                            name="orbem_steam_app_id" class="regular-text" style="max-width:160px;"
                            value="<?php echo esc_attr($orbem_studio_status['app_id']); ?>"
                            placeholder="1234560"
                        >
                    </p>
                    <p>
                        <label for="orbem-steam-depot-id" style="display:inline-block; min-width:90px;">Depot ID</label>
                        <input
                            type="text" inputmode="numeric" pattern="[0-9]*" id="orbem-steam-depot-id"
                            name="orbem_steam_depot_id" class="regular-text" style="max-width:160px;"
                            value="<?php echo esc_attr($orbem_studio_status['depot_auto'] ? '' : $orbem_studio_status['depot_id']); ?>"
                            placeholder="<?php echo esc_attr('' === $orbem_studio_status['app_id'] ? '1234561' : $orbem_studio_status['depot_id']); ?>"
                        >
                        <span class="description">
                            Optional. Leave blank and Steam's usual App&nbsp;ID&nbsp;+&nbsp;1 is used<?php
                            echo '' === $orbem_studio_status['app_id'] ? '' : ' (' . esc_html($orbem_studio_status['depot_id']) . ')'; ?>.
                        </span>
                    </p>
                    <input type="submit" class="button" value="Save Steam IDs">
                </form>

                <?php if ('' === $orbem_studio_status['app_id']) : ?>
                    <p class="description">
                        No App ID yet? You can still build. The upload scripts ship with placeholders and
                        <code>STEAM-README.txt</code> explains what to fill in.
                    </p>
                <?php endif; ?>

                <div style="display:flex; gap:12px; align-items:center; flex-wrap:wrap; margin-top:16px;">
                    <form method="post">
                        <?php wp_nonce_field('orbem_export_steam', 'orbem_steam_nonce'); ?>
                        <input type="hidden" name="orbem_action" value="export_steam">
                        <input type="submit" class="button button-primary button-hero" value="Build Windows Game">
                    </form>
                </div>

                <p class="description" style="margin-top:12px;">
                    The download is roughly 150&nbsp;MB and contains the game, generated Steam build scripts, and
                    <code>upload_to_steam.bat</code>. Extract it, double click the <code>.bat</code>, and enter your
                    Steam username. It fetches <code>steamcmd</code> itself and runs a safe preview upload first.
                    Images, audio, video and saved progress still load from this site, so it must stay online.
                </p>
            <?php else : ?>
                <p><em>Only administrators can build the Windows package.</em></p>
            <?php endif; ?>

            <?php if ($orbem_studio_can_build && $orbem_studio_status['cached']) : ?>
                <form method="post" style="margin-top:20px; border-top:1px solid #eee; padding-top:16px;">
                    <?php wp_nonce_field('orbem_delete_steam_runtime', 'orbem_runtime_delete_nonce'); ?>
                    <input type="hidden" name="orbem_action" value="delete_steam_runtime">
                    <input
                        type="submit"
                        class="button-link"
                        value="Clear cached runtime"
                        onclick="return confirm('Delete the cached Electron runtime? The next build downloads a fresh copy.')"
                    >
                    <span class="description">
                        Only needed if a build seems corrupted. Deletes the cached
                        <?php echo esc_html($orbem_studio_status['size']); ?> copy so the next build downloads it again.
                    </span>
                </form>
            <?php endif; ?>
        </div>

    </div>

    <h2 style="margin-top:40px;">Backup and Transfer</h2>

    <div style="display:flex; flex-wrap:wrap; gap:32px; align-items:stretch;">

        <div style="<?php echo esc_attr($orbem_studio_card); ?>">
            <h3 style="margin-top:0;">Export Game</h3>
            <p>Export your entire game including all assets and settings to a single JSON file. Use this to back up your game or move it to another site.</p>
            <form method="post">
                <?php wp_nonce_field('orbem_export_game', 'orbem_export_nonce'); ?>
                <input type="hidden" name="orbem_action" value="export">
                <input type="submit" class="button button-primary" value="Export Game">
            </form>
        </div>

        <div style="<?php echo esc_attr($orbem_studio_card); ?>">
            <h3 style="margin-top:0;">Import Game</h3>
            <p>Import a game from a previously exported JSON file. New assets will be added without deleting existing posts.</p>
            <p><strong>Note:</strong> Game options will be overridden by the imported file.</p>
            <form method="post" enctype="multipart/form-data">
                <?php wp_nonce_field('orbem_import_game', 'orbem_import_nonce'); ?>
                <input type="hidden" name="orbem_action" value="import">
                <p>
                    <input type="file" name="orbem_import_file" accept=".json" required>
                </p>
                <input
                    type="submit"
                    class="button button-primary"
                    value="Import Game"
                    onclick="return confirm('Importing will override your existing game options. Existing posts will not be deleted. Are you sure you want to continue?')"
                >
            </form>
        </div>

    </div>
</div>
