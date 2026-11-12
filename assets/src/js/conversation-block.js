/**
 * Conversation: one of the things a character might say.
 *
 * @package OrbemStudio
 */

import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/** Lines, and the branches they can fork into. */
const ALLOWED = ['orbem/paragraph-mp3', 'orbem/dialogue-path'];

const TEMPLATE = [['orbem/paragraph-mp3', {}]];

registerBlockType('orbem/conversation', {
	title: __('Conversation', 'orbem-studio'),
	description: __(
		'One of the things this character might say. Add several and they take turns.',
		'orbem-studio'
	),
	category: 'orbem-order-studio',
	icon: 'format-chat',
	supports: {
		html: false,
		color: false,
		spacing: false,
		align: false,
	},

	edit: () => {
		const blockProps = useBlockProps({
			className: 'orbem-conversation is-editing',
		});

		return (
			<div {...blockProps}>
				<p className='orbem-conversation-hint'>
					{__(
						'Conversation — one of several. They are used in turn, then start again.',
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
		const blockProps = useBlockProps.save({
			className: 'orbem-conversation',
		});

		return (
			<div {...blockProps}>
				<InnerBlocks.Content />
			</div>
		);
	},
});
