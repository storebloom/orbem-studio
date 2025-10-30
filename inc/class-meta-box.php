<?php
/**
 * Meta Box
 *
 * @package OrbemStudio
 */

namespace OrbemStudio;

/**
 * Meta Box class.
 *
 * @package OrbemStudio
 */
class Meta_Box {

	/**
	 * Plugin instance.
	 *
	 * @var object
	 */
	public $plugin;

	/**
	 * Class constructor.
	 *
	 * @param object $plugin Plugin class.
	 */
	public function __construct( $plugin ) {
		$this->plugin = $plugin;
        $this->util = new Util($plugin);
	}

    /**
     * Adding the explore character date to rest api.
     *
     * @filter rest_prepare_explore-character
     * @param $response
     * @param $post
     * @return mixed
     */
    public function addMetaToRest($response, $post) {
        $meta_value = get_post_meta($post->ID, 'explore-voice', true);
        if (!isset($response->data['meta'])) {
            $response->data['meta'] = array();
        }
        $response->data['meta']['explore-voice'] = $meta_value;
        return $response;
    }

	/**
	 * Register the new share buttons metabox.
	 *
	 * @action add_meta_boxes
	 */
	public function explore_metabox() {
		// Get all post types available.
		$post_types = ['explore-explainer', 'explore-minigame', 'explore-point', 'explore-area', 'explore-character', 'explore-enemy', 'explore-weapon', 'explore-magic', 'explore-cutscene', 'explore-mission', 'explore-sign', 'explore-wall', 'explore-communicate'];

		// Add the Explore Point meta box to editor pages.
		add_meta_box( 'explore-point', esc_html__( 'Configuration', 'orbem-game-engine' ), [$this, 'explore_point_box'], $post_types, 'normal', 'high' );
	}

	/**
	 * Call back function for the metabox.
	 */
	public function explore_point_box($post) {
        $front_end = is_string($post);
        $post_type = is_string($post) ? $post : $post->post_type;
        $meta_data = $this->getMetaData($post_type);
        $values = [];


        if ( false !== $post_type ) {
            foreach ($meta_data as $meta_key => $meta_info) {
                $values[$meta_key] = get_post_meta($post->ID, $meta_key, true);
            }
        }

		// Include the meta box template.
		include "{$this->plugin->dir_path}templates/meta/meta-box.php";
	}

    /**
     * Save meta
     *
     * @action save_post, 1
     */
    public function save_meta($post_id) {
        // Check if the request came from the WordPress save post process
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }

        $post_type = get_post_type($post_id);
        $meta_data = $this->getMetaData($post_type);

        if (false === in_array($post_type, ['post', 'page'], true)) {
            // Compile meta data.
            foreach ($meta_data as $key => $value) {
                $type = false;

                if (true === is_array($value)) {
                    $type = array_keys($value);
                }

                if (true === is_array($value) && ['radio'] !== $type && ['select'] !== $type) {
                    $array_value = filter_input_array(
                        INPUT_POST, [$key => ['filter' => FILTER_UNSAFE_RAW, 'flags' => FILTER_REQUIRE_ARRAY]]
                    );
                    $array_value = $array_value[$key] ?? [];
                    update_post_meta($post_id, $key, $array_value );
                } else {
                    update_post_meta($post_id, $key, sanitize_text_field(wp_unslash(filter_input(INPUT_POST, $key, FILTER_UNSAFE_RAW))) ?? '');
                }
            }
        }
    }

    public function getMetaData($post_type = '')
    {
        $explore_item_array = $this->util->getOrbemArray('explore-point');
        $explore_area_array = $this->util->getOrbemArray('explore-area');
        $explore_communicate_array = $this->util->getOrbemArray('explore-communication-type', true);
        $explore_character_array = $this->util->getOrbemArray('explore-character');
        $explore_enemy_array = $this->util->getOrbemArray('explore-enemy');
        $explore_weapon_array = $this->util->getOrbemArray('explore-weapon');
        $explore_mission_array = $this->util->getOrbemArray('explore-mission');
        $explore_minigame_array = $this->util->getOrbemArray('explore-minigame');
        $explore_cutscene_array = $this->util->getOrbemArray('explore-cutscene');
        $explore_hazard_array = $this->util->getOrbemArray('explore-point', false, 'explore-interaction-type', 'hazard');
        $default_weapon = get_option('explore_default_weapon', false);
        $explore_value_array = [
            'point',
            'mana',
            'health',
            'money'
        ];
        $character_images = [
            'static' => 'upload',
            'static-up' => 'upload',
            'static-left' => 'upload',
            'static-right' => 'upload',
            'static-down' => 'upload',
            'static-up-drag' => 'upload',
            'static-left-drag' => 'upload',
            'static-right-drag' => 'upload',
            'up' => 'upload',
            'down' => 'upload',
            'left' => 'upload',
            'right' => 'upload',
            'up-punch' => 'upload',
            'down-punch' => 'upload',
            'left-punch' => 'upload',
            'right-punch' => 'upload',
            'up-drag' => 'upload',
            'left-drag' => 'upload',
            'right-drag' => 'upload',
        ];
        $weapon_images = [];

        foreach ($explore_weapon_array as $explore_weapon) {
            if ($default_weapon !== $explore_weapon) {
                foreach ($character_images as $character_image_key => $character_image) {
                    $weapon_images[$character_image_key . '-' . $explore_weapon] = 'upload';
                }
            }
        }


        $post_type_specific = [
            'explore-area' => [
                'explore-music' => 'upload',
                'explore-map' => 'upload',
                'explore-is-cutscene' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-start-direction' => [
                    'select' => [
                        [
                            'up',
                            'down',
                            'left',
                            'right'
                        ]
                    ]
                ],
                'explore-start-top' => 'number',
                'explore-start-left' => 'number',
                'explore-communicate-type' => [
                    'select' => [
                        $explore_communicate_array
                    ],
                ]
            ],
            'explore-mission' => [
                'explore-ability' => [
                    'select' => [
                        [
                            'none',
                            'transportation'
                        ]
                    ]
                ],
                'explore-hazard-remove' => [
                    'select' => [$explore_hazard_array]
                ],
                'explore-next-mission' => [
                    'multiselect' => [$explore_mission_array]
                ],
                'explore-mission-trigger' => [
                    'top' => 'number',
                    'left' => 'number',
                    'height' => 'number',
                    'width' => 'number',
                ],
                'explore-trigger-item' => [
                    'multiselect' => [$explore_item_array]
                ],
                'explore-trigger-enemy' => [
                    'select' => [$explore_enemy_array]
                ],
                'explore-value-type' => [
                    'select' => [$explore_value_array]
                ],
            ],
            'explore-cutscene' => [
                'explore-cutscene-boss' => [
                    'select' => [$explore_enemy_array]
                ],
                'explore-cutscene-music' => 'upload',
                'explore-cutscene-trigger' => [
                    'top' => 'number',
                    'left' => 'number',
                    'height' => 'number',
                    'width' => 'number',
                ],
                'explore-trigger-type' => [
                    'radio' => [
                        'auto',
                        'engagement'
                    ]
                ],
                'explore-cutscene-character-position' => [
                    'top' => 'number',
                    'left' => 'number',
                    'trigger' => [
                        'radio' => [
                            'before',
                            'after'
                        ]
                    ]
                ],
                'explore-mission-dependent' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-npc-face-me' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-mission-cutscene' => [
                    'select' => [$explore_mission_array]
                ],
                'explore-mission-complete-cutscene' => [
                    'select' => [$explore_mission_array]
                ],
                'explore-cutscene-next-area-position' => [
                    'top' => 'number',
                    'left' => 'number',
                ],
                'explore-character' => [
                    'select' => [$explore_character_array]
                ],
                'explore-next-area' => [
                    'select' => [$explore_area_array]
                ],
                'explore-mute-music' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-value-type' => [
                    'select' => [$explore_value_array]
                ],
                'explore-engage-communicate' => [
                    'select' => [$explore_communicate_array]
                ],
                'explore-path-after-cutscene' => [
                    'repeater' => [
                        'top' => 'number',
                        'left' => 'number'
                    ]
                ],
                'explore-speed' => 'number',
                'explore-time-between' => 'number',
            ],
            'explore-weapon' => [
                'explore-attack' => [
                    'normal' => 'number',
                    'heavy' => 'number',
                    'charged' => 'number',
                ],
                'explore-projectile' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-value-type' => [
                    'select' => [
                        ['weapons']
                    ]
                ],
            ],
            'explore-character' => [
                'explore-character-name' => 'text',
                'explore-time-between' => 'number',
                'explore-voice' => [
                    'select' => [$this->getVoices()]
                ],
                'explore-crew-mate' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-speed' => 'number',
                'explore-wanderer' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-repeat' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-path' => [
                    'repeater' => [
                        'top' => 'number',
                        'left' => 'number'
                    ]
                ],
                'explore-character-images' => $character_images,
                'explore-weapon-images' => $weapon_images,
                'explore-ability' => [
                    'select' => [
                            [
                            'none',
                            'speed',
                            'strength',
                            'hazard',
                            'programming',
                        ]
                    ]
                ],
                'explore-path-trigger' => [
                    'top' => 'number',
                    'left' => 'number',
                    'height' => 'number',
                    'width' => 'number',
                    'cutscene' => [
                        'select' => [$explore_cutscene_array]
                    ],
                    'item' => [
                        'select' => [$explore_item_array]
                    ],
                ],
                'explore-value-type' => [
                    'select' => [$explore_value_array]
                ],
                'explore-weapon-choice' => [
                    'select' => [$explore_weapon_array]
                ],
            ],
            'explore-enemy' => [
                'explore-character-name' => 'text',
                'explore-time-between' => 'number',
                'explore-voice' => [
                    'select' => [$this->getVoices()]
                ],
                'explore-health' => 'number',
                'explore-enemy-speed' => 'number',
                'explore-projectile' => [
                    'image-url' => 'upload',
                    'width' => 'text',
                    'height' => 'text',

                ],
                'explore-projectile-trigger' => [
                    'top' => 'number',
                    'left' => 'number',
                    'height' => 'number',
                    'width' => 'number',
                ],
                'explore-speed' => 'number',
                'explore-wanderer' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-repeat' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-path-trigger' => [
                    'top' => 'number',
                    'left' => 'number',
                    'height' => 'number',
                    'width' => 'number',
                    'cutscene' => [
                        'select' => [$explore_cutscene_array]
                    ],
                    'item' => [
                        'select' => [$explore_item_array]
                    ],
                ],
                'explore-path' => [
                    'repeater' => [
                        'top' => 'number',
                        'left' => 'number'
                    ]
                ],
                'explore-character-images' => [
                    'static' => 'upload',
                    'static-up' => 'upload',
                    'up' => 'upload',
                    'up-punch' => 'upload',
                    'static-down' => 'upload',
                    'down' => 'upload',
                    'down-punch' => 'upload',
                    'static-left' => 'upload',
                    'left' => 'upload',
                    'left-punch' => 'upload',
                    'static-right' => 'upload',
                    'right' => 'upload',
                    'right-punch' => 'upload'
                ],
                'explore-enemy-type' => [
                    'select' => [[
                        'shooter',
                        'runner',
                        'blocker',
                        'boss'
                    ]]
                ],
                'explore-value-type' => [
                    'select' => [$explore_value_array]
                ],
                'explore-boss-waves' => [
                    'projectile' => 'checkbox',
                    'pulse-wave' => 'checkbox',
                ],
                'explore-weapon-weakness' => [
                    'select' => [$explore_weapon_array]
                ],
            ],
            'explore-minigame' => [
                'explore-minigame-music' => 'upload',
            ],
            'explore-communicate' => [
                'explore-communicate-type' => [
                    'radio' => [
                        'text',
                        'voicemail'
                    ]
                ]
            ],
            'explore-explainer' => [
                'explore-explainer-type' => [
                    'radio' => [
                        'map',
                        'menu'
                    ]
                ],
                'explore-explainer-trigger' => [
                    'top' => 'number',
                    'left' => 'number',
                    'width' => 'number',
                    'height' => 'number',
                ],
                'explore-explainer-arrow' => [
                    'orientation' => [
                        'radio' => [
                            'top',
                            'bottom'
                        ]
                    ],
                    'side' => [
                        'radio' => [
                            'left',
                            'right'
                        ]
                    ],
                    'rotate' => 'number',
                ],
                'explore-sound-byte' => 'upload'
            ],
            'explore-point' => [
                'explore-video-override' => 'upload',
                'explore-interacted' => 'upload',
                'explore-disappear' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-timer' => [
                    'time' => 'number',
                    'trigger' => [
                        'select' => [$explore_item_array]
                    ],
                ],
                'explore-interaction-type' => [
                    'select' => [[
                        'none',
                        'collectable',
                        'breakable',
                        'draggable',
                        'hazard',
                    ]]
                ],
                'explore-is-strong' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-passable' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-background' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-foreground' => [
                    'radio' => [
                        'yes',
                        'no'
                    ]
                ],
                'explore-drag-dest' => [
                    'top' => 'number',
                    'left' => 'number',
                    'width' => 'number',
                    'height' => 'number',
                    'image' => 'upload',
                    'mission' => [
                        'select' => [$explore_mission_array]
                    ],
                    'remove-after' => [
                        'radio' => [
                            'yes',
                            'no'
                        ]
                    ],
                    'materialize-after-cutscene' => [
                        'select' => [$explore_cutscene_array]
                    ],
                ],
                'explore-value-type' => [
                    'select' => [$explore_value_array]
                ]
            ],
        ];

        $global_list = [
            'explore-mission' => [
                'select' => [$explore_mission_array]
            ],
            'explore-minigame' => [
                'select' => [$explore_minigame_array]
            ],
            'explore-top'                   => 'number',
            'explore-left'                  => 'number',
            'explore-height'                => 'number',
            'explore-width'                 => 'number',
            'value'                         => 'number',
            'explore-unlock-level'          => 'number',
            'explore-remove-after-cutscene' => [
                'select' => [$explore_cutscene_array]
            ],
            'explore-materialize-after-cutscene' => [
                'select' => [$explore_cutscene_array]
            ],
            'explore-materialize-after-mission' => [
                'select' => [$explore_mission_array]
            ],
            'explore-area' => [
                'select' => [$explore_area_array]
            ],
            'explore-materialize-item-trigger' => [
                'top' => 'number',
                'left' => 'number',
                'width' => 'number',
                'height' => 'number',
            ],
            'explore-rotation' => 'number',
            'explore-layer' => 'number'
        ];

        return false === empty($post_type_specific[$post_type]) ? array_merge($global_list, $post_type_specific[$post_type]) : $global_list;
    }

    public function getVoices() {
        return [
            ['name' => 'af-ZA-Standard-A', 'language' => 'af-ZA', 'gender' => 'FEMALE'],
            ['name' => 'am-ET-Standard-A', 'language' => 'am-ET', 'gender' => 'FEMALE'],
            ['name' => 'am-ET-Standard-B', 'language' => 'am-ET', 'gender' => 'MALE'],
            ['name' => 'am-ET-Wavenet-A', 'language' => 'am-ET', 'gender' => 'FEMALE'],
            ['name' => 'am-ET-Wavenet-B', 'language' => 'am-ET', 'gender' => 'MALE'],
            ['name' => 'ar-XA-Standard-A', 'language' => 'ar-XA', 'gender' => 'FEMALE'],
            ['name' => 'ar-XA-Standard-B', 'language' => 'ar-XA', 'gender' => 'MALE'],
            ['name' => 'ar-XA-Standard-C', 'language' => 'ar-XA', 'gender' => 'MALE'],
            ['name' => 'ar-XA-Standard-D', 'language' => 'ar-XA', 'gender' => 'FEMALE'],
            ['name' => 'ar-XA-Wavenet-A', 'language' => 'ar-XA', 'gender' => 'FEMALE'],
            ['name' => 'ar-XA-Wavenet-B', 'language' => 'ar-XA', 'gender' => 'MALE'],
            ['name' => 'ar-XA-Wavenet-C', 'language' => 'ar-XA', 'gender' => 'MALE'],
            ['name' => 'ar-XA-Wavenet-D', 'language' => 'ar-XA', 'gender' => 'FEMALE'],
            ['name' => 'bg-BG-Standard-A', 'language' => 'bg-BG', 'gender' => 'FEMALE'],
            ['name' => 'bg-BG-Standard-B', 'language' => 'bg-BG', 'gender' => 'FEMALE'],
            ['name' => 'bn-IN-Standard-A', 'language' => 'bn-IN', 'gender' => 'FEMALE'],
            ['name' => 'bn-IN-Standard-B', 'language' => 'bn-IN', 'gender' => 'MALE'],
            ['name' => 'bn-IN-Standard-C', 'language' => 'bn-IN', 'gender' => 'FEMALE'],
            ['name' => 'bn-IN-Standard-D', 'language' => 'bn-IN', 'gender' => 'MALE'],
            ['name' => 'bn-IN-Wavenet-A', 'language' => 'bn-IN', 'gender' => 'FEMALE'],
            ['name' => 'bn-IN-Wavenet-B', 'language' => 'bn-IN', 'gender' => 'MALE'],
            ['name' => 'bn-IN-Wavenet-C', 'language' => 'bn-IN', 'gender' => 'FEMALE'],
            ['name' => 'bn-IN-Wavenet-D', 'language' => 'bn-IN', 'gender' => 'MALE'],
            ['name' => 'ca-ES-Standard-A', 'language' => 'ca-ES', 'gender' => 'FEMALE'],
            ['name' => 'ca-ES-Standard-B', 'language' => 'ca-ES', 'gender' => 'FEMALE'],
            ['name' => 'cmn-CN-Standard-A', 'language' => 'cmn-CN', 'gender' => 'FEMALE'],
            ['name' => 'cmn-CN-Standard-B', 'language' => 'cmn-CN', 'gender' => 'MALE'],
            ['name' => 'cmn-CN-Standard-C', 'language' => 'cmn-CN', 'gender' => 'MALE'],
            ['name' => 'cmn-CN-Standard-D', 'language' => 'cmn-CN', 'gender' => 'FEMALE'],
            ['name' => 'cmn-CN-Wavenet-A', 'language' => 'cmn-CN', 'gender' => 'FEMALE'],
            ['name' => 'cmn-CN-Wavenet-B', 'language' => 'cmn-CN', 'gender' => 'MALE'],
            ['name' => 'cmn-CN-Wavenet-C', 'language' => 'cmn-CN', 'gender' => 'MALE'],
            ['name' => 'cmn-CN-Wavenet-D', 'language' => 'cmn-CN', 'gender' => 'FEMALE'],
            ['name' => 'cmn-TW-Standard-A', 'language' => 'cmn-TW', 'gender' => 'FEMALE'],
            ['name' => 'cmn-TW-Standard-B', 'language' => 'cmn-TW', 'gender' => 'MALE'],
            ['name' => 'cmn-TW-Standard-C', 'language' => 'cmn-TW', 'gender' => 'MALE'],
            ['name' => 'cmn-TW-Wavenet-A', 'language' => 'cmn-TW', 'gender' => 'FEMALE'],
            ['name' => 'cmn-TW-Wavenet-B', 'language' => 'cmn-TW', 'gender' => 'MALE'],
            ['name' => 'cmn-TW-Wavenet-C', 'language' => 'cmn-TW', 'gender' => 'MALE'],
            ['name' => 'cs-CZ-Standard-A', 'language' => 'cs-CZ', 'gender' => 'FEMALE'],
            ['name' => 'cs-CZ-Standard-B', 'language' => 'cs-CZ', 'gender' => 'FEMALE'],
            ['name' => 'cs-CZ-Wavenet-A', 'language' => 'cs-CZ', 'gender' => 'FEMALE'],
            ['name' => 'cs-CZ-Wavenet-B', 'language' => 'cs-CZ', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Neural2-D', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Neural2-F', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Standard-A', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Standard-C', 'language' => 'da-DK', 'gender' => 'MALE'],
            ['name' => 'da-DK-Standard-D', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Standard-E', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Standard-F', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Standard-G', 'language' => 'da-DK', 'gender' => 'MALE'],
            ['name' => 'da-DK-Wavenet-A', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Wavenet-C', 'language' => 'da-DK', 'gender' => 'MALE'],
            ['name' => 'da-DK-Wavenet-D', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Wavenet-E', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Wavenet-F', 'language' => 'da-DK', 'gender' => 'FEMALE'],
            ['name' => 'da-DK-Wavenet-G', 'language' => 'da-DK', 'gender' => 'MALE'],
            ['name' => 'de-DE-Journey-D', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Journey-F', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Journey-O', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Neural2-A', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Neural2-B', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Neural2-C', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Neural2-D', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Neural2-F', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Neural2-G', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Neural2-H', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Polyglot-1', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Standard-A', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Standard-B', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Standard-C', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Standard-D', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Standard-E', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Standard-F', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Standard-G', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Standard-H', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Studio-B', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Studio-C', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Wavenet-A', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Wavenet-B', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Wavenet-C', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Wavenet-D', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Wavenet-E', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'de-DE-Wavenet-F', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Wavenet-G', 'language' => 'de-DE', 'gender' => 'FEMALE'],
            ['name' => 'de-DE-Wavenet-H', 'language' => 'de-DE', 'gender' => 'MALE'],
            ['name' => 'el-GR-Standard-A', 'language' => 'el-GR', 'gender' => 'FEMALE'],
            ['name' => 'el-GR-Standard-B', 'language' => 'el-GR', 'gender' => 'FEMALE'],
            ['name' => 'el-GR-Wavenet-A', 'language' => 'el-GR', 'gender' => 'FEMALE'],
            ['name' => 'el-GR-Wavenet-B', 'language' => 'el-GR', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-Journey-D', 'language' => 'en-AU', 'gender' => 'MALE'],
            ['name' => 'en-AU-Journey-F', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-Journey-O', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-Neural2-A', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-Neural2-B', 'language' => 'en-AU', 'gender' => 'MALE'],
            ['name' => 'en-AU-Neural2-C', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-Neural2-D', 'language' => 'en-AU', 'gender' => 'MALE'],
            ['name' => 'en-AU-News-E', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-News-F', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-News-G', 'language' => 'en-AU', 'gender' => 'MALE'],
            ['name' => 'en-AU-Polyglot-1', 'language' => 'en-AU', 'gender' => 'MALE'],
            ['name' => 'en-AU-Standard-A', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-Standard-B', 'language' => 'en-AU', 'gender' => 'MALE'],
            ['name' => 'en-AU-Standard-C', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-Standard-D', 'language' => 'en-AU', 'gender' => 'MALE'],
            ['name' => 'en-AU-Wavenet-A', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-Wavenet-B', 'language' => 'en-AU', 'gender' => 'MALE'],
            ['name' => 'en-AU-Wavenet-C', 'language' => 'en-AU', 'gender' => 'FEMALE'],
            ['name' => 'en-AU-Wavenet-D', 'language' => 'en-AU', 'gender' => 'MALE'],
            ['name' => 'en-GB-Journey-D', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Journey-F', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Journey-O', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Neural2-A', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Neural2-B', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Neural2-C', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Neural2-D', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Neural2-F', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Neural2-N', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Neural2-O', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-News-G', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-News-H', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-News-I', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-News-J', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-News-K', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-News-L', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-News-M', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Standard-A', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Standard-B', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Standard-C', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Standard-D', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Standard-F', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Standard-N', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Standard-O', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Studio-B', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Studio-C', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Wavenet-A', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Wavenet-B', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Wavenet-C', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Wavenet-D', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-GB-Wavenet-F', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Wavenet-N', 'language' => 'en-GB', 'gender' => 'FEMALE'],
            ['name' => 'en-GB-Wavenet-O', 'language' => 'en-GB', 'gender' => 'MALE'],
            ['name' => 'en-IN-Journey-D', 'language' => 'en-IN', 'gender' => 'MALE'],
            ['name' => 'en-IN-Journey-F', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Journey-O', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Neural2-A', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Neural2-B', 'language' => 'en-IN', 'gender' => 'MALE'],
            ['name' => 'en-IN-Neural2-C', 'language' => 'en-IN', 'gender' => 'MALE'],
            ['name' => 'en-IN-Neural2-D', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Standard-A', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Standard-B', 'language' => 'en-IN', 'gender' => 'MALE'],
            ['name' => 'en-IN-Standard-C', 'language' => 'en-IN', 'gender' => 'MALE'],
            ['name' => 'en-IN-Standard-D', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Standard-E', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Standard-F', 'language' => 'en-IN', 'gender' => 'MALE'],
            ['name' => 'en-IN-Wavenet-A', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Wavenet-B', 'language' => 'en-IN', 'gender' => 'MALE'],
            ['name' => 'en-IN-Wavenet-C', 'language' => 'en-IN', 'gender' => 'MALE'],
            ['name' => 'en-IN-Wavenet-D', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Wavenet-E', 'language' => 'en-IN', 'gender' => 'FEMALE'],
            ['name' => 'en-IN-Wavenet-F', 'language' => 'en-IN', 'gender' => 'MALE'],
            ['name' => 'en-US-Casual-K', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Journey-D', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Journey-F', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Journey-O', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Neural2-A', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Neural2-C', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Neural2-D', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Neural2-E', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Neural2-F', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Neural2-G', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Neural2-H', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Neural2-I', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Neural2-J', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-News-K', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-News-L', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-News-N', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Polyglot-1', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Standard-A', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Standard-B', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Standard-C', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Standard-D', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Standard-E', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Standard-F', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Standard-G', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Standard-H', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Standard-I', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Standard-J', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Studio-O', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Studio-Q', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Wavenet-A', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Wavenet-B', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Wavenet-C', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Wavenet-D', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Wavenet-E', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Wavenet-F', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Wavenet-G', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Wavenet-H', 'language' => 'en-US', 'gender' => 'FEMALE'],
            ['name' => 'en-US-Wavenet-I', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'en-US-Wavenet-J', 'language' => 'en-US', 'gender' => 'MALE'],
            ['name' => 'es-ES-Journey-D', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Journey-F', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Journey-O', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Neural2-A', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Neural2-B', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Neural2-C', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Neural2-D', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Neural2-E', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Neural2-F', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Neural2-G', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Neural2-H', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Polyglot-1', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Standard-A', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Standard-B', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Standard-C', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Standard-D', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Standard-E', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Standard-F', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Standard-G', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Standard-H', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Studio-C', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Studio-F', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Wavenet-B', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Wavenet-C', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Wavenet-D', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Wavenet-E', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Wavenet-F', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-ES-Wavenet-G', 'language' => 'es-ES', 'gender' => 'MALE'],
            ['name' => 'es-ES-Wavenet-H', 'language' => 'es-ES', 'gender' => 'FEMALE'],
            ['name' => 'es-US-Journey-D', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-Journey-F', 'language' => 'es-US', 'gender' => 'FEMALE'],
            ['name' => 'es-US-Journey-O', 'language' => 'es-US', 'gender' => 'FEMALE'],
            ['name' => 'es-US-Neural2-A', 'language' => 'es-US', 'gender' => 'FEMALE'],
            ['name' => 'es-US-Neural2-B', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-Neural2-C', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-News-D', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-News-E', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-News-F', 'language' => 'es-US', 'gender' => 'FEMALE'],
            ['name' => 'es-US-News-G', 'language' => 'es-US', 'gender' => 'FEMALE'],
            ['name' => 'es-US-Polyglot-1', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-Standard-A', 'language' => 'es-US', 'gender' => 'FEMALE'],
            ['name' => 'es-US-Standard-B', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-Standard-C', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-Studio-B', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-Wavenet-A', 'language' => 'es-US', 'gender' => 'FEMALE'],
            ['name' => 'es-US-Wavenet-B', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'es-US-Wavenet-C', 'language' => 'es-US', 'gender' => 'MALE'],
            ['name' => 'et-EE-Standard-A', 'language' => 'et-EE', 'gender' => 'MALE'],
            ['name' => 'eu-ES-Standard-A', 'language' => 'eu-ES', 'gender' => 'FEMALE'],
            ['name' => 'eu-ES-Standard-B', 'language' => 'eu-ES', 'gender' => 'FEMALE'],
            ['name' => 'fi-FI-Standard-A', 'language' => 'fi-FI', 'gender' => 'FEMALE'],
            ['name' => 'fi-FI-Standard-B', 'language' => 'fi-FI', 'gender' => 'FEMALE'],
            ['name' => 'fi-FI-Wavenet-A', 'language' => 'fi-FI', 'gender' => 'FEMALE'],
            ['name' => 'fi-FI-Wavenet-B', 'language' => 'fi-FI', 'gender' => 'FEMALE'],
            ['name' => 'fil-PH-Standard-A', 'language' => 'fil-PH', 'gender' => 'FEMALE'],
            ['name' => 'fil-PH-Standard-B', 'language' => 'fil-PH', 'gender' => 'FEMALE'],
            ['name' => 'fil-PH-Standard-C', 'language' => 'fil-PH', 'gender' => 'MALE'],
            ['name' => 'fil-PH-Standard-D', 'language' => 'fil-PH', 'gender' => 'MALE'],
            ['name' => 'fil-PH-Wavenet-A', 'language' => 'fil-PH', 'gender' => 'FEMALE'],
            ['name' => 'fil-PH-Wavenet-B', 'language' => 'fil-PH', 'gender' => 'FEMALE'],
            ['name' => 'fil-PH-Wavenet-C', 'language' => 'fil-PH', 'gender' => 'MALE'],
            ['name' => 'fil-PH-Wavenet-D', 'language' => 'fil-PH', 'gender' => 'MALE'],
            ['name' => 'fil-ph-Neural2-A', 'language' => 'fil-PH', 'gender' => 'FEMALE'],
            ['name' => 'fil-ph-Neural2-D', 'language' => 'fil-PH', 'gender' => 'MALE'],
            ['name' => 'fr-CA-Journey-D', 'language' => 'fr-CA', 'gender' => 'MALE'],
            ['name' => 'fr-CA-Journey-F', 'language' => 'fr-CA', 'gender' => 'FEMALE'],
            ['name' => 'fr-CA-Journey-O', 'language' => 'fr-CA', 'gender' => 'FEMALE'],
            ['name' => 'fr-CA-Neural2-A', 'language' => 'fr-CA', 'gender' => 'FEMALE'],
            ['name' => 'fr-CA-Neural2-B', 'language' => 'fr-CA', 'gender' => 'MALE'],
            ['name' => 'fr-CA-Neural2-C', 'language' => 'fr-CA', 'gender' => 'FEMALE'],
            ['name' => 'fr-CA-Neural2-D', 'language' => 'fr-CA', 'gender' => 'MALE'],
            ['name' => 'fr-CA-Standard-A', 'language' => 'fr-CA', 'gender' => 'FEMALE'],
            ['name' => 'fr-CA-Standard-B', 'language' => 'fr-CA', 'gender' => 'MALE'],
            ['name' => 'fr-CA-Standard-C', 'language' => 'fr-CA', 'gender' => 'FEMALE'],
            ['name' => 'fr-CA-Standard-D', 'language' => 'fr-CA', 'gender' => 'MALE'],
            ['name' => 'fr-CA-Wavenet-A', 'language' => 'fr-CA', 'gender' => 'FEMALE'],
            ['name' => 'fr-CA-Wavenet-B', 'language' => 'fr-CA', 'gender' => 'MALE'],
            ['name' => 'fr-CA-Wavenet-C', 'language' => 'fr-CA', 'gender' => 'FEMALE'],
            ['name' => 'fr-CA-Wavenet-D', 'language' => 'fr-CA', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Journey-D', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Journey-F', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Journey-O', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Neural2-A', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Neural2-B', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Neural2-C', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Neural2-D', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Neural2-E', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Neural2-F', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Neural2-G', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Polyglot-1', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Standard-A', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Standard-B', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Standard-C', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Standard-D', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Standard-E', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Standard-F', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Standard-G', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Studio-A', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Studio-D', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Wavenet-A', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Wavenet-B', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Wavenet-C', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Wavenet-D', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'fr-FR-Wavenet-E', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Wavenet-F', 'language' => 'fr-FR', 'gender' => 'FEMALE'],
            ['name' => 'fr-FR-Wavenet-G', 'language' => 'fr-FR', 'gender' => 'MALE'],
            ['name' => 'gl-ES-Standard-A', 'language' => 'gl-ES', 'gender' => 'FEMALE'],
            ['name' => 'gl-ES-Standard-B', 'language' => 'gl-ES', 'gender' => 'FEMALE'],
            ['name' => 'gu-IN-Standard-A', 'language' => 'gu-IN', 'gender' => 'FEMALE'],
            ['name' => 'gu-IN-Standard-B', 'language' => 'gu-IN', 'gender' => 'MALE'],
            ['name' => 'gu-IN-Standard-C', 'language' => 'gu-IN', 'gender' => 'FEMALE'],
            ['name' => 'gu-IN-Standard-D', 'language' => 'gu-IN', 'gender' => 'MALE'],
            ['name' => 'gu-IN-Wavenet-A', 'language' => 'gu-IN', 'gender' => 'FEMALE'],
            ['name' => 'gu-IN-Wavenet-B', 'language' => 'gu-IN', 'gender' => 'MALE'],
            ['name' => 'gu-IN-Wavenet-C', 'language' => 'gu-IN', 'gender' => 'FEMALE'],
            ['name' => 'gu-IN-Wavenet-D', 'language' => 'gu-IN', 'gender' => 'MALE'],
            ['name' => 'he-IL-Standard-A', 'language' => 'he-IL', 'gender' => 'FEMALE'],
            ['name' => 'he-IL-Standard-B', 'language' => 'he-IL', 'gender' => 'MALE'],
            ['name' => 'he-IL-Standard-C', 'language' => 'he-IL', 'gender' => 'FEMALE'],
            ['name' => 'he-IL-Standard-D', 'language' => 'he-IL', 'gender' => 'MALE'],
            ['name' => 'he-IL-Wavenet-A', 'language' => 'he-IL', 'gender' => 'FEMALE'],
            ['name' => 'he-IL-Wavenet-B', 'language' => 'he-IL', 'gender' => 'MALE'],
            ['name' => 'he-IL-Wavenet-C', 'language' => 'he-IL', 'gender' => 'FEMALE'],
            ['name' => 'he-IL-Wavenet-D', 'language' => 'he-IL', 'gender' => 'MALE'],
            ['name' => 'hi-IN-Neural2-A', 'language' => 'hi-IN', 'gender' => 'FEMALE'],
            ['name' => 'hi-IN-Neural2-B', 'language' => 'hi-IN', 'gender' => 'MALE'],
            ['name' => 'hi-IN-Neural2-C', 'language' => 'hi-IN', 'gender' => 'MALE'],
            ['name' => 'hi-IN-Neural2-D', 'language' => 'hi-IN', 'gender' => 'FEMALE'],
            ['name' => 'hi-IN-Standard-A', 'language' => 'hi-IN', 'gender' => 'FEMALE'],
            ['name' => 'hi-IN-Standard-B', 'language' => 'hi-IN', 'gender' => 'MALE'],
            ['name' => 'hi-IN-Standard-C', 'language' => 'hi-IN', 'gender' => 'MALE'],
            ['name' => 'hi-IN-Standard-D', 'language' => 'hi-IN', 'gender' => 'FEMALE'],
            ['name' => 'hi-IN-Standard-E', 'language' => 'hi-IN', 'gender' => 'FEMALE'],
            ['name' => 'hi-IN-Standard-F', 'language' => 'hi-IN', 'gender' => 'MALE'],
            ['name' => 'hi-IN-Wavenet-A', 'language' => 'hi-IN', 'gender' => 'FEMALE'],
            ['name' => 'hi-IN-Wavenet-B', 'language' => 'hi-IN', 'gender' => 'MALE'],
            ['name' => 'hi-IN-Wavenet-C', 'language' => 'hi-IN', 'gender' => 'MALE'],
            ['name' => 'hi-IN-Wavenet-D', 'language' => 'hi-IN', 'gender' => 'FEMALE'],
            ['name' => 'hi-IN-Wavenet-E', 'language' => 'hi-IN', 'gender' => 'FEMALE'],
            ['name' => 'hi-IN-Wavenet-F', 'language' => 'hi-IN', 'gender' => 'MALE'],
            ['name' => 'hu-HU-Standard-A', 'language' => 'hu-HU', 'gender' => 'FEMALE'],
            ['name' => 'hu-HU-Standard-B', 'language' => 'hu-HU', 'gender' => 'FEMALE'],
            ['name' => 'hu-HU-Wavenet-A', 'language' => 'hu-HU', 'gender' => 'FEMALE'],
            ['name' => 'id-ID-Standard-A', 'language' => 'id-ID', 'gender' => 'FEMALE'],
            ['name' => 'id-ID-Standard-B', 'language' => 'id-ID', 'gender' => 'MALE'],
            ['name' => 'id-ID-Standard-C', 'language' => 'id-ID', 'gender' => 'MALE'],
            ['name' => 'id-ID-Standard-D', 'language' => 'id-ID', 'gender' => 'FEMALE'],
            ['name' => 'id-ID-Wavenet-A', 'language' => 'id-ID', 'gender' => 'FEMALE'],
            ['name' => 'id-ID-Wavenet-B', 'language' => 'id-ID', 'gender' => 'MALE'],
            ['name' => 'id-ID-Wavenet-C', 'language' => 'id-ID', 'gender' => 'MALE'],
            ['name' => 'id-ID-Wavenet-D', 'language' => 'id-ID', 'gender' => 'FEMALE'],
            ['name' => 'is-IS-Standard-A', 'language' => 'is-IS', 'gender' => 'FEMALE'],
            ['name' => 'is-IS-Standard-B', 'language' => 'is-IS', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Journey-D', 'language' => 'it-IT', 'gender' => 'MALE'],
            ['name' => 'it-IT-Journey-F', 'language' => 'it-IT', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Journey-O', 'language' => 'it-IT', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Neural2-A', 'language' => 'it-IT', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Neural2-C', 'language' => 'it-IT', 'gender' => 'MALE'],
            ['name' => 'it-IT-Neural2-F', 'language' => 'it-IT', 'gender' => 'MALE'],
            ['name' => 'it-IT-Standard-A', 'language' => 'it-IT', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Standard-B', 'language' => 'it-IT', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Standard-C', 'language' => 'it-IT', 'gender' => 'MALE'],
            ['name' => 'it-IT-Standard-D', 'language' => 'it-IT', 'gender' => 'MALE'],
            ['name' => 'it-IT-Standard-E', 'language' => 'it-IT', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Standard-F', 'language' => 'it-IT', 'gender' => 'MALE'],
            ['name' => 'it-IT-Wavenet-A', 'language' => 'it-IT', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Wavenet-B', 'language' => 'it-IT', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Wavenet-C', 'language' => 'it-IT', 'gender' => 'MALE'],
            ['name' => 'it-IT-Wavenet-D', 'language' => 'it-IT', 'gender' => 'MALE'],
            ['name' => 'it-IT-Wavenet-E', 'language' => 'it-IT', 'gender' => 'FEMALE'],
            ['name' => 'it-IT-Wavenet-F', 'language' => 'it-IT', 'gender' => 'MALE'],
            ['name' => 'ja-JP-Neural2-B', 'language' => 'ja-JP', 'gender' => 'FEMALE'],
            ['name' => 'ja-JP-Neural2-C', 'language' => 'ja-JP', 'gender' => 'MALE'],
            ['name' => 'ja-JP-Neural2-D', 'language' => 'ja-JP', 'gender' => 'MALE'],
            ['name' => 'ja-JP-Standard-A', 'language' => 'ja-JP', 'gender' => 'FEMALE'],
            ['name' => 'ja-JP-Standard-B', 'language' => 'ja-JP', 'gender' => 'FEMALE'],
            ['name' => 'ja-JP-Standard-C', 'language' => 'ja-JP', 'gender' => 'MALE'],
            ['name' => 'ja-JP-Standard-D', 'language' => 'ja-JP', 'gender' => 'MALE'],
            ['name' => 'ja-JP-Wavenet-A', 'language' => 'ja-JP', 'gender' => 'FEMALE'],
            ['name' => 'ja-JP-Wavenet-B', 'language' => 'ja-JP', 'gender' => 'FEMALE'],
            ['name' => 'ja-JP-Wavenet-C', 'language' => 'ja-JP', 'gender' => 'MALE'],
            ['name' => 'ja-JP-Wavenet-D', 'language' => 'ja-JP', 'gender' => 'MALE'],
            ['name' => 'kn-IN-Standard-A', 'language' => 'kn-IN', 'gender' => 'FEMALE'],
            ['name' => 'kn-IN-Standard-B', 'language' => 'kn-IN', 'gender' => 'MALE'],
            ['name' => 'kn-IN-Standard-C', 'language' => 'kn-IN', 'gender' => 'FEMALE'],
            ['name' => 'kn-IN-Standard-D', 'language' => 'kn-IN', 'gender' => 'MALE'],
            ['name' => 'kn-IN-Wavenet-A', 'language' => 'kn-IN', 'gender' => 'FEMALE'],
            ['name' => 'kn-IN-Wavenet-B', 'language' => 'kn-IN', 'gender' => 'MALE'],
            ['name' => 'kn-IN-Wavenet-C', 'language' => 'kn-IN', 'gender' => 'FEMALE'],
            ['name' => 'kn-IN-Wavenet-D', 'language' => 'kn-IN', 'gender' => 'MALE'],
            ['name' => 'ko-KR-Neural2-A', 'language' => 'ko-KR', 'gender' => 'FEMALE'],
            ['name' => 'ko-KR-Neural2-B', 'language' => 'ko-KR', 'gender' => 'FEMALE'],
            ['name' => 'ko-KR-Neural2-C', 'language' => 'ko-KR', 'gender' => 'MALE'],
            ['name' => 'ko-KR-Standard-A', 'language' => 'ko-KR', 'gender' => 'FEMALE'],
            ['name' => 'ko-KR-Standard-B', 'language' => 'ko-KR', 'gender' => 'FEMALE'],
            ['name' => 'ko-KR-Standard-C', 'language' => 'ko-KR', 'gender' => 'MALE'],
            ['name' => 'ko-KR-Standard-D', 'language' => 'ko-KR', 'gender' => 'MALE'],
            ['name' => 'ko-KR-Wavenet-A', 'language' => 'ko-KR', 'gender' => 'FEMALE'],
            ['name' => 'ko-KR-Wavenet-B', 'language' => 'ko-KR', 'gender' => 'FEMALE'],
            ['name' => 'ko-KR-Wavenet-C', 'language' => 'ko-KR', 'gender' => 'MALE'],
            ['name' => 'ko-KR-Wavenet-D', 'language' => 'ko-KR', 'gender' => 'MALE'],
            ['name' => 'lt-LT-Standard-A', 'language' => 'lt-LT', 'gender' => 'MALE'],
            ['name' => 'lt-LT-Standard-B', 'language' => 'lt-LT', 'gender' => 'MALE'],
            ['name' => 'lv-LV-Standard-A', 'language' => 'lv-LV', 'gender' => 'MALE'],
            ['name' => 'lv-LV-Standard-B', 'language' => 'lv-LV', 'gender' => 'MALE'],
            ['name' => 'ml-IN-Standard-A', 'language' => 'ml-IN', 'gender' => 'FEMALE'],
            ['name' => 'ml-IN-Standard-B', 'language' => 'ml-IN', 'gender' => 'MALE'],
            ['name' => 'ml-IN-Standard-C', 'language' => 'ml-IN', 'gender' => 'FEMALE'],
            ['name' => 'ml-IN-Standard-D', 'language' => 'ml-IN', 'gender' => 'MALE'],
            ['name' => 'ml-IN-Wavenet-A', 'language' => 'ml-IN', 'gender' => 'FEMALE'],
            ['name' => 'ml-IN-Wavenet-B', 'language' => 'ml-IN', 'gender' => 'MALE'],
            ['name' => 'ml-IN-Wavenet-C', 'language' => 'ml-IN', 'gender' => 'FEMALE'],
            ['name' => 'ml-IN-Wavenet-D', 'language' => 'ml-IN', 'gender' => 'MALE'],
            ['name' => 'mr-IN-Standard-A', 'language' => 'mr-IN', 'gender' => 'FEMALE'],
            ['name' => 'mr-IN-Standard-B', 'language' => 'mr-IN', 'gender' => 'MALE'],
            ['name' => 'mr-IN-Standard-C', 'language' => 'mr-IN', 'gender' => 'FEMALE'],
            ['name' => 'mr-IN-Wavenet-A', 'language' => 'mr-IN', 'gender' => 'FEMALE'],
            ['name' => 'mr-IN-Wavenet-B', 'language' => 'mr-IN', 'gender' => 'MALE'],
            ['name' => 'mr-IN-Wavenet-C', 'language' => 'mr-IN', 'gender' => 'FEMALE'],
            ['name' => 'ms-MY-Standard-A', 'language' => 'ms-MY', 'gender' => 'FEMALE'],
            ['name' => 'ms-MY-Standard-B', 'language' => 'ms-MY', 'gender' => 'MALE'],
            ['name' => 'ms-MY-Standard-C', 'language' => 'ms-MY', 'gender' => 'FEMALE'],
            ['name' => 'ms-MY-Standard-D', 'language' => 'ms-MY', 'gender' => 'MALE'],
            ['name' => 'ms-MY-Wavenet-A', 'language' => 'ms-MY', 'gender' => 'FEMALE'],
            ['name' => 'ms-MY-Wavenet-B', 'language' => 'ms-MY', 'gender' => 'MALE'],
            ['name' => 'ms-MY-Wavenet-C', 'language' => 'ms-MY', 'gender' => 'FEMALE'],
            ['name' => 'ms-MY-Wavenet-D', 'language' => 'ms-MY', 'gender' => 'MALE'],
            ['name' => 'nb-NO-Standard-A', 'language' => 'nb-NO', 'gender' => 'FEMALE'],
            ['name' => 'nb-NO-Standard-B', 'language' => 'nb-NO', 'gender' => 'MALE'],
            ['name' => 'nb-NO-Standard-C', 'language' => 'nb-NO', 'gender' => 'FEMALE'],
            ['name' => 'nb-NO-Standard-D', 'language' => 'nb-NO', 'gender' => 'MALE'],
            ['name' => 'nb-NO-Standard-E', 'language' => 'nb-NO', 'gender' => 'FEMALE'],
            ['name' => 'nb-NO-Standard-F', 'language' => 'nb-NO', 'gender' => 'FEMALE'],
            ['name' => 'nb-NO-Standard-G', 'language' => 'nb-NO', 'gender' => 'MALE'],
            ['name' => 'nb-NO-Wavenet-A', 'language' => 'nb-NO', 'gender' => 'FEMALE'],
            ['name' => 'nb-NO-Wavenet-B', 'language' => 'nb-NO', 'gender' => 'MALE'],
            ['name' => 'nb-NO-Wavenet-C', 'language' => 'nb-NO', 'gender' => 'FEMALE'],
            ['name' => 'nb-NO-Wavenet-D', 'language' => 'nb-NO', 'gender' => 'MALE'],
            ['name' => 'nb-NO-Wavenet-E', 'language' => 'nb-NO', 'gender' => 'FEMALE'],
            ['name' => 'nb-NO-Wavenet-F', 'language' => 'nb-NO', 'gender' => 'FEMALE'],
            ['name' => 'nb-NO-Wavenet-G', 'language' => 'nb-NO', 'gender' => 'MALE'],
            ['name' => 'nl-BE-Standard-A', 'language' => 'nl-BE', 'gender' => 'FEMALE'],
            ['name' => 'nl-BE-Standard-B', 'language' => 'nl-BE', 'gender' => 'MALE'],
            ['name' => 'nl-BE-Standard-C', 'language' => 'nl-BE', 'gender' => 'FEMALE'],
            ['name' => 'nl-BE-Standard-D', 'language' => 'nl-BE', 'gender' => 'MALE'],
            ['name' => 'nl-BE-Wavenet-A', 'language' => 'nl-BE', 'gender' => 'FEMALE'],
            ['name' => 'nl-BE-Wavenet-B', 'language' => 'nl-BE', 'gender' => 'MALE'],
            ['name' => 'nl-BE-Wavenet-C', 'language' => 'nl-BE', 'gender' => 'FEMALE'],
            ['name' => 'nl-BE-Wavenet-D', 'language' => 'nl-BE', 'gender' => 'MALE'],
            ['name' => 'nl-NL-Standard-A', 'language' => 'nl-NL', 'gender' => 'FEMALE'],
            ['name' => 'nl-NL-Standard-B', 'language' => 'nl-NL', 'gender' => 'MALE'],
            ['name' => 'nl-NL-Standard-C', 'language' => 'nl-NL', 'gender' => 'MALE'],
            ['name' => 'nl-NL-Standard-D', 'language' => 'nl-NL', 'gender' => 'FEMALE'],
            ['name' => 'nl-NL-Standard-E', 'language' => 'nl-NL', 'gender' => 'FEMALE'],
            ['name' => 'nl-NL-Standard-F', 'language' => 'nl-NL', 'gender' => 'FEMALE'],
            ['name' => 'nl-NL-Standard-G', 'language' => 'nl-NL', 'gender' => 'MALE'],
            ['name' => 'nl-NL-Wavenet-A', 'language' => 'nl-NL', 'gender' => 'FEMALE'],
            ['name' => 'nl-NL-Wavenet-B', 'language' => 'nl-NL', 'gender' => 'MALE'],
            ['name' => 'nl-NL-Wavenet-C', 'language' => 'nl-NL', 'gender' => 'MALE'],
            ['name' => 'nl-NL-Wavenet-D', 'language' => 'nl-NL', 'gender' => 'FEMALE'],
            ['name' => 'nl-NL-Wavenet-E', 'language' => 'nl-NL', 'gender' => 'FEMALE'],
            ['name' => 'nl-NL-Wavenet-F', 'language' => 'nl-NL', 'gender' => 'FEMALE'],
            ['name' => 'nl-NL-Wavenet-G', 'language' => 'nl-NL', 'gender' => 'MALE'],
            ['name' => 'pa-IN-Standard-A', 'language' => 'pa-IN', 'gender' => 'FEMALE'],
            ['name' => 'pa-IN-Standard-B', 'language' => 'pa-IN', 'gender' => 'MALE'],
            ['name' => 'pa-IN-Standard-C', 'language' => 'pa-IN', 'gender' => 'FEMALE'],
            ['name' => 'pa-IN-Standard-D', 'language' => 'pa-IN', 'gender' => 'MALE'],
            ['name' => 'pa-IN-Wavenet-A', 'language' => 'pa-IN', 'gender' => 'FEMALE'],
            ['name' => 'pa-IN-Wavenet-B', 'language' => 'pa-IN', 'gender' => 'MALE'],
            ['name' => 'pa-IN-Wavenet-C', 'language' => 'pa-IN', 'gender' => 'FEMALE'],
            ['name' => 'pa-IN-Wavenet-D', 'language' => 'pa-IN', 'gender' => 'MALE'],
            ['name' => 'pl-PL-Standard-A', 'language' => 'pl-PL', 'gender' => 'FEMALE'],
            ['name' => 'pl-PL-Standard-B', 'language' => 'pl-PL', 'gender' => 'MALE'],
            ['name' => 'pl-PL-Standard-C', 'language' => 'pl-PL', 'gender' => 'MALE'],
            ['name' => 'pl-PL-Standard-D', 'language' => 'pl-PL', 'gender' => 'FEMALE'],
            ['name' => 'pl-PL-Standard-E', 'language' => 'pl-PL', 'gender' => 'FEMALE'],
            ['name' => 'pl-PL-Standard-F', 'language' => 'pl-PL', 'gender' => 'FEMALE'],
            ['name' => 'pl-PL-Standard-G', 'language' => 'pl-PL', 'gender' => 'MALE'],
            ['name' => 'pl-PL-Wavenet-A', 'language' => 'pl-PL', 'gender' => 'FEMALE'],
            ['name' => 'pl-PL-Wavenet-B', 'language' => 'pl-PL', 'gender' => 'MALE'],
            ['name' => 'pl-PL-Wavenet-C', 'language' => 'pl-PL', 'gender' => 'MALE'],
            ['name' => 'pl-PL-Wavenet-D', 'language' => 'pl-PL', 'gender' => 'FEMALE'],
            ['name' => 'pl-PL-Wavenet-E', 'language' => 'pl-PL', 'gender' => 'FEMALE'],
            ['name' => 'pl-PL-Wavenet-F', 'language' => 'pl-PL', 'gender' => 'FEMALE'],
            ['name' => 'pl-PL-Wavenet-G', 'language' => 'pl-PL', 'gender' => 'MALE'],
            ['name' => 'pt-BR-Neural2-A', 'language' => 'pt-BR', 'gender' => 'FEMALE'],
            ['name' => 'pt-BR-Neural2-B', 'language' => 'pt-BR', 'gender' => 'MALE'],
            ['name' => 'pt-BR-Neural2-C', 'language' => 'pt-BR', 'gender' => 'FEMALE'],
            ['name' => 'pt-BR-Standard-A', 'language' => 'pt-BR', 'gender' => 'FEMALE'],
            ['name' => 'pt-BR-Standard-B', 'language' => 'pt-BR', 'gender' => 'MALE'],
            ['name' => 'pt-BR-Standard-C', 'language' => 'pt-BR', 'gender' => 'FEMALE'],
            ['name' => 'pt-BR-Standard-D', 'language' => 'pt-BR', 'gender' => 'FEMALE'],
            ['name' => 'pt-BR-Standard-E', 'language' => 'pt-BR', 'gender' => 'MALE'],
            ['name' => 'pt-BR-Wavenet-A', 'language' => 'pt-BR', 'gender' => 'FEMALE'],
            ['name' => 'pt-BR-Wavenet-B', 'language' => 'pt-BR', 'gender' => 'MALE'],
            ['name' => 'pt-BR-Wavenet-C', 'language' => 'pt-BR', 'gender' => 'FEMALE'],
            ['name' => 'pt-BR-Wavenet-D', 'language' => 'pt-BR', 'gender' => 'FEMALE'],
            ['name' => 'pt-BR-Wavenet-E', 'language' => 'pt-BR', 'gender' => 'MALE'],
            ['name' => 'pt-PT-Standard-A', 'language' => 'pt-PT', 'gender' => 'FEMALE'],
            ['name' => 'pt-PT-Standard-B', 'language' => 'pt-PT', 'gender' => 'MALE'],
            ['name' => 'pt-PT-Standard-C', 'language' => 'pt-PT', 'gender' => 'MALE'],
            ['name' => 'pt-PT-Standard-D', 'language' => 'pt-PT', 'gender' => 'FEMALE'],
            ['name' => 'pt-PT-Standard-E', 'language' => 'pt-PT', 'gender' => 'FEMALE'],
            ['name' => 'pt-PT-Standard-F', 'language' => 'pt-PT', 'gender' => 'MALE'],
            ['name' => 'pt-PT-Wavenet-A', 'language' => 'pt-PT', 'gender' => 'FEMALE'],
            ['name' => 'pt-PT-Wavenet-B', 'language' => 'pt-PT', 'gender' => 'MALE'],
            ['name' => 'pt-PT-Wavenet-C', 'language' => 'pt-PT', 'gender' => 'MALE'],
            ['name' => 'pt-PT-Wavenet-D', 'language' => 'pt-PT', 'gender' => 'FEMALE'],
            ['name' => 'pt-PT-Wavenet-E', 'language' => 'pt-PT', 'gender' => 'FEMALE'],
            ['name' => 'pt-PT-Wavenet-F', 'language' => 'pt-PT', 'gender' => 'MALE'],
            ['name' => 'ro-RO-Standard-A', 'language' => 'ro-RO', 'gender' => 'FEMALE'],
            ['name' => 'ro-RO-Standard-B', 'language' => 'ro-RO', 'gender' => 'FEMALE'],
            ['name' => 'ro-RO-Wavenet-A', 'language' => 'ro-RO', 'gender' => 'FEMALE'],
            ['name' => 'ro-RO-Wavenet-B', 'language' => 'ro-RO', 'gender' => 'FEMALE'],
            ['name' => 'ru-RU-Standard-A', 'language' => 'ru-RU', 'gender' => 'FEMALE'],
            ['name' => 'ru-RU-Standard-B', 'language' => 'ru-RU', 'gender' => 'MALE'],
            ['name' => 'ru-RU-Standard-C', 'language' => 'ru-RU', 'gender' => 'FEMALE'],
            ['name' => 'ru-RU-Standard-D', 'language' => 'ru-RU', 'gender' => 'MALE'],
            ['name' => 'ru-RU-Standard-E', 'language' => 'ru-RU', 'gender' => 'FEMALE'],
            ['name' => 'ru-RU-Wavenet-A', 'language' => 'ru-RU', 'gender' => 'FEMALE'],
            ['name' => 'ru-RU-Wavenet-B', 'language' => 'ru-RU', 'gender' => 'MALE'],
            ['name' => 'ru-RU-Wavenet-C', 'language' => 'ru-RU', 'gender' => 'FEMALE'],
            ['name' => 'ru-RU-Wavenet-D', 'language' => 'ru-RU', 'gender' => 'MALE'],
            ['name' => 'ru-RU-Wavenet-E', 'language' => 'ru-RU', 'gender' => 'FEMALE'],
            ['name' => 'sk-SK-Standard-A', 'language' => 'sk-SK', 'gender' => 'FEMALE'],
            ['name' => 'sk-SK-Standard-B', 'language' => 'sk-SK', 'gender' => 'FEMALE'],
            ['name' => 'sk-SK-Wavenet-A', 'language' => 'sk-SK', 'gender' => 'FEMALE'],
            ['name' => 'sk-SK-Wavenet-B', 'language' => 'sk-SK', 'gender' => 'FEMALE'],
            ['name' => 'sr-RS-Standard-A', 'language' => 'sr-RS', 'gender' => 'FEMALE'],
            ['name' => 'sv-SE-Standard-A', 'language' => 'sv-SE', 'gender' => 'FEMALE'],
            ['name' => 'sv-SE-Standard-B', 'language' => 'sv-SE', 'gender' => 'FEMALE'],
            ['name' => 'sv-SE-Standard-C', 'language' => 'sv-SE', 'gender' => 'FEMALE'],
            ['name' => 'sv-SE-Standard-D', 'language' => 'sv-SE', 'gender' => 'MALE'],
            ['name' => 'sv-SE-Standard-E', 'language' => 'sv-SE', 'gender' => 'MALE'],
            ['name' => 'sv-SE-Standard-F', 'language' => 'sv-SE', 'gender' => 'FEMALE'],
            ['name' => 'sv-SE-Standard-G', 'language' => 'sv-SE', 'gender' => 'MALE'],
            ['name' => 'sv-SE-Wavenet-A', 'language' => 'sv-SE', 'gender' => 'FEMALE'],
            ['name' => 'sv-SE-Wavenet-B', 'language' => 'sv-SE', 'gender' => 'FEMALE'],
            ['name' => 'sv-SE-Wavenet-C', 'language' => 'sv-SE', 'gender' => 'MALE'],
            ['name' => 'sv-SE-Wavenet-D', 'language' => 'sv-SE', 'gender' => 'FEMALE'],
            ['name' => 'sv-SE-Wavenet-E', 'language' => 'sv-SE', 'gender' => 'MALE'],
            ['name' => 'sv-SE-Wavenet-F', 'language' => 'sv-SE', 'gender' => 'FEMALE'],
            ['name' => 'sv-SE-Wavenet-G', 'language' => 'sv-SE', 'gender' => 'MALE'],
            ['name' => 'ta-IN-Standard-A', 'language' => 'ta-IN', 'gender' => 'FEMALE'],
            ['name' => 'ta-IN-Standard-B', 'language' => 'ta-IN', 'gender' => 'MALE'],
            ['name' => 'ta-IN-Standard-C', 'language' => 'ta-IN', 'gender' => 'FEMALE'],
            ['name' => 'ta-IN-Standard-D', 'language' => 'ta-IN', 'gender' => 'MALE'],
            ['name' => 'ta-IN-Wavenet-A', 'language' => 'ta-IN', 'gender' => 'FEMALE'],
            ['name' => 'ta-IN-Wavenet-B', 'language' => 'ta-IN', 'gender' => 'MALE'],
            ['name' => 'ta-IN-Wavenet-C', 'language' => 'ta-IN', 'gender' => 'FEMALE'],
            ['name' => 'ta-IN-Wavenet-D', 'language' => 'ta-IN', 'gender' => 'MALE'],
            ['name' => 'te-IN-Standard-A', 'language' => 'te-IN', 'gender' => 'FEMALE'],
            ['name' => 'te-IN-Standard-B', 'language' => 'te-IN', 'gender' => 'MALE'],
            ['name' => 'te-IN-Standard-C', 'language' => 'te-IN', 'gender' => 'FEMALE'],
            ['name' => 'te-IN-Standard-D', 'language' => 'te-IN', 'gender' => 'MALE'],
            ['name' => 'th-TH-Neural2-C', 'language' => 'th-TH', 'gender' => 'FEMALE'],
            ['name' => 'th-TH-Standard-A', 'language' => 'th-TH', 'gender' => 'FEMALE'],
            ['name' => 'tr-TR-Standard-A', 'language' => 'tr-TR', 'gender' => 'FEMALE'],
            ['name' => 'tr-TR-Standard-B', 'language' => 'tr-TR', 'gender' => 'MALE'],
            ['name' => 'tr-TR-Standard-C', 'language' => 'tr-TR', 'gender' => 'FEMALE'],
            ['name' => 'tr-TR-Standard-D', 'language' => 'tr-TR', 'gender' => 'FEMALE'],
            ['name' => 'tr-TR-Standard-E', 'language' => 'tr-TR', 'gender' => 'MALE'],
            ['name' => 'tr-TR-Wavenet-A', 'language' => 'tr-TR', 'gender' => 'FEMALE'],
            ['name' => 'tr-TR-Wavenet-B', 'language' => 'tr-TR', 'gender' => 'MALE'],
            ['name' => 'tr-TR-Wavenet-C', 'language' => 'tr-TR', 'gender' => 'FEMALE'],
            ['name' => 'tr-TR-Wavenet-D', 'language' => 'tr-TR', 'gender' => 'FEMALE'],
            ['name' => 'tr-TR-Wavenet-E', 'language' => 'tr-TR', 'gender' => 'MALE'],
            ['name' => 'uk-UA-Standard-A', 'language' => 'uk-UA', 'gender' => 'FEMALE'],
            ['name' => 'uk-UA-Wavenet-A', 'language' => 'uk-UA', 'gender' => 'FEMALE'],
            ['name' => 'ur-IN-Standard-A', 'language' => 'ur-IN', 'gender' => 'FEMALE'],
            ['name' => 'ur-IN-Standard-B', 'language' => 'ur-IN', 'gender' => 'MALE'],
            ['name' => 'ur-IN-Wavenet-A', 'language' => 'ur-IN', 'gender' => 'FEMALE'],
            ['name' => 'ur-IN-Wavenet-B', 'language' => 'ur-IN', 'gender' => 'MALE'],
            ['name' => 'vi-VN-Neural2-A', 'language' => 'vi-VN', 'gender' => 'FEMALE'],
            ['name' => 'vi-VN-Neural2-D', 'language' => 'vi-VN', 'gender' => 'MALE'],
            ['name' => 'vi-VN-Standard-A', 'language' => 'vi-VN', 'gender' => 'FEMALE'],
            ['name' => 'vi-VN-Standard-B', 'language' => 'vi-VN', 'gender' => 'MALE'],
            ['name' => 'vi-VN-Standard-C', 'language' => 'vi-VN', 'gender' => 'FEMALE'],
            ['name' => 'vi-VN-Standard-D', 'language' => 'vi-VN', 'gender' => 'MALE'],
            ['name' => 'vi-VN-Wavenet-A', 'language' => 'vi-VN', 'gender' => 'FEMALE'],
            ['name' => 'vi-VN-Wavenet-B', 'language' => 'vi-VN', 'gender' => 'MALE'],
            ['name' => 'vi-VN-Wavenet-C', 'language' => 'vi-VN', 'gender' => 'FEMALE'],
            ['name' => 'vi-VN-Wavenet-D', 'language' => 'vi-VN', 'gender' => 'MALE'],
            ['name' => 'yue-HK-Standard-A', 'language' => 'yue-HK', 'gender' => 'FEMALE'],
            ['name' => 'yue-HK-Standard-B', 'language' => 'yue-HK', 'gender' => 'MALE'],
            ['name' => 'yue-HK-Standard-C', 'language' => 'yue-HK', 'gender' => 'FEMALE'],
            ['name' => 'yue-HK-Standard-D', 'language' => 'yue-HK', 'gender' => 'MALE'],
        ];
    }

    public static function getMetaboxLabel($field_name)
    {
        $meta_labels = [
            'explore-mission-complete-cutscene' => 'Mission to complete after cutscene.',
            'explore-mission-cutscene' => 'Mission that triggers this cutscene.',
            'explore-mission-trigger' => 'Triggers the completion of this mission.',
            'explore-video-override' => 'Override the feature image witha video',
        ];

        if ($field_name) {
            return $meta_labels[$field_name] ?? $field_name;
        }

        return $field_name;
    }

    /**
     * Get meta html.
     * @param $key
     * @param $value
     * @param $meta_values
     * @param $main_key
     * @param $sub_value
     * @return false|string
     */
    public static function getMetaHtml($key, $value, $meta_values, $main_key = false, $sub_value = false)
    {
        ob_start();
        if ( false === is_array($value)) {
            include plugin_dir_path(__FILE__) . "../templates/meta/fields/{$value}.php";
        }

        return ob_get_clean();
    }

    /**
     * @action explore-communication-type_edit_form_fields
     * @param $term_id
     * @return void
     */
    public function addTaxonomyImageUpload($term)
    {
        $meta_values['explore-background'] = get_term_meta($term->term_id, 'explore-background', true);
        $key = 'explore-background';
        $main_key = false;


        include plugin_dir_path(__FILE__) . "../templates/meta/fields/upload.php";
    }

    /**
     * Save communication type term meta
     * @action edited_explore-communication-type
     */
    public function saveCommunicationTypeMeta($term_id) {
        $background_url = filter_input(INPUT_POST, 'explore-background', FILTER_SANITIZE_URL);

        if (true === isset($background_url)) {
            update_term_meta($term_id, 'explore-background', $background_url);
        }
    }
}
