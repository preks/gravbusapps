import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, cn } from '@newwork/nw-design-system'
import { CheckCircle, Clock, FileText, MessageSquare, User, Users, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type {
  VersionHistoryApprovalDetails,
  VersionHistoryApprovalReviewer,
  VersionHistoryMessages,
  VersionUserDisplay
} from './VersionHistory'

interface VersionHistoryApprovalSectionProps {
  approval: VersionHistoryApprovalDetails
  messages: VersionHistoryMessages
  userDisplayMap?: Record<string, VersionUserDisplay>
  versionNumber: number
  onOpenApprovalReview?: (versionNumber: number) => void
}

function formatRelativeDate(value: string | undefined, fallback: string): string {
  if (!value) {
    return fallback
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true })
}

function getRequesterAvatarUrl(
  approval: VersionHistoryApprovalDetails,
  fromMap?: VersionUserDisplay
): string | undefined {
  if (fromMap?.avatarUrl) {
    return fromMap.avatarUrl
  }

  if (!approval.requestedByPicture) {
    return undefined
  }

  return approval.requestedByPicture.startsWith('data:')
    ? approval.requestedByPicture
    : `data:image/png;base64,${approval.requestedByPicture}`
}

function getUserDisplay(
  userId: string,
  userDisplayMap: Record<string, VersionUserDisplay> | undefined,
  unknownUser: string,
  fallbackName?: string
): VersionUserDisplay {
  return (
    userDisplayMap?.[userId] ?? {
      displayName: fallbackName?.trim() || userId || unknownUser
    }
  )
}

function getStatusLabel(status: VersionHistoryApprovalReviewer['status'], messages: VersionHistoryMessages): string {
  if (status === 'approved') {
    return messages.approvalApproved ?? 'Approved'
  }

  if (status === 'rejected') {
    return messages.approvalRejected ?? 'Rejected'
  }

  if (status === 'skipped') {
    return messages.approvalSkipped ?? 'Skipped'
  }

  return messages.approvalPendingBadge ?? messages.approvalPending ?? 'Pending'
}

const COMMENT_COLLAPSE_MIN_LENGTH = 72

const APPROVAL_DETAIL_GRID =
  'gba:grid gba:grid-cols-[max-content_minmax(0,1fr)] gba:items-start gba:gap-x-4 gba:gap-y-3'

function ApprovalDetailLabel({
  icon: Icon,
  iconClassName,
  className,
  children
}: {
  icon: React.ComponentType<{ className?: string }>
  iconClassName?: string
  className?: string
  children: React.ReactNode
}): React.ReactElement {
  return (
    <div
      className={cn(
        'gba:flex gba:min-h-[1.25rem] gba:items-start gba:gap-1.5 gba:pt-0.5 gba:text-xs gba:font-medium gba:leading-snug gba:text-muted-foreground',
        className
      )}
    >
      <Icon className={cn('gba:h-4 gba:w-4 gba:shrink-0 gba:mt-0.5', iconClassName)} />
      <span>{children}</span>
    </div>
  )
}

function ReviewerCommentCollapsible({
  text,
  messages,
  className
}: {
  text: string
  messages: VersionHistoryMessages
  className?: string
}): React.ReactElement {
  const [expanded, setExpanded] = useState(false)
  const needsToggle = text.length > COMMENT_COLLAPSE_MIN_LENGTH || text.includes('\n')

  return (
    <div className={cn('gba:min-w-0 gba:max-w-full', className)}>
      <p
        className={cn(
          'gba:text-sm gba:leading-relaxed gba:text-foreground gba:break-words gba:whitespace-pre-wrap',
          !expanded && needsToggle && 'gba:line-clamp-1'
        )}
      >
        {text}
      </p>
      {needsToggle && (
        <Button
          type="button"
          variant="link"
          size="sm"
          className="gba:h-auto gba:px-0 gba:py-0.5 gba:text-xs"
          onClick={event => {
            event.stopPropagation()
            setExpanded(value => !value)
          }}
        >
          {expanded
            ? (messages.approvalCommentShowLess ?? 'Show less')
            : (messages.approvalCommentShowMore ?? 'Show more')}
        </Button>
      )}
    </div>
  )
}

function getStatusBadgeClass(status: VersionHistoryApprovalReviewer['status']): string {
  if (status === 'approved') {
    return 'gba:border-success/30 gba:bg-success/10 gba:text-success'
  }

  if (status === 'rejected') {
    return 'gba:border-destructive/30 gba:bg-destructive/10 gba:text-destructive'
  }

  if (status === 'skipped') {
    return 'gba:border-border gba:bg-muted gba:text-muted-foreground'
  }

  return 'gba:border-warning/30 gba:bg-warning/10 gba:text-warning'
}

function ReviewerLine({
  reviewer,
  messages,
  userDisplayMap
}: {
  reviewer: VersionHistoryApprovalReviewer
  messages: VersionHistoryMessages
  userDisplayMap?: Record<string, VersionUserDisplay>
}): React.ReactElement {
  const unknownUser = messages.unknownUser ?? 'Unknown'
  const reviewerDisplay = getUserDisplay(reviewer.userId, userDisplayMap, unknownUser)
  const responseTime = formatRelativeDate(reviewer.respondedAt, messages.approvalUnknownTime ?? 'Unknown time')

  return (
    <div className="gba:flex gba:w-full gba:min-w-0 gba:max-w-full gba:flex-nowrap gba:items-center gba:gap-2.5">
      <Avatar className="gba:h-7 gba:w-7 gba:shrink-0 gba:ring-2 gba:ring-background gba:ring-offset-1 gba:ring-offset-muted/30">
        {reviewerDisplay.avatarUrl && <AvatarImage src={reviewerDisplay.avatarUrl} alt={reviewerDisplay.displayName} />}
        <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-xs">
          {reviewerDisplay.displayName.slice(0, 2).toUpperCase() || <User className="gba:h-3 gba:w-3" />}
        </AvatarFallback>
      </Avatar>
      <span className="gba:inline-flex gba:min-w-0 gba:max-w-full gba:shrink gba:items-center gba:gap-1.5 gba:overflow-hidden">
        <span className="gba:min-w-0 gba:truncate gba:text-sm gba:font-semibold gba:text-foreground">
          {reviewerDisplay.displayName}
        </span>
        {(reviewer.status === 'pending' || reviewer.status === 'skipped') && (
          <Badge
            variant="outline"
            size="xs"
            className={`${getStatusBadgeClass(reviewer.status)} gba:h-5 gba:shrink-0 gba:px-1.5 gba:py-0 gba:leading-none gba:whitespace-nowrap`}
          >
            {getStatusLabel(reviewer.status, messages)}
          </Badge>
        )}
      </span>
      {reviewer.respondedAt && (
        <span className="gba:flex gba:shrink-0 gba:items-center gba:gap-1 gba:whitespace-nowrap gba:text-xs gba:text-muted-foreground">
          <Clock className="gba:h-3 gba:w-3 gba:shrink-0" />
          {responseTime}
        </span>
      )}
    </div>
  )
}

export function VersionHistoryApprovalSection({
  approval,
  messages,
  userDisplayMap,
  versionNumber,
  onOpenApprovalReview
}: VersionHistoryApprovalSectionProps): React.ReactElement {
  const unknownUser = messages.unknownUser ?? 'Unknown'
  const requesterDisplay = getUserDisplay(approval.requestedBy, userDisplayMap, unknownUser, approval.requestedByName)
  const requesterAvatarUrl = getRequesterAvatarUrl(approval, userDisplayMap?.[approval.requestedBy])
  const requestedAtLabel = formatRelativeDate(approval.requestedAt, messages.approvalUnknownTime ?? 'Unknown time')
  const approvedReviewers = approval.reviewers.filter(reviewer => reviewer.status === 'approved')
  const commentLabel = messages.approvalReviewerCommentLabel ?? 'Review comment'

  const showTopActionRow = Boolean(approval.canReview) && Boolean(onOpenApprovalReview)

  const requestedByValue = (
    <div className="gba:flex gba:min-w-0 gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-1.5">
      <span className="gba:flex gba:items-center gba:gap-2.5">
        <Avatar className="gba:h-7 gba:w-7 gba:ring-2 gba:ring-background gba:ring-offset-1 gba:ring-offset-muted/30">
          {requesterAvatarUrl && <AvatarImage src={requesterAvatarUrl} alt={requesterDisplay.displayName} />}
          <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-xs">
            {requesterDisplay.displayName.slice(0, 2).toUpperCase() || <User className="gba:h-3 gba:w-3" />}
          </AvatarFallback>
        </Avatar>
        <span className="gba:text-sm gba:font-semibold gba:text-foreground">{requesterDisplay.displayName}</span>
      </span>
      <span className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
        <Clock className="gba:h-3 gba:w-3" />
        {requestedAtLabel}
      </span>
    </div>
  )

  const renderApprovedReviewerGrid = () => {
    if (approvedReviewers.length === 0) {
      return (
        <p className="gba:col-span-2 gba:text-sm gba:text-muted-foreground">
          {messages.approvalNoApprovedReviewers ?? 'No approvers recorded'}
        </p>
      )
    }

    return approvedReviewers.flatMap((reviewer, index) => {
      const rows: React.ReactElement[] = []
      if (index === 0) {
        rows.push(
          <ApprovalDetailLabel
            key="approved-by-lbl"
            icon={CheckCircle}
            iconClassName="gba:text-success"
            className="gba:text-success"
          >
            {messages.approvalApprovedBy ?? 'Approved by'}
          </ApprovalDetailLabel>
        )
      }
      rows.push(
        <div key={`${reviewer.userId}-line`} className={cn(index > 0 && 'gba:col-start-2')}>
          <ReviewerLine reviewer={reviewer} messages={messages} userDisplayMap={userDisplayMap} />
        </div>
      )
      const trimmed = reviewer.comments?.trim()
      if (trimmed) {
        rows.push(
          <ApprovalDetailLabel key={`${reviewer.userId}-cmt-lbl`} icon={MessageSquare}>
            {commentLabel}
          </ApprovalDetailLabel>,
          <ReviewerCommentCollapsible key={`${reviewer.userId}-cmt`} text={trimmed} messages={messages} />
        )
      }
      return rows
    })
  }

  const renderNonApprovedReviewerGrid = () =>
    approval.reviewers.flatMap((reviewer, index) => {
      const isRejectedRequest = approval.requestStatus === 'rejected'
      const rows: React.ReactElement[] = []
      if (index === 0) {
        rows.push(
          <ApprovalDetailLabel
            key="reviewers-lbl"
            icon={isRejectedRequest ? XCircle : Users}
            iconClassName={isRejectedRequest ? 'gba:text-destructive' : undefined}
            className={isRejectedRequest ? 'gba:text-destructive' : undefined}
          >
            {isRejectedRequest
              ? (messages.approvalRejectedBy ?? 'Rejected By')
              : (messages.approvalReviewers ?? 'Reviewers')}
          </ApprovalDetailLabel>
        )
      }
      rows.push(
        <div key={`${reviewer.userId}-line`} className={cn(index > 0 && 'gba:col-start-2')}>
          <ReviewerLine reviewer={reviewer} messages={messages} userDisplayMap={userDisplayMap} />
        </div>
      )
      const trimmed = reviewer.comments?.trim()
      if (trimmed) {
        rows.push(
          <ApprovalDetailLabel key={`${reviewer.userId}-cmt-lbl`} icon={MessageSquare}>
            {commentLabel}
          </ApprovalDetailLabel>,
          <ReviewerCommentCollapsible key={`${reviewer.userId}-cmt`} text={trimmed} messages={messages} />
        )
      }
      return rows
    })

  return (
    <div className="gba:mt-3 gba:rounded-xl gba:border gba:border-border/70 gba:bg-muted/40 gba:p-3.5 gba:ring-1 gba:ring-inset gba:ring-border/40">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <div className={cn('gba:min-w-0 gba:flex-1', APPROVAL_DETAIL_GRID)}>
          <ApprovalDetailLabel icon={FileText}>{messages.approvalRequestedBy ?? 'Requested by'}:</ApprovalDetailLabel>
          {requestedByValue}

          {approval.requestStatus === 'approved' ? renderApprovedReviewerGrid() : renderNonApprovedReviewerGrid()}
        </div>
        {showTopActionRow && (
          <Button
            size="sm"
            variant="outline"
            className="gba:shrink-0 gba:self-start gba:px-3 gba:text-xs gba:font-medium"
            onClick={event => {
              event.stopPropagation()
              onOpenApprovalReview?.(versionNumber)
            }}
            data-testid={`version-history-review-${versionNumber}`}
          >
            {messages.approvalOpenReview ?? 'Review Now'}
          </Button>
        )}
      </div>
    </div>
  )
}
