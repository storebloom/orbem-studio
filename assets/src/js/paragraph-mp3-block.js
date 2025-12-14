import { InspectorControls, MediaUpload, MediaUploadCheck, RichText } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { Button, PanelBody, SelectControl, CheckboxControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

function useExploreVoiceMeta(postId) {
    return useSelect((select) => {
        const meta = select('core').getEntityRecord('postType', 'explore-character', postId)?.meta;
        return meta ? meta['explore-voice'] : null;
    }, [postId]);
}

registerBlockType('orbem/paragraph-mp3', {
    title: __('Paragraph with MP3', 'custom'),
    description: __('A paragraph block with an MP3 upload option.', 'custom'),
    category: 'orbem-order-studio',
    icon: 'media-audio',
    supports: {
        html: false,
    },
    attributes: {
        content: {
            type: 'string',
            source: 'html',
            selector: 'p',
        },
        mp3Url: {
            type: 'string',
            default: '',
        },
        selectedCharacter: {
            type: 'number',
            default: null,
        },
        selectedVoice: {
            type: 'string',
            default: '',
        },
        triggerPath: {
            type: 'boolean',
            default: false,
        },
    },

    edit: ({ attributes, setAttributes }) => {
        const characters = useSelect((select) => {
            return select('core').getEntityRecords('postType', 'explore-character', { per_page: -1 });
        }, []);

        const { content, mp3Url, selectedCharacter, selectedVoice } = attributes;

        const voiceMeta = useExploreVoiceMeta(selectedCharacter);

        if (selectedVoice !== voiceMeta || (undefined === selectedVoice || null === selectedVoice)) {
            setAttributes({ selectedVoice: voiceMeta });
        }

        const onChangeCharacter = (postId) => {
            setAttributes({ selectedCharacter: parseInt(postId, 10), selectedVoice: voiceMeta });
        };

        return (
            <>
                <InspectorControls>
                    <PanelBody title={__('MP3 File', 'custom')}>
                        <MediaUploadCheck>
                            <MediaUpload
                                onSelect={(media) => setAttributes({ mp3Url: media.url })}
                                allowedTypes={['audio']}
                                render={({ open }) => (
                                    <Button onClick={open} variant="secondary">
                                        {mp3Url ? __('Replace MP3', 'custom') : __('Upload MP3', 'custom')}
                                    </Button>
                                )}
                            />
                        </MediaUploadCheck>
                        {mp3Url && (
                            <div style={{ marginTop: '10px' }}>
                                <audio controls src={mp3Url} style={{ width: '100%' }} />
                            </div>
                        )}
                    </PanelBody>
                    <PanelBody title={__('Explore Character Select', 'custom')}>
                        {Array.isArray(characters) ? (
                            characters.length > 0 ? (
                                <SelectControl
                                    label={__('Select a Character', 'custom')}
                                    value={selectedCharacter}
                                    options={[
                                        { label: __('None', 'custom'), value: null },
                                        ...characters.map((character) => ({
                                            label: character.title.rendered,
                                            value: character.id,
                                        })),
                                    ]}
                                    onChange={onChangeCharacter}
                                />
                            ) : (
                                <p>{__('No characters found.', 'custom')}</p>
                            )
                        ) : (
                            <p>{__('Loading characters...', 'custom')}</p>
                        )}
                    </PanelBody>
                    <PanelBody title={__('Trigger Path', 'custom')}>
                        <CheckboxControl
                            label={__('Enable Trigger Path', 'custom')}
                            checked={attributes.triggerPath}
                            onChange={(newValue) => setAttributes({ triggerPath: newValue })}
                        />
                    </PanelBody>
                </InspectorControls>

                <span className={`explore-character-${selectedCharacter}`} data-voice={selectedVoice} {...(attributes.triggerPath ? { 'data-triggerpath': 'true' } : {})}>
                    <RichText
                        tagName="p"
                        value={content}
                        onChange={(newContent) => setAttributes({ content: newContent })}
                        placeholder={__('Write your paragraph here...', 'custom')}
                    />
                    {mp3Url && (
                        <audio controls src={mp3Url} style={{ position: 'absolute', left: '-56000px' }} />
                    )}
                </span>
            </>
        );
    },

    save: ({ attributes }) => {
        const { content, mp3Url, selectedCharacter, selectedVoice } = attributes;
        const characterClass = selectedCharacter ? `explore-character-${selectedCharacter}` : '';

        return (
            <span className={characterClass} data-voice={selectedVoice} {...(attributes.triggerPath ? { 'data-triggerpath': 'true' } : {})}>
                <RichText.Content tagName="p" value={content} />
                {mp3Url && <audio controls src={mp3Url} style={{ position: 'absolute', left: '-56000px' }} />}
            </span>
        );
    },
});
