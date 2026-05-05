import React from 'react'
import { ChatCenteredTextIcon } from '@phosphor-icons/react'
import type { Comment } from '@/business-apps/platform/apps/shared/types/versioning'
import { getWhiteboardCommentViewportRect, resolveWhiteboardCommentAnchor } from '../utils/whiteboardCommentAnchors'

interface ViewportState {
  scrollX: number
  scrollY: number
  zoom: number
}

interface BoundedSceneElement {
  id?: string
  x: number
  y: number
  width: number
  height: number
  isDeleted?: boolean
}

interface WhiteboardCommentPinsProps {
  comments: Comment[]
  viewport: ViewportState
  sceneElements?: readonly BoundedSceneElement[]
  activeCommentId?: string | null
  onSelectComment: (commentId: string) => void
  'data-testid'?: string
}

export const WhiteboardCommentPins: React.FC<WhiteboardCommentPinsProps> = ({
  comments,
  viewport,
  sceneElements = [],
  activeCommentId,
  onSelectComment,
  'data-testid': testId = 'whiteboard-comment-pins'
}) => {
  const pinnedComments = comments.filter(comment => !comment.parentId && !comment.resolvedAt && comment.anchorData)

  return (
    <div className="gba:pointer-events-none gba:absolute gba:inset-0 gba:z-40" data-testid={testId}>
      {pinnedComments.map(comment => {
        if (!comment.anchorData) {
          return null
        }

        const anchor = resolveWhiteboardCommentAnchor(comment.anchorData, sceneElements)
        const rect = getWhiteboardCommentViewportRect(anchor, viewport)
        const isElementAnchor = Boolean(anchor.elementIds?.length)
        const pinLeft = isElementAnchor ? rect.left + rect.width + 8 : rect.left + rect.width / 2
        const pinTop = isElementAnchor ? rect.top : rect.top + rect.height / 2
        const isActive = comment.id === activeCommentId
        const replyCount = comments.filter(item => item.parentId === comment.id).length
        const threadCount = replyCount + 1

        return (
          <div
            key={comment.id}
            className="gba:absolute"
            style={{
              left: pinLeft,
              top: pinTop,
              transform: isElementAnchor ? 'translateY(-50%)' : 'translate(-50%, -50%)'
            }}
            data-testid={`${testId}-${comment.id}`}
          >
            <button
              type="button"
              onClick={() => onSelectComment(comment.id)}
              className={`gba:pointer-events-auto gba:relative gba:flex gba:h-8 gba:min-w-8 gba:items-center gba:justify-center gba:gap-1 gba:rounded-full gba:border gba:bg-background gba:px-2 gba:text-foreground gba:shadow-md gba:transition-colors hover:gba:border-primary hover:gba:text-primary ${
                isActive ? 'gba:border-primary gba:text-primary gba:ring-2 gba:ring-primary/20' : 'gba:border-border'
              }`}
              data-testid={`${testId}-${comment.id}-button`}
            >
              <ChatCenteredTextIcon className="gba:h-4 gba:w-4" />
              {threadCount > 1 ? <span className="gba:text-xs gba:font-medium">{threadCount}</span> : null}
            </button>
          </div>
        )
      })}
    </div>
  )
}
