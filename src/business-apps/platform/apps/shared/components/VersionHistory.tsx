import React, { useState } from 'react'
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
  ScrollArea
} from '@newwork/nw-design-system'
import { AlertCircle, CheckCircle, Clock, FileText, RotateCcw, User } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { Version } from '../types/versioning'
import { VersionHistoryApprovalSection } from './VersionHistoryApprovalSection'

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
  approvalNoApprovedReviewers?: string
  approvalUnknownTime?: string
  approvalCommentShowMore?: string
  approvalCommentShowLess?: string
  /** Label above approver comment text in version history */
  approvalReviewerCommentLabel?: string
}

export interface VersionHistoryProps {
  versions: Version[]
  isLoading: boolean
  onRestore: (versionNumber: number) => Promise<void>
  onCompare?: (versionA: number, versionB: number) => void
  onClose: () => void
  currentVersion?: number
  showAutoSaves?: boolean
  userDisplayMap?: Record<string, VersionUserDisplay>
  approvalDetailsByVersion?: Record<number, VersionHistoryApprovalDetails>
  onOpenApprovalReview?: (versionNumber: number) => void
  messages?: VersionHistoryMessages
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

function formatVersionCreatedAt(value: string): string {
  const parsedDate = new Date(value)
  if (Number.isNaN(parsedDate.getTime())) {
    return value
  }

  return formatDistanceToNow(parsedDate, { addSuffix: true })
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

export function VersionHistory({
  versions,
  isLoading,
  onRestore,
  onCompare,
  onClose,
  currentVersion,
  showAutoSaves = false,
  userDisplayMap,
  approvalDetailsByVersion,
  onOpenApprovalReview,
  messages,
  'data-testid': testId = 'version-history'
}: Readonly<VersionHistoryProps>): React.ReactElement {
  const m = messages ?? {}
  const [selectedVersionA, setSelectedVersionA] = useState<number | null>(null)
  const [selectedVersionB, setSelectedVersionB] = useState<number | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const displayVersions = showAutoSaves ? versions : versions.filter(version => version.isCheckpoint)

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
      <DialogContent className="gba:max-h-[80vh] gba:max-w-2xl" data-testid={testId}>
        <DialogHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Clock className="gba:h-5 gba:w-5" />
              {m.title ?? 'Version History'}
            </DialogTitle>
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
          </div>
        </DialogHeader>

        <ScrollArea className="gba:h-[500px] gba:pr-4">
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <p className="gba:text-muted-foreground">{m.loading ?? 'Loading versions...'}</p>
            </div>
          ) : displayVersions.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
              <FileText className="gba:mb-2 gba:h-12 gba:w-12 gba:text-muted-foreground" />
              <p className="gba:text-muted-foreground">{m.empty ?? 'No version history yet'}</p>
            </div>
          ) : (
            <div className="gba:space-y-2">
              {displayVersions.map((version, index) => {
                const isSelected =
                  compareMode && (version.version === selectedVersionA || version.version === selectedVersionB)
                const isCurrent = version.version === currentVersion
                const versionDisplay = getVersionUserDisplay(version, userDisplayMap, m)
                const approvalDetails = approvalDetailsByVersion?.[version.version]

                return (
                  <div
                    key={version.id}
                    className={`gba:relative gba:flex gba:items-start gba:gap-4 gba:rounded-lg gba:border gba:p-4 gba:transition-colors ${
                      isSelected ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-border gba:hover:bg-accent'
                    } ${compareMode ? 'gba:cursor-pointer' : ''}`}
                    onClick={() => handleVersionClick(version.version)}
                    data-testid={`version-item-${version.version}`}
                  >
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <div
                        className={`gba:h-3 gba:w-3 gba:rounded-full ${
                          version.isCheckpoint ? 'gba:bg-primary' : 'gba:bg-muted-foreground'
                        }`}
                      />
                      {index < displayVersions.length - 1 && <div className="gba:h-full gba:w-px gba:bg-border" />}
                    </div>

                    <div className="gba:min-w-0 gba:flex-1">
                      <div className="gba:mb-1 gba:flex gba:flex-wrap gba:items-center gba:gap-2">
                        <span className="gba:font-semibold">
                          {m.versionLabel ? m.versionLabel(version.version) : `Version ${version.version}`}
                        </span>
                        {isCurrent && <Badge variant="default">{m.current ?? 'Current'}</Badge>}
                        {version.isCheckpoint ? (
                          <Badge variant="secondary" data-testid="version-checkpoint-badge">
                            <CheckCircle className="gba:mr-1 gba:h-3 gba:w-3" />
                            {m.checkpoint ?? 'Checkpoint'}
                          </Badge>
                        ) : (
                          <Badge variant="outline">{m.autosave ?? 'Auto-save'}</Badge>
                        )}
                        {approvalDetails && (
                          <Badge
                            variant="outline"
                            className={getVersionHeaderRequestStatusClass(approvalDetails.requestStatus)}
                            data-testid="version-approval-request-status-header-badge"
                          >
                            {getVersionHeaderRequestStatusLabel(approvalDetails.requestStatus, m)}
                          </Badge>
                        )}
                      </div>

                      {version.changeDescription && (
                        <p className="gba:mb-2 gba:text-sm gba:text-foreground">{version.changeDescription}</p>
                      )}

                      <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
                        <span className="gba:flex gba:items-center gba:gap-2">
                          <Avatar className="gba:h-6 gba:w-6 gba:ring-1 gba:ring-border">
                            {versionDisplay.avatarUrl && (
                              <AvatarImage src={versionDisplay.avatarUrl} alt={versionDisplay.displayName} />
                            )}
                            <AvatarFallback className="gba:bg-muted gba:text-xs gba:text-muted-foreground">
                              {versionDisplay.displayName.slice(0, 2).toUpperCase() || (
                                <User className="gba:h-3 gba:w-3" />
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <span className="gba:font-medium gba:text-foreground">{versionDisplay.displayName}</span>
                        </span>
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Clock className="gba:h-3 gba:w-3" />
                          {formatVersionCreatedAt(version.createdAt)}
                        </span>
                        <span>{(version.fileSize / 1024).toFixed(1)} KB</span>
                      </div>

                      {approvalDetails && (
                        <VersionHistoryApprovalSection
                          approval={approvalDetails}
                          messages={m}
                          userDisplayMap={userDisplayMap}
                          versionNumber={version.version}
                          onOpenApprovalReview={onOpenApprovalReview}
                        />
                      )}
                    </div>

                    {!compareMode && !isCurrent && (
                      <div className="gba:flex gba:gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
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
          <div className="gba:mt-4 gba:rounded-lg gba:border gba:border-info gba:bg-info-secondary gba:p-3">
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
