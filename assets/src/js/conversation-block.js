/**
 * Conversation: one of the things a character might say.
 *
 * A character with one conversation says the same thing every time you talk to
 * them, which is fine for a signpost and wrong for a person. Put several of
 * these in a cutscene and they take turns: first visit gets the first, next
 * visit the next, and round again at the end.
 *
 * WHY A BLOCK RATHER THAN A SEPARATOR
 *
 * A horizontal rule between conversations would need no new block at all, and
 * that is exactly the problem: a rule is also just a rule. Somebody spacing
 * their script out would split a conversation in half without meaning to, and
 * nothing on screen would say why their character had started talking
 * nonsense. A container says what it is.
 *
 * WHY A CUTSCENE WITHOUT ONE STILL WORKS
 *
 * A cutscene with no Conversation blocks in it is one conversation — every
 * cutscene ever written before this existed, and every simple one written
 * after. Nobody has to wrap a single conversation in a box to say it is the
 * only one.
 *
 * @package OrbemStudio
 */

import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/** Lines, and the branches they can fork into. The same as anywhere else. */
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
