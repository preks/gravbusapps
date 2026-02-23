import type { Conversation } from '../types'

/**
 * Single source of truth for conversation list order:
 * pinned first (by pinnedOrder ASC), then by last activity (newest first).
 * Used by useConversations and ConversationList so order never drifts.
 */
export function sortConversationsPinThenTime(a: Conversation, b: Conversation): number {
  const aPinned = a.isPinned ?? false
  const bPinned = b.isPinned ?? false
  if (aPinned !== bPinned) return aPinned ? -1 : 1
  if (aPinned && bPinned) {
    const aOrder = a.pinnedOrder ?? Number.MAX_SAFE_INTEGER
    const bOrder = b.pinnedOrder ?? Number.MAX_SAFE_INTEGER
    if (aOrder !== bOrder) return aOrder - bOrder
  }
  const aTime = a.lastMessage?.createdAt || a.lastMessageAt || a.updatedAt || a.createdAt
  const bTime = b.lastMessage?.createdAt || b.lastMessageAt || b.updatedAt || b.createdAt
  return new Date(bTime).getTime() - new Date(aTime).getTime()
}
