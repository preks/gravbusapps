/**
 * SpreadsheetHeader Component
 *
 * Top navigation bar with breadcrumbs, status indicators, and actions.
 * When canEdit and onRename are provided, the app name is editable (like document-apps title).
 */

import React, { memo, useState, useEffect, useCallback } from 'react'
import { Button, Badge, Input } from '@newwork/nw-design-system'
import { ChevronRight, Eye, Home, FileSpreadsheet, MessageSquare, Lock } from 'lucide-react'
import { getIconByName } from '../utils/appIcons'
import { StatusIndicators } from './StatusIndicators'
import { SpreadsheetActionsMenu } from './SpreadsheetActionsMenu'
import { AutoSaveIndicator } from '../../shared/components/AutoSaveIndicator'
import { StatusBadge } from '../../shared/components/StatusBadge'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
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
  onOpenAutomations: () => void
  onEdit?: () => void

  /** When provided and canEdit, the app name is editable (rename). Same pattern as document-apps. */
  onRename?: (newName: string) => void

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
  onEdit,
  onRename,
  testId
}) {
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

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        ;(e.target as HTMLInputElement).blur()
      }
    },
    []
  )

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
              {canEdit && onRename ? (
                <Input
                  value={localName}
                  onChange={e => setLocalName(e.target.value)}
                  onBlur={handleNameBlur}
                  onKeyDown={handleNameKeyDown}
                  placeholder="Spreadsheet name"
                  className="gba:text-base gba:font-semibold gba:border-0 gba:px-0 gba:h-auto gba:bg-transparent focus-visible:gba:ring-0 focus-visible:gba:ring-offset-0 gba:rounded-none"
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
                  Locked
                </Badge>
              )}

              {/* Status badge */}
              <StatusBadge status={publishingStatus || 'draft'} />
            </div>
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
            onEdit={onEdit}
            allowExport={activeSheet.settings.allowExport}
            data-testid={`${testId}-actions-menu`}
          />
        </div>
      </div>
    </div>
  )
})
