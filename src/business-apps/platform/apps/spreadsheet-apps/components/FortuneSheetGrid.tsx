/**
 * FortuneSheetGrid Component
 *
 * Wrapper component that integrates FortuneSheet with our spreadsheet system.
 * Handles data conversion, collaboration, and bidirectional sync.
 *
 * PRODUCTION FIX: Added Error Boundary and stabilization to handle FortuneSheet's
 * internal timing issues that cause "Cannot read properties of undefined (reading 'luckysheet_select_save')"
 * errors specifically in remote-loaded production environments.
 */

import React, {
  useEffect,
  useRef,
  useCallback,
  useMemo,
  useImperativeHandle,
  forwardRef,
  useState,
  useLayoutEffect,
  Component,
  memo
} from 'react'
import { Workbook } from '@fortune-sheet/react'
import type { WorkbookInstance } from '@fortune-sheet/react'
import '@fortune-sheet/react/dist/index.css'
import './FortuneSheetGrid.css'

import type { SpreadsheetSheet, SpreadsheetColumn } from '../types/spreadsheet'
import type { DocumentParticipant, DocumentOperation } from '../../shared/services/CollaborationClient'
import type { FortuneSheetOp } from '../types/fortuneSheet'
import { convertToFortuneSheet, createConversionContext } from '../utils/fortuneSheetConverter'
import { useFortuneSheetCollaboration, useFortuneSheetCursorTracking } from '../hooks/useFortuneSheetCollaboration'

/**
 * Stable toolbar configuration (defined outside component to prevent reference changes)
 */
const TOOLBAR_ITEMS = [
  'undo',
  'redo',
  '|',
  'font-size',
  '|',
  'bold',
  'italic',
  'strike-through',
  'underline',
  '|',
  'font-color',
  'background',
  'border',
  'merge-cell',
  '|',
  'horizontal-align',
  'vertical-align',
  'text-wrap',
  '|',
  'currency-format',
  'percentage-format',
  'number-decrease',
  'number-increase',
  '|',
  'freeze',
  'sort',
  'filter',
  '|',
  'quick-formula'
]

/**
 * Stable context menu configuration (defined outside component to prevent reference changes)
 */
const CELL_CONTEXT_MENU = [
  'copy',
  'paste',
  '|',
  'insert-row',
  'insert-column',
  'delete-row',
  'delete-column',
  '|',
  'hide-row',
  'hide-column',
  '|',
  'clear',
  'sort',
  'filter',
  '|',
  'cell-format'
]

/**
 * Error Boundary specifically for FortuneSheet
 * Catches the "luckysheet_select_save" error and provides recovery
 */
interface FortuneSheetErrorBoundaryProps {
  children: React.ReactNode
  onError?: (error: Error) => void
  fallback?: React.ReactNode
  workbookKey: string
}

interface FortuneSheetErrorBoundaryState {
  hasError: boolean
  error: Error | null
  errorCount: number
  lastWorkbookKey: string
}

/**
 * StableWorkbook - A wrapper around FortuneSheet's Workbook that prevents re-renders
 *
 * CRITICAL: FortuneSheet has a bug where re-rendering the Workbook component can cause
 * "Cannot read properties of undefined (reading 'luckysheet_select_save')" errors.
 * This happens because internal effects access context in dependency arrays before
 * the context is fully initialized during a re-render.
 *
 * This wrapper uses React.memo with a custom comparison that prevents ALL re-renders
 * after the initial mount. Updates to the spreadsheet should be done via the ref API
 * (setCellValue, addPresences, etc.) instead of through props.
 */
interface StableWorkbookProps {
  workbookRef: React.RefObject<WorkbookInstance | null>
  data: unknown[]
  onOp: (ops: FortuneSheetOp[]) => void
  allowEdit: boolean
  showFormulaBar: boolean
  showToolbar: boolean
  showSheetTabs: boolean
  toolbarItems: string[]
  cellContextMenu: string[]
  lang: string
}

const StableWorkbook = memo(
  function StableWorkbook({
    workbookRef,
    data,
    onOp,
    allowEdit,
    showFormulaBar,
    showToolbar,
    showSheetTabs,
    toolbarItems,
    cellContextMenu,
    lang
  }: StableWorkbookProps) {
    // Stable ref callback that updates the workbook ref without logging
    const refCallback = useCallback(
      (instance: WorkbookInstance | null) => {
        if (workbookRef && typeof workbookRef === 'object' && 'current' in workbookRef) {
          ;(workbookRef as React.MutableRefObject<WorkbookInstance | null>).current = instance
        }
      },
      [workbookRef]
    )

    return (
      <Workbook
        ref={refCallback as unknown as React.Ref<WorkbookInstance>}
        data={data as any}
        onOp={onOp}
        allowEdit={allowEdit}
        showFormulaBar={showFormulaBar}
        showToolbar={showToolbar}
        showSheetTabs={showSheetTabs}
        toolbarItems={toolbarItems}
        cellContextMenu={cellContextMenu}
        lang={lang}
      />
    )
  },
  // Custom comparison: NEVER re-render after initial mount
  // All updates should go through the ref API
  () => true
)

class FortuneSheetErrorBoundary extends Component<FortuneSheetErrorBoundaryProps, FortuneSheetErrorBoundaryState> {
  constructor(props: FortuneSheetErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null, errorCount: 0, lastWorkbookKey: props.workbookKey }
  }

  static getDerivedStateFromError(error: Error): Partial<FortuneSheetErrorBoundaryState> {
    return { hasError: true, error }
  }

  static getDerivedStateFromProps(
    props: FortuneSheetErrorBoundaryProps,
    state: FortuneSheetErrorBoundaryState
  ): Partial<FortuneSheetErrorBoundaryState> | null {
    // Reset error state when workbookKey changes (new sheet)
    if (props.workbookKey !== state.lastWorkbookKey) {
      return { hasError: false, error: null, errorCount: 0, lastWorkbookKey: props.workbookKey }
    }
    return null
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[FortuneSheetErrorBoundary] Caught error:', error.message)
    console.error('[FortuneSheetErrorBoundary] Component stack:', errorInfo.componentStack)
    this.props.onError?.(error)

    // Increment error count
    this.setState(prev => ({ errorCount: prev.errorCount + 1 }))
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      // Check if this is the specific FortuneSheet context error
      const isContextError = this.state.error?.message?.includes('luckysheet_select_save')

      if (isContextError && this.state.errorCount < 3) {
        // Auto-retry once for context errors (they're often timing-related)
        // Use requestAnimationFrame to defer retry to next frame
        requestAnimationFrame(() => {
          this.setState({ hasError: false, error: null })
        })
        return (
          this.props.fallback || (
            <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
              <div className="gba:text-muted-foreground">Initializing spreadsheet...</div>
            </div>
          )
        )
      }

      return (
        this.props.fallback || (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:w-full gba:h-full gba:gap-4">
            <div className="gba:text-destructive">Failed to load spreadsheet</div>
            <button
              onClick={this.handleRetry}
              className="gba:px-4 gba:py-2 gba:bg-primary gba:text-primary-foreground gba:rounded gba:hover:bg-primary/90"
            >
              Retry
            </button>
          </div>
        )
      )
    }

    return this.props.children
  }
}

export interface FortuneSheetGridProps {
  /** Current sheet configuration */
  sheet: SpreadsheetSheet
  /** Sheet data in our format */
  data: Record<string, unknown>[]
  /** Column definitions */
  columns: SpreadsheetColumn[]
  /** Whether grid is read-only */
  isReadOnly: boolean
  /** Callback when cell value changes */
  onCellChange: (rowId: string, columnId: string, value: unknown) => void
  /** Callback when data changes (batch update) */
  onDataChange: (data: Record<string, unknown>[]) => void
  /** Callback when a new column needs to be created (auto-column creation) */
  onColumnAdd?: (columnIndex: number, initialValue?: unknown, rowIndex?: number) => void
  /** Callback when formula is evaluated */
  onFormulaEvaluated?: (rowId: string, columnId: string, result: unknown) => void
  /** Active participants in collaboration */
  participants?: DocumentParticipant[]
  /** Emit operation for collaboration */
  onOperationEmit?: (operation: DocumentOperation) => void
  /** Emit cursor position for collaboration */
  onCursorEmit?: (position: { path: string[] }) => void
  /** Whether collaboration is enabled */
  collaborationEnabled?: boolean
  /** Container height */
  height?: string | number
  /** Container width */
  width?: string | number
}

/** Ref handle for imperative actions */
export interface FortuneSheetGridHandle {
  /** Apply a remote cell update without full re-render */
  applyRemoteCellUpdate: (rowIndex: number, colIndex: number, value: unknown) => void
}

/**
 * Custom props comparison for FortuneSheetGrid
 * CRITICAL: Excludes `participants` from comparison to prevent FortuneSheet re-renders
 * when collaboration participants change. FortuneSheet has a bug where re-renders
 * during certain timing windows cause "luckysheet_select_save" errors.
 * We use refs internally to access participants, so this is safe.
 */
function arePropsEqual(prevProps: FortuneSheetGridProps, nextProps: FortuneSheetGridProps): boolean {
  // Compare all props EXCEPT participants
  // participants changes don't need to trigger a re-render because we use refs
  return (
    prevProps.sheet === nextProps.sheet &&
    prevProps.data === nextProps.data &&
    prevProps.columns === nextProps.columns &&
    prevProps.isReadOnly === nextProps.isReadOnly &&
    prevProps.onCellChange === nextProps.onCellChange &&
    prevProps.onDataChange === nextProps.onDataChange &&
    prevProps.onColumnAdd === nextProps.onColumnAdd &&
    prevProps.onOperationEmit === nextProps.onOperationEmit &&
    prevProps.onCursorEmit === nextProps.onCursorEmit &&
    prevProps.collaborationEnabled === nextProps.collaborationEnabled &&
    prevProps.height === nextProps.height &&
    prevProps.width === nextProps.width
    // NOTE: participants intentionally excluded - accessed via ref
  )
}

/**
 * FortuneSheetGrid - Main wrapper component
 * SIMPLIFIED to match original working implementation
 *
 * CRITICAL: Wrapped in memo with custom comparison to prevent re-renders
 * when participants change, which triggers FortuneSheet internal errors.
 */
const FortuneSheetGridInner = forwardRef<FortuneSheetGridHandle, FortuneSheetGridProps>(
  function FortuneSheetGridInner(props, ref) {
    const {
      sheet,
      data,
      columns,
      isReadOnly,
      onCellChange,
      onDataChange,
      onColumnAdd,
      participants = [],
      onOperationEmit = () => {},
      onCursorEmit = () => {},
      collaborationEnabled = false
    } = props

    // Track component instance for debugging (logs removed for performance)
    const mountIdRef = useRef(Math.random().toString(36).slice(2, 8))

    // CRITICAL: FortuneSheet only initializes from data prop ONCE
    // After initial mount, we MUST use imperative API for updates
    // This ref stores the initial data that was used to mount the Workbook
    const initialDataRef = useRef<{
      sheetId: string
      data: Record<string, unknown>[]
      columns: SpreadsheetColumn[]
    } | null>(null)

    // Track if Workbook has been initialized
    const [isInitialized, setIsInitialized] = useState(false)

    // PRODUCTION FIX: Track if the component tree is stable (after first paint)
    // This prevents FortuneSheet from rendering during React's initial reconciliation
    // which can cause timing issues with its internal context in remote-loaded components
    const [isStable, setIsStable] = useState(false)

    // Key for forcing Workbook remount ONLY when sheet changes
    const [workbookKey, setWorkbookKey] = useState(() => `workbook-${sheet.id}`)

    // Track if we're currently processing a local edit (to prevent feedback loops)
    const isLocalEditRef = useRef(false)

    // Track pending row creations to prevent infinite loops
    const pendingRowCreations = useRef<Set<number>>(new Set())

    // Track pending column creations to prevent infinite loops
    const pendingColumnCreations = useRef<Set<number>>(new Set())

    const workbookRef = useRef<WorkbookInstance | null>(null)
    const presenceUsersRef = useRef<Map<string, { username: string; userId?: string }>>(new Map())

    // Track current sheet.id to detect actual sheet changes
    const currentSheetIdRef = useRef(sheet.id)

    // PRODUCTION FIX: Use useLayoutEffect to mark component as stable after first paint
    // This ensures FortuneSheet doesn't render during React's concurrent reconciliation
    // which causes timing issues with FortuneSheet's internal context initialization
    useLayoutEffect(() => {
      if (isStable) return

      // Use requestAnimationFrame to defer to after the browser paint
      // This ensures the React tree is fully committed before we render FortuneSheet
      const frameId = requestAnimationFrame(() => {
        setIsStable(true)
      })

      return () => cancelAnimationFrame(frameId)
    }, [isStable])

    // Initialize only once when data is ready AND component is stable
    // FortuneSheet ignores data prop changes after initial mount - this is BY DESIGN
    useEffect(() => {
      // Wait for stability before initializing
      if (!isStable) return

      // Only initialize if not already initialized and data is available
      if (!isInitialized && data.length >= 0 && columns.length >= 0) {
        // Store the initial data used for mounting
        initialDataRef.current = {
          sheetId: sheet.id,
          data: data,
          columns: columns
        }

        setIsInitialized(true)
      }
    }, [isStable, isInitialized, data, columns, sheet.id])

    // Handle sheet changes - ONLY remount when sheet.id actually changes
    useEffect(() => {
      if (currentSheetIdRef.current !== sheet.id) {
        currentSheetIdRef.current = sheet.id

        // Reset initialization state - this will trigger a fresh init
        initialDataRef.current = null
        setIsInitialized(false)
        setIsStable(false) // Reset stability for new sheet
        setWorkbookKey(`workbook-${sheet.id}`)
      }
    }, [sheet.id])

    // Use refs to keep callback references stable and prevent FortuneSheet reinitializations
    const onCellChangeRef = useRef(onCellChange)
    const onDataChangeRef = useRef(onDataChange)
    const onColumnAddRef = useRef(onColumnAdd)
    const columnsRef = useRef(columns)
    const dataRef = useRef(data)
    const collaborationEnabledRef = useRef(collaborationEnabled)

    // Update refs on each render
    onCellChangeRef.current = onCellChange
    onDataChangeRef.current = onDataChange
    onColumnAddRef.current = onColumnAdd
    columnsRef.current = columns
    dataRef.current = data
    collaborationEnabledRef.current = collaborationEnabled

    // Create conversion context - always use CURRENT data for lookups
    const context = useMemo(() => createConversionContext(columns, data), [columns, data])

    // Convert INITIAL data to FortuneSheet format - ONLY computed once per sheet
    // This is critical: FortuneSheet ignores data prop changes after mount
    // We use the stored initial data, not the current props
    const fortuneSheetData = useMemo(() => {
      // Only compute when we have initial data stored
      if (!initialDataRef.current) {
        return null
      }

      const { data: initData, columns: initColumns } = initialDataRef.current

      try {
        const converted = convertToFortuneSheet(sheet, initData, initColumns)
        return [converted] // FortuneSheet expects array of sheets
      } catch (error) {
        console.error('[FortuneSheetGrid] Conversion error:', error)
        return null
      }
      // Only recompute when isInitialized changes (meaning fresh init) or sheet changes
    }, [isInitialized, sheet.id])

    // Apply remote cell updates directly to FortuneSheet without full re-render
    const applyRemoteCellUpdate = useCallback((rowIndex: number, colIndex: number, value: unknown) => {
      const workbook = workbookRef.current
      if (!workbook) return

      try {
        isLocalEditRef.current = true
        workbook.setCellValue(rowIndex, colIndex, value)
      } catch (error) {
        console.error('[FortuneSheetGrid] Failed to apply remote cell update:', error)
      } finally {
        setTimeout(() => {
          isLocalEditRef.current = false
        }, 50)
      }
    }, [])

    // Expose imperative methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        applyRemoteCellUpdate
      }),
      [applyRemoteCellUpdate]
    )

    /**
     * Apply remote operation to FortuneSheet using cell-level API
     */
    const applyOperationToFortuneSheet = useCallback(
      (op: FortuneSheetOp) => {
        if (op.op === 'replace' && op.path.length >= 3 && op.path[0] === 'data') {
          const rowIndex = op.path[1] as number
          const colIndex = op.path[2] as number
          let value = op.value
          if (value && typeof value === 'object' && 'v' in value) {
            value = (value as { v: unknown }).v
          }
          applyRemoteCellUpdate(rowIndex, colIndex, value)
        }
      },
      [applyRemoteCellUpdate]
    )

    // Store context in ref for stable callbacks
    const contextRef = useRef(context)
    contextRef.current = context

    // Collaboration hooks
    const collaboration = useFortuneSheetCollaboration({
      sheetId: sheet.id,
      context,
      enabled: collaborationEnabled,
      onOperationEmit,
      onApplyOperation: applyOperationToFortuneSheet,
      debounceDelay: 300
    })

    // CRITICAL: Store collaboration in ref to keep handleOp stable
    // This prevents FortuneSheet from reinitializing when collaboration changes
    const collaborationRef = useRef(collaboration)
    collaborationRef.current = collaboration

    const cursorTracking = useFortuneSheetCursorTracking({
      sheetId: sheet.id,
      context,
      enabled: collaborationEnabled,
      onCursorEmit
    })

    // Store cursorTracking in ref to keep effect stable
    const cursorTrackingRef = useRef(cursorTracking)
    cursorTrackingRef.current = cursorTracking

    // Store isInitialized and isStable in ref for polling
    const isInitializedRef = useRef(isInitialized && isStable)
    isInitializedRef.current = isInitialized && isStable

    // Poll current selection to emit cursor updates for collaboration (throttled)
    useEffect(() => {
      if (!collaborationEnabledRef.current) return

      let lastSelection: { row: number; col: number } | null = null
      const interval = setInterval(() => {
        if (!collaborationEnabledRef.current) return
        if (!isInitializedRef.current) return

        const workbook = workbookRef.current
        if (!workbook || typeof workbook.getSelection !== 'function') return

        let selections
        try {
          selections = workbook.getSelection()
        } catch {
          return
        }
        const first = selections?.[0]
        const row = first?.row?.[0]
        const col = first?.column?.[0]

        if (typeof row !== 'number' || typeof col !== 'number') return

        if (!lastSelection || lastSelection.row !== row || lastSelection.col !== col) {
          lastSelection = { row, col }
          cursorTrackingRef.current.handleCellSelection(row, col)
        }
      }, 500)

      return () => clearInterval(interval)
    }, [])

    // Store participants and sheetId in refs for stable presence sync
    // (contextRef is already declared earlier)
    const participantsRef = useRef(participants)
    const sheetIdRef = useRef(sheet.id)
    participantsRef.current = participants
    sheetIdRef.current = sheet.id

    // Sync remote cursor presence into FortuneSheet UI (debounced)
    const lastPresenceUpdateRef = useRef<number>(0)
    useEffect(() => {
      if (!isInitializedRef.current) return

      const workbook = workbookRef.current
      if (!workbook || !collaborationEnabledRef.current) return

      const now = Date.now()
      if (now - lastPresenceUpdateRef.current < 300) return
      lastPresenceUpdateRef.current = now

      const currentParticipants = participantsRef.current
      const currentContext = contextRef.current
      const currentSheetId = sheetIdRef.current

      const presences =
        currentParticipants
          ?.map(participant => {
            const cursorPath = participant.cursor?.path
            if (!Array.isArray(cursorPath) || cursorPath.length < 3) return null

            const [cursorSheetId, rowId, columnId] = cursorPath
            if (cursorSheetId !== currentSheetId || !rowId || !columnId) return null

            const rowIndex = currentContext.rowIdToIndex.get(String(rowId))
            const colIndex = currentContext.columnIdToIndex.get(String(columnId))
            if (rowIndex === undefined || colIndex === undefined) return null

            return {
              sheetId: currentSheetId,
              username: participant.userName || participant.userId || 'User',
              userId: participant.userId,
              color: participant.userColor || '#3b82f6',
              selection: { r: rowIndex, c: colIndex }
            }
          })
          .filter(Boolean) || []

      const nextUsers = new Map<string, { username: string; userId?: string }>()
      presences.forEach(p => {
        if (!p) return
        nextUsers.set(p.userId || p.username, { username: p.username, userId: p.userId })
      })

      const toRemove: { username: string; userId?: string }[] = []
      presenceUsersRef.current.forEach((user, key) => {
        if (!nextUsers.has(key)) toRemove.push(user)
      })

      try {
        if (toRemove.length > 0) workbook.removePresences(toRemove)
        if (presences.length > 0) {
          workbook.addPresences(
            presences as Array<{
              sheetId: string
              username: string
              userId?: string
              color: string
              selection: { r: number; c: number }
            }>
          )
        }
      } catch {
        return
      }

      presenceUsersRef.current = nextUsers
    }, [participants])

    /**
     * Handle FortuneSheet onOp event
     * CRITICAL: This callback MUST be completely stable (never change reference)
     * to prevent FortuneSheet from reinitializing on prop changes.
     * Uses refs for ALL dynamic values.
     */
    const handleOp = useCallback(
      (ops: FortuneSheetOp[]) => {
        // Ignore operations that come from programmatic updates (remote sync)
        if (isLocalEditRef.current) {
          return
        }

        if (!ops || ops.length === 0) {
          return
        }

        // Process each operation
        ops.forEach(op => {
          // Handle collaboration sync - emit to other users
          // Use ref to get current collaboration instance
          if (collaborationEnabledRef.current && collaborationRef.current) {
            collaborationRef.current.handleFortuneSheetOp(op)
          }

          // Handle cell changes for callbacks
          if (op.op === 'replace' && op.path.length >= 3 && op.path[0] === 'data') {
            const rowIndex = op.path[1] as number
            const colIndex = op.path[2] as number

            // Skip styling-only changes
            if (op.path.length === 4) {
              const prop = op.path[3]
              if (prop !== 'v') {
                return
              }
            }

            // Use contextRef to get current context
            const currentContext = contextRef.current
            const rowId = currentContext.rowIndexToId.get(rowIndex)
            const columnId = currentContext.columnIndexToId.get(colIndex)

            // Extract cell value
            let cellValue = op.value
            if (cellValue && typeof cellValue === 'object' && 'v' in cellValue) {
              cellValue = (cellValue as { v: unknown }).v
            }

            // Handle new column
            if (!columnId) {
              if (pendingColumnCreations.current.has(colIndex)) {
                return
              }

              if (onColumnAddRef.current) {
                pendingColumnCreations.current.add(colIndex)
                onColumnAddRef.current(colIndex, cellValue, rowIndex)
                setTimeout(() => {
                  pendingColumnCreations.current.delete(colIndex)
                }, 2000)
              }
              return
            }

            // Handle new row
            if (!rowId && columnId) {
              if (pendingRowCreations.current.has(rowIndex)) {
                return
              }

              pendingRowCreations.current.add(rowIndex)

              const currentColumns = columnsRef.current
              const column = currentColumns.find(c => c.id === columnId)
              const columnName = column?.name || columnId

              if (onDataChangeRef.current) {
                const newRow: Record<string, unknown> = { [columnName]: cellValue }
                currentColumns.forEach(col => {
                  if (col.name !== columnName) {
                    newRow[col.name] = col.defaultValue ?? ''
                  }
                })

                const newData = [...dataRef.current]
                while (newData.length < rowIndex) {
                  const emptyRow: Record<string, unknown> = {}
                  currentColumns.forEach(col => {
                    emptyRow[col.name] = col.defaultValue ?? ''
                  })
                  newData.push(emptyRow)
                }
                newData.push(newRow)

                onDataChangeRef.current(newData)

                setTimeout(() => {
                  pendingRowCreations.current.delete(rowIndex)
                }, 1000)
              }
              return
            }

            if (rowId && columnId) {
              const currentColumns = columnsRef.current
              const column = currentColumns.find(c => c.id === columnId)
              const columnName = column?.name || columnId

              onCellChangeRef.current(rowId, columnName, cellValue)
            }
          }
        })
      },
      // EMPTY dependency array - uses refs for everything to ensure complete stability
      []
    )

    // Render loading state - wait for stability and initialization
    if (!isStable || !fortuneSheetData || !isInitialized) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
          <div className="gba:text-muted-foreground">Loading spreadsheet...</div>
        </div>
      )
    }

    return (
      <div
        className="fortunesheet-container"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden'
        }}
      >
        <FortuneSheetErrorBoundary
          workbookKey={workbookKey}
          onError={error => {
            console.error(`[FortuneSheetGrid:${mountIdRef.current}] FortuneSheet error:`, error.message)
          }}
        >
          {/* 
            CRITICAL: StableWorkbook prevents re-renders after initial mount.
            The key prop ensures remounting when sheet changes.
            All dynamic updates go through workbookRef (setCellValue, addPresences, etc.)
          */}
          <StableWorkbook
            key={workbookKey}
            workbookRef={workbookRef}
            data={fortuneSheetData}
            onOp={handleOp}
            allowEdit={!isReadOnly}
            showFormulaBar={true}
            showToolbar={true}
            showSheetTabs={false}
            toolbarItems={TOOLBAR_ITEMS}
            cellContextMenu={CELL_CONTEXT_MENU}
            lang="en"
          />
        </FortuneSheetErrorBoundary>
      </div>
    )
  }
)

/**
 * Memoized FortuneSheetGrid
 * Uses custom comparison to prevent re-renders when only participants change
 */
export const FortuneSheetGrid = memo(FortuneSheetGridInner, arePropsEqual)

export default FortuneSheetGrid
