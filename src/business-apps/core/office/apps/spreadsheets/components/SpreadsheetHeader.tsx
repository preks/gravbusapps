/**
 * SpreadsheetHeader Component
 *
 * Top navigation bar with breadcrumbs, status indicators, and actions.
 */

import React, { memo, useCallback, useState } from 'react'
import {
  Button,
  Badge,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
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
  Sparkles,
  Sigma,
  ClipboardCheck
} from 'lucide-react'
import { getIconByName } from '../utils/appIcons'
import { StatusIndicators } from './StatusIndicators'
import { SpreadsheetActionsMenu } from './SpreadsheetActionsMenu'
import { SpreadsheetSaveStatus } from './SpreadsheetSaveStatus'
import { StatusBadge } from '../../../../../platform/apps/shared/components/StatusBadge'
import type { SpreadsheetApp, SpreadsheetSheet } from '../types'
import type { PublishStatus } from '../../../../../platform/apps/shared/types/versioning'
import type { CursorParticipant } from '../hooks/useSpreadsheetCellSelection'

const VALID_PUBLISH_STATUSES = ['draft', 'in_review', 'published', 'archived'] as const

function getNormalizedPublishStatus(status: string): PublishStatus {
  return (
    VALID_PUBLISH_STATUSES.includes(status as (typeof VALID_PUBLISH_STATUSES)[number]) ? status : 'draft'
  ) as PublishStatus
}

function AppIcon({ app }: { app: SpreadsheetApp }) {
  const IconComponent = app.icon ? getIconByName(app.icon) : null
  if (IconComponent) {
    return <IconComponent className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
  }
  return <FileSpreadsheet className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
}

function BreadcrumbSection({ onBack, app }: { onBack?: () => void; app: SpreadsheetApp }) {
  return (
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
            <AppIcon app={app} />
          </div>
        </div>
        <div className="gba:min-w-0 gba:flex-1">
          <h1 className="gba:text-base gba:font-semibold gba:text-foreground gba:truncate">{app.name}</h1>
          {app.description && (
            <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[300px]">{app.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

function EditingToolbar({
  versioning,
  persistenceError,
  onShowCheckpointDialog,
  showComments,
  setShowComments,
  unresolvedCommentCount,
  onOpenAICapability,
  fileLock
}: {
  versioning: { isSaving: boolean; lastSaveTime: Date | null; hasUnsavedChanges: boolean }
  persistenceError?: string | null
  onShowCheckpointDialog: () => void
  showComments: boolean
  setShowComments: (show: boolean) => void
  unresolvedCommentCount: number
  onOpenAICapability: (capability: 'charts' | 'insights' | 'formula' | 'analyze' | 'review') => void
  fileLock: {
    lock: { isLocked: boolean; lockedByName?: string } | null
    isLockedByMe: boolean
  }
}) {
  const isLocked = fileLock.lock?.isLocked ?? false
  return (
    <div className="gba:flex gba:items-center gba:gap-1.5">
      <SpreadsheetSaveStatus
        isSaving={versioning.isSaving}
        lastSaveTime={versioning.lastSaveTime}
        hasUnsavedChanges={versioning.hasUnsavedChanges}
        onManualSave={onShowCheckpointDialog}
        persistenceError={persistenceError}
        data-testid="spreadsheet-save-status"
      />
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            title="AI Analytics"
            data-testid="spreadsheet-analytics-button"
            className="gba:h-8 gba:px-2 gba:gap-1 gba:bg-black gba:text-white gba:hover:bg-black/90 gba:hover:text-white"
          >
            <BarChart3 className="gba:w-4 gba:h-4" />
            AI Analytics
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="gba:min-w-[220px]">
          <DropdownMenuItem onClick={() => onOpenAICapability('charts')}>
            <BarChart3 className="gba:w-4 gba:h-4 gba:mr-2" />
            Generate charts
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenAICapability('formula')}>
            <Sigma className="gba:w-4 gba:h-4 gba:mr-2" />
            Generate a formula
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenAICapability('analyze')}>
            <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
            Analyze data
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenAICapability('review')}>
            <ClipboardCheck className="gba:w-4 gba:h-4 gba:mr-2" />
            Smart review
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onOpenAICapability('insights')}>
            <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
            AI insights
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {isLocked && (
        <Badge
          variant={fileLock.isLockedByMe ? 'default' : 'secondary'}
          className="gba:flex gba:items-center gba:gap-1"
        >
          <Lock className="gba:h-3 gba:w-3" />
          {fileLock.isLockedByMe ? 'Locked' : `Locked by ${fileLock.lock?.lockedByName || 'another user'}`}
        </Badge>
      )}
    </div>
  )
}

function CollectionStatusSection({
  isCollectionCopy,
  collectionSubmittedAt,
  formattedSubmittedAt,
  onSubmitCollection,
  isSubmittingCollection,
  handleSubmitCollection
}: {
  isCollectionCopy?: boolean
  collectionSubmittedAt?: string | null
  formattedSubmittedAt: string | null
  onSubmitCollection?: () => Promise<void>
  isSubmittingCollection: boolean
  handleSubmitCollection: () => void
}) {
  if (!isCollectionCopy) return null
  if (collectionSubmittedAt && formattedSubmittedAt) {
    return (
      <Badge
        variant="success"
        className="gba:flex gba:items-center gba:gap-1.5"
        data-testid="spreadsheet-submitted-badge"
      >
        <CheckCircle2 className="gba:w-3.5 gba:h-3.5" />
        <span>Submitted - {formattedSubmittedAt}</span>
      </Badge>
    )
  }
  if (!collectionSubmittedAt && onSubmitCollection) {
    return (
      <Button
        size="sm"
        onClick={() => {
          handleSubmitCollection().catch(() => undefined)
        }}
        disabled={isSubmittingCollection}
        data-testid="spreadsheet-submit-collection"
      >
        <Send className="gba:w-4 gba:h-4 gba:mr-2" />
        {isSubmittingCollection ? 'Submitting...' : 'Submit'}
      </Button>
    )
  }
  return null
}

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

  // Versioning + merged sheet persistence (cells / rows / snapshot)
  versioning: {
    isSaving: boolean
    lastSaveTime: Date | null
    hasUnsavedChanges: boolean
  }
  /** Last sheet persistence error message (inline status + warning ring) */
  persistenceError?: string | null
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
    lock: { isLocked: boolean; lockedByName?: string } | null
    isLockedByMe: boolean
    acquireLock: () => void
    releaseLock: () => void
  }

  // Actions
  onOpenAICapability: (capability: 'charts' | 'insights' | 'formula' | 'analyze' | 'review') => void
  onShare?: () => void
  onOpenAnalytics: () => void
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
  persistenceError,
  onShowCheckpointDialog,
  onShowVersionHistory,
  publishingStatus,
  showComments,
  setShowComments,
  unresolvedCommentCount,
  fileLock,
  onShare,
  onOpenAICapability,
  onOpenAnalytics,
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

  const normalizedPublishStatus = getNormalizedPublishStatus(publishingStatus)

  return (
    <div className="gba:px-4 gba:py-3 gba:border-b gba:border-border/50">
      <div className="gba:flex gba:items-center gba:justify-between gba:min-w-0 gba:w-full">
        <div className="gba:flex gba:items-center gba:gap-1 gba:min-w-0">
          <BreadcrumbSection onBack={onBack} app={app} />
        </div>

        <div className="gba:flex gba:items-center gba:gap-3 gba:flex-shrink-0">
          <StatusIndicators
            headerParticipants={headerParticipants}
            isCollaborationConnected={isCollaborationConnected}
            entityDataSource={activeSheet?.entityDataSource}
            onRefreshEntityData={onRefreshEntityData}
            isEntityDataLoading={isEntityDataLoading}
            data-testid={`${testId}-status-indicators`}
          />

          <div className="gba:h-6 gba:w-px gba:bg-border/50" />

          {!isCollectionCopy && normalizedPublishStatus !== 'draft' && <StatusBadge status={normalizedPublishStatus} />}

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

          {isEditing && (
            <EditingToolbar
              versioning={versioning}
              persistenceError={persistenceError}
              onShowCheckpointDialog={onShowCheckpointDialog}
              showComments={showComments}
              setShowComments={setShowComments}
              unresolvedCommentCount={unresolvedCommentCount}
              onOpenAICapability={onOpenAICapability}
              fileLock={fileLock}
            />
          )}

          <CollectionStatusSection
            isCollectionCopy={isCollectionCopy}
            collectionSubmittedAt={collectionSubmittedAt}
            formattedSubmittedAt={formattedSubmittedAt}
            onSubmitCollection={onSubmitCollection}
            isSubmittingCollection={isSubmittingCollection}
            handleSubmitCollection={handleSubmitCollection}
          />

          <div className="gba:h-6 gba:w-px gba:bg-border/50" />

          <SpreadsheetActionsMenu
            onShowVersionHistory={onShowVersionHistory}
            onShowCheckpointDialog={onShowCheckpointDialog}
            isLockedByMe={fileLock.isLockedByMe}
            onAcquireLock={fileLock.acquireLock}
            onReleaseLock={fileLock.releaseLock}
            canEdit={canEdit}
            onShare={onShare}
            onOpenAnalytics={onOpenAnalytics}
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
