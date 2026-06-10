import { useCallback, useMemo } from 'react'
import type { Comment } from '@/business-apps/platform/apps/shared/types/versioning'
import type { UseCommentsReturn } from '@/business-apps/platform/apps/shared/hooks/useComments'
import type { VersionUserDisplay } from '@/business-apps/core/office/apps/documents/hooks/useVersionUserDisplays'
import { enrichSpreadsheetComments } from './enrichSpreadsheetComments'

type SpreadsheetCellComment = Comment & {
  cellReference?: string
  sheetId?: string
}

export interface UseSpreadsheetCommentSidebarParams {
  comments: UseCommentsReturn
  activeSheetId: string
  showComments: boolean
  setShowComments: (show: boolean) => void
  getSelectedCellRef?: () => string | null
  focusCellReference?: (cellReference: string, sheetId?: string) => boolean
  commentUserDisplayMap?: Record<string, VersionUserDisplay>
  currentUserId?: string
  currentUserAvatar?: string
}

export interface UseSpreadsheetCommentSidebarResult {
  filteredComments: Comment[]
  unresolvedCommentCount: number
  openCommentsSidebar: () => void
  closeCommentsSidebar: () => void
  toggleCommentsSidebar: () => void
  handleCreateComment: (content: string, parentId?: string, userName?: string, userAvatar?: string) => Promise<boolean>
  handleUpdateComment: (commentId: string, content: string) => Promise<boolean>
  handleResolveComment: (commentId: string) => Promise<boolean>
  handleUnresolveComment: (commentId: string) => Promise<boolean>
  handleDeleteComment: (commentId: string) => Promise<boolean>
  handleScrollToHighlight: (commentId: string) => void
}

function isCommentVisibleOnSheet(comment: SpreadsheetCellComment, activeSheetId: string): boolean {
  return !comment.sheetId || comment.sheetId === activeSheetId
}

export function useSpreadsheetCommentSidebar({
  comments,
  activeSheetId,
  showComments,
  setShowComments,
  getSelectedCellRef,
  focusCellReference,
  commentUserDisplayMap = {},
  currentUserId,
  currentUserAvatar
}: UseSpreadsheetCommentSidebarParams): UseSpreadsheetCommentSidebarResult {
  const filteredComments = useMemo(() => {
    const sheetComments = (Array.isArray(comments.comments) ? comments.comments : []).filter(comment =>
      isCommentVisibleOnSheet(comment as SpreadsheetCellComment, activeSheetId)
    )

    return enrichSpreadsheetComments(sheetComments, commentUserDisplayMap, {
      currentUserId,
      currentUserAvatar
    })
  }, [activeSheetId, commentUserDisplayMap, comments.comments, currentUserAvatar, currentUserId])

  const unresolvedCommentCount = useMemo(
    () => filteredComments.filter(comment => !comment.parentId && !comment.resolvedAt).length,
    [filteredComments]
  )

  const openCommentsSidebar = useCallback(() => {
    setShowComments(true)
  }, [setShowComments])

  const closeCommentsSidebar = useCallback(() => {
    setShowComments(false)
  }, [setShowComments])

  const toggleCommentsSidebar = useCallback(() => {
    setShowComments(!showComments)
  }, [setShowComments, showComments])

  const handleCreateComment = useCallback(
    async (content: string, parentId?: string, userName?: string, userAvatar?: string): Promise<boolean> => {
      if (parentId) {
        const reply = await comments.replyToComment(parentId, content, userName, userAvatar)
        return Boolean(reply)
      }

      const cellReference = getSelectedCellRef?.()?.trim() || ''
      const createdComment = await comments.createComment({
        type: cellReference ? 'cell' : 'document',
        content,
        ...(cellReference
          ? {
              cellReference,
              sheetId: activeSheetId
            }
          : {}),
        createdByName: userName,
        createdByAvatar: userAvatar
      })

      return Boolean(createdComment)
    },
    [activeSheetId, comments, getSelectedCellRef]
  )

  const handleUpdateComment = useCallback(
    async (commentId: string, content: string): Promise<boolean> => {
      const updatedComment = await comments.updateComment(commentId, { content })
      return Boolean(updatedComment)
    },
    [comments]
  )

  const handleResolveComment = useCallback((commentId: string) => comments.resolveComment(commentId), [comments])

  const handleUnresolveComment = useCallback((commentId: string) => comments.unresolveComment(commentId), [comments])

  const handleDeleteComment = useCallback((commentId: string) => comments.deleteComment(commentId), [comments])

  const handleScrollToHighlight = useCallback(
    (commentId: string) => {
      const comment = comments.comments.find(entry => entry.id === commentId) as SpreadsheetCellComment | undefined
      const cellReference = comment?.cellReference?.trim()
      if (!comment || !cellReference || !focusCellReference) {
        return
      }

      focusCellReference(cellReference, comment.sheetId)
    },
    [comments.comments, focusCellReference]
  )

  return {
    filteredComments,
    unresolvedCommentCount,
    openCommentsSidebar,
    closeCommentsSidebar,
    toggleCommentsSidebar,
    handleCreateComment,
    handleUpdateComment,
    handleResolveComment,
    handleUnresolveComment,
    handleDeleteComment,
    handleScrollToHighlight
  }
}
