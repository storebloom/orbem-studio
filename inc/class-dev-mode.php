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
     * Plugin instance.
     *
     * @var object
     */
    public object $plugin;

    /**
     * Meta Box instance.
     *
     * @var object
     */
    public object $meta_box;

    /**
     * Class constructor.
     *
     * @param object $plugin Plugin class.
     */
    public function __construct(object $plugin, object $meta_box)
    {
        $this->plugin = $plugin;
        $this->meta_box = $meta_box;
    }

    /**
     * Register API field.
     *
     * @action rest_api_init
     */
    public function restRoutes(): void
    {
        $namespace = 'orbemorder/v1';

        // Callback that makes sure a user is an administrators on this site in order to access devmode features.
        $permission_callback = function () {
            return current_user_can('manage_options');
        };

        // Set item position.
        register_rest_route($namespace, '/set-item-position/', array(
            'methods' => 'POST',
            'callback' => [$this, 'setItemPosition'],
            'permission_callback' => $permission_callback
        ));

        // Set item size.
        register_rest_route($namespace, '/set-item-size/', array(
            'methods' => 'POST',
            'callback' => [$this, 'setItemSize'],
            'permission_callback' => $permission_callback
        ));

        // Get addition fields by post type.
        register_rest_route($namespace, '/get-new-fields/', array(
            'methods' => 'POST',
            'callback' => [$this, 'getNewFields'],
            'permission_callback' => $permission_callback
        ));

        // Create new whatever orbem studio post type. Requires administrator access.
        register_rest_route($namespace, '/add-new/', [
            'methods' => 'POST',
            'callback' => [$this, 'addNew'],
            'permission_callback' => $permission_callback
        ]);
    }

    /**
     * Change position of item.
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function setItemPosition(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data         = $request->get_json_params();
        $left         = isset($data['left']) ? intval($data['left']) : '';
        $top          = isset($data['top']) ? intval($data['top']) : '';
        $height       = isset($data['height']) ? intval($data['height']) : '';
        $width        = isset($data['width']) ? intval($data['width']) : '';
        $meta         = isset($data['meta']) ? sanitize_text_field($data['meta']) : '';
        $walking_path = isset($data['walkingPath']) ? sanitize_text_field($data['walkingPath']) : '';
        $item         = isset($data['id']) ? absint($data['id']) : 0;

        if ($item <= 0 || ! get_post($item) || !current_user_can('edit_post', $item)) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid item ID', 'orbem-studio'),
            ]);
        }

        // $walking_path is 'true' when recording multi walking path.
        if (false === empty($meta) && 'true' !== $walking_path) {
            if (!str_starts_with($meta, 'explore-')) {
                return rest_ensure_response([
                    'success' => false,
                    'data'    => esc_html__('Invalid meta key', 'orbem-studio'),
                ]);
            }

            $current_meta = get_post_meta($item, $meta, true);

            if (false === empty($current_meta)) {
                $current_meta['top']    = $top;
                $current_meta['left']   = $left;
                $current_meta['height'] = $height;
                $current_meta['width']  = $width;

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

        return rest_ensure_response([
                'success' => true,
                'data'    => esc_html__('success', 'orbem-studio'),
            ]);
    }

    /**
     * Set item size front end.
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function setItemSize(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data   = $request->get_json_params();
        $height = isset($data['height']) ? intval($data['height']) : '';
        $width  = isset($data['width']) ? intval($data['width']) : '';
        $meta   = isset($data['meta']) ? sanitize_text_field($data['meta']) : '';
        $item   = isset($data['id']) ? absint($data['id']) : 0;

        if ('' === $width || '' === $height || $item <= 0 || ! get_post($item) || !current_user_can('edit_post', $item)) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid item ID or missing data param', 'orbem-studio'),
            ]);
        }

        if (false === empty($meta)) {
            if (!str_starts_with($meta, 'explore-')) {
                return rest_ensure_response([
                    'success' => false,
                    'data'    => esc_html__('Invalid meta key', 'orbem-studio'),
                ]);
            }

            $current_meta           = get_post_meta($item, $meta, true);
            $current_meta['height'] = $height;
            $current_meta['width']  = $width;
            update_post_meta($item, $meta, $current_meta);
        } else {
            update_post_meta($item, 'explore-height', $height);
            update_post_meta($item, 'explore-width', $width);
        }

        return rest_ensure_response([
                'success' => true,
                'data'    => esc_html__('success', 'orbem-studio'),
            ]);
    }

    /**
     * Get fields.
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function getNewFields(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data      = $request->get_json_params();
        $post_type = isset($data['type']) ? sanitize_text_field(wp_unslash($data['type'])) : '';

        if (!str_starts_with($post_type, 'explore-')) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid post type', 'orbem-studio'),
            ]);
        }

        ob_start();

        $this->meta_box->explorePointBox($post_type);
        
        return rest_ensure_response([
            'success' => true,
            'data'    => ob_get_clean(),
        ]);
    }

    /**
     * Add new item.
     * @param \WP_REST_Request $request
     * @return \WP_REST_Response
     */
    public function addNew(\WP_REST_Request $request): \WP_REST_Response
    {
        $user   = wp_get_current_user();
        $userid = (int) $user->ID;

        // Endpoint intentionally accessible to all authenticated users.
        if (0 === $userid) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('User not authenticated', 'orbem-studio'),
            ]);
        }

        // Get request data.
        $data        = $request->get_json_params();
        $post_type   = isset($data['type']) ? sanitize_text_field(wp_unslash($data['type'])) : '';
        $area        = isset($data['area']) ? sanitize_text_field(wp_unslash($data['area'])) : '';
        $area        = false === empty($area) ? $area : get_user_meta($userid, 'current_location', true);
        $post_values = isset($data['values']) ? $data['values'] : '';

        if (true === empty($post_values) || false === is_array($post_values) || '' === $post_type || !str_starts_with($post_type, 'explore-')) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Invalid data point', 'orbem-studio'),
            ]);
        }

        $post_id = wp_insert_post(['post_status' => 'publish', 'post_type' => $post_type, 'post_title' => sanitize_text_field(wp_unslash($post_values['title']))], true);

        if (is_wp_error($post_id)) {
            return rest_ensure_response([
                'success' => false,
                'data'    => esc_html__('Post creation failed.', 'orbem-studio'),
            ]);
        }

        $attachment_id = false === empty($post_values['featured-image']) ? attachment_url_to_postid(esc_url_raw($post_values['featured-image'])) : '';

        if (false === empty($attachment_id)) {
            set_post_thumbnail($post_id, $attachment_id);
        }

        update_post_meta($post_id, 'explore-area', $area);

        // Remove this data. Not post meta values.
        unset($post_values['featured-image']);
        unset($post_values['title']);

        $allowed_meta_keys = array_keys($this->meta_box->getMetaData($post_type));

        foreach ($post_values as $key => $value) {
            if (in_array($key, $allowed_meta_keys, true)) {
                update_post_meta($post_id, $key, wp_unslash($value));
            }
        }

        return rest_ensure_response([
            'success' => true,
            'data'    => $post_id,
        ]);
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
        $trigger = [];

        if (is_array($items) && is_array($cutscenes) && is_array($missions)) {
            $things_to_check = array_merge($items, $cutscenes, $missions);

            foreach ($things_to_check as $thing) {
                $key = '';

                if (isset($thing->post_type) && isset($thing->ID) && isset($thing->post_name)) {
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
                        default:
                            continue 2;
                    }

                    $value = '' !== $key ? get_post_meta($thing->ID, $key, true) : '';

                    if (false === empty($value) && (true === isset($value['height']) && '0' !== $value['height'])) {
                        $trigger_array = [
                            'post_type' => $key,
                            'post_name' => $thing->post_name . str_replace('explore-', '-', $key),
                            'ID' => $thing->ID . '-t',
                        ];

                        $trigger[] = (object) $trigger_array;
                    }
                }
            }
        }

        return $trigger;
    }

    /**
     * Get the dev mode html.
     * @return false|string
     */
    public static function getDevModeHTML(): false|string
    {
        $user = wp_get_current_user();

        if (!current_user_can('manage_options')) {
            return '';
        }

        ob_start();
        ?>
        <div class="right-bottom-devmode">
            <div class="dev-mode-menu-toggle">DEVMODE</div>
        </div>

        <div class="dev-mode-menu">
            <div id="new-addition">
                <div class="addition-content">
                    <?php
                    $template = plugin_dir_path(__FILE__) . '../templates/components/new-additions.php';
                    if (file_exists($template)) {
                        include $template;
                    }
                    ?>
                </div>
            </div>

            <?php
            $wall_builder = plugin_dir_path(__FILE__) . '../templates/components/wall-builder.php';
            if ( file_exists($wall_builder) ) {
                include $wall_builder;
            }

            $pinpoint = plugin_dir_path(__FILE__) . '../templates/components/pinpoint.php';
            if (file_exists($pinpoint)) {
                include $pinpoint;
            }
            ?>
        </div>
        <?php
        return ob_get_clean();
    }
}