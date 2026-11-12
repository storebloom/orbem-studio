<?php
/**
 * Shops: somewhere to spend what you are carrying.
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

class Shop
{
    /** What may be sold. */
    public const SELLABLE = ['explore-point', 'explore-weapon', 'explore-gear', 'explore-ingredients'];

    /** Where a player's buying is remembered. */
    public const PLAYER_META = 'explore_shop_stock';

    public $plugin;

    public function __construct($plugin = null)
    {
        $this->plugin = $plugin;
    }

    // Reading a shop

    /**
     * A shop's shelves as one player finds them right now.
     *
     * @return array{shop: int, greeting: string, items: array}|null
     */
    public static function contents(int $shop_id, int $user_id): ?array
    {
        $shop = get_post($shop_id);

        if (!$shop || 'explore-shop' !== $shop->post_type) {
            return null;
        }

        $rows  = self::rows($shop_id);
        $spent = self::spent($user_id, $shop_id);
        $items = [];

        foreach ($rows as $index => $row) {
            $item = get_page_by_path($row['item'], OBJECT, self::SELLABLE);

            // A row pointing at something deleted is skipped rather than shown as an unbuyable blank.
            if (!$item) {
                continue;
            }

            $left = self::remaining($row, $spent[$index] ?? null);

            $items[] = [
                'index'     => $index,
                'slug'      => $item->post_name,
                'name'      => $item->post_title,
                'image'     => (string) get_the_post_thumbnail_url($item->ID, 'full'),
                'price'     => $row['price'],
                'unlimited' => $row['unlimited'],
                'left'      => $left,
                'soldOut'   => !$row['unlimited'] && $left <= 0,
                'restocksIn' => self::restockMinutes($row, $spent[$index] ?? null),
            ];
        }

        return [
            'shop'     => $shop_id,
            'name'     => $shop->post_title,
            'greeting' => (string) get_post_meta($shop_id, 'explore-shop-greeting', true),
            'items'    => $items,
            'sell'     => self::sellList($shop_id, $user_id),
            'money'    => Explore::money($user_id),
        ];
    }

    /** The builder's list, cleaned up. */
    public static function rows(int $shop_id): array
    {
        $stored = get_post_meta($shop_id, 'explore-shop-items', true);
        $rows   = [];

        if (!is_array($stored)) {
            return $rows;
        }

        foreach ($stored as $index => $row) {
            if (!is_array($row) || empty($row['explore-item'])) {
                continue;
            }

            $rows[(int) $index] = [
                'item'      => sanitize_title($row['explore-item']),
                'price'     => max(0, (int) round((float) ($row['explore-price'] ?? 0))),
                'unlimited' => 'unlimited' === ($row['explore-stock'] ?? 'limited'),
                'count'     => max(0, (int) ($row['explore-count'] ?? 0)),
                'restock'   => max(0, (int) ($row['explore-restock'] ?? 0)),
            ];
        }

        return $rows;
    }

    /** How many of a row this player may still buy. */
    private static function remaining(array $row, ?array $record): int
    {
        if ($row['unlimited']) {
            return PHP_INT_MAX;
        }

        $bought = (int) ($record['bought'] ?? 0);
        $left   = $row['count'] - $bought;

        if ($left > 0) {
            return $left;
        }

        // Sold out.
        if ($row['restock'] > 0 && isset($record['emptied'])) {
            $due = (int) $record['emptied'] + ($row['restock'] * MINUTE_IN_SECONDS);

            if (time() >= $due) {
                return $row['count'];
            }
        }

        return 0;
    }

    /** Minutes until a sold-out row comes back, or null if it never does. */
    private static function restockMinutes(array $row, ?array $record): ?int
    {
        if ($row['unlimited'] || $row['restock'] <= 0 || !isset($record['emptied'])) {
            return null;
        }

        $left = $row['count'] - (int) ($record['bought'] ?? 0);

        if ($left > 0) {
            return null;
        }

        $due = (int) $record['emptied'] + ($row['restock'] * MINUTE_IN_SECONDS);

        return max(0, (int) ceil(($due - time()) / MINUTE_IN_SECONDS));
    }

    /** What this player has bought from this shop, by row. */
    private static function spent(int $user_id, int $shop_id): array
    {
        $all = get_user_meta($user_id, self::PLAYER_META, true);

        return is_array($all) && isset($all[$shop_id]) && is_array($all[$shop_id])
            ? $all[$shop_id]
            : [];
    }

    // Buying

    /**
     * Sell one thing to one player.
     *
     * @return array{success: bool, message?: string, money?: int, item?: string}
     */
    public static function buy(int $shop_id, int $index, int $user_id): array
    {
        if ($user_id <= 0) {
            return ['success' => false, 'message' => __('You need to be signed in to buy anything.', 'orbem-studio')];
        }

        $rows = self::rows($shop_id);

        if (!isset($rows[$index])) {
            return ['success' => false, 'message' => __('That is not for sale.', 'orbem-studio')];
        }

        $row  = $rows[$index];
        $item = get_page_by_path($row['item'], OBJECT, self::SELLABLE);

        if (!$item) {
            return ['success' => false, 'message' => __('That is not for sale.', 'orbem-studio')];
        }

        $spent  = self::spent($user_id, $shop_id);
        $record = $spent[$index] ?? null;

        if (!$row['unlimited'] && self::remaining($row, $record) <= 0) {
            return ['success' => false, 'message' => __('Sold out.', 'orbem-studio')];
        }

        $money = Explore::money($user_id);

        if ($money < $row['price']) {
            return ['success' => false, 'message' => __('You cannot afford that.', 'orbem-studio')];
        }

        /** Whether this player may buy at all. */
        $refusal = apply_filters('orbem_shop_refuse_purchase', '', $shop_id, $user_id, $item);

        if ('' !== $refusal) {
            return ['success' => false, 'message' => (string) $refusal];
        }

        $left_after = self::recordPurchase($user_id, $shop_id, $index, $row, $record);

        // Paid for after it is theirs to lose, so a failure between the two leaves the player with the thing rather than without the money.
        self::give($user_id, $item);

        $remaining_money = Explore::spendMoney($user_id, $row['price']);

        return [
            'success' => true,
            'item'    => $item->post_name,
            'name'    => $item->post_title,
            'image'   => (string) get_the_post_thumbnail_url($item->ID, 'full'),
            'money'   => $remaining_money,
            'left'    => $row['unlimited'] ? null : $left_after,
            // The storage menu as it is now, for the page to show what was just bought without a reload.
            'storage' => self::storageHtml($user_id),
        ];
    }

    /** The storage menu, drawn by the same template the page draws it with. */
    public static function storageHtml(int $user_id): string
    {
        $template = dirname(__DIR__) . '/templates/components/explore-storage.php';

        if (!is_readable($template)) {
            return '';
        }

        $orbem_studio_userid = $user_id;

        ob_start();
        include $template;

        return (string) ob_get_clean();
    }

    /**
     * Note the sale against this player, and start the clock if it emptied.
     *
     * @return int How many they have left of it.
     */
    private static function recordPurchase(int $user_id, int $shop_id, int $index, array $row, ?array $record): int
    {
        if ($row['unlimited']) {
            return PHP_INT_MAX;
        }

        $all = get_user_meta($user_id, self::PLAYER_META, true);
        $all = is_array($all) ? $all : [];

        $bought = (int) ($record['bought'] ?? 0);

        // A restock that has come due resets the count before this sale counts against it, so the first purchase after a refill starts from full.
        if ($bought >= $row['count'] && self::remaining($row, $record) > 0) {
            $bought = 0;
        }

        $bought++;
        $left = max(0, $row['count'] - $bought);

        $all[$shop_id][$index] = ['bought' => $bought];

        // The clock starts when the shelf is bare, not when it was first touched.
        if (0 === $left) {
            $all[$shop_id][$index]['emptied'] = time();
        }

        update_user_meta($user_id, self::PLAYER_META, $all);

        return $left;
    }

    /** Put the bought thing where the player keeps things. */
    public static function give(int $user_id, \WP_Post $item, int $count = 1): void
    {
        /** Something is being given to a player — bought, found or made. */
        do_action('orbem_given', $user_id, $item, max(1, $count));

        $storage = self::storageOf($user_id);
        $type    = 'explore-ingredients' === $item->post_type ? 'ingredients' : (string) get_post_meta($item->ID, 'explore-value-type', true);
        $tab     = in_array($type, ['weapons', 'gear', 'ingredients'], true) ? $type : 'items';
        $entry   = [
            'id'    => $item->ID,
            'name'  => $item->post_name,
            'type'  => '' !== $type ? $type : 'items',
            'value' => (int) get_post_meta($item->ID, 'explore-value', true),
        ];

        /** A bought thing's storage entry, before it is kept. */
        $entry = (array) apply_filters('orbem_storage_entry', $entry, $item, $user_id);

        // Stored the way picking it up stores it.
        foreach ($storage[$tab] as $index => $kept) {
            if (($kept['name'] ?? '') === $entry['name']) {
                $storage[$tab][$index]['count'] = (int) ($kept['count'] ?? 1) + max(1, $count);
                update_user_meta($user_id, 'explore_storage', $storage);

                return;
            }
        }

        if (1 < $count) {
            $entry['count'] = $count;
        }

        $storage[$tab][] = $entry;

        update_user_meta($user_id, 'explore_storage', $storage);
    }

    /** A player's storage, in its tabs: items, weapons, gear and ingredients. */
    public static function storageOf(int $user_id): array
    {
        $storage = get_user_meta($user_id, 'explore_storage', true);
        $storage = is_array($storage) ? $storage : [];
        $tidy    = ['items' => [], 'weapons' => [], 'gear' => [], 'ingredients' => []];

        foreach (['items', 'weapons', 'gear', 'ingredients'] as $tab) {
            $tidy[$tab] = isset($storage[$tab]) && is_array($storage[$tab]) ? array_values($storage[$tab]) : [];
        }

        foreach ($storage as $key => $loose) {
            if (in_array($key, ['items', 'weapons', 'gear', 'ingredients'], true) || !is_array($loose) || empty($loose['name'])) {
                continue;
            }

            $tab   = in_array($loose['type'] ?? '', ['weapons', 'gear', 'ingredients'], true) ? $loose['type'] : 'items';
            $known = array_column($tidy[$tab], 'name');

            if (!in_array($loose['name'], $known, true)) {
                $tidy[$tab][] = $loose;
            }
        }

        return $tidy;
    }

    // Selling

    /** What a shop pays for something, as a share of what it charges. */
    public const BUYBACK = 0.5;

    /** What this shop would pay for each thing it sells, by slug: half its price. */
    private static function buyback(int $shop_id): array
    {
        $out = [];

        foreach (self::rows($shop_id) as $row) {
            $offer = (int) floor($row['price'] * self::BUYBACK);

            if ($offer > 0) {
                $out[$row['item']] = isset($out[$row['item']]) ? min($out[$row['item']], $offer) : $offer;
            }
        }

        return $out;
    }

    /** Whether a storage entry is in use: the weapon in hand, or gear being worn. */
    private static function inUse(int $user_id, string $tab, array $entry): bool
    {
        if ('weapons' === $tab) {
            return in_array((int) ($entry['id'] ?? 0), array_map('intval', (array) get_user_meta($user_id, 'explore_current_weapons', true)), true);
        }

        if ('gear' === $tab) {
            foreach ((array) get_user_meta($user_id, 'explore_current_gear', true) as $worn) {
                foreach ((array) $worn as $piece) {
                    if (is_array($piece) && array_key_exists((string) ($entry['name'] ?? ''), $piece)) {
                        return true;
                    }
                }
            }
        }

        return false;
    }

    /** Everything in a player's storage this shop will buy, and for how much. */
    public static function sellList(int $shop_id, int $user_id): array
    {
        $offers = self::buyback($shop_id);
        $out    = [];

        if ($user_id <= 0 || !$offers) {
            return $out;
        }

        foreach (self::storageOf($user_id) as $tab => $entries) {
            foreach ($entries as $entry) {
                $slug  = (string) ($entry['name'] ?? '');
                $count = max(1, (int) ($entry['count'] ?? 1)) - (self::inUse($user_id, $tab, $entry) ? 1 : 0);

                if (!isset($offers[$slug]) || $count <= 0) {
                    continue;
                }

                $item = get_page_by_path($slug, OBJECT, self::SELLABLE);

                $out[] = [
                    'slug'  => $slug,
                    'tab'   => $tab,
                    'name'  => $item ? $item->post_title : $slug,
                    'image' => $item ? (string) get_the_post_thumbnail_url($item->ID, 'full') : '',
                    'price' => $offers[$slug],
                    'count' => $count,
                ];
            }
        }

        return $out;
    }

    /** Buy one thing back from a player, for half what it costs here. */
    public static function sell(int $shop_id, string $slug, int $user_id): array
    {
        if ($user_id <= 0) {
            return ['success' => false, 'message' => __('You need to be signed in to sell anything.', 'orbem-studio')];
        }

        $offer = null;

        foreach (self::sellList($shop_id, $user_id) as $line) {
            if ($line['slug'] === $slug) {
                $offer = $line;
                break;
            }
        }

        if (!$offer) {
            return ['success' => false, 'message' => __('This shop will not buy that.', 'orbem-studio')];
        }

        /** Whether this player may sell here. */
        $refusal = (string) apply_filters('orbem_shop_refuse_sale', '', $shop_id, $user_id, $slug);

        if ('' !== $refusal) {
            return ['success' => false, 'message' => $refusal];
        }

        // Paid first: if the money cannot move, the thing stays theirs.
        $before = Explore::money($user_id);
        $money  = Explore::setMoney($user_id, $before + $offer['price']);

        if ($money < $before + $offer['price']) {
            return ['success' => false, 'message' => __('The shop cannot pay for that right now.', 'orbem-studio')];
        }

        $storage = self::storageOf($user_id);
        $tab     = $offer['tab'];

        foreach ($storage[$tab] as $index => $entry) {
            if (($entry['name'] ?? '') !== $slug) {
                continue;
            }

            $count = max(1, (int) ($entry['count'] ?? 1));

            if ($count > 1) {
                $storage[$tab][$index]['count'] = $count - 1;
            } else {
                unset($storage[$tab][$index]);
                $storage[$tab] = array_values($storage[$tab]);
            }

            break;
        }

        update_user_meta($user_id, 'explore_storage', $storage);

        return [
            'success' => true,
            'name'    => $offer['name'],
            'price'   => $offer['price'],
            'money'   => $money,
            'storage' => self::storageHtml($user_id),
        ];
    }


    /**
     * @action rest_api_init
     */
    public function registerRoutes(): void
    {
        register_rest_route('orbemorder/v1', '/shop/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restContents'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route('orbemorder/v1', '/shop/sell/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restSell'],
            'permission_callback' => '__return_true',
        ]);

        register_rest_route('orbemorder/v1', '/shop/buy/', [
            'methods'             => 'POST',
            'callback'            => [$this, 'restBuy'],
            'permission_callback' => '__return_true',
        ]);
    }

    public function restContents(\WP_REST_Request $request): \WP_REST_Response
    {
        $data = (array) $request->get_json_params();
        $shop = self::contents((int) ($data['shop'] ?? 0), Explore::playerId());

        return rest_ensure_response(
            $shop ? ['success' => true, 'data' => $shop]
                  : ['success' => false, 'message' => __('There is no shop here.', 'orbem-studio')]
        );
    }

    public function restSell(\WP_REST_Request $request): \WP_REST_Response
    {
        $data = (array) $request->get_json_params();

        return rest_ensure_response(self::sell(
            (int) ($data['shop'] ?? 0),
            sanitize_title((string) ($data['slug'] ?? '')),
            Explore::playerId()
        ));
    }

    public function restBuy(\WP_REST_Request $request): \WP_REST_Response
    {
        $data = (array) $request->get_json_params();

        return rest_ensure_response(self::buy(
            (int) ($data['shop'] ?? 0),
            (int) ($data['index'] ?? -1),
            Explore::playerId()
        ));
    }
}
