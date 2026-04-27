import React, { useMemo, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  ScrollArea,
  cn
} from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle, Clock, FileText, RotateCcw, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Version } from '../types/versioning'
import { VersionHistoryApprovalSection } from './VersionHistoryApprovalSection'
import { getDateFnsLocale } from '../utils/dateLocale'

export interface VersionUserDisplay {
  displayName: string
  avatarUrl?: string
}

export interface VersionHistoryApprovalReviewer {
  userId: string
  status: 'pending' | 'approved' | 'rejected' | 'skipped'
  respondedAt?: string
  /** Approver comment (e.g. rejection reason), from document-service approval step */
  comments?: string
}

export interface VersionHistoryApprovalDetails {
  requestId: string
  requestStatus: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'expired'
  requestedBy: string
  requestedByName?: string
  requestedByPicture?: string
  requestedAt: string
  reviewers: VersionHistoryApprovalReviewer[]
  canReview?: boolean
  /** True when the request is approved and any user with document view access may open the read-only snapshot. */
  canViewApproved?: boolean
}

export interface VersionHistoryMessages {
  title?: string
  compareMode?: string
  cancelCompare?: string
  compareSelected?: string
  loading?: string
  empty?: string
  versionLabel?: (num: number) => string
  current?: string
  checkpoint?: string
  autosave?: string
  restoreTitle?: string
  restoreConfirm?: (num: number) => string
  compareHint?: string
  unknownUser?: string
  approvalPending?: string
  /** Shown for pending request in version header (e.g. "In review"); falls back to `approvalPending`. */
  approvalInReview?: string
  approvalApproved?: string
  approvalRejected?: string
  approvalSkipped?: string
  approvalRequestedBy?: string
  approvalReviewers?: string
  /** Version history label when the request was rejected (replaces approvalReviewers). */
  approvalRejectedBy?: string
  approvalApprovedBy?: string
  approvalOpenReview?: string
  /** Button label shown on approved versions for users who may only view (print, export PDF/DOCX). */
  approvalOpenApprovedView?: string
  approvalNoApprovedReviewers?: string
  approvalUnknownTime?: string
  approvalCommentShowMore?: string
  approvalCommentShowLess?: string
  /** Label above approver comment text in version history */
  approvalReviewerCommentLabel?: string
  /** Version list filter by linked approval request status */
  approvalFilterLabel?: string
  approvalFilterAll?: string
  approvalFilterInReview?: string
  approvalFilterApproved?: string
  approvalFilterRejected?: string
  /** Shown when no checkpoint matches the selected approval filter */
  approvalFilterEmpty?: string
  /** Reviewer row badge while approval step is still pending (e.g. "Pending approval") */
  approvalPendingBadge?: string
}

export interface VersionHistoryProps {
  versions: Version[]
  isLoading: boolean
  error?: string | null
  onRestore: (versionNumber: number) => Promise<void>
  onCompare?: (versionA: number, versionB: number) => void
  onClose: () => void
  currentVersion?: number
  showAutoSaves?: boolean
  userDisplayMap?: Record<string, VersionUserDisplay>
  approvalDetailsByVersion?: Record<number, VersionHistoryApprovalDetails>
  onOpenApprovalReview?: (versionNumber: number) => void
  messages?: VersionHistoryMessages
  /** Locale tag (e.g. `de-DE`) used to format relative dates shown in the version list and approval section. */
  locale?: string
  'data-testid'?: string
}

function getVersionUserDisplay(
  version: Version,
  userDisplayMap: Record<string, VersionUserDisplay> | undefined,
  messages: VersionHistoryMessages
): VersionUserDisplay {
  const fromMap = version.createdBy ? userDisplayMap?.[version.createdBy] : undefined

  return {
    displayName:
      fromMap?.displayName ?? version.createdByName ?? version.createdBy ?? messages.unknownUser ?? 'Unknown',
    avatarUrl: fromMap?.avatarUrl ?? version.createdByAvatar
  }
}

function formatVersionCreatedAt(value: string, locale?: string): string {
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true, locale: getDateFnsLocale(locale) })
}

function getVersionHeaderRequestStatusLabel(
  status: VersionHistoryApprovalDetails['requestStatus'],
  messages: VersionHistoryMessages
): string {
  if (status === 'approved') {
    return messages.approvalApproved ?? 'Approved'
  }

  if (status === 'rejected') {
    return messages.approvalRejected ?? 'Rejected'
  }

  if (status === 'cancelled' || status === 'expired') {
    return messages.approvalSkipped ?? 'Skipped'
  }

  return messages.approvalInReview ?? messages.approvalPending ?? 'Pending'
}

function getVersionHeaderRequestStatusClass(status: VersionHistoryApprovalDetails['requestStatus']): string {
  if (status === 'approved') {
    return 'gba:border-success/30 gba:bg-success/10 gba:text-success'
  }

  if (status === 'rejected') {
    return 'gba:border-destructive/30 gba:bg-destructive/10 gba:text-destructive'
  }

  if (status === 'cancelled' || status === 'expired') {
    return 'gba:border-border gba:bg-muted gba:text-muted-foreground'
  }

  return 'gba:border-warning/30 gba:bg-warning/10 gba:text-warning'
}

type VersionHistoryApprovalFilterValue = 'all' | 'pending' | 'approved' | 'rejected'

function matchesApprovalFilter(
  details: VersionHistoryApprovalDetails | undefined,
  filter: VersionHistoryApprovalFilterValue
): boolean {
  if (filter === 'all') {
    return true
  }
  if (!details) {
    return false
  }
  if (filter === 'pending') {
    return details.requestStatus === 'pending'
  }
  if (filter === 'approved') {
    return details.requestStatus === 'approved'
  }
  if (filter === 'rejected') {
    return details.requestStatus === 'rejected'
  }
  return true
}

export function VersionHistory({
  versions,
  isLoading,
  error,
  onRestore,
  onCompare,
  onClose,
  currentVersion,
  showAutoSaves = false,
  userDisplayMap,
  approvalDetailsByVersion,
  onOpenApprovalReview,
  messages,
  locale,
  'data-testid': testId = 'version-history'
}: Readonly<VersionHistoryProps>): React.ReactElement {
  const m = messages ?? {}
  const [selectedVersionA, setSelectedVersionA] = useState<number | null>(null)
  const [selectedVersionB, setSelectedVersionB] = useState<number | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [approvalFilter, setApprovalFilter] = useState<VersionHistoryApprovalFilterValue>('all')
  const displayVersions = showAutoSaves ? versions : versions.filter(version => version.isCheckpoint)

  const hasApprovalDetails = approvalDetailsByVersion != null && Object.keys(approvalDetailsByVersion).length > 0

  const filteredVersions = useMemo(() => {
    if (approvalFilter === 'all' || !hasApprovalDetails) {
      return displayVersions
    }
    return displayVersions.filter(version =>
      matchesApprovalFilter(approvalDetailsByVersion?.[version.version], approvalFilter)
    )
  }, [approvalFilter, approvalDetailsByVersion, displayVersions, hasApprovalDetails])

  const handleRestore = async (versionNumber: number) => {
    const confirmMessage = m.restoreConfirm
      ? m.restoreConfirm(versionNumber)
      : `Are you sure you want to restore to version ${versionNumber}? This will create a new version with the restored content.`

    if (!window.confirm(confirmMessage)) {
      return
    }

    setIsRestoring(true)
    try {
      await onRestore(versionNumber)
    } finally {
      setIsRestoring(false)
    }
  }

  const handleVersionClick = (versionNumber: number) => {
    if (!compareMode) {
      return
    }

    if (!selectedVersionA) {
      setSelectedVersionA(versionNumber)
      return
    }

    if (!selectedVersionB && versionNumber !== selectedVersionA) {
      setSelectedVersionB(versionNumber)
      return
    }

    setSelectedVersionA(versionNumber)
    setSelectedVersionB(null)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="gba:max-h-[85vh] gba:max-w-2xl gba:gap-0 gba:overflow-hidden gba:p-0 sm:gba:max-w-2xl"
        data-testid={testId}
      >
        <DialogHeader className="gba:space-y-0 gba:border-b gba:border-border gba:px-6 gba:pb-4 gba:pt-6 gba:pr-14">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:justify-between gba:gap-x-3 gba:gap-y-2">
            <DialogTitle className="gba:flex gba:min-w-0 gba:flex-1 gba:items-center gba:gap-2.5 gba:text-lg gba:font-semibold gba:tracking-tight">
              <span className="gba:flex gba:h-9 gba:w-9 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-lg gba:bg-muted">
                <Clock className="gba:h-5 gba:w-5 gba:text-muted-foreground" />
              </span>
              <span className="gba:truncate">{m.title ?? 'Version History'}</span>
            </DialogTitle>
            <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-2">
              {onCompare && (
                <div className="gba:flex gba:gap-2">
                  <Button
                    variant={compareMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => {
                      setCompareMode(currentValue => !currentValue)
                      setSelectedVersionA(null)
                      setSelectedVersionB(null)
                    }}
                    data-testid="version-history-compare-mode-toggle"
                  >
                    {compareMode ? (m.cancelCompare ?? 'Cancel Compare') : (m.compareMode ?? 'Compare Versions')}
                  </Button>
                  {compareMode && selectedVersionA && selectedVersionB && (
                    <Button
                      size="sm"
                      onClick={() => onCompare(selectedVersionA, selectedVersionB)}
                      data-testid="version-history-compare-button"
                    >
                      {m.compareSelected ?? 'Compare Selected'}
                    </Button>
                  )}
                </div>
              )}
              {!isLoading && displayVersions.length > 0 && hasApprovalDetails && (
                <div className="gba:flex gba:items-center gba:rounded-lg gba:border gba:border-border/50 gba:px-1 gba:py-0.5">
                  <select
                    id="version-history-approval-filter"
                    value={approvalFilter}
                    onChange={event => {
                      setApprovalFilter(event.target.value as VersionHistoryApprovalFilterValue)
                    }}
                    aria-label={m.approvalFilterLabel ?? 'Approval'}
                    className="gba:max-w-[10.5rem] gba:cursor-pointer gba:border-0 gba:bg-transparent gba:py-0.5 gba:pl-1 gba:pr-1 gba:text-xs gba:text-muted-foreground focus:gba:outline-none"
                    data-testid="version-history-approval-filter"
                  >
                    <option value="all">{m.approvalFilterAll ?? 'All Statuses'}</option>
                    <option value="pending">{m.approvalFilterInReview ?? m.approvalInReview ?? 'In Review'}</option>
                    <option value="approved">{m.approvalFilterApproved ?? m.approvalApproved ?? 'Approved'}</option>
                    <option value="rejected">{m.approvalFilterRejected ?? m.approvalRejected ?? 'Rejected'}</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="gba:min-h-[320px] gba:max-h-[min(520px,52vh)] gba:px-6 gba:pb-2">
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <p className="gba:text-muted-foreground">{m.loading ?? 'Loading versions...'}</p>
            </div>
          ) : error && displayVersions.length === 0 ? (
            <div
              className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center"
              data-testid={`${testId}-error`}
            >
              <AlertCircle className="gba:mb-2 gba:h-12 gba:w-12 gba:text-destructive" />
              <p className="gba:text-muted-foreground">{error}</p>
            </div>
          ) : displayVersions.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
              <FileText className="gba:mb-2 gba:h-12 gba:w-12 gba:text-muted-foreground" />
              <p className="gba:text-muted-foreground">{m.empty ?? 'No version history yet'}</p>
            </div>
          ) : filteredVersions.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:px-4 gba:text-center">
              <FileText className="gba:mb-2 gba:h-12 gba:w-12 gba:text-muted-foreground" />
              <p className="gba:text-muted-foreground">
                {m.approvalFilterEmpty ?? 'No checkpoints match this approval filter.'}
              </p>
            </div>
          ) : (
            <div className="gba:space-y-3 gba:pb-4">
              {filteredVersions.map((version, index) => {
                const isSelected =
                  compareMode && (version.version === selectedVersionA || version.version === selectedVersionB)
                const isCurrent = version.version === currentVersion
                const versionDisplay = getVersionUserDisplay(version, userDisplayMap, m)
                const approvalDetails = approvalDetailsByVersion?.[version.version]

                return (
                  <div
                    key={version.id}
                    className={`gba:relative gba:flex gba:items-start gba:gap-4 gba:rounded-xl gba:border gba:bg-card gba:p-4 gba:shadow-sm gba:transition-all ${
                      isSelected
                        ? 'gba:border-primary gba:bg-primary/5 gba:ring-1 gba:ring-primary/20 gba:shadow-md'
                        : 'gba:border-border/80 gba:hover:border-border gba:hover:shadow'
                    } ${compareMode ? 'gba:cursor-pointer' : ''}`}
                    onClick={() => handleVersionClick(version.version)}
                    data-testid={`version-item-${version.version}`}
                  >
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:pt-1">
                      <div
                        className={`gba:h-2.5 gba:w-2.5 gba:shrink-0 gba:rounded-full gba:ring-2 gba:ring-offset-2 gba:ring-offset-card ${
                          version.isCheckpoint
                            ? 'gba:bg-primary gba:ring-primary/25'
                            : 'gba:bg-muted-foreground gba:ring-muted-foreground/20'
                        }`}
                      />
                      {index < filteredVersions.length - 1 && (
                        <div className="gba:h-10 gba:w-px gba:shrink-0 gba:bg-border/70" aria-hidden />
                      )}
                    </div>

                    <div className="gba:min-w-0 gba:flex-1 gba:space-y-3">
                      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-2 gba:gap-y-1.5">
                        <span className="gba:text-base gba:font-semibold gba:tracking-tight gba:text-foreground">
                          {m.versionLabel ? m.versionLabel(version.version) : `Version ${version.version}`}
                        </span>
                        {isCurrent && <Badge variant="default">{m.current ?? 'Current'}</Badge>}
                        {version.isCheckpoint ? (
                          <Badge
                            variant="secondary"
                            className="gba:border-transparent gba:bg-muted gba:font-medium"
                            data-testid="version-checkpoint-badge"
                          >
                            <CheckCircle className="gba:mr-1 gba:h-3 gba:w-3" />
                            {m.checkpoint ?? 'Checkpoint'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{m.autosave ?? 'Auto-save'}</Badge>
                        )}
                        {approvalDetails && (
                          <Badge
                            variant="outline"
                            className={cn(
                              'gba:font-medium',
                              getVersionHeaderRequestStatusClass(approvalDetails.requestStatus)
                            )}
                            data-testid="version-approval-request-status-header-badge"
                          >
                            {getVersionHeaderRequestStatusLabel(approvalDetails.requestStatus, m)}
                          </Badge>
                        )}
                      </div>

                      {version.changeDescription && (
                        <p className="gba:text-sm gba:leading-relaxed gba:text-foreground">
                          {version.changeDescription}
                        </p>
                      )}

                      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-3 gba:gap-y-1 gba:text-sm gba:text-muted-foreground">
                        <span className="gba:flex gba:items-center gba:gap-2">
                          <Avatar className="gba:h-7 gba:w-7 gba:ring-2 gba:ring-background gba:ring-offset-1 gba:ring-offset-card">
                            {versionDisplay.avatarUrl && (
                              <AvatarImage src={versionDisplay.avatarUrl} alt={versionDisplay.displayName} />
                            )}
                            <AvatarFallback className="gba:bg-muted gba:text-xs gba:font-medium gba:text-muted-foreground">
                              {versionDisplay.displayName.slice(0, 2).toUpperCase() || (
                                <User className="gba:h-3 gba:w-3" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span className="gba:font-medium gba:text-foreground">{versionDisplay.displayName}</span>
                        </span>
                        <span className="gba:hidden gba:text-muted-foreground/50 sm:gba:inline" aria-hidden>
                          ·
                        </span>
                        <span className="gba:flex gba:items-center gba:gap-1.5">
                          <Clock className="gba:h-3.5 gba:w-3.5 gba:shrink-0" />
                          {formatVersionCreatedAt(version.createdAt, locale)}
                        </span>
                      </div>

                      {approvalDetails && (
                        <VersionHistoryApprovalSection
                          approval={approvalDetails}
                          messages={m}
                          userDisplayMap={userDisplayMap}
                          versionNumber={version.version}
                          onOpenApprovalReview={onOpenApprovalReview}
                          locale={locale}
                        />
                      )}
                    </div>

                    {!compareMode && !isCurrent && (
                      <div className="gba:flex gba:shrink-0 gba:gap-1 gba:pt-0.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gba:h-9 gba:w-9 gba:rounded-full gba:p-0 gba:text-muted-foreground hover:gba:bg-muted hover:gba:text-foreground"
                          onClick={event => {
                            event.stopPropagation()
                            void handleRestore(version.version)
                          }}
                          disabled={isRestoring}
                          data-testid={`version-restore-${version.version}`}
                          title={m.restoreTitle ?? 'Restore this version'}
                        >
                          <RotateCcw className="gba:h-4 gba:w-4" />
                        </Button>
                      </div>
                    )}

                    {compareMode && isSelected && (
                      <div className="gba:absolute gba:right-2 gba:top-2">
                        <Badge variant="default">{version.version === selectedVersionA ? 'A' : 'B'}</Badge>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {compareMode && (
          <div className="gba:mx-6 gba:mb-6 gba:mt-2 gba:rounded-xl gba:border gba:border-info gba:bg-info-secondary gba:p-3">
            <div className="gba:flex gba:items-start gba:gap-2">
              <AlertCircle className="gba:mt-0.5 gba:h-4 gba:w-4 gba:text-info" />
              <p className="gba:text-sm gba:text-info-secondary-foreground">
                {m.compareHint ?? 'Select two versions to compare. Click on a version to select it.'}
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
