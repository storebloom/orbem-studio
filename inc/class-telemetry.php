<?php
/**
 * Telemetry
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

/**
 * Telemtry Class
 *
 * @package OrbemStudio
 */
class Telemetry
{

    /**
     * Theme instance.
     *
     * @var Plugin
     */
    public Plugin $plugin;

    /**
     * Class constructor.
     *
     * @param Plugin $plugin Plugin class.
     */
    public function __construct(Plugin $plugin)
    {
        $this->plugin = $plugin;
    }

    /**
     * Send an anonymous telemetry event to orbem.studio.
     *
     * Canonical signature:
     * HMAC_SHA256( install_id + "\n" + raw_json_body, ORBEM_TLM_SECRET )
     *
     * @param string $event
     * @param array $meta
     * @return void
     */
    public function orbemTlmEvent(string $event, array $meta = []): void
    {
        // Respect opt-out.
        if (!get_option('orbem_telemetry_enabled', true)) {
            return;
        }

        // Minimal allowlist.
        static $allowed = [
            'wizard_started',
            'wizard_mode_selected',
            'starter_game_generated',
            'play_page_assigned',
            'game_play_viewed',
        ];

        if (!in_array($event, $allowed, true)) {
            return;
        }

        // Ensure install id exists.
        $install_id = get_option('orbem_install_id');

        if (!$install_id || !is_string($install_id)) {
            $install_id = wp_generate_uuid4();

            update_option('orbem_install_id', $install_id, false);
        }

        // Basic UUID format guard.
        if (!preg_match('/^[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i', $install_id)) {
            return;
        }

        // Prepare payload.
        $payload = [
            'event' => $event,
            'plugin_version' => defined('ORBEM_STUDIO_VERSION') ? ORBEM_STUDIO_VERSION : null,
            'meta' => (object) $meta,
        ];

        // Encode to raw JSON.
        $body = wp_json_encode($payload, JSON_UNESCAPED_SLASHES);

        if (!is_string($body) || $body === '' || strlen($body) > 8192) {
            return;
        }

        // Sign.
        if (!defined('ORBEM_TLM_SECRET') || !is_string(ORBEM_TLM_SECRET) || ORBEM_TLM_SECRET === '') {
            return;
        }

        $sig = hash_hmac('sha256', $install_id . "\n" . $body, ORBEM_TLM_SECRET);

        // Send.
        wp_remote_post(defined('ORBEM_TLM_ENDPOINT') ? ORBEM_TLM_ENDPOINT : '', [
            'timeout' => 2,
            'blocking' => false,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Orbem-Install-Id' => $install_id,
                'X-Orbem-Signature' => 'sha256=' . $sig,
            ],
            'body' => $body,
        ]);
    }

    /**
     * Send a telemetry event only once (per WP site / install).
     *
     * @param string $event
     * @param array $meta
     * @param string $scope_key Optional extra scoping (e.g. game id, page id).
     */
    public function orbemTlmEventOnce(string $event, array $meta = [], string $scope_key = ''): void
    {
        $install_id = get_option('orbem_install_id');

        if (!$install_id || !is_string($install_id)) {
            $install_id = wp_generate_uuid4();
            update_option('orbem_install_id', $install_id, false);
        }

        // Unique key per install + event (+ optional scope)
        $key = 'orbem_tlm_sent_' . md5($install_id . '|' . $event . '|' . $scope_key);

        if (get_option($key)) {
            return;
        }

        $this->orbemTlmEvent($event, $meta);

        // Mark as sent.
        update_option($key, 1, false);
    }
}