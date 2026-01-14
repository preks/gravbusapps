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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTable,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  Table2,
  FileInput,
  BarChart3,
  Kanban,
  Calendar,
  Plus,
  Search,
  Download,
  Upload,
  Settings,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Layers,
  RefreshCw,
  Database,
  Loader2,
  AlertCircle,
  Columns,
  Eye,
  EyeOff,
  Workflow,
  X,
  Save,
  Activity,
  User,
  Users,
  Sparkles,
  Zap,
  Signal,
  Home,
  FileSpreadsheet,
  GripVertical
} from 'lucide-react'
import { DynamicFormGenerator } from '@/business-apps/ser/components/DynamicFormGenerator'
import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn, ViewType, SheetView, ColumnType } from './types'
import { evaluateFormula, isFormula, type FormulaContext } from './utils/formulaEvaluator'
import { getIconByName, DEFAULT_APP_ICON } from './utils/appIcons'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { AutomationsHub, AutomationWizard } from './components/automations'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { isTrackingColumn } from './utils/trackingColumns'
import { TRACKING_COLUMNS } from './components/automations/TrackingColumnsConfig'
import { normalizeImageSrc } from './utils/normalizeImageSrc'
import { useCollaboration } from '../shared/hooks/useCollaboration'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { DocumentParticipant } from '../shared/services/CollaborationClient'
import { PresenceIndicator } from '../shared/components/PresenceIndicator'
import { CellCollaboratorIndicator } from '../shared/components/CellCollaboratorIndicator'

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
function getViewIcon(type: ViewType) {
  switch (type) {
    case 'table':
      return Table2
    case 'form':
      return FileInput
    case 'dashboard':
      return BarChart3
    case 'kanban':
      return Kanban
    case 'calendar':
      return Calendar
    default:
      return Table2
  }
}

/**
 * SpreadsheetAppViewer Component
 */
export const SpreadsheetAppViewer: React.FC<SpreadsheetAppViewerProps> = ({
  app,
  activeSheetId: initialSheetId,
  activeViewId: initialViewId,
  onDataChange,
  onRowAdd,
  onAppUpdate: _onAppUpdate,
  onSheetUpdate,
  onBack,
  onEdit,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  // State
  const [activeSheetId, setActiveSheetId] = useState(initialSheetId || app.sheets[0]?.id || '')
  const [activeViewId, setActiveViewId] = useState<string | null>(initialViewId || null)
  const [searchQuery, setSearchQuery] = useState('')
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
  const isSavingRef = React.useRef(false)
  const SAVE_DEBOUNCE_MS = 500 // Debounce saves by 500ms

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

  // Store current user ID to avoid applying our own operations
  const currentUserIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    try {
      const token = localStorage.getItem('business-app-ide-access-token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        currentUserIdRef.current = payload.sub || payload.userId
      }
    } catch {}
  }, [])

  // Collaboration callbacks (stable references - no dependencies)
  const onOperationReceivedCallback = useCallback((operation: any) => {
    // Handle incoming operations from other users
    console.log('[SpreadsheetAppViewer] Received operation:', operation)
    
    // #region agent log
    const isOwnOperation = operation.userId === currentUserIdRef.current
    fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:onOperationReceived',message:'Operation received in viewer',data:{operationType:operation.operation.type,fromUserId:operation.userId,currentUserId:currentUserIdRef.current,isOwnOperation},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    // Skip if this is our own operation (we already applied it optimistically)
    if (isOwnOperation) {
      console.log('[SpreadsheetAppViewer] Skipping own operation')
      return
    }
    
    // Apply the operation to local state
    // Operations can be for ANY sheet, not just the active one
    const { sheetId } = operation.operation.data as { sheetId: string }
    const isActiveSheet = sheetId === activeSheetIdRef.current

    if (operation.operation.type === 'cell_update') {
      const { rowId, column, value } = operation.operation.data as {
        sheetId: string
        rowId: string
        column: string
        value: unknown
      }
      
      if (isActiveSheet) {
        // Update local state for active sheet
        setLocalSheetData(prevData => prevData.map(row => (row._id === rowId ? { ...row, [column]: value } : row)))
      } else if (onAppUpdateRef.current) {
        // Update app.sheets for non-active sheet so data is correct when user switches
        const targetSheet = app.sheets.find(s => s.id === sheetId)
        if (targetSheet) {
          const updatedData = (targetSheet.data || []).map((row: Record<string, unknown>) =>
            row._id === rowId ? { ...row, [column]: value } : row
          )
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === sheetId ? { ...sheet, data: updatedData } : sheet
          )
          onAppUpdateRef.current({ ...app, sheets: updatedSheets })
        }
      }
    } else if (operation.operation.type === 'row_add') {
      const { rowData } = operation.operation.data as {
        sheetId: string
        rowData: Record<string, unknown>
      }
      
      if (isActiveSheet) {
        setLocalSheetData(prevData => {
          const exists = prevData.some(row => row._id === rowData._id)
          if (exists) return prevData
          return [...prevData, rowData]
        })
      } else if (onAppUpdateRef.current) {
        const targetSheet = app.sheets.find(s => s.id === sheetId)
        if (targetSheet) {
          const existingData = targetSheet.data || []
          const exists = existingData.some((row: Record<string, unknown>) => row._id === rowData._id)
          if (!exists) {
            const updatedSheets = app.sheets.map(sheet =>
              sheet.id === sheetId ? { ...sheet, data: [...existingData, rowData] } : sheet
            )
            onAppUpdateRef.current({ ...app, sheets: updatedSheets })
          }
        }
      }
    } else if (operation.operation.type === 'row_delete') {
      const { rowId } = operation.operation.data as {
        sheetId: string
        rowId: string
      }
      
      if (isActiveSheet) {
        setLocalSheetData(prevData => prevData.filter(row => row._id !== rowId))
      } else if (onAppUpdateRef.current) {
        const targetSheet = app.sheets.find(s => s.id === sheetId)
        if (targetSheet) {
          const updatedData = (targetSheet.data || []).filter((row: Record<string, unknown>) => row._id !== rowId)
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === sheetId ? { ...sheet, data: updatedData } : sheet
          )
          onAppUpdateRef.current({ ...app, sheets: updatedSheets })
        }
      }
    } else if (operation.operation.type === 'column_add') {
      const { column } = operation.operation.data as {
        sheetId: string
        column: SpreadsheetColumn
      }
      
      if (onAppUpdateRef.current) {
        const targetSheet = app.sheets.find(s => s.id === sheetId)
        if (targetSheet) {
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === sheetId
              ? {
                  ...sheet,
                  columns: [...sheet.columns, column],
                  data: isActiveSheet ? localSheetDataRef.current : sheet.data
                }
              : sheet
          )
          onAppUpdateRef.current({ ...app, sheets: updatedSheets })
        }
      }
    } else if (operation.operation.type === 'column_update') {
      const { columns, columnId, columnPatch } = operation.operation.data as {
        sheetId: string
        columns?: SpreadsheetColumn[]
        columnId?: string
        columnPatch?: Partial<SpreadsheetColumn>
      }
      
      if (onAppUpdateRef.current) {
        const targetSheet = app.sheets.find(s => s.id === sheetId)
        if (targetSheet) {
          let updatedColumns: SpreadsheetColumn[]
          
          // Support patch-based updates (prevents race conditions)
          if (columnId && columnPatch) {
            updatedColumns = targetSheet.columns.map(col =>
              col.id === columnId ? { ...col, ...columnPatch } : col
            )
          } else if (columns) {
            updatedColumns = columns
          } else {
            return
          }
          
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === sheetId
              ? {
                  ...sheet,
                  columns: updatedColumns,
                  data: isActiveSheet ? localSheetDataRef.current : sheet.data
                }
              : sheet
          )
          onAppUpdateRef.current({ ...app, sheets: updatedSheets })
        }
      }
    } else if (operation.operation.type === 'column_delete') {
      const { columnId } = operation.operation.data as {
        sheetId: string
        columnId: string
      }
      
      if (onAppUpdateRef.current) {
        const targetSheet = app.sheets.find(s => s.id === sheetId)
        if (targetSheet) {
          const updatedColumns = targetSheet.columns.filter(col => col.id !== columnId)
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === sheetId
              ? {
                  ...sheet,
                  columns: updatedColumns,
                  data: isActiveSheet ? localSheetDataRef.current : sheet.data
                }
              : sheet
          )
          onAppUpdateRef.current({ ...app, sheets: updatedSheets })
        }
      }
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
    onOperationReceived: onOperationReceivedCallback,
    onError: onErrorCallback
  })

  // Get access token for avatar fetching (use prop or fallback to localStorage)
  const authToken = accessToken || localStorage.getItem('business-app-ide-access-token') || ''
  const graphqlClient = useGraphQLClient(authToken)

  // Enriched participants with avatars
  const [participants, setParticipants] = useState<DocumentParticipant[]>([])

  // Fetch avatars for participants when they change
  useEffect(() => {
    async function fetchAvatars() {
      if (!rawParticipants.length || !authToken) {
        setParticipants(rawParticipants)
        return
      }

      const userIds = rawParticipants.map(p => p.userId).filter(Boolean)
      if (userIds.length === 0) {
        setParticipants(rawParticipants)
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
        const result = await graphqlClient.request<{ Employee: Array<{ userId: string; pictureThumbnail: string | null }> }>(query, { userIds })

        const avatarMap = new Map<string, string>()
        result?.Employee?.forEach(emp => {
          if (emp.pictureThumbnail) {
            const avatarUrl = emp.pictureThumbnail.startsWith('data:')
              ? emp.pictureThumbnail
              : `data:image/png;base64,${emp.pictureThumbnail}`
            avatarMap.set(emp.userId, avatarUrl)
          }
        })

        // Enrich participants with avatar URLs
        const enrichedParticipants = rawParticipants.map(p => ({
          ...p,
          avatarUrl: avatarMap.get(p.userId) || undefined
        }))
        setParticipants(enrichedParticipants)
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to fetch participant avatars:', error)
        setParticipants(rawParticipants)
      }
    }

    fetchAvatars()
  }, [rawParticipants, authToken, graphqlClient])

  // Stable callback to emit cursor immediately (used by EditableCell on click)
  // This is the primary way cursor is emitted for faster collaboration feedback
  const emitCursorImmediate = useCallback((rowId: string, colId: string, rowIndex: number, colIndex: number) => {
    if (isCollaborationConnected) {
      emitCursor({
        path: [activeSheetId, rowId, colId],
        line: rowIndex,
        column: colIndex
      })
    }
  }, [activeSheetId, isCollaborationConnected, emitCursor])

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

  // Debounced save function - batches rapid changes and prevents concurrent saves
  const debouncedSave = useCallback(
    (sheetId: string, data: Record<string, unknown>[]) => {
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        // Don't save if already saving
        if (isSavingRef.current) {
          return
        }

        isSavingRef.current = true
        saveTimeoutRef.current = null

        // Save the data
        onDataChange?.(sheetId, data)

        // Reset saving flag after a short delay to allow the save to complete
        setTimeout(() => {
          isSavingRef.current = false
        }, 100)
      }, SAVE_DEBOUNCE_MS)
    },
    [onDataChange]
  )

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

  // Filter data based on search and evaluate formulas
  const filteredData = useMemo(() => {
    if (!activeSheet) return []

    // First, recalculate all formulas
    const dataWithFormulas = recalculateAllFormulas(sourceData)

    // Then filter if search query exists
    if (!searchQuery.trim()) {
      return dataWithFormulas
    }

    const query = searchQuery.toLowerCase()
    return dataWithFormulas.filter(row =>
      Object.values(row).some(value => value && String(value).toLowerCase().includes(query))
    )
  }, [activeSheet, sourceData, searchQuery, recalculateAllFormulas])

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

    // When collaboration is active, we still need to call REST API to get real UUID
    // Then broadcast via WebSocket so other users get the real row
    if (isCollaborationConnected && onRowAdd) {
      const savedRow = await onRowAdd(app.id, activeSheet.id, rowData)
      if (savedRow) {
        // Add to local data
        setLocalSheetData(prev => [...prev, savedRow])

        // Broadcast to other users with real UUID
        emitOperation({
          type: 'row_add',
          data: {
            sheetId: activeSheet.id,
            rowData: savedRow
          }
        })
      }
    } else if (onRowAdd) {
      // Fallback to REST API when collaboration is not connected
      const savedRow = await onRowAdd(app.id, activeSheet.id, rowData)
      if (savedRow) {
        setLocalSheetData(prev => [...prev, savedRow])
      }
    } else {
      // Fallback: update local state only (legacy behavior)
      const newRow: Record<string, unknown> = {
        _id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        _createdAt: new Date().toISOString(),
        ...rowData
      }
      setLocalSheetData(prev => [...prev, newRow])
      onDataChange?.(activeSheet.id, [...localSheetData, newRow])
    }
  }, [activeSheet, app, localSheetData, onRowAdd, onDataChange, isCollaborationConnected, emitOperation])

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

      const newRows = rows.map((rowData, index) => {
        const newRow: Record<string, unknown> = {
          _id: `row_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
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
        // For range selection, add all cells in the range
        const startRow = Math.min(mode.startCell.rowIndex, rowIndex)
        const endRow = Math.max(mode.startCell.rowIndex, rowIndex)
        const startCol = Math.min(mode.startCell.colIndex, colIndex)
        const endCol = Math.max(mode.startCell.colIndex, colIndex)

        const rangeCells: Array<{ rowIndex: number; colIndex: number }> = []
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            rangeCells.push({ rowIndex: r, colIndex: c })
          }
        }
        setFormulaSelectedCells(prev => [
          ...prev.filter(c => !(c.rowIndex === mode.startCell!.rowIndex && c.colIndex === mode.startCell!.colIndex)),
          ...rangeCells
        ])

        setFormulaSelectionMode({
          ...mode,
          endCell: { rowIndex, colIndex },
          isRangeSelection: true
        })
      } else {
        // Single cell selection - add to the list
        setFormulaSelectedCells(prev => [...prev, { rowIndex, colIndex }])

        setFormulaSelectionMode({
          ...mode,
          startCell: { rowIndex, colIndex },
          endCell: null,
          isRangeSelection: false
        })
      }

      // Get current formula from ref or input
      const activeCellElement = document.querySelector(
        `[data-cell-rowid="${mode.editingCell.rowId}"][data-cell-colid="${mode.editingCell.colId}"] input`
      ) as HTMLInputElement | null

      const currentFormula = activeCellElement?.value?.trim() || currentFormulaValueRef.current?.trim() || '='

      const appendRef = (formula: string, ref: string) => {
        const trimmed = formula.trim()
        if (trimmed === '' || trimmed === '=') return `${trimmed}${ref}`
        const lastChar = trimmed.slice(-1)
        if (/[+\-*/=(,]/.test(lastChar)) return `${formula}${ref}`
        return `${formula}+${ref}`
      }

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
          newFormula = appendRef(newFormula, rangeRef)
        }
      } else {
        newFormula = appendRef(newFormula, cellRef)
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

      let newData: Record<string, unknown>[]

      if (isEntityDataSource) {
        // When entity data source is enabled, we save custom column data in localSheetData
        // keyed by the entity row ID
        const existingRowIndex = localSheetData.findIndex(row => row._id === rowId || row.id === rowId)

        if (existingRowIndex >= 0) {
          // Update existing row
          newData = localSheetData.map(row => {
            if (row._id === rowId || row.id === rowId) {
              const updatedRow: Record<string, unknown> = { ...row, _updatedAt: new Date().toISOString() }
              updatedRow[columnName] = value

              // Handle formulas
              if (isFormulaValue) {
                const formulas = (updatedRow._formulas as Record<string, string>) || {}
                formulas[columnName] = value as string
                updatedRow._formulas = formulas
              } else {
                const formulas = updatedRow._formulas as Record<string, string> | undefined
                if (formulas) {
                  delete formulas[columnName]
                  if (Object.keys(formulas).length === 0) {
                    delete updatedRow._formulas
                  }
                }
              }

              return updatedRow
            }
            return row
          })
        } else {
          // Create new row for custom column data (linked to entity row by _id)
          const newRow: Record<string, unknown> = {
            _id: rowId,
            _updatedAt: new Date().toISOString(),
            [columnName]: value
          }

          if (isFormulaValue) {
            newRow._formulas = { [columnName]: value as string }
          }

          newData = [...localSheetData, newRow]
        }
      } else {
        // Standard behavior when no entity data source
        newData = localSheetData.map(row => {
          if (row._id === rowId || row.id === rowId) {
            const updatedRow: Record<string, unknown> = { ...row, _updatedAt: new Date().toISOString() }

            // Store formula in _formulas object if it's a formula
            if (isFormulaValue) {
              updatedRow[columnName] = value // Store the formula string
              // Initialize _formulas if it doesn't exist
              const formulas = (updatedRow._formulas as Record<string, string>) || {}
              formulas[columnName] = value as string
              updatedRow._formulas = formulas
            } else {
              // Remove formula if user entered a regular value
              updatedRow[columnName] = value
              const formulas = updatedRow._formulas as Record<string, string> | undefined
              if (formulas) {
                delete formulas[columnName]
                // Clean up empty _formulas object
                if (Object.keys(formulas).length === 0) {
                  delete updatedRow._formulas
                } else {
                  updatedRow._formulas = formulas
                }
              }
            }

            return updatedRow
          }
          return row
        })
      }

      // Recalculate all formulas (in case this cell is referenced by others)
      newData = recalculateAllFormulas(newData)

      // Update local state immediately for responsive UI
      setLocalSheetData(newData)

      // Emit collaboration operation for real-time sync (WebSocket saves to DB)
      // Only emit if row has a valid UUID (not a temporary row_ ID)
      const isTemporaryRow = typeof rowId === 'string' && rowId.startsWith('row_')
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:handleCellChange:route',message:'Routing cell change',data:{sheetId:activeSheet.id,rowId,columnName,valueType:typeof value,isConnected:isCollaborationConnected,isTemporaryRow,route:(isCollaborationConnected&&!isTemporaryRow)?'ws':'rest'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'R5'})}).catch(()=>{});
      // #endregion
      if (isCollaborationConnected && !isTemporaryRow) {
        emitOperation({
          type: 'cell_update',
          data: {
            sheetId: activeSheet.id,
            rowId,
            column: columnName,
            value
          }
        })
      } else {
        // Fallback to REST API save when collaboration is not connected
        // OR when row is temporary (not yet in database)
        debouncedSave(activeSheet.id, newData)
      }
    },
    [
      activeSheet,
      entityData,
      localSheetData,
      debouncedSave,
      recalculateAllFormulas,
      isCollaborationConnected,
      emitOperation
    ]
  )

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

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't handle if we're in an input or textarea (unless it's a cell input)
      const target = e.target as HTMLElement
      const isCellInput = target.closest('[data-cell-rowid]')
      if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !isCellInput) return

      // Don't handle if a cell is currently being edited
      if (isEditingRef.current) return

      // Don't handle if formula selection mode is active
      if (formulaSelectionMode) return

      // Don't handle if target is a cell div (cell's own handler will handle it)
      // This prevents double navigation with arrow keys
      if (target.hasAttribute('data-cell-rowid')) {
        return
      }

      const { rowIndex, colIndex, rowId, colId } = selectedCell
      // Find column by colId (more reliable than index)
      const column = activeSheet?.columns.find(c => c.id === colId)
      const canEdit = activeSheet?.settings.allowEdit && column?.isEditable && column?.type !== 'calculated'

      // Navigation function
      const navigateTo = (direction: 'up' | 'down' | 'left' | 'right') => {
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
            emitCursorImmediate(targetRowId, targetColId, targetRow, targetCol)
            // Update selection
            setSelectedCell({ rowId: targetRowId, colId: targetColId, rowIndex: targetRow, colIndex: targetCol })
          }
        }
      }

      // Arrow keys - navigate
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        navigateTo('up')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        navigateTo('down')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigateTo('left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigateTo('right')
      } else if (e.key === 'Tab') {
        e.preventDefault()
        navigateTo(e.shiftKey ? 'left' : 'right')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        // Enter navigates down
        navigateTo('down')
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedCell(null)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Copy
        e.preventDefault()
        const row = filteredData.find(r => (r._id ?? r.id) === rowId)
        if (row && column) {
          const valueToCopy = String(row[column.name] ?? '')
          navigator.clipboard.writeText(valueToCopy)
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Paste
        e.preventDefault()
        if (canEdit && column) {
          navigator.clipboard.readText().then(text => {
            handleCellChange(rowId, column.name, text)
          })
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Clear cell
        e.preventDefault()
        if (canEdit && column) {
          handleCellChange(rowId, column.name, '')
        }
      } else if (e.key === 'F2') {
        // F2 - enter edit mode (click cell to trigger edit)
        e.preventDefault()
        const cellElement = document.querySelector(
          `[data-cell-row="${rowIndex}"][data-cell-col="${colIndex}"]`
        ) as HTMLElement
        if (cellElement) {
          cellElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && canEdit) {
        // Printable character - start editing with this character
        e.preventDefault()
        // Find the cell and trigger edit mode with the typed character
        const cellElement = document.querySelector(
          `[data-cell-row="${rowIndex}"][data-cell-col="${colIndex}"]`
        ) as HTMLElement
        if (cellElement) {
          // Set a data attribute to indicate we want to start with this character
          cellElement.dataset.startChar = e.key
          cellElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        }
      }
    }

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
   * Generate table columns with inline editing support
   * When entity data source is enabled:
   * - Entity columns are read-only (from the data source)
   * - Custom spreadsheet columns are editable (user-added)
   */
  const tableColumns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    if (!activeSheet) return []

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:tableColumns:recompute',message:'Recomputing tableColumns',data:{sheetId:activeSheet.id,selectedCell:selectedCell?{rowId:selectedCell.rowId,colId:selectedCell.colId}:null,participantsCount:participants.length,participantsWithCursor:participants.filter(p=>p.cursor?.path?.length).length,isCollaborationConnected},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'R4'})}).catch(()=>{});
    // #endregion

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
    // Sort columns: tracking columns first, then regular columns (both by order)
    const visibleColumns = activeSheet.columns
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
            onFinishEditing={(save) => {
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
              isEditable={activeSheet.settings.allowEdit && col.type !== 'calculated'}
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
              participants={participants}
              onCursorEmit={emitCursorImmediate}
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
    handleDeleteRow,
    handleCellChange,
    filteredData,
    handleFormulaCellSelect,
    formulaSelectionMode,
    // selectedCell is needed to trigger cell re-renders for selection highlighting
    selectedCell,
    participants,
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
              {onBack && (
                <ChevronRight className="gba:w-4 gba:h-4 gba:text-muted-foreground/50 gba:flex-shrink-0" />
              )}
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
                    <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:max-w-[300px]">{app.description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Status & Quick Actions */}
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-shrink-0">
              {/* Live Status Indicators */}
              <div className="gba:flex gba:items-center gba:gap-2">
                {/* Collaboration presence indicator - shows active users */}
                {participants.length > 0 && (
                  <div className="gba:flex gba:items-center gba:gap-2 gba:px-2 gba:py-1 gba:rounded-full gba:bg-success/10 gba:border gba:border-success/20">
                    <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-success gba:animate-pulse" />
                    <PresenceIndicator participants={participants} maxVisible={3} size="sm" showLabel={false} />
                    <span className="gba:text-xs gba:font-medium gba:text-success-foreground">{participants.length} active</span>
                  </div>
                )}
                
                {/* Connection status indicator - shows when connected but alone */}
                {participants.length === 0 && isCollaborationConnected && (
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

              {/* Action Buttons */}
              <div className="gba:flex gba:items-center gba:gap-1.5">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={isAutomationsOpen ? 'default' : 'ghost'}
                        size="sm"
                        onClick={() => setIsAutomationsOpen(!isAutomationsOpen)}
                        data-testid={`${testId}-automations-button`}
                        className="gba:h-8 gba:gap-1.5"
                      >
                        <Zap className="gba:w-4 gba:h-4" />
                        <span className="gba:hidden md:gba:inline">Automations</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>Manage automations and workflows</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                {onEdit && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={onEdit} className="gba:h-8 gba:gap-1.5">
                          <Settings className="gba:w-4 gba:h-4" />
                          <span className="gba:hidden md:gba:inline">Settings</span>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <span>Spreadsheet settings</span>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
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
                      <Database className={`gba:w-3.5 gba:h-3.5 gba:flex-shrink-0 ${isActive ? 'gba:text-info' : 'gba:text-muted-foreground gba:group-hover:text-info'}`} />
                    ) : (
                      <Layers className={`gba:w-3.5 gba:h-3.5 gba:flex-shrink-0 ${isActive ? 'gba:text-primary' : 'gba:text-muted-foreground gba:group-hover:text-primary'}`} />
                    )}
                    <span className="gba:truncate gba:max-w-[120px]">{sheet.name}</span>
                    <span className={`gba:text-xs gba:px-1.5 gba:py-0.5 gba:rounded-full gba:tabular-nums ${
                      isActive 
                        ? 'gba:bg-primary/10 gba:text-primary' 
                        : 'gba:bg-muted gba:text-muted-foreground gba:group-hover:bg-muted/70'
                    }`}>
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

      {/* Formula Bar - Modern Excel-like display */}
      <div className="gba:px-4 gba:py-2 gba:border-b gba:border-border/50 gba:bg-background gba:w-full gba:overflow-hidden gba:flex-shrink-0" data-testid="spreadsheet-viewer-formula-bar">
        <div className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:min-w-0">
          {/* Cell reference indicator - Modern pill style */}
          <div className={`gba:flex gba:items-center gba:gap-1.5 gba:min-w-[70px] gba:px-2.5 gba:py-1.5 gba:rounded-lg gba:text-sm gba:font-mono gba:transition-colors ${
            selectedCell 
              ? 'gba:bg-primary/10 gba:text-primary gba:border gba:border-primary/20' 
              : 'gba:bg-muted/50 gba:text-muted-foreground gba:border gba:border-border/50'
          }`}>
            <Table2 className="gba:w-3.5 gba:h-3.5 gba:flex-shrink-0" />
            {selectedCell ? (
              <span className="gba:font-semibold">
                {columnIndexToLetter(selectedCell.colIndex)}
                {selectedCell.rowIndex + 1}
              </span>
            ) : (
              <span className="gba:text-xs">—</span>
            )}
          </div>

          {/* Formula/Value input - Modern glass style */}
          <div className={`gba:flex gba:items-center gba:gap-2.5 gba:flex-1 gba:min-w-0 gba:border gba:rounded-lg gba:px-3 gba:min-h-[38px] gba:transition-all ${
            selectedCell
              ? 'gba:bg-background gba:border-border gba:shadow-sm'
              : 'gba:bg-muted/30 gba:border-border/50'
          }`}>
            <div className="gba:flex gba:items-center gba:justify-center gba:w-6 gba:h-6 gba:rounded gba:bg-muted/50 gba:flex-shrink-0">
              <span className="gba:font-mono gba:text-xs gba:font-bold gba:text-muted-foreground">fx</span>
            </div>
            {selectedCell ? (
              <input
                type="text"
                ref={formulaBarInputRef}
                className="gba:flex-1 gba:font-mono gba:text-sm gba:bg-transparent gba:border-none gba:outline-none gba:text-foreground"
                placeholder="Enter value or formula (start with =)"
                data-testid="spreadsheet-viewer-formula-bar-input"
                value={(() => {
                  // If we're actively editing (not null), show the edit value (even if empty)
                  if (currentFormulaDisplay !== null) {
                    return currentFormulaDisplay
                  }
                  // Otherwise show the stored formula or value from the cell
                  const row = filteredData.find(r => (r._id ?? r.id) === selectedCell.rowId)
                  const column = activeSheet?.columns.find(c => c.id === selectedCell.colId)
                  if (row && column) {
                    const formulas = row._formulas as Record<string, string> | undefined
                    const storedFormula = formulas?.[column.name]
                    if (storedFormula) return storedFormula
                    const value = row[column.name]
                    return value !== null && value !== undefined ? String(value) : ''
                  }
                  return ''
                })()}
                onChange={e => {
                  const newValue = e.target.value
                  // Update formula display
                  currentFormulaValueRef.current = newValue
                  setCurrentFormulaDisplay(newValue)

                  // Enter formula mode if starting with =
                  if (newValue.trim().startsWith('=') && !formulaSelectionMode) {
                    setFormulaSelectionMode({
                      editingCell: { rowId: selectedCell.rowId, colId: selectedCell.colId },
                      startCell: null,
                      endCell: null,
                      isRangeSelection: false
                    })
                  } else if (!newValue.trim().startsWith('=') && formulaSelectionMode) {
                    // Exit formula mode if not a formula anymore
                    setFormulaSelectionMode(null)
                  }

                  // Keep the currently edited cell input in sync if it exists.
                  // This is important so the user can type in the formula bar while in formula selection mode.
                  const editingCell = formulaSelectionMode?.editingCell ?? {
                    rowId: selectedCell.rowId,
                    colId: selectedCell.colId
                  }
                  const activeCellElement = document.querySelector(
                    `[data-cell-rowid="${editingCell.rowId}"][data-cell-colid="${editingCell.colId}"] input`
                  ) as HTMLInputElement | null

                  if (activeCellElement && activeCellElement.value !== newValue) {
                    activeCellElement.value = newValue
                    activeCellElement.dispatchEvent(new Event('input', { bubbles: true }))
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const value = e.currentTarget.value
                    const column = activeSheet?.columns.find(c => c.id === selectedCell.colId)
                    if (column) {
                      // Auto-close parentheses for formulas
                      let finalValue = value
                      if (value.trim().startsWith('=')) {
                        const openParens = (value.match(/\(/g) || []).length
                        const closeParens = (value.match(/\)/g) || []).length
                        if (openParens > closeParens) {
                          finalValue = value + ')'.repeat(openParens - closeParens)
                        }
                      }
                      handleCellChange(selectedCell.rowId, column.name, finalValue)
                    }
                    currentFormulaValueRef.current = ''
                    setCurrentFormulaDisplay(null)
                    setFormulaSelectionMode(null)
                    // Move to next row
                    const nextRowIndex = selectedCell.rowIndex + 1
                    if (nextRowIndex < filteredData.length) {
                      const nextRow = filteredData[nextRowIndex]
                      const nextRowId = (nextRow._id ?? nextRow.id) as string
                      setSelectedCell({
                        rowId: nextRowId,
                        colId: selectedCell.colId,
                        rowIndex: nextRowIndex,
                        colIndex: selectedCell.colIndex
                      })
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    currentFormulaValueRef.current = ''
                    setCurrentFormulaDisplay(null)
                    setFormulaSelectionMode(null)
                  }
                }}
                onFocus={() => {
                  // When we're already in formula selection mode (or actively editing),
                  // do NOT overwrite the in-progress formula/value. This input is
                  // programmatically focused while the user clicks cells to insert refs.
                  if (formulaSelectionMode || currentFormulaDisplay !== null) {
                    return
                  }

                  // When focusing the formula bar, load the current cell's formula/value for editing
                  const row = filteredData.find(r => (r._id ?? r.id) === selectedCell.rowId)
                  const column = activeSheet?.columns.find(c => c.id === selectedCell.colId)
                  if (row && column) {
                    const formulas = row._formulas as Record<string, string> | undefined
                    const storedFormula = formulas?.[column.name]
                    if (storedFormula) {
                      // Cell has a formula - load it and enter formula mode
                      currentFormulaValueRef.current = storedFormula
                      setCurrentFormulaDisplay(storedFormula)
                      setFormulaSelectionMode({
                        editingCell: { rowId: selectedCell.rowId, colId: selectedCell.colId },
                        startCell: null,
                        endCell: null,
                        isRangeSelection: false
                      })
                    } else {
                      // Cell has regular value - load it for editing (no formula mode)
                      const value = row[column.name]
                      const valueStr = value !== null && value !== undefined ? String(value) : ''
                      currentFormulaValueRef.current = valueStr
                      setCurrentFormulaDisplay(valueStr)
                    }
                  }
                }}
              />
            ) : (
              <span className="gba:flex-1 gba:font-mono gba:text-sm gba:text-muted-foreground">Select a cell</span>
            )}
          </div>

          {/* Formula functions - Modern quick action pills */}
          {selectedCell && !formulaSelectionMode && (
            <div className="gba:flex gba:items-center gba:gap-1 gba:flex-shrink-0">
              <TooltipProvider>
                {[
                  { name: 'SUM', desc: 'Sum of values', icon: '∑' },
                  { name: 'AVERAGE', desc: 'Average value', icon: 'x̄' },
                  { name: 'COUNT', desc: 'Count values', icon: '#' },
                  { name: 'MIN', desc: 'Minimum value', icon: '↓' },
                  { name: 'MAX', desc: 'Maximum value', icon: '↑' }
                ].map(fn => (
                  <Tooltip key={fn.name}>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="gba:flex gba:items-center gba:gap-1 gba:h-7 gba:px-2 gba:text-xs gba:font-mono gba:rounded-md gba:border gba:border-border/50 gba:bg-muted/30 gba:text-muted-foreground gba:hover:bg-muted gba:hover:text-foreground gba:hover:border-border gba:transition-all"
                        onClick={() => {
                          const formula = `=${fn.name}(`
                          currentFormulaValueRef.current = formula
                          setCurrentFormulaDisplay(formula)
                          setFormulaSelectionMode({
                            editingCell: { rowId: selectedCell.rowId, colId: selectedCell.colId },
                            startCell: null,
                            endCell: null,
                            isRangeSelection: false
                          })
                          requestAnimationFrame(() => {
                            const input = formulaBarInputRef.current
                            if (!input) return
                            input.focus()
                            input.setSelectionRange(formula.length, formula.length)
                          })
                        }}
                      >
                        <span className="gba:text-sm">{fn.icon}</span>
                        <span className="gba:hidden lg:gba:inline">{fn.name}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <span className="gba:font-mono">{fn.name}</span>: {fn.desc}
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Formula mode hint - Modern floating badge */}
        {formulaSelectionMode && (
          <div className="gba:mt-2 gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:px-2.5 gba:py-1 gba:rounded-full gba:bg-primary/10 gba:border gba:border-primary/20">
              <Sparkles className="gba:w-3.5 gba:h-3.5 gba:text-primary" />
              <span className="gba:text-xs gba:font-medium gba:text-primary">Formula Mode</span>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
              <span className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-medium">Click</span>
              <span>add cell</span>
              <span className="gba:text-border">•</span>
              <span className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-medium">Shift+Click</span>
              <span>range</span>
              <span className="gba:text-border">•</span>
              <span className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-medium">Enter</span>
              <span>save</span>
              <span className="gba:text-border">•</span>
              <span className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:font-medium">Esc</span>
              <span>cancel</span>
            </div>
          </div>
        )}
      </div>

      {/* Toolbar - Modern action bar */}
      <div className="gba:px-4 gba:py-2 gba:border-b gba:border-border/50 gba:bg-muted/20 gba:w-full gba:overflow-hidden gba:flex-shrink-0">
        <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:min-w-0 gba:gap-4">
          {/* Left: View switcher - Modern segmented control */}
          <div className="gba:flex gba:items-center gba:gap-0.5 gba:p-1 gba:rounded-lg gba:bg-muted/50 gba:border gba:border-border/50">
            {activeSheet.views.map(view => {
              const ViewIcon = getViewIcon(view.type)
              const isActive = view.id === (activeView?.id || activeSheet.views[0]?.id)
              return (
                <TooltipProvider key={view.id}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className={`gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-1.5 gba:rounded-md gba:text-sm gba:font-medium gba:transition-all ${
                          isActive
                            ? 'gba:bg-background gba:text-foreground gba:shadow-sm gba:border gba:border-border/50'
                            : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/30'
                        }`}
                        onClick={() => setActiveViewId(view.id)}
                      >
                        <ViewIcon className="gba:w-4 gba:h-4" />
                        <span className="gba:hidden sm:gba:inline">{view.name}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span>{view.name} view</span>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )
            })}
          </div>

          {/* Right: Actions - Modern grouped actions */}
          <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:justify-end gba:min-w-0">
            {/* Search - Modern with keyboard hint */}
            <div className="gba:relative gba:max-w-[280px] gba:flex-1 gba:min-w-[180px]">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none" />
              <Input
                placeholder="Search in sheet..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-10 gba:pr-12 gba:h-9 gba:bg-background gba:border-border/50"
              />
              <kbd className="gba:absolute gba:right-2 gba:top-1/2 gba:-translate-y-1/2 gba:hidden sm:gba:inline-flex gba:h-5 gba:items-center gba:gap-1 gba:rounded gba:border gba:border-border/50 gba:bg-muted/50 gba:px-1.5 gba:font-mono gba:text-[10px] gba:text-muted-foreground">
                ⌘K
              </kbd>
            </div>

            {/* Divider */}
            <div className="gba:h-6 gba:w-px gba:bg-border/50 gba:hidden sm:gba:block" />

            {/* Primary actions */}
            <div className="gba:flex gba:items-center gba:gap-1.5">
              {_onAppUpdate && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleAddColumn}
                        className="gba:h-8 gba:gap-1.5"
                      >
                        <Columns className="gba:w-4 gba:h-4" />
                        <span className="gba:hidden md:gba:inline">Column</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add new column</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {activeSheet.settings.allowAdd && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        onClick={handleAddRow}
                        className="gba:h-8 gba:gap-1.5 gba:bg-primary gba:hover:bg-primary/90"
                      >
                        <Plus className="gba:w-4 gba:h-4" />
                        <span className="gba:hidden md:gba:inline">Add Row</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Add new row</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* More actions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gba:h-8 gba:w-8 gba:p-0">
                    <MoreVertical className="gba:w-4 gba:h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="gba:w-48">
                  {_onAppUpdate && (
                    <DropdownMenuItem onClick={() => setIsManageColumnsDialogOpen(true)}>
                      <Columns className="gba:w-4 gba:h-4 gba:mr-2" />
                      Manage Columns
                    </DropdownMenuItem>
                  )}
                  {activeSheet.settings.allowExport && (
                    <DropdownMenuItem>
                      <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                      Export to Excel
                    </DropdownMenuItem>
                  )}
                  {activeSheet.settings.allowImport && (
                    <DropdownMenuItem>
                      <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                      Import Data
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem>
                    <Filter className="gba:w-4 gba:h-4 gba:mr-2" />
                    Advanced Filters
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
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
                  <span className="gba:font-medium gba:text-foreground">{activeSheet.entityDataSource.entityDisplayName}</span>
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
                <button
                  type="button"
                  onClick={onEdit}
                  className="gba:text-xs gba:text-primary gba:hover:underline"
                >
                  Edit filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div 
        className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0"
        style={{ minWidth: 0, minHeight: 0, overflow: 'hidden', position: 'relative' }}
      >
        {activeView?.type === 'table' ? (
          <div 
            className="gba:flex-1 gba:min-w-0 gba:p-6"
            style={{ 
              minWidth: 0, 
              minHeight: 0, 
              overflow: 'auto',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
          >
            <TableView
              data={filteredData}
              columns={tableColumns}
              testId={`${testId}-table`}
              onAddRow={activeSheet.settings.allowAdd ? handleAddRow : undefined}
              showAddRow={activeSheet.settings.allowAdd && !!_onAppUpdate}
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
  
  const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
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
  }, [handleSave])
  
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
        isTrackingCol
          ? 'gba:bg-gradient-to-r gba:from-info/15 gba:to-transparent'
          : ''
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
            } ${canEdit && !isTrackingCol 
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

type ActiveEditCell = { rowId: string; colId: string } | null
type FormulaSelectionMode = {
  editingCell: { rowId: string; colId: string }
  startCell: { rowIndex: number; colIndex: number } | null
  endCell: { rowIndex: number; colIndex: number } | null
  isRangeSelection: boolean
} | null

// Global state to keep the currently edited cell stable across table re-renders/remounts.
// IMPORTANT: We intentionally keep this around (do NOT clear when starting edit),
// so a re-render doesn't make the input lose focus / exit edit mode.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let activeEditCell: ActiveEditCell = null

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
  onCursorEmit
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [originalValue, setOriginalValue] = useState<string>('')
  const [editValue, setEditValue] = useState('')

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
      activeEditCell = { rowId, colId: column.id }

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
    activeEditCell = { rowId, colId: column.id }
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
    activeEditCell = null

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

    // Arrow keys - navigate
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      navigateToCell('up')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      navigateToCell('down')
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      navigateToCell('left')
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      navigateToCell('right')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      navigateToCell(e.shiftKey ? 'left' : 'right')
    } else if (e.key === 'Enter') {
      // Enter - start editing (like F2)
      e.preventDefault()
      if (canEdit) startEditing(false)
    } else if (e.key === 'F2') {
      // F2 - edit mode
      e.preventDefault()
      if (canEdit) startEditing(false)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Delete/Backspace - clear cell
      e.preventDefault()
      if (canEdit) {
        onSave(rowId, column.name, '')
      }
    } else if (e.key === 'Escape') {
      // Escape - deselect
      e.preventDefault()
      setSelectedCell(null)
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      // Ctrl+C - copy
      e.preventDefault()
      const textToCopy = String(value ?? '')
      navigator.clipboard.writeText(textToCopy)
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      // Ctrl+V - paste
      e.preventDefault()
      if (canEdit) {
        navigator.clipboard.readText().then(text => {
          onSave(rowId, column.name, text)
        })
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Any printable character - start editing and replace content
      if (canEdit) {
        e.preventDefault()
        // Mark that we started from typing (so cursor goes to end, not select all)
        startedFromTypingRef.current = true
        setOriginalValue(storedFormula || String(value ?? ''))
        setEditValue(e.key)
        setIsEditing(true)
        activeEditCell = { rowId, colId: column.id }
      }
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
      activeEditCell = null
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
    
    // #region agent log
    if (found) fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EditableCell:collaboratorMatch',message:'Found collaborator on this cell',data:{userId:found.userId,userName:found.userName,rowId,colId:column.id,cursorPath:found.cursor?.path,participantsCount:participants.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    
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
        isSelected && !isEditing 
          ? 'gba:ring-2 gba:ring-primary gba:ring-inset' 
          : ''
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
        <div className="gba:relative">
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
  data: Record<string, unknown>[]
  columns: ColumnDef<Record<string, unknown>>[]
  testId: string
  onCellChange?: (rowId: string, columnName: string, value: unknown) => void
  isEditable?: boolean
  onAddRow?: () => void
  showAddRow?: boolean
}

const TableView: React.FC<TableViewProps> = ({ data, columns, testId, onAddRow, showAddRow }) => {
  // Ensure all rows have a unique 'id' property for DataTable (not '_id')
  // Also deduplicate rows to prevent React key warnings
  const dataWithIds = useMemo(() => {
    const seen = new Set<string>()
    const deduped: Record<string, unknown>[] = []
    
    for (const row of data) {
      const rowId = (row.id ?? row._id ?? `row_${deduped.length}`) as string
      if (!seen.has(rowId)) {
        seen.add(rowId)
        deduped.push({
          ...row,
          id: rowId
        })
      }
      // Silently skip duplicates - deduplication handles the issue
    }
    
    return deduped
  }, [data])

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full"
      style={{ width: '100%', minWidth: 0 }}
      data-testid={testId}
    >
      <div className="gba:flex-1 gba:w-full gba:overflow-auto" style={{ minWidth: 0 }}>
        <Card className="spreadsheet-modern-table gba:overflow-hidden gba:border-0 gba:shadow-sm" style={{ minWidth: 'fit-content' }}>
          <style>{`
            .spreadsheet-modern-table table {
              border-collapse: separate;
              border-spacing: 0;
            }
            .spreadsheet-modern-table table td,
            .spreadsheet-modern-table table th {
              padding: 0 !important;
              vertical-align: middle;
            }
            .spreadsheet-modern-table table tr {
              height: auto !important;
            }
            .spreadsheet-modern-table table thead {
              position: sticky;
              top: 0;
              z-index: 10;
            }
            .spreadsheet-modern-table table thead tr {
              background: linear-gradient(180deg, hsl(var(--muted) / 0.6) 0%, hsl(var(--muted) / 0.3) 100%);
              backdrop-filter: blur(8px);
              -webkit-backdrop-filter: blur(8px);
            }
            .spreadsheet-modern-table table thead th {
              border-bottom: 1px solid hsl(var(--border) / 0.5) !important;
              font-weight: 500 !important;
              font-size: 0.8125rem !important;
              letter-spacing: -0.01em;
              color: hsl(var(--foreground) / 0.8);
              transition: background 0.15s ease, color 0.15s ease;
            }
            .spreadsheet-modern-table table thead th:hover {
              background: hsl(var(--muted) / 0.5);
              color: hsl(var(--foreground));
            }
            .spreadsheet-modern-table table thead th:first-child {
              border-top-left-radius: 0.5rem;
            }
            .spreadsheet-modern-table table thead th:last-child {
              border-top-right-radius: 0.5rem;
            }
            .spreadsheet-modern-table table tbody tr {
              transition: background 0.1s ease;
            }
            .spreadsheet-modern-table table tbody tr:hover {
              background: hsl(var(--muted) / 0.15);
            }
            .spreadsheet-modern-table table tbody td {
              border-bottom: 1px solid hsl(var(--border) / 0.3) !important;
            }
          `}</style>
          <DataTable
            columns={columns}
            data={dataWithIds}
            enableResizing={true}
            enableColumnPinning={false}
          />
        </Card>
      </div>
      {/* Add Row button */}
      {showAddRow && onAddRow && (
        <div className="gba:pt-3 gba:pb-4 gba:flex gba:justify-start">
          <Button variant="outline" size="sm" onClick={onAddRow} className="gba:gap-2">
            <Plus className="gba:w-4 gba:h-4" />
            Add Row
          </Button>
        </div>
      )}
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
function formatCellValue(value: unknown, column: SpreadsheetColumn, isStatusColumn?: boolean): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="gba:text-muted-foreground">—</span>
  }

  // Handle formula errors
  if (value === '#ERROR!' || (typeof value === 'string' && value.startsWith('#ERROR'))) {
    return <span className="gba:text-destructive">#ERROR!</span>
  }

  // Check if this looks like a status value and render as badge
  // Check both column.name and column.label since either might contain "status"
  const isStatusByName = column.name?.toLowerCase().includes('status') || column.label?.toLowerCase().includes('status')

  if (typeof value === 'string' && (isStatusColumn || isStatusByName)) {
    const badgeVariant = getStatusBadgeVariant(value)
    if (badgeVariant) {
      return (
        <Badge variant={badgeVariant} className="gba:font-medium">
          {value}
        </Badge>
      )
    }
  }

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
    default:
      return String(value)
  }
}
