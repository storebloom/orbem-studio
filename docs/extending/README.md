# Extensibility Overview

Orbem Studio is designed to be extended and customized. This guide covers the various ways developers can modify, enhance, and integrate with the plugin.

## Extension Methods

### 1. WordPress Hooks and Filters

Use standard WordPress actions and filters to modify plugin behavior.

**Use Cases:**
- Add custom meta fields to game objects
- Modify game data before rendering
- Integrate with other plugins
- Add custom post processing

**Documentation:** [Hooks and Filters Reference](hooks-and-filters.md)

### 2. REST API Integration

Build custom frontends or external tools using the REST API.

**Use Cases:**
- Mobile game clients
- External admin dashboards
- Third-party integrations
- Analytics and monitoring

**Documentation:** [Custom Integrations](custom-integrations.md)

### 3. Custom Post Types and Taxonomies

Leverage WordPress CPT system to extend game object types.

**Use Cases:**
- Add new game object categories
- Create custom taxonomies for organization
- Extend existing object types

### 4. JavaScript Extensions

Extend the frontend game engine with custom JavaScript.

**Use Cases:**
- Custom gameplay mechanics
- Additional UI elements
- Enhanced visual effects
- Custom mini-games

## Common Extension Patterns

### Adding Custom Meta Fields

The recommended approach is to add a standard WordPress meta box to the relevant `explore-*` post type(s) and save the data with `save_post`:

```php
add_action('add_meta_boxes', function() {
    add_meta_box(
        'custom-character-data',
        'Custom Character Data',
        function($post) {
            $value = get_post_meta($post->ID, 'my_custom_stat', true);
            echo '<input type="number" name="my_custom_stat" value="' . esc_attr($value) . '">';
        },
        'explore-character',
        'side'
    );
});

add_action('save_post_explore-character', function($post_id) {
    if (isset($_POST['my_custom_stat'])) {
        update_post_meta($post_id, 'my_custom_stat', absint($_POST['my_custom_stat']));
    }
});
```

### Custom REST Endpoints

```php
add_action('rest_api_init', function() {
    register_rest_route('mygame/v1', '/custom-action/', [
        'methods' => 'POST',
        'callback' => 'my_custom_action',
        'permission_callback' => function() {
            return current_user_can('read');
        }
    ]);
});
```

## Development Best Practices

### Use Child Themes or Custom Plugins

Never modify Orbem Studio files directly. Instead:

1. Create a custom plugin for your extensions
2. Use child theme for template modifications
3. Version control your customizations

### Namespace Your Code

```php
namespace MyGame;

class CustomExtension {
    // Your code here
}
```

### Check Plugin Exists

```php
if (class_exists('OrbemStudio\\Plugin')) {
    // Your integration code
}
```

### Follow WordPress Coding Standards

- Use WordPress coding standards
- Sanitize all input
- Escape all output
- Use prepared statements for database queries

## Extension Examples

### Example: Custom Achievement System

```php
// Register custom achievement post type
add_action('init', function() {
    register_post_type('game-achievement', [
        'label' => 'Achievements',
        'public' => true,
        'supports' => ['title', 'editor', 'thumbnail']
    ]);
});

// Add REST endpoint to unlock achievements
add_action('rest_api_init', function() {
    register_rest_route('mygame/v1', '/unlock-achievement/', [
        'methods' => 'POST',
        'callback' => function($request) {
            $achievement = $request->get_param('achievement');
            $user_id = get_current_user_id();
            
            $unlocked = get_user_meta($user_id, 'unlocked_achievements', true) ?: [];
            $unlocked[] = $achievement;
            update_user_meta($user_id, 'unlocked_achievements', $unlocked);
            
            return ['success' => true];
        },
        'permission_callback' => function() {
            return is_user_logged_in();
        }
    ]);
});
```


## Testing Your Extensions

### Local Development

1. Use `@wordpress/env` for local WordPress environment
2. Enable `WP_DEBUG` and `SCRIPT_DEBUG`
3. Test with multiple user roles
4. Verify compatibility with latest WordPress version

### Code Quality

```bash
# Install dependencies
composer require --dev phpunit/phpunit
composer require --dev wp-coding-standards/wpcs

# Run tests
vendor/bin/phpunit

# Check coding standards
vendor/bin/phpcs --standard=WordPress your-extension.php
```

## Resources

- **[Hooks and Filters](hooks-and-filters.md)** - Complete reference
- **[Custom Integrations](custom-integrations.md)** - REST API usage
- **[API Documentation](../api/README.md)** - REST API reference
- **[WordPress Plugin Handbook](https://developer.wordpress.org/plugins/)** - WordPress plugin development

## Support

For extension questions:
- Check existing hooks and filters
- Review example code in documentation
- Test in a development environment first
- Consider performance implications

## Next Steps

1. Review available [hooks and filters](hooks-and-filters.md)
2. Learn about [custom integrations](custom-integrations.md)
3. Explore the [REST API](../api/README.md)
4. Build your extension!
