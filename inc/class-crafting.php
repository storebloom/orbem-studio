<?php
/**
 * Crafting: making things out of ingredients.
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

if ( ! defined( 'ABSPATH' ) ) exit;

class Crafting
{
    /** What can carry a recipe: what storage can keep. */
    public const CRAFTABLE = ['explore-point', 'explore-weapon', 'explore-ingredients'];

    public $plugin;

    public function __construct($plugin = null)
    {
        $this->plugin = $plugin;
    }

    /** How many of each ingredient a player holds, by slug. */
    public static function holding(int $user_id): array
    {
        $out = [];

        foreach ((array) (Shop::storageOf($user_id)['ingredients'] ?? []) as $entry) {
            $name = (string) ($entry['name'] ?? '');

            if ('' !== $name) {
                $out[$name] = ($out[$name] ?? 0) + max(1, (int) ($entry['count'] ?? 1));
            }
        }

        return $out;
    }

    /** A post's recipe: [slug => how many], or [] for something that is not crafted. */
    public static function recipeOf(int $post_id): array
    {
        $rows   = get_post_meta($post_id, 'explore-recipe', true);
        $recipe = [];

        foreach ((array) $rows as $row) {
            $slug   = sanitize_title((string) ($row['explore-ingredient'] ?? ''));
            $amount = (int) ($row['explore-amount'] ?? 0);

            if ('' !== $slug && 0 < $amount) {
                $recipe[$slug] = ($recipe[$slug] ?? 0) + $amount;
            }
        }

        return $recipe;
    }

    /** Everything that can be crafted, as the crafting menu shows it. */
    public static function recipes(int $user_id): array
    {
        $have  = self::holding($user_id);
        $posts = get_posts([
            'post_type'      => self::CRAFTABLE,
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'no_found_rows'  => true,
            'orderby'        => 'title',
            'order'          => 'ASC',
            // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
            'meta_query'     => [['key' => 'explore-recipe', 'compare' => 'EXISTS']],
        ]);

        $out = [];

        foreach ($posts as $post) {
            $recipe = self::recipeOf($post->ID);

            if (!$recipe) {
                continue;
            }

            $needs = [];
            $can   = true;

            foreach ($recipe as $slug => $amount) {
                $ingredient = get_page_by_path($slug, OBJECT, 'explore-ingredients');
                $held       = (int) ($have[$slug] ?? 0);
                $can        = $can && $held >= $amount;

                $needs[] = [
                    'slug'   => $slug,
                    'name'   => $ingredient ? $ingredient->post_title : $slug,
                    'image'  => $ingredient ? (string) get_the_post_thumbnail_url($ingredient->ID) : '',
                    'amount' => $amount,
                    'have'   => $held,
                ];
            }

            $out[] = [
                'id'        => $post->ID,
                'name'      => $post->post_title,
                'image'     => (string) get_the_post_thumbnail_url($post->ID),
                'needs'     => $needs,
                'craftable' => $can,
            ];
        }

        /** What the crafting menu lists for this player. */
        return array_values((array) apply_filters('orbem_craft_recipes', $out, $user_id));
    }

    /**
     * Make one thing: take its ingredients out of storage, put it in.
     *
     * @return array The answer the menu needs.
     */
    public static function craft(int $post_id, int $user_id): array
    {
        if ($user_id <= 0) {
            return ['success' => false, 'message' => __('You need to be signed in to craft anything.', 'orbem-studio')];
        }

        $post   = get_post($post_id);
        $recipe = $post && 'publish' === $post->post_status && in_array($post->post_type, self::CRAFTABLE, true) ? self::recipeOf($post_id) : [];

        if (!$recipe) {
            return ['success' => false, 'message' => __('That cannot be crafted.', 'orbem-studio')];
        }

        /** Whether this player may make this: true, or why not. */
        $allowed = apply_filters('orbem_can_craft', true, $post, $user_id);

        if (true !== $allowed) {
            return ['success' => false, 'message' => is_string($allowed) ? $allowed : __('That cannot be crafted.', 'orbem-studio')];
        }

        $have = self::holding($user_id);

        foreach ($recipe as $slug => $amount) {
            if ((int) ($have[$slug] ?? 0) < $amount) {
                return ['success' => false, 'message' => __('You do not have enough ingredients for that.', 'orbem-studio')];
            }
        }

        $storage = Shop::storageOf($user_id);

        foreach ($recipe as $slug => $amount) {
            $owed = $amount;

            foreach ($storage['ingredients'] as $index => $entry) {
                if ($owed <= 0 || ($entry['name'] ?? '') !== $slug) {
                    continue;
                }

                $count = max(1, (int) ($entry['count'] ?? 1));
                $taken = min($count, $owed);
                $owed -= $taken;

                if ($count - $taken > 0) {
                    $storage['ingredients'][$index]['count'] = $count - $taken;
                } else {
                    unset($storage['ingredients'][$index]);
                }
            }

            $storage['ingredients'] = array_values($storage['ingredients']);
        }

        update_user_meta($user_id, 'explore_storage', $storage);

        /** Where the made thing goes. */
        $delivered = apply_filters('orbem_craft_deliver', null, $post, $user_id);

        if (null === $delivered) {
            Shop::give($user_id, $post);
        }

        /** Something was crafted — for a plugin that keeps count. */
        do_action('orbem_crafted', $post_id, $user_id, $recipe);

        return [
            'success'   => true,
            'name'      => $post->post_title,
            'image'     => (string) get_the_post_thumbnail_url($post->ID, 'full'),
            'storage'   => Shop::storageHtml($user_id),
            'recipes'   => self::recipes($user_id),
            'delivered' => $delivered,
            'message'   => is_array($delivered) ? (string) ($delivered['message'] ?? '') : '',
        ];
    }


    /**
     * @action rest_api_init
     */
    public function registerRoutes(): void
    {
        register_rest_route('orbemorder/v1', '/crafting/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restRecipes'],
            'permission_callback' => 'is_user_logged_in',
        ]);

        register_rest_route('orbemorder/v1', '/crafting/craft/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restCraft'],
            'permission_callback' => 'is_user_logged_in',
        ]);
    }

    public function restRecipes(): \WP_REST_Response
    {
        return rest_ensure_response(['success' => true, 'recipes' => self::recipes(Explore::playerId())]);
    }

    public function restCraft(\WP_REST_Request $request): \WP_REST_Response
    {
        $data = (array) $request->get_json_params();

        return rest_ensure_response(self::craft((int) ($data['id'] ?? 0), Explore::playerId()));
    }
}