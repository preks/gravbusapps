/**
 * Assembles {@link SpreadsheetViewerLayoutProps} from grouped viewer slices (navigation shell only).
 */

import { Badge, Button } from '@newwork/nw-design-system'
import type { SpreadsheetViewerLayoutProps } from '../components/SpreadsheetViewerLayout'
import { SPREADSHEET_TRACE_SCOPE_OPTIONS, type SpreadsheetTraceScope } from '../services/spreadsheetDiagnostics'
import type { UseSpreadsheetViewerControllerParams } from './spreadsheetViewerControllerTypes'

function formatSpreadsheetTraceScope(scope: SpreadsheetTraceScope): string {
  return SPREADSHEET_TRACE_SCOPE_OPTIONS.find(option => option.value === scope)?.label ?? scope
}

function buildLayoutProps(params: UseSpreadsheetViewerControllerParams): SpreadsheetViewerLayoutProps {
  const {
    testId,
    mainView,
    header,
    entityBar,
    emergencyFallback,
    sheetTabs,
    dialogs,
    diagnostics,
    sidePanels,
    collaborationHealth,
    debugBar
  } = params

  const headerProps: SpreadsheetViewerLayoutProps['headerProps'] = {
    app: header.app,
    activeSheet: header.activeSheet,
    onBack: header.onBack,
    onNavigateToSpreadsheetHub: header.onNavigateToSpreadsheetHub,
    isEditing: header.isEditing,
    canEdit: header.canEditWithLock,
    headerParticipants: header.headerParticipants,
    isCollaborationConnected: header.isCollaborationConnected,
    isEntityDataLoading: header.isEntityDataLoading,
    onRefreshEntityData: header.onRefreshEntityData,
    versioning: header.versioning,
    persistenceError: header.persistenceError,
    onShowCheckpointDialog: header.onShowCheckpointDialog,
    onShowVersionHistory: header.onShowVersionHistory,
    publishingStatus: header.publishingStatus,
    showComments: header.showComments,
    setShowComments: header.setShowComments,
    unresolvedCommentCount: header.unresolvedCommentCount,
    fileLock: header.fileLock,
    onShare: header.onShare,
    onManageShares: header.onManageShares,
    onRenameAppName: header.onRenameAppName,
    onOpenAICapability: header.onOpenAICapability,
    onOpenAnalytics: header.onOpenAnalytics,
    onOpenAutomations: header.onOpenAutomations,
    showCheckCollectionResponses: header.showCheckCollectionResponses,
    onCheckCollectionResponses: header.onCheckCollectionResponses,
    onEdit: header.onEdit,
    onExport: header.onExport,
    isCollectionCopy: header.isCollectionCopy,
    collectionSubmittedAt: header.collectionSubmittedAt,
    onSubmitCollection: header.onSubmitCollection,
    diagnosticsControl: header.showDiagnosticsButton ? (
      <div className="gba:flex gba:items-center gba:gap-2">
        {header.activeTraceSession ? (
          <Badge variant="warning">
            Active tracing: {formatSpreadsheetTraceScope(header.activeTraceSession.scope)}
          </Badge>
        ) : null}
        <Button
          size="sm"
          variant={header.activeTraceSession ? 'default' : 'ghost'}
          onClick={header.openDiagnosticsDialog}
          data-testid={`${testId}-diagnostics-button`}
        >
          Diagnostics
        </Button>
      </div>
    ) : undefined,
    testId
  }

  const entityStatusBarProps: SpreadsheetViewerLayoutProps['entityStatusBarProps'] = entityBar.enabled
    ? {
        isLoading: entityBar.isLoading,
        error: entityBar.error,
        dataCount: entityBar.dataCount,
        dataSourceName: entityBar.dataSourceName,
        onRefresh: entityBar.onRefresh,
        onEdit: entityBar.onEdit,
        'data-testid': `${testId}-entity-data-status-bar`
      }
    : null

  const sheetTabsProps: SpreadsheetViewerLayoutProps['sheetTabsProps'] = sheetTabs.preferUniverNativeSheetTabs
    ? null
    : {
        sheets: sheetTabs.sheets,
        activeSheetId: sheetTabs.activeSheetId,
        onSheetChange: sheetTabs.onSheetChange,
        entityDataLength: sheetTabs.entityDataLength,
        'data-testid': `${testId}-sheet-tabs`
      }

  const dialogsProps: SpreadsheetViewerLayoutProps['dialogsProps'] = {
    editingRow: dialogs.editingRow,
    setEditingRow: dialogs.setEditingRow,
    formFields: dialogs.formFields,
    handleUpdateRow: dialogs.handleUpdateRow,
    accessToken: dialogs.accessToken,
    isManageColumnsDialogOpen: dialogs.isManageColumnsDialogOpen,
    setIsManageColumnsDialogOpen: dialogs.setIsManageColumnsDialogOpen,
    columns: dialogs.columns,
    editingColumns: dialogs.editingColumns,
    setEditingColumns: dialogs.setEditingColumns,
    handleAddColumn: () => {
      if (!dialogs.canEditWithLock) return
      dialogs.handleAddColumn()
    },
    onSaveColumns: cols => {
      if (!dialogs.canEditWithLock) return
      dialogs.onSaveColumns(cols)
    },
    showVersionHistory: dialogs.showVersionHistory,
    setShowVersionHistory: dialogs.setShowVersionHistory,
    versionUserDisplayMap: dialogs.versionUserDisplayMap,
    versioning: dialogs.versioningForDialogs as SpreadsheetViewerLayoutProps['dialogsProps']['versioning'],
    handleRestoreVersion:
      dialogs.handleRestoreVersion as SpreadsheetViewerLayoutProps['dialogsProps']['handleRestoreVersion'],
    showCheckpointDialog: dialogs.showCheckpointDialog,
    setShowCheckpointDialog: dialogs.setShowCheckpointDialog,
    showPublishDialog: dialogs.showPublishDialog,
    setShowPublishDialog: dialogs.setShowPublishDialog,
    publishing: dialogs.publishing as SpreadsheetViewerLayoutProps['dialogsProps']['publishing'],
    showComments: dialogs.showComments,
    setShowComments: dialogs.setShowComments,
    getSelectedCellRef: dialogs.getSelectedCellRef,
    activeSheetId: dialogs.activeSheetId,
    comments: dialogs.comments as SpreadsheetViewerLayoutProps['dialogsProps']['comments'],
    currentUserId: dialogs.currentUserId,
    currentUserName: dialogs.currentUserName,
    currentUserAvatar: dialogs.currentUserAvatar,
    testId
  }

  const diagnosticsProps: SpreadsheetViewerLayoutProps['diagnosticsProps'] = {
    open: diagnostics.open,
    onOpenChange: diagnostics.onOpenChange,
    activeTraceSession: diagnostics.activeTraceSession,
    scope: diagnostics.scope,
    ttlMinutes: diagnostics.ttlMinutes,
    isStarting: diagnostics.isStarting,
    isStopping: diagnostics.isStopping,
    isRefreshing: diagnostics.isRefreshing,
    traceSessions: diagnostics.traceSessions,
    selectedTraceSessionId: diagnostics.selectedTraceSessionId,
    events: diagnostics.events,
    findings: diagnostics.findings,
    currentUserId: diagnostics.currentUserId,
    currentTabId: diagnostics.currentTabId ?? undefined,
    onScopeChange: diagnostics.onScopeChange,
    onTtlChange: diagnostics.onTtlChange,
    onStartTrace: diagnostics.onStartTrace,
    onStopTrace: diagnostics.onStopTrace,
    onRefresh: diagnostics.onRefresh,
    onClearDisplayedData: diagnostics.onClearDisplayedData,
    onSelectTraceSession: diagnostics.onSelectTraceSession,
    testId: `${testId}-diagnostics`
  }

  const sidePanelsProps: SpreadsheetViewerLayoutProps['sidePanelsProps'] = {
    isAutomationsOpen: sidePanels.isAutomationsOpen,
    isAnalyticsOpen: sidePanels.isAnalyticsOpen,
    isSheetsAIOpen: sidePanels.isSheetsAIOpen,
    closeAutomationsPanel: sidePanels.closeAutomationsPanel,
    closeAnalyticsPanel: sidePanels.closeAnalyticsPanel,
    closeSheetsAIPanel: sidePanels.closeSheetsAIPanel,
    analyticsInitialTab: sidePanels.analyticsInitialTab,
    sheetsAIInitialTab: sidePanels.sheetsAIInitialTab,
    columns: sidePanels.columns,
    sheetData: sidePanels.sheetData,
    sheetName: sidePanels.sheetName,
    activeSheetId: sidePanels.activeSheetId,
    appId: sidePanels.appId,
    accessToken: sidePanels.accessToken,
    canEditWithLock: sidePanels.canEditWithLock,
    viewType: sidePanels.viewType as SpreadsheetViewerLayoutProps['sidePanelsProps']['viewType'],
    entityEnabled: sidePanels.entityEnabled,
    getHeaderRowFromGrid: sidePanels.getHeaderRowFromGrid,
    getSheetDataFromGrid: sidePanels.getSheetDataFromGrid,
    handleInsertAnalyticsRows: sidePanels.handleInsertAnalyticsRows,
    handleApplyFormulaToColumn: sidePanels.handleApplyFormulaToColumn,
    handleCreateReviewComment: sidePanels.handleCreateReviewComment,
    onOpenCheckpointDialog: sidePanels.onOpenCheckpointDialog,
    testId,
    automations: sidePanels.automations,
    onCheckCollectionResponses: sidePanels.onCheckCollectionResponses,
    onBulkCollectionColumnLabelsUpdate: sidePanels.onBulkCollectionColumnLabelsUpdate
  }

  const collaborationHealthBannerProps: SpreadsheetViewerLayoutProps['collaborationHealthBannerProps'] = {
    testId,
    collaborationHealth: collaborationHealth.collaborationHealth
  }

  const debugStatusBarProps: SpreadsheetViewerLayoutProps['debugStatusBarProps'] = debugBar.enabled
    ? {
        testId,
        snapshotDebugInfo: debugBar.snapshotDebugInfo,
        snapshotConflicts: debugBar.snapshotSaveMetricsRef.current.conflicts,
        snapshotAttempts: debugBar.snapshotSaveMetricsRef.current.attempts,
        socketDebugInfo: debugBar.socketDebugInfo,
        collaborationHealth: debugBar.collaborationHealth,
        isPersistSaving: debugBar.isPersistSaving,
        hasLocalDirty: debugBar.hasLocalDirty,
        lastPersistedAt: debugBar.lastPersistedAt,
        persistError: debugBar.persistError,
        isVersionSaving: debugBar.isVersionSaving,
        hasUnsavedChanges: debugBar.hasUnsavedChanges,
        canEdit: debugBar.canEdit,
        participantCount: debugBar.participantCount
      }
    : null

  return {
    testId,
    headerProps,
    entityStatusBarProps,
    mainView,
    emergencyFallback,
    sheetTabsProps,
    dialogsProps,
    diagnosticsProps,
    sidePanelsProps,
    collaborationHealthBannerProps,
    debugStatusBarProps
  }
}

export function useSpreadsheetViewerController(params: UseSpreadsheetViewerControllerParams): {
  layoutProps: SpreadsheetViewerLayoutProps
} {
  return {
    layoutProps: buildLayoutProps(params)
  }
}
