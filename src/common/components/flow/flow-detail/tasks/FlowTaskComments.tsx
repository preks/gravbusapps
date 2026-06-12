import React, { useMemo, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Spinner,
  Textarea
} from '@newwork/nw-design-system'
import { ChatCircle, Clock, Eye, Lock, PaperPlaneRight, Users } from '@phosphor-icons/react'
import type { TaskComment, TaskCommentVisibility } from '@/common/network/flows/useFlowProgressClient'
import { getInitials } from '../tabs/stepDataRendering'

const COMMENT_VISIBILITY_CONFIG = {
  INTERNAL_TASK: {
    label: 'Task Only',
    description: 'Only visible to users assigned to this specific task',
    icon: Lock,
    badgeVariant: 'destructive' as const
  },
  INTERNAL_FLOW: {
    label: 'Flow Team',
    description: 'Visible to users assigned to any task in this flow',
    icon: Users,
    badgeVariant: 'secondary' as const
  },
  EXTERNAL: {
    label: 'Public',
    description: 'Visible to all users (public comment)',
    icon: Eye,
    badgeVariant: 'outline' as const
  }
} as const

export interface NormalizedTaskComment {
  id: string
  body: string
  authorId: string
  createdAt: string
  visibility: TaskCommentVisibility
}

function normalizeComment(comment: TaskComment, index: number): NormalizedTaskComment {
  return {
    id: comment.actionId || comment.id || `comment-${index}`,
    body: comment.comment,
    authorId: comment.commentedBy,
    createdAt: comment.commentedAt,
    visibility: comment.visibility || 'EXTERNAL'
  }
}

interface FlowTaskCommentsProps {
  comments: TaskComment[]
  isLoading: boolean
  canAddComment: boolean
  userId?: string
  actorNames: Record<string, string>
  employeeAvatars: Map<string, { displayName?: string; avatarUrl?: string }>
  onAddComment: (comment: string, visibility: TaskCommentVisibility) => Promise<void>
}

export const FlowTaskComments: React.FC<FlowTaskCommentsProps> = ({
  comments,
  isLoading,
  canAddComment,
  userId,
  actorNames,
  employeeAvatars,
  onAddComment
}) => {
  const [newComment, setNewComment] = useState('')
  const [commentVisibility, setCommentVisibility] = useState<TaskCommentVisibility>('INTERNAL_TASK')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const normalizedComments = useMemo(
    () =>
      [...comments]
        .map((comment, index) => normalizeComment(comment, index))
        .sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()),
    [comments]
  )

  const handleSubmit = async () => {
    if (!newComment.trim() || !canAddComment) return

    setIsSubmitting(true)
    setSubmitError(null)
    try {
      await onAddComment(newComment.trim(), commentVisibility)
      setNewComment('')
      setCommentVisibility('INTERNAL_TASK')
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to add comment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="gba:space-y-4" data-testid="flow-task-comments">
      <div className="gba:flex gba:items-center gba:gap-2">
        <ChatCircle className="gba:h-4 gba:w-4" />
        <h4 className="gba:text-sm gba:font-semibold gba:text-foreground">Comments</h4>
        {normalizedComments.length > 0 ? (
          <Badge variant="secondary" className="gba:text-xs">
            {normalizedComments.length}
          </Badge>
        ) : null}
      </div>

      {isLoading ? (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
          <Spinner className="gba:h-5 gba:w-5" />
        </div>
      ) : normalizedComments.length > 0 ? (
        <div className="gba:space-y-3">
          {normalizedComments.map(comment => {
            const visibilityConfig = COMMENT_VISIBILITY_CONFIG[comment.visibility] || COMMENT_VISIBILITY_CONFIG.EXTERNAL
            const VisibilityIcon = visibilityConfig.icon
            const employee = employeeAvatars.get(comment.authorId)
            const displayName = employee?.displayName || actorNames[comment.authorId] || comment.authorId

            return (
              <div
                key={comment.id}
                className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:p-3"
                data-testid={`flow-task-comment-${comment.id}`}
              >
                <div className="gba:mb-2 gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                  <Avatar className="gba:h-7 gba:w-7">
                    {employee?.avatarUrl ? <AvatarImage src={employee.avatarUrl} alt={displayName} /> : null}
                    <AvatarFallback className="gba:text-[10px]">{getInitials(displayName)}</AvatarFallback>
                  </Avatar>
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">{displayName}</span>
                  <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
                    <Clock className="gba:h-3 gba:w-3" />
                    <time dateTime={comment.createdAt}>{new Date(comment.createdAt).toLocaleString()}</time>
                  </div>
                  <Badge variant={visibilityConfig.badgeVariant} className="gba:text-xs gba:gap-1">
                    <VisibilityIcon className="gba:h-3 gba:w-3" />
                    {visibilityConfig.label}
                  </Badge>
                </div>
                <p className="gba:pl-9 gba:text-sm gba:text-foreground gba:leading-relaxed">{comment.body}</p>
              </div>
            )
          })}
        </div>
      ) : (
        <div className="gba:rounded-md gba:border gba:border-dashed gba:border-border gba:px-3 gba:py-6 gba:text-center gba:text-sm gba:text-muted-foreground">
          No comments yet
        </div>
      )}

      {canAddComment && userId ? (
        <>
          <Separator />
          <div className="gba:space-y-3">
            <div className="gba:flex gba:items-center gba:gap-2">
              <PaperPlaneRight className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
              <span className="gba:text-sm gba:font-medium gba:text-foreground">Add Comment</span>
            </div>
            <Textarea
              placeholder="Enter your comment..."
              value={newComment}
              onChange={event => setNewComment(event.target.value)}
              rows={3}
              className="gba:resize-none"
              data-testid="flow-task-comment-textarea"
            />
            <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-3">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">Visibility:</span>
                <Select
                  value={commentVisibility}
                  onValueChange={value => setCommentVisibility(value as TaskCommentVisibility)}
                >
                  <SelectTrigger className="gba:w-40" data-testid="flow-task-comment-visibility">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(COMMENT_VISIBILITY_CONFIG).map(([key, config]) => {
                      const Icon = config.icon
                      return (
                        <SelectItem key={key} value={key}>
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Icon className="gba:h-4 gba:w-4" />
                            <span>{config.label}</span>
                          </div>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => void handleSubmit()}
                disabled={!newComment.trim() || isSubmitting}
                className="gba:gap-2"
                data-testid="flow-task-comment-submit"
              >
                <PaperPlaneRight className="gba:h-4 gba:w-4" />
                {isSubmitting ? 'Adding...' : 'Add Comment'}
              </Button>
            </div>
            {submitError ? <div className="gba:text-xs gba:text-destructive">{submitError}</div> : null}
          </div>
        </>
      ) : null}
    </div>
  )
}
