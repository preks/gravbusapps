import type { Comment } from '@/business-apps/platform/apps/shared/types/versioning'
import type { VersionUserDisplay } from '@/business-apps/core/office/apps/documents/hooks/useVersionUserDisplays'

export function enrichCommentWithUserDisplay(
  comment: Comment,
  userDisplayMap: Record<string, VersionUserDisplay>,
  options?: { currentUserId?: string; currentUserAvatar?: string }
): Comment {
  const display = userDisplayMap[comment.createdBy]
  const isCurrentUser = Boolean(options?.currentUserId && comment.createdBy === options.currentUserId)

  return {
    ...comment,
    createdByName: comment.createdByName || display?.displayName,
    createdByAvatar:
      comment.createdByAvatar || (isCurrentUser ? options?.currentUserAvatar : undefined) || display?.avatarUrl
  }
}

export function enrichSpreadsheetComments(
  comments: Comment[],
  userDisplayMap: Record<string, VersionUserDisplay>,
  options?: { currentUserId?: string; currentUserAvatar?: string }
): Comment[] {
  return comments.map(comment => enrichCommentWithUserDisplay(comment, userDisplayMap, options))
}
