/**
 * SpreadsheetAppViewer Component
 *
 * The main runtime viewer for generated spreadsheet apps.
 * Renders table, form, dashboard, and kanban views based on configuration.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ColumnDef, Row } from '@tanstack/react-table'
import {
  Card,
  Button,
  Badge,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  BarChart3,
  Plus,
  Download,
  Upload,
  Settings,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronRight,
  Layers,
  RefreshCw,
  Database,
  Loader2,
  AlertCircle,
  Columns,
  Eye,
  EyeOff,
  X,
  Save,
  Activity,
  User,
  Zap,
  Signal,
  Home,
  FileSpreadsheet,
  GripVertical,
  History,
  MessageSquare,
  Lock,
  Unlock
} from 'lucide-react'
import { DynamicFormGenerator } from '@/business-apps/ser/components/DynamicFormGenerator'
import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn, SheetView, ColumnType } from './types'
import { evaluateFormula, isFormula, type FormulaContext } from './utils/formulaEvaluator'
import { getIconByName } from './utils/appIcons'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { AutomationsHub, AutomationWizard } from './components/automations'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { isTrackingColumn } from './utils/trackingColumns'
import { TRACKING_COLUMNS } from './components/automations/TrackingColumnsConfig'
import { normalizeImageSrc } from './utils/normalizeImageSrc'
import { isValidUrl, urlToMarkdown, parseMarkdownLink, isMarkdownLink } from './utils/linkUtils'
import { computeNextLocalSheetData, persistCellChangeToBackend } from './viewer/cellChange'
import { appendCellRef, buildRangeCells } from './viewer/formulaSelection'
import { createSpreadsheetGlobalKeyDownHandler, type SelectedCell as GlobalSelectedCell } from './viewer/globalKeyDown'
import { useCollaboration } from '../shared/hooks/useCollaboration'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { DocumentParticipant } from '../shared/services/CollaborationClient'
import { PresenceIndicator } from '../shared/components/PresenceIndicator'
import { CellCollaboratorIndicator } from '../shared/components/CellCollaboratorIndicator'
import { SpreadsheetApiService } from './services/SpreadsheetApiService'
import { useVersioning } from '../shared/hooks/useVersioning'
import { useFileLock } from '../shared/hooks/useFileLock'
import { useComments } from '../shared/hooks/useComments'
import { FortuneSheetGrid, type FortuneSheetGridHandle } from './components/FortuneSheetGrid'
import { usePublishing } from '../shared/hooks/usePublishing'
import { VersionHistory } from '../shared/components/VersionHistory'
import { CheckpointDialog } from '../shared/components/CheckpointDialog'
import { AutoSaveIndicator } from '../shared/components/AutoSaveIndicator'
import { StatusBadge } from '../shared/components/StatusBadge'
import { PublishDialog } from '../shared/components/PublishDialog'
import { CommentPanel } from '../shared/components/CommentPanel'
import { LinkEditor } from './components/LinkEditor'

/**
 * Get a nested value from an object using dot notation path
 * e.g., getNestedValue(obj, "ownerEmployee.displayName")
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let value: unknown = obj

  for (const part of parts) {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'object') {
      value = (value as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return value
}

export interface SpreadsheetAppViewerProps {
  app: SpreadsheetApp
  activeSheetId?: string
  activeViewId?: string
  onDataChange?: (sheetId: string, data: Record<string, unknown>[]) => void
  onRowAdd?: (
    appId: string,
    sheetId: string,
    rowData: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  onRowUpdate?: (
    appId: string,
    sheetId: string,
    rowId: string,
    updates: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  onAppUpdate?: (app: SpreadsheetApp) => void
  onSheetUpdate?: (
    appId: string,
    sheetId: string,
    updates: Partial<SpreadsheetSheet>
  ) => Promise<SpreadsheetSheet | null>
  onBack?: () => void
  onEdit?: () => void
  isEditing?: boolean
  accessToken?: string
  userId?: string
  'data-testid'?: string
}

/**
 * Get icon for view type
 */
// Unused for now but may be needed when view switching is implemented
// function getViewIcon(type: ViewType) {
//   switch (type) {
//     case 'table':
//       return Table2
//     case 'form':
//       return FileInput
//     case 'dashboard':
//       return BarChart3
//     case 'kanban':
//       return Kanban
//     case 'calendar':
//       return Calendar
//     default:
//       return Table2
//   }
// }

/**
 * SpreadsheetAppViewer Component
 */
export const SpreadsheetAppViewer: React.FC<SpreadsheetAppViewerProps> = ({
  app,
  activeSheetId: initialSheetId,
  activeViewId: initialViewId,
  onDataChange,
  onAppUpdate: _onAppUpdate,
  onSheetUpdate,
  onBack,
  onEdit,
  isEditing = true,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  // State
  const [activeSheetId, setActiveSheetId] = useState(initialSheetId || app.sheets[0]?.id || '')
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [activeViewId, setActiveViewId] = useState<string | null>(initialViewId || null)
  const [isManageColumnsDialogOpen, setIsManageColumnsDialogOpen] = useState(false)
  const [editingColumns, setEditingColumns] = useState<SpreadsheetColumn[]>([])
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null)
  const [editingColumnId, setEditingColumnIdState] = useState<string | null>(null)
  const [editingColumnLabel, setEditingColumnLabelState] = useState('')

  // Refs to track latest editing state for stable closures in memoized columns
  const editingColumnIdRef = useRef<string | null>(null)
  const editingColumnLabelRef = useRef('')

  // Stable setters that update both state and refs
  const setEditingColumnId = useCallback((id: string | null) => {
    editingColumnIdRef.current = id
    setEditingColumnIdState(id)
  }, [])

  const setEditingColumnLabel = useCallback((label: string) => {
    editingColumnLabelRef.current = label
    setEditingColumnLabelState(label)
  }, [])
  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false)
  const [isAutomationWizardOpen, setIsAutomationWizardOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<import('./types/automation').SpreadsheetAutomation | null>(
    null
  )

  // Versioning UI state
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showComments, setShowComments] = useState(false)

  // Versioning, Comments, Locking, Publishing hooks
  const versioning = useVersioning({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService,
    autoSaveEnabled: true,
    autoSaveInterval: 30000
  })

  const comments = useComments({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService
  })

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

  // Prevent the entire page from horizontally overflowing when the table content (or resizer handles)
  // becomes slightly wider than the viewport. We keep horizontal scrolling inside the table container.
  //
  // NOTE: We set *style* properties (not classes) because global CSS may set `overflow: auto` later in the cascade,
  // which would override `overflow-x` utilities on <html>/<body>.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    const prevHtmlOverflowX = html.style.overflowX
    const prevBodyOverflowX = body.style.overflowX

    html.style.overflowX = 'hidden'
    body.style.overflowX = 'hidden'

    return () => {
      html.style.overflowX = prevHtmlOverflowX
      body.style.overflowX = prevBodyOverflowX
    }
  }, [])

  // Excel-like cell selection state
  const [selectedCell, setSelectedCellState] = useState<{
    rowId: string
    colId: string
    rowIndex: number
    colIndex: number
  } | null>(null)

  // Ref to track latest selectedCell for stable closures in memoized columns
  const selectedCellRef = useRef(selectedCell)
  selectedCellRef.current = selectedCell

  // Stable setSelectedCell that also updates the ref immediately
  const setSelectedCell = useCallback((cell: typeof selectedCell) => {
    selectedCellRef.current = cell
    setSelectedCellState(cell)
  }, [])

  // Entity data loading
  const [entityData, setEntityData] = useState<Record<string, unknown>[]>([])
  const [isEntityDataLoading, setIsEntityDataLoading] = useState(false)
  const [entityDataError, setEntityDataError] = useState<string | null>(null)

  // Entity data source hook
  const { loadData: loadEntityData } = useEntityDataSource({
    accessToken,
    userId
  })

  // Get initial automations from current sheet (computed before activeSheet memo)
  const currentSheetData = useMemo(() => {
    return app.sheets.find(s => s.id === activeSheetId)
  }, [app.sheets, activeSheetId])

  // Automations hook - persist automations to sheet data
  const handleAutomationsChange = useCallback(
    (newAutomations: import('./types/automation').SpreadsheetAutomation[]) => {
      if (_onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheetId
            ? {
                ...sheet,
                // IMPORTANT: Preserve latest local sheet data to avoid stale overwrites
                // when automations change triggers a save concurrently with row updates.
                data: localSheetDataRef.current,
                automations: newAutomations
              }
            : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      }
    },
    [app, activeSheetId, _onAppUpdate]
  )

  const handleWorkflowLinksChange = useCallback(
    (newLinks: import('./types/automation').WorkflowRowLink[]) => {
      if (_onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheetId
            ? {
                ...sheet,
                // IMPORTANT: Preserve latest local sheet data to avoid stale overwrites
                // when workflowLinks updates race with row additions/updates.
                data: localSheetDataRef.current,
                workflowLinks: newLinks
              }
            : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      }
    },
    [app, activeSheetId, _onAppUpdate]
  )

  // Refs for row callbacks (used by automation hook for bulk collection)
  // Defined before hook call to be available in the callback
  const handleAddRowsRef = useRef<
    ((rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => void) | undefined
  >(undefined)
  const handleUpdateRowsRef = useRef<
    ((updates: Array<{ workflowId: string; cells: Record<string, unknown> }>) => void) | undefined
  >(undefined)

  const {
    automations,
    executionHistory,
    workflowLinks,
    isLoading: isAutomationsLoading,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    duplicateAutomation,
    runAutomation,
    refreshWorkflowStatuses
  } = useSpreadsheetAutomations({
    spreadsheetId: app.id,
    sheetId: activeSheetId,
    accessToken,
    currentUserId: userId || '',
    initialAutomations: currentSheetData?.automations || [],
    initialWorkflowLinks: currentSheetData?.workflowLinks || [],
    onAutomationsChange: handleAutomationsChange,
    onWorkflowLinksChange: handleWorkflowLinksChange,
    onAddRows: rows => handleAddRowsRef.current?.(rows),
    onUpdateRows: updates => handleUpdateRowsRef.current?.(updates)
  })

  const [formulaSelectionMode, setFormulaSelectionMode] = useState<FormulaSelectionMode>(null)
  const formulaSelectionModeRef = React.useRef<FormulaSelectionMode>(null)

  // Track all cells selected during formula mode for highlighting
  const [formulaSelectedCells, setFormulaSelectedCells] = useState<Array<{ rowIndex: number; colIndex: number }>>([])

  // Store current formula value at viewer level for access when saving
  const currentFormulaValueRef = React.useRef<string>('')
  const formulaBarInputRef = React.useRef<HTMLInputElement>(null)

  // Debounced save for rapid cell edits
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  // (saving refs removed)

  // Prevent duplicate backing-row creation for entity-data-source rows (non-UUID row ids)
  const pendingBackingRowCreateRef = React.useRef<Set<string>>(new Set())

  // Ref for FortuneSheetGrid to call imperative methods (remote cell updates)
  const fortuneSheetGridRef = React.useRef<FortuneSheetGridHandle | null>(null)
  // Ref to avoid TDZ when auto-adding columns
  const handleCellChangeRef = React.useRef<(rowId: string, columnName: string, value: unknown) => void>(() => {})

  // Local data state - completely independent from app.sheets during editing
  const [localSheetData, setLocalSheetData] = useState<Record<string, unknown>[]>(
    () => app.sheets.find(s => s.id === activeSheetId)?.data || []
  )

  // IMPORTANT: Keep a ref to always have access to the LATEST localSheetData
  // This prevents stale closure issues when handlers are called rapidly (e.g., from polling)
  const localSheetDataRef = React.useRef(localSheetData)
  useEffect(() => {
    localSheetDataRef.current = localSheetData
  }, [localSheetData])

  // Ref to track active sheet (avoid re-creating callbacks)
  const activeSheetIdRef = useRef(activeSheetId)
  useEffect(() => {
    activeSheetIdRef.current = activeSheetId
  }, [activeSheetId])

  // Ref to store column update callback from parent
  const onAppUpdateRef = useRef(_onAppUpdate)
  useEffect(() => {
    onAppUpdateRef.current = _onAppUpdate
  }, [_onAppUpdate])

  // Keep latest app in a ref for stable callbacks
  const appRef = useRef(app)
  useEffect(() => {
    appRef.current = app
  }, [app])

  // Store current user ID and info to avoid applying our own operations
  const currentUserIdRef = useRef<string | undefined>(undefined)
  const [currentUserName, setCurrentUserName] = useState<string>('User')
  const [currentUserAvatar, setCurrentUserAvatar] = useState<string | undefined>(undefined)

  const updateAppForSheet = useCallback((sheetId: string, update: (sheet: SpreadsheetSheet) => SpreadsheetSheet) => {
    const onAppUpdate = onAppUpdateRef.current
    if (!onAppUpdate) return

    const currentApp = appRef.current
    const targetSheet = currentApp.sheets.find(s => s.id === sheetId)
    if (!targetSheet) return

    const updatedSheets = currentApp.sheets.map(sheet => (sheet.id === sheetId ? update(sheet) : sheet))
    onAppUpdate({ ...currentApp, sheets: updatedSheets })
  }, [])

  const handleRemoteCellUpdate = useCallback(
    (params: {
      sheetId: string
      rowId?: string
      rowIndex?: number
      columnIndex?: number
      column: string
      value: unknown
      isActiveSheet: boolean
    }) => {
      if (params.isActiveSheet) {
        // 1) Update FortuneSheet directly via its API (no re-render)
        const currentApp = appRef.current
        const targetSheet = currentApp?.sheets.find(s => s.id === params.sheetId)
        if (targetSheet && fortuneSheetGridRef.current) {
          // Find rowIndex if we have rowId
          let rowIdx = params.rowIndex
          if (rowIdx === undefined && params.rowId) {
            rowIdx = localSheetDataRef.current.findIndex(row => row._id === params.rowId)
          }

          // Find columnIndex if we have column name
          let colIdx = params.columnIndex
          if (colIdx === undefined) {
            colIdx = targetSheet.columns.findIndex(col => col.name === params.column || col.id === params.column)
          }

          if (rowIdx !== undefined && rowIdx >= 0 && colIdx !== undefined && colIdx >= 0) {
            fortuneSheetGridRef.current.applyRemoteCellUpdate(rowIdx, colIdx, params.value)
          }
        }

        // 2) Update local state for persistence (but FortuneSheet already updated)
        setLocalSheetData(prev => {
          let updated = false
          const next = prev.map((row, idx) => {
            if (params.rowId && row._id === params.rowId) {
              updated = true
              return { ...row, [params.column]: params.value }
            }
            if (!updated && typeof params.rowIndex === 'number' && idx === params.rowIndex) {
              updated = true
              return { ...row, [params.column]: params.value }
            }
            return row
          })

          return updated ? next : prev
        })
        return
      }

      updateAppForSheet(params.sheetId, sheet => {
        let updated = false
        const updatedData = (sheet.data || []).map((row: Record<string, unknown>) => {
          if (params.rowId && row._id === params.rowId) {
            updated = true
            return { ...row, [params.column]: params.value }
          }
          return row
        })

        if (!updated && typeof params.rowIndex === 'number' && updatedData[params.rowIndex]) {
          updatedData[params.rowIndex] = {
            ...(updatedData[params.rowIndex] as Record<string, unknown>),
            [params.column]: params.value
          }
        }

        return { ...sheet, data: updatedData }
      })
    },
    [updateAppForSheet]
  )

  const handleRemoteRowAdd = useCallback(
    (params: { sheetId: string; rowData: Record<string, unknown>; isActiveSheet: boolean }) => {
      if (params.isActiveSheet) {
        setLocalSheetData(prev => {
          const exists = prev.some(row => row._id === params.rowData._id)
          return exists ? prev : [...prev, params.rowData]
        })
        return
      }

      updateAppForSheet(params.sheetId, sheet => {
        const existingData = sheet.data || []
        const exists = existingData.some((row: Record<string, unknown>) => row._id === params.rowData._id)
        return exists ? sheet : { ...sheet, data: [...existingData, params.rowData] }
      })
    },
    [updateAppForSheet]
  )

  const handleRemoteRowDelete = useCallback(
    (params: { sheetId: string; rowId: string; isActiveSheet: boolean }) => {
      if (params.isActiveSheet) {
        setLocalSheetData(prev => prev.filter(row => row._id !== params.rowId))
        return
      }

      updateAppForSheet(params.sheetId, sheet => {
        const updatedData = (sheet.data || []).filter((row: Record<string, unknown>) => row._id !== params.rowId)
        return { ...sheet, data: updatedData }
      })
    },
    [updateAppForSheet]
  )

  const handleRemoteColumnAdd = useCallback(
    (params: { sheetId: string; column: SpreadsheetColumn; isActiveSheet: boolean }) => {
      updateAppForSheet(params.sheetId, sheet => ({
        ...sheet,
        columns: [...sheet.columns, params.column],
        data: params.isActiveSheet ? localSheetDataRef.current : sheet.data
      }))
    },
    [updateAppForSheet]
  )

  const handleRemoteColumnUpdate = useCallback(
    (params: {
      sheetId: string
      columns?: SpreadsheetColumn[]
      columnId?: string
      columnPatch?: Partial<SpreadsheetColumn>
      isActiveSheet: boolean
    }) => {
      updateAppForSheet(params.sheetId, sheet => {
        let updatedColumns: SpreadsheetColumn[]
        if (params.columnId && params.columnPatch) {
          updatedColumns = sheet.columns.map(col =>
            col.id === params.columnId ? { ...col, ...params.columnPatch } : col
          )
        } else if (params.columns) {
          updatedColumns = params.columns
        } else {
          return sheet
        }

        return {
          ...sheet,
          columns: updatedColumns,
          data: params.isActiveSheet ? localSheetDataRef.current : sheet.data
        }
      })
    },
    [updateAppForSheet]
  )

  const handleRemoteColumnDelete = useCallback(
    (params: { sheetId: string; columnId: string; isActiveSheet: boolean }) => {
      updateAppForSheet(params.sheetId, sheet => ({
        ...sheet,
        columns: sheet.columns.filter(col => col.id !== params.columnId),
        data: params.isActiveSheet ? localSheetDataRef.current : sheet.data
      }))
    },
    [updateAppForSheet]
  )

  // Collaboration callbacks (stable references - no dependencies)
  const onOperationReceivedCallback = useCallback((operation: any) => {
    // Skip if this is our own operation (we already applied it optimistically)
    if (operation?.userId === currentUserIdRef.current) return

    const op = operation?.operation
    const type: string | undefined = op?.type
    const data: any = op?.data
    const sheetId: string | undefined = data?.sheetId
    if (!type || !sheetId) return

    const isActiveSheet = sheetId === activeSheetIdRef.current

    switch (type) {
      case 'cell_update':
        handleRemoteCellUpdate({
          sheetId,
          rowId: data.rowId,
          column: data.column,
          value: data.value && typeof data.value === 'object' && 'v' in data.value ? data.value.v : data.value,
          rowIndex: data.rowIndex,
          isActiveSheet
        })
        return
      case 'cell_change': {
        const rowId = data?.rowId
        const columnId = data?.columnId ?? data?.column
        if (!rowId || !columnId) return

        const currentApp = appRef.current
        const targetSheet = currentApp?.sheets.find(sheet => sheet.id === sheetId)
        const columnName = targetSheet?.columns.find(col => col.id === columnId)?.name || columnId
        const value = data.value && typeof data.value === 'object' && 'v' in data.value ? data.value.v : data.value

        handleRemoteCellUpdate({
          sheetId,
          rowId,
          rowIndex: data?.rowIndex,
          column: columnName,
          value,
          isActiveSheet
        })
        return
      }
      case 'row_add':
        handleRemoteRowAdd({ sheetId, rowData: data.rowData, isActiveSheet })
        return
      case 'row_delete':
        handleRemoteRowDelete({ sheetId, rowId: data.rowId, isActiveSheet })
        return
      case 'column_add':
        handleRemoteColumnAdd({ sheetId, column: data.column, isActiveSheet })
        return
      case 'column_update':
        handleRemoteColumnUpdate({
          sheetId,
          columns: data.columns,
          columnId: data.columnId,
          columnPatch: data.columnPatch,
          isActiveSheet
        })
        return
      case 'column_delete':
        handleRemoteColumnDelete({ sheetId, columnId: data.columnId, isActiveSheet })
        return
      default:
        return
    }
  }, []) // No dependencies - completely stable

  const onErrorCallback = useCallback((error: Error) => {
    console.error('[SpreadsheetAppViewer] Collaboration error:', error)
  }, [])

  // Collaboration state (initialized after localSheetData to avoid race conditions)
  const {
    participants: rawParticipants,
    isConnected: isCollaborationConnected,
    emitOperation,
    emitCursor
  } = useCollaboration({
    entityType: 'spreadsheet',
    entityId: app.id,
    enabled: true,
    accessToken,
    onOperationReceived: onOperationReceivedCallback,
    onError: onErrorCallback
  })

  // Get access token for avatar fetching (use prop or fallback to localStorage)
  const authToken = accessToken || localStorage.getItem('business-app-ide-access-token') || ''
  const graphqlClient = useGraphQLClient(authToken)

  // Fetch current user info for comments
  useEffect(() => {
    const fetchCurrentUserInfo = async () => {
      try {
        const token = localStorage.getItem('business-app-ide-access-token')
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]))
          currentUserIdRef.current = payload.sub || payload.userId
          setCurrentUserName(payload.name || payload.preferred_username || 'User')

          // Fetch avatar
          if (authToken && payload.sub) {
            const query = `
              query GetCurrentUserAvatar($userId: String!) {
                Employee(where: { userId: { _eq: $userId } }) {
                  pictureThumbnail
                }
              }
            `
            const result = await graphqlClient.request<{ Employee: Array<{ pictureThumbnail: string | null }> }>(
              query,
              {
                userId: payload.sub
              }
            )

            if (result.Employee?.[0]?.pictureThumbnail) {
              const thumbnail = result.Employee[0].pictureThumbnail
              const url = thumbnail.startsWith('data:') ? thumbnail : `data:image/png;base64,${thumbnail}`
              setCurrentUserAvatar(url)
            }
          }
        }
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to fetch current user info:', error)
      }
    }

    fetchCurrentUserInfo()
  }, [authToken, graphqlClient])

  // Enriched participants for header presence (keep old behavior: resolve by Employee.userId)
  const [headerParticipants, setHeaderParticipants] = useState<DocumentParticipant[]>([])

  // Enriched participants for cell cursor indicators (more robust: Employee.userId OR Employee.id)
  const [cursorParticipants, setCursorParticipants] = useState<DocumentParticipant[]>([])

  // Fetch avatars for HEADER presence when participants change (keep old behavior)
  useEffect(() => {
    async function fetchAvatars() {
      if (!rawParticipants.length || !authToken) {
        setHeaderParticipants(rawParticipants)
        return
      }

      const userIds = [...new Set(rawParticipants.map(p => p.userId).filter(Boolean))]
      if (userIds.length === 0) {
        setHeaderParticipants(rawParticipants)
        return
      }

      try {
        const query = `
          query GetEmployeeAvatars($userIds: [String!]!) {
            Employee(where: {userId: {_in: $userIds}}) {
              userId
              pictureThumbnail
            }
          }
        `
        const result = await graphqlClient.request<{
          Employee: Array<{ userId: string; pictureThumbnail: string | null }>
        }>(query, { userIds })

        const avatarMap = new Map<string, string>()
        result?.Employee?.forEach(emp => {
          if (emp.pictureThumbnail) {
            const avatarUrl = emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
            avatarMap.set(emp.userId, avatarUrl)
          }
        })

        const enrichedParticipants = rawParticipants.map(p => ({
          ...p,
          avatarUrl: avatarMap.get(p.userId) || undefined
        }))
        setHeaderParticipants(enrichedParticipants)
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to fetch participant avatars:', error)
        setHeaderParticipants(rawParticipants)
      }
    }

    fetchAvatars()
  }, [rawParticipants, authToken, graphqlClient])

  // Fetch avatars for CELL cursor indicators (robust resolution: Employee.userId OR Employee.id)
  useEffect(() => {
    async function fetchCursorAvatars() {
      if (!rawParticipants.length || !authToken) {
        setCursorParticipants(rawParticipants)
        return
      }

      const ids = [...new Set(rawParticipants.map(p => p.userId).filter(Boolean))]
      if (ids.length === 0) {
        setCursorParticipants(rawParticipants)
        return
      }

      try {
        // IMPORTANT:
        // Employee.id is a UUID field; querying `id _in $ids` with non-UUID strings will fail the whole query.
        // So we do this in two passes:
        // 1) Always query by Employee.userId (string)
        // 2) Only query by Employee.id for ids that look like UUIDs (string UUIDs)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

        const byUserIdQuery = `
          query GetEmployeeAvatarsByUserId($userIds: [String!]!) {
            Employee(where: { userId: { _in: $userIds } }) {
              id
              userId
              pictureThumbnail
            }
          }
        `
        const byUserIdResult = await graphqlClient.request<{
          Employee: Array<{ id: string; userId: string; pictureThumbnail: string | null }>
        }>(byUserIdQuery, { userIds: ids })

        const avatarMap = new Map<string, string>()
        byUserIdResult?.Employee?.forEach(emp => {
          if (!emp.pictureThumbnail) return
          const avatarUrl = emp.pictureThumbnail.startsWith('data:')
            ? emp.pictureThumbnail
            : `data:image/png;base64,${emp.pictureThumbnail}`
          avatarMap.set(emp.userId, avatarUrl)
          avatarMap.set(emp.id, avatarUrl)
        })

        const uuidIdsMissing = ids.filter(id => uuidRegex.test(id) && !avatarMap.has(id))
        if (uuidIdsMissing.length > 0) {
          const byEmployeeIdQuery = `
            query GetEmployeeAvatarsByEmployeeId($employeeIds: [uuid!]!) {
              Employee(where: { id: { _in: $employeeIds } }) {
                id
                userId
                pictureThumbnail
              }
            }
          `
          const byEmployeeIdResult = await graphqlClient.request<{
            Employee: Array<{ id: string; userId: string; pictureThumbnail: string | null }>
          }>(byEmployeeIdQuery, { employeeIds: uuidIdsMissing })

          byEmployeeIdResult?.Employee?.forEach(emp => {
            if (!emp.pictureThumbnail) return
            const avatarUrl = emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
            avatarMap.set(emp.id, avatarUrl)
            avatarMap.set(emp.userId, avatarUrl)
          })
        }

        // Keep userName exactly as provided by collaboration; only fix avatar resolution.
        const enriched = rawParticipants.map(p => ({
          ...p,
          avatarUrl: avatarMap.get(p.userId) || undefined
        }))
        setCursorParticipants(enriched)
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to fetch cursor participant avatars:', error)
        setCursorParticipants(rawParticipants)
      }
    }

    fetchCursorAvatars()
  }, [rawParticipants, authToken, graphqlClient])

  // Stable callback to emit cursor immediately (used by EditableCell on click)
  // This is the primary way cursor is emitted for faster collaboration feedback
  const emitCursorImmediate = useCallback(
    (rowId: string, colId: string, rowIndex: number, colIndex: number) => {
      if (isCollaborationConnected) {
        emitCursor({
          path: [activeSheetId, rowId, colId],
          line: rowIndex,
          column: colIndex
        })
      }
    },
    [activeSheetId, isCollaborationConnected, emitCursor]
  )

  // Track previous sheet ID to detect actual sheet changes
  const prevSheetIdRef = React.useRef(activeSheetId)

  // Only sync from app.sheets when the sheet ID actually changes (user switches sheets)
  useEffect(() => {
    const sheetData = app.sheets.find(s => s.id === activeSheetId)?.data || []
    console.warn('[SpreadsheetAppViewer] useEffect triggered:', {
      prevId: prevSheetIdRef.current,
      currentId: activeSheetId,
      willSync: prevSheetIdRef.current !== activeSheetId,
      appSheetsRowCount: sheetData.length,
      localSheetDataRowCount: localSheetData.length
    })
    if (prevSheetIdRef.current !== activeSheetId) {
      console.warn('[SpreadsheetAppViewer] Sheet ID changed, syncing from app.sheets:', {
        prevId: prevSheetIdRef.current,
        newId: activeSheetId,
        rowCount: sheetData.length
      })
      setLocalSheetData(sheetData)
      prevSheetIdRef.current = activeSheetId
    }
  }, [activeSheetId, app.sheets])

  // Debug: Log whenever localSheetData changes
  useEffect(() => {
    console.warn('[SpreadsheetAppViewer] localSheetData CHANGED:', {
      rowCount: localSheetData.length,
      firstRowData: localSheetData[0] ? JSON.stringify(localSheetData[0]) : 'no rows'
    })
  }, [localSheetData])

  // Debug: Log whenever app prop changes
  useEffect(() => {
    const sheetData = app.sheets.find(s => s.id === activeSheetId)?.data || []
    console.warn('[SpreadsheetAppViewer] APP PROP CHANGED:', {
      appId: app.id,
      sheetsCount: app.sheets.length,
      activeSheetRowCount: sheetData.length
    })
  }, [app, activeSheetId])
  // Also keep a state copy for displaying in the formula bar (refs don't trigger re-renders)
  // null = not editing, '' = editing with empty value
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [currentFormulaDisplay, setCurrentFormulaDisplay] = useState<string | null>(null)

  useEffect(() => {
    formulaSelectionModeRef.current = formulaSelectionMode
  }, [formulaSelectionMode])

  // When entering formula selection mode, keep focus in the formula bar so users can keep typing.
  useEffect(() => {
    if (!formulaSelectionMode) return
    // Delay to allow any cell input focus side-effects to run first (e.g. from double-click / formula buttons)
    setTimeout(() => {
      const input = formulaBarInputRef.current
      if (!input) return
      input.focus()
      const len = input.value?.length ?? 0
      input.setSelectionRange(len, len)
    }, 0)
  }, [formulaSelectionMode])

  // Clear formula selected cells when exiting formula mode
  useEffect(() => {
    if (!formulaSelectionMode) {
      setFormulaSelectedCells([])
    }
  }, [formulaSelectionMode])

  // Clear formula display when selected cell changes (unless in formula mode)
  useEffect(() => {
    if (!formulaSelectionMode) {
      currentFormulaValueRef.current = ''
      setCurrentFormulaDisplay(null) // null = not editing
    }
  }, [selectedCell?.rowId, selectedCell?.colId])

  // Debounced save removed (we persist via per-row REST calls + collaboration ops)

  // Cleanup: cancel any pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Get active sheet
  const activeSheet = useMemo(
    () => app.sheets.find(s => s.id === activeSheetId) || app.sheets[0],
    [app.sheets, activeSheetId]
  )

  // Get active view
  const activeView = useMemo(() => {
    if (activeViewId) {
      return activeSheet?.views.find(v => v.id === activeViewId)
    }
    return activeSheet?.views.find(v => v.isDefault) || activeSheet?.views[0]
  }, [activeSheet, activeViewId])

  /**
   * Evaluate formulas for a row
   */
  const evaluateRowFormulas = useCallback(
    (row: Record<string, unknown>, rowIndex: number, allData: Record<string, unknown>[]): Record<string, unknown> => {
      if (!activeSheet) return row

      // IMPORTANT:
      // Excel-like references (A1, B2, ...) must match the SAME column ordering used by the table.
      // The table sorts visible columns (tracking first, then by `order`) and also prepends a row-number column.
      // Formula references should NOT count the row-number column, so we build the context using the same
      // sorted visible spreadsheet columns only.
      const columnsForFormulaIndex = activeSheet.columns
        .filter(col => col.isVisible)
        .sort((a, b) => {
          const aIsTracking = a.isTracking || isTrackingColumn(a.name)
          const bIsTracking = b.isTracking || isTrackingColumn(b.name)
          if (aIsTracking && !bIsTracking) return -1
          if (!aIsTracking && bIsTracking) return 1
          return a.order - b.order
        })

      const context: FormulaContext = {
        row,
        allRows: allData,
        columns: columnsForFormulaIndex.map(col => ({ name: col.name, id: col.id })),
        currentRowIndex: rowIndex
      }

      const updatedRow = { ...row }

      // Evaluate calculated columns
      for (const col of activeSheet.columns) {
        if (col.type === 'calculated' && col.formula) {
          try {
            const result = evaluateFormula(col.formula, context)
            updatedRow[col.name] = result
          } catch (error) {
            console.error(`Error evaluating formula for column ${col.name}:`, error)
            updatedRow[col.name] = '#ERROR!'
          }
        }
      }

      // Evaluate cell formulas (check both direct value and _formulas object)
      for (const col of activeSheet.columns) {
        // Try to get cell value by column name first, then by column ID
        const cellValue = updatedRow[col.name] ?? updatedRow[col.id]
        const formulas = updatedRow._formulas as Record<string, string> | undefined
        const formula = formulas?.[col.name] ?? formulas?.[col.id] ?? cellValue

        if (isFormula(formula)) {
          try {
            const result = evaluateFormula(formula as string, context)
            // Store the result but keep the formula in _formulas
            updatedRow[col.name] = result
            const formulasObj = (updatedRow._formulas as Record<string, string>) || {}
            formulasObj[col.name] = formula as string
            updatedRow._formulas = formulasObj
          } catch (error) {
            console.error(`Error evaluating formula in cell ${col.name}:`, error)
            updatedRow[col.name] = '#ERROR!'
            const formulasObj = (updatedRow._formulas as Record<string, string>) || {}
            formulasObj[col.name] = formula as string
            updatedRow._formulas = formulasObj
          }
        }
      }

      return updatedRow
    },
    [activeSheet]
  )

  /**
   * Recalculate all formulas in all rows
   */
  const recalculateAllFormulas = useCallback(
    (data: Record<string, unknown>[]): Record<string, unknown>[] => {
      return data.map((row, index) => evaluateRowFormulas(row, index, data))
    },
    [evaluateRowFormulas]
  )

  /**
   * Load entity data when sheet has a data source configured
   */
  const loadSheetEntityData = useCallback(async () => {
    console.log('[SpreadsheetViewer] loadSheetEntityData called', {
      hasSheet: !!activeSheet,
      hasDataSource: !!activeSheet?.entityDataSource,
      enabled: activeSheet?.entityDataSource?.enabled
    })

    if (!activeSheet?.entityDataSource?.enabled) {
      setEntityData([])
      setEntityDataError(null)
      return
    }

    setIsEntityDataLoading(true)
    setEntityDataError(null)

    try {
      console.log('[SpreadsheetViewer] Loading entity data...', activeSheet.entityDataSource)
      const result = await loadEntityData(activeSheet.entityDataSource)
      console.log('[SpreadsheetViewer] Entity data result:', result)

      if (result && result.records.length > 0) {
        // Get field mappings (or use all fields if none specified)
        const fieldMappings = activeSheet.entityDataSource.fieldMappings || []
        const includedFields = fieldMappings.filter(m => m.include)

        // Map entity records to spreadsheet format
        const mappedData = result.records.map((record, index) => {
          const mappedRow: Record<string, unknown> = {
            _id: (record.id as string) || `entity_${index}`,
            _entityType: result.entityType,
            _fetchedAt: result.fetchedAt
          }

          // If we have field mappings, use them to map entity fields to column names
          // Otherwise, just spread all entity fields
          if (includedFields.length > 0) {
            for (const mapping of includedFields) {
              // Get value from nested path (e.g., "ownerEmployee.displayName")
              const value = getNestedValue(record, mapping.entityField)
              // Use the entity field name as the key (columns will match on name)
              mappedRow[mapping.entityField] = value
              // Also map to the display label for easier matching
              mappedRow[mapping.entityFieldLabel] = value
            }
          } else {
            // No mappings - just spread all record fields
            Object.assign(mappedRow, record)
          }

          return mappedRow
        })

        console.log('[SpreadsheetViewer] Mapped data:', mappedData.slice(0, 2))
        setEntityData(mappedData)
      } else {
        console.log('[SpreadsheetViewer] No records returned')
        setEntityData([])
      }
    } catch (error) {
      console.error('[SpreadsheetViewer] Failed to load entity data:', error)
      setEntityDataError(error instanceof Error ? error.message : 'Failed to load entity data')
    } finally {
      setIsEntityDataLoading(false)
    }
  }, [activeSheet?.entityDataSource, loadEntityData])

  /**
   * Effect to load entity data when sheet changes or on mount
   */
  useEffect(() => {
    console.log('[SpreadsheetViewer] Entity data effect triggered', {
      activeSheetId,
      hasDataSource: !!activeSheet?.entityDataSource,
      enabled: activeSheet?.entityDataSource?.enabled,
      refreshMode: activeSheet?.entityDataSource?.refreshMode
    })

    if (activeSheet?.entityDataSource?.enabled) {
      // Load based on refresh mode
      const { refreshMode } = activeSheet.entityDataSource
      if (refreshMode === 'onOpen' || refreshMode === 'manual') {
        loadSheetEntityData()
      }
    } else {
      // Clear entity data if data source is disabled
      setEntityData([])
    }
  }, [
    activeSheetId,
    activeSheet?.entityDataSource?.enabled,
    activeSheet?.entityDataSource?.refreshMode,
    loadSheetEntityData
  ])

  /**
   * Manual refresh function
   */
  const handleRefreshEntityData = useCallback(() => {
    loadSheetEntityData()
  }, [loadSheetEntityData])

  /**
   * Determine which data to use - entity data or static sheet data
   * When entity data source is enabled, merge entity data with custom column data from sheet.data
   * Uses localSheetData for immediate UI updates (pending changes not yet saved)
   */
  const sourceData = useMemo(() => {
    console.warn('[SpreadsheetAppViewer] sourceData useMemo recomputing:', {
      entityEnabled: activeSheet?.entityDataSource?.enabled,
      entityDataLength: entityData.length,
      localSheetDataLength: localSheetData.length,
      firstRowKeys: localSheetData[0] ? Object.keys(localSheetData[0]) : []
    })
    if (activeSheet?.entityDataSource?.enabled && entityData.length > 0) {
      // Create a map of custom column data from localSheetData (keyed by _id)
      const customDataMap = new Map<string, Record<string, unknown>>()
      localSheetData.forEach(row => {
        if (row._id) {
          customDataMap.set(row._id as string, row)
        }
      })

      // Merge entity data with custom column data
      return entityData.map(entityRow => {
        const entityId = (entityRow._id || entityRow.id) as string
        const customData = customDataMap.get(entityId) || {}

        // Merge: entity data first, then custom column data (custom overrides entity)
        return {
          ...entityRow,
          ...customData,
          _id: entityId // Ensure _id is preserved
        }
      })
    }
    return localSheetData
  }, [activeSheet?.entityDataSource?.enabled, localSheetData, entityData])

  // Evaluate formulas for all data
  const filteredData = useMemo(() => {
    if (!activeSheet) return []

    // Recalculate all formulas
    return recalculateAllFormulas(sourceData)
  }, [activeSheet, sourceData, recalculateAllFormulas])

  /**
   * Handle row add - immediately add empty row (no modal)
   */
  const handleAddRow = useCallback(async () => {
    if (!activeSheet || !app) return

    // Create row data with default values for each column
    const rowData: Record<string, unknown> = {}

    // Add default values for each column
    activeSheet.columns.forEach(col => {
      if (col.defaultValue !== undefined) {
        rowData[col.name] = col.defaultValue
      } else {
        // Set empty string for text columns, null for others
        if (col.type === 'text' || col.type === 'email' || col.type === 'url' || col.type === 'phone') {
          rowData[col.name] = ''
        } else {
          rowData[col.name] = null
        }
      }
    })

    // Call API directly to get proper UUID (don't use onRowAdd which also updates app.sheets)
    try {
      const savedRow = await SpreadsheetApiService.addRow(app.id, activeSheet.id, rowData)
      if (savedRow) {
        // Only update localSheetData (don't touch app.sheets to prevent duplicates)
        setLocalSheetData(prev => [...prev, savedRow])

        // Broadcast to other users if collaboration is connected
        if (isCollaborationConnected) {
          emitOperation({
            type: 'row_add',
            data: {
              sheetId: activeSheet.id,
              rowData: savedRow
            }
          })
        }
      }
    } catch (err) {
      console.error('[SpreadsheetAppViewer] Failed to add row:', err)
    }
  }, [activeSheet, app, localSheetData, isCollaborationConnected, emitOperation])

  /**
   * Handle adding multiple rows (from bulk collection responses)
   */
  const handleAddRows = useCallback(
    (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => {
      console.log('[SpreadsheetAppViewer] handleAddRows ENTRY - rows:', rows.length, 'activeSheet:', !!activeSheet)

      // CRITICAL: Cancel any pending debounced saves to prevent race condition
      // where stale data overwrites the new rows we're about to add
      if (saveTimeoutRef.current) {
        console.warn('[SpreadsheetAppViewer] handleAddRows - Cancelling pending debounced save')
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      if (!activeSheet || rows.length === 0) {
        console.log('[SpreadsheetAppViewer] handleAddRows EARLY EXIT - no activeSheet or empty rows')
        return
      }

      console.log('[SpreadsheetAppViewer] handleAddRows called with', rows.length, 'rows')
      console.log('[SpreadsheetAppViewer] Row data:', JSON.stringify(rows, null, 2))

      // Internal metadata fields to skip (not user-visible columns)
      const internalMetadataFields = new Set([
        '_id',
        '_createdAt',
        '_updatedAt',
        '_workflow_id',
        '_recipient_id',
        '_isBulkCollectionPending',
        '_automationId'
      ])

      // Collect all unique field names from the incoming data
      const allFieldNames = new Set<string>()
      rows.forEach(rowData => {
        Object.keys(rowData.cells).forEach(key => {
          const isTracking = isTrackingColumn(key)
          const isMetadata = internalMetadataFields.has(key)
          console.log(
            `[SpreadsheetAppViewer] Checking field "${key}": isTrackingColumn=${isTracking}, isMetadata=${isMetadata}`
          )

          // Include tracking columns (like _recipient_name, _sent_at)
          // but skip internal metadata fields
          if (isTracking || !isMetadata) {
            allFieldNames.add(key)
          }
        })
      })

      // Using console.warn because console.log is stripped in production
      console.warn('[SpreadsheetAppViewer] All field names to process:', Array.from(allFieldNames))

      // Find fields that don't have corresponding columns
      const existingColumnIds = new Set(activeSheet.columns.map(c => c.id))
      const existingColumnNames = new Set(activeSheet.columns.map(c => c.name))
      const newFieldNames: string[] = []

      console.warn('[SpreadsheetAppViewer] Existing column IDs:', Array.from(existingColumnIds))
      console.warn('[SpreadsheetAppViewer] Existing column names:', Array.from(existingColumnNames))

      allFieldNames.forEach(fieldName => {
        // Check if field matches existing column by ID or name
        const existsById = existingColumnIds.has(fieldName)
        const existsByName = existingColumnNames.has(fieldName)
        console.warn(
          `[SpreadsheetAppViewer] Checking field "${fieldName}": existsById=${existsById}, existsByName=${existsByName}`
        )
        if (!existsById && !existsByName) {
          newFieldNames.push(fieldName)
        }
      })

      console.warn('[SpreadsheetAppViewer] New fields to create columns for:', newFieldNames)

      // Create new columns for unknown fields
      const newColumns: SpreadsheetColumn[] = newFieldNames.map((fieldName, index) => {
        // Check if this is a tracking column and get its definition
        const trackingCol = TRACKING_COLUMNS.find(tc => tc.name === fieldName)

        // Generate a user-friendly label
        let label: string
        let colType: SpreadsheetColumn['type'] = 'text'

        if (trackingCol) {
          // Use the tracking column's predefined label
          label = trackingCol.label
          // Set appropriate type for tracking columns
          if (trackingCol.id === 'sent_at' || trackingCol.id === 'responded_at') {
            colType = 'datetime'
          } else if (trackingCol.id === 'recipient_email') {
            colType = 'email'
          } else if (trackingCol.id === 'recipient_avatar') {
            colType = 'image'
          }
        } else if (fieldName === '__new__') {
          label = 'New Response Field'
        } else {
          label = fieldName
            .replace(/^col_\d+_\w+$/, 'Response')
            .replace(/^_/, '') // Remove leading underscore
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
        }

        return {
          id:
            fieldName.startsWith('col_') || fieldName === '__new__' || fieldName.startsWith('_')
              ? fieldName
              : `col_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
          name: fieldName,
          label,
          type: colType,
          isVisible: true,
          isEditable: !trackingCol, // Tracking columns are read-only
          isRequired: false,
          isUnique: false,
          isTracking: !!trackingCol,
          order: index // Will be reordered below
        }
      })

      // Update columns if needed - tracking columns first, then existing, then new non-tracking
      let updatedColumns = activeSheet.columns
      if (newColumns.length > 0 && _onAppUpdate) {
        const trackingNew = newColumns.filter(c => c.isTracking)
        const nonTrackingNew = newColumns.filter(c => !c.isTracking)
        const existingNonTracking = activeSheet.columns.filter(c => !c.isTracking)
        const existingTracking = activeSheet.columns.filter(c => c.isTracking)

        // Order: existing tracking, new tracking, existing non-tracking, new non-tracking
        updatedColumns = [...existingTracking, ...trackingNew, ...existingNonTracking, ...nonTrackingNew].map(
          (col, idx) => ({ ...col, order: idx })
        )

        console.log('[SpreadsheetAppViewer] Adding', newColumns.length, 'new columns (tracking columns first)')
      }

      // Build a map for column lookup (including new columns)
      const columnMap = new Map<string, SpreadsheetColumn>()
      updatedColumns.forEach(col => {
        columnMap.set(col.id, col)
        columnMap.set(col.name, col)
      })

      const newRows = rows.map(rowData => {
        const newRow: Record<string, unknown> = {
          _id: crypto.randomUUID(),
          _createdAt: new Date().toISOString(),
          ...rowData.metadata
        }

        // Map cell data to column names
        for (const [key, value] of Object.entries(rowData.cells)) {
          // Check if key is a column ID and convert to column name
          const column = columnMap.get(key)
          if (column) {
            newRow[column.name] = value
          } else {
            // Store as-is if no matching column (might be a metadata field)
            newRow[key] = value
          }
        }

        return newRow
      })

      console.log(
        '[SpreadsheetAppViewer] DEBUG: New columns to add:',
        newColumns.map(c => ({ id: c.id, name: c.name, label: c.label }))
      )
      console.log('[SpreadsheetAppViewer] DEBUG: New rows built:', JSON.stringify(newRows, null, 2))

      // Update local data immediately - use ref to get LATEST state (avoid stale closures from polling)
      const currentData = localSheetDataRef.current
      const newData = [...currentData, ...newRows]
      // Keep ref in sync immediately (do not wait for effect) to avoid stale overwrites
      localSheetDataRef.current = newData
      setLocalSheetData(newData)
      console.log(
        '[SpreadsheetAppViewer] DEBUG: setLocalSheetData called with',
        newData.length,
        'total rows (was',
        currentData.length,
        ')'
      )

      // IMPORTANT: Only call ONE of onDataChange or _onAppUpdate to prevent race condition
      // When we have new columns, use _onAppUpdate which includes both columns AND data
      // Otherwise, use onDataChange for just the data update
      if (newColumns.length > 0 && _onAppUpdate) {
        // We have new columns - use _onAppUpdate which saves everything at once
        console.warn(
          '[SpreadsheetAppViewer] Adding new columns to sheet, count:',
          newColumns.length,
          'columns:',
          newColumns.map(c => c.label)
        )
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns, data: newData } : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
        console.warn('[SpreadsheetAppViewer] _onAppUpdate called with new columns and data')
      } else if (_onAppUpdate) {
        // No new columns but we have _onAppUpdate - use it to avoid race condition
        console.warn('[SpreadsheetAppViewer] handleAddRows - No new columns - using _onAppUpdate for data only')
        console.warn('[SpreadsheetAppViewer] handleAddRows - newData length:', newData.length)
        console.warn(
          '[SpreadsheetAppViewer] handleAddRows - newData row IDs:',
          newData.map(r => r._id)
        )
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, data: newData } : sheet
        )
        console.warn(
          '[SpreadsheetAppViewer] handleAddRows - Calling _onAppUpdate with',
          updatedSheets[0]?.data?.length,
          'rows'
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      } else {
        // Fallback to onDataChange when _onAppUpdate is not available
        console.warn('[SpreadsheetAppViewer] Fallback to onDataChange - _onAppUpdate not available')
        onDataChange?.(activeSheet.id, newData)
      }

      console.log('[SpreadsheetAppViewer] Added', newRows.length, 'rows from bulk collection')
    },
    [activeSheet, localSheetData, onDataChange, _onAppUpdate, app]
  )

  /**
   * Handle updating existing rows (when bulk collection responses come back)
   * Finds rows by _workflow_id and updates them with response data
   * Also creates columns for tracking fields if they don't exist
   */
  const handleUpdateRows = useCallback(
    (updates: Array<{ workflowId: string; cells: Record<string, unknown> }>) => {
      // CRITICAL: Cancel any pending debounced saves to prevent race condition
      // where stale data overwrites the updates we're about to make
      if (saveTimeoutRef.current) {
        console.warn('[SpreadsheetAppViewer] handleUpdateRows - Cancelling pending debounced save')
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      if (!activeSheet || updates.length === 0) return

      // Using console.warn because console.log is stripped in production builds
      console.warn('[SpreadsheetAppViewer] handleUpdateRows called with', updates.length, 'updates')

      // Internal metadata fields to skip (not user-visible columns)
      const internalMetadataFields = new Set([
        '_id',
        '_createdAt',
        '_updatedAt',
        '_workflow_id',
        '_recipient_id',
        '_isBulkCollectionPending',
        '_automationId'
      ])

      // Collect all field names from update cells to check for missing columns
      const allFieldNames = new Set<string>()
      updates.forEach(update => {
        Object.keys(update.cells).forEach(key => {
          const isTracking = isTrackingColumn(key)
          const isMetadata = internalMetadataFields.has(key)
          // Include tracking columns but skip internal metadata
          if (isTracking || !isMetadata) {
            allFieldNames.add(key)
          }
        })
      })

      // Find fields that don't have corresponding columns
      const existingColumnIds = new Set(activeSheet.columns.map(c => c.id))
      const existingColumnNames = new Set(activeSheet.columns.map(c => c.name))
      const newFieldNames: string[] = []

      allFieldNames.forEach(fieldName => {
        if (!existingColumnIds.has(fieldName) && !existingColumnNames.has(fieldName)) {
          newFieldNames.push(fieldName)
        }
      })

      console.warn('[SpreadsheetAppViewer] handleUpdateRows - new fields needing columns:', newFieldNames)

      // Create new columns for tracking fields
      const newColumns: SpreadsheetColumn[] = newFieldNames.map((fieldName, index) => {
        const trackingCol = TRACKING_COLUMNS.find(tc => tc.name === fieldName)

        let label: string
        let colType: SpreadsheetColumn['type'] = 'text'

        if (trackingCol) {
          label = trackingCol.label
          if (trackingCol.id === 'sent_at' || trackingCol.id === 'responded_at') {
            colType = 'datetime'
          } else if (trackingCol.id === 'recipient_email') {
            colType = 'email'
          } else if (trackingCol.id === 'recipient_avatar') {
            colType = 'image'
          }
        } else {
          label = fieldName
            .replace(/^_/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
        }

        return {
          id: fieldName,
          name: fieldName,
          label,
          type: colType,
          isVisible: true,
          isEditable: !trackingCol,
          isRequired: false,
          isUnique: false,
          isTracking: !!trackingCol,
          order: index // Will be reordered below
        }
      })

      // Build updated columns list - tracking columns first, then existing, then new non-tracking
      let updatedColumns = activeSheet.columns
      if (newColumns.length > 0) {
        const trackingNew = newColumns.filter(c => c.isTracking)
        const nonTrackingNew = newColumns.filter(c => !c.isTracking)
        const existingNonTracking = activeSheet.columns.filter(c => !c.isTracking)
        const existingTracking = activeSheet.columns.filter(c => c.isTracking)

        // Order: existing tracking, new tracking, existing non-tracking, new non-tracking
        updatedColumns = [...existingTracking, ...trackingNew, ...existingNonTracking, ...nonTrackingNew].map(
          (col, idx) => ({ ...col, order: idx })
        )

        console.warn(
          '[SpreadsheetAppViewer] handleUpdateRows - adding',
          newColumns.length,
          'new columns:',
          newColumns.map(c => c.label)
        )
      }

      // Build a map of workflowId -> cells for quick lookup
      const updateMap = new Map(updates.map(u => [u.workflowId, u.cells]))

      // Update local data - find rows with matching _workflow_id
      // IMPORTANT: Use ref to get LATEST state (avoid stale closures from polling)
      const currentData = localSheetDataRef.current
      let matchCount = 0
      const newData = currentData.map(row => {
        const workflowId = row._workflow_id as string | undefined
        if (workflowId && updateMap.has(workflowId)) {
          matchCount++
          const cellUpdates = updateMap.get(workflowId)!
          console.warn('[SpreadsheetAppViewer] MATCH! Updating row with workflowId:', workflowId)
          return {
            ...row,
            ...cellUpdates,
            _updatedAt: new Date().toISOString()
          }
        }
        return row
      })

      console.warn('[SpreadsheetAppViewer] Total matches found:', matchCount, '(from', currentData.length, 'rows)')

      // CRITICAL: Only update state and save if there were ACTUAL changes
      // This prevents race conditions where polling triggers saves with stale data
      if (matchCount === 0 && newColumns.length === 0) {
        console.warn(
          '[SpreadsheetAppViewer] handleUpdateRows - NO CHANGES, skipping save to prevent stale data overwrite'
        )
        return
      }

      // Keep ref in sync immediately (do not wait for effect) to avoid stale overwrites
      localSheetDataRef.current = newData
      setLocalSheetData(newData)

      // IMPORTANT: Only call ONE of onDataChange or _onAppUpdate to prevent race condition
      // When we have new columns, use _onAppUpdate which includes both columns AND data
      // Otherwise, prefer _onAppUpdate if available to avoid stale closure issues
      if (newColumns.length > 0 && _onAppUpdate) {
        console.warn('[SpreadsheetAppViewer] handleUpdateRows - updating app with new columns')
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns, data: newData } : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      } else if (_onAppUpdate && matchCount > 0) {
        // Only save if we actually updated rows - avoid overwriting with stale data
        console.warn('[SpreadsheetAppViewer] handleUpdateRows - using _onAppUpdate for data only')
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, data: newData } : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      } else if (matchCount > 0) {
        // Fallback to onDataChange when _onAppUpdate is not available
        console.warn('[SpreadsheetAppViewer] handleUpdateRows - fallback to onDataChange')
        onDataChange?.(activeSheet.id, newData)
      }

      console.warn(
        '[SpreadsheetAppViewer] Updated rows for',
        updates.length,
        'bulk collection responses, actual updates:',
        matchCount
      )
    },
    [activeSheet, localSheetData, onDataChange, _onAppUpdate, app]
  )

  // Keep refs updated with latest handlers
  useEffect(() => {
    handleAddRowsRef.current = handleAddRows
  }, [handleAddRows])

  useEffect(() => {
    handleUpdateRowsRef.current = handleUpdateRows
  }, [handleUpdateRows])

  /**
   * Handle row update
   */
  const handleUpdateRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!activeSheet || !editingRow) return

      const newData = activeSheet.data.map(row =>
        row._id === editingRow._id ? { ...row, ...values, _updatedAt: new Date().toISOString() } : row
      )

      onDataChange?.(activeSheet.id, newData)
      setEditingRow(null)
    },
    [activeSheet, editingRow, onDataChange]
  )

  /**
   * Handle row delete
   */
  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (!activeSheet) return

      // Update local data immediately
      const newData = localSheetData.filter(row => {
        const id = row._id ?? row.id
        return id !== rowId
      })
      setLocalSheetData(newData)

      // Save to backend
      onDataChange?.(activeSheet.id, newData)
    },
    [activeSheet, localSheetData, onDataChange]
  )

  /**
   * Handle adding a new column - immediately add with default name (no modal)
   */
  const handleAddColumn = useCallback(() => {
    if (!activeSheet) return

    // Generate default column name (Column 1, Column 2, etc.)
    const existingColumnNames = activeSheet.columns.map(col => col.name.toLowerCase())
    let columnNumber = 1
    let columnName = `column_${columnNumber}`
    while (existingColumnNames.includes(columnName)) {
      columnNumber++
      columnName = `column_${columnNumber}`
    }

    const newColumn: SpreadsheetColumn = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: columnName,
      label: `Column ${columnNumber}`,
      type: 'text',
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      width: 150,
      order: activeSheet.columns.length
    }

    const updatedColumns = [...activeSheet.columns, newColumn]

    // Use dedicated sheet update endpoint for column changes (preferred)
    if (onSheetUpdate) {
      onSheetUpdate(app.id, activeSheet.id, { columns: updatedColumns })
    } else if (_onAppUpdate) {
      // Fallback to app update
      const updatedSheets = app.sheets.map(sheet => {
        if (sheet.id === activeSheet.id) {
          return {
            ...sheet,
            data: localSheetDataRef.current,
            columns: updatedColumns
          }
        }
        return sheet
      })
      _onAppUpdate({ ...app, sheets: updatedSheets })
    }

    // Emit WebSocket operation when collaboration is active
    if (isCollaborationConnected) {
      emitOperation({
        type: 'column_add',
        data: {
          sheetId: activeSheet.id,
          column: newColumn
        }
      })
    }
  }, [activeSheet, app, _onAppUpdate, onSheetUpdate, isCollaborationConnected, emitOperation])

  /**
   * Handle auto-creating a column when user edits beyond existing columns (Excel-like behavior)
   */
  const handleAutoColumnAdd = useCallback(
    async (columnIndex: number, initialValue?: unknown, rowIndex?: number) => {
      if (!activeSheet) return

      // Generate column name based on index (A=0, B=1, ..., Z=25, AA=26, etc.)
      const getColumnLetter = (idx: number): string => {
        let col = ''
        let num = idx + 1
        while (num > 0) {
          const remainder = (num - 1) % 26
          col = String.fromCharCode(65 + remainder) + col
          num = Math.floor((num - 1) / 26)
        }
        return col
      }

      const columnLetter = getColumnLetter(columnIndex)
      const columnName = `column_${columnLetter.toLowerCase()}`
      const columnLabel = `Column ${columnLetter}`

      // Check if column already exists (avoid duplicates)
      const existingColumn = activeSheet.columns.find(c => c.name === columnName || c.order === columnIndex)
      if (existingColumn) {
        // Column already exists, just save the value if provided
        if (initialValue !== undefined && rowIndex !== undefined) {
          const rowId = localSheetDataRef.current[rowIndex]?._id as string
          if (rowId) {
            handleCellChangeRef.current(rowId, existingColumn.name, initialValue)
          }
        }
        return
      }

      // Create new column
      const newColumn: SpreadsheetColumn = {
        id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        name: columnName,
        label: columnLabel,
        type: 'text',
        isVisible: true,
        isEditable: true,
        isRequired: false,
        isUnique: false,
        width: 100,
        order: columnIndex
      }

      // Fill gaps with empty columns if needed (e.g., user jumps from column D to column G)
      const columnsToAdd: SpreadsheetColumn[] = []
      for (let i = activeSheet.columns.length; i < columnIndex; i++) {
        const gapLetter = getColumnLetter(i)
        const gapColName = `column_${gapLetter.toLowerCase()}`

        // Check if this gap column already exists
        if (!activeSheet.columns.find(c => c.name === gapColName)) {
          columnsToAdd.push({
            id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_${i}`,
            name: gapColName,
            label: `Column ${gapLetter}`,
            type: 'text',
            isVisible: true,
            isEditable: true,
            isRequired: false,
            isUnique: false,
            width: 100,
            order: i
          })
        }
      }
      columnsToAdd.push(newColumn)

      const updatedColumns = [...activeSheet.columns, ...columnsToAdd]

      // Update columns via dedicated endpoint or app update
      if (onSheetUpdate) {
        await onSheetUpdate(app.id, activeSheet.id, { columns: updatedColumns })
      } else if (_onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet => {
          if (sheet.id === activeSheet.id) {
            return {
              ...sheet,
              data: localSheetDataRef.current,
              columns: updatedColumns
            }
          }
          return sheet
        })
        _onAppUpdate({ ...app, sheets: updatedSheets })
      }

      // Emit WebSocket operation for collaboration
      if (isCollaborationConnected) {
        columnsToAdd.forEach(col => {
          emitOperation({
            type: 'column_add',
            data: {
              sheetId: activeSheet.id,
              column: col
            }
          })
        })
      }

      // Save the initial cell value after column is created
      if (initialValue !== undefined && rowIndex !== undefined) {
        // Use setTimeout to ensure the column is added before saving the value
        setTimeout(() => {
          const rowId = localSheetDataRef.current[rowIndex]?._id as string
          if (rowId) {
            handleCellChangeRef.current(rowId, columnName, initialValue)
          }
        }, 100)
      }
    },
    [activeSheet, app, _onAppUpdate, onSheetUpdate, isCollaborationConnected, emitOperation]
  )

  /**
   * Handle deleting a column
   */
  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      if (!activeSheet) return

      // Don't allow deleting the last column
      if (activeSheet.columns.length <= 1) {
        return
      }

      // Remove column from columns array
      const updatedColumns = activeSheet.columns.filter(col => col.id !== columnId)

      // Remove column data from all rows
      const columnToDelete = activeSheet.columns.find(col => col.id === columnId)
      const updatedData = localSheetDataRef.current.map(row => {
        const newRow = { ...row }
        if (columnToDelete) {
          delete newRow[columnToDelete.name]
        }
        return newRow
      })

      // Update app
      const updatedSheets = app.sheets.map(sheet => {
        if (sheet.id === activeSheet.id) {
          return {
            ...sheet,
            columns: updatedColumns,
            data: updatedData
          }
        }
        return sheet
      })

      _onAppUpdate?.({ ...app, sheets: updatedSheets })

      // Emit WebSocket operation when collaboration is active
      if (isCollaborationConnected) {
        emitOperation({
          type: 'column_delete',
          data: {
            sheetId: activeSheet.id,
            columnId
          }
        })
      }
    },
    [activeSheet, app, _onAppUpdate, isCollaborationConnected, emitOperation]
  )

  /**
   * Handle renaming a column
   */
  const handleRenameColumn = useCallback(
    (columnId: string, newLabel: string) => {
      if (!activeSheet || !newLabel.trim()) {
        return
      }

      // Update column label
      const updatedColumns = activeSheet.columns.map(col => {
        if (col.id === columnId) {
          return { ...col, label: newLabel.trim() }
        }
        return col
      })

      // Use dedicated sheet update endpoint for column changes (preferred)
      if (onSheetUpdate) {
        onSheetUpdate(app.id, activeSheet.id, { columns: updatedColumns })
      } else if (_onAppUpdate) {
        // Fallback to app update if sheet update not available
        const updatedSheets = app.sheets.map(sheet => {
          if (sheet.id === activeSheet.id) {
            return {
              ...sheet,
              columns: updatedColumns
            }
          }
          return sheet
        })
        _onAppUpdate({ ...app, sheets: updatedSheets })
      }

      // Emit WebSocket operation when collaboration is active
      if (isCollaborationConnected) {
        emitOperation({
          type: 'column_update',
          data: {
            sheetId: activeSheet.id,
            columnId,
            label: newLabel.trim()
          }
        })
      }

      // Clear editing state
      setEditingColumnId(null)
      setEditingColumnLabel('')
    },
    [activeSheet, app, _onAppUpdate, onSheetUpdate, isCollaborationConnected, emitOperation]
  )

  // Ref to ensure the latest handleRenameColumn is always called from column headers
  const handleRenameColumnRef = useRef(handleRenameColumn)
  handleRenameColumnRef.current = handleRenameColumn

  // Ref to ensure the latest handleAddColumn is always called
  const handleAddColumnRef = useRef(handleAddColumn)
  handleAddColumnRef.current = handleAddColumn

  /**
   * Handle reordering columns via drag and drop
   */
  const handleReorderColumns = useCallback(
    (draggedColumnId: string, targetColumnId: string) => {
      if (!activeSheet || draggedColumnId === targetColumnId) return

      const columns = [...activeSheet.columns]
      const draggedIndex = columns.findIndex(c => c.id === draggedColumnId)
      const targetIndex = columns.findIndex(c => c.id === targetColumnId)

      if (draggedIndex === -1 || targetIndex === -1) return

      // Remove dragged column and insert at target position
      const [draggedColumn] = columns.splice(draggedIndex, 1)
      columns.splice(targetIndex, 0, draggedColumn)

      // Update order values
      const reorderedColumns = columns.map((col, idx) => ({
        ...col,
        order: idx
      }))

      // Use dedicated sheet update endpoint
      if (onSheetUpdate) {
        onSheetUpdate(app.id, activeSheet.id, { columns: reorderedColumns })
      } else if (_onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet => {
          if (sheet.id === activeSheet.id) {
            return { ...sheet, columns: reorderedColumns }
          }
          return sheet
        })
        _onAppUpdate({ ...app, sheets: updatedSheets })
      }

      // Emit WebSocket operation when collaboration is active
      if (isCollaborationConnected) {
        emitOperation({
          type: 'columns_reorder',
          data: {
            sheetId: activeSheet.id,
            columns: reorderedColumns
          }
        })
      }
    },
    [activeSheet, app, _onAppUpdate, onSheetUpdate, isCollaborationConnected, emitOperation]
  )

  // Ref for column reordering
  const handleReorderColumnsRef = useRef(handleReorderColumns)
  handleReorderColumnsRef.current = handleReorderColumns

  /**
   * Convert column index to Excel column letter (0=A, 1=B, etc.)
   */
  const columnIndexToLetter = useCallback((index: number): string => {
    let result = ''
    index += 1 // Convert to 1-based
    while (index > 0) {
      index -= 1
      result = String.fromCharCode(65 + (index % 26)) + result
      index = Math.floor(index / 26)
    }
    return result
  }, [])

  /**
   * Handle cell selection for formula input
   */
  const handleFormulaCellSelect = useCallback(
    (rowIndex: number, colIndex: number, isRangeEnd: boolean = false) => {
      const mode = formulaSelectionModeRef.current
      if (!mode || !activeSheet) return

      // Get Excel-style reference (A1, B2, etc.)
      const colLetter = columnIndexToLetter(colIndex)
      const rowNum = rowIndex + 1 // Convert to 1-based
      const cellRef = `${colLetter}${rowNum}`

      // Track selected cells for highlighting
      if (isRangeEnd && mode.startCell) {
        const rangeCells = buildRangeCells({ start: mode.startCell, end: { rowIndex, colIndex } })
        setFormulaSelectedCells(prev => [
          ...prev.filter(c => !(c.rowIndex === mode.startCell!.rowIndex && c.colIndex === mode.startCell!.colIndex)),
          ...rangeCells
        ])
        setFormulaSelectionMode({ ...mode, endCell: { rowIndex, colIndex }, isRangeSelection: true })
      } else {
        setFormulaSelectedCells(prev => [...prev, { rowIndex, colIndex }])
        setFormulaSelectionMode({ ...mode, startCell: { rowIndex, colIndex }, endCell: null, isRangeSelection: false })
      }

      // Get current formula from ref or input
      const activeCellElement = document.querySelector(
        `[data-cell-rowid="${mode.editingCell.rowId}"][data-cell-colid="${mode.editingCell.colId}"] input`
      ) as HTMLInputElement | null

      const currentFormula = activeCellElement?.value?.trim() || currentFormulaValueRef.current?.trim() || '='

      // Build new formula string
      let newFormula = currentFormula
      if (isRangeEnd && mode.startCell) {
        const startColLetter = columnIndexToLetter(mode.startCell.colIndex)
        const startRowNum = mode.startCell.rowIndex + 1
        const startRef = `${startColLetter}${startRowNum}`
        const rangeRef = `${startRef}:${cellRef}`

        // If the formula currently ends with the startRef, replace it with the rangeRef (Excel-like)
        if (newFormula.trim().endsWith(startRef)) {
          newFormula = `${newFormula.trim().slice(0, -startRef.length)}${rangeRef}`
        } else {
          newFormula = appendCellRef(newFormula, rangeRef)
        }
      } else {
        newFormula = appendCellRef(newFormula, cellRef)
      }

      // Always update the ref and state so we can save later and display properly
      currentFormulaValueRef.current = newFormula
      setCurrentFormulaDisplay(newFormula)

      // Update input if it exists
      if (activeCellElement) {
        activeCellElement.value = newFormula
        activeCellElement.dispatchEvent(new Event('input', { bubbles: true }))
      }

      // Keep typing in the formula bar (Excel-like). Clicking cells to insert references should not steal focus.
      requestAnimationFrame(() => {
        const input = formulaBarInputRef.current
        if (!input) return
        input.focus()
        input.setSelectionRange(newFormula.length, newFormula.length)
      })
    },
    [activeSheet, columnIndexToLetter, setFormulaSelectionMode]
  )

  /**
   * Handle inline cell change (Excel-like editing)
   * When entity data source is enabled, save custom column data separately in activeSheet.data
   * Uses localSheetData to accumulate rapid edits before debounced save
   */
  const handleCellChange = useCallback(
    (rowId: string, columnName: string, value: unknown) => {
      if (!activeSheet) return

      // Check if the value is a formula
      const isFormulaValue = typeof value === 'string' && value.trim().startsWith('=')

      // Check if we're using entity data source
      const isEntityDataSource = activeSheet.entityDataSource?.enabled && entityData.length > 0

      const { nextData, localRow } = computeNextLocalSheetData({
        localSheetData,
        rowId,
        columnName,
        value,
        isFormulaValue,
        isEntityDataSource
      })

      // Recalculate all formulas (in case this cell is referenced by others)
      const newData = recalculateAllFormulas(nextData)

      // Update local state immediately for responsive UI
      setLocalSheetData(newData)

      persistCellChangeToBackend({
        appId: app.id,
        sheetId: activeSheet.id,
        rowId,
        columnName,
        value,
        localRow,
        pendingBackingRowCreate: pendingBackingRowCreateRef.current,
        setLocalSheetData
      })

      // Also emit collaboration operation for real-time sync to other clients (uses UI row id)
      if (isCollaborationConnected) {
        emitOperation({
          type: 'cell_update',
          data: {
            sheetId: activeSheet.id,
            rowId,
            column: columnName,
            value
          }
        })
      }
    },
    [activeSheet, entityData, localSheetData, app.id, recalculateAllFormulas, isCollaborationConnected, emitOperation]
  )

  useEffect(() => {
    handleCellChangeRef.current = handleCellChange
  }, [handleCellChange])

  // Global keyboard handler for formula mode (Enter/Escape to finish/cancel)
  useEffect(() => {
    if (!formulaSelectionMode) return

    const handleFormulaKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()

        // Use the stored formula value from the ref
        let formulaValue = currentFormulaValueRef.current

        if (formulaValue) {
          // Auto-close parentheses if needed
          const openParens = (formulaValue.match(/\(/g) || []).length
          const closeParens = (formulaValue.match(/\)/g) || []).length
          if (openParens > closeParens) {
            formulaValue += ')'.repeat(openParens - closeParens)
          }

          console.log('[Formula] Saving formula:', formulaValue, 'to cell:', formulaSelectionMode.editingCell)

          const column = activeSheet?.columns.find(c => c.id === formulaSelectionMode.editingCell.colId)

          if (column) {
            console.log('[Formula] Found column:', column.name)
            handleCellChange(formulaSelectionMode.editingCell.rowId, column.name, formulaValue)
          } else {
            console.warn('[Formula] Column not found for id:', formulaSelectionMode.editingCell.colId)
          }
        } else {
          console.warn('[Formula] No formula value stored')
        }

        currentFormulaValueRef.current = ''
        setCurrentFormulaDisplay(null)
        setFormulaSelectionMode(null)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        currentFormulaValueRef.current = ''
        setCurrentFormulaDisplay(null)
        setFormulaSelectionMode(null)
      }
    }

    document.addEventListener('keydown', handleFormulaKeyDown, true)
    return () => document.removeEventListener('keydown', handleFormulaKeyDown, true)
  }, [formulaSelectionMode, activeSheet, handleCellChange])

  // Track if any cell is currently editing (to prevent global key handler interference)
  const isEditingRef = React.useRef(false)

  // Global keyboard handler for selected cell (Excel-like behavior)
  useEffect(() => {
    if (!selectedCell) return

    const handleGlobalKeyDown = createSpreadsheetGlobalKeyDownHandler({
      selectedCell: selectedCell as GlobalSelectedCell,
      activeSheetColumns: activeSheet?.columns || [],
      activeSheetAllowEdit: Boolean(activeSheet?.settings.allowEdit),
      isEditingEnabled: Boolean(isEditing),
      isEditingCell: isEditingRef.current,
      isFormulaSelectionMode: Boolean(formulaSelectionMode),
      filteredData,
      handleCellChange,
      emitCursorImmediate,
      setSelectedCell
    })

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [selectedCell, activeSheet, filteredData, formulaSelectionMode, handleCellChange, emitCursorImmediate])

  /**
   * Convert columns to form fields
   */
  const formFields: DynamicFormField[] = useMemo(() => {
    if (!activeSheet) return []

    return activeSheet.columns
      .filter(col => col.isVisible && col.isEditable)
      .map((col, index) => ({
        name: col.name,
        label: col.label,
        type: mapColumnTypeToFormType(col.type),
        required: col.isRequired,
        placeholder: `Enter ${col.label.toLowerCase()}`,
        order: index,
        options: col.selectOptions?.map(opt => ({
          value: opt.value,
          label: opt.label
        })),
        validation: col.validation
          ? [
              ...(col.validation.required ? [{ type: 'required' as const, message: `${col.label} is required` }] : []),
              ...(col.validation.min !== undefined ? [{ type: 'min' as const, value: col.validation.min }] : []),
              ...(col.validation.max !== undefined ? [{ type: 'max' as const, value: col.validation.max }] : [])
            ]
          : undefined
      }))
  }, [activeSheet])

  /**
   * Compute visible columns (sorted: tracking columns first, then regular columns by order)
   * Used by both tableColumns and FortuneSheetGrid
   */
  const visibleColumns = useMemo(() => {
    if (!activeSheet) return []

    return activeSheet.columns
      .filter(col => col.isVisible)
      .sort((a, b) => {
        // Determine if columns are tracking (either by flag or by name pattern)
        const aIsTracking = a.isTracking || isTrackingColumn(a.name)
        const bIsTracking = b.isTracking || isTrackingColumn(b.name)
        // Tracking columns come first
        if (aIsTracking && !bIsTracking) return -1
        if (!aIsTracking && bIsTracking) return 1
        // Then sort by order
        return a.order - b.order
      })
  }, [activeSheet])

  /**
   * Generate table columns with inline editing support
   * When entity data source is enabled:
   * - Entity columns are read-only (from the data source)
   * - Custom spreadsheet columns are editable (user-added)
   */
  const tableColumns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    if (!activeSheet) return []

    const cols: ColumnDef<Record<string, unknown>>[] = []

    // Add row number column (show row numbers)
    if (activeSheet.settings.showRowNumbers || (activeSheet.settings.allowAdd && _onAppUpdate)) {
      cols.push({
        id: 'row-number',
        header: () => (
          <div className="gba:px-3 gba:py-2.5 gba:text-[11px] gba:font-medium gba:text-muted-foreground/70 gba:text-center gba:uppercase gba:tracking-wider">
            #
          </div>
        ),
        cell: ({ row }: { row: Row<Record<string, unknown>> }) => (
          <div className="gba:px-3 gba:py-2 gba:text-xs gba:font-mono gba:text-muted-foreground/60 gba:text-center gba:select-none gba:tabular-nums">
            {row.index + 1}
          </div>
        ),
        enableSorting: false,
        enableResizing: true,
        enablePinning: false,
        size: 40,
        minSize: 30,
        maxSize: 80
      })
    }

    // If entity data source is enabled, add entity columns first (read-only)
    if (activeSheet.entityDataSource?.enabled && activeSheet.entityDataSource.fieldMappings?.length > 0) {
      const entityFieldMappings = activeSheet.entityDataSource.fieldMappings.filter(m => m.include)

      console.log(
        '[SpreadsheetViewer] Adding entity columns:',
        entityFieldMappings.map(m => m.entityFieldLabel)
      )

      entityFieldMappings.forEach(mapping => {
        cols.push({
          id: `entity_${mapping.entityField}`,
          accessorFn: (row: Record<string, unknown>) => {
            // Try entity field first, then label
            return row[mapping.entityField] ?? row[mapping.entityFieldLabel]
          },
          header: () => (
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2.5">
              <div className="gba:flex gba:items-center gba:justify-center gba:w-5 gba:h-5 gba:rounded-md gba:bg-info/15 gba:flex-shrink-0">
                <Database className="gba:w-3 gba:h-3 gba:text-info" />
              </div>
              <span className="gba:text-[13px] gba:font-medium gba:text-foreground/80 gba:truncate">
                {mapping.entityFieldLabel || mapping.entityField}
              </span>
            </div>
          ),
          cell: ({ row }: { row: Row<Record<string, unknown>> }) => {
            const value = row.original[mapping.entityField] ?? row.original[mapping.entityFieldLabel]

            // For entity data, display values directly (read-only)
            return (
              <div className="gba:px-2 gba:py-1 gba:bg-muted/30 gba:text-sm">
                {value === null || value === undefined ? (
                  <span className="gba:text-muted-foreground">—</span>
                ) : typeof value === 'boolean' ? (
                  value ? (
                    '✓'
                  ) : (
                    '✗'
                  )
                ) : typeof value === 'object' ? (
                  <span className="gba:text-muted-foreground gba:text-xs">{JSON.stringify(value)}</span>
                ) : (
                  String(value)
                )}
              </div>
            )
          }
        })
      })
    }

    // Add custom spreadsheet columns (editable)
    // Note: visibleColumns is now computed in a separate useMemo hook above
    visibleColumns.forEach((col, idx) => {
      // IMPORTANT:
      // `colIndex` is used for Excel-like references (A1, B2, ...) and MUST NOT include the row-number column.
      // Therefore it starts at 0 for the first visible spreadsheet column.
      const colIndex = idx
      const isTrackingCol = col.isTracking || isTrackingColumn(col.name)

      cols.push({
        id: col.id,
        accessorFn: (row: Record<string, unknown>) => row[col.name],
        size: col.width || 150,
        minSize: 60,
        maxSize: 500,
        enableResizing: true,
        header: () => (
          <ColumnHeader
            col={col}
            isTrackingCol={isTrackingCol}
            isEditing={editingColumnIdRef.current === col.id}
            editingLabel={editingColumnIdRef.current === col.id ? editingColumnLabelRef.current : col.label}
            onStartEditing={() => {
              setEditingColumnId(col.id)
              setEditingColumnLabel(col.label)
            }}
            onLabelChange={setEditingColumnLabel}
            onFinishEditing={save => {
              if (!save) {
                setEditingColumnId(null)
                setEditingColumnLabel('')
              }
            }}
            onRenameColumn={(colId, newLabel) => handleRenameColumnRef.current(colId, newLabel)}
            canEdit={!!_onAppUpdate}
            hasEntityDataSource={!!activeSheet.entityDataSource?.enabled}
            columnsCount={activeSheet.columns.length}
            onDeleteColumn={handleDeleteColumn}
            onReorderColumn={(draggedId, targetId) => handleReorderColumnsRef.current(draggedId, targetId)}
          />
        ),
        cell: ({ row }: { row: Row<Record<string, unknown>> }) => {
          const value = row.original[col.name]
          const rowId = (row.original._id ?? row.original.id ?? row.id) as string

          // Special rendering for avatar column (image type with tracking)
          if (col.type === 'image' && isTrackingCol) {
            const avatarUrl = normalizeImageSrc(value as string | undefined)
            return (
              <div
                className={`gba:px-2 gba:py-1 gba:flex gba:items-center gba:justify-center ${isTrackingCol ? 'gba:bg-muted/20' : ''}`}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="gba:w-8 gba:h-8 gba:rounded-full gba:object-cover gba:border gba:border-border"
                  />
                ) : (
                  <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                    <User className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          }

          // Tracking columns are read-only with subtle background
          if (isTrackingCol) {
            const displayValue =
              value !== undefined && value !== null && value !== ''
                ? col.type === 'datetime' && value
                  ? new Date(String(value)).toLocaleString()
                  : String(value)
                : '—'
            return <div className="gba:px-2 gba:py-1 gba:bg-muted/20 gba:text-sm">{displayValue}</div>
          }

          // Use EditableCell for inline editing like Excel
          return (
            <EditableCell
              value={value}
              column={col}
              rowId={rowId}
              rowIndex={row.index}
              colIndex={colIndex}
              onSave={handleCellChange}
              isEditable={isEditing && activeSheet.settings.allowEdit && col.type !== 'calculated'}
              allRows={filteredData}
              columns={activeSheet.columns}
              onFormulaCellSelect={handleFormulaCellSelect}
              formulaSelectionMode={formulaSelectionMode}
              setFormulaSelectionMode={setFormulaSelectionMode}
              selectedCell={selectedCell}
              setSelectedCell={setSelectedCell}
              onFormulaValueChange={(value: string) => {
                currentFormulaValueRef.current = value
                setCurrentFormulaDisplay(value)
              }}
              formulaSelectedCells={formulaSelectedCells}
              onEditingStateChange={editing => {
                isEditingRef.current = editing
              }}
              participants={cursorParticipants}
              onCursorEmit={emitCursorImmediate}
              accessToken={accessToken}
            />
          )
        }
      })
    })

    // Add "Add Column" button column (only if user can edit)
    if (_onAppUpdate) {
      cols.push({
        id: 'add-column',
        header: () => (
          <div className="gba:px-2 gba:py-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={e => {
                e.stopPropagation()
                handleAddColumnRef.current()
              }}
              className="gba:h-7 gba:w-7 gba:p-0 gba:rounded-md hover:gba:bg-accent gba:transition-colors gba:duration-150 gba:border gba:border-dashed gba:border-border/50 hover:gba:border-primary/30"
              title="Add Column"
              data-testid="add-column-header-button"
            >
              <Plus className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            </Button>
          </div>
        ),
        cell: () => null, // Empty cell
        enableSorting: false,
        enableResizing: false,
        enablePinning: false,
        size: 48,
        minSize: 48,
        maxSize: 48
      })
    }

    // Add actions column (minimal - just delete button)
    if (activeSheet.settings.allowDelete) {
      cols.push({
        id: 'actions',
        header: '',
        size: 40,
        minSize: 40,
        maxSize: 40,
        enableResizing: false,
        enablePinning: false,
        cell: ({ row }: { row: Row<Record<string, unknown>> }) => (
          <div className="gba:flex gba:items-center gba:justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-6 gba:w-6 gba:opacity-30 hover:gba:opacity-100"
              onClick={e => {
                e.stopPropagation()
                handleDeleteRow(row.original._id as string)
              }}
            >
              <Trash2 className="gba:w-3.5 gba:h-3.5 gba:text-destructive" />
            </Button>
          </div>
        )
      })
    }

    return cols
  }, [
    activeSheet,
    visibleColumns,
    handleDeleteRow,
    handleCellChange,
    filteredData,
    handleFormulaCellSelect,
    formulaSelectionMode,
    // selectedCell is needed to trigger cell re-renders for selection highlighting
    selectedCell,
    cursorParticipants,
    emitCursorImmediate,
    // Column editing state - needed to trigger re-renders when editing state changes
    // Using refs for stable closures inside the header function
    editingColumnId,
    editingColumnLabel,
    handleRenameColumn,
    handleDeleteColumn,
    _onAppUpdate
  ])

  if (!activeSheet) {
    return (
      <Card className="gba:p-8 gba:text-center">
        <p className="gba:text-muted-foreground">No sheets available</p>
      </Card>
    )
  }

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:min-w-0"
      style={{ width: '100%', maxWidth: '100vw', overflow: 'hidden' }}
      data-testid={testId}
    >
      {/* Modern Header */}
      <div className="gba:flex-shrink-0 gba:min-w-0 gba:w-full gba:overflow-hidden gba:bg-gradient-to-r gba:from-background gba:to-muted/30">
        {/* Top Navigation Bar */}
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
              <div className="gba:flex gba:items-center gba:gap-2">
                {/* Collaboration presence indicator - shows active users */}
                {headerParticipants.length > 0 && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded-full gba:bg-success/10 gba:border gba:border-success/20">
                    <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-success gba:animate-pulse" />
                    <PresenceIndicator participants={headerParticipants} maxVisible={3} size="sm" showLabel={false} />
                    <span className="gba:text-xs gba:font-medium gba:text-success-foreground">
                      {headerParticipants.length} active
                    </span>
                  </div>
                )}

                {/* Connection status indicator - shows when connected but alone */}
                {headerParticipants.length === 0 && isCollaborationConnected && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1 gba:rounded-full gba:bg-success/10 gba:border gba:border-success/20 gba:cursor-default">
                          <Signal className="gba:w-3.5 gba:h-3.5 gba:text-success" />
                          <span className="gba:text-xs gba:font-medium gba:text-success-foreground">Live</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Real-time collaboration active. Others will appear when they join.</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}

                {/* Entity data source indicator */}
                {activeSheet?.entityDataSource?.enabled && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1 gba:rounded-full gba:bg-info/10 gba:border gba:border-info/20">
                          <Database className="gba:w-3.5 gba:h-3.5 gba:text-info" />
                          <span className="gba:text-xs gba:font-medium gba:text-info-foreground gba:max-w-[120px] gba:truncate">
                            {activeSheet.entityDataSource.entityDisplayName}
                          </span>
                          <button
                            type="button"
                            onClick={handleRefreshEntityData}
                            disabled={isEntityDataLoading}
                            className="gba:p-0.5 gba:rounded gba:hover:bg-info/20 gba:transition-colors gba:disabled:opacity-50"
                          >
                            {isEntityDataLoading ? (
                              <Loader2 className="gba:w-3 gba:h-3 gba:text-info gba:animate-spin" />
                            ) : (
                              <RefreshCw className="gba:w-3 gba:h-3 gba:text-info" />
                            )}
                          </button>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Connected to {activeSheet.entityDataSource.entityDisplayName} data source</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>

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
                    onManualSave={() => setShowCheckpointDialog(true)}
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
                    {comments.unresolvedCount > 0 && (
                      <Badge variant="warning" className="gba:ml-1 gba:px-1 gba:py-0 gba:h-4 gba:text-xs">
                        {comments.unresolvedCount}
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
                  <StatusBadge status={publishing.metadata?.status || 'draft'} />
                </div>
              )}

              <div className="gba:h-6 gba:w-px gba:bg-border/50" />

              {/* Spreadsheet Actions Menu */}
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gba:h-8">
                      <FileSpreadsheet className="gba:w-4 gba:h-4 gba:mr-2" />
                      Spreadsheet
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setShowVersionHistory(true)}>
                      <History className="gba:w-4 gba:h-4 gba:mr-2" />
                      Version History
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowCheckpointDialog(true)}>
                      <Save className="gba:w-4 gba:h-4 gba:mr-2" />
                      Save Checkpoint
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {fileLock.isLockedByMe ? (
                      <DropdownMenuItem onClick={() => fileLock.releaseLock()}>
                        <Unlock className="gba:w-4 gba:h-4 gba:mr-2" />
                        Unlock Spreadsheet
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem onClick={() => fileLock.acquireLock()}>
                        <Lock className="gba:w-4 gba:h-4 gba:mr-2" />
                        Lock Spreadsheet
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setShowPublishDialog(true)}>
                      <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                      Publish...
                    </DropdownMenuItem>
                    {activeSheet.settings.allowExport && (
                      <DropdownMenuItem>
                        <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                        Export to Excel
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    {_onAppUpdate && (
                      <>
                        <DropdownMenuItem onClick={handleAddColumn}>
                          <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                          Add Column
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setIsManageColumnsDialogOpen(true)}>
                          <Columns className="gba:w-4 gba:h-4 gba:mr-2" />
                          Manage Columns
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={() => setIsAutomationsOpen(true)}>
                      <Zap className="gba:w-4 gba:h-4 gba:mr-2" />
                      Automations
                    </DropdownMenuItem>
                    {onEdit && (
                      <DropdownMenuItem onClick={onEdit}>
                        <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                        Settings
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </div>
        </div>

        {/* Automations Panel - Modern slide-over drawer */}
        {isAutomationsOpen &&
          createPortal(
            <div className="gba:fixed gba:inset-0" style={{ zIndex: 999999 }}>
              {/* Backdrop overlay with fade */}
              <div
                className="gba:absolute gba:inset-0 gba:bg-black/30 gba:backdrop-blur-[2px] gba:transition-opacity"
                onClick={() => setIsAutomationsOpen(false)}
                style={{ zIndex: 999999 }}
              />
              {/* Modern drawer panel */}
              <div
                className="gba:absolute gba:top-0 gba:right-0 gba:bottom-0 gba:w-[560px] gba:max-w-[90vw] gba:bg-background gba:border-l gba:border-border/50 gba:overflow-hidden gba:flex gba:flex-col"
                style={{ zIndex: 1000000, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
              >
                {/* Modern drawer header */}
                <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-3.5 gba:border-b gba:border-border/50 gba:bg-gradient-to-r gba:from-muted/30 gba:to-transparent">
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-gradient-to-br gba:from-primary/20 gba:to-primary/5 gba:flex gba:items-center gba:justify-center gba:border gba:border-primary/20">
                      <Zap className="gba:w-4.5 gba:h-4.5 gba:text-primary" />
                    </div>
                    <div>
                      <h2 className="gba:text-base gba:font-semibold gba:text-foreground">Automations</h2>
                      <p className="gba:text-xs gba:text-muted-foreground">Automate workflows and actions</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsAutomationsOpen(false)}
                    className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-muted"
                  >
                    <X className="gba:w-4 gba:h-4" />
                  </Button>
                </div>
                {/* Content area */}
                <div className="gba:flex-1 gba:overflow-auto gba:p-5">
                  <AutomationsHub
                    automations={automations}
                    executionHistory={executionHistory}
                    workflowLinks={workflowLinks}
                    isLoading={isAutomationsLoading}
                    onCreateAutomation={() => {
                      setEditingAutomation(null)
                      setIsAutomationWizardOpen(true)
                    }}
                    onEditAutomation={automation => {
                      setEditingAutomation(automation)
                      setIsAutomationWizardOpen(true)
                    }}
                    onDeleteAutomation={async id => {
                      await deleteAutomation(id)
                    }}
                    onToggleAutomation={toggleAutomation}
                    onDuplicateAutomation={async id => {
                      await duplicateAutomation(id)
                    }}
                    onRunAutomation={async id => {
                      // Pass all rows with their data to run automation
                      // Map sheet data to expected format: { id, cells }
                      const rows = activeSheet.data.map(row => ({
                        id: String(row._id || row.id || ''),
                        cells: row
                      }))
                      await runAutomation(id, rows)
                    }}
                    onRefresh={refreshWorkflowStatuses}
                    data-testid={`${testId}-automations-hub`}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Automation Wizard Dialog */}
        <AutomationWizard
          isOpen={isAutomationWizardOpen}
          onClose={() => {
            setIsAutomationWizardOpen(false)
            setEditingAutomation(null)
          }}
          columns={activeSheet.columns}
          existingAutomation={editingAutomation ?? undefined}
          accessToken={accessToken}
          onSave={async automation => {
            if (editingAutomation) {
              await updateAutomation(editingAutomation.id, automation)
            } else {
              await createAutomation(automation)
            }
            setIsAutomationWizardOpen(false)
            setEditingAutomation(null)
          }}
          spreadsheetId={app.id}
          sheetId={activeSheetId}
          data-testid={`${testId}-automation-wizard`}
        />

        {/* Sheet tabs - Modern tab bar */}
        {app.sheets.length > 1 && (
          <div className="gba:px-4 gba:border-t gba:border-border/50 gba:w-full gba:overflow-hidden gba:bg-muted/10">
            <div className="gba:flex gba:items-center gba:gap-0.5 gba:py-1.5 gba:w-full gba:overflow-x-auto">
              {app.sheets.map(sheet => {
                const isActive = sheet.id === activeSheetId
                const hasEntitySource = sheet.entityDataSource?.enabled
                const dataCount = isActive && hasEntitySource ? entityData.length : sheet.data.length

                return (
                  <button
                    key={sheet.id}
                    type="button"
                    className={`gba:group gba:relative gba:flex gba:items-center gba:gap-2 gba:px-3.5 gba:py-2 gba:text-sm gba:rounded-t-lg gba:transition-all gba:duration-200 ${
                      isActive
                        ? 'gba:bg-background gba:text-foreground gba:font-medium gba:shadow-sm gba:border gba:border-b-0 gba:border-border/50 gba:-mb-px gba:z-10'
                        : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/30'
                    }`}
                    onClick={() => setActiveSheetId(sheet.id)}
                  >
                    {hasEntitySource ? (
                      <Database
                        className={`gba:w-3.5 gba:h-3.5 gba:flex-shrink-0 ${isActive ? 'gba:text-info' : 'gba:text-muted-foreground gba:group-hover:text-info'}`}
                      />
                    ) : (
                      <Layers
                        className={`gba:w-3.5 gba:h-3.5 gba:flex-shrink-0 ${isActive ? 'gba:text-primary' : 'gba:text-muted-foreground gba:group-hover:text-primary'}`}
                      />
                    )}
                    <span className="gba:truncate gba:max-w-[120px]">{sheet.name}</span>
                    <span
                      className={`gba:text-xs gba:px-1.5 gba:py-0.5 gba:rounded-full gba:tabular-nums ${
                        isActive
                          ? 'gba:bg-primary/10 gba:text-primary'
                          : 'gba:bg-muted gba:text-muted-foreground gba:group-hover:bg-muted/70'
                      }`}
                    >
                      {dataCount}
                    </span>
                    {/* Active indicator line */}
                    {isActive && (
                      <div className="gba:absolute gba:bottom-0 gba:left-2 gba:right-2 gba:h-0.5 gba:bg-primary gba:rounded-full" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Entity data status bar - Modern compact design */}
      {activeSheet?.entityDataSource?.enabled && (
        <div className="gba:px-4 gba:py-1.5 gba:border-b gba:border-border/30 gba:bg-gradient-to-r gba:from-muted/30 gba:to-transparent gba:w-full gba:overflow-hidden gba:flex-shrink-0">
          {isEntityDataLoading && (
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-full gba:bg-muted/50 gba:border gba:border-border/50">
                <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin gba:text-muted-foreground" />
                <span className="gba:text-xs gba:text-muted-foreground">Syncing...</span>
              </div>
              <span className="gba:text-xs gba:text-muted-foreground">
                Loading from {activeSheet.entityDataSource.entityDisplayName}
              </span>
            </div>
          )}
          {entityDataError && (
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-full gba:bg-destructive/10 gba:border gba:border-destructive/20">
                <AlertCircle className="gba:w-3.5 gba:h-3.5 gba:text-destructive" />
                <span className="gba:text-xs gba:font-medium gba:text-destructive">Sync failed</span>
              </div>
              <span className="gba:text-xs gba:text-muted-foreground">{entityDataError}</span>
              <button
                type="button"
                onClick={handleRefreshEntityData}
                className="gba:text-xs gba:text-primary gba:hover:underline"
              >
                Retry
              </button>
            </div>
          )}
          {!isEntityDataLoading && !entityDataError && entityData.length > 0 && (
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-full gba:bg-success/10 gba:border gba:border-success/20">
                  <div className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-success gba:animate-pulse" />
                  <span className="gba:text-xs gba:font-medium gba:text-success-foreground">Synced</span>
                </div>
                <span className="gba:text-xs gba:text-muted-foreground">
                  <span className="gba:font-semibold gba:text-foreground">{entityData.length}</span> records from{' '}
                  <span className="gba:font-medium gba:text-foreground">
                    {activeSheet.entityDataSource.entityDisplayName}
                  </span>
                </span>
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={handleRefreshEntityData}
                      className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/50 gba:transition-colors"
                    >
                      <RefreshCw className="gba:w-3 gba:h-3" />
                      <span className="gba:hidden sm:gba:inline">Refresh</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Refresh data from source</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
          {!isEntityDataLoading && !entityDataError && entityData.length === 0 && (
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-full gba:bg-warning/10 gba:border gba:border-warning/20">
                <AlertCircle className="gba:w-3.5 gba:h-3.5 gba:text-warning" />
                <span className="gba:text-xs gba:font-medium gba:text-warning-foreground">No data</span>
              </div>
              <span className="gba:text-xs gba:text-muted-foreground">No records found matching your filters</span>
              {onEdit && (
                <button type="button" onClick={onEdit} className="gba:text-xs gba:text-primary gba:hover:underline">
                  Edit filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:overflow-hidden gba:relative">
        {activeView?.type === 'table' ? (
          <div className="gba:flex-1 gba:min-w-0 gba:min-h-0 gba:overflow-hidden gba:absolute gba:inset-0">
            <TableView
              sheet={activeSheet}
              data={filteredData}
              columns={tableColumns}
              spreadsheetColumns={visibleColumns}
              testId={`${testId}-table`}
              onAddRow={activeSheet.settings.allowAdd ? handleAddRow : undefined}
              showAddRow={false}
              onCellChange={handleCellChange}
              onColumnAdd={handleAutoColumnAdd}
              onDataChange={async newData => {
                // CRITICAL: Compare against filteredData (what FortuneSheetGrid sees)
                // NOT localSheetData (which includes hidden/filtered rows)
                if (newData.length > filteredData.length) {
                  const addedRows = newData.slice(filteredData.length)

                  // Create each new row in the backend
                  const createdRows: Record<string, unknown>[] = []
                  for (const row of addedRows) {
                    try {
                      const rowData: Record<string, unknown> = {}
                      activeSheet.columns.forEach(col => {
                        const value = row[col.name] ?? col.defaultValue ?? ''
                        if (value !== '' && value !== undefined && value !== null) {
                          rowData[col.name] = value
                        }
                      })

                      const createdRow = await SpreadsheetApiService.addRow(app.id, activeSheet.id, rowData)
                      createdRows.push({ ...row, _id: createdRow._id })
                    } catch (err) {
                      console.error('[SpreadsheetAppViewer] Failed to create row:', err)
                    }
                  }

                  // Append new rows to localSheetData (don't replace with filtered view)
                  setLocalSheetData(prev => [...prev, ...createdRows])
                }
              }}
              participants={cursorParticipants}
              onOperationEmit={emitOperation}
              onCursorEmit={emitCursor}
              collaborationEnabled={isCollaborationConnected}
              isReadOnly={!isEditing || (!!fileLock.lock?.isLocked && !fileLock.isLockedByMe)}
              gridRef={fortuneSheetGridRef}
            />
          </div>
        ) : (
          <div className="gba:flex-1 gba:overflow-auto gba:p-6">
            {activeView?.type === 'form' && (
              <FormView
                sheet={activeSheet}
                data={filteredData}
                onEdit={setEditingRow}
                onDelete={handleDeleteRow}
                testId={`${testId}-form`}
              />
            )}

            {activeView?.type === 'dashboard' && (
              <DashboardView sheet={activeSheet} data={filteredData} testId={`${testId}-dashboard`} />
            )}

            {activeView?.type === 'kanban' && (
              <KanbanView
                sheet={activeSheet}
                data={filteredData}
                view={activeView}
                onEdit={setEditingRow}
                testId={`${testId}-kanban`}
              />
            )}
          </div>
        )}
      </div>

      {/* Edit Row Dialog */}
      <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Row</DialogTitle>
          </DialogHeader>
          {editingRow && (
            <DynamicFormGenerator
              schema={formFields}
              initialValues={editingRow}
              onSubmit={handleUpdateRow}
              submitButtonText="Save Changes"
              showCard={false}
              accessToken={accessToken}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Columns Dialog */}
      <Dialog
        open={isManageColumnsDialogOpen}
        onOpenChange={open => {
          if (open) {
            // Initialize editing columns when opening dialog
            setEditingColumns(activeSheet.columns.map(c => ({ ...c })))
          } else {
            // Reset to original columns when closing without saving
            setEditingColumns([])
          }
          setIsManageColumnsDialogOpen(open)
        }}
      >
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Columns className="gba:w-5 gba:h-5" />
              Manage Columns
            </DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-3 gba:max-h-[500px] gba:overflow-y-auto">
            {(() => {
              // Initialize editing columns when dialog opens
              const columnsToEdit =
                editingColumns.length > 0 ? editingColumns : activeSheet.columns.length > 0 ? activeSheet.columns : []

              if (columnsToEdit.length === 0) {
                return (
                  <p className="gba:text-muted-foreground gba:text-center gba:py-4">
                    No custom columns. Click "Add Column" to create one.
                  </p>
                )
              }

              return columnsToEdit.map(column => {
                const updateColumnField = (field: keyof SpreadsheetColumn, value: unknown) => {
                  setEditingColumns(prev =>
                    prev.length > 0
                      ? prev.map(c => (c.id === column.id ? { ...c, [field]: value } : c))
                      : activeSheet.columns.map(c => (c.id === column.id ? { ...c, [field]: value } : c))
                  )
                }

                return (
                  <Card key={column.id} className="gba:p-4">
                    <div className="gba:space-y-4">
                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                        <div className="gba:space-y-2">
                          <Label htmlFor={`column-label-${column.id}`}>Column Name</Label>
                          <Input
                            id={`column-label-${column.id}`}
                            value={column.label}
                            onChange={e => updateColumnField('label', e.target.value)}
                            placeholder="Column name"
                          />
                        </div>
                        <div className="gba:space-y-2">
                          <Label htmlFor={`column-type-${column.id}`}>Data Type</Label>
                          <Select
                            value={column.type}
                            onValueChange={(value: ColumnType) => updateColumnField('type', value)}
                          >
                            <SelectTrigger id={`column-type-${column.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="datetime">Date & Time</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="url">URL</SelectItem>
                              <SelectItem value="select">Single Select</SelectItem>
                              <SelectItem value="multiselect">Multi Select</SelectItem>
                              <SelectItem value="boolean">Checkbox</SelectItem>
                              <SelectItem value="calculated">Calculated</SelectItem>
                              <SelectItem value="reference">Reference</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:border-t">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Badge variant="secondary" className="gba:text-xs">
                            {column.name}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateColumnField('isVisible', !column.isVisible)}
                            className="gba:text-xs"
                          >
                            {column.isVisible ? (
                              <>
                                <Eye className="gba:w-3 gba:h-3 gba:mr-1" />
                                Visible
                              </>
                            ) : (
                              <>
                                <EyeOff className="gba:w-3 gba:h-3 gba:mr-1" />
                                Hidden
                              </>
                            )}
                          </Button>
                        </div>
                        {columnsToEdit.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingColumns(prev =>
                                prev.length > 0
                                  ? prev.filter(c => c.id !== column.id)
                                  : activeSheet.columns.filter(c => c.id !== column.id)
                              )
                            }}
                            className="gba:text-destructive hover:gba:text-destructive"
                          >
                            <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingColumns([])
                setIsManageColumnsDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsManageColumnsDialogOpen(false)
                handleAddColumn()
              }}
            >
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Column
            </Button>
            <Button
              onClick={() => {
                // Save all changes
                const finalColumns = editingColumns.length > 0 ? editingColumns : activeSheet.columns
                const updatedSheets = app.sheets.map(sheet =>
                  sheet.id === activeSheet.id
                    ? {
                        ...sheet,
                        // Preserve latest local data to prevent stale overwrites when column config saves race with row updates
                        data: localSheetDataRef.current,
                        columns: finalColumns
                      }
                    : sheet
                )
                _onAppUpdate?.({ ...app, sheets: updatedSheets })

                // Emit WebSocket operation when collaboration is active
                if (isCollaborationConnected) {
                  emitOperation({
                    type: 'column_update',
                    data: {
                      sheetId: activeSheet.id,
                      columns: finalColumns
                    }
                  })
                }

                setEditingColumns([])
                setIsManageColumnsDialogOpen(false)
              }}
            >
              <Save className="gba:w-4 gba:h-4 gba:mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Versioning Dialogs */}
      {showVersionHistory && (
        <VersionHistory
          versions={versioning.versions}
          isLoading={versioning.isLoading}
          onRestore={async versionNumber => {
            console.log('[SpreadsheetAppViewer] Restoring to version:', versionNumber)

            // Get the version data first
            const versionData = await SpreadsheetApiService.getVersion(app.id, versionNumber)
            console.log('[SpreadsheetAppViewer] Version data retrieved:', versionData)

            if (!versionData) {
              console.error('[SpreadsheetAppViewer] Failed to get version data')
              return
            }

            // Now restore on backend
            const success = await versioning.restoreVersion(versionNumber)
            console.log('[SpreadsheetAppViewer] Backend restore result:', success)

            if (success) {
              console.log('[SpreadsheetAppViewer] Restore succeeded!')
              console.log('[SpreadsheetAppViewer] Reloading app from backend...')

              // Reload the app from backend to get restored data
              // Reload versions first
              await versioning.loadVersions()

              // Close dialog
              setShowVersionHistory(false)

              console.log('[SpreadsheetAppViewer] Restore complete! Reloading page...')

              // Automatically reload page to show restored data
              setTimeout(() => {
                window.location.reload()
              }, 500)
            } else {
              console.error('[SpreadsheetAppViewer] Restore failed')
              alert('Failed to restore version. Check console for details.')
            }
          }}
          onClose={() => setShowVersionHistory(false)}
          currentVersion={versioning.currentVersion?.version}
          showAutoSaves={false}
          data-testid="spreadsheet-version-history"
        />
      )}

      {showCheckpointDialog && (
        <CheckpointDialog
          isOpen={showCheckpointDialog}
          onClose={() => setShowCheckpointDialog(false)}
          onSave={async description => {
            await versioning.createCheckpoint(description)
          }}
          isSaving={versioning.isSaving}
          data-testid="spreadsheet-checkpoint-dialog"
        />
      )}

      {showPublishDialog && (
        <PublishDialog
          isOpen={showPublishDialog}
          onClose={() => setShowPublishDialog(false)}
          onPublish={async (publishNotes, createCheckpoint) => {
            await publishing.publish(publishNotes, createCheckpoint)
          }}
          isPublishing={publishing.isPublishing}
          entityType="spreadsheet"
          data-testid="spreadsheet-publish-dialog"
        />
      )}

      {showComments && (
        <CommentPanel
          comments={comments.comments}
          unresolvedCount={comments.unresolvedCount}
          isLoading={comments.isLoading}
          onCreateComment={async (content, parentId, userName, userAvatar) => {
            await comments.createComment({
              type: parentId ? 'document' : 'cell',
              content,
              parentId,
              createdByName: userName,
              createdByAvatar: userAvatar
            })
          }}
          onUpdateComment={async (commentId, content) => {
            await comments.updateComment(commentId, { content })
          }}
          onResolveComment={async commentId => {
            await comments.resolveComment(commentId)
          }}
          onDeleteComment={async commentId => {
            await comments.deleteComment(commentId)
          }}
          onClose={() => setShowComments(false)}
          currentUserId={userId}
          currentUserName={currentUserName || 'User'}
          currentUserAvatar={currentUserAvatar || undefined}
          accessToken={authToken}
          headerHeight={100}
          data-testid="spreadsheet-comment-panel"
        />
      )}
    </div>
  )
}

/**
 * ColumnHeader Component - Handles inline column name editing and drag-drop reordering
 * Extracted to prevent full column re-creation when editing state changes
 */
interface ColumnHeaderProps {
  col: SpreadsheetColumn
  isTrackingCol: boolean
  isEditing: boolean
  editingLabel: string
  onStartEditing: () => void
  onLabelChange: (label: string) => void
  onFinishEditing: (save: boolean) => void
  onRenameColumn: (columnId: string, newLabel: string) => void
  canEdit: boolean
  hasEntityDataSource: boolean
  columnsCount: number
  onDeleteColumn: (columnId: string) => void
  onReorderColumn?: (draggedId: string, targetId: string) => void
}

const ColumnHeader: React.FC<ColumnHeaderProps> = ({
  col,
  isTrackingCol,
  isEditing,
  editingLabel,
  onStartEditing,
  onLabelChange,
  onFinishEditing,
  onRenameColumn,
  canEdit,
  hasEntityDataSource,
  columnsCount,
  onDeleteColumn,
  onReorderColumn
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  // Track if we're in the middle of committing to prevent double-actions
  const isCommittingRef = useRef(false)
  // Track if this is an intentional blur (from save/cancel) vs accidental (from re-render)
  const intentionalBlurRef = useRef(false)
  // Keep track of the latest label value to avoid stale closures
  const latestLabelRef = useRef(editingLabel)
  latestLabelRef.current = editingLabel

  // Drag and drop state
  const [isDragging, setIsDragging] = useState(false)
  const [isDragOver, setIsDragOver] = useState(false)

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      // Reset flags when editing starts
      isCommittingRef.current = false
      intentionalBlurRef.current = false
      // Use multiple frames to ensure DOM is fully ready after potential re-renders
      const focusInput = () => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus()
          // Place cursor at the end of the text instead of selecting all
          const len = inputRef.current.value.length
          inputRef.current.setSelectionRange(len, len)
        }
      }
      // Try immediately
      focusInput()
      // Then retry after a frame
      requestAnimationFrame(focusInput)
      // And once more after a short delay for extra reliability
      const timeoutId = setTimeout(focusInput, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [isEditing])

  const handleSave = useCallback(() => {
    if (isCommittingRef.current) {
      return
    }
    isCommittingRef.current = true
    intentionalBlurRef.current = true
    // Get the CURRENT value from the input element directly to avoid stale closures
    const currentValue = inputRef.current?.value ?? latestLabelRef.current
    if (currentValue.trim()) {
      onRenameColumn(col.id, currentValue.trim())
    } else {
      onFinishEditing(false)
    }
  }, [col.id, onRenameColumn, onFinishEditing])

  const handleCancel = useCallback(() => {
    if (isCommittingRef.current) return
    isCommittingRef.current = true
    intentionalBlurRef.current = true
    onFinishEditing(false)
  }, [onFinishEditing])

  const handleBlur = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      // Only handle blur if it's not from an intentional action and we're not in the middle of committing
      if (isCommittingRef.current || intentionalBlurRef.current) return

      // Check if focus is moving to another element inside the header (like the dropdown)
      const relatedTarget = e.relatedTarget as HTMLElement
      if (relatedTarget && e.currentTarget.closest('.gba\\:group')?.contains(relatedTarget)) {
        return
      }

      // Delay the blur handling slightly to allow for re-focus during re-renders
      setTimeout(() => {
        // If we're still editing and the input still exists, this was likely an accidental blur from re-render
        if (inputRef.current && document.activeElement !== inputRef.current && !isCommittingRef.current) {
          handleSave()
        }
      }, 100)
    },
    [handleSave]
  )

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent) => {
    if (isTrackingCol || !canEdit || !onReorderColumn) return
    e.dataTransfer.setData('text/plain', col.id)
    e.dataTransfer.effectAllowed = 'move'
    setIsDragging(true)
  }

  const handleDragEnd = () => {
    setIsDragging(false)
    setIsDragOver(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (isTrackingCol || !canEdit || !onReorderColumn) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    if (isTrackingCol || !canEdit || !onReorderColumn) return
    e.preventDefault()
    const draggedId = e.dataTransfer.getData('text/plain')
    if (draggedId && draggedId !== col.id) {
      onReorderColumn(draggedId, col.id)
    }
    setIsDragOver(false)
  }

  return (
    <div
      className={`gba:flex gba:items-center gba:justify-between gba:w-full gba:group gba:px-2 gba:py-2 gba:transition-all gba:duration-150 ${
        isTrackingCol ? 'gba:bg-gradient-to-r gba:from-info/15 gba:to-transparent' : ''
      } ${isDragging ? 'gba:opacity-50' : ''} ${isDragOver ? 'gba:bg-primary/10 gba:border-l-2 gba:border-primary' : ''} ${
        canEdit && !isTrackingCol && !isEditing ? 'gba:cursor-grab active:gba:cursor-grabbing' : ''
      }`}
      draggable={canEdit && !isTrackingCol && !isEditing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="gba:flex gba:items-center gba:gap-1 gba:flex-1 gba:min-w-0">
        {/* Drag handle indicator - only shows on hover, very compact */}
        {canEdit && !isTrackingCol && !isEditing && (
          <div className="gba:w-0 gba:overflow-hidden group-hover:gba:w-4 gba:transition-all gba:duration-150 gba:flex-shrink-0">
            <GripVertical className="gba:w-3 gba:h-3 gba:text-muted-foreground/50" />
          </div>
        )}
        {isTrackingCol && (
          <div className="gba:flex gba:items-center gba:justify-center gba:w-4 gba:h-4 gba:rounded gba:bg-info/20 gba:flex-shrink-0">
            <Activity className="gba:w-2.5 gba:h-2.5 gba:text-info" />
          </div>
        )}
        {hasEntityDataSource && !isTrackingCol && (
          <div className="gba:flex gba:items-center gba:justify-center gba:w-4 gba:h-4 gba:rounded gba:bg-success/15 gba:flex-shrink-0">
            <Database className="gba:w-2.5 gba:h-2.5 gba:text-success" />
          </div>
        )}
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editingLabel}
            onChange={e => onLabelChange(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                e.stopPropagation()
                handleSave()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                handleCancel()
              }
            }}
            onClick={e => e.stopPropagation()}
            onMouseDown={e => e.stopPropagation()}
            onFocus={e => e.stopPropagation()}
            className="gba:h-7 gba:px-2 gba:py-0 gba:text-[13px] gba:font-medium gba:min-w-[80px] gba:w-full gba:border gba:border-primary/40 gba:rounded-md gba:bg-background gba:outline-none gba:ring-2 gba:ring-primary/20 gba:shadow-sm"
          />
        ) : (
          <span
            className={`gba:truncate gba:text-[13px] gba:transition-all gba:duration-150 ${
              isTrackingCol
                ? 'gba:text-info gba:font-semibold gba:text-[11px] gba:uppercase gba:tracking-widest'
                : 'gba:font-medium gba:text-foreground/80'
            } ${
              canEdit && !isTrackingCol
                ? 'gba:cursor-text hover:gba:text-foreground gba:rounded-md gba:px-1.5 gba:py-0.5 gba:-mx-1.5 hover:gba:bg-accent/50'
                : ''
            }`}
            onClick={e => {
              if (canEdit && !isTrackingCol) {
                e.stopPropagation()
                e.preventDefault()
                onStartEditing()
              }
            }}
            onMouseDown={e => {
              if (canEdit && !isTrackingCol) {
                e.stopPropagation()
              }
            }}
            title={canEdit && !isTrackingCol ? 'Click to rename' : undefined}
          >
            {col.label}
          </span>
        )}
      </div>
      {canEdit && columnsCount > 1 && !isTrackingCol && !isEditing && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="gba:h-5 gba:w-5 gba:p-0 gba:rounded gba:opacity-0 group-hover:gba:opacity-100 gba:flex-shrink-0 gba:transition-opacity gba:duration-150 hover:gba:bg-accent gba:ml-1"
            >
              <MoreVertical className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="gba:min-w-[140px]">
            <DropdownMenuItem onClick={() => onDeleteColumn(col.id)} className="gba:text-destructive gba:gap-2">
              <Trash2 className="gba:w-4 gba:h-4" />
              Delete Column
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}

type FormulaSelectionMode = {
  editingCell: { rowId: string; colId: string }
  startCell: { rowIndex: number; colIndex: number } | null
  endCell: { rowIndex: number; colIndex: number } | null
  isRangeSelection: boolean
} | null

/**
 * Editable Cell Component - Excel-like behavior
 * Single click = select, Double click = edit, Type when selected = replace
 */
interface EditableCellProps {
  value: unknown
  column: SpreadsheetColumn
  rowId: string
  rowIndex: number
  colIndex: number
  onSave: (rowId: string, columnName: string, value: unknown) => void
  isEditable: boolean
  allRows: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
  onFormulaCellSelect?: (rowIndex: number, colIndex: number, isRangeEnd?: boolean) => void
  formulaSelectionMode: FormulaSelectionMode
  setFormulaSelectionMode: (mode: FormulaSelectionMode) => void
  selectedCell: { rowId: string; colId: string; rowIndex: number; colIndex: number } | null
  setSelectedCell: (cell: { rowId: string; colId: string; rowIndex: number; colIndex: number } | null) => void
  onFormulaValueChange?: (value: string) => void
  formulaSelectedCells: Array<{ rowIndex: number; colIndex: number }>
  onEditingStateChange?: (isEditing: boolean) => void
  participants?: import('../shared/services/CollaborationClient').DocumentParticipant[]
  /** Emit cursor position immediately on cell selection (for faster collaboration) */
  onCursorEmit?: (rowId: string, colId: string, rowIndex: number, colIndex: number) => void
  /** Access token for API calls */
  accessToken?: string
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  column,
  rowId,
  rowIndex,
  colIndex,
  onSave,
  isEditable,
  allRows,
  onFormulaCellSelect,
  formulaSelectionMode,
  setFormulaSelectionMode,
  selectedCell,
  setSelectedCell,
  onFormulaValueChange,
  formulaSelectedCells,
  onEditingStateChange,
  participants = [],
  onCursorEmit,
  accessToken = ''
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [originalValue, setOriginalValue] = useState<string>('')
  const [editValue, setEditValue] = useState('')
  const [showLinkEditor, setShowLinkEditor] = useState(false)

  // Notify parent when editing state changes
  useEffect(() => {
    onEditingStateChange?.(isEditing)
  }, [isEditing, onEditingStateChange])

  // Get the row to check for stored formulas
  const currentRow = allRows.find(r => r._id === rowId || r.id === rowId)
  const formulas = currentRow?._formulas as Record<string, string> | undefined
  const storedFormula = formulas?.[column.name]
  const hasFormula = Boolean(storedFormula)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const cellRef = React.useRef<HTMLDivElement>(null)
  const isCommittingRef = React.useRef(false)
  // Track if editing started from typing (vs double-click)
  const startedFromTypingRef = React.useRef(false)

  // Check if this cell is selected (but not editing)
  const isSelected = selectedCell?.rowId === rowId && selectedCell?.colId === column.id

  // Focus the cell when it becomes selected (for keyboard events)
  useEffect(() => {
    if (isSelected && !isEditing && cellRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        cellRef.current?.focus()
      }, 0)
    }
  }, [isSelected, isEditing])

  // Check if we're in formula selection mode (this is the cell being edited)
  const isInFormulaMode =
    formulaSelectionMode !== null &&
    formulaSelectionMode.editingCell.rowId === rowId &&
    formulaSelectionMode.editingCell.colId === column.id

  const canEdit = isEditable && column.isEditable

  // Focus input when editing starts
  React.useLayoutEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Only select all if started from double-click, not from typing
      if (startedFromTypingRef.current) {
        // Position cursor at end - use setTimeout to ensure it happens after browser's default focus behavior
        setTimeout(() => {
          if (inputRef.current) {
            const len = inputRef.current.value.length
            inputRef.current.setSelectionRange(len, len)
          }
        }, 0)
        startedFromTypingRef.current = false
      } else {
        inputRef.current.select()
      }
    }
  }, [isEditing])

  // Handle selection click (single click)
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    // If in formula selection mode, handle that instead
    if (formulaSelectionMode && !isInFormulaMode) {
      if (onFormulaCellSelect) {
        onFormulaCellSelect(rowIndex, colIndex, e.shiftKey)
      }
      return
    }

    // Emit cursor immediately for faster collaboration feedback
    onCursorEmit?.(rowId, column.id, rowIndex, colIndex)

    // Select this cell
    setSelectedCell({ rowId, colId: column.id, rowIndex, colIndex })

    // Focus the cell div so it can receive keyboard events
    cellRef.current?.focus()
  }

  // Handle double click to enter edit mode
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit) return

    // Check if there's a startChar from keyboard typing or formula button
    const startChar = cellRef.current?.dataset.startChar
    if (startChar) {
      // Clear the attribute
      delete cellRef.current.dataset.startChar
      // Mark that we started from typing (not double-click)
      startedFromTypingRef.current = true
      // Start editing with the typed character/formula
      setOriginalValue(storedFormula || String(value ?? ''))
      setEditValue(startChar)
      setIsEditing(true)
      setShowLinkEditor(false) // Don't show link editor when typing

      // If it's a formula, enter formula selection mode and store the value
      if (startChar.trim().startsWith('=')) {
        if (onFormulaValueChange) {
          onFormulaValueChange(startChar)
        }
        setFormulaSelectionMode({
          editingCell: { rowId, colId: column.id },
          startCell: null,
          endCell: null,
          isRangeSelection: false
        })
      }
    } else {
      startEditing(false) // false = don't clear content
    }
  }

  // Start editing - optionally clear content (when typing while selected)
  const startEditing = (clearContent: boolean = false) => {
    if (!canEdit) return

    const initialValue = clearContent ? '' : storedFormula || String(value ?? '')
    setOriginalValue(storedFormula || String(value ?? ''))
    setEditValue(initialValue)
    setIsEditing(true)

    // Check if the value is a markdown link - if so, show link editor
    if (!clearContent && (isMarkdownLink(initialValue) || isValidUrl(initialValue))) {
      setShowLinkEditor(true)
    } else {
      setShowLinkEditor(false)
    }
  }

  // Save the cell value
  const handleSave = () => {
    if (isCommittingRef.current) return
    isCommittingRef.current = true

    let convertedValue: unknown = editValue

    if (isFormula(editValue)) {
      convertedValue = editValue
    } else if (column.type === 'number' || column.type === 'currency' || column.type === 'percentage') {
      convertedValue = editValue === '' ? null : Number(editValue)
    } else if (column.type === 'boolean') {
      convertedValue = editValue.toLowerCase() === 'true' || editValue === '1'
    }

    onSave(rowId, column.name, convertedValue)
    setIsEditing(false)

    setTimeout(() => {
      isCommittingRef.current = false
    }, 0)
  }

  // Navigate to adjacent cell
  const navigateToCell = (direction: 'up' | 'down' | 'left' | 'right') => {
    let targetRow = rowIndex
    let targetCol = colIndex

    switch (direction) {
      case 'up':
        targetRow = Math.max(0, rowIndex - 1)
        break
      case 'down':
        targetRow = rowIndex + 1
        break
      case 'left':
        targetCol = Math.max(0, colIndex - 1)
        break
      case 'right':
        targetCol = colIndex + 1
        break
    }

    // Skip if we're already at the boundary and not moving
    if (targetRow === rowIndex && targetCol === colIndex) {
      return
    }

    const targetCell = document.querySelector(
      `[data-cell-row="${targetRow}"][data-cell-col="${targetCol}"]`
    ) as HTMLElement

    if (targetCell) {
      const targetRowId = targetCell.dataset.cellRowid
      const targetColId = targetCell.dataset.cellColid
      if (targetRowId && targetColId) {
        // Emit cursor immediately for collaboration
        onCursorEmit?.(targetRowId, targetColId, targetRow, targetCol)
        // Update selection
        setSelectedCell({ rowId: targetRowId, colId: targetColId, rowIndex: targetRow, colIndex: targetCol })
        targetCell.focus()
      }
    }
  }

  // Handle keyboard events when cell is selected (not editing)
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) return

    // Don't handle if link editor is open
    if (showLinkEditor) return

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        navigateToCell('up')
        return
      case 'ArrowDown':
        e.preventDefault()
        navigateToCell('down')
        return
      case 'ArrowLeft':
        e.preventDefault()
        navigateToCell('left')
        return
      case 'ArrowRight':
        e.preventDefault()
        navigateToCell('right')
        return
      case 'Tab':
        e.preventDefault()
        navigateToCell(e.shiftKey ? 'left' : 'right')
        return
      case 'Enter':
      case 'F2':
        e.preventDefault()
        if (canEdit) startEditing(false)
        return
      case 'Delete':
      case 'Backspace':
        e.preventDefault()
        if (canEdit) onSave(rowId, column.name, '')
        return
      case 'Escape':
        e.preventDefault()
        setSelectedCell(null)
        return
      default:
        break
    }

    const isCopy = (e.ctrlKey || e.metaKey) && e.key === 'c'
    if (isCopy) {
      e.preventDefault()
      navigator.clipboard.writeText(String(value ?? ''))
      return
    }

    const isPaste = (e.ctrlKey || e.metaKey) && e.key === 'v'
    if (isPaste) {
      e.preventDefault()
      if (!canEdit) return
      navigator.clipboard.readText().then(text => {
        const processedText = isValidUrl(text) ? urlToMarkdown(text) : text
        onSave(rowId, column.name, processedText)
      })
      return
    }

    const isPrintable = e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey
    if (isPrintable && canEdit) {
      e.preventDefault()
      startedFromTypingRef.current = true
      setOriginalValue(storedFormula || String(value ?? ''))
      setEditValue(e.key)
      setIsEditing(true)
    }
  }

  // Handle keyboard events when editing
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    const isFormulaInput = editValue.trim().startsWith('=')

    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (isFormulaInput && formulaSelectionMode) {
        setFormulaSelectionMode(null)
      }
      handleSave()
      // Move to next row after save
      setTimeout(() => navigateToCell('down'), 0)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setFormulaSelectionMode(null)
      setEditValue(originalValue)
      setIsEditing(false)
      // Keep cell selected
      cellRef.current?.focus()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      handleSave()
      setTimeout(() => navigateToCell(e.shiftKey ? 'left' : 'right'), 0)
    } else if (e.key === 'ArrowUp') {
      // Arrow up - save and navigate up
      e.preventDefault()
      e.stopPropagation()
      handleSave()
      setTimeout(() => navigateToCell('up'), 0)
    } else if (e.key === 'ArrowDown') {
      // Arrow down - save and navigate down
      e.preventDefault()
      e.stopPropagation()
      handleSave()
      setTimeout(() => navigateToCell('down'), 0)
    } else if (e.key === 'ArrowLeft') {
      // Only navigate if cursor is at the beginning
      const input = e.target as HTMLInputElement
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault()
        e.stopPropagation()
        handleSave()
        setTimeout(() => navigateToCell('left'), 0)
      }
    } else if (e.key === 'ArrowRight') {
      // Only navigate if cursor is at the end
      const input = e.target as HTMLInputElement
      if (input.selectionStart === input.value.length) {
        e.preventDefault()
        e.stopPropagation()
        handleSave()
        setTimeout(() => navigateToCell('right'), 0)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBlur = (_e: React.FocusEvent<HTMLInputElement>) => {
    if (isCommittingRef.current) return

    // Don't save if link editor is open (user is editing link)
    if (showLinkEditor) {
      return
    }

    // Don't save if in formula mode (clicking other cells)
    if (formulaSelectionMode && isInFormulaMode) {
      // Keep edit session open, but NEVER steal focus back.
      // Formula mode should be driven from the formula bar input.
      return
    }

    handleSave()
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setEditValue(newValue)

    // Hide link editor if user is typing (they want to edit raw markdown)
    if (showLinkEditor) {
      setShowLinkEditor(false)
    }

    // Update the formula value at viewer level for formula mode
    if (newValue.trim().startsWith('=') && onFormulaValueChange) {
      onFormulaValueChange(newValue)
    }

    if (newValue.trim().startsWith('=') && !formulaSelectionMode) {
      setFormulaSelectionMode({
        editingCell: { rowId, colId: column.id },
        startCell: null,
        endCell: null,
        isRangeSelection: false
      })
    } else if (!newValue.trim().startsWith('=') && formulaSelectionMode && isInFormulaMode) {
      setFormulaSelectionMode(null)
    }
  }

  // Handle link editor save
  const handleLinkEditorSave = (markdownLink: string) => {
    setEditValue(markdownLink)
    // Save immediately with the new markdown link value
    if (isCommittingRef.current) return
    isCommittingRef.current = true

    onSave(rowId, column.name, markdownLink)
    setIsEditing(false)
    setShowLinkEditor(false)

    setTimeout(() => {
      isCommittingRef.current = false
    }, 0)
  }

  // Handle link editor cancel
  const handleLinkEditorCancel = () => {
    setShowLinkEditor(false)
    setIsEditing(false)
  }

  // Check if this cell is selected in formula mode (for highlighting)
  // Use the formulaSelectedCells array to highlight ALL selected cells
  const isSelectedInFormula =
    formulaSelectionMode !== null &&
    !isInFormulaMode &&
    formulaSelectedCells.some(cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex)

  // Check if another user is editing this cell
  const collaboratorEditingCell = useMemo(() => {
    const found = participants.find(p => {
      const path = p.cursor?.path
      if (!path || path.length < 3) return false
      const [, cursorRowId, cursorColId] = path
      const matches = cursorRowId === rowId && cursorColId === column.id
      return matches
    })

    return found
  }, [participants, rowId, column.id])

  return (
    <div
      ref={cellRef}
      tabIndex={0}
      onClick={handleSelect}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
      className={`gba:relative gba:py-1 gba:px-2 gba:min-h-[28px] gba:outline-none ${
        isSelected && !isEditing ? 'gba:ring-2 gba:ring-primary gba:ring-inset' : ''
      } ${canEdit && !isEditing && !isSelected ? 'gba:cursor-cell hover:gba:bg-muted/20' : ''} ${
        isInFormulaMode && isEditing ? 'gba:ring-2 gba:ring-primary gba:ring-inset gba:bg-primary/5' : ''
      } ${isSelectedInFormula ? 'gba:ring-2 gba:ring-info gba:ring-inset gba:bg-info/5' : ''}`}
      data-testid={`cell-${rowId}-${column.id}`}
      data-cell-row={rowIndex}
      data-cell-col={colIndex}
      data-cell-rowid={rowId}
      data-cell-colid={column.id}
    >
      {/* Show collaborator indicator if someone else is editing this cell */}
      {collaboratorEditingCell && !isEditing && (
        <CellCollaboratorIndicator
          userName={collaboratorEditingCell.userName}
          userColor={collaboratorEditingCell.userColor}
          avatarUrl={collaboratorEditingCell.avatarUrl}
          isActive={true}
          showLabel={false}
        />
      )}
      {isEditing ? (
        <div className="gba:relative" onKeyDown={e => showLinkEditor && e.stopPropagation()}>
          {showLinkEditor ? (
            <LinkEditor
              value={editValue}
              onSave={handleLinkEditorSave}
              onCancel={handleLinkEditorCancel}
              accessToken={accessToken}
              data-testid={`link-editor-${rowId}-${column.id}`}
            />
          ) : (
            <>
              <Input
                ref={inputRef}
                autoFocus
                value={editValue}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                onBlur={handleBlur}
                className="gba:h-[26px] gba:py-0 gba:px-1 gba:text-sm gba:min-w-[40px] gba:border-primary gba:rounded-none"
                data-testid={`cell-input-${rowId}-${column.id}`}
              />
              {editValue.trim().startsWith('=') && (
                <span className="gba:absolute gba:right-1 gba:top-1/2 gba:-translate-y-1/2 gba:text-[10px] gba:text-muted-foreground">
                  fx
                </span>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="gba:flex gba:items-center gba:gap-1 gba:select-none gba:text-sm">
          {hasFormula && (
            <span className="gba:text-[10px] gba:text-muted-foreground" title={storedFormula}>
              =
            </span>
          )}
          {formatCellValue(value, column)}
        </div>
      )}
    </div>
  )
}

/**
 * Table View Component with inline editing
 */
interface TableViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  columns: ColumnDef<Record<string, unknown>>[]
  spreadsheetColumns: SpreadsheetColumn[]
  testId: string
  onCellChange?: (rowId: string, columnName: string, value: unknown) => void
  isEditable?: boolean
  onAddRow?: () => void
  showAddRow?: boolean
  onDataChange?: (data: Record<string, unknown>[]) => void
  /** Callback when a new column needs to be auto-created */
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  participants?: DocumentParticipant[]
  onOperationEmit?: (operation: any) => void
  onCursorEmit?: (position: { path: string[] }) => void
  collaborationEnabled?: boolean
  isReadOnly?: boolean
  /** Ref to access FortuneSheetGrid imperative methods */
  gridRef?: React.RefObject<FortuneSheetGridHandle | null>
}

const TableView: React.FC<TableViewProps> = ({
  sheet,
  data,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  columns,
  spreadsheetColumns,
  testId,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAddRow,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  showAddRow,
  onCellChange,
  onDataChange,
  onColumnAdd,
  participants,
  onOperationEmit,
  onCursorEmit,
  collaborationEnabled,
  isReadOnly,
  gridRef
}) => {
  // Handle cell change from FortuneSheet
  const handleCellChange = useCallback(
    (rowId: string, columnId: string, value: unknown) => {
      if (onCellChange) {
        // Call parent callback
        onCellChange(rowId, columnId, value)
      }
    },
    [onCellChange]
  )

  // Handle data change from FortuneSheet
  const handleDataChange = useCallback(
    (newData: Record<string, unknown>[]) => {
      if (onDataChange) {
        onDataChange(newData)
      }
    },
    [onDataChange]
  )

  return (
    <div className="gba:relative gba:w-full gba:h-full gba:min-w-0 gba:absolute gba:inset-0" data-testid={testId}>
      <FortuneSheetGrid
        ref={gridRef}
        sheet={sheet}
        data={data}
        columns={spreadsheetColumns}
        isReadOnly={isReadOnly || false}
        onCellChange={handleCellChange}
        onDataChange={handleDataChange}
        onColumnAdd={onColumnAdd}
        participants={participants}
        onOperationEmit={onOperationEmit}
        onCursorEmit={onCursorEmit}
        collaborationEnabled={collaborationEnabled}
        height="100%"
        width="100%"
      />
    </div>
  )
}

/**
 * Form View Component (Card-based records)
 */
interface FormViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  onEdit: (row: Record<string, unknown>) => void
  onDelete: (rowId: string) => void
  testId: string
}

const FormView: React.FC<FormViewProps> = ({ sheet, data, onEdit, onDelete, testId }) => {
  const visibleColumns = sheet.columns.filter(c => c.isVisible)

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4" data-testid={testId}>
      {data.map(row => (
        <Card key={row._id as string} className="gba:p-4">
          <div className="gba:space-y-3">
            {visibleColumns.slice(0, 5).map(col => (
              <div key={col.id}>
                <p className="gba:text-xs gba:text-muted-foreground">{col.label}</p>
                <p className="gba:text-sm gba:font-medium gba:text-foreground">{formatCellValue(row[col.name], col)}</p>
              </div>
            ))}
          </div>
          <div className="gba:flex gba:gap-2 gba:mt-4 gba:pt-4 gba:border-t">
            <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
              <Pencil className="gba:w-4 gba:h-4 gba:mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(row._id as string)}>
              <Trash2 className="gba:w-4 gba:h-4 gba:mr-1 gba:text-destructive" />
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Dashboard View Component
 */
interface DashboardViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  testId: string
}

const DashboardView: React.FC<DashboardViewProps> = ({ sheet, data, testId }) => {
  // Calculate KPIs
  const numericColumns = sheet.columns.filter(c => ['number', 'currency', 'percentage'].includes(c.type))

  const kpis = numericColumns.slice(0, 4).map(col => {
    const values = data.map(row => Number(row[col.name])).filter(v => !isNaN(v))

    const sum = values.reduce((a, b) => a + b, 0)
    const avg = values.length > 0 ? sum / values.length : 0

    return {
      label: col.label,
      value: col.type === 'currency' ? `$${sum.toLocaleString()}` : sum.toLocaleString(),
      subValue: `Avg: ${col.type === 'currency' ? '$' : ''}${avg.toFixed(2)}`,
      type: col.type
    }
  })

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* KPI Cards */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="gba:p-6">
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">{kpi.label}</p>
            <p className="gba:text-2xl gba:font-bold gba:text-foreground">{kpi.value}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{kpi.subValue}</p>
          </Card>
        ))}
      </div>

      {/* Placeholder for charts */}
      <Card className="gba:p-6">
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64 gba:bg-muted/20 gba:rounded-lg">
          <div className="gba:text-center">
            <BarChart3 className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-3" />
            <p className="gba:text-muted-foreground">Charts visualization coming soon</p>
          </div>
        </div>
      </Card>

      {/* Data summary */}
      <Card className="gba:p-6">
        <h3 className="gba:font-semibold gba:text-foreground gba:mb-4">Data Summary</h3>
        <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Total Records</p>
            <p className="gba:text-xl gba:font-semibold">{data.length}</p>
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Columns</p>
            <p className="gba:text-xl gba:font-semibold">{sheet.columns.length}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Kanban View Component
 */
interface KanbanViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  view: SheetView
  onEdit: (row: Record<string, unknown>) => void
  testId: string
}

const KanbanView: React.FC<KanbanViewProps> = ({ sheet, data, view, onEdit, testId }) => {
  if (view.config.type !== 'kanban') {
    return null
  }

  const { statusColumn, titleColumn, descriptionColumn } = view.config
  const statusCol = sheet.columns.find(c => c.name === statusColumn || c.id === statusColumn)

  if (!statusCol) {
    return (
      <Card className="gba:p-8 gba:text-center">
        <p className="gba:text-muted-foreground">Status column not found for Kanban view</p>
      </Card>
    )
  }

  // Get unique status values
  const statuses =
    statusCol.selectOptions?.map(o => o.value) ||
    [...new Set(data.map(row => String(row[statusCol.name] || '')))].filter(Boolean)

  // Group data by status
  const groupedData = statuses.reduce(
    (acc, status) => {
      acc[status] = data.filter(row => String(row[statusCol.name]) === status)
      return acc
    },
    {} as Record<string, Record<string, unknown>[]>
  )

  return (
    <div className="gba:flex gba:gap-4 gba:overflow-x-auto gba:pb-4" data-testid={testId}>
      {statuses.map(status => {
        const statusOption = statusCol.selectOptions?.find(o => o.value === status)
        const items = groupedData[status] || []

        return (
          <div key={status} className="gba:flex-shrink-0 gba:w-80 gba:bg-muted/30 gba:rounded-lg gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div
                  className="gba:w-3 gba:h-3 gba:rounded-full"
                  style={{ backgroundColor: statusOption?.color || '#888' }}
                />
                <h3 className="gba:font-medium gba:text-foreground">{statusOption?.label || status}</h3>
              </div>
              <Badge variant="secondary">{items.length}</Badge>
            </div>

            <div className="gba:space-y-3">
              {items.map(row => (
                <Card
                  key={row._id as string}
                  className="gba:p-4 gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow"
                  onClick={() => onEdit(row)}
                >
                  <p className="gba:font-medium gba:text-foreground gba:mb-1">
                    {String(row[titleColumn] || 'Untitled')}
                  </p>
                  {descriptionColumn && Boolean(row[descriptionColumn]) && (
                    <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2">
                      {String(row[descriptionColumn])}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Map column type to form field type
 */
function mapColumnTypeToFormType(type: string): DynamicFormField['type'] {
  const mapping: Record<string, DynamicFormField['type']> = {
    text: 'TEXT',
    number: 'NUMBER',
    currency: 'NUMBER',
    percentage: 'NUMBER',
    date: 'DATE',
    datetime: 'DATETIME',
    email: 'EMAIL',
    phone: 'TEXT',
    url: 'URL',
    select: 'SELECT',
    multiselect: 'MULTISELECT',
    boolean: 'CHECKBOX',
    calculated: 'TEXT',
    reference: 'SELECT'
  }

  return mapping[type] || 'TEXT'
}

/**
 * Check if a value is a workflow status and return badge variant
 */
function getStatusBadgeVariant(value: string): 'success' | 'warning' | 'destructive' | 'info' | 'secondary' | null {
  const normalizedValue = value.toLowerCase().trim()

  // Success statuses
  if (['completed', 'submitted', 'approved', 'done', 'finished', 'success'].includes(normalizedValue)) {
    return 'success'
  }

  // Warning statuses (in progress)
  if (['sent', 'pending', 'waiting', 'in progress', 'in_progress', 'running', 'processing'].includes(normalizedValue)) {
    return 'warning'
  }

  // Error/failure statuses
  if (['failed', 'error', 'rejected', 'cancelled', 'canceled', 'timeout', 'timed_out'].includes(normalizedValue)) {
    return 'destructive'
  }

  // Info statuses
  if (['draft', 'new', 'created'].includes(normalizedValue)) {
    return 'info'
  }

  return null
}

/**
 * Format cell value for display
 */
function isEmptyCellValue(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

function isFormulaErrorValue(value: unknown): boolean {
  return value === '#ERROR!' || (typeof value === 'string' && value.startsWith('#ERROR'))
}

function renderStatusBadgeIfNeeded(
  value: unknown,
  column: SpreadsheetColumn,
  isStatusColumn?: boolean
): React.ReactNode | null {
  if (typeof value !== 'string') return null
  const isStatusByName = column.name?.toLowerCase().includes('status') || column.label?.toLowerCase().includes('status')
  if (!isStatusColumn && !isStatusByName) return null

  const badgeVariant = getStatusBadgeVariant(value)
  if (!badgeVariant) return null

  return (
    <Badge variant={badgeVariant} className="gba:font-medium">
      {value}
    </Badge>
  )
}

function renderMarkdownOrUrlValue(value: string): React.ReactNode | null {
  const linkData = parseMarkdownLink(value)
  if (linkData) {
    return (
      <a
        href={linkData.url}
        target="_blank"
        rel="noopener noreferrer"
        className="gba:text-primary gba:hover:underline"
        onClick={e => e.stopPropagation()}
        title={linkData.url}
      >
        {linkData.title}
      </a>
    )
  }

  if (isValidUrl(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="gba:text-primary gba:hover:underline"
        onClick={e => e.stopPropagation()}
        title={value}
      >
        {value}
      </a>
    )
  }

  return null
}

function renderValueByColumnType(value: unknown, column: SpreadsheetColumn): React.ReactNode {
  switch (column.type) {
    case 'currency':
      return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    case 'percentage':
      return `${Number(value).toFixed(1)}%`
    case 'date':
      return new Date(String(value)).toLocaleDateString()
    case 'datetime':
      return new Date(String(value)).toLocaleString()
    case 'boolean':
      return value ? '✓' : '✗'
    case 'select': {
      const option = column.selectOptions?.find(o => o.value === String(value))
      if (option) {
        return (
          <Badge variant="secondary" style={{ backgroundColor: option.color ? `${option.color}20` : undefined }}>
            {option.label}
          </Badge>
        )
      }
      return String(value)
    }
    case 'email':
      return (
        <a href={`mailto:${value}`} className="gba:text-primary gba:hover:underline">
          {String(value)}
        </a>
      )
    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="gba:text-primary gba:hover:underline"
        >
          {String(value)}
        </a>
      )
    default: {
      const stringValue = String(value)
      return renderMarkdownOrUrlValue(stringValue) || stringValue
    }
  }
}

function formatCellValue(value: unknown, column: SpreadsheetColumn, isStatusColumn?: boolean): React.ReactNode {
  if (isEmptyCellValue(value)) {
    return <span className="gba:text-muted-foreground">—</span>
  }

  // Handle formula errors
  if (isFormulaErrorValue(value)) {
    return <span className="gba:text-destructive">#ERROR!</span>
  }

  const statusBadge = renderStatusBadgeIfNeeded(value, column, isStatusColumn)
  if (statusBadge) return statusBadge

  return renderValueByColumnType(value, column)
}
