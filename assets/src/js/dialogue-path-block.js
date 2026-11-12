/**
 * Dialogue Path: a branch of a conversation.
 *
 * @package OrbemStudio
 */

import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/** What may be put in a path. */
const ALLOWED = ['orbem/paragraph-mp3', 'orbem/dialogue-path'];

/** One line to open with, and one to follow it. */
const TEMPLATE = [
	['orbem/paragraph-mp3', {}],
	['orbem/paragraph-mp3', {}],
];

registerBlockType('orbem/dialogue-path', {
	title: __('Dialogue Path', 'orbem-studio'),
	description: __(
		'A branch of a conversation. The first paragraph inside is the choice the player is offered; the rest is what happens when they take it.',
		'orbem-studio'
	),
	category: 'orbem-order-studio',
	icon: 'randomize',
	supports: {
		html: false,
		// A path is structure rather than something to look at, so it has no colour, spacing or alignment of its own to get out of step with the cutscene box it is played in.
		color: false,
		spacing: false,
		align: false,
	},

	edit: () => {
		const blockProps = useBlockProps({
			className: 'orbem-dialogue-path is-editing',
		});

		return (
			<div {...blockProps}>
				<p className='orbem-dialogue-path-hint'>
					{__(
						'Dialogue Path — the first paragraph below is the choice the player sees.',
						'orbem-studio'
					)}
				</p>
				<InnerBlocks
					allowedBlocks={ALLOWED}
					template={TEMPLATE}
					templateLock={false}
				/>
			</div>
		);
	},

	save: () => {
		// No hint in the saved output: it is guidance for whoever is writing, not part of the conversation.
		const blockProps = useBlockProps.save({
			className: 'orbem-dialogue-path',
		});

		return (
			<div {...blockProps}>
				<InnerBlocks.Content />
			</div>
		);
	},
});
