<?php
/**
 * DevMode
 *
 * @package OrbemGameEngine
 */

namespace OrbemGameEngine;

use OrbemGameEngine\Meta_Box;

/**
 * DevMode Class
 *
 * @package OrbemGameEngine
 */
class Dev_Mode
{

    /**
     * Theme instance.
     *
     * @var object
     */
    public $plugin;

    /**
     * Class constructor.
     *
     * @param object $plugin Plugin class.
     */
    public function __construct($plugin)
    {
        $this->plugin = $plugin;
    }

    /**
     * Register API field.
     *
     * @action rest_api_init
     */
    public function restRoutes()
    {
        $namespace = 'orbemorder/v1';

        // Set item position.
        register_rest_route($namespace, '/set-item-position/', array(
            'methods' => 'POST',
            'callback' => [$this, 'setItemPosition'],
        ));

        // Set item size.
        register_rest_route($namespace, '/set-item-size/', array(
            'methods' => 'POST',
            'callback' => [$this, 'setItemSize'],
        ));

        // Get addition fields by posttype.
        register_rest_route($namespace, '/get-new-fields/', array(
            'methods' => 'POST',
            'callback' => [$this, 'getNewFields'],
        ));

        // Create new whatever.
        register_rest_route($namespace, '/add-new/', array(
            'methods' => 'POST',
            'callback' => [$this, 'addNew'],
        ));
    }

    public function setItemPosition($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $item = intval($data['id']);
        $left = intval($data['left']);
        $top = intval($data['top']);
        $height = intval($data['height']);
        $width = intval($data['width']);
        $meta = sanitize_text_field($data['meta']);
        $walking_path = sanitize_text_field($data['walkingPath']);

        if (false === empty($meta) && 'true' !== $walking_path) {
            update_post_meta($item, $meta, ['top' => $top, 'left' => $left, 'height' => $height, 'width' => $width]);
        } elseif ('true' === $walking_path) {
            $current_walking_path = get_post_meta($item, 'explore-path', true);

            if (false === empty($current_walking_path)) {
                $current_walking_path[] = ['top' => $top, 'left' => $left];
            } else {
                $current_walking_path = [['top' => $top, 'left' => $left]];
            }
            update_post_meta($item, 'explore-path', $current_walking_path);

        } else {
            update_post_meta($item, 'explore-top', $top);
            update_post_meta($item, 'explore-left', $left);
        }

        wp_send_json_success('success');
    }

    public function setItemSize($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        // Process the data (e.g., register the user)
        // Assuming you expect 'username' and 'email' in the JSON data
        $item = intval($data['id']);
        $height = intval($data['height']);
        $width = intval($data['width']);
        $meta = sanitize_text_field($data['meta']);

        if (false === empty($meta)) {
            $current_meta = get_post_meta($item, $meta, true);
            $current_meta['height'] = $height;
            $current_meta['width'] = $width;
            update_post_meta($item, $meta, $current_meta);
        } else {
            update_post_meta($item, 'explore-height', $height);
            update_post_meta($item, 'explore-width', $width);
        }

        wp_send_json_success('success');
    }

    public function getNewFields($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $post_type = sanitize_text_field(wp_unslash($data['type']));
        $meta_box = new Meta_Box($this->plugin);


        ob_start();
        $meta_box->explore_point_box($post_type);

        wp_send_json_success(ob_get_clean());
    }

    public function addNew($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new \OrbemGameEngine\WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $post_type = sanitize_text_field(wp_unslash($data['type']));
        $area = sanitize_text_field(wp_unslash($data['area']));
        $post_values = $data['values'];

        $post_id = wp_insert_post(['post_status' => 'publish', 'post_type' => $post_type, 'post_title' => $post_values['title']], true);

        if (false === is_wp_error($post_id) && false === empty($post_values) && true === is_array($post_values)) {
            $attachment_id = attachment_url_to_postid($post_values['featured-image']);

            if (false === empty($attachment_id)) {
                set_post_thumbnail($post_id, $attachment_id);
            }

            update_post_meta($post_id, 'explore-area', $area);

            unset($post_values['featured-image']);
            unset($post_values['title']);

            foreach ($post_values as $key => $value) {
                update_post_meta($post_id, $key, $value);
            }
        } else {
            wp_send_json_error('create failed');
        }

        wp_send_json_success('success');
    }

    public static function getTriggers($items, $cutscenes, $missions) {
        $things_to_check = array_merge($items, $cutscenes, $missions);
        $key = '';
        $trigger = [];

        foreach ($things_to_check as $thing) {
            switch ($thing->post_type) {
                case 'explore-point':
                    $key = 'materialize-item-trigger';
                    break;
                case 'explore-cutscene':
                    $key = 'explore-cutscene-trigger';
                    break;
                case 'explore-explainer':
                    $key = 'explore-explainer-trigger';
                    break;
                case 'explore-character':
                    $key = 'explore-path-trigger';
                    break;
                case 'explore-enemy':
                    $key = 'explore-path-trigger';
                    break;
                case 'explore-mission':
                    $key = 'explore-mission-trigger';
                    break;
            }

            $value = get_post_meta($thing->ID, $key, true);

            if (false === empty($value) && (true === isset($value['height']) && '0' !== $value['height'])) {
                $trigger_array = [
                    'post_type' => $key,
                    'post_name' => $thing->post_name . str_replace( 'explore-', '-', $key),
                    'ID' => $thing->ID . '-t',
                ];

                $trigger[] = new \WP_Post((object)$trigger_array);
            }
        }

        return $trigger;
    }

    /**
     * Get the dev mode html.
     * @param $item_list
     * @return false|string
     */
    public static function getDevModeHTML($item_list)
    {
        ob_start();
        ?>
        <div class="dev-mode-menu-toggle">DEVMODE</div>
        <div class="dev-mode-menu">
            <div id="new-addition">
                <div class="addition-content">
                    <?php include plugin_dir_path(__FILE__) . '../templates/components/new-additions.php'; ?>
                </div>
            </div>
            <?php include  plugin_dir_path(__FILE__) . '../templates/components/finder-list.php'; ?>
            <?php include  plugin_dir_path(__FILE__) . '../templates/components/wall-builder.php'; ?>
            <?php include  plugin_dir_path(__FILE__) . '../templates/components/pinpoint.php'; ?>
        </div>
        <?php
        return ob_get_clean();
    }
}