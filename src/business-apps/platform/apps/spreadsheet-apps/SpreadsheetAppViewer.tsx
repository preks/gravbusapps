/**
 * SpreadsheetAppViewer
 *
 * Runtime viewer for a generated spreadsheet app.
 * Standardized on the top-level `components/`, `hooks/`, `views/` structure (no `viewer/` directory).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_ID, GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'

import type { SpreadsheetAppViewerProps, SpreadsheetColumn, SpreadsheetSheet } from './types'
import { columnToFormField } from './types'
import { SpreadsheetApiService } from './services/SpreadsheetApiService'
import { exportSheetToExcel } from './utils/exportUtils'

import { useSpreadsheetViewerState } from './hooks/useSpreadsheetViewerState'
import { useSpreadsheetViewerCollaboration } from './hooks/useSpreadsheetViewerCollaboration'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { useSpreadsheetBulkRows } from './hooks/useSpreadsheetBulkRows'
import { useSpreadsheetColumns } from './hooks/useSpreadsheetColumns'
import { useExcelCollectionSummary } from './hooks/useExcelCollectionSummary'
import { extractCopyAppIdsFromRows } from './utils/collectionSummaryUtils'

import { useVersioning } from '../shared/hooks/useVersioning'
import { useComments } from '../shared/hooks/useComments'
import { useFileLock } from '../shared/hooks/useFileLock'
import { usePublishing } from '../shared/hooks/usePublishing'
import { emitDocumentActivity, emitDocumentActivityEnd } from '../spaces/hooks/useSpaceDocumentActivity'

import type { FortuneSheetGridHandle } from './components/FortuneSheetGrid'
import { TableView, FormView, DashboardView, KanbanView } from './views'
import { AutomationsPanel } from './components/AutomationsPanel'
import { CollectionSummaryDialog } from './components/automations/CollectionSummaryDialog'
import { EntityDataStatusBar } from './components/EntityDataStatusBar'
import { SpreadsheetDialogsSection } from './components/SpreadsheetDialogsSection'
import { SpreadsheetHeader } from './components/SpreadsheetHeader'
import { SpreadsheetSheetTabs } from './components/SpreadsheetSheetTabs'

export const SpreadsheetAppViewer: React.FC<SpreadsheetAppViewerProps> = ({
  app,
  activeSheetId: initialSheetId,
  activeViewId: initialViewId,
  onDataChange,
  onRowAdd,
  onRowUpdate,
  onAppUpdate,
  onAppRefreshNeeded,
  onSheetUpdate,
  onBack,
  onShare,
  onEdit,
  isEditing = true,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  const normalizeCellPersistValue = (rawValue: unknown): unknown => {
    if (rawValue === null || rawValue === undefined) return rawValue
    if (typeof rawValue === 'string' || typeof rawValue === 'number' || typeof rawValue === 'boolean') {
      return rawValue
    }
    if (!rawValue || typeof rawValue !== 'object' || Array.isArray(rawValue)) return ''

    const cellObject = rawValue as Record<string, unknown>
    const hasFormattingMetadata = ['bg', 'fc', 'bl', 'it', 'vt', 'ht', 'tb', 'ff', 'fs', 'cl', 'ul', 'strike'].some(
      key => key in cellObject
    )

    if ('f' in cellObject) {
      // Keep formula objects intact for calculated cells.
      return rawValue
    }

    if (hasFormattingMetadata && ('v' in cellObject || 'm' in cellObject)) {
      // Keep styled FortuneSheet cell objects intact (e.g. background color).
      return rawValue
    }

    if ('m' in cellObject && typeof cellObject.m === 'string' && cellObject.m.trim().length > 0) {
      return cellObject.m
    }

    if (
      'v' in cellObject &&
      (typeof cellObject.v === 'string' || typeof cellObject.v === 'number' || typeof cellObject.v === 'boolean')
    ) {
      return cellObject.v
    }

    if (cellObject.v === null || cellObject.v === undefined) {
      return ''
    }

    return ''
  }

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const cellChangeBatchTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Accumulate per-row cell changes so a multi-cell paste sends ONE backend PATCH
  const pendingCellUpdates = useRef<Map<string, { backendRowId: string; changes: Record<string, unknown> }>>(new Map())
  // Track in-flight PATCH data so beforeunload can re-send with keepalive if page unloads mid-flight
  const inFlightCellUpdates = useRef<Map<string, { backendRowId: string; changes: Record<string, unknown> }>>(new Map())
  const cellPersistTimerRef = useRef<NodeJS.Timeout | null>(null)
  const gridRef = useRef<FortuneSheetGridHandle | null>(null)
  const [restoreSyncToken, setRestoreSyncToken] = useState(0)
  const [isCellDataSaving, setIsCellDataSaving] = useState(false)
  const [pendingRestoreSyncFromAppRef, setPendingRestoreSyncFromAppRef] = useState<SpreadsheetApp | null>(null)

  // --- Viewer State (sheet/view + local sheet data) ---
  const {
    activeSheetId,
    setActiveSheetId,
    activeSheet,
    activeView,
    localSheetData,
    setLocalSheetData,
    localSheetDataRef
  } = useSpreadsheetViewerState({
    app,
    initialSheetId,
    initialViewId: initialViewId ?? null,
    forceSyncToken: restoreSyncToken
  })

  // --- Entity data source (optional per-sheet) ---
  const {
    state: entityState,
    loadData: loadEntityData,
    refresh: refreshEntityData
  } = useEntityDataSource({ accessToken, userId })
  const entityEnabled = Boolean(activeSheet.entityDataSource?.enabled)

  useEffect(() => {
    if (!entityEnabled || !activeSheet.entityDataSource) return
    void loadEntityData(activeSheet.entityDataSource)
  }, [activeSheetId, entityEnabled, activeSheet.entityDataSource, loadEntityData])

  const sheetData: Record<string, unknown>[] = useMemo(() => {
    if (!entityEnabled) return localSheetData
    return entityState.data?.records ?? []
  }, [entityEnabled, entityState.data?.records, localSheetData])

  const entityDataCount = entityEnabled ? (entityState.data?.count ?? 0) : localSheetData.length

  // --- Versioning / Comments / Lock / Publishing ---
  const versioning = useVersioning({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService,
    autoSaveEnabled: true,
    autoSaveInterval: 30000
  })
  const graphqlClient = useGraphQLClient(accessToken)
  const [versionUserDisplayMap, setVersionUserDisplayMap] = useState<
    Record<string, { displayName: string; avatarUrl?: string }>
  >({})

  const versionCreatorIds = useMemo(
    () => [...new Set(versioning.versions.map(v => v.createdBy).filter((id): id is string => Boolean(id)))],
    [versioning.versions]
  )

  useEffect(() => {
    let isCancelled = false

    const loadVersionUserDisplayMap = async () => {
      if (!accessToken || versionCreatorIds.length === 0) {
        if (!isCancelled) setVersionUserDisplayMap({})
        return
      }

      try {
        const employeeResults = await Promise.all(
          versionCreatorIds.map(async creatorId => {
            const byUserIdQuery = GET_EMPLOYEE_LIGHT_BY_USER_ID(creatorId)
            const byUserIdResult = await graphqlClient.request<{
              Employee: Array<{
                id: string
                userId: string
                displayName?: string | null
                firstName?: string | null
                lastName?: string | null
                userName?: string | null
                pictureThumbnail?: string | null
              }>
            }>(byUserIdQuery)
            if (byUserIdResult.Employee?.[0]) return byUserIdResult.Employee[0]

            const byEmployeeIdQuery = GET_EMPLOYEE_LIGHT_BY_ID(creatorId)
            const byEmployeeIdResult = await graphqlClient.request<{
              Employee: Array<{
                id: string
                userId: string
                displayName?: string | null
                firstName?: string | null
                lastName?: string | null
                userName?: string | null
                pictureThumbnail?: string | null
              }>
            }>(byEmployeeIdQuery)
            return byEmployeeIdResult.Employee?.[0] ?? null
          })
        )

        const nextMap: Record<string, { displayName: string; avatarUrl?: string }> = {}
        employeeResults.filter(Boolean).forEach(emp => {
          const employee = emp as {
            id: string
            userId: string
            displayName?: string | null
            firstName?: string | null
            lastName?: string | null
            userName?: string | null
            pictureThumbnail?: string | null
          }
          const fullName = `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
          const displayName =
            employee.displayName || fullName || employee.userName || employee.userId || employee.id || 'Unknown'
          const avatarUrl = employee.pictureThumbnail
            ? employee.pictureThumbnail.startsWith('data:')
              ? employee.pictureThumbnail
              : `data:image/png;base64,${employee.pictureThumbnail}`
            : undefined

          if (employee.userId) nextMap[employee.userId] = { displayName, avatarUrl }
          if (employee.id) nextMap[employee.id] = { displayName, avatarUrl }
        })

        if (!isCancelled) setVersionUserDisplayMap(nextMap)
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to enrich version user display map:', error)
      }
    }

    void loadVersionUserDisplayMap()
    return () => {
      isCancelled = true
    }
  }, [accessToken, graphqlClient, versionCreatorIds])

  const comments = useComments({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService
  })

  const handleScrollToHighlight = useCallback(
    (commentId: string) => {
      const comment = (comments.comments as Array<{ id: string; cellReference?: string }>).find(c => c.id === commentId)
      if (!comment?.cellReference || !gridRef.current) return
      gridRef.current.scrollToCellRef(comment.cellReference)
    },
    [comments.comments]
  )

  const fileLock = useFileLock({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    currentUserId: userId,
    apiService: SpreadsheetApiService
  })

  const publishing = usePublishing({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    currentStatus: app.publishMetadata?.status || 'draft',
    apiService: SpreadsheetApiService
  })

  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showComments, setShowComments] = useState(false)

  // --- Bulk row handlers (used by automation responses) ---
  const bulkRows = useSpreadsheetBulkRows({
    app,
    activeSheet: activeSheet ?? null,
    localSheetDataRef,
    setLocalSheetData,
    onDataChange,
    onAppUpdate,
    onSheetUpdate,
    onRowUpdate,
    onRowAdd,
    saveTimeoutRef
  })

  // Persist automations/workflow links back into the sheet config
  const persistSheetPatch = useCallback(
    (patch: Partial<SpreadsheetSheet>) => {
      if (onSheetUpdate) {
        void onSheetUpdate(app.id, activeSheetId, patch)
        return
      }
      if (!onAppUpdate) return
      const updatedSheets = app.sheets.map(sheet =>
        sheet.id === activeSheetId ? { ...sheet, ...patch, data: localSheetDataRef.current } : sheet
      )
      onAppUpdate({ ...app, sheets: updatedSheets })
    },
    [app, activeSheetId, localSheetDataRef, onAppUpdate, onSheetUpdate]
  )

  const automations = useSpreadsheetAutomations({
    spreadsheetId: app.id,
    sheetId: activeSheetId,
    accessToken,
    currentUserId: userId || '',
    initialAutomations: activeSheet.automations || [],
    initialWorkflowLinks: activeSheet.workflowLinks || [],
    onAutomationsChange: newAutomations => persistSheetPatch({ automations: newAutomations }),
    onWorkflowLinksChange: newLinks => persistSheetPatch({ workflowLinks: newLinks }),
    onAddRows: bulkRows.handleAddRows,
    onUpdateRows: bulkRows.handleUpdateRows,
    enablePolling: true,
    pollInterval: 10000
  })

  const [hasTaskForCollectionCopy, setHasTaskForCollectionCopy] = useState(false)
  const fromCollectionLink =
    globalThis.window !== undefined &&
    new URLSearchParams(globalThis.window.location.search).get('excel_collection') === '1'
  const isCollectionCopy = Boolean(
    app.settings?.excel_collection_copy || hasTaskForCollectionCopy || fromCollectionLink
  )
  const isCopyOwner = Boolean(userId && app.createdBy && app.createdBy === userId)
  // Show submit only to the intended responder (copy owner) or users with an active collection task.
  // Managers opening shared response copies from run history should not see submit.
  const canSubmitCollection = Boolean((app.settings?.excel_collection_copy && isCopyOwner) || hasTaskForCollectionCopy)
  // ISO timestamp set on successful submission — drives "Submitted" label in the header
  const collectionSubmittedAt = app.settings?.excel_collection_submitted_at ?? null

  useEffect(() => {
    if (app.settings?.excel_collection_copy || !userId || !app.id || !automations.hasExcelCollectionTaskForApp) return
    let isUnmounted = false
    const runCheck = () =>
      void automations.hasExcelCollectionTaskForApp(app.id).then(has => {
        if (!isUnmounted && has) setHasTaskForCollectionCopy(true)
      })
    runCheck()
    const retryTimer = globalThis.window.setTimeout(() => {
      runCheck()
    }, 1500) // Retry in case flow engine wasn't ready
    return () => {
      isUnmounted = true
      globalThis.window.clearTimeout(retryTimer)
    }
  }, [app.id, app.settings?.excel_collection_copy, userId, automations.hasExcelCollectionTaskForApp])

  const handleSubmitCollection = useCallback(async () => {
    if (!userId || !automations.completeExcelCollectionTask) return
    const result = await automations.completeExcelCollectionTask(app.id)
    if (result.success) {
      const submittedAt = new Date().toISOString()
      // Persist the submission timestamp so returning to this sheet shows "Submitted" label
      try {
        await SpreadsheetApiService.updateApp(app.id, {
          settings: { ...app.settings, excel_collection_submitted_at: submittedAt }
        })
        if (onAppUpdate) {
          onAppUpdate({ ...app, settings: { ...app.settings, excel_collection_submitted_at: submittedAt } })
        }
      } catch {
        // Non-critical — submission succeeded; timestamp persistence failure is acceptable
      }
      toast.success('Submitted successfully. Your task is now complete.')
      if (onBack) onBack()
    } else {
      toast.error(result.error || 'Failed to submit')
    }
  }, [app, userId, automations.completeExcelCollectionTask, onBack, onAppUpdate])

  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false)
  const [showCollectionSummaryDialog, setShowCollectionSummaryDialog] = useState(false)

  const collectionSummary = useExcelCollectionSummary({
    accessToken,
    sheetData,
    columns: activeSheet.columns
  })

  const hasExcelCollectionWithEligibleRows = useMemo(() => {
    // Drive visibility from persisted tracking data in the sheet.
    // After refresh, automation config may not always be present in local sheet metadata,
    // but completed rows with _copy_link/_workflow_status are still the source of truth.
    return collectionSummary.hasEligibleRows
  }, [collectionSummary.hasEligibleRows])

  const handleSummarizeClick = useCallback(async () => {
    setShowCollectionSummaryDialog(true)
    const result = await collectionSummary.summarize()
    if (!result.success) {
      toast.error(result.error)
    }
  }, [collectionSummary])

  const handleAddSummaryToSheet = useCallback(async () => {
    if (!collectionSummary.summary) return
    const { executiveSummary, perRecipient } = collectionSummary.summary
    console.log('[AddSummary][trace] start', {
      appId: app.id,
      activeSheetId,
      executiveSummaryLength: executiveSummary?.length ?? 0,
      perRecipientCount: perRecipient.length
    })
    const copyInfos = extractCopyAppIdsFromRows(sheetData, activeSheet.columns)
    const summaryByRecipient = new Map(perRecipient.map(p => [p.recipientName, p.summary]))

    if (perRecipient.length > 0) {
      const aiSummaryCol = activeSheet.columns.find(c => c.name === '_ai_summary')
      if (!aiSummaryCol) {
        const newCol: SpreadsheetColumn = {
          id: '_ai_summary',
          name: '_ai_summary',
          label: 'AI Summary',
          type: 'text',
          isVisible: true,
          isEditable: false,
          isRequired: false,
          isUnique: false,
          order: activeSheet.columns.length,
          width: 200
        }
        const updatedColumns = [...activeSheet.columns, newCol]
        await SpreadsheetApiService.updateSheet(app.id, activeSheetId, { columns: updatedColumns })
        if (onSheetUpdate) {
          await onSheetUpdate(app.id, activeSheetId, { columns: updatedColumns })
        } else if (onAppUpdate) {
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === activeSheetId ? { ...sheet, columns: updatedColumns } : sheet
          )
          onAppUpdate({ ...app, sheets: updatedSheets })
        }
      }

      const nextSheetData = [...sheetData]
      for (const { recipientName, rowIndex } of copyInfos) {
        const summary = summaryByRecipient.get(recipientName)
        if (!summary) continue
        const row = sheetData[rowIndex]
        if (!row) continue
        const rowId = String(row._rowUuid ?? row._id ?? row.id ?? '')
        if (!rowId) continue
        try {
          if (onRowUpdate) {
            await onRowUpdate(app.id, activeSheetId, rowId, { _ai_summary: summary })
          } else {
            await SpreadsheetApiService.updateRow(app.id, activeSheetId, rowId, { _ai_summary: summary })
          }
          console.log('[AddSummary][trace] recipientSummaryPersisted', {
            rowId,
            recipientName,
            summaryLength: summary.length
          })
        } catch (err) {
          console.error('[AddSummary] Failed to update row:', rowId, err)
        }
        const r = nextSheetData[rowIndex]
        if (r) nextSheetData[rowIndex] = { ...r, _ai_summary: summary }
      }
      localSheetDataRef.current = nextSheetData
      setLocalSheetData(nextSheetData)
      onDataChange?.(activeSheetId, nextSheetData)
    }

    // Add executive summary as a dedicated row in the SAME sheet (1 row for executive summary)
    if (executiveSummary) {
      try {
        let columns = activeSheet.columns
        const execSummaryCol = columns.find(c => c.name === '_ai_summary')
        if (!execSummaryCol) {
          const newCol: SpreadsheetColumn = {
            id: '_ai_summary',
            name: '_ai_summary',
            label: 'AI Summary',
            type: 'text',
            isVisible: true,
            isEditable: false,
            isRequired: false,
            isUnique: false,
            order: columns.length,
            width: 200
          }
          columns = [...columns, newCol]
          await SpreadsheetApiService.updateSheet(app.id, activeSheetId, { columns })
          if (onSheetUpdate) await onSheetUpdate(app.id, activeSheetId, { columns })
          else if (onAppUpdate) {
            const updatedSheets = app.sheets.map(sheet => (sheet.id === activeSheetId ? { ...sheet, columns } : sheet))
            onAppUpdate({ ...app, sheets: updatedSheets })
          }
        }

        const execSummaryColName = '_ai_summary'
        const existingExecSummaryRow = sheetData.find(
          (r): r is Record<string, unknown> => r._is_executive_summary === true
        )

        const execSummaryPayload: Record<string, unknown> = {
          [execSummaryColName]: executiveSummary,
          _recipient_name: 'Executive Summary',
          _is_executive_summary: true
        }

        if (existingExecSummaryRow) {
          const rowId = String(
            existingExecSummaryRow._rowUuid ?? existingExecSummaryRow._id ?? existingExecSummaryRow.id ?? ''
          )
          if (rowId && !rowId.startsWith('tmp_')) {
            await SpreadsheetApiService.updateRow(app.id, activeSheetId, rowId, execSummaryPayload)
          }
          const idx = sheetData.findIndex(r => (r as Record<string, unknown>)._is_executive_summary === true)
          if (idx >= 0) {
            const next = [...sheetData]
            next[idx] = { ...next[idx], ...execSummaryPayload }
            localSheetDataRef.current = next
            setLocalSheetData(next)
            onDataChange?.(activeSheetId, next)
          }
        } else {
          const added = await SpreadsheetApiService.addRow(app.id, activeSheetId, execSummaryPayload)
          const newRow: Record<string, unknown> = {
            ...execSummaryPayload,
            _id: (added as Record<string, unknown>)?._id ?? (added as Record<string, unknown>)?.id,
            _rowUuid: (added as Record<string, unknown>)?._rowUuid
          }
          const next = [newRow, ...sheetData]
          localSheetDataRef.current = next
          setLocalSheetData(next)
          onDataChange?.(activeSheetId, next)
        }

        toast.success(
          perRecipient.length > 0
            ? `AI Summary added: ${perRecipient.length} summaries + executive summary row`
            : 'Executive summary row added'
        )
      } catch (err) {
        console.error('[AddSummary] Failed to add executive summary row:', err)
        toast.error('Failed to add executive summary row')
      }
    }
  }, [
    collectionSummary.summary,
    sheetData,
    activeSheet.columns,
    activeSheetId,
    app,
    localSheetDataRef,
    onSheetUpdate,
    onAppUpdate,
    onAppRefreshNeeded,
    onRowUpdate,
    onDataChange,
    setLocalSheetData,
    setActiveSheetId
  ])
  const [remoteUpdateKey, setRemoteUpdateKey] = useState(0)
  // Queue of received operations - prevents dropping ops when multiple arrive rapidly
  const receivedOpsQueueRef = useRef<any[]>([])
  const [processOpsTrigger, setProcessOpsTrigger] = useState(0)

  // --- Collaboration (header presence + FortuneSheet operations/cursors) ---
  const handleCollaborationOperation = useCallback((op: any) => {
    if (op?.operation) {
      receivedOpsQueueRef.current.push(op.operation)
      setProcessOpsTrigger(t => t + 1)
    }
  }, [])

  const collaboration = useSpreadsheetViewerCollaboration({
    appId: app.id,
    accessToken,
    onOperationReceived: handleCollaborationOperation
  })

  // Broadcast document activity to Spaces app
  useEffect(() => {
    if (!app.id || !userId) return

    const activityType = isEditing ? 'editing' : 'viewing'
    const docTitle = app.name || 'Untitled Spreadsheet'
    const urlSpaceId =
      globalThis.window !== undefined ? new URLSearchParams(globalThis.window.location.search).get('spaceId') : null

    // Emit activity when starting
    emitDocumentActivity({
      userId,
      userName: collaboration.currentUserName || 'User',
      userAvatar: collaboration.currentUserAvatar,
      documentId: app.id,
      documentTitle: docTitle,
      documentType: 'spreadsheet',
      activityType,
      spaceId: urlSpaceId || undefined
    })

    // Keep-alive: re-emit activity every 30 seconds
    const keepAliveInterval = setInterval(() => {
      emitDocumentActivity({
        userId,
        userName: collaboration.currentUserName || 'User',
        userAvatar: collaboration.currentUserAvatar,
        documentId: app.id,
        documentTitle: docTitle,
        documentType: 'spreadsheet',
        activityType,
        spaceId: urlSpaceId || undefined
      })
    }, 30000)

    // Cleanup: emit activity end when leaving
    return () => {
      clearInterval(keepAliveInterval)
      emitDocumentActivityEnd(userId, app.id)
    }
  }, [app.id, app.name, userId, collaboration.currentUserName, collaboration.currentUserAvatar, isEditing])

  // --- Column handling (includes auto-add for FortuneSheet) ---
  const handleCellChangeRef = useRef<
    (rowId: string, columnName: string, value: unknown, options?: { fromRemote?: boolean }) => void
  >(() => {})

  const columnsState = useSpreadsheetColumns({
    app,
    activeSheet,
    localSheetDataRef,
    setLocalSheetData,
    handleCellChangeRef,
    onAppUpdate,
    onSheetUpdate,
    isCollaborationConnected: collaboration.isCollaborationConnected,
    emitOperation: op => collaboration.emitOperation(op as any)
  })

  // --- Row edit dialog state + handlers ---
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null)

  const handleCellChange = useCallback(
    async (rowId: string, columnName: string, value: unknown, options?: { fromRemote?: boolean }) => {
      if (entityEnabled) return
      const normalizedValue = normalizeCellPersistValue(value)

      const current = localSheetDataRef.current
      const idx = current.findIndex(r => String(r._id ?? r._rowUuid ?? r.id ?? '') === String(rowId))
      // #region agent log
      const rawLen =
        typeof value === 'string'
          ? value.length
          : value && typeof value === 'object' && 'm' in (value as object)
            ? String((value as { m: unknown }).m).length
            : 0
      const normLen = typeof normalizedValue === 'string' ? normalizedValue.length : 0
      fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'long-paste-debug',
          hypothesisId: idx < 0 ? 'H2' : rawLen > 500 || normLen > 500 ? 'H4' : 'H2',
          location: 'SpreadsheetAppViewer.tsx:handleCellChange:rowLookup',
          message: idx < 0 ? 'Row not found - update dropped' : 'Viewer row lookup',
          data: {
            rowId,
            columnName,
            idx,
            currentRows: current.length,
            rawValueLen: rawLen,
            normalizedLen: normLen,
            valueType: value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value,
            fromRemote: Boolean(options?.fromRemote)
          },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
      if (idx < 0) return

      const row = current[idx]
      const backendRowId = (row as any)._rowUuid || (row as any)._id || (row as any).id || rowId

      // Update the ref IMMEDIATELY (synchronously) so concurrent calls
      // (e.g. multi-cell paste) each see the previous call's changes.
      // Without this, all concurrent calls read the same original row
      // and only the last setLocalSheetData wins — losing all but one cell.
      const updatedRow = { ...row, [columnName]: normalizedValue, _updatedAt: new Date().toISOString() }
      const next = [...current.slice(0, idx), updatedRow, ...current.slice(idx + 1)]
      localSheetDataRef.current = next

      if (options?.fromRemote) {
        // Sync React state for remote changes so UI stays in sync (FortuneSheet remount uses this data)
        setLocalSheetData([...next])
        return
      }

      // Debounce the React state update so all concurrent cell changes
      // (from a multi-cell paste) are batched into a single re-render.
      if (cellChangeBatchTimerRef.current) {
        clearTimeout(cellChangeBatchTimerRef.current)
      }
      cellChangeBatchTimerRef.current = setTimeout(() => {
        setLocalSheetData([...localSheetDataRef.current])
        onDataChange?.(activeSheetId, localSheetDataRef.current)
        cellChangeBatchTimerRef.current = null
      }, 50)

      // Accumulate cell changes per row so a multi-cell paste sends ONE
      // backend PATCH with all columns, avoiding the backend race condition
      // where concurrent PATCHes each read the same row and overwrite each other.
      const existing = pendingCellUpdates.current.get(rowId)
      if (existing) {
        existing.changes[columnName] = normalizedValue
      } else {
        pendingCellUpdates.current.set(rowId, {
          backendRowId: String(backendRowId),
          changes: { [columnName]: normalizedValue }
        })
      }
      setIsCellDataSaving(true)

      if (cellPersistTimerRef.current) {
        clearTimeout(cellPersistTimerRef.current)
      }
      // Use 150ms debounce to capture multi-cell operations (e.g. 5x5 delete).
      // FortuneSheet may emit ops in async batches; a short delay ensures we
      // accumulate all changes before persisting.
      cellPersistTimerRef.current = setTimeout(async () => {
        const pending = new Map(pendingCellUpdates.current)
        pendingCellUpdates.current.clear()
        cellPersistTimerRef.current = null
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'long-paste-debug',
            hypothesisId: 'H3',
            location: 'SpreadsheetAppViewer.tsx:cellPersistTimer:start',
            message: 'Debounce fired - persisting patch batch',
            data: { pendingCount: pending.size, pendingRowKeys: [...pending.keys()] },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion

        // Store in-flight data so beforeunload can re-send with keepalive
        // if the page unloads while these PATCHes are still in progress.
        inFlightCellUpdates.current = new Map(pending)

        // Send all row PATCHes in parallel to minimize the window where a
        // page refresh could cancel some but not all requests.
        const patchPromises = [...pending.entries()].map(async ([key, { backendRowId: bid, changes }]) => {
          try {
            if (onRowUpdate) {
              await onRowUpdate(app.id, activeSheetId, bid, changes)
            } else {
              await SpreadsheetApiService.updateRow(app.id, activeSheetId, bid, changes)
            }

            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                runId: 'long-paste-debug',
                hypothesisId: 'H3',
                location: 'SpreadsheetAppViewer.tsx:cellPersistTimer:patchSuccess',
                message: 'Row patch persisted',
                data: {
                  pendingKey: key,
                  backendRowId: bid,
                  changeKeys: Object.keys(changes),
                  maxChangeLen: Object.values(changes).reduce(
                    (m, v) => Math.max(m, typeof v === 'string' ? v.length : 0),
                    0
                  )
                },
                timestamp: Date.now()
              })
            }).catch(() => {})
            // #endregion
            // Remove from in-flight tracking once successfully persisted
            inFlightCellUpdates.current.delete(key)
          } catch (error) {
            // #region agent log
            fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                runId: 'long-paste-debug',
                hypothesisId: 'H4',
                location: 'SpreadsheetAppViewer.tsx:cellPersistTimer:patchError',
                message: 'Row patch failed',
                data: {
                  pendingKey: key,
                  backendRowId: bid,
                  error: error instanceof Error ? error.message : String(error)
                },
                timestamp: Date.now()
              })
            }).catch(() => {})
            // #endregion
            console.error('[SpreadsheetAppViewer] Failed to persist cell changes:', error)
          }
        })
        await Promise.all(patchPromises)
        // Update saving state - may still be true if new edits arrived during flush
        setIsCellDataSaving(pendingCellUpdates.current.size > 0 || inFlightCellUpdates.current.size > 0)
      }, 150)
    },
    [
      activeSheetId,
      app.id,
      entityEnabled,
      localSheetDataRef,
      normalizeCellPersistValue,
      onDataChange,
      onRowUpdate,
      setLocalSheetData
    ]
  )

  useEffect(() => {
    handleCellChangeRef.current = handleCellChange
  }, [handleCellChange])

  // --- Emergency flush on page unload ---
  // When the user refreshes or navigates away, the debounced persist timer
  // (100ms) and any in-flight PATCH requests are cancelled by the browser.
  // This handler flushes all pending cell updates using `keepalive: true`
  // so the browser completes the requests even during page teardown.
  useEffect(() => {
    const flushPendingOnUnload = () => {
      // #region agent log
      fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'long-paste-debug',
          hypothesisId: 'H3',
          location: 'SpreadsheetAppViewer.tsx:flushPendingOnUnload',
          message: 'Flush on unload/hidden triggered',
          data: { pendingCount: pendingCellUpdates.current.size, inFlightCount: inFlightCellUpdates.current.size },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion
      // Clear debounce timers — we're sending everything right now
      if (cellPersistTimerRef.current) {
        clearTimeout(cellPersistTimerRef.current)
        cellPersistTimerRef.current = null
      }
      if (cellChangeBatchTimerRef.current) {
        clearTimeout(cellChangeBatchTimerRef.current)
        cellChangeBatchTimerRef.current = null
      }

      // Merge both: pending (not yet sent) + in-flight (sent but may not have completed)
      const pending = new Map(pendingCellUpdates.current)
      const inFlight = new Map(inFlightCellUpdates.current)
      pendingCellUpdates.current.clear()
      inFlightCellUpdates.current.clear()

      // Merge: in-flight first, then pending overwrites (pending has newer data)
      const allUpdates = new Map([...inFlight, ...pending])

      if (allUpdates.size === 0) {
        // #region agent log
        fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId: 'long-paste-debug',
            hypothesisId: 'H3',
            location: 'SpreadsheetAppViewer.tsx:flushPendingOnUnload:empty',
            message: 'Flush ran but no updates to send',
            data: {},
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion
        return
      }

      const updates = [...allUpdates.values()].map(({ backendRowId, changes }) => ({
        rowId: backendRowId,
        data: changes
      }))

      // #region agent log
      const payloads = updates.map(u => ({ rowId: u.rowId, bytes: new Blob([JSON.stringify(u.data)]).size }))
      const oversize = payloads.filter(p => p.bytes > 60000)
      fetch('http://127.0.0.1:7244/ingest/29e4e19a-f86b-4f4e-9c0f-f3ddb4f01625', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          runId: 'long-paste-debug',
          hypothesisId: 'H1_H3',
          location: 'SpreadsheetAppViewer.tsx:flushPendingOnUnload:beforeFlush',
          message: oversize.length ? 'Payload exceeds 64KB keepalive limit' : 'Flush sending updates',
          data: {
            updateCount: updates.length,
            payloadSizes: payloads,
            oversizeCount: oversize.length,
            oversizeRows: oversize.map(p => p.rowId)
          },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion

      // Fire-and-forget with keepalive — browser will complete these after unload
      SpreadsheetApiService.flushRowUpdates(app.id, activeSheetId, updates)
    }

    globalThis.window.addEventListener('beforeunload', flushPendingOnUnload)
    // Also handle visibilitychange for mobile / tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushPendingOnUnload()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      // Flush debounced/in-flight updates on SPA navigation/unmount as well.
      flushPendingOnUnload()
      globalThis.window.removeEventListener('beforeunload', flushPendingOnUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [app.id, activeSheetId])

  const handleFortuneSheetDataChange = useCallback(
    async (newData: Record<string, unknown>[]) => {
      if (entityEnabled) return

      const prev = localSheetDataRef.current
      if (newData.length <= prev.length) return

      const added = newData.slice(prev.length)
      const createdRows: Record<string, unknown>[] = []

      for (const row of added) {
        const rowPayload: Record<string, unknown> = {}
        activeSheet.columns.forEach(col => {
          const v = row[col.name]
          if (v !== undefined) rowPayload[col.name] = v
        })

        try {
          const saved = onRowAdd
            ? await onRowAdd(app.id, activeSheetId, rowPayload)
            : await SpreadsheetApiService.addRow(app.id, activeSheetId, rowPayload)
          createdRows.push({ ...row, ...(saved || {}) })
        } catch (error) {
          console.error('[SpreadsheetAppViewer] Failed to persist added row:', error)
        }
      }

      const next = [...prev, ...createdRows]
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
    },
    [
      activeSheet.columns,
      activeSheetId,
      app.id,
      entityEnabled,
      localSheetDataRef,
      onDataChange,
      onRowAdd,
      setLocalSheetData
    ]
  )

  const formFields = useMemo(() => {
    const visible = activeSheet.columns.filter(c => c.isVisible)
    return visible.map((col, idx) => columnToFormField(col, idx))
  }, [activeSheet.columns])

  const handleUpdateRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!editingRow) return
      const rowId = String(editingRow._id ?? editingRow._rowUuid ?? editingRow.id ?? '')
      const backendRowId = String(editingRow._rowUuid ?? editingRow._id ?? editingRow.id ?? '')
      if (!rowId || !backendRowId) return

      const next = localSheetDataRef.current.map(r =>
        String(r._id ?? r._rowUuid ?? r.id ?? '') === rowId ? { ...r, ...values } : r
      )
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
      setEditingRow(null)

      try {
        if (onRowUpdate) {
          await onRowUpdate(app.id, activeSheetId, backendRowId, values)
        } else {
          await SpreadsheetApiService.updateRow(app.id, activeSheetId, backendRowId, values)
        }
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to update row:', error)
      }
    },
    [activeSheetId, app.id, editingRow, localSheetDataRef, onDataChange, onRowUpdate, setLocalSheetData]
  )

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      const next = localSheetDataRef.current.filter(r => String(r._id ?? r._rowUuid ?? r.id ?? '') !== String(rowId))
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
      try {
        await SpreadsheetApiService.deleteRow(app.id, activeSheetId, rowId)
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to delete row:', error)
      }
    },
    [activeSheetId, app.id, localSheetDataRef, onDataChange, setLocalSheetData]
  )

  // --- Filter state persistence (FortuneSheet filter state survives refresh) ---
  const handleFilterStateChange = useCallback(
    (filterState: {
      filter?: Record<string, unknown> | null
      filter_select?: Record<string, unknown>
      rowhidden?: Record<string, number>
    }) => {
      persistSheetPatch({
        settings: { ...activeSheet.settings, fortuneSheetFilterState: filterState }
      })
    },
    [activeSheet.settings, persistSheetPatch]
  )

  // --- Layout state persistence (FortuneSheet row/column resize survives refresh) ---
  const handleLayoutStateChange = useCallback(
    (layoutState: { rowlen?: Record<string, number>; columnlen?: Record<string, number> }) => {
      persistSheetPatch({
        settings: { ...activeSheet.settings, fortuneSheetLayoutState: layoutState }
      })
    },
    [activeSheet.settings, persistSheetPatch]
  )

  // --- Column visibility from FortuneSheet context menu ---
  const handleColumnVisibilityChange = useCallback(
    (columnIndices: number[], visible: boolean) => {
      // FortuneSheet indices correspond to visible columns (we only pass visible ones)
      const visibleColumns = activeSheet.columns.filter(c => c.isVisible).sort((a, b) => a.order - b.order)

      const affectedColumnIds = new Set(columnIndices.map(idx => visibleColumns[idx]?.id).filter(Boolean))

      if (affectedColumnIds.size === 0) return

      const updatedColumns = activeSheet.columns.map(col =>
        affectedColumnIds.has(col.id) ? { ...col, isVisible: visible } : col
      )

      persistSheetPatch({ columns: updatedColumns })
    },
    [activeSheet.columns, persistSheetPatch]
  )

  // --- Row insert/delete from FortuneSheet context menu ---

  // Helper to extract the backend UUID from a row object
  const getRowBackendId = useCallback((row: Record<string, unknown>): string => {
    return String(row._rowUuid ?? row._id ?? row.id ?? '')
  }, [])

  // Save the current row order to sheet settings so it's preserved across refreshes
  const persistRowOrder = useCallback(
    (rows: Record<string, unknown>[]) => {
      const rowOrder = rows.map(getRowBackendId).filter(Boolean)
      persistSheetPatch({ settings: { ...activeSheet.settings, rowOrder } })
    },
    [activeSheet.settings, getRowBackendId, persistSheetPatch]
  )

  const handleRowsInsert = useCallback(
    async (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => {
      if (entityEnabled) return

      const insertAt = direction === 'rightbottom' ? insertIndex + 1 : insertIndex
      const current = localSheetDataRef.current
      const newRows: Record<string, unknown>[] = []

      for (let i = 0; i < count; i++) {
        const rowPayload: Record<string, unknown> = {}
        activeSheet.columns.forEach(col => {
          rowPayload[col.name] = col.defaultValue ?? ''
        })

        try {
          const saved = onRowAdd
            ? await onRowAdd(app.id, activeSheetId, rowPayload)
            : await SpreadsheetApiService.addRow(app.id, activeSheetId, rowPayload)
          newRows.push({ ...rowPayload, ...(saved || {}) })
        } catch (error) {
          console.error('[SpreadsheetAppViewer] Failed to persist inserted row:', error)
          newRows.push(rowPayload)
        }
      }

      const next = [...current.slice(0, insertAt), ...newRows, ...current.slice(insertAt)]
      localSheetDataRef.current = next
      setLocalSheetData(next)

      // Save row order to sheet settings (persists across refresh)
      persistRowOrder(next)
    },
    [
      activeSheet.columns,
      activeSheetId,
      app.id,
      entityEnabled,
      localSheetDataRef,
      onRowAdd,
      persistRowOrder,
      setLocalSheetData
    ]
  )

  const handleRowsDelete = useCallback(
    async (startIndex: number, endIndex: number) => {
      if (entityEnabled) return

      const current = localSheetDataRef.current
      const rowsToDelete = current.slice(startIndex, endIndex + 1)

      // Remove from local state
      const next = [...current.slice(0, startIndex), ...current.slice(endIndex + 1)]
      localSheetDataRef.current = next
      setLocalSheetData(next)

      // Delete from backend
      for (const row of rowsToDelete) {
        const rowId = getRowBackendId(row)
        if (rowId) {
          try {
            await SpreadsheetApiService.deleteRow(app.id, activeSheetId, rowId)
          } catch (error) {
            console.error('[SpreadsheetAppViewer] Failed to delete row:', error)
          }
        }
      }

      // Save row order to sheet settings (persists across refresh)
      persistRowOrder(next)
    },
    [activeSheetId, app.id, entityEnabled, getRowBackendId, localSheetDataRef, persistRowOrder, setLocalSheetData]
  )

  // --- Column editing save (from dialog) ---
  const [editingColumns, setEditingColumns] = useState<SpreadsheetColumn[]>([])
  const onSaveColumns = useCallback(
    (columns: SpreadsheetColumn[]) => persistSheetPatch({ columns }),
    [persistSheetPatch]
  )

  // Batch update column labels (e.g. bulk collection form field headers)
  const handleColumnLabelsUpdate = useCallback(
    (updates: Array<{ columnId: string; newLabel: string }>) => {
      if (updates.length === 0) return
      const updatedColumns = activeSheet.columns.map(col => {
        const match = updates.find(u => u.columnId === col.id)
        if (match) return { ...col, label: match.newLabel }
        return col
      })
      persistSheetPatch({ columns: updatedColumns })
    },
    [activeSheet.columns, persistSheetPatch]
  )

  // --- Active view type ---
  const viewType = activeView?.config.type || activeSheet.viewType || 'table'

  // --- Export to Excel ---
  const handleExportToExcel = useCallback(async () => {
    try {
      await exportSheetToExcel(app.name, activeSheet, sheetData)
    } catch (error) {
      console.error('[SpreadsheetAppViewer] Failed to export to Excel:', error)
    }
  }, [app.name, activeSheet, sheetData])

  const handleRestoreVersion = useCallback(
    async (versionNumber: number) => {
      const restored = await versioning.restoreVersion(versionNumber)
      if (!restored) return

      if (onAppRefreshNeeded) {
        await onAppRefreshNeeded(app.id, activeSheetId)
        // Wait for refreshed app prop to arrive before forcing local resync.
        setPendingRestoreSyncFromAppRef(app)
        return
      }

      // Fallback when parent refresh callback is unavailable.
      setRestoreSyncToken(prev => prev + 1)
    },
    [versioning, onAppRefreshNeeded, app.id, activeSheetId]
  )

  const handleRefreshSpreadsheet = useCallback(async () => {
    if (!onAppRefreshNeeded) return
    await onAppRefreshNeeded(app.id, activeSheetId)
    // Force viewer state to re-sync from refreshed app (same as browser refresh)
    setRestoreSyncToken(prev => prev + 1)
  }, [onAppRefreshNeeded, app.id, activeSheetId])

  useEffect(() => {
    if (!pendingRestoreSyncFromAppRef) return
    if (pendingRestoreSyncFromAppRef === app) return

    setRestoreSyncToken(prev => prev + 1)
    setPendingRestoreSyncFromAppRef(null)
  }, [app, pendingRestoreSyncFromAppRef])

  return (
    <div className="gba:flex gba:flex-col gba:w-full gba:h-full gba:overflow-hidden" data-testid={testId}>
      <SpreadsheetHeader
        app={app}
        activeSheet={activeSheet}
        onBack={onBack}
        isEditing={isEditing}
        canEdit={isEditing && !entityEnabled}
        headerParticipants={collaboration.headerParticipants}
        isCollaborationConnected={collaboration.isCollaborationConnected}
        isEntityDataLoading={entityState.isLoading}
        onRefreshEntityData={() => void refreshEntityData()}
        versioning={{
          isSaving: versioning.isSaving || isCellDataSaving,
          lastSaveTime: versioning.lastSaveTime,
          hasUnsavedChanges: versioning.hasUnsavedChanges,
          currentVersion: (() => {
            const latestCheckpoint = versioning.versions.find(v => v.isCheckpoint)
            const version = latestCheckpoint ?? versioning.currentVersion
            return version
              ? {
                  version: version.version,
                  changeDescription: version.changeDescription
                }
              : null
          })()
        }}
        onShowCheckpointDialog={() => setShowCheckpointDialog(true)}
        onShowVersionHistory={() => setShowVersionHistory(true)}
        publishingStatus={app.publishMetadata?.status || 'draft'}
        showComments={showComments}
        setShowComments={setShowComments}
        unresolvedCommentCount={comments.unresolvedCount}
        fileLock={{
          lock: fileLock.lock,
          isLockedByMe: fileLock.isLockedByMe,
          acquireLock: fileLock.acquireLock,
          releaseLock: fileLock.releaseLock
        }}
        onShowPublishDialog={() => setShowPublishDialog(true)}
        onAddColumn={columnsState.handleAddColumn}
        onManageColumns={() => columnsState.setIsManageColumnsDialogOpen(true)}
        onOpenAutomations={() => setIsAutomationsOpen(true)}
        onShare={onShare}
        onEdit={onEdit}
        onExportToExcel={handleExportToExcel}
        isCollectionCopy={isCollectionCopy}
        collectionSubmittedAt={collectionSubmittedAt}
        onSubmitCollection={canSubmitCollection && !collectionSubmittedAt ? handleSubmitCollection : undefined}
        showSummarizeButton={hasExcelCollectionWithEligibleRows}
        onSummarizeClick={handleSummarizeClick}
        isSummarizing={collectionSummary.isSummarizing}
        onRefreshSpreadsheet={onAppRefreshNeeded ? handleRefreshSpreadsheet : undefined}
        isCellDataSaving={isCellDataSaving}
        onRename={
          onAppUpdate
            ? newName => {
                const trimmed = newName.trim()
                if (trimmed && trimmed !== app.name) {
                  onAppUpdate({ ...app, name: trimmed })
                }
              }
            : undefined
        }
        testId={testId}
      />

      <CollectionSummaryDialog
        open={showCollectionSummaryDialog}
        onOpenChange={setShowCollectionSummaryDialog}
        summary={collectionSummary.summary}
        isSummarizing={collectionSummary.isSummarizing}
        error={collectionSummary.error}
        onAddToSheet={handleAddSummaryToSheet}
        data-testid={`${testId}-collection-summary-dialog`}
      />

      {entityEnabled && (
        <EntityDataStatusBar
          isLoading={entityState.isLoading}
          error={entityState.error}
          dataCount={entityDataCount}
          dataSourceName={activeSheet.entityDataSource?.entityDisplayName}
          onRefresh={() => void refreshEntityData()}
          onEdit={onEdit}
          data-testid={`${testId}-entity-data-status-bar`}
        />
      )}

      <div className="gba:flex-1 gba:relative gba:min-h-0 gba:overflow-hidden">
        {viewType === 'table' && (
          <TableView
            gridRef={gridRef}
            sheet={activeSheet}
            data={sheetData}
            columns={[]}
            spreadsheetColumns={activeSheet.columns.filter(c => c.isVisible)}
            testId={`${testId}-table-view`}
            onCellChange={handleCellChange}
            onDataChange={handleFortuneSheetDataChange}
            onColumnAdd={columnsState.handleAutoColumnAdd}
            onColumnsInsert={columnsState.handleColumnsInsert}
            onColumnsDelete={columnsState.handleColumnsDelete}
            onRowsInsert={handleRowsInsert}
            onRowsDelete={handleRowsDelete}
            onColumnVisibilityChange={handleColumnVisibilityChange}
            onFilterStateChange={handleFilterStateChange}
            onLayoutStateChange={handleLayoutStateChange}
            onColumnRename={columnsState.handleRenameColumn}
            participants={collaboration.cursorParticipants}
            onOperationEmit={op => collaboration.emitOperation(op as any)}
            onCursorEmit={pos => collaboration.emitCursor({ path: pos.path })}
            collaborationEnabled={collaboration.isCollaborationConnected}
            onRemoteChangeApplied={() => setRemoteUpdateKey(k => k + 1)}
            remoteUpdateKey={remoteUpdateKey}
            receivedOpsQueueRef={receivedOpsQueueRef}
            processOpsTrigger={processOpsTrigger}
            isReadOnly={!isEditing || entityEnabled}
          />
        )}

        {viewType === 'form' && (
          <FormView
            sheet={activeSheet}
            data={sheetData}
            onEdit={row => setEditingRow(row)}
            onDelete={handleDeleteRow}
            testId={`${testId}-form-view`}
          />
        )}

        {viewType === 'dashboard' && (
          <DashboardView sheet={activeSheet} data={sheetData} testId={`${testId}-dashboard-view`} />
        )}

        {viewType === 'kanban' && (
          <KanbanView
            sheet={activeSheet}
            data={sheetData}
            view={activeView!}
            onEdit={row => setEditingRow(row)}
            testId={`${testId}-kanban-view`}
          />
        )}
      </div>

      <SpreadsheetSheetTabs
        sheets={app.sheets}
        activeSheetId={activeSheetId}
        onSheetChange={setActiveSheetId}
        entityDataLength={entityEnabled ? entityDataCount : undefined}
        data-testid={`${testId}-sheet-tabs`}
      />

      <SpreadsheetDialogsSection
        editingRow={editingRow}
        setEditingRow={setEditingRow}
        formFields={formFields}
        handleUpdateRow={handleUpdateRow}
        accessToken={accessToken}
        isManageColumnsDialogOpen={columnsState.isManageColumnsDialogOpen}
        setIsManageColumnsDialogOpen={columnsState.setIsManageColumnsDialogOpen}
        columns={activeSheet.columns}
        editingColumns={editingColumns}
        setEditingColumns={setEditingColumns}
        handleAddColumn={columnsState.handleAddColumn}
        onSaveColumns={onSaveColumns}
        showVersionHistory={showVersionHistory}
        setShowVersionHistory={setShowVersionHistory}
        versionUserDisplayMap={{
          ...((userId || collaboration.currentUserIdRef.current) && collaboration.currentUserName
            ? {
                ...(userId
                  ? {
                      [userId]: {
                        displayName: collaboration.currentUserName,
                        avatarUrl: collaboration.currentUserAvatar
                      }
                    }
                  : {}),
                ...(collaboration.currentUserIdRef.current
                  ? {
                      [collaboration.currentUserIdRef.current]: {
                        displayName: collaboration.currentUserName,
                        avatarUrl: collaboration.currentUserAvatar
                      }
                    }
                  : {})
              }
            : {}),
          ...versionUserDisplayMap
        }}
        versioning={versioning as any}
        handleRestoreVersion={handleRestoreVersion as any}
        showCheckpointDialog={showCheckpointDialog}
        setShowCheckpointDialog={setShowCheckpointDialog}
        showPublishDialog={showPublishDialog}
        setShowPublishDialog={setShowPublishDialog}
        publishing={publishing as any}
        showComments={showComments}
        setShowComments={setShowComments}
        onScrollToHighlight={handleScrollToHighlight}
        getSelectedCellRef={() => gridRef.current?.getSelectedCellRef() ?? null}
        comments={comments as any}
        currentUserId={userId}
        currentUserName={collaboration.currentUserName}
        currentUserAvatar={collaboration.currentUserAvatar}
        testId={testId}
      />

      <AutomationsPanel
        isOpen={isAutomationsOpen}
        onClose={() => setIsAutomationsOpen(false)}
        automations={automations.automations}
        executionHistory={automations.executionHistory}
        workflowLinks={automations.workflowLinks}
        isLoading={automations.isLoading}
        columns={activeSheet.columns}
        sheetData={sheetData}
        spreadsheetId={app.id}
        sheetId={activeSheetId}
        accessToken={accessToken}
        onColumnLabelsUpdate={handleColumnLabelsUpdate}
        onCreateAutomation={automations.createAutomation}
        onUpdateAutomation={automations.updateAutomation}
        onDeleteAutomation={automations.deleteAutomation}
        onToggleAutomation={async (id, enabled) => automations.toggleAutomation(id, enabled)}
        onDuplicateAutomation={automations.duplicateAutomation}
        onRunAutomation={(id, rows) => automations.runAutomation(id, rows)}
        onRefreshWorkflowStatuses={() => void automations.refreshWorkflowStatuses()}
        showSummarizeButton={hasExcelCollectionWithEligibleRows}
        onSummarizeClick={handleSummarizeClick}
        isSummarizing={collectionSummary.isSummarizing}
        data-testid={`${testId}-automations-panel`}
      />
    </div>
  )
}
