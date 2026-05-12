<?php
if ( ! defined( 'ABSPATH' ) ) exit;
?>
<div class="wrap">
    <h1>Export / Import Game</h1>

    <?php if (isset($_GET['import_success'])) : ?>
        <div class="notice notice-success">
            <p>Game imported successfully.</p>
        </div>
    <?php endif; ?>

    <?php if (isset($_GET['import_error'])) : ?>
        <div class="notice notice-error">
            <p>Import failed: <?php echo esc_html(urldecode($_GET['import_error'])); ?></p>
        </div>
    <?php endif; ?>

    <div style="display:flex; gap:40px; margin-top:20px;">

        <div style="flex:1; background:#fff; padding:24px; border:1px solid #ddd; border-radius:6px;">
            <h2 style="margin-top:0;">Export Game</h2>
            <p>Export your entire game including all assets and settings to a single JSON file. Use this to back up your game or move it to another site.</p>
            <form method="post">
                <?php wp_nonce_field('orbem_export_game', 'orbem_export_nonce'); ?>
                <input type="hidden" name="orbem_action" value="export">
                <input type="submit" class="button button-primary" value="Export Game">
            </form>
        </div>

        <div style="flex:1; background:#fff; padding:24px; border:1px solid #ddd; border-radius:6px;">
            <h2 style="margin-top:0;">Import Game</h2>
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