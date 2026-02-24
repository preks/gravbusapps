/**
 * SpreadsheetHeader Component
 *
 * Top navigation bar with breadcrumbs, status indicators, and actions.
 * When canEdit and onRename are provided, the app name is editable (like document-apps title).
 */

import React, { memo, useState, useEffect, useCallback } from 'react'
import {
  Button,
  AiButton,
  Badge,
  Input,
  Spinner,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ChevronRight,
  Eye,
  Home,
  FileSpreadsheet,
  MessageSquare,
  Lock,
  Send,
  Sparkles,
  CheckCircle2,
  RefreshCw,
  Loader2
} from 'lucide-react'
import { getIconByName } from '../utils/appIcons'
import { StatusIndicators } from './StatusIndicators'
import { SpreadsheetActionsMenu } from './SpreadsheetActionsMenu'
import { AutoSaveIndicator } from '../../shared/components/AutoSaveIndicator'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { FileLock } from '../../shared/types/versioning'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import type { CursorParticipant } from '../hooks/useSpreadsheetCellSelection'
import translations from '../_i18n'

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
    currentVersion?: {
      version: number
      changeDescription?: string
    } | null
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
    lock: FileLock | null
    isLockedByMe: boolean
    acquireLock: () => void
    releaseLock: () => void
  }

  // Actions
  onShowPublishDialog: () => void
  onAddColumn: () => void
  onManageColumns: () => void
  onOpenAutomations: () => void
  onShare?: () => void
  onEdit?: () => void

  /** When provided and canEdit, the app name is editable (rename). Same pattern as document-apps. */
  onRename?: (newName: string) => void
  onExportToExcel?: () => void
  /** Refresh spreadsheet data from server (reload app) */
  onRefreshSpreadsheet?: () => void
  /** Whether cell data is being saved (PATCH in progress) - show prominent indicator */
  isCellDataSaving?: boolean

  /** Excel Collection: Show Submit button when viewing a collection copy */
  isCollectionCopy?: boolean
  onSubmitCollection?: () => Promise<void>
  /** ISO timestamp set when the recipient already submitted; shows "Submitted" label instead of button */
  collectionSubmittedAt?: string | null

  /** Excel Collection: Show Summarize with AI when manager view has completed submissions */
  showSummarizeButton?: boolean
  onSummarizeClick?: () => void
  isSummarizing?: boolean

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
  onOpenAutomations,
  onShare,
  onEdit,
  onRename,
  onExportToExcel,
  onRefreshSpreadsheet,
  isCellDataSaving = false,
  isCollectionCopy,
  onSubmitCollection,
  collectionSubmittedAt,
  showSummarizeButton = false,
  onSummarizeClick,
  isSummarizing = false,
  testId
}) {
  const { t } = useTranslation(translations)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const handleSubmitCollection = useCallback(async () => {
    if (!onSubmitCollection) return
    setIsSubmitting(true)
    try {
      await onSubmitCollection()
    } finally {
      setIsSubmitting(false)
    }
  }, [onSubmitCollection])

  const formattedSubmittedAt = collectionSubmittedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(
        new Date(collectionSubmittedAt)
      )
    : null
  const [localName, setLocalName] = useState(app.name)
  useEffect(() => {
    setLocalName(app.name)
  }, [app.name])

  const handleNameBlur = useCallback(() => {
    const trimmed = localName.trim()
    if (onRename && trimmed && trimmed !== app.name) {
      onRename(trimmed)
    } else if (!trimmed) {
      setLocalName(app.name)
    }
  }, [localName, app.name, onRename])

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      ;(e.target as HTMLInputElement).blur()
    }
  }, [])

  return (
    <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border/50">
      <div className="gba:flex gba:items-center gba:justify-between gba:min-w-0 gba:w-full">
        {/* Left: Breadcrumb Navigation */}
        <div className="gba:flex gba:items-center gba:gap-1 gba:min-w-0 gba:flex-1">
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
          <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0 gba:flex-1">
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
              {canEdit && onRename ? (
                <Input
                  value={localName}
                  onChange={e => setLocalName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyDown}
                  placeholder="Spreadsheet name"
                  className="gba:w-full gba:text-base gba:font-semibold gba:border-0 gba:px-0 gba:h-auto gba:bg-transparent focus-visible:gba:ring-0 focus-visible:gba:ring-offset-0 gba:rounded-none"
                  data-testid={`${testId}-name-input`}
                />
              ) : (
                <h1 className="gba:text-base gba:font-semibold gba:text-foreground gba:truncate">{app.name}</h1>
              )}
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
          {/* Cell data saving indicator - prominent when PATCH in progress */}
          {isCellDataSaving && (
            <Badge
              variant="secondary"
              className="gba:flex gba:items-center gba:gap-1.5 gba:animate-pulse"
              data-testid="spreadsheet-cell-saving-indicator"
            >
              <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin" />
              {t('status-saving')}
            </Badge>
          )}

          {/* Refresh spreadsheet data */}
          {onRefreshSpreadsheet && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onRefreshSpreadsheet}
                    disabled={versioning.isSaving}
                    className="gba:h-8 gba:px-2"
                    data-testid="spreadsheet-refresh-button"
                  >
                    <RefreshCw className="gba:w-4 gba:h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('action-refresh-sheet')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

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
                currentVersion={versioning.currentVersion ?? null}
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

              {/* Lock status (compact) */}
              {fileLock.lock?.isLocked && fileLock.isLockedByMe && (
                <Badge variant="default" className="gba:flex gba:items-center gba:gap-1">
                  <Lock className="gba:h-3 gba:w-3" />
                  {t('lock-status-locked')}
                </Badge>
              )}
              {fileLock.lock?.isLocked && !fileLock.isLockedByMe && (
                <Badge variant="muted" className="gba:flex gba:items-center gba:gap-1">
                  <Lock className="gba:h-3 gba:w-3" />
                  {t('lock-status-locked-by', {
                    name: fileLock.lock.lockedByName || t('lock-status-locked-by-unknown')
                  })}
                </Badge>
              )}

              {/* Status badge */}
              <StatusBadge status={publishingStatus || 'draft'} />
            </div>
          )}

          {/* Excel Collection: already submitted → show label; not yet submitted → show button */}
          {isCollectionCopy && collectionSubmittedAt && formattedSubmittedAt && (
            <Badge
              variant="success"
              className="gba:flex gba:items-center gba:gap-1.5"
              data-testid="spreadsheet-submitted-badge"
            >
              <CheckCircle2 className="gba:w-3.5 gba:h-3.5" />
              <span>
                {t('badge-submitted')} · {formattedSubmittedAt}
              </span>
            </Badge>
          )}
          {isCollectionCopy && !collectionSubmittedAt && onSubmitCollection && (
            <Button
              size="sm"
              onClick={handleSubmitCollection}
              disabled={isSubmitting}
              data-testid="spreadsheet-submit-collection"
            >
              <Send className="gba:w-4 gba:h-4 gba:mr-2" />
              {isSubmitting ? t('collection-submitting') : t('collection-submit')}
            </Button>
          )}

          {/* Summarize with AI (manager view - response sheet with completed submissions) */}
          {showSummarizeButton && !isCollectionCopy && (
            <AiButton
              size="sm"
              showIcon
              icon={isSummarizing ? <Spinner className="gba:w-4 gba:h-4" /> : <Sparkles className="gba:w-4 gba:h-4" />}
              iconPosition="before"
              onClick={onSummarizeClick}
              disabled={isSummarizing}
              data-testid="spreadsheet-summarize-ai"
            >
              {t('automation-toolbar-summarize')}
            </AiButton>
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
            onOpenAutomations={onOpenAutomations}
            onShare={onShare}
            onEdit={onEdit}
            allowExport={activeSheet.settings.allowExport}
            onExportToExcel={onExportToExcel}
            data-testid={`${testId}-actions-menu`}
          />
        </div>
      </div>
    </div>
  )
})
