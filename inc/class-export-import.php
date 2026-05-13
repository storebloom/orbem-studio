<?php

namespace OrbemStudio;

use OrbemStudio\Menu;

/**
 * Game Export/Import functionality.
 */
class Export_Import
{
    private object $plugin;

    private array $post_types = [
        'explore-area',
        'explore-point',
        'explore-character',
        'explore-cutscene',
        'explore-enemy',
        'explore-weapon',
        'explore-magic',
        'explore-mission',
        'explore-sign',
        'explore-minigame',
        'explore-explainer',
        'explore-wall',
        'explore-communicate',
    ];

    public function __construct(object $plugin)
    {
        $this->plugin = $plugin;
    }

    /**
     * Handle game export.
     *
     * @action admin_init
     */
    public function handleExport(): void
    {
        if (
            !isset($_POST['orbem_action']) ||
            'export' !== $_POST['orbem_action'] ||
            !isset($_POST['orbem_export_nonce']) ||
            !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['orbem_export_nonce'])), 'orbem_export_game') ||
            !current_user_can('manage_options')
        ) {
            return;
        }

        $export_data = [
            'version'     => $this->plugin->version ?? '1.0.0',
            'exported_at' => current_time('mysql'),
            'site_url'    => get_site_url(),
            'options'     => $this->exportOptions(),
            'posts'       => $this->exportPosts(),
        ];

        $filename = 'orbem-game-' . sanitize_title(get_bloginfo('name')) . '-' . gmdate('Y-m-d') . '.json';
        $json     = wp_json_encode($export_data, JSON_PRETTY_PRINT);

        header('Content-Type: application/json');
        header('Content-Disposition: attachment; filename=' . $filename);
        header('Content-Length: ' . strlen($json));
        header('Cache-Control: no-cache, no-store, must-revalidate');
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
        echo $json;
        exit;
    }

    /**
     * Handle game import.
     *
     * @action admin_init
     */
    public function handleImport(): void
    {
        if (
            !isset($_POST['orbem_action']) ||
            'import' !== $_POST['orbem_action'] ||
            !isset($_POST['orbem_import_nonce']) ||
            !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['orbem_import_nonce'])), 'orbem_import_game') ||
            !current_user_can('manage_options') ||
            !isset($_FILES['orbem_import_file'])
        ) {
            return;
        }

        set_time_limit(0);
        ini_set('memory_limit', '512M');

        $file = $_FILES['orbem_import_file'];

        if (UPLOAD_ERR_OK !== $file['error']) {
            wp_safe_redirect(add_query_arg('import_error', urlencode('File upload failed.'), admin_url('admin.php?page=orbem-studio-export-import')));
            exit;
        }

        $json = file_get_contents($file['tmp_name']);

        if (false === $json) {
            wp_safe_redirect(add_query_arg('import_error', urlencode('Could not read file.'), admin_url('admin.php?page=orbem-studio-export-import')));
            exit;
        }

        $data = json_decode($json, true);

        if (json_last_error() !== JSON_ERROR_NONE || !isset($data['posts']) || !isset($data['options'])) {
            wp_safe_redirect(add_query_arg('import_error', urlencode('Invalid file format.'), admin_url('admin.php?page=orbem-studio-export-import')));
            exit;
        }

        $this->importOptions($data['options']);
        $this->importPosts($data['posts']);

        wp_safe_redirect(add_query_arg('import_success', '1', admin_url('admin.php?page=orbem-studio-export-import')));
        exit;
    }

    /**
     * Export all game options.
     */
    private function exportOptions(): array
    {
        $options      = [];
        $game_options = array_keys(Menu::getGameOptionSettings());

        foreach ($game_options as $option_key) {
            $options[$option_key] = get_option($option_key, '');
        }

        return $options;
    }

    /**
     * Export all game posts with meta and featured images.
     */
    private function exportPosts(): array
    {
        $posts = get_posts([
            'post_type'      => $this->post_types,
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'no_found_rows'  => true,
        ]);

        $export_posts = [];

        foreach ($posts as $post) {
            $meta       = get_post_meta($post->ID);
            $clean_meta = [];
            $image_urls = [];

            foreach ($meta as $key => $values) {
                if (str_starts_with($key, '_')) {
                    continue;
                }

                $value            = maybe_unserialize($values[0]);
                $clean_meta[$key] = $value;

                $this->collectImageUrls($value, $image_urls);
            }

            $thumbnail_url = get_the_post_thumbnail_url($post->ID, 'full') ?: '';

            if (!empty($thumbnail_url) && !in_array($thumbnail_url, $image_urls, true)) {
                $image_urls[] = $thumbnail_url;
            }

            $export_posts[] = [
                'post_title'    => $post->post_title,
                'post_name'     => $post->post_name,
                'post_type'     => $post->post_type,
                'post_status'   => $post->post_status,
                'post_content'  => $post->post_content,
                'meta'          => $clean_meta,
                'thumbnail_url' => $thumbnail_url,
                'image_urls'    => array_unique(array_filter($image_urls)),
            ];
        }

        return $export_posts;
    }

    /**
     * Recursively collect image URLs from a meta value.
     */
    private function collectImageUrls(mixed $value, array &$urls): void
    {
        if (is_string($value) && $this->isImageUrl($value)) {
            $urls[] = $value;
        } elseif (is_array($value)) {
            foreach ($value as $item) {
                $this->collectImageUrls($item, $urls);
            }
        }
    }

    /**
     * Check if a string is an image URL from the uploads directory.
     */
    private function isImageUrl(string $value): bool
    {
        if (empty($value)) {
            return false;
        }

        if (
            !str_contains($value, '/wp-content/uploads/') &&
            !str_contains($value, wp_upload_dir()['baseurl'])
        ) {
            return false;
        }

        return (bool) preg_match('/\.(jpg|jpeg|png|gif|webp|svg)(\?.*)?$/i', $value);
    }

    /**
     * Import game options -- overrides existing.
     */
    private function importOptions(array $options): void
    {
        $game_options = array_keys(Menu::getGameOptionSettings());

        foreach ($options as $key => $value) {
            if (in_array($key, $game_options, true) && 'explore_game_page' !== $key) {
                update_option(sanitize_key($key), $value);
            }
        }
    }

    /**
     * Import posts -- only adds new, never deletes existing.
     */
    private function importPosts(array $posts): void
    {
        require_once ABSPATH . 'wp-admin/includes/file.php';
        require_once ABSPATH . 'wp-admin/includes/media.php';
        require_once ABSPATH . 'wp-admin/includes/image.php';

        foreach ($posts as $post_data) {
            $post_name = sanitize_title($post_data['post_name'] ?? '');
            $post_type = sanitize_key($post_data['post_type'] ?? '');

            if (empty($post_name) || !in_array($post_type, $this->post_types, true)) {
                continue;
            }

            $existing = get_posts([
                'name'           => $post_name,
                'post_type'      => $post_type,
                'post_status'    => 'publish',
                'posts_per_page' => 1,
                'no_found_rows'  => true,
                'fields'         => 'ids',
            ]);

            if (!empty($existing)) {
                continue;
            }

            $post_id = wp_insert_post([
                'post_title'   => sanitize_text_field($post_data['post_title'] ?? ''),
                'post_name'    => $post_name,
                'post_type'    => $post_type,
                'post_status'  => 'publish',
                'post_content' => wp_kses_post($post_data['post_content'] ?? ''),
            ]);

            if (is_wp_error($post_id) || !$post_id) {
                continue;
            }

            // Import all images first and build URL map
            $url_map    = [];
            $image_urls = $post_data['image_urls'] ?? [];

            // Ensure thumbnail is in the list
            if (
                !empty($post_data['thumbnail_url']) &&
                !in_array($post_data['thumbnail_url'], $image_urls, true)
            ) {
                $image_urls[] = $post_data['thumbnail_url'];
            }

            foreach ($image_urls as $old_url) {
                $new_url = $this->importImageFromUrl($old_url, $post_id);
                if (!empty($new_url)) {
                    $url_map[$old_url] = $new_url;
                }
            }

            // Import meta with URL rewriting
            if (!empty($post_data['meta']) && is_array($post_data['meta'])) {
                foreach ($post_data['meta'] as $meta_key => $meta_value) {
                    $rewritten = $this->rewriteUrls($meta_value, $url_map);
                    update_post_meta($post_id, sanitize_key($meta_key), $rewritten);
                }
            }

            // Set featured image using attachment ID from new URL
            if (!empty($post_data['thumbnail_url'])) {
                $new_thumbnail = $url_map[$post_data['thumbnail_url']] ?? '';
                if (!empty($new_thumbnail)) {
                    $attachment_id = attachment_url_to_postid($new_thumbnail);
                    if ($attachment_id) {
                        set_post_thumbnail($post_id, $attachment_id);
                    }
                }
            }
        }
    }

    /**
     * Import an image from a URL into the media library and return the new local URL.
     */
    private function importImageFromUrl(string $url, int $post_id): string
    {
        // Skip existing check on import -- URLs from different sites won't match
        $tmp = download_url($url);

        if (is_wp_error($tmp)) {
            return '';
        }

        $filename   = basename(wp_parse_url($url, PHP_URL_PATH));
        $file_array = [
            'name'     => $filename,
            'tmp_name' => $tmp,
        ];

        $attachment_id = media_handle_sideload($file_array, $post_id);

        if (is_wp_error($attachment_id)) {
            wp_delete_file($tmp);
            return '';
        }

        $new_url = wp_get_attachment_url($attachment_id);

        return $new_url ?: '';
    }

    /**
     * Recursively rewrite old image URLs to new local URLs in meta values.
     */
    private function rewriteUrls(mixed $value, array $url_map): mixed
    {
        if (is_string($value)) {
            return $url_map[$value] ?? $value;
        }

        if (is_array($value)) {
            foreach ($value as $key => $item) {
                $value[$key] = $this->rewriteUrls($item, $url_map);
            }
        }

        return $value;
    }
}