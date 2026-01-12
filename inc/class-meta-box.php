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
	public object $plugin;

	/**
	 * Class constructor.
	 *
	 * @param object $plugin Plugin class.
	 */
	public function __construct(object $plugin) {
		$this->plugin = $plugin;
	}

    /**
     * Adding the explore character date to rest api.
     *
     * @filter rest_prepare_explore-character
     * @param $response
     * @param $post
     * @return mixed
     */
    public function addMetaToRest($response, $post): mixed
    {
        $meta_value = get_post_meta($post->ID, 'explore-voice', true);
        if (!isset($response->data['meta'])) {
            $response->data['meta'] = array();
        }
        $response->data['meta']['explore-voice'] = $meta_value;
        return $response;
    }

	/**
	 * Register the new orbem studio metabox.
	 *
	 * @action add_meta_boxes
	 */
	public function exploreMetabox(): void
    {
		// Get all post types available.
		$post_types = ['explore-explainer', 'explore-minigame', 'explore-point', 'explore-area', 'explore-character', 'explore-enemy', 'explore-weapon', 'explore-magic', 'explore-cutscene', 'explore-mission', 'explore-sign', 'explore-wall', 'explore-communicate'];

		// Add the Explore Point meta box to editor pages.
		add_meta_box( 'explore-point', esc_html__( 'Configuration', 'orbem-studio' ), [$this, 'explorePointBox'], $post_types, 'normal', 'high' );
	}

	/**
	 * Call back function for the metabox.
	 */
	public function explorePointBox($post): void
    {
        $orbem_studio_front_end = is_string($post);
        $post_type = is_string($post) ? $post : $post->post_type;
        $orbem_studio_meta_data = $this->getMetaData($post_type);
        $orbem_studio_values = [];


        if ( false !== $post_type ) {
            foreach ($orbem_studio_meta_data as $meta_info_fields) {
                foreach ($meta_info_fields as $meta_key => $meta_info) {
                    $meta_key = str_replace('-required', '', $meta_key);
                    
                    $orbem_studio_values[$meta_key] = get_post_meta($post->ID, $meta_key, true);
                }
            }
        }

		// Include the meta box template.
		include "{$this->plugin->dir_path}/templates/meta/meta-box.php";
	}

    /**
     * Save meta
     *
     * @action save_post, 1
     */
    public function saveMeta($post_id): void
    {
        // Verify nonce
        if (!isset($_POST['orbem_meta_box_nonce']) ||
            !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['orbem_meta_box_nonce'])), 'orbem_meta_box_save')
        ) {
            return;
        }

        // Check if revision.
        if (true === wp_is_post_revision($post_id)) {
            return;
        }

        // Capability check
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        // Check if the request came from the WordPress save post process
        if (wp_is_post_autosave($post_id)) {
            return;
        }

        $post_type = get_post_type($post_id);
        $meta_data = $this->getMetaData($post_type);

        if (false === in_array($post_type, ['post', 'page'], true)) {
            // Compile meta data.
            foreach ($meta_data as $group_key => $array_value) {
                foreach ($array_value as $key => $value) {
                    $type = is_array($value[0]) ? key($value[0]) : $value[0];
                    $key = str_replace('-required', '', $key);
                    $raw_value = $_POST[$key] ?? null;
                    $raw_value = wp_unslash($raw_value);

                    if (
                        is_array($raw_value)
                        && !in_array($type, ['radio', 'select'], true)
                    ) {
                        $sanitized = $this->sanitizeRecursive($raw_value);

                        update_post_meta($post_id, $key, $sanitized);
                    } else {
                        $raw_value = wp_unslash(filter_input(INPUT_POST, $key, FILTER_UNSAFE_RAW));

                        update_post_meta($post_id, $key, sanitize_text_field($raw_value) ?? '');
                    }
                }
            }
        }
    }

    /**
     * Recursively sanitize array values.
     *
     * @param mixed $value
     * @return mixed
     */
    private function sanitizeRecursive(mixed $value): mixed
    {
        if (is_array($value)) {
            $clean = [];
            foreach ($value as $k => $v) {
                $clean[sanitize_key($k)] = $this->sanitizeRecursive($v);
            }
            return $clean;
        }

        if (is_string($value)) {
            return sanitize_text_field($value);
        }

        if (is_int($value) || is_float($value)) {
            return $value;
        }

        if (is_bool($value)) {
            return (bool) $value;
        }

        return null;
    }

    public function getMetaData($post_type = '')
    {
        $explore_item_array = $this->plugin->util->getOrbemArray('explore-point');
        $explore_area_array = $this->plugin->util->getOrbemArray('explore-area');
        $explore_communicate_array = $this->plugin->util->getOrbemArray('explore-communication-type', true);
        $explore_character_array = $this->plugin->util->getOrbemArray('explore-character');
        $explore_enemy_array = $this->plugin->util->getOrbemArray('explore-enemy');
        $explore_weapon_array = $this->plugin->util->getOrbemArray('explore-weapon');
        $explore_mission_array = $this->plugin->util->getOrbemArray('explore-mission');
        $explore_minigame_array = $this->plugin->util->getOrbemArray('explore-minigame');
        $explore_cutscene_array = $this->plugin->util->getOrbemArray('explore-cutscene');
        $explore_hazard_array = $this->plugin->util->getOrbemArray('explore-point', false, 'explore-interaction-type', 'hazard');
        $default_weapon = get_option('explore_default_weapon', false);
        $explore_value_array = [
            'point',
            'mana',
            'health',
            'money'
        ];
        $character_images = [
            'static-required' => 'upload',
            'static-up-required' => 'upload',
            'static-left-required' => 'upload',
            'static-right-required' => 'upload',
            'static-down-required' => 'upload',
            'static-up-drag' => 'upload',
            'static-left-drag' => 'upload',
            'static-right-drag' => 'upload',
            'up-required' => 'upload',
            'down-required' => 'upload',
            'left-required' => 'upload',
            'right-required' => 'upload',
            'up-punch-required' => 'upload',
            'down-punch-required' => 'upload',
            'left-punch-required' => 'upload',
            'right-punch-required' => 'upload',
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

                'Area Media' => [
                    'explore-map-required' => [
                        'upload',
                        'The background image for this area. All characters, items, and triggers will be placed on top of this image. Recommended minimum size: 5000 × 4517 pixels.'
                    ],
                    'explore-music' => [
                        'upload',
                        'Background music that will play while the player is in this area.'
                    ],
                ],

                'Player Entry Position' => [
                    'explore-start-top-required' => [
                        'number',
                        'The vertical (top) position where the player character will appear when entering this area.'
                    ],
                    'explore-start-left-required' => [
                        'number',
                        'The horizontal (left) position where the player character will appear when entering this area.'
                    ],
                    'explore-start-direction' => [
                        [
                            'select' => [
                                'up',
                                'down',
                                'left',
                                'right'
                            ]
                        ],
                        'The direction the character will be facing when they enter this area.'
                    ],
                ],

                'Area Flow & Behavior' => [
                    'explore-is-cutscene' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Set this to "yes" to make this area a cutscene. Cutscene areas are not walkable and are used only for scripted scenes.'
                    ],
                ],

                'Area Transition Trigger' => [
                    'explore-area' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the destination area the player will be sent to when this area\'s trigger is activated.'
                    ],
                    'explore-top' => [
                        'number',
                        'The vertical (top) position of this area\'s trigger on the map.'
                    ],
                    'explore-left' => [
                        'number',
                        'The horizontal (left) position of this area\'s trigger on the map.'
                    ],
                    'explore-height' => [
                        'number',
                        'The height of the trigger area.'
                    ],
                    'explore-width' => [
                        'number',
                        'The width of the trigger area.'
                    ],
                ],

                'Communication Context' => [
                    'explore-communicate-type' => [
                        [
                            'select' => $explore_communicate_array,
                        ],
                        'Select which communication device or dialogue system is used in this area.'
                    ],
                ],

            ],
            'explore-sign' => [

                'Trigger Area' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this focus view trigger will appear.'
                    ],
                ],

                'Trigger Position & Size' => [
                    'explore-top-required' => [
                        'number',
                        'The top position of the focus view trigger within the area. This trigger opens the content in a close-up view.'
                    ],
                    'explore-left-required' => [
                        'number',
                        'The left position of the focus view trigger within the area. This trigger opens the content in a close-up view.'
                    ],
                    'explore-height-required' => [
                        'number',
                        'The height of the focus view trigger area that activates the close-up view.'
                    ],
                    'explore-width-required' => [
                        'number',
                        'The width of the focus view trigger area that activates the close-up view.'
                    ],
                ],

            ],
            'explore-wall' => [

                'Wall Area' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this wall will exist.'
                    ],
                ],

                'Wall Position & Size' => [
                    'explore-top-required' => [
                        'number',
                        'The top position of this wall within the area.'
                    ],
                    'explore-left-required' => [
                        'number',
                        'The left position of this wall within the area.'
                    ],
                    'explore-height-required' => [
                        'number',
                        'The height of this wall.'
                    ],
                    'explore-width-required' => [
                        'number',
                        'The width of this wall.'
                    ],
                ],
            ],
            'explore-mission' => [

                'Mission Area' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this mission will be available.'
                    ],
                ],

                'Mission Rewards' => [
                    'explore-value' => [
                        'number',
                        'The amount of points or currency awarded when this mission is completed.'
                    ],
                    'explore-value-type' => [
                        [
                            'select' => $explore_value_array
                        ],
                        'Select the type of reward given for completing this mission.'
                    ],
                    'explore-ability' => [
                        [
                            'select' => [
                                'transportation'
                            ]
                        ],
                        'Select the ability rewarded for completing this mission.'
                    ],
                ],

                'Mission Progression' => [
                    'explore-next-mission' => [
                        [
                            'multiselect' => $explore_mission_array
                        ],
                        'Select one or more missions that will become active after this mission is completed.'
                    ],
                ],

                'Mission Completion Triggers' => [
                    'explore-mission-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'height' => 'number',
                            'width' => 'number',
                        ],
                        'Define the trigger area that completes this mission when the player interacts with it.'
                    ],
                    'explore-trigger-item' => [
                        [
                            'multiselect' => $explore_item_array
                        ],
                        'Select item(s) required to complete this mission. If multiple items are selected, all must be interacted with.'
                    ],
                    'explore-trigger-enemy' => [
                        [
                            'select' => $explore_enemy_array
                        ],
                        'Select an enemy that completes this mission when defeated.'
                    ],
                ],

                'Mission Blockade' => [
                    'explore-top' => [
                        'number',
                        'The top position of the mission blockade. The blockade is removed when the mission is completed.'
                    ],
                    'explore-left' => [
                        'number',
                        'The left position of the mission blockade. The blockade is removed when the mission is completed.'
                    ],
                    'explore-height' => [
                        'number',
                        'The height of the mission blockade. The blockade is removed when the mission is completed.'
                    ],
                    'explore-width' => [
                        'number',
                        'The width of the mission blockade. The blockade is removed when the mission is completed.'
                    ],
                    'explore-hazard-remove' => [
                        [
                            'select' => $explore_hazard_array
                        ],
                        'Select a hazard that will be removed when this mission is completed.'
                    ],
                ],

            ],
            'explore-cutscene' => [

                'Cutscene Area & Trigger' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this cutscene trigger will appear.'
                    ],
                    'explore-cutscene-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'height' => 'number',
                            'width' => 'number',
                        ],
                        'Define the trigger area that starts this cutscene.'
                    ],
                    'explore-trigger-type' => [
                        [
                            'radio' => [
                                'auto',
                                'engagement'
                            ]
                        ],
                        'Choose how the cutscene is triggered. "Auto" starts when the player enters the trigger. "Engagement" starts when the action key is pressed.'
                    ],
                ],

                'Cutscene Music & Audio' => [
                    'explore-cutscene-music' => [
                        'upload',
                        'Music that will play while this cutscene is active.'
                    ],
                    'explore-mute-music' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Choose whether the current area music should be muted during this cutscene.'
                    ],
                    'explore-engage-communicate' => [
                        [
                            'select' => $explore_communicate_array
                        ],
                        'Select a communication item that will be sent to the player after this cutscene.'
                    ],
                ],

                'Cutscene Availability & Materialization' => [
                    'explore-materialize-item-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'width' => 'number',
                            'height' => 'number',
                        ],
                        'Define a trigger that makes this cutscene available. Until activated, the cutscene trigger will remain hidden.'
                    ],
                    'explore-remove-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that, once completed, will remove this cutscene trigger.'
                    ],
                    'explore-materialize-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will reveal this cutscene trigger after it is completed.'
                    ],
                    'explore-materialize-after-mission' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select a mission that will reveal this cutscene trigger after it is completed.'
                    ],
                ],

                'Character & NPC Configuration' => [
                    'explore-character' => [
                        [
                            'select' => $explore_character_array
                        ],
                        'Select the NPC involved in this cutscene.'
                    ],
                    'explore-cutscene-character-position' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                        ],
                        'Set the position your character moves to before or after the cutscene.'
                    ],
                    'explore-cutscene-move-npc' => [
                        [
                            'trigger' => [
                                'radio' => [
                                    'before',
                                    'after'
                                ]
                            ]
                        ],
                        'Choose whether the NPC begins moving before or after the cutscene.'
                    ],
                    'explore-npc-face-me' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Choose whether the NPC should face the player during the cutscene.'
                    ],
                    'explore-path-after-cutscene' => [
                        [
                            'repeater' => [
                                'top' => 'number',
                                'left' => 'number'
                            ]
                        ],
                        'Define the path the NPC will walk after the cutscene ends.'
                    ],
                    'explore-speed' => [
                        'number',
                        'Set how fast the NPC moves along the post-cutscene path.'
                    ],
                    'explore-time-between' => [
                        'number',
                        'Set the pause duration between each movement point in the NPC path.'
                    ],
                ],

                'Mission & Cutscene Integration' => [
                    'explore-mission-cutscene' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select a mission that will trigger this cutscene upon completion.'
                    ],
                    'explore-mission-complete-cutscene' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select a mission that will be marked complete after this cutscene finishes.'
                    ],
                ],

                'Cutscene Rewards & Progression' => [
                    'explore-value' => [
                        'number',
                        'The amount of reward granted for completing this cutscene. This is separate from mission rewards.'
                    ],
                    'explore-value-type' => [
                        [
                            'select' => $explore_value_array
                        ],
                        'Select the type of reward granted for completing this cutscene.'
                    ],
                    'explore-next-area' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area the player will be sent to after this cutscene ends.'
                    ],
                    'explore-cutscene-next-area-position' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                        ],
                        'Set the starting position for the character if the cutscene sends them to another area.'
                    ],
                    'explore-cutscene-boss' => [
                        [
                            'select' => $explore_enemy_array
                        ],
                        'Select the boss that will begin combat after this cutscene completes.'
                    ],
                ],

                'NPC Interaction' => [
                    'explore-character' => [
                        [
                            'select' => $explore_character_array
                        ],
                        'Select the NPC involved in this cutscene.'
                    ],
                ],

            ],
            'explore-weapon' => [

                'Weapon Placement & Position' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this weapon can be found.'
                    ],
                    'explore-top-required' => [
                        'number',
                        'The top position of this weapon within the area when it is placed for collection.'
                    ],
                    'explore-left-required' => [
                        'number',
                        'The left position of this weapon within the area when it is placed for collection.'
                    ],
                    'explore-height-required' => [
                        'number',
                        'The height of the weapon’s interaction area on the map.'
                    ],
                    'explore-width-required' => [
                        'number',
                        'The width of the weapon’s interaction area on the map.'
                    ],
                    'explore-rotation' => [
                        'number',
                        'The visual rotation of this weapon on the map.'
                    ],
                    'explore-layer' => [
                        'number',
                        'Controls how this weapon is layered visually. Higher numbers appear in front of lower numbers.'
                    ],
                ],

                'Weapon Stats & Type' => [
                    'explore-attack-required' => [
                        [
                            'normal' => 'number',
                            'heavy' => 'number',
                            'charged' => 'number',
                        ],
                        'Define the damage values for each attack type of this weapon.'
                    ],
                    'explore-projectile' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Choose whether this weapon fires a projectile instead of performing a melee attack.'
                    ],
                    'explore-value-type-required' => [
                        [
                            'select' => ['weapons']
                        ],
                        'Defines the item category for this object.'
                    ],
                ],

                'Weapon Materialization & Visibility' => [
                    'explore-materialize-item-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'width' => 'number',
                            'height' => 'number',
                        ],
                        'Define a trigger that causes this weapon to appear. If set, the weapon remains hidden until triggered.'
                    ],
                    'explore-remove-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will remove this weapon after it finishes.'
                    ],
                    'explore-materialize-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will reveal this weapon after it finishes.'
                    ],
                    'explore-materialize-after-mission' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select a mission that will reveal this weapon after it is completed.'
                    ],
                ],

            ],
            'explore-character' => [

                'Character Placement & Position' => [
                    'explore-area' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this character will appear.'
                    ],
                    'explore-top' => [
                        'number',
                        'The top position of this character within the area.'
                    ],
                    'explore-left' => [
                        'number',
                        'The left position of this character within the area.'
                    ],
                    'explore-height-required' => [
                        'number',
                        'The height of this character’s interaction area.'
                    ],
                    'explore-width-required' => [
                        'number',
                        'The width of this character’s interaction area.'
                    ],
                    'explore-rotation' => [
                        'number',
                        'The visual rotation of this character.'
                    ],
                    'explore-layer' => [
                        'number',
                        'Controls how this character is layered visually. Higher numbers appear in front of lower numbers.'
                    ],
                ],

                'Character Identity & Visuals' => [
                    'explore-character-name' => [
                        'text',
                        'Optional display name that overrides the character’s default name.'
                    ],
                    'explore-character-images' => [
                        $character_images,
                        'The default images used for this character when no weapons or gear are equipped.'
                    ],
                    'explore-ability' => [
                        [
                            'select' => [
                                'speed',
                                'strength',
                                'hazard',
                                'programming',
                            ]
                        ],
                        'Select the special ability this playable character has.'
                    ],
                    'explore-voice' => [
                        [
                            'select' => $this->getVoices()
                        ],
                        'Select the voice used for this character’s dialogue. Requires a Google Text-to-Speech API key.'
                    ],
                    'explore-crew-mate' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Choose whether this character can be collected and used as an additional playable character.'
                    ],
                ],

                'Weapon & Gear Configuration' => [
                    'explore-weapon-images' => [
                        $weapon_images,
                        'Character images that are shown when specific weapons are equipped.'
                    ],
                    'explore-weapon-choice' => [
                        [
                            'select' => $explore_weapon_array
                        ],
                        'Select the default weapon assigned to this playable character.'
                    ],
                ],

                'Movement & Pathing' => [
                    'explore-speed' => [
                        'number',
                        'The movement speed of this NPC.'
                    ],
                    'explore-wanderer' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Enable wandering behavior. Wanderers move intelligently through available areas and ignore predefined paths.'
                    ],
                    'explore-path' => [
                        [
                            'repeater' => [
                                'top' => 'number',
                                'left' => 'number'
                            ]
                        ],
                        'Define a fixed walking path for this NPC.'
                    ],
                    'explore-repeat' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Choose whether the defined walking path should loop when it reaches the end.'
                    ],
                    'explore-time-between' => [
                        'number',
                        'The pause duration between each movement point in the walking path.'
                    ],
                    'explore-path-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'height' => 'number',
                            'width' => 'number',
                            'cutscene' => [
                                'select' => $explore_cutscene_array
                            ],
                            'item' => [
                                'select' => $explore_item_array
                            ],
                        ],
                        'Define triggers that cause this NPC to start moving.'
                    ],
                ],

                'Materialization & Visibility' => [
                    'explore-materialize-item-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'width' => 'number',
                            'height' => 'number',
                        ],
                        'Define a trigger that causes this character to appear. If set, the character remains hidden until triggered.'
                    ],
                    'explore-remove-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will remove this character after it finishes.'
                    ],
                    'explore-materialize-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will reveal this character after it finishes.'
                    ],
                    'explore-materialize-after-mission' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select a mission that will reveal this character after it is completed.'
                    ],
                ],

            ],
            'explore-enemy' => [

                'Enemy Placement & Position' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this enemy will appear.'
                    ],
                    'explore-top-required' => [
                        'number',
                        'The top position of this enemy within the area.'
                    ],
                    'explore-left-required' => [
                        'number',
                        'The left position of this enemy within the area.'
                    ],
                    'explore-height-required' => [
                        'number',
                        'The height of this enemy’s interaction area.'
                    ],
                    'explore-width-required' => [
                        'number',
                        'The width of this enemy’s interaction area.'
                    ],
                    'explore-rotation' => [
                        'number',
                        'The visual rotation of this enemy.'
                    ],
                    'explore-layer' => [
                        'number',
                        'Controls how this enemy is layered visually. Higher numbers appear in front of lower numbers.'
                    ],
                ],

                'Enemy Identity & Visuals' => [
                    'explore-character-name' => [
                        'text',
                        'Optional display name that overrides the enemy’s default name.'
                    ],
                    'explore-character-images-required' => [
                        $character_images,
                        'The images used to visually represent this enemy.'
                    ],
                    'explore-enemy-type-required' => [
                        [
                            'select' => [
                                'blocker',
                                'shooter',
                                'runner',
                                'boss'
                            ]
                        ],
                        'Select the enemy behavior type: Blocker (stationary), Shooter (fires projectiles), Runner (charges the player), or Boss (uses multi-phase attacks).'
                    ],
                    'explore-value' => [
                        'number',
                        'The amount of damage this enemy deals to the player.'
                    ],
                    'explore-health-required' => [
                        'number',
                        'The total health points of this enemy.'
                    ],
                    'explore-voice' => [
                        [
                            'select' => $this->getVoices()
                        ],
                        'Select the voice used for this enemy’s dialogue or sounds.'
                    ],
                ],

                'Movement & Pathing' => [
                    'explore-speed' => [
                        'number',
                        'The movement speed of this enemy.'
                    ],
                    'explore-wanderer' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Enable wandering behavior so this enemy moves freely through available areas.'
                    ],
                    'explore-path' => [
                        [
                            'repeater' => [
                                'top'  => 'number',
                                'left' => 'number'
                            ]
                        ],
                        'Define a fixed movement path for this enemy.'
                    ],
                    'explore-repeat' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Choose whether the movement path should repeat when it ends.'
                    ],
                    'explore-time-between' => [
                        'number',
                        'The pause duration between each movement point in the path.'
                    ],
                    'explore-path-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'height' => 'number',
                            'width' => 'number',
                            'cutscene' => [
                                'select' => $explore_cutscene_array
                            ],
                            'item' => [
                                'select' => $explore_item_array
                            ],
                        ],
                        'Define triggers that cause this enemy to begin moving.'
                    ],
                ],

                'Materialization & Visibility' => [
                    'explore-materialize-item-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'width' => 'number',
                            'height' => 'number',
                        ],
                        'Define a trigger that causes this enemy to appear. If set, the enemy remains hidden until triggered.'
                    ],
                    'explore-remove-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will remove this enemy after it finishes.'
                    ],
                    'explore-materialize-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will reveal this enemy after it finishes.'
                    ],
                    'explore-materialize-after-mission' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select a mission that will reveal this enemy after it is completed.'
                    ],
                ],

                'Projectile & Attack Configuration' => [
                    'explore-projectile' => [
                        [
                            'image-url' => 'upload',
                            'width' => 'number',
                            'height' => 'number',
                        ],
                        'Configure the projectile used by this enemy. Applies only to shooter and boss types.'
                    ],
                    'explore-enemy-speed' => [
                        'number',
                        'The speed at which this enemy’s projectiles move.'
                    ],
                    'explore-projectile-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'height' => 'number',
                            'width' => 'number',
                        ],
                        'Define the trigger area that causes this enemy to fire projectiles.'
                    ],
                ],

                'Weakness & Boss Patterns' => [
                    'explore-weapon-weakness' => [
                        [
                            'select' => $explore_weapon_array
                        ],
                        'Select the weapon required to damage this enemy.'
                    ],
                    'explore-boss-waves' => [
                        [
                            'multiselect' => [
                                'projectile',
                                'pulse-wave'
                            ]
                        ],
                        'Select the attack patterns this boss can use during combat.'
                    ],
                ],

            ],
            'explore-minigame' => [

                'Minigame Placement & Access' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this minigame can be accessed.'
                    ],
                    'explore-mission' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select the mission that will be completed when this minigame is successfully finished.'
                    ],
                ],

                'Minigame Configuration' => [
                    'explore-minigame-type-required' => [
                        [
                            'select' => ['draggable']
                        ],
                        'Select the type of minigame to use.'
                    ],
                    'explore-draggable-items' => [
                        [
                            'repeater' => [
                                'draggable-item' => 'upload',
                                'width'          => 'number',
                                'height'         => 'number',
                            ]
                        ],
                        'Define the draggable objects required to complete the minigame. The featured image is used as the background.'
                    ],
                    'explore-translate-binary-word' => [
                        'text',
                        'Optional word the player must translate into binary to finish the minigame. Leave empty to disable this step.'
                    ],
                ],

                'Minigame Audio' => [
                    'explore-minigame-music' => [
                        'upload',
                        'Background music that plays while the minigame is active.'
                    ],
                ],

            ],
            'explore-communicate' => [

                'Communication Trigger Placement' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this communication trigger will appear.'
                    ],
                    'explore-top-required' => [
                        'number',
                        'The top position of the communication trigger within the area.'
                    ],
                    'explore-left-required' => [
                        'number',
                        'The left position of the communication trigger within the area.'
                    ],
                    'explore-height-required' => [
                        'number',
                        'The height of the communication trigger area.'
                    ],
                    'explore-width-required' => [
                        'number',
                        'The width of the communication trigger area.'
                    ],
                ],

                'Communication Type' => [
                    'explore-communicate-type-required' => [
                        [
                            'radio' => [
                                'text',
                                'voicemail'
                            ]
                        ],
                        'Choose whether this communication is delivered as text or a voicemail.'
                    ],
                ],

                'Visibility' => [
                    'explore-materialize-item-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'width' => 'number',
                            'height' => 'number',
                        ],
                        'Define a trigger that causes this communication to appear. If set, it remains hidden until triggered.'
                    ],
                    'explore-remove-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will remove this communication after it finishes.'
                    ],
                    'explore-materialize-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will reveal this communication after it finishes.'
                    ],
                    'explore-materialize-after-mission' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select a mission that will reveal this communication after it is completed.'
                    ],
                ],

            ],
            'explore-explainer' => [

                'Explainer Placement' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this explainer can be triggered.'
                    ],
                    'explore-top-required' => [
                        'number',
                        'The top position of the explainer. Used for map and menu types; ignored for fullscreen.'
                    ],
                    'explore-left-required' => [
                        'number',
                        'The left position of the explainer. Used for map and menu types; ignored for fullscreen.'
                    ],
                    'explore-height-required' => [
                        'number',
                        'The height of the explainer popup.'
                    ],
                    'explore-width-required' => [
                        'number',
                        'The width of the explainer popup. Acts as max width when using fullscreen.'
                    ],
                ],

                'Explainer Type & Display' => [
                    'explore-explainer-type-required' => [
                        [
                            'radio' => [
                                'map',
                                'menu',
                                'fullscreen'
                            ]
                        ],
                        'Choose how the explainer is displayed: Map (fixed in the map), Menu (floating in the HUD), or Fullscreen (centered overlay).'
                    ],
                    'explore-explainer-arrow' => [
                        [
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
                        'Configure the arrow that visually points to the element being explained.'
                    ],
                    'explore-sound-byte' => [
                        'upload',
                        'Audio that plays when the explainer appears, typically voice narration.'
                    ],
                ],

                'Trigger & Visibility' => [
                    'explore-explainer-trigger-required' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'width' => 'number',
                            'height' => 'number',
                        ],
                        'Define the trigger area that causes this explainer to appear.'
                    ],
                    'explore-materialize-item-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'width' => 'number',
                            'height' => 'number',
                        ],
                        'Define a trigger that causes this explainer to appear. If set, it remains hidden until triggered.'
                    ],
                    'explore-remove-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will permanently remove this explainer after it finishes.'
                    ],
                    'explore-materialize-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will reveal this explainer after it finishes.'
                    ],
                    'explore-materialize-after-mission' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select a mission that will reveal this explainer after it is completed.'
                    ],
                ],

            ],
            'explore-point' => [

                'Placement & Size' => [
                    'explore-area-required' => [
                        [
                            'select' => $explore_area_array
                        ],
                        'Select the area where this item will appear.'
                    ],
                    'explore-top-required' => [
                        'number',
                        'The top position of this item within the area.'
                    ],
                    'explore-left-required' => [
                        'number',
                        'The left position of this item within the area.'
                    ],
                    'explore-height-required' => [
                        'number',
                        'The height of this item’s interaction area.'
                    ],
                    'explore-width-required' => [
                        'number',
                        'The width of this item’s interaction area.'
                    ],
                    'explore-rotation' => [
                        'number',
                        'The visual rotation of this item.'
                    ],
                    'explore-layer' => [
                        'number',
                        'Controls visual stacking order. Higher numbers appear in front of lower numbers.'
                    ],
                    'explore-video-override' => [
                        'upload',
                        'Optional video that replaces the featured image when this item is displayed.'
                    ],
                ],

                'Interaction & Behavior' => [
                    'explore-interaction-type' => [
                        [
                            'select' => [
                                'collectable',
                                'breakable',
                                'draggable',
                                'hazard',
                            ]
                        ],
                        'Define how the player interacts with this item.'
                    ],
                    'explore-value' => [
                        'number',
                        'The reward or effect value applied when this item is interacted with.'
                    ],
                    'explore-value-type' => [
                        [
                            'select' => $explore_value_array
                        ],
                        'Select the type of reward granted when this item is collected or broken.'
                    ],
                    'explore-interacted' => [
                        'upload',
                        'Image shown after the item has been interacted with, if it does not disappear.'
                    ],
                    'explore-passable' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Choose whether the player can walk over this item after interacting with it.'
                    ],
                    'explore-disappear' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Choose whether this item should be removed from the map after interaction.'
                    ],
                    'explore-is-strong' => [
                        [
                            'radio' => [
                                'yes',
                                'no'
                            ]
                        ],
                        'Require the Strength ability in order to interact with this item.'
                    ],
                ],

                'Triggers & Visibility' => [
                    'explore-materialize-item-trigger' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'width' => 'number',
                            'height' => 'number',
                        ],
                        'Define a trigger that causes this item to appear. If set, it remains hidden until triggered.'
                    ],
                    'explore-remove-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will remove this item after it finishes.'
                    ],
                    'explore-materialize-after-cutscene' => [
                        [
                            'select' => $explore_cutscene_array
                        ],
                        'Select a cutscene that will reveal this item after it finishes.'
                    ],
                    'explore-materialize-after-mission' => [
                        [
                            'select' => $explore_mission_array
                        ],
                        'Select a mission that will reveal this item after it is completed.'
                    ],
                ],

                'Draggable & Timer Config' => [
                    'explore-drag-dest' => [
                        [
                            'top' => 'number',
                            'left' => 'number',
                            'width' => 'number',
                            'height' => 'number',
                            'image' => 'upload',
                            'mission' => [
                                'select' => $explore_mission_array
                            ],
                            'remove-after' => [
                                'radio' => [
                                    'yes',
                                    'no'
                                ]
                            ],
                            'offset' => 'number',
                            'materialize-after-cutscene' => [
                                'select' => $explore_cutscene_array
                            ],
                        ],
                        'Define a destination and outcome for draggable items.'
                    ],
                    'explore-timer' => [
                        [
                            'time' => 'number',
                            'trigger' => [
                                'select' => $explore_item_array
                            ],
                        ],
                        'Configure this item as part of a timed sequence. Multiple timer items must reference each other with the same duration.'
                    ],
                ],

                'Minigame Association' => [
                    'explore-minigame' => [
                        [
                            'select' => $explore_minigame_array
                        ],
                        'Select a minigame that will start when this item is interacted with.'
                    ],
                ],

            ],
        ];

        return $post_type_specific[$post_type] ?? [];
    }

    public function getVoices(): array
    {
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

    /**
     * Get meta html.
     * @param $orbem_studio_key
     * @param $value
     * @param $orbem_studio_meta_values
     * @param bool|string $orbem_studio_main_key
     * @param bool|string|array $orbem_studio_sub_value
     * @param bool|int $orbem_studio_repeat_index
     * @param bool $orbem_studio_required
     * @return false|string
     */
    public static function getMetaHtml($orbem_studio_key, $value, $orbem_studio_meta_values, bool|string $orbem_studio_main_key = false, bool|string|array $orbem_studio_sub_value = false, bool|int $orbem_studio_repeat_index = false, bool $orbem_studio_required = false): false|string
    {
        ob_start();
        if ( false === is_array($value)) {
            include plugin_dir_path(__FILE__) . "../templates/meta/fields/$value.php";
        }

        return ob_get_clean();
    }

    /**
     * Util to add image upload html for fields
     * @param $name
     * @param $slug
     * @param $values
     * @param bool $required
     * @return bool|string
     */
    public static function imageUploadHTML($name, $slug, $values, bool $required = false): bool|string
    {
        ob_start();
        ?>
        <div class="explore-image-field">
            <p>
                <?php
                $is_required = $required || str_contains($name, 'required');
                $name        = str_replace(' required', '', $name); // Remove required flag.

                if (false === empty($name)) {
                    echo esc_html($name) . ($is_required ? '<sup>*</sup>' : '');
                }
                ?>
                <?php if (false === empty($values) && false === str_contains($values, '.webm') && false === str_contains($values, '.mp4') && false === str_contains($values, '.mp3') && false === str_contains($values, '.wav')) : ?>
                    <img src="<?php echo esc_url($values); ?>" width="80" />
                    <br>
                <?php endif; ?>
                <input type="text" id="<?php echo esc_attr($slug); ?>" name="<?php echo esc_attr($slug); ?>" value="<?php echo esc_attr($values); ?>" class="widefat explore-upload-field" readonly<?php echo $is_required ? ' required ' : ''; ?> />
            </p>
            <p>
                <button type="button" class="upload_image_button button"><?php esc_html_e('Select', 'orbem-studio'); ?></button>
                <button type="button" class="remove_image_button button"><?php esc_html_e('Remove', 'orbem-studio'); ?></button>
            </p>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * @action explore-communication-type_edit_form_fields
     * @param $term
     * @return void
     */
    public function addTaxonomyImageUpload($term): void
    {
        $orbem_studio_meta_values           = get_term_meta($term->term_id, 'explore-background', true);
        $orbem_studio_allowed_tags          = wp_kses_allowed_html( 'post' );
        $orbem_studio_allowed_tags['input'] = [
            'value' => true,
            'type'  => true,
            'id'    => true,
            'class' => true,
        ];

        echo '<h2>Communicator Background</h2>';
        echo '<h4>Insert the background image that will show as the communicator device. Text and voice messages will show on top of it like a cell phone.</h4>';
        echo wp_kses(self::imageUploadHTML('',  'explore-background', $orbem_studio_meta_values), $orbem_studio_allowed_tags);
    }

    /**
     * Save communication type term meta
     * @action edited_explore-communication-type
     */
    public function saveCommunicationTypeMeta($term_id): void
    {
        $background_url = filter_input(INPUT_POST, 'explore-background', FILTER_SANITIZE_URL);

        if (true === isset($background_url)) {
            update_term_meta($term_id, 'explore-background', $background_url);
        }
    }
}
