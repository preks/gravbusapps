/**
 * CommentPanel Component
 *
 * Sidebar panel for displaying and managing comments on documents, notes, and spreadsheets.
 */

import React, { useState } from 'react'
import { Button, Badge, ScrollArea } from '@newwork/nw-design-system'
import { MessageSquare, MessageCircle, CheckCircle, X } from 'lucide-react'
import type { Comment } from '../types/versioning'
import { CommentThread } from './CommentThread'
import { CommentEditor } from './CommentEditor'

export interface CommentPanelProps {
  comments: Comment[]
  unresolvedCount: number
  isLoading: boolean
  onCreateComment: (content: string, parentId?: string, userName?: string, userAvatar?: string) => Promise<void>
  onUpdateComment: (commentId: string, content: string) => Promise<void>
  onResolveComment: (commentId: string) => Promise<void>
  onDeleteComment: (commentId: string) => Promise<void>
  onClose: () => void
  currentUserId?: string
  currentUserName?: string
  currentUserAvatar?: string
  accessToken?: string
  headerHeight?: number
  onUnhighlight?: (commentId: string) => void
  onScrollToHighlight?: (commentId: string) => void
  'data-testid'?: string
}

/**
 * Comment panel with tabbed view for all/unresolved comments
 */
export const CommentPanel: React.FC<CommentPanelProps> = ({
  comments,
  unresolvedCount,
  isLoading,
  onCreateComment,
  onUpdateComment,
  onResolveComment,
  onDeleteComment,
  onClose,
  currentUserId,
  currentUserName,
  currentUserAvatar,
  accessToken,
  headerHeight = 64,
  onUnhighlight,
  onScrollToHighlight,
  'data-testid': testId = 'comment-panel'
}) => {
  const [activeTab, setActiveTab] = useState<'unresolved' | 'resolved'>('unresolved')
  const [isCreating, setIsCreating] = useState(false)

  // Filter top-level comments (not replies)
  const topLevelComments = comments.filter(c => !c.parentId)
  const unresolvedComments = topLevelComments.filter(c => !c.resolvedAt)
  const resolvedComments = topLevelComments.filter(c => !!c.resolvedAt)
  const displayComments = activeTab === 'unresolved' ? unresolvedComments : resolvedComments

  const handleCreateComment = async (content: string) => {
    setIsCreating(true)
    try {
      await onCreateComment(content, undefined, currentUserName, currentUserAvatar)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div
      className="gba:fixed gba:right-0 gba:bottom-0 gba:bg-background gba:border-l gba:border-border/50 gba:flex gba:flex-col"
      style={{
        top: `${headerHeight}px`,
        width: 480,
        zIndex: 50,
        boxShadow: '-4px 0 24px rgba(0, 0, 0, 0.08)'
      }}
      data-testid={testId}
    >
      {/* Modern Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b gba:border-border/50 gba:bg-gradient-to-b gba:from-muted/20 gba:to-transparent">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <MessageSquare className="gba:h-4 gba:w-4 gba:text-primary" />
          </div>
          <div>
            <h3 className="gba:font-semibold gba:text-sm">Comments</h3>
            {unresolvedCount > 0 && (
              <p className="gba:text-xs gba:text-muted-foreground">{unresolvedCount} unresolved</p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          data-testid="comment-panel-close"
          className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full hover:gba:bg-muted"
        >
          <X className="gba:h-4 gba:w-4" />
        </Button>
      </div>

      {/* Modern Tab Buttons */}
      <div className="gba:flex gba:gap-1 gba:p-2 gba:bg-muted/30">
        <button
          onClick={() => setActiveTab('unresolved')}
          className={`gba:flex-1 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:font-medium gba:transition-all ${
            activeTab === 'unresolved'
              ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
              : 'gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-background/50'
          }`}
          data-testid="unresolved-tab"
        >
          <MessageCircle className="gba:h-4 gba:w-4" />
          <span>Unresolved</span>
          {unresolvedCount > 0 && (
            <Badge
              variant={activeTab === 'unresolved' ? 'warning' : 'outline'}
              className="gba:h-5 gba:px-1.5 gba:text-xs"
            >
              {unresolvedCount}
            </Badge>
          )}
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={`gba:flex-1 gba:flex gba:items-center gba:justify-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:font-medium gba:transition-all ${
            activeTab === 'resolved'
              ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
              : 'gba:text-muted-foreground hover:gba:text-foreground hover:gba:bg-background/50'
          }`}
          data-testid="resolved-comments-tab"
        >
          <CheckCircle className="gba:h-4 gba:w-4" />
          <span>Resolved</span>
          <Badge variant={activeTab === 'resolved' ? 'success' : 'outline'} className="gba:h-5 gba:px-1.5 gba:text-xs">
            {resolvedComments.length}
          </Badge>
        </button>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-hidden">
        <ScrollArea className="gba:h-full gba:px-6">
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
              <p className="gba:text-sm gba:text-muted-foreground">Loading comments...</p>
            </div>
          ) : displayComments.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-16 gba:text-center">
              <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-muted/50 gba:flex gba:items-center gba:justify-center gba:mb-4">
                {activeTab === 'unresolved' ? (
                  <MessageSquare className="gba:h-8 gba:w-8 gba:text-muted-foreground/50" />
                ) : (
                  <CheckCircle className="gba:h-8 gba:w-8 gba:text-muted-foreground/50" />
                )}
              </div>
              <p className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-1">
                {activeTab === 'unresolved' ? 'All caught up!' : 'No resolved comments'}
              </p>
              <p className="gba:text-xs gba:text-muted-foreground gba:max-w-[200px]">
                {activeTab === 'unresolved' ? 'All comments have been resolved' : 'Resolved comments will appear here'}
              </p>
            </div>
          ) : (
            <div className="gba:space-y-3 gba:py-4">
              {displayComments.map(comment => (
                <CommentThread
                  key={comment.id}
                  comment={comment}
                  replies={comments.filter(c => c.parentId === comment.id)}
                  onReply={content => onCreateComment(content, comment.id, currentUserName, currentUserAvatar)}
                  onUpdate={content => onUpdateComment(comment.id, content)}
                  onResolve={() => onResolveComment(comment.id)}
                  onDelete={() => onDeleteComment(comment.id)}
                  currentUserId={currentUserId}
                  accessToken={accessToken}
                  onUnhighlight={onUnhighlight}
                  onScrollToHighlight={onScrollToHighlight}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* New comment input */}
      <div className="gba:p-4 gba:border-t gba:border-border/50 gba:bg-muted/20">
        <CommentEditor
          onSubmit={handleCreateComment}
          isSubmitting={isCreating}
          placeholder="Add a comment..."
          data-testid="new-comment-editor"
        />
      </div>
    </div>
  )
}
