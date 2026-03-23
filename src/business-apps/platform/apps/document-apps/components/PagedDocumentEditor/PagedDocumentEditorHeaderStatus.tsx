import { Avatar, AvatarFallback, AvatarImage, Badge, useTranslation } from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle, Clock, UserCheck, XCircle } from 'lucide-react'
import type { DocumentApprovalRequest } from '../../types'
import translations from '../../_i18n'
import { formatLastSavedLabel } from './pagedDocumentEditorHeaderUtils'

function formatApprovalDateTime(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getAvatarUrl(picture?: string): string | undefined {
  if (!picture) return undefined
  if (picture.startsWith('data:')) return picture
  return `data:image/png;base64,${picture}`
}

export interface SaveStatusIndicatorProps {
  isSaving: boolean
  hasUnsavedChanges: boolean
  lastSaved: Date | null
  t: (key: string, vars?: Record<string, string | number>) => string
}

export function SaveStatusIndicator({
  isSaving,
  hasUnsavedChanges,
  lastSaved,
  t
}: SaveStatusIndicatorProps): React.ReactNode {
  if (isSaving) {
    return (
      <Badge variant="secondary" className="gba:gap-1">
        <Clock className="gba:w-3 gba:h-3 gba:animate-spin" />
        {t('editor-saving')}
      </Badge>
    )
  }

  if (hasUnsavedChanges) {
    return (
      <Badge variant="outline" className="gba:gap-1">
        <Clock className="gba:w-3 gba:h-3" />
        {t('editor-unsaved')}
      </Badge>
    )
  }

  if (lastSaved) {
    return (
      <span className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
        <CheckCircle className="gba:w-3 gba:h-3 gba:text-success" />
        {formatLastSavedLabel(lastSaved, t)}
      </span>
    )
  }

  return null
}

export interface ApprovalStatusBadgeProps {
  approvalRequest: DocumentApprovalRequest
}

export function ApprovalStatusBadge({ approvalRequest }: ApprovalStatusBadgeProps): React.ReactNode {
  const { t } = useTranslation(translations)
  const approvedBy = approvalRequest.approvers?.filter(approver => approver.status === 'approved') || []
  const pendingApprovers = approvalRequest.approvers?.filter(approver => approver.status === 'pending') || []
  const rejectedBy = approvalRequest.approvers?.filter(approver => approver.status === 'rejected') || []

  if (approvalRequest.status === 'pending' && pendingApprovers.length > 0) {
    return (
      <div className="gba:ml-4 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-warning/10 gba:border gba:border-warning/30">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-warning">
          <AlertCircle className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">{t('editor-approval-pending')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          {pendingApprovers.slice(0, 3).map((approver, index) => (
            <Avatar key={index} className="gba:w-6 gba:h-6">
              <AvatarImage
                src={getAvatarUrl(approver.userPicture)}
                alt={approver.userName || t('editor-approval-approver-alt')}
              />
              <AvatarFallback className="gba:text-[8px] gba:bg-warning/20 gba:text-warning">
                {approver.userName ? getInitials(approver.userName) : '?'}
              </AvatarFallback>
            </Avatar>
          ))}
          {pendingApprovers.length > 3 && (
            <span className="gba:text-xs gba:text-muted-foreground">+{pendingApprovers.length - 3}</span>
          )}
        </div>
      </div>
    )
  }

  if (approvalRequest.status === 'approved' && approvedBy.length > 0) {
    const lastApproved = approvedBy[approvedBy.length - 1]
    return (
      <div className="gba:ml-4 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-success/10 gba:border gba:border-success/30">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-success">
          <CheckCircle className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">{t('editor-approval-approved')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          <Avatar className="gba:w-6 gba:h-6">
            <AvatarImage
              src={getAvatarUrl(lastApproved.userPicture)}
              alt={lastApproved.userName || t('editor-approval-approver-alt')}
            />
            <AvatarFallback className="gba:text-[8px] gba:bg-success/20 gba:text-success">
              {lastApproved.userName ? getInitials(lastApproved.userName) : <UserCheck className="gba:w-3 gba:h-3" />}
            </AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:flex-col">
            <span className="gba:text-xs gba:font-medium gba:text-foreground">
              {lastApproved.userName || lastApproved.userId}
            </span>
            {lastApproved.respondedAt && (
              <span className="gba:text-[10px] gba:text-muted-foreground">
                {formatApprovalDateTime(lastApproved.respondedAt)}
              </span>
            )}
          </div>
        </div>
        {approvedBy.length > 1 && (
          <div className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">
            {t('editor-approval-more', { count: approvedBy.length - 1 })}
          </div>
        )}
      </div>
    )
  }

  if (approvalRequest.status === 'rejected' && rejectedBy.length > 0) {
    const lastRejected = rejectedBy[rejectedBy.length - 1]
    return (
      <div className="gba:ml-4 gba:px-3 gba:py-2 gba:rounded-lg gba:bg-destructive/10 gba:border gba:border-destructive/30">
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-destructive">
          <XCircle className="gba:w-4 gba:h-4" />
          <span className="gba:text-sm gba:font-medium">{t('editor-approval-rejected')}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:mt-2">
          <Avatar className="gba:w-6 gba:h-6">
            <AvatarImage
              src={getAvatarUrl(lastRejected.userPicture)}
              alt={lastRejected.userName || t('editor-approval-rejector-alt')}
            />
            <AvatarFallback className="gba:text-[8px] gba:bg-destructive/20 gba:text-destructive">
              {lastRejected.userName ? getInitials(lastRejected.userName) : '?'}
            </AvatarFallback>
          </Avatar>
          <div className="gba:flex gba:flex-col">
            <span className="gba:text-xs gba:font-medium gba:text-foreground">
              {lastRejected.userName || lastRejected.userId}
            </span>
            {lastRejected.respondedAt && (
              <span className="gba:text-[10px] gba:text-muted-foreground">
                {formatApprovalDateTime(lastRejected.respondedAt)}
              </span>
            )}
          </div>
        </div>
        {lastRejected.comments && (
          <div className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1 gba:italic">"{lastRejected.comments}"</div>
        )}
      </div>
    )
  }

  return null
}
