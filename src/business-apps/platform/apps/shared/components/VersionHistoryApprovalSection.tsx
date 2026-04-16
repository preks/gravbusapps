import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button } from '@newwork/nw-design-system'
import { CheckCircle, Clock, User } from 'lucide-react'
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

  return messages.approvalPending ?? 'Pending'
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

function ReviewerRow({
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
    <div className="gba:flex gba:min-w-0 gba:max-w-full gba:flex-nowrap gba:items-center gba:gap-2">
      <Avatar className="gba:h-6 gba:w-6 gba:shrink-0 gba:ring-1 gba:ring-border">
        {reviewerDisplay.avatarUrl && <AvatarImage src={reviewerDisplay.avatarUrl} alt={reviewerDisplay.displayName} />}
        <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-xs">
          {reviewerDisplay.displayName.slice(0, 2).toUpperCase() || <User className="gba:h-3 gba:w-3" />}
        </AvatarFallback>
      </Avatar>
      <span className="gba:inline-flex gba:min-w-0 gba:max-w-full gba:shrink gba:items-center gba:gap-1.5 gba:overflow-hidden">
        <span className="gba:min-w-0 gba:truncate gba:text-sm gba:font-medium gba:text-foreground">
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

  const showTopActionRow = Boolean(approval.canReview) && Boolean(onOpenApprovalReview)

  return (
    <div className="gba:mt-3 gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/40 gba:p-2">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
        <div className="gba:min-w-0 gba:flex-1 gba:space-y-1.5">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-2 gba:gap-y-1">
            <span className="gba:text-xs gba:text-muted-foreground">
              {messages.approvalRequestedBy ?? 'Requested by'}:
            </span>
            <span className="gba:flex gba:items-center gba:gap-2">
              <Avatar className="gba:h-6 gba:w-6 gba:ring-1 gba:ring-border">
                {requesterAvatarUrl && <AvatarImage src={requesterAvatarUrl} alt={requesterDisplay.displayName} />}
                <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-xs">
                  {requesterDisplay.displayName.slice(0, 2).toUpperCase() || <User className="gba:h-3 gba:w-3" />}
                </AvatarFallback>
              </Avatar>
              <span className="gba:text-sm gba:font-medium gba:text-foreground">{requesterDisplay.displayName}</span>
            </span>
            <span className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
              <Clock className="gba:h-3 gba:w-3" />
              {requestedAtLabel}
            </span>
          </div>

          {approval.requestStatus === 'approved' ? (
            approvedReviewers.length > 0 ? (
              <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-2 gba:gap-y-1">
                <CheckCircle className="gba:h-3 gba:w-3 gba:shrink-0 gba:text-success" />
                <span className="gba:shrink-0 gba:text-xs gba:text-muted-foreground">
                  {messages.approvalApprovedBy ?? 'Approved by'}
                </span>
                {approvedReviewers.map(reviewer => (
                  <ReviewerRow
                    key={`${approval.requestId}-${reviewer.userId}`}
                    reviewer={reviewer}
                    messages={messages}
                    userDisplayMap={userDisplayMap}
                  />
                ))}
              </div>
            ) : (
              <p className="gba:text-sm gba:text-muted-foreground">
                {messages.approvalNoApprovedReviewers ?? 'No approvers recorded'}
              </p>
            )
          ) : (
            <div className="gba:grid gba:grid-cols-[auto_minmax(0,1fr)] gba:items-start gba:gap-x-2 gba:gap-y-1">
              <span className="gba:pt-1 gba:text-xs gba:leading-none gba:text-muted-foreground">
                {messages.approvalReviewers ?? 'Reviewers'}
              </span>
              <div className="gba:flex gba:min-w-0 gba:w-full gba:max-w-full gba:flex-col gba:gap-1 gba:overflow-hidden">
                {approval.reviewers.map(reviewer => (
                  <ReviewerRow
                    key={`${approval.requestId}-${reviewer.userId}`}
                    reviewer={reviewer}
                    messages={messages}
                    userDisplayMap={userDisplayMap}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        {showTopActionRow && (
          <Button
            size="sm"
            variant="outline"
            className="gba:shrink-0 gba:self-start gba:px-2 gba:text-xs"
            onClick={event => {
              event.stopPropagation()
              onOpenApprovalReview(versionNumber)
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
