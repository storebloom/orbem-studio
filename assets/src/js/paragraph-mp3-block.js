import {
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
} from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { createHigherOrderComponent } from '@wordpress/compose';
import {
	Button,
	PanelBody,
	SelectControl,
	CheckboxControl,
	TextareaControl,
	TextControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { cloneElement, createElement } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

function useExploreVoiceMeta(postId) {
	return useSelect(
		(select) => {
			const meta = select('core').getEntityRecord(
				'postType',
				'explore-character',
				postId
			)?.meta;
			return meta ? meta['explore-voice'] : null;
		},
		[postId]
	);
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
		translations: {
			type: 'array',
			default: [],
		},
	},

	edit: ({ attributes, setAttributes }) => {
		const characters = useSelect((select) => {
			return select('core').getEntityRecords(
				'postType',
				'explore-character',
				{ per_page: -1 }
			);
		}, []);

		const { content, mp3Url, selectedCharacter, selectedVoice, translations } =
			attributes;

		const voiceMeta = useExploreVoiceMeta(selectedCharacter);

		if (
			selectedVoice !== voiceMeta ||
			undefined === selectedVoice ||
			null === selectedVoice
		) {
			setAttributes({ selectedVoice: voiceMeta });
		}

		const onChangeCharacter = (postId) => {
			setAttributes({
				selectedCharacter: parseInt(postId, 10),
				selectedVoice: voiceMeta,
			});
		};

		const addTranslation = () => {
			setAttributes({
				translations: [
					...(translations || []),
					{ lang: '', content: '', mp3Url: '' },
				],
			});
		};

		const updateTranslation = (index, field, value) => {
			const updated = (translations || []).map((t, i) =>
				i === index ? { ...t, [field]: value } : t
			);
			setAttributes({ translations: updated });
		};

		const removeTranslation = (index) => {
			setAttributes({
				translations: (translations || []).filter((_, i) => i !== index),
			});
		};

		return (
			<>
				<InspectorControls>
					<PanelBody title={__('MP3 File', 'custom')}>
						<MediaUploadCheck>
							<MediaUpload
								onSelect={(media) =>
									setAttributes({ mp3Url: media.url })
								}
								allowedTypes={['audio']}
								render={({ open }) => (
									<Button onClick={open} variant='secondary'>
										{mp3Url
											? __('Replace MP3', 'custom')
											: __('Upload MP3', 'custom')}
									</Button>
								)}
							/>
						</MediaUploadCheck>
						{mp3Url && (
							<div style={{ marginTop: '10px' }}>
								<audio
									controls
									src={mp3Url}
									style={{ width: '100%' }}
								/>
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
										{
											label: __('None', 'custom'),
											value: null,
										},
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
							<p>{__('Loading characters…', 'custom')}</p>
						)}
					</PanelBody>
					<PanelBody title={__('Trigger Path', 'custom')}>
						<CheckboxControl
							label={__('Enable Trigger Path', 'custom')}
							checked={attributes.triggerPath}
							onChange={(newValue) =>
								setAttributes({ triggerPath: newValue })
							}
						/>
					</PanelBody>
					<PanelBody
						title={__('Translations', 'custom')}
						initialOpen={false}
					>
						<p
							style={{
								marginTop: 0,
								marginBottom: '12px',
								color: '#757575',
								fontSize: '12px',
							}}
						>
							{__(
								'The text above is the default language. Add translations below — the correct one is chosen automatically from the visitor\'s browser language.',
								'custom'
							)}
						</p>
						{(translations || []).map((translation, index) => (
							<div
								key={index}
								style={{
									marginBottom: '16px',
									padding: '12px',
									border: '1px solid #ddd',
									borderRadius: '4px',
									background: '#fafafa',
								}}
							>
								<strong
									style={{
										display: 'block',
										marginBottom: '8px',
										fontSize: '12px',
									}}
								>
									{__('Translation', 'custom')}{' '}
									{index + 1}
									{translation.lang
										? ` (${translation.lang})`
										: ''}
								</strong>
								<TextControl
									label={__(
										'Language Code (e.g. fr, es, de, ja, zh)',
										'custom'
									)}
									value={translation.lang}
									placeholder='fr'
									onChange={(val) =>
										updateTranslation(
											index,
											'lang',
											val.toLowerCase().trim()
										)
									}
								/>
								<TextareaControl
									label={__('Translated Text', 'custom')}
									value={translation.content}
									placeholder={__(
										'Enter translated text…',
										'custom'
									)}
									rows={3}
									onChange={(val) =>
										updateTranslation(index, 'content', val)
									}
								/>
								<MediaUploadCheck>
									<MediaUpload
										onSelect={(media) =>
											updateTranslation(
												index,
												'mp3Url',
												media.url
											)
										}
										allowedTypes={['audio']}
										render={({ open }) => (
											<Button
												onClick={open}
												variant='secondary'
												style={{ marginBottom: '8px' }}
											>
												{translation.mp3Url
													? __(
															'Replace MP3',
															'custom'
													  )
													: __(
															'Upload MP3',
															'custom'
													  )}
											</Button>
										)}
									/>
								</MediaUploadCheck>
								{translation.mp3Url && (
									<div style={{ marginBottom: '8px' }}>
										<audio
											controls
											src={translation.mp3Url}
											style={{ width: '100%' }}
										/>
									</div>
								)}
								<Button
									isDestructive
									onClick={() => removeTranslation(index)}
									style={{ marginTop: '4px' }}
								>
									{__('Remove', 'custom')}
								</Button>
							</div>
						))}
						<Button
							variant='secondary'
							onClick={addTranslation}
							style={{ marginTop: '4px' }}
						>
							{__('+ Add Translation', 'custom')}
						</Button>
					</PanelBody>
				</InspectorControls>

				<span
					className={`explore-character-${selectedCharacter}`}
					data-voice={selectedVoice}
					{...(attributes.triggerPath
						? { 'data-triggerpath': 'true' }
						: {})}
				>
					<RichText
						tagName='p'
						value={content}
						onChange={(newContent) =>
							setAttributes({ content: newContent })
						}
						placeholder={__('Write your paragraph here…', 'custom')}
					/>
					{mp3Url && (
						<audio
							controls
							src={mp3Url}
							style={{ position: 'absolute', left: '-56000px' }}
						/>
					)}
					{(translations || []).filter((t) => t.lang).length > 0 && (
						<span
							style={{
								display: 'block',
								fontSize: '11px',
								color: '#888',
								marginTop: '4px',
								fontStyle: 'italic',
							}}
						>
							{(translations || []).filter((t) => t.lang).length}{' '}
							{1 ===
							(translations || []).filter((t) => t.lang).length
								? __('translation', 'custom')
								: __('translations', 'custom')}
						</span>
					)}
				</span>
			</>
		);
	},

	save: ({ attributes }) => {
		const { content, mp3Url, selectedCharacter, selectedVoice, translations } =
			attributes;
		const characterClass = selectedCharacter
			? `explore-character-${selectedCharacter}`
			: '';
		const validTranslations = (translations || []).filter(
			(t) => t.lang && t.content
		);

		return (
			<span
				className={characterClass}
				data-voice={selectedVoice}
				{...(attributes.triggerPath
					? { 'data-triggerpath': 'true' }
					: {})}
			>
				<RichText.Content tagName='p' value={content} />
				{mp3Url && (
					<audio
						controls
						src={mp3Url}
						style={{ position: 'absolute', left: '-56000px' }}
					/>
				)}
				{validTranslations.map((t, i) => (
					<span
						key={i}
						className='lang-translation'
						data-lang={t.lang}
						style={{ display: 'none' }}
					>
						<p>{t.content}</p>
						{t.mp3Url && (
							<audio
								controls
								src={t.mp3Url}
								style={{
									position: 'absolute',
									left: '-56000px',
								}}
							/>
						)}
					</span>
				))}
			</span>
		);
	},
});

// ─── Translation support for core/paragraph and core/heading ─────────────────
// Only active inside Orbem Studio post types (any post type starting with
// "explore-"). Non-orbem editors are completely unaffected.

const ORBEM_CORE_BLOCKS = ['core/paragraph', 'core/heading'];

// 1. Register the translations attribute on both core blocks.
addFilter(
	'blocks.registerBlockType',
	'orbem-studio/core-block-translations-attribute',
	function (settings, name) {
		if (!ORBEM_CORE_BLOCKS.includes(name)) {
			return settings;
		}
		return {
			...settings,
			attributes: {
				...settings.attributes,
				translations: {
					type: 'array',
					default: [],
				},
			},
		};
	}
);

// 2. Inject the Translations panel into the block sidebar.
const withCoreBlockTranslationsPanel = createHigherOrderComponent(
	(BlockEdit) => {
		return function WithTranslations(props) {
			const { name, attributes, setAttributes } = props;

			// useSelect must be called unconditionally (Rules of Hooks).
			const postType = useSelect((select) => {
				return select('core/editor').getCurrentPostType();
			}, []);

			if (
				!ORBEM_CORE_BLOCKS.includes(name) ||
				!postType ||
				!postType.startsWith('explore-')
			) {
				return <BlockEdit {...props} />;
			}

			const { translations } = attributes;

			const addTranslation = () => {
				setAttributes({
					translations: [
						...(translations || []),
						{ lang: '', content: '' },
					],
				});
			};

			const updateTranslation = (index, field, value) => {
				const updated = (translations || []).map((t, i) =>
					i === index ? { ...t, [field]: value } : t
				);
				setAttributes({ translations: updated });
			};

			const removeTranslation = (index) => {
				setAttributes({
					translations: (translations || []).filter(
						(_, i) => i !== index
					),
				});
			};

			return (
				<>
					<BlockEdit {...props} />
					<InspectorControls>
						<PanelBody
							title={__('Translations', 'custom')}
							initialOpen={false}
						>
							<p
								style={{
									marginTop: 0,
									marginBottom: '12px',
									color: '#757575',
									fontSize: '12px',
								}}
							>
								{__(
									'The text above is the default language. Add translations below — the correct one is chosen automatically from the visitor\'s browser language.',
									'custom'
								)}
							</p>
							{(translations || []).map((translation, index) => (
								<div
									key={index}
									style={{
										marginBottom: '16px',
										padding: '12px',
										border: '1px solid #ddd',
										borderRadius: '4px',
										background: '#fafafa',
									}}
								>
									<strong
										style={{
											display: 'block',
											marginBottom: '8px',
											fontSize: '12px',
										}}
									>
										{__('Translation', 'custom')}{' '}
										{index + 1}
										{translation.lang
											? ` (${translation.lang})`
											: ''}
									</strong>
									<TextControl
										label={__(
											'Language Code (e.g. fr, es, de, ja)',
											'custom'
										)}
										value={translation.lang}
										placeholder='fr'
										onChange={(val) =>
											updateTranslation(
												index,
												'lang',
												val.toLowerCase().trim()
											)
										}
									/>
									<TextareaControl
										label={__(
											'Translated Text',
											'custom'
										)}
										value={translation.content}
										placeholder={__(
											'Enter translated text…',
											'custom'
										)}
										rows={3}
										onChange={(val) =>
											updateTranslation(
												index,
												'content',
												val
											)
										}
									/>
									<Button
										isDestructive
										onClick={() =>
											removeTranslation(index)
										}
										style={{ marginTop: '4px' }}
									>
										{__('Remove', 'custom')}
									</Button>
								</div>
							))}
							<Button
								variant='secondary'
								onClick={addTranslation}
								style={{ marginTop: '4px' }}
							>
								{__('+ Add Translation', 'custom')}
							</Button>
						</PanelBody>
					</InspectorControls>
				</>
			);
		};
	},
	'withCoreBlockTranslationsPanel'
);

addFilter(
	'editor.BlockEdit',
	'orbem-studio/core-block-translations-panel',
	withCoreBlockTranslationsPanel
);

// 3. Append hidden translation spans to the saved HTML of core/paragraph and
//    core/heading. The filter is a no-op when translations is empty, so
//    existing blocks are never invalidated.
addFilter(
	'blocks.getSaveElement',
	'orbem-studio/core-block-translations-save',
	function (element, blockType, attributes) {
		if (!ORBEM_CORE_BLOCKS.includes(blockType.name)) {
			return element;
		}

		const validTranslations = (attributes.translations || []).filter(
			(t) => t.lang && t.content
		);

		if (!validTranslations.length) {
			return element;
		}

		const translationSpans = validTranslations.map((t, i) =>
			createElement(
				'span',
				{
					key: i,
					className: 'lang-translation',
					'data-lang': t.lang,
					style: { display: 'none' },
				},
				t.content
			)
		);

		const existing = element.props.children;
		const childArray =
			existing == null
				? []
				: Array.isArray(existing)
				? existing
				: [existing];

		return cloneElement(element, {}, ...childArray, ...translationSpans);
	}
);
