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
            'css'         => get_option('explore_custom_css', ''),
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
     * Handle the itch.io export -- a zip containing a standalone index.html of the live game.
     *
     * @action admin_init
     */
    public function handleItchExport(): void
    {
        if (
            !isset($_POST['orbem_action'], $_POST['orbem_itch_nonce']) ||
            'export_itch' !== sanitize_text_field(wp_unslash($_POST['orbem_action'])) ||
            !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['orbem_itch_nonce'])), 'orbem_export_itch') ||
            !current_user_can('manage_options')
        ) {
            return;
        }

        if (!class_exists('ZipArchive')) {
            $this->itchExportError(__('The PHP zip extension (ZipArchive) is not available on this server.', 'orbem-studio'));
        }

        set_time_limit(0);

        $index = $this->buildGameIndex();

        if ('' !== $index['error']) {
            $this->itchExportError($index['error']);
        }

        $index_html = $index['html'];
        $filename   = 'orbem-itch-' . sanitize_title(get_bloginfo('name')) . '-' . gmdate('Y-m-d') . '.zip';
        $tmp_file   = wp_tempnam('orbem-itch');

        if (empty($tmp_file)) {
            $this->itchExportError(__('Could not create a temporary file for the zip.', 'orbem-studio'));
        }

        $zip = new \ZipArchive();

        if (true !== $zip->open($tmp_file, \ZipArchive::CREATE | \ZipArchive::OVERWRITE)) {
            wp_delete_file($tmp_file);
            $this->itchExportError(__('Could not create the zip archive.', 'orbem-studio'));
        }

        $zip->addFromString('index.html', $index_html);
        $zip->close();

        // phpcs:ignore WordPress.WP.AlternativeFunctions -- reading back the zip we just wrote to stream it.
        $zip_contents = file_get_contents($tmp_file);
        wp_delete_file($tmp_file);

        if (false === $zip_contents) {
            $this->itchExportError(__('Could not read the generated zip archive.', 'orbem-studio'));
        }

        nocache_headers();
        header('Content-Type: application/zip');
        header('Content-Disposition: attachment; filename=' . $filename);
        header('Content-Length: ' . strlen($zip_contents));
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- binary zip payload.
        echo $zip_contents;
        exit;
    }

    /**
     * Redirect back to the export screen with an error message.
     */
    private function itchExportError(string $message): void
    {
        wp_safe_redirect(
            add_query_arg(
                'itch_error',
                rawurlencode($message),
                admin_url('admin.php?page=orbem-studio-export-import')
            )
        );
        exit;
    }

    /**
     * Build the standalone index.html document for the configured game page.
     *
     * Shared by the itch.io and Steam exports.
     *
     * @return array{html: string, error: string}
     */
    public function buildGameIndex(): array
    {
        $game_page = get_option('explore_game_page', '');
        $page      = empty($game_page) ? null : get_page_by_path($game_page);

        if (!$page instanceof \WP_Post) {
            return [
                'html'  => '',
                'error' => __('No game page is set. Choose one under Game Options -- Page For Game.', 'orbem-studio'),
            ];
        }

        $game_url = (string) get_permalink($page);

        if (empty($game_url)) {
            return [
                'html'  => '',
                'error' => __('Could not determine the game page URL.', 'orbem-studio'),
            ];
        }

        $html = $this->fetchGamePageHtml($game_url);

        if (empty($html)) {
            return [
                'html'  => '',
                'error' => sprintf(
                    /* translators: %s: URL of the game page. */
                    __('Could not load the game page. Make sure %s is published and publicly reachable.', 'orbem-studio'),
                    $game_url
                ),
            ];
        }

        return [
            'html'  => $this->buildStandaloneDocument($html, $game_url, $page->post_title),
            'error' => '',
        ];
    }

    /**
     * Fetch the rendered game page exactly as a logged out player sees it.
     */
    private function fetchGamePageHtml(string $url): string
    {
        $request_url = add_query_arg('orbem_static_export', '1', $url);
        $args        = [
            'timeout'     => 60,
            'redirection' => 3,
            'headers'     => ['Cache-Control' => 'no-cache'],
        ];

        $response = wp_remote_get($request_url, $args);

        // Loopback requests to this same site often fail on local/self-signed certs.
        if (is_wp_error($response) && $this->isSameHost($url)) {
            $args['sslverify'] = false;
            $response          = wp_remote_get($request_url, $args);
        }

        if (is_wp_error($response) || 200 !== wp_remote_retrieve_response_code($response)) {
            return '';
        }

        return (string) wp_remote_retrieve_body($response);
    }

    /**
     * Check that a URL points back at this site.
     */
    private function isSameHost(string $url): bool
    {
        $host = wp_parse_url($url, PHP_URL_HOST);
        $home = wp_parse_url(home_url(), PHP_URL_HOST);

        return !empty($host) && !empty($home) && strtolower($host) === strtolower($home);
    }

    /**
     * Turn the fetched markup into a standalone HTML document.
     *
     * Stylesheets and scripts that live on this site are inlined so the file plays
     * on its own. Media and REST calls keep their absolute URLs back to this site.
     */
    private function buildStandaloneDocument(string $html, string $game_url, string $title): string
    {
        $html = $this->absolutizeUrls($html, $game_url);
        $html = $this->inlineStyles($html);
        $html = $this->inlineScripts($html);

        // A theme or filter may already have produced a full document -- leave it alone.
        if (false !== stripos($html, '<html')) {
            return $html;
        }

        // The game template prints head markup followed by <main>, without a document wrapper.
        $split = stripos($html, '<main');
        $head  = false === $split ? '' : substr($html, 0, $split);
        $body  = false === $split ? $html : substr($html, $split);

        return '<!DOCTYPE html>' . "\n"
            . '<html lang="' . esc_attr(str_replace('_', '-', get_locale())) . '">' . "\n"
            . '<head>' . "\n"
            . '<meta charset="utf-8">' . "\n"
            . '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">' . "\n"
            . '<title>' . esc_html($title ?: get_bloginfo('name')) . '</title>' . "\n"
            . '<base href="' . esc_url($game_url) . '">' . "\n"
            . $head . "\n"
            . '<style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;}</style>' . "\n"
            . '</head>' . "\n"
            . '<body>' . "\n"
            . $body . "\n"
            . '</body>' . "\n"
            . '</html>';
    }

    /**
     * Rewrite every relative URL in the markup to an absolute URL on this site.
     */
    private function absolutizeUrls(string $html, string $base_url): string
    {
        $attributes = 'src|href|poster|action|data-src|data-map|data-image';

        $html = (string) preg_replace_callback(
            '/\s(' . $attributes . ')=(["\'])([^"\']*)\2/i',
            function (array $match) use ($base_url): string {
                return ' ' . $match[1] . '=' . $match[2] . $this->absoluteUrl($match[3], $base_url) . $match[2];
            },
            $html
        );

        $html = (string) preg_replace_callback(
            '/\ssrcset=(["\'])([^"\']*)\1/i',
            function (array $match) use ($base_url): string {
                $sources = array_map(
                    function (string $source) use ($base_url): string {
                        $parts = preg_split('/\s+/', trim($source), 2) ?: [''];
                        $parts[0] = $this->absoluteUrl($parts[0], $base_url);

                        return implode(' ', $parts);
                    },
                    explode(',', $match[2])
                );

                return ' srcset=' . $match[1] . implode(', ', $sources) . $match[1];
            },
            $html
        );

        // Only touch url() inside style blocks and style attributes -- never inside scripts.
        $html = (string) preg_replace_callback(
            '#<style\b[^>]*>(.*?)</style>#is',
            function (array $match) use ($base_url): string {
                return str_replace($match[1], $this->absolutizeCssUrls($match[1], $base_url), $match[0]);
            },
            $html
        );

        return (string) preg_replace_callback(
            '/\sstyle=(["\'])([^"\']*)\1/i',
            function (array $match) use ($base_url): string {
                return ' style=' . $match[1] . $this->absolutizeCssUrls($match[2], $base_url) . $match[1];
            },
            $html
        );
    }

    /**
     * Rewrite url() references inside CSS to absolute URLs.
     */
    private function absolutizeCssUrls(string $css, string $base_url): string
    {
        return (string) preg_replace_callback(
            '/url\(\s*(["\']?)([^"\')]+)\1\s*\)/i',
            function (array $match) use ($base_url): string {
                return 'url(' . $match[1] . $this->absoluteUrl($match[2], $base_url) . $match[1] . ')';
            },
            $css
        );
    }

    /**
     * Resolve a single URL against the page it was found on.
     */
    private function absoluteUrl(string $url, string $base_url): string
    {
        $url = trim($url);

        if (
            '' === $url ||
            str_starts_with($url, '#') ||
            preg_match('#^(https?:|data:|blob:|mailto:|tel:|javascript:|about:)#i', $url)
        ) {
            return $url;
        }

        $home = wp_parse_url(home_url());

        if (empty($home['scheme']) || empty($home['host'])) {
            return $url;
        }

        if (str_starts_with($url, '//')) {
            return $home['scheme'] . ':' . $url;
        }

        $origin = $home['scheme'] . '://' . $home['host'] . (isset($home['port']) ? ':' . $home['port'] : '');

        if (str_starts_with($url, '/')) {
            return $origin . $url;
        }

        $base_path = (string) wp_parse_url($base_url, PHP_URL_PATH);
        $directory = str_ends_with($base_path, '/') ? $base_path : dirname($base_path);

        return $origin . trailingslashit('/' === $directory ? '' : untrailingslashit($directory)) . $url;
    }

    /**
     * Inline every stylesheet that resolves to a file on this site.
     */
    private function inlineStyles(string $html): string
    {
        return (string) preg_replace_callback(
            '/<link\b[^>]*>/i',
            function (array $match): string {
                $tag = $match[0];

                if (!preg_match('/rel=(["\'])stylesheet\1/i', $tag) || !preg_match('/href=(["\'])([^"\']+)\1/i', $tag, $href)) {
                    return $tag;
                }

                $css = $this->readLocalAsset($href[2], 'css');

                // Leave the file linked if inlining it would break out of the style block.
                if ('' === $css || false !== stripos($css, '</style')) {
                    return $tag;
                }

                return '<style>' . $this->absolutizeCssUrls($css, $href[2]) . '</style>';
            },
            $html
        );
    }

    /**
     * Inline every script that resolves to a file on this site.
     */
    private function inlineScripts(string $html): string
    {
        return (string) preg_replace_callback(
            '#<script\b([^>]*)\ssrc=(["\'])([^"\']+)\2([^>]*)>\s*</script>#i',
            function (array $match): string {
                $js = $this->readLocalAsset($match[3], 'js');

                if ('' === $js) {
                    return $match[0];
                }

                // Keep type/id attributes, drop src and the now meaningless loading hints.
                $attributes = (string) preg_replace('/\s(defer|async)\b/i', '', $match[1] . $match[4]);

                return '<script' . $attributes . '>' . str_replace('</script', '<\/script', $js) . '</script>';
            },
            $html
        );
    }

    /**
     * Read a stylesheet or script from disk when the URL points at this WordPress install.
     *
     * Only .css and .js files inside the WordPress root or wp-content are ever read.
     */
    private function readLocalAsset(string $url, string $extension): string
    {
        $url  = (string) preg_replace('/[?#].*$/', '', trim($url));
        $roots = array_filter([
            realpath(WP_CONTENT_DIR),
            realpath(untrailingslashit(ABSPATH)),
        ]);

        if ('' === $url || empty($roots)) {
            return '';
        }

        $path = '';
        $map  = [
            untrailingslashit(content_url()) => WP_CONTENT_DIR,
            untrailingslashit(site_url())    => untrailingslashit(ABSPATH),
            untrailingslashit(home_url())    => untrailingslashit(ABSPATH),
        ];

        foreach ($map as $base_url => $base_dir) {
            if (str_starts_with($url, $base_url . '/')) {
                $path = $base_dir . substr($url, strlen($base_url));
                break;
            }
        }

        if ('' === $path || strtolower(pathinfo($path, PATHINFO_EXTENSION)) !== $extension) {
            return '';
        }

        $real = realpath($path);

        if (false === $real || !is_file($real) || !is_readable($real)) {
            return '';
        }

        $inside = false;

        foreach ($roots as $root) {
            if (str_starts_with($real, trailingslashit($root))) {
                $inside = true;
                break;
            }
        }

        if (false === $inside) {
            return '';
        }

        // phpcs:ignore WordPress.WP.AlternativeFunctions -- reading a local build asset to inline it.
        $contents = file_get_contents($real);

        return false === $contents ? '' : $contents;
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
        $this->importCss($data['css'] ?? '');

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
     * Import game options -- overrides existing.
     */
    private function importCss(string $css): void
    {
        if (false === empty($css)) {
            update_option('explore_custom_css', $css);
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