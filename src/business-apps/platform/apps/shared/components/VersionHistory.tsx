/**
 * VersionHistory Component
 *
 * Displays version history with timeline view, comparison, and restoration capabilities.
 */

import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  Badge,
  ScrollArea,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { Clock, RotateCcw, FileText, CheckCircle, AlertCircle, User } from 'lucide-react'
import type { Version } from '../types/versioning'
import { formatDistanceToNow } from 'date-fns'

export interface VersionUserDisplay {
  displayName: string
  avatarUrl?: string
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
}

export interface VersionHistoryProps {
  versions: Version[]
  isLoading: boolean
  onRestore: (versionNumber: number) => Promise<void>
  onCompare?: (versionA: number, versionB: number) => void
  onClose: () => void
  currentVersion?: number
  showAutoSaves?: boolean // Default false - only show checkpoints
  /** Optional map of createdBy userId -> display name and avatar (e.g. from Employee API) */
  userDisplayMap?: Record<string, VersionUserDisplay>
  /** Optional translated strings */
  messages?: VersionHistoryMessages
  'data-testid'?: string
}

/**
 * Main version history panel
 */
export const VersionHistory: React.FC<VersionHistoryProps> = ({
  versions,
  isLoading,
  onRestore,
  onCompare,
  onClose,
  currentVersion,
  showAutoSaves = false,
  userDisplayMap,
  messages,
  'data-testid': testId = 'version-history'
}) => {
  const m = messages ?? {}
  const getVersionUserDisplay = (version: Version): { displayName: string; avatarUrl?: string } => {
    const fromMap = version.createdBy && userDisplayMap?.[version.createdBy]
    return {
      displayName: fromMap?.displayName ?? version.createdByName ?? version.createdBy ?? m.unknownUser ?? 'Unknown',
      avatarUrl: fromMap?.avatarUrl ?? version.createdByAvatar
    }
  }
  const [selectedVersionA, setSelectedVersionA] = useState<number | null>(null)
  const [selectedVersionB, setSelectedVersionB] = useState<number | null>(null)
  const [isRestoring, setIsRestoring] = useState(false)
  const [compareMode, setCompareMode] = useState(false)
  const [showAllVersions] = useState(showAutoSaves)

  // Filter versions: show checkpoints by default, all when toggled
  const displayVersions = showAllVersions ? versions : versions.filter(v => v.isCheckpoint)

  const handleRestore = async (versionNumber: number) => {
    const confirmMsg = m.restoreConfirm
      ? m.restoreConfirm(versionNumber)
      : `Are you sure you want to restore to version ${versionNumber}? This will create a new version with the restored content.`
    if (window.confirm(confirmMsg)) {
      setIsRestoring(true)
      try {
        await onRestore(versionNumber)
      } finally {
        setIsRestoring(false)
      }
    }
  }

  const handleCompareClick = () => {
    if (selectedVersionA && selectedVersionB && onCompare) {
      onCompare(selectedVersionA, selectedVersionB)
    }
  }

  const handleVersionClick = (version: Version) => {
    if (!compareMode) return

    if (!selectedVersionA) {
      setSelectedVersionA(version.version)
    } else if (!selectedVersionB && version.version !== selectedVersionA) {
      setSelectedVersionB(version.version)
    } else {
      // Reset selection
      setSelectedVersionA(version.version)
      setSelectedVersionB(null)
    }
  }

  const toggleCompareMode = () => {
    setCompareMode(!compareMode)
    setSelectedVersionA(null)
    setSelectedVersionB(null)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[80vh]" data-testid={testId}>
        <DialogHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Clock className="gba:h-5 gba:w-5" />
              {m.title ?? 'Version History'}
            </DialogTitle>
            <div className="gba:flex gba:gap-2">
              {onCompare && (
                <>
                  <Button
                    variant={compareMode ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleCompareMode}
                    data-testid="version-history-compare-mode-toggle"
                  >
                    {compareMode ? (m.cancelCompare ?? 'Cancel Compare') : (m.compareMode ?? 'Compare Versions')}
                  </Button>
                  {compareMode && selectedVersionA && selectedVersionB && (
                    <Button size="sm" onClick={handleCompareClick} data-testid="version-history-compare-button">
                      {m.compareSelected ?? 'Compare Selected'}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="gba:h-[500px] gba:pr-4">
          {isLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
              <p className="gba:text-muted-foreground">{m.loading ?? 'Loading versions...'}</p>
            </div>
          ) : versions.length === 0 ? (
            <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
              <FileText className="gba:h-12 gba:w-12 gba:text-muted-foreground gba:mb-2" />
              <p className="gba:text-muted-foreground">{m.empty ?? 'No version history yet'}</p>
            </div>
          ) : (
            <div className="gba:space-y-2">
              {displayVersions.map((version, index) => {
                const isSelected =
                  compareMode && (version.version === selectedVersionA || version.version === selectedVersionB)
                const isCurrent = version.version === currentVersion

                return (
                  <div
                    key={version.id}
                    className={`gba:relative gba:flex gba:items-start gba:gap-4 gba:p-4 gba:rounded-lg gba:border gba:transition-colors ${
                      isSelected ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-border gba:hover:bg-accent'
                    } ${compareMode ? 'gba:cursor-pointer' : ''}`}
                    onClick={() => handleVersionClick(version)}
                    data-testid={`version-item-${version.version}`}
                  >
                    {/* Timeline indicator */}
                    <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                      <div
                        className={`gba:h-3 gba:w-3 gba:rounded-full ${
                          version.isCheckpoint ? 'gba:bg-primary' : 'gba:bg-muted-foreground'
                        }`}
                      />
                      {index < displayVersions.length - 1 && <div className="gba:h-full gba:w-px gba:bg-border" />}
                    </div>

                    {/* Version info */}
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                        <span className="gba:font-semibold">
                          {m.versionLabel ? m.versionLabel(version.version) : `Version ${version.version}`}
                        </span>
                        {isCurrent && (
                          <Badge variant="default" data-testid="version-current-badge">
                            {m.current ?? 'Current'}
                          </Badge>
                        )}
                        {version.isCheckpoint ? (
                          <Badge variant="secondary" data-testid="version-checkpoint-badge">
                            <CheckCircle className="gba:h-3 gba:w-3 gba:mr-1" />
                            {m.checkpoint ?? 'Checkpoint'}
                          </Badge>
                        ) : (
                          <Badge variant="outline" data-testid="version-autosave-badge">
                            {m.autosave ?? 'Auto-save'}
                          </Badge>
                        )}
                      </div>

                      {version.changeDescription && (
                        <p className="gba:text-sm gba:text-foreground gba:mb-2">{version.changeDescription}</p>
                      )}

                      <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-muted-foreground">
                        <span className="gba:flex gba:items-center gba:gap-2">
                          {(() => {
                            const { displayName, avatarUrl } = getVersionUserDisplay(version)
                            return (
                              <>
                                <Avatar className="gba:h-6 gba:w-6 gba:ring-1 gba:ring-border">
                                  {avatarUrl && (
                                    <AvatarImage src={avatarUrl} alt={displayName} className="gba:object-cover" />
                                  )}
                                  <AvatarFallback className="gba:bg-muted gba:text-muted-foreground gba:text-xs">
                                    {displayName.slice(0, 2).toUpperCase() || <User className="gba:h-3 gba:w-3" />}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="gba:font-medium gba:text-foreground">{displayName}</span>
                              </>
                            )
                          })()}
                        </span>
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Clock className="gba:h-3 gba:w-3" />
                          {formatDistanceToNow(new Date(version.createdAt), {
                            addSuffix: true
                          })}
                        </span>
                        <span>{(version.fileSize / 1024).toFixed(1)} KB</span>
                      </div>
                    </div>

                    {/* Actions */}
                    {!compareMode && !isCurrent && (
                      <div className="gba:flex gba:gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={e => {
                            e.stopPropagation()
                            handleRestore(version.version)
                          }}
                          disabled={isRestoring}
                          data-testid={`version-restore-${version.version}`}
                          title={m.restoreTitle ?? 'Restore this version'}
                        >
                          <RotateCcw className="gba:h-4 gba:w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Compare selection indicator */}
                    {compareMode && isSelected && (
                      <div className="gba:absolute gba:top-2 gba:right-2">
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
          <div className="gba:mt-4 gba:p-3 gba:rounded-lg gba:bg-info-secondary gba:border gba:border-info">
            <div className="gba:flex gba:items-start gba:gap-2">
              <AlertCircle className="gba:h-4 gba:w-4 gba:text-info gba:mt-0.5" />
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
