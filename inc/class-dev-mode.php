<?php
/**
 * DevMode
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

use WP_Error;
use WP_Post;

/**
 * DevMode Class
 *
 * @package OrbemStudio
 */
class Dev_Mode
{

    /**
     * Theme instance.
     *
     * @var object
     */
    public object $plugin;

    /**
     * Class constructor.
     *
     * @param object $plugin Plugin class.
     */
    public function __construct(object $plugin)
    {
        $this->plugin = $plugin;
    }

    /**
     * Register API field.
     *
     * @action rest_api_init
     */
    public function restRoutes(): void
    {
        $namespace = 'orbemorder/v1';

        // Set item position.
        register_rest_route($namespace, '/set-item-position/', array(
            'methods' => 'POST',
            'callback' => [$this, 'setItemPosition'],
            'permission_callback' => '__return_true',
        ));

        // Set item size.
        register_rest_route($namespace, '/set-item-size/', array(
            'methods' => 'POST',
            'callback' => [$this, 'setItemSize'],
            'permission_callback' => '__return_true',
        ));

        // Get addition fields by post type.
        register_rest_route($namespace, '/get-new-fields/', array(
            'methods' => 'POST',
            'callback' => [$this, 'getNewFields'],
            'permission_callback' => '__return_true',
        ));

        // Create new whatever.
        register_rest_route($namespace, '/add-new/', array(
            'methods' => 'POST',
            'callback' => [$this, 'addNew'],
            'permission_callback' => '__return_true',
        ));
    }

    /**
     * Change position of item.
     * @param $request
     * @return WP_Error|void
     */
    public function setItemPosition($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $item = intval($data['id']);
        $left = intval($data['left']);
        $top = intval($data['top']);
        $height = intval($data['height']);
        $width = intval($data['width']);
        $meta = sanitize_text_field($data['meta']);
        $walking_path = sanitize_text_field($data['walkingPath']);

        if (false === empty($meta) && 'true' !== $walking_path) {
            $current_meta = get_post_meta($item, $meta, true);

            if (false === empty($current_meta)) {
                $current_meta['top'] = $top;
                $current_meta['left'] = $left;
                $current_meta['height'] = $height;
                $current_meta['width'] = $width;

                update_post_meta($item, $meta, $current_meta);
            }
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

    /**
     * Set item size front end.
     * @param $request
     * @return WP_Error|void
     */
    public function setItemSize($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

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

    /**
     * Get fields.
     * @param $request
     * @return WP_Error|void
     */
    public function getNewFields($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $post_type = sanitize_text_field(wp_unslash($data['type']));
        $meta_box = new Meta_Box($this->plugin);


        ob_start();
        $meta_box->explore_point_box($post_type);

        wp_send_json_success(ob_get_clean());
    }

    /**
     * Add new item.
     * @param $request
     * @return WP_Error|void
     */
    public function addNew($request)
    {
        // Get the JSON string from the request body
        $json_string = $request->get_body();

        // Decode the JSON string into a PHP associative array
        $data = json_decode($json_string, true);

        // Handle errors in decoding JSON
        if (json_last_error() !== JSON_ERROR_NONE) {
            return new WP_Error('json_decode_error', 'Invalid JSON data', array('status' => 400));
        }

        $post_type = sanitize_text_field(wp_unslash($data['type']));
        $area = sanitize_text_field(wp_unslash($data['area']));
        $area = false === empty($area) ? $area : get_user_meta(get_current_user_id(), 'current_location');
        $post_values = $data['values'];
        $post_id = wp_insert_post(['post_status' => 'publish', 'post_type' => $post_type, 'post_title' => sanitize_text_field(wp_unslash($post_values['title']))], true);

        if (false === is_wp_error($post_id) && false === empty($post_values) && true === is_array($post_values)) {
            $attachment_id = attachment_url_to_postid(esc_url($post_values['featured-image']));

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

        wp_send_json_success($post_id);
    }

    /**
     * Get dev mode triggers.
     * @param $items
     * @param $cutscenes
     * @param $missions
     * @return array
     */
    public static function getTriggers($items, $cutscenes, $missions): array
    {
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
                case 'explore-enemy':
                case 'explore-character':
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

                $trigger[] = new WP_Post((object)$trigger_array);
            }
        }

        return $trigger;
    }

    /**
     * Get the dev mode html.
     * @param $item_list
     * @return false|string
     */
    public static function getDevModeHTML($item_list): false|string
    {
        $post_types =  [
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
        'explore-communicate'
        ];

        ob_start();
        ?>
        <div class="right-bottom-devmode">
            <div class="dev-mode-menu-toggle">DEVMODE</div>
        </div>
        <div class="dev-mode-menu">
            <div id="new-addition">
                <div class="addition-content">
                    <?php include plugin_dir_path(__FILE__) . '../templates/components/new-additions.php'; ?>
                </div>
            </div>
            <?php include plugin_dir_path(__FILE__) . '../templates/components/wall-builder.php'; ?>
            <?php include plugin_dir_path(__FILE__) . '../templates/components/pinpoint.php'; ?>
        </div>
        <?php
        return ob_get_clean();
    }
}