# Hooks and Filters Reference

Complete reference of WordPress actions and filters available in Orbem Studio for extending and customizing functionality.

## Table of Contents

- [Actions](#actions)
- [Filters](#filters)
- [Usage Examples](#usage-examples)

## Actions

Actions allow you to run custom code at specific points during plugin execution.

### Plugin Initialization

#### `init`

Fires during WordPress initialization, used for registering assets and post types.

**Location:** `Plugin::autoRegisterAssets()`

**Example:**
```php
add_action('init', function() {
    // Your custom initialization code
}, 20); // Priority 20 to run after Orbem Studio
```

### REST API

#### `rest_api_init`

Registers REST API routes and fields.

**Locations:**
- `Explore::createApiPostsMetaField()`
- `Dev_Mode::restRoutes()`

**Example:**
```php
add_action('rest_api_init', function() {
    register_rest_route('mygame/v1', '/custom/', [
        'methods' => 'POST',
        'callback' => 'my_callback',
        'permission_callback' => '__return_true'
    ]);
});
```

### Admin Interface

#### `admin_menu`

Registers admin menu pages.

**Location:** `Menu::addGameOptionMenu()`

**Example:**
```php
add_action('admin_menu', function() {
    add_submenu_page(
        'orbem-studio',
        'Custom Tools',
        'Custom Tools',
        'manage_options',
        'custom-tools',
        'render_custom_tools_page'
    );
});
```

#### `admin_head`

Runs in admin header, used for organizing menus.

**Location:** `Menu::organizeTaxoMenuItems()`

#### `admin_init`

Registers settings and admin-only functionality.

**Location:** `Menu::registerGameOptions()`

**Example:**
```php
add_action('admin_init', function() {
    register_setting('game_options', 'custom_setting');
});
```

#### `admin_enqueue_scripts`

Enqueues admin-specific scripts and styles.

**Location:** `Plugin::enqueueAdminAssets()`

**Example:**
```php
add_action('admin_enqueue_scripts', function() {
    wp_enqueue_script('custom-admin', plugins_url('custom-admin.js', __FILE__));
});
```

### Frontend

#### `wp_enqueue_scripts`

Enqueues frontend scripts and styles.

**Locations:**
- `Plugin::enqueueFrontAssets()`
- `Explore::addAllInlineStyles()`

**Example:**
```php
add_action('wp_enqueue_scripts', function() {
    if (is_game_page()) {
        wp_enqueue_script('custom-game-script', plugins_url('game.js', __FILE__));
    }
});
```

#### `wp_head`

Outputs content in the `<head>` section.

**Location:** `Explore::gameHeadStyles()`

**Example:**
```php
add_action('wp_head', function() {
    echo '<meta name="game-version" content="1.0.0">';
});
```

### Meta and Content

#### `add_meta_boxes`

Registers meta boxes for post editing screens.

**Location:** `Meta_Box::exploreMetabox()`

**Example:**
```php
add_action('add_meta_boxes', function() {
    add_meta_box(
        'custom-game-data',
        'Custom Game Data',
        'render_custom_meta_box',
        ['explore-character', 'explore-enemy'],
        'side'
    );
});
```

#### `save_post`

Runs when a post is saved, used for saving meta data.

**Location:** `Meta_Box::saveMeta()` (priority 1)

**Example:**
```php
add_action('save_post', function($post_id) {
    if (get_post_type($post_id) === 'explore-character') {
        // Save custom character data
    }
}, 10, 1);
```

### Block Editor

#### `enqueue_block_editor_assets`

Enqueues assets for the block editor.

**Location:** `Explore::registerCustomBlock()`

**Example:**
```php
add_action('enqueue_block_editor_assets', function() {
    wp_enqueue_script('custom-block', plugins_url('block.js', __FILE__));
});
```

### Taxonomy

#### `{taxonomy}_edit_form_fields`

Adds fields to taxonomy edit forms.

**Location:** `Meta_Box` (for `explore-communication-type`)

**Example:**
```php
add_action('explore-area-point_edit_form_fields', function($term) {
    // Add custom term fields
});
```

#### `edited_{taxonomy}`

Fires after a term is updated.

**Location:** `Meta_Box` (for `explore-communication-type`)

**Example:**
```php
add_action('edited_explore-area-point', function($term_id) {
    // Save custom term meta
});
```

### Options

#### `update_option_{option_name}`

Fires after a specific option is updated.

**Location:** `Plugin::saveGamePageOption()` (for `explore_game_page`)

**Example:**
```php
add_action('update_option_explore_game_page', function($old_value, $value) {
    // React to game page change
}, 10, 2);
```

## Filters

Filters allow you to modify data before it's used or displayed.

### Content and Templates

#### `template_include`

Modifies which template file WordPress loads.

**Location:** `Plugin::exploreIncludeTemplate()`

**Example:**
```php
add_filter('template_include', function($template) {
    if (is_custom_game_mode()) {
        return plugin_dir_path(__FILE__) . 'custom-template.php';
    }
    return $template;
});
```

### Admin Interface

#### `parse_query`

Modifies the main WordPress query.

**Location:** `Plugin::filterPostsAdminList()`

**Example:**
```php
add_filter('parse_query', function($query) {
    if (is_admin() && $query->is_main_query()) {
        // Modify admin query
    }
});
```

#### `restrict_manage_posts`

Adds custom filters to post list tables.

**Location:** `Plugin::addFilterToTaxo()`

### Block Editor

#### `allowed_block_types_all`

Controls which blocks are available in the editor.

**Location:** `Plugin::blockGutenbergBlocks()`

**Example:**
```php
add_filter('allowed_block_types_all', function($allowed, $context) {
    if ($context->post && $context->post->post_type === 'explore-minigame') {
        return ['core/paragraph', 'core/image', 'core/group'];
    }
    return $allowed;
}, 10, 2);
```

#### `block_categories_all`

Adds custom block categories.

**Location:** `Explore::customBlockCategory()`

**Example:**
```php
add_filter('block_categories_all', function($categories) {
    $categories[] = [
        'slug' => 'custom-game-blocks',
        'title' => 'Custom Game Blocks'
    ];
    return $categories;
});
```

### REST API

#### `rest_prepare_{post_type}`

Modifies REST API response for specific post types.

**Location:** `Meta_Box::addMetaToRest()` (for `explore-character`)

**Example:**
```php
add_filter('rest_prepare_explore-weapon', function($response, $post) {
    $response->data['custom_field'] = get_post_meta($post->ID, 'custom', true);
    return $response;
}, 10, 2);
```

## Usage Examples

### Add Custom Meta Field

```php
// Add field to character configuration
add_action('add_meta_boxes', function() {
    add_meta_box(
        'character-bio',
        'Character Biography',
        function($post) {
            $bio = get_post_meta($post->ID, 'character_bio', true);
            echo '<textarea name="character_bio" style="width:100%">' . esc_textarea($bio) . '</textarea>';
        },
        'explore-character',
        'normal'
    );
});

// Save the field
add_action('save_post_explore-character', function($post_id) {
    if (isset($_POST['character_bio'])) {
        update_post_meta($post_id, 'character_bio', sanitize_textarea_field($_POST['character_bio']));
    }
});
```

### Modify Game Area Data

```php
// Add custom data to area REST response
add_filter('orbem_area_data', function($data, $area_slug) {
    $area = get_page_by_path($area_slug, OBJECT, 'explore-area');
    if ($area) {
        $data['weather'] = get_post_meta($area->ID, 'area_weather', true);
    }
    return $data;
}, 10, 2);
```

### Custom REST Endpoint

```php
add_action('rest_api_init', function() {
    register_rest_route('mygame/v1', '/player-stats/', [
        'methods' => 'GET',
        'callback' => function() {
            $user_id = get_current_user_id();
            return [
                'level' => get_user_meta($user_id, 'player_level', true),
                'xp' => get_user_meta($user_id, 'player_xp', true)
            ];
        },
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ]);
});
```

### Customize HUD Display

```php
add_action('wp_head', function() {
    if (is_game_page()) {
        ?>
        <style>
            .custom-hud-element {
                position: fixed;
                top: 10px;
                right: 10px;
                /* Custom styling */
            }
        </style>
        <?php
    }
});
```

### Add Custom Game Object Type

```php
add_action('init', function() {
    register_post_type('explore-vehicle', [
        'labels' => [
            'name' => 'Vehicles',
            'singular_name' => 'Vehicle'
        ],
        'public' => true,
        'show_in_menu' => 'orbem-studio',
        'supports' => ['title', 'editor', 'thumbnail'],
        'has_archive' => false
    ]);
});
```

## Hook Priority Guidelines

- **10** - Default priority, use for most hooks
- **20** - Run after Orbem Studio core
- **5** - Run before Orbem Studio core
- **1** - Very early (used for critical initialization)
- **999** - Very late (used for final output modification)

## Best Practices

1. **Use Specific Hooks:** Target the most specific hook for your needs
2. **Check Context:** Verify you're on the correct page/post type
3. **Return Values:** Always return filtered values in filter hooks
4. **Priority Management:** Use appropriate priorities to control execution order
5. **Conditional Execution:** Only run code when necessary

## Related Documentation

- **[Extensibility Overview](README.md)** - Extension methods
- **[Custom Integrations](custom-integrations.md)** - REST API usage
- **[API Reference](../api/README.md)** - REST endpoints
