import { InspectorControls, MediaUpload, MediaUploadCheck, RichText } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { Button, PanelBody, SelectControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

function useExploreVoiceMeta(postSlug) {
    const exploreVoiceMeta = useSelect((select) => {
        // Get the post by its slug
        const post = select('core').getEntityRecords('postType', 'explore-character', {
            slug: postSlug,
            per_page: 1,
        });

        // Check if post is defined and not empty
        if (!post || post.length === 0) {
            return null; // Post not found
        }

        // Get the post ID
        const postId = post[0].id;

        // Get the post meta for 'explore-voice'
        const meta = select('core').getEntityRecord('postType', 'explore-character', postId)?.meta;

        return meta ? meta['explore-voice'] : null;
    }, [postSlug]);

    return exploreVoiceMeta;
}

registerBlockType('orbem/paragraph-mp3', {
    title: __('Paragraph with MP3', 'custom'),
    description: __('A paragraph block with an MP3 upload option.', 'custom'),
    category: 'orbem-order-game-engine',
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
        selectedTerm: {
            type: 'string',
            default: '',
        },
        selectedVoice: {
            type: 'string',
            default: '',
        },
    },

    edit: ({ attributes, setAttributes }) => {
        const terms = useSelect((select) => {
            return select('core').getEntityRecords('taxonomy', 'explore-character-point', { per_page: -1 });
        }, []);

        const { content, mp3Url, selectedTerm, selectedVoice } = attributes;

        // Fetch the voice meta for the selected term
        const voiceMeta = useExploreVoiceMeta(selectedTerm);

        // Update selectedVoice when voiceMeta changes
        if (selectedVoice !== voiceMeta || ( undefined === selectedVoice || null === selectedVoice ) ) {
            setAttributes({selectedVoice: voiceMeta});
        }

        // Function to handle term selection
        const onChangeTerm = (termId) => {
            setAttributes({selectedTerm: termId, selectedVoice: voiceMeta});
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
                        {Array.isArray(terms) ? (
                            terms.length > 0 ? (
                                <SelectControl
                                    label={__('Select a Character', 'custom')}
                                    value={selectedTerm}
                                    options={[
                                        { label: __('None', 'custom'), value: null },
                                        ...terms.map((term) => ({
                                            label: term.name,
                                            value: term.slug,
                                        })),
                                    ]}
                                    onChange={onChangeTerm}
                                />
                            ) : (
                                <p>{__('No terms found.', 'custom')}</p>
                            )
                        ) : (
                            <p>{__('Loading terms...', 'custom')}</p>
                        )}
                    </PanelBody>
                </InspectorControls>

                <span className={selectedTerm} data-voice={selectedVoice}>
                    <RichText
                        tagName="p"
                        value={content}
                        onChange={(newContent) => setAttributes({ content: newContent })}
                        placeholder={__('Write your paragraph here...', 'custom')}
                    />
                    {mp3Url && (
                        <audio controls src={mp3Url} style={{ position:'absolute',left:'-56000px' }} />
                    )}
                </span>
            </>
        );
    },

    save: ({ attributes }) => {
        const { content, mp3Url, selectedTerm, selectedVoice } = attributes;
        const termClass = selectedTerm ? selectedTerm : '';

        return (
            <span className={termClass} data-voice={selectedVoice}>
                <RichText.Content tagName="p" value={content} />
                {mp3Url && <audio controls src={mp3Url} style={{ position:'absolute',left:'-56000px' }} />}
            </span>
        );
    },
});