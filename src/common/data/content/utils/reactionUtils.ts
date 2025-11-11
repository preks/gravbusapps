import type { ContentEntry } from '../types/contentTypes'
import type { ReactionSummary } from '@/common/components/content/ReactionPicker'

type EntryWithReactions = {
  contentEntryReactionCounts?: ContentEntry['contentEntryReactionCounts']
  contentEntryReaction?: ContentEntry['contentEntryReaction']
}

/**
 * Builds ReactionSummary from contentEntryReactionCounts and user reactions
 * Uses counts from contentEntryReactionCounts (from GraphQL view) and user reaction info for userReacted flag
 */
export const buildReactionSummaryFromCounts = (entry: EntryWithReactions, currentUserId?: string): ReactionSummary => {
  const summary: ReactionSummary = {}

  if (!entry.contentEntryReactionCounts || entry.contentEntryReactionCounts.length === 0) {
    return summary
  }

  // Find user's reaction if currentUserId is provided
  const userReaction =
    currentUserId && entry.contentEntryReaction
      ? entry.contentEntryReaction.find(reaction => reaction.createdBy === currentUserId && !reaction.isDeleted)
      : undefined

  entry.contentEntryReactionCounts.forEach(countItem => {
    const contentReaction = countItem.contentReaction
    if (!contentReaction) return

    // Get emoji from value (description) or code
    // Note: contentReaction from view uses CatalogEntry which has 'value' field, not 'description'
    const emoji = (contentReaction as any).description || contentReaction.value || contentReaction.code || ''
    if (!emoji) return

    // Check if user reacted to this specific reaction type
    const userReacted = userReaction?.contentReactionRef === contentReaction.id

    summary[emoji] = {
      emoji,
      count: countItem.count || 0,
      userReacted,
      reactionId: userReacted ? userReaction?.id : undefined,
      catalogEntryId: contentReaction.id,
      imageUrl: contentReaction.type === 'CUSTOM' ? contentReaction.additionalValue3 : undefined,
      version: userReacted ? userReaction?.version : undefined
    }
  })

  return summary
}
