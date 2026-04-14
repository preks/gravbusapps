/**
 * Content Catalog Constants
 *
 * Centralized catalog identifiers used across content features.
 */

export const CONTENT_REACTION_IDENTIFIER = 'ContentReaction'
export const CONTENT_REACTION_VERSION = 'v1'
export const CONTENT_REACTION = `${CONTENT_REACTION_IDENTIFIER}:${CONTENT_REACTION_VERSION}`

export const CONTENT_REACTION_UPVOTE_ENTRY_ID = `${CONTENT_REACTION}:+1`
export const CONTENT_REACTION_DOWNVOTE_ENTRY_ID = `${CONTENT_REACTION}:-1`

export const getContentReactionEntryId = (code: string) => `${CONTENT_REACTION}:${code}`
