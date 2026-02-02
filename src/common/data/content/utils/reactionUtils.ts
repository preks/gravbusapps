import type { ContentEntry } from '../types/contentTypes'
import type { ReactionSummary } from '@/common/components/content/ReactionPicker'

type EntryWithReactions = {
  contentEntryReactionCounts?: ContentEntry['contentEntryReactionCounts']
  contentEntryReactions?: ContentEntry['contentEntryReactions']
}

/**
 * Builds ReactionSummary from contentEntryReactionCounts and user reactions.
 * currentUserId: used to match contentEntryReactions.createdBy (who reacted; user may not be employee).
 */
export const buildReactionSummaryFromCounts = (entry: EntryWithReactions, currentUserId?: string): ReactionSummary => {
  const summary: ReactionSummary = {}

  if (!entry.contentEntryReactionCounts || entry.contentEntryReactionCounts.length === 0) {
    return summary
  }

  const userReaction =
    currentUserId && entry.contentEntryReactions
      ? entry.contentEntryReactions.find(r => r.createdBy === currentUserId && !r.isDeleted)
      : undefined

  entry.contentEntryReactionCounts.forEach(countItem => {
    const contentReaction = countItem.contentReaction
    if (!contentReaction) return

    // Get emoji from value (description) or code
    // Note: contentReaction from view uses CatalogEntry which has 'value' field, not 'description'
    const description =
      'description' in contentReaction && typeof contentReaction.description === 'string'
        ? contentReaction.description
        : null
    const emoji = description || contentReaction.value || contentReaction.code || ''
    if (!emoji) return

    // Check if user reacted to this specific reaction type
    const userReacted = userReaction?.contentReactionRef === contentReaction.id

    // Get imageUrl if type is CUSTOM
    const imageUrl =
      'type' in contentReaction &&
      contentReaction.type === 'CUSTOM' &&
      'additionalValue3' in contentReaction &&
      typeof contentReaction.additionalValue3 === 'string'
        ? contentReaction.additionalValue3
        : undefined

    summary[emoji] = {
      emoji,
      count: countItem.count || 0,
      userReacted,
      reactionId: userReacted ? userReaction?.id : undefined,
      catalogEntryId: contentReaction.id,
      imageUrl,
      version: userReacted ? userReaction?.version : undefined
    }
  })

  return summary
}
