import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import type { DocumentApprovalMetadata, DocumentApprovalRequest } from '../types'
import translations from '../_i18n'

interface DocumentApprovalReviewBannerProps {
  approvalRequest: DocumentApprovalRequest
  approvalMetadata: DocumentApprovalMetadata
  latestLiveVersion: number
  versionUnderReview: number
  hasLiveChanges: boolean
  canRespond: boolean
  isSubmitting: boolean
  onApprove: () => void
  onReject: () => void
  'data-testid'?: string
}

function getStatusLabel(
  status: DocumentApprovalRequest['status'],
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  if (status === 'approved') {
    return t('review-banner-status-approved')
  }

  if (status === 'rejected') {
    return t('review-banner-status-rejected')
  }

  if (status === 'cancelled') {
    return t('review-banner-status-cancelled')
  }

  return t('review-banner-status-pending')
}

function formatRequestedAt(value: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  if (!value) {
    return t('review-banner-requested-at-unknown')
  }

  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return parsedDate.toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short'
  })
}

function getRequestedByLabel(
  approvalRequest: DocumentApprovalRequest,
  t: (key: string, vars?: Record<string, string | number>) => string
): string {
  return (
    approvalRequest.requestedByName?.trim() ||
    approvalRequest.requestedBy.trim() ||
    t('review-banner-requested-by-unknown')
  )
}

function getRequestedAtValue(approvalRequest: DocumentApprovalRequest): string {
  return approvalRequest.requestedAt || approvalRequest.createdAt || ''
}

function getAvatarUrl(picture?: string): string | undefined {
  if (!picture) return undefined
  if (picture.startsWith('data:')) return picture
  return `data:image/png;base64,${picture}`
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

interface ReviewMetaItemProps {
  label: string
  value: string
}

function ReviewMetaItem({ label, value }: ReviewMetaItemProps): React.ReactElement {
  return (
    <span className="gba:flex gba:min-w-0 gba:max-w-full gba:items-center gba:gap-1 gba:text-xs">
      <span className="gba:shrink-0 gba:text-muted-foreground">{label}:</span>
      <span className="gba:truncate gba:font-medium gba:text-foreground">{value}</span>
    </span>
  )
}

export function DocumentApprovalReviewBanner({
  approvalRequest,
  approvalMetadata,
  latestLiveVersion,
  versionUnderReview,
  hasLiveChanges,
  canRespond,
  isSubmitting,
  onApprove,
  onReject,
  'data-testid': testId = 'document-approval-review-banner'
}: DocumentApprovalReviewBannerProps): React.ReactElement {
  const { t } = useTranslation(translations)
  const approvedVersionLabel =
    approvalMetadata.currentApprovedVersion != null
      ? `v${approvalMetadata.currentApprovedVersion}`
      : t('review-banner-approved-version-empty')

  return (
    <div
      className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-2 gba:rounded-md gba:border gba:border-border/60 gba:bg-muted/30 gba:px-3 gba:py-2"
      data-testid={testId}
    >
      <Badge variant={approvalRequest.status === 'pending' ? 'default' : 'secondary'} className="gba:shrink-0">
        {getStatusLabel(approvalRequest.status, t)}
      </Badge>
      <span className="gba:flex gba:min-w-0 gba:max-w-full gba:items-center gba:gap-1 gba:text-xs">
        <span className="gba:shrink-0 gba:text-muted-foreground">{t('review-banner-requested-by')}:</span>
        <Avatar className="gba:h-6 gba:w-6 gba:shrink-0">
          <AvatarImage
            src={getAvatarUrl(approvalRequest.requestedByPicture)}
            alt={getRequestedByLabel(approvalRequest, t)}
          />
          <AvatarFallback className="gba:text-[10px] gba:bg-muted">
            {getInitials(getRequestedByLabel(approvalRequest, t)) || '?'}
          </AvatarFallback>
        </Avatar>
        <span className="gba:truncate gba:font-medium gba:text-foreground">
          {getRequestedByLabel(approvalRequest, t)}
        </span>
      </span>
      <ReviewMetaItem
        label={t('review-banner-requested-at')}
        value={formatRequestedAt(getRequestedAtValue(approvalRequest), t)}
      />
      <ReviewMetaItem label={t('review-banner-approved-version')} value={approvedVersionLabel} />
      <ReviewMetaItem label={t('review-banner-version-under-review')} value={`v${versionUnderReview}`} />
      <ReviewMetaItem label={t('review-banner-last-live-version')} value={`v${latestLiveVersion}`} />
      {hasLiveChanges && (
        <Badge variant="outline" className="gba:shrink-0">
          {t('review-banner-live-changes')}
        </Badge>
      )}
      {canRespond && (
        <div className="gba:ml-auto gba:flex gba:flex-wrap gba:items-center gba:gap-2">
          <Button onClick={onApprove} disabled={isSubmitting} size="sm" data-testid={`${testId}-approve`}>
            {isSubmitting ? <Spinner size="sm" className="gba:mr-2" /> : null}
            {t('review-banner-approve')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onReject}
            disabled={isSubmitting}
            data-testid={`${testId}-reject`}
          >
            {isSubmitting ? <Spinner size="sm" className="gba:mr-2" /> : null}
            {t('review-banner-reject')}
          </Button>
        </div>
      )}
    </div>
  )
}

export default DocumentApprovalReviewBanner
