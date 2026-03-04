/**
 * SpreadsheetHeader Component
 *
 * Top navigation bar with breadcrumbs, status indicators, and actions.
 */

import React, { memo, useCallback, useState } from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import {
  ChevronRight,
  Eye,
  Home,
  FileSpreadsheet,
  MessageSquare,
  Lock,
  Send,
  CheckCircle2,
  BarChart3,
  Sparkles
} from 'lucide-react'
import { getIconByName } from '../utils/appIcons'
import { StatusIndicators } from './StatusIndicators'
import { SpreadsheetActionsMenu } from './SpreadsheetActionsMenu'
import { AutoSaveIndicator } from '../../shared/components/AutoSaveIndicator'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import type { PublishStatus } from '../../shared/types/versioning'
import type { CursorParticipant } from '../hooks/useSpreadsheetCellSelection'

export interface SpreadsheetHeaderProps {
  app: SpreadsheetApp
  activeSheet: SpreadsheetSheet
  onBack?: () => void
  isEditing: boolean
  canEdit: boolean

  // Collaboration
  headerParticipants: CursorParticipant[]
  isCollaborationConnected: boolean

  // Entity data
  isEntityDataLoading: boolean
  onRefreshEntityData: () => void

  // Versioning
  versioning: {
    isSaving: boolean
    lastSaveTime: Date | null
    hasUnsavedChanges: boolean
  }
  onShowCheckpointDialog: () => void
  onShowVersionHistory: () => void

  // Publishing
  publishingStatus: string

  // Comments
  showComments: boolean
  setShowComments: (show: boolean) => void
  unresolvedCommentCount: number

  // File lock
  fileLock: {
    lock: { isLocked: boolean } | null
    isLockedByMe: boolean
    acquireLock: () => void
    releaseLock: () => void
  }

  // Actions
  onShowPublishDialog: () => void
  onAddColumn: () => void
  onManageColumns: () => void
  onOpenAnalytics: () => void
  onOpenSheetsAI: () => void
  onOpenAutomations: () => void
  onEdit?: () => void
  onExport?: () => void
  isCollectionCopy?: boolean
  onSubmitCollection?: () => Promise<void>
  collectionSubmittedAt?: string | null

  testId: string
}

export const SpreadsheetHeader: React.FC<SpreadsheetHeaderProps> = memo(function SpreadsheetHeader({
  app,
  activeSheet,
  onBack,
  isEditing,
  canEdit,
  headerParticipants,
  isCollaborationConnected,
  isEntityDataLoading,
  onRefreshEntityData,
  versioning,
  onShowCheckpointDialog,
  onShowVersionHistory,
  publishingStatus,
  showComments,
  setShowComments,
  unresolvedCommentCount,
  fileLock,
  onShowPublishDialog,
  onAddColumn,
  onManageColumns,
  onOpenAnalytics,
  onOpenSheetsAI,
  onOpenAutomations,
  onEdit,
  onExport,
  isCollectionCopy,
  onSubmitCollection,
  collectionSubmittedAt,
  testId
}) {
  const [isSubmittingCollection, setIsSubmittingCollection] = useState(false)
  const handleSubmitCollection = useCallback(async () => {
    if (!onSubmitCollection || isSubmittingCollection) return
    setIsSubmittingCollection(true)
    try {
      await onSubmitCollection()
    } finally {
      setIsSubmittingCollection(false)
    }
  }, [isSubmittingCollection, onSubmitCollection])

  const formattedSubmittedAt = collectionSubmittedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(collectionSubmittedAt)
      )
    : null

  return (
    <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border/50">
      <div className="gba:flex gba:items-center gba:justify-between gba:min-w-0 gba:w-full">
        {/* Left: Breadcrumb Navigation */}
        <div className="gba:flex gba:items-center gba:gap-1 gba:min-w-0">
          {onBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="gba:h-8 gba:px-2 gba:gap-1 gba:text-muted-foreground gba:hover:text-foreground"
            >
              <Home className="gba:w-4 gba:h-4" />
              <span className="gba:hidden sm:gba:inline">Spreadsheets</span>
            </Button>
          )}
          {onBack && <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground/50 gba:flex-shrink-0" />}
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
            <div className="gba:relative gba:flex-shrink-0">
              <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-gradient-to-br gba:from-primary gba:to-primary/70 gba:flex gba:items-center gba:justify-center gba:shadow-sm">
                {(() => {
                  const IconComponent = app.icon ? getIconByName(app.icon) : null
                  return IconComponent ? (
                    <IconComponent className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
                  ) : (
                    <FileSpreadsheet className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
                  )
                })()}
              </div>
            </div>
            <div className="gba:min-w-0 gba:flex-1">
              <h1 className="gba:text-base gba:font-semibold gba:text-foreground gba:truncate">{app.name}</h1>
              {app.description && (
                <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[300px]">
                  {app.description}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Right: Status & Quick Actions */}
        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-shrink-0">
          {/* Live Status Indicators */}
          <StatusIndicators
            headerParticipants={headerParticipants}
            isCollaborationConnected={isCollaborationConnected}
            entityDataSource={activeSheet?.entityDataSource}
            onRefreshEntityData={onRefreshEntityData}
            isEntityDataLoading={isEntityDataLoading}
            data-testid={`${testId}-status-indicators`}
          />

          {/* Divider */}
          <div className="gba:h-6 gba:w-px gba:bg-border/50" />

          {/* Publishing status */}
          {!isCollectionCopy && (
            <StatusBadge
              status={
                (['draft', 'in_review', 'published', 'archived'].includes(publishingStatus)
                  ? publishingStatus
                  : 'draft') as PublishStatus
              }
            />
          )}

          {/* View Only Badge */}
          {!isEditing && (
            <Badge
              variant="secondary"
              className="gba:bg-muted/50 gba:text-muted-foreground gba:border-border/30 gba:backdrop-blur-sm"
              data-testid="view-only-badge"
            >
              <Eye className="gba:h-3 gba:w-3 gba:mr-1" />
              View Only
            </Badge>
          )}

          {/* Versioning Features - Clean */}
          {isEditing && (
            <div className="gba:flex gba:items-center gba:gap-1.5">
              {/* Auto-save indicator */}
              <AutoSaveIndicator
                isSaving={versioning.isSaving}
                lastSaveTime={versioning.lastSaveTime}
                hasUnsavedChanges={versioning.hasUnsavedChanges}
                onManualSave={onShowCheckpointDialog}
                data-testid="spreadsheet-auto-save-indicator"
              />

              {/* Comments button */}
              <Button
                variant={showComments ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setShowComments(!showComments)}
                title="Comments"
                data-testid="spreadsheet-comments-button"
                className="gba:h-8"
              >
                <MessageSquare className="gba:w-4 gba:h-4" />
                {unresolvedCommentCount > 0 && (
                  <Badge variant="warning" className="gba:ml-1 gba:px-1 gba:py-0 gba:h-4 gba:text-xs">
                    {unresolvedCommentCount}
                  </Badge>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenAnalytics}
                title="AI Analytics"
                data-testid="spreadsheet-analytics-button"
                className="gba:h-8 gba:px-2 gba:gap-1 gba:bg-black gba:text-white gba:hover:bg-black/90 gba:hover:text-white"
              >
                <BarChart3 className="gba:w-4 gba:h-4" />
                AI Analytics
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={onOpenSheetsAI}
                title="Sheets AI"
                data-testid="spreadsheet-sheets-ai-button"
                className="gba:h-8 gba:px-2 gba:gap-1 gba:border gba:border-primary/25"
              >
                <Sparkles className="gba:w-4 gba:h-4" />
                Sheets AI
              </Button>

              {/* Lock status (compact) */}
              {fileLock.lock?.isLocked && fileLock.isLockedByMe && (
                <Badge variant="default" className="gba:flex gba:items-center gba:gap-1">
                  <Lock className="gba:h-3 gba:w-3" />
                  Locked
                </Badge>
              )}
            </div>
          )}

          {isCollectionCopy && collectionSubmittedAt && formattedSubmittedAt && (
            <Badge
              variant="success"
              className="gba:flex gba:items-center gba:gap-1.5"
              data-testid="spreadsheet-submitted-badge"
            >
              <CheckCircle2 className="gba:w-3.5 gba:h-3.5" />
              <span>Submitted - {formattedSubmittedAt}</span>
            </Badge>
          )}
          {isCollectionCopy && !collectionSubmittedAt && onSubmitCollection && (
            <Button
              size="sm"
              onClick={() => void handleSubmitCollection()}
              disabled={isSubmittingCollection}
              data-testid="spreadsheet-submit-collection"
            >
              <Send className="gba:w-4 gba:h-4 gba:mr-2" />
              {isSubmittingCollection ? 'Submitting...' : 'Submit'}
            </Button>
          )}

          <div className="gba:h-6 gba:w-px gba:bg-border/50" />

          {/* Spreadsheet Actions Menu */}
          <SpreadsheetActionsMenu
            onShowVersionHistory={onShowVersionHistory}
            onShowCheckpointDialog={onShowCheckpointDialog}
            onShowPublishDialog={onShowPublishDialog}
            isLockedByMe={fileLock.isLockedByMe}
            onAcquireLock={fileLock.acquireLock}
            onReleaseLock={fileLock.releaseLock}
            canEdit={canEdit}
            onAddColumn={onAddColumn}
            onManageColumns={onManageColumns}
            onOpenAnalytics={onOpenAnalytics}
            onOpenSheetsAI={onOpenSheetsAI}
            onOpenAutomations={onOpenAutomations}
            onEdit={onEdit}
            allowExport={activeSheet.settings.allowExport}
            onExport={onExport}
            data-testid={`${testId}-actions-menu`}
          />
        </div>
      </div>
    </div>
  )
})
