/**
 * Input bundle for {@link useSpreadsheetViewerController}: grouped props used to assemble
 * {@link SpreadsheetViewerLayoutProps} without duplicating viewer business logic.
 */

import type React from 'react'
import type { CommentPanelProps } from '@/business-apps/platform/apps/shared/components/CommentPanel'
import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
import type { VersionUserDisplay } from '@/business-apps/platform/apps/shared/components/VersionHistory'
import type { SpreadsheetApp, SpreadsheetColumn, SpreadsheetSheet } from '../types'
import type { ViewType } from '../types'
import type { SpreadsheetHeaderProps } from '../components/SpreadsheetHeader'
import type { SpreadsheetCollaborationHealthBannerProps } from '../components/SpreadsheetCollaborationHealthBanner'
import type { SpreadsheetSidePanelsSectionProps } from '../components/SpreadsheetSidePanelsSection'
import type { SpreadsheetDebugStatusBarProps } from '../components/SpreadsheetDebugStatusBar'
import type { SpreadsheetTraceScope, SpreadsheetTraceSession } from '../services/spreadsheetDiagnostics'

/** Snapshot / socket counters surfaced on the debug bar (refs read at render time). */
export type SpreadsheetViewerSnapshotMetricsRef = React.MutableRefObject<{
  attempts: number
  conflicts: number
  failures: number
  fallbackLoads: number
}>

export interface SpreadsheetViewerControllerHeaderSlice {
  app: SpreadsheetApp
  activeSheet: SpreadsheetSheet
  onBack?: () => void
  onNavigateToSpreadsheetHub?: () => void
  isEditing: boolean
  canEditWithLock: boolean
  headerParticipants: SpreadsheetHeaderProps['headerParticipants']
  isCollaborationConnected: boolean
  isEntityDataLoading: boolean
  onRefreshEntityData: () => void
  versioning: SpreadsheetHeaderProps['versioning']
  persistenceError?: SpreadsheetHeaderProps['persistenceError']
  onShowCheckpointDialog: () => void
  onShowVersionHistory: () => void
  publishingStatus: string
  showComments: boolean
  onToggleComments: () => void
  unresolvedCommentCount: number
  fileLock: SpreadsheetHeaderProps['fileLock']
  onShare?: () => void
  onManageShares?: () => void
  onRenameAppName?: (name: string) => Promise<boolean> | boolean
  onOpenAICapability: (capability: 'charts' | 'insights' | 'formula' | 'analyze' | 'review') => void
  onOpenAnalytics: () => void
  onOpenAutomations: () => void
  showCheckCollectionResponses?: boolean
  onCheckCollectionResponses?: () => void | Promise<void>
  onEdit?: () => void
  onExport: () => void
  isCollectionCopy?: boolean
  collectionSubmittedAt?: string | null
  onSubmitCollection?: () => Promise<void>
  showDiagnosticsButton: boolean
  activeTraceSession: SpreadsheetTraceSession | null
  openDiagnosticsDialog: () => void
}

export interface SpreadsheetViewerControllerEntityBarSlice {
  enabled: boolean
  isLoading: boolean
  error: unknown
  dataCount: number
  dataSourceName?: string
  onRefresh: () => void
  onEdit?: () => void
}

export interface SpreadsheetViewerControllerSheetTabsSlice {
  preferUniverNativeSheetTabs: boolean
  sheets: SpreadsheetSheet[]
  activeSheetId: string
  onSheetChange: (sheetId: string) => void
  entityDataLength?: number
}

export interface SpreadsheetViewerControllerDialogsSlice {
  canEditWithLock: boolean
  editingRow: Record<string, unknown> | null
  setEditingRow: (row: Record<string, unknown> | null) => void
  formFields: DynamicFormField[]
  handleUpdateRow: (values: Record<string, unknown>) => void
  accessToken: string
  isManageColumnsDialogOpen: boolean
  setIsManageColumnsDialogOpen: (open: boolean) => void
  columns: SpreadsheetColumn[]
  editingColumns: SpreadsheetColumn[]
  setEditingColumns: React.Dispatch<React.SetStateAction<SpreadsheetColumn[]>>
  handleAddColumn: () => void
  onSaveColumns: (columns: SpreadsheetColumn[]) => void
  showVersionHistory: boolean
  setShowVersionHistory: (show: boolean) => void
  versionUserDisplayMap?: Record<string, VersionUserDisplay>
  versioningForDialogs: {
    versions: unknown[]
    isLoading: boolean
    currentVersion?: { version: number }
    isSaving: boolean
    createCheckpoint: (description: string) => Promise<unknown>
  }
  handleRestoreVersion: (versionNumber: number) => Promise<boolean>
  showCheckpointDialog: boolean
  setShowCheckpointDialog: (show: boolean) => void
  showPublishDialog: boolean
  setShowPublishDialog: (show: boolean) => void
  publishing: {
    isPublishing: boolean
    publish: (notes: string, createCheckpoint: boolean) => Promise<unknown>
  }
  showComments: boolean
  setShowComments: (show: boolean) => void
  commentPanel: Pick<
    CommentPanelProps,
    | 'comments'
    | 'unresolvedCount'
    | 'isLoading'
    | 'onCreateComment'
    | 'onUpdateComment'
    | 'onResolveComment'
    | 'onUnresolveComment'
    | 'onDeleteComment'
    | 'onScrollToHighlight'
    | 'onUnhighlight'
  >
  currentUserId?: string | null
  currentUserName: string
  currentUserAvatar?: string | null
}

export interface SpreadsheetViewerControllerDiagnosticsSlice {
  open: boolean
  onOpenChange: (open: boolean) => void
  activeTraceSession: SpreadsheetTraceSession | null
  scope: SpreadsheetTraceScope
  ttlMinutes: number
  isStarting: boolean
  isStopping: boolean
  isRefreshing: boolean
  traceSessions: SpreadsheetTraceSession[]
  selectedTraceSessionId?: string | null
  events: import('../services/spreadsheetDiagnostics').SpreadsheetTraceEvent[]
  findings: import('../services/spreadsheetDiagnostics').SpreadsheetTraceFinding[]
  currentUserId?: string | null
  currentTabId: string | null
  onScopeChange: (scope: SpreadsheetTraceScope) => void
  onTtlChange: (ttlMinutes: number) => void
  onStartTrace: () => void
  onStopTrace: () => void
  onRefresh: () => void
  onClearDisplayedData: () => void
  onSelectTraceSession: (traceSessionId: string) => void
}

export interface SpreadsheetViewerControllerSidePanelsSlice {
  isAutomationsOpen: boolean
  isAnalyticsOpen: boolean
  isSheetsAIOpen: boolean
  closeAutomationsPanel: () => void
  closeAnalyticsPanel: () => void
  closeSheetsAIPanel: () => void
  analyticsInitialTab: SpreadsheetSidePanelsSectionProps['analyticsInitialTab']
  sheetsAIInitialTab: SpreadsheetSidePanelsSectionProps['sheetsAIInitialTab']
  columns: SpreadsheetColumn[]
  sheetData: Record<string, unknown>[]
  sheetName: string
  activeSheetId: string
  appId: string
  accessToken: string
  canEditWithLock: boolean
  viewType: ViewType | string
  entityEnabled: boolean
  getHeaderRowFromGrid?: SpreadsheetSidePanelsSectionProps['getHeaderRowFromGrid']
  getSheetDataFromGrid?: SpreadsheetSidePanelsSectionProps['getSheetDataFromGrid']
  handleInsertAnalyticsRows: SpreadsheetSidePanelsSectionProps['handleInsertAnalyticsRows']
  handleApplyFormulaToColumn: SpreadsheetSidePanelsSectionProps['handleApplyFormulaToColumn']
  handleCreateReviewComment: SpreadsheetSidePanelsSectionProps['handleCreateReviewComment']
  onOpenCheckpointDialog: () => void
  automations: SpreadsheetSidePanelsSectionProps['automations']
  onCheckCollectionResponses: SpreadsheetSidePanelsSectionProps['onCheckCollectionResponses']
  onBulkCollectionColumnLabelsUpdate: SpreadsheetSidePanelsSectionProps['onBulkCollectionColumnLabelsUpdate']
}

export interface SpreadsheetViewerControllerDebugBarSlice {
  enabled: boolean
  snapshotDebugInfo: SpreadsheetDebugStatusBarProps['snapshotDebugInfo']
  snapshotSaveMetricsRef: SpreadsheetViewerSnapshotMetricsRef
  socketDebugInfo: SpreadsheetDebugStatusBarProps['socketDebugInfo']
  collaborationHealth: SpreadsheetDebugStatusBarProps['collaborationHealth']
  isPersistSaving: boolean
  hasLocalDirty: boolean
  lastPersistedAt: Date | null
  persistError: string | null
  isVersionSaving: boolean
  hasUnsavedChanges: boolean
  canEdit: boolean
  participantCount: number
}

export interface UseSpreadsheetViewerControllerParams {
  testId: string
  mainView: React.ReactNode
  header: SpreadsheetViewerControllerHeaderSlice
  entityBar: SpreadsheetViewerControllerEntityBarSlice
  emergencyFallback: {
    show: boolean
    columns: SpreadsheetColumn[]
    sheetData: Record<string, unknown>[]
  }
  sheetTabs: SpreadsheetViewerControllerSheetTabsSlice
  dialogs: SpreadsheetViewerControllerDialogsSlice
  diagnostics: SpreadsheetViewerControllerDiagnosticsSlice
  sidePanels: SpreadsheetViewerControllerSidePanelsSlice
  collaborationHealth: Pick<SpreadsheetCollaborationHealthBannerProps, 'collaborationHealth'>
  debugBar: SpreadsheetViewerControllerDebugBarSlice
}
