/**
 * Dialogue Path: a branch of a conversation.
 *
 * A cutscene has always been a straight line — one paragraph after another
 * until it runs out. This is the block that lets it fork.
 *
 * HOW IT READS
 *
 * A Dialogue Path holds a run of Paragraph with MP3 blocks. The first one is
 * what the player is offered; the rest are what happens if they take it. Put
 * three of these in a row and the player is offered three things, because
 * three paths side by side are three first paragraphs.
 *
 * That is the whole rule, and it is deliberately the only one: there is no
 * separate "choice" block to keep in step with its answer, no ids to wire up,
 * and nothing to point at anything else. A branch is a container, its opening
 * line is the offer, and the shape on screen in the editor is the shape of the
 * conversation.
 *
 * Paths nest. A path may contain further paths, which is a second question
 * asked after the first has been answered — and it nests in the editor the way
 * it nests in play, so a writer can see how deep a conversation goes by
 * looking at it.
 *
 * WHY INNER BLOCKS RATHER THAN ATTRIBUTES
 *
 * Because the lines inside a branch are the same lines as anywhere else: the
 * same character picker, the same voice, the same MP3, the same translations.
 * Modelling a branch as its own kind of content would mean a second editor for
 * all of that, and the day somebody adds a field to a dialogue line is the day
 * the two stop matching.
 *
 * @package OrbemStudio
 */

import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * What may be put in a path.
 *
 * Lines and further paths, and nothing else. A cutscene that can contain
 * arbitrary blocks is one the player has to be walked through by code that
 * knows what to do with each of them, and there is no sensible reading of a
 * gallery in the middle of a conversation.
 */
const ALLOWED = ['orbem/paragraph-mp3', 'orbem/dialogue-path'];

/** One line to open with, and one to follow it. Enough to show the shape. */
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
		// A path is structure rather than something to look at, so it has no
		// colour, spacing or alignment of its own to get out of step with the
		// cutscene box it is played in.
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
		// No hint in the saved output: it is guidance for whoever is writing,
		// not part of the conversation. The class is what the player's side
		// looks for, and the inner blocks are the branch itself.
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
