/**
 * BoardViewer - runtime viewer for a board.
 *
 * Renders the active sheet through the selected view (table/kanban/calendar/etc.).
 * Loads rows on demand (never eagerly) for performance at scale.
 *
 * Exposes imperative handle so the parent can open overlays (search, settings, import)
 * from its own header without duplicating state.
 */

import React, { useState, useCallback, useEffect, useMemo, useImperativeHandle, forwardRef, useRef } from 'react'
import { Spinner } from '@newwork/nw-design-system'
import type { Board, BoardSheet, BoardRow, BoardQuickFilter } from './types'
import { RowPagePanel } from './components/RowPagePanel'
import { BoardViewContent } from './components/BoardViewContent'
import { useBoardRealtime } from './hooks/useBoardRealtime'
import { BoardViewerTabs } from './components/viewer/BoardViewerTabs'
import { BoardViewerFooter } from './components/viewer/BoardViewerFooter'
import { BoardViewerOverlays } from './components/viewer/BoardViewerOverlays'
import { SystemDataSheet } from './components/system-data/SystemDataSheet'
import { FlowEngineDataSheet } from './components/flow-engine/FlowEngineDataSheet'
import { BoardApiService } from './services/BoardApiService'
import { useDashboardData } from './hooks/useDashboardData'
import { usePeopleColumnOptions } from './hooks/usePeopleColumnOptions'

function readInitialServerFilters(): { filters?: string; filterConnector?: 'and' | 'or'; sorts?: string } {
  try {
    const params = new URLSearchParams(globalThis.window?.location?.search || '')
    const bf = params.get('bf')
    const bc = params.get('bc')
    const bs = params.get('bs')
    const result: { filters?: string; filterConnector?: 'and' | 'or'; sorts?: string } = {}
    if (bf) {
      const parsed = JSON.parse(decodeURIComponent(bf))
      if (Array.isArray(parsed) && parsed.length > 0) {
        result.filters = JSON.stringify(
          parsed.map((f: Record<string, unknown>) => ({
            column: f.column,
            operator: f.operator,
            value: f.value,
            ...(f.secondValue !== undefined ? { secondValue: f.secondValue } : {})
          }))
        )
        if (bc === 'or') result.filterConnector = 'or'
      }
    }
    if (bs) {
      const parsed = JSON.parse(decodeURIComponent(bs))
      if (Array.isArray(parsed) && parsed.length > 0) {
        result.sorts = JSON.stringify(
          parsed.map((s: Record<string, unknown>) => ({ column: s.column, direction: s.direction }))
        )
      }
    }
    return result
  } catch {
    return {}
  }
}

export interface BoardViewerHandle {
  openSearch: () => void
  openSettings: () => void
  openSystemData: () => void
  openFlowData: () => void
  navigateToRow: (sheetId: string, rowId: string, position?: number) => void
}

export interface BoardViewerProps {
  board: Board
  accessToken: string
  userId: string
  initialSheetId?: string | null
  initialViewId?: string | null
  initialPage?: number
  onSheetIdChange?: (id: string | null) => void
  onViewIdChange?: (id: string | null) => void
  onPageChange?: (p: number) => void
  onReloadBoard?: (id: string) => Promise<void>
  onBoardUpdate?: (id: string, updates: Partial<Board>) => Promise<void>
  onSheetUpdate?: (boardId: string, sheetId: string, updates: Partial<BoardSheet>) => Promise<BoardSheet | null>
  rows: BoardRow[]
  rowsLoading: boolean
  rowsTotal: number
  rowsError?: string | null
  onLoadRows: (
    boardId: string,
    sheetId: string,
    options?: {
      page?: number
      limit?: number
      sort?: string
      sortOrder?: 'ASC' | 'DESC'
      search?: string
      filters?: string
      filterConnector?: 'and' | 'or'
      sorts?: string
      append?: boolean
    }
  ) => Promise<void>
  onCreateRow?: (boardId: string, sheetId: string, data: Record<string, unknown>) => Promise<BoardRow | null>
  onUpdateRow?: (boardId: string, sheetId: string, rowId: string, data: Record<string, unknown>) => Promise<void>
  onDeleteRow?: (boardId: string, sheetId: string, rowId: string) => Promise<boolean>
  'data-testid'?: string
}

export const BoardViewer = forwardRef<BoardViewerHandle, BoardViewerProps>(function BoardViewer(
  {
    board,
    accessToken,
    userId,
    initialSheetId,
    initialViewId,
    initialPage,
    onSheetIdChange,
    onViewIdChange,
    onPageChange,
    onReloadBoard,
    onBoardUpdate,
    onSheetUpdate,
    onLoadRows,
    onCreateRow,
    onUpdateRow,
    onDeleteRow,
    rows,
    rowsLoading,
    rowsTotal,
    rowsError,
    'data-testid': testId = 'board-viewer'
  },
  ref
) {
  const resolveInitSheet = () => {
    if (initialSheetId && board.sheets.some(s => s.id === initialSheetId)) return initialSheetId
    return board.sheets[0]?.id || ''
  }
  const [activeSheetId, setActiveSheetIdRaw] = useState(resolveInitSheet)
  const [activeViewId, setActiveViewIdRaw] = useState(initialViewId || '')
  const [page, setPageRaw] = useState(initialPage || 1)

  const setActiveSheetId = useCallback(
    (id: string) => {
      setActiveSheetIdRaw(id)
      onSheetIdChange?.(id)
    },
    [onSheetIdChange]
  )

  const setActiveViewId = useCallback(
    (id: string) => {
      setActiveViewIdRaw(id)
      onViewIdChange?.(id)
    },
    [onViewIdChange]
  )

  const setPage = useCallback(
    (p: number | ((prev: number) => number)) => {
      setPageRaw(prev => {
        const next = typeof p === 'function' ? p(prev) : p
        onPageChange?.(next)
        return next
      })
    },
    [onPageChange]
  )
  const canEdit =
    !board.permission || board.permission === 'owner' || board.permission === 'edit' || board.permission === 'admin'

  const [activeRow, setActiveRow] = useState<BoardRow | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddViewOpen, setIsAddViewOpen] = useState(false)
  const [isSystemDataOpen, setIsSystemDataOpen] = useState(false)
  const [isFlowEngineDataOpen, setIsFlowEngineDataOpen] = useState(false)
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null)
  const tableNextPageRef = useRef(1)
  const kanbanNextPageRef = useRef(1)
  const serverFilterRef = useRef<{ filters?: string; filterConnector?: 'and' | 'or'; sorts?: string }>(
    readInitialServerFilters()
  )
  const navigateLoadingRef = useRef(false)
  const KANBAN_BATCH = 500

  const DEFAULT_TABLE_VIEW: import('./types').BoardView = useMemo(
    () => ({
      id: '_default_table',
      name: 'Table',
      type: 'table' as const,
      isDefault: true,
      config: { type: 'table' as const, density: 'compact' as const }
    }),
    []
  )

  const activeSheet = useMemo(() => {
    const raw = board.sheets.find(s => s.id === activeSheetId) || board.sheets[0]
    if (!raw) return raw
    const views = raw.views || []
    const hasTable = views.some(v => v.type === 'table')
    if (!hasTable) {
      return { ...raw, views: [DEFAULT_TABLE_VIEW, ...views] }
    }
    return raw
  }, [board.sheets, activeSheetId, DEFAULT_TABLE_VIEW])

  const { options: peopleOptions, lookupMap: peopleLookup } = usePeopleColumnOptions(
    accessToken,
    activeSheet?.columns ?? []
  )

  const enrichedSheet = useMemo(() => {
    if (!activeSheet || peopleOptions.length === 0) return activeSheet
    const enrichedColumns = activeSheet.columns.map(col => {
      if (col.type !== 'people') return col
      return { ...col, selectOptions: peopleOptions }
    })
    return { ...activeSheet, columns: enrichedColumns }
  }, [activeSheet, peopleOptions])

  const quickFilters = useMemo(() => activeSheet?.settings?.quickFilters ?? [], [activeSheet])

  const qfInitDone = useRef(false)
  useEffect(() => {
    if (qfInitDone.current || quickFilters.length === 0) return
    qfInitDone.current = true
    try {
      const params = new URLSearchParams(globalThis.window?.location?.search || '')
      const qfIds = params.getAll('qf')
      if (qfIds.length === 0) return
      const defMap = new Map(quickFilters.map(d => [d.id, d]))
      const qfConditions = qfIds
        .map(id => defMap.get(id))
        .filter((d): d is BoardQuickFilter => d != null)
        .map(d => ({
          column: d.column,
          operator: d.operator,
          value: d.value,
          ...(d.secondValue !== undefined ? { secondValue: d.secondValue } : {})
        }))
      if (qfConditions.length === 0) return
      const existing = serverFilterRef.current.filters ? (JSON.parse(serverFilterRef.current.filters) as unknown[]) : []
      serverFilterRef.current = {
        ...serverFilterRef.current,
        filters: JSON.stringify([...existing, ...qfConditions]),
        filterConnector: 'and'
      }
    } catch {
      /* ignore parse errors */
    }
  }, [quickFilters])

  const addQuickFilter = useCallback(
    (qf: BoardQuickFilter) => {
      if (!activeSheet || !onSheetUpdate || !canEdit) return
      const next = [...(activeSheet.settings?.quickFilters ?? []), qf]
      void onSheetUpdate(board.id, activeSheet.id, { settings: { ...activeSheet.settings, quickFilters: next } } as any)
    },
    [activeSheet, board.id, canEdit, onSheetUpdate]
  )

  const renameQuickFilter = useCallback(
    (id: string, name: string) => {
      if (!activeSheet || !onSheetUpdate || !canEdit) return
      const next = (activeSheet.settings?.quickFilters ?? []).map(qf => (qf.id === id ? { ...qf, name } : qf))
      void onSheetUpdate(board.id, activeSheet.id, { settings: { ...activeSheet.settings, quickFilters: next } } as any)
    },
    [activeSheet, board.id, canEdit, onSheetUpdate]
  )

  const deleteQuickFilter = useCallback(
    (id: string) => {
      if (!activeSheet || !onSheetUpdate || !canEdit) return
      const next = (activeSheet.settings?.quickFilters ?? []).filter(qf => qf.id !== id)
      void onSheetUpdate(board.id, activeSheet.id, { settings: { ...activeSheet.settings, quickFilters: next } } as any)
    },
    [activeSheet, board.id, canEdit, onSheetUpdate]
  )

  const activeView = useMemo(() => {
    if (!enrichedSheet) return null
    if (activeViewId) return enrichedSheet.views.find(v => v.id === activeViewId) || enrichedSheet.views[0]
    return enrichedSheet.views.find(v => v.isDefault) || enrichedSheet.views[0]
  }, [enrichedSheet, activeViewId])

  const navigateToRow = useCallback(
    (targetSheetId: string, rowId: string, position?: number) => {
      const effectiveSheetId = targetSheetId || activeSheetId
      const rowInMemory = rows.some(r => r.id === rowId)
      const isKanban = activeView?.type === 'kanban'

      if (!rowInMemory && isKanban) {
        navigateLoadingRef.current = true
      }

      if (effectiveSheetId && effectiveSheetId !== activeSheetId) {
        setActiveSheetId(effectiveSheetId)
        setActiveViewId('')
        setPage(1)
      }

      setHighlightedRowId(rowId)
      if (rowInMemory) return

      const sheet = board.sheets.find(s => s.id === effectiveSheetId) || board.sheets[0]
      const rpp = sheet?.settings.rowsPerPage || 50

      void (async () => {
        const located = await BoardApiService.locateRow(board.id, effectiveSheetId, rowId)
        const rowIndex = located?.rowIndex ?? position ?? -1
        if (rowIndex < 0) {
          navigateLoadingRef.current = false
          return
        }

        const targetPage = Math.floor(rowIndex / rpp) + 1

        if (isKanban) {
          try {
            const limit = Math.min(rowsTotal, rowIndex + 1, 500)
            await onLoadRows(board.id, effectiveSheetId, {
              page: 1,
              limit,
              ...serverFilterRef.current
            })
            kanbanNextPageRef.current = Math.ceil(limit / KANBAN_BATCH) + 1
          } finally {
            navigateLoadingRef.current = false
          }
        } else {
          const neededLimit = rowIndex + rpp
          if (neededLimit <= 500) {
            await onLoadRows(board.id, effectiveSheetId, {
              page: 1,
              limit: neededLimit,
              ...serverFilterRef.current
            })
            tableNextPageRef.current = Math.ceil(neededLimit / rpp) + 1
          } else {
            await onLoadRows(board.id, effectiveSheetId, {
              page: targetPage,
              limit: rpp,
              ...serverFilterRef.current
            })
            tableNextPageRef.current = targetPage + 1
          }
        }
      })()
    },
    [activeSheetId, activeView?.type, board.id, board.sheets, onLoadRows, rows, rowsTotal]
  )

  useImperativeHandle(
    ref,
    () => ({
      openSearch: () => setIsSearchOpen(true),
      openSettings: () => setIsSettingsOpen(true),
      openSystemData: () => setIsSystemDataOpen(true),
      openFlowData: () => setIsFlowEngineDataOpen(true),
      navigateToRow
    }),
    [navigateToRow]
  )

  useEffect(() => {
    if (!activeSheet) return
    const defaultView = activeSheet.views.find(v => v.isDefault) || activeSheet.views[0]
    if (defaultView && !activeViewId) setActiveViewId(defaultView.id)
  }, [activeSheet, activeViewId])

  const viewType = activeView?.type || 'table'
  const isKanbanView = viewType === 'kanban'

  useEffect(() => {
    if (!activeSheet || navigateLoadingRef.current) return
    if (!isKanbanView) return
    const opts = { ...serverFilterRef.current }
    kanbanNextPageRef.current = 2
    void onLoadRows(board.id, activeSheet.id, { page: 1, limit: KANBAN_BATCH, ...opts })
  }, [board.id, activeSheet, isKanbanView, onLoadRows])

  useEffect(() => {
    if (!activeSheet || !isKanbanView || rowsLoading) return
    if (rows.length >= rowsTotal || rowsTotal <= 0) return
    const targetPage = Math.ceil(rows.length / KANBAN_BATCH) + 1
    const totalPages = Math.ceil(rowsTotal / KANBAN_BATCH)
    if (targetPage > totalPages) return
    kanbanNextPageRef.current = targetPage + 1
    void onLoadRows(board.id, activeSheet.id, {
      page: targetPage,
      limit: KANBAN_BATCH,
      append: true,
      ...serverFilterRef.current
    })
  }, [activeSheet, board.id, isKanbanView, onLoadRows, rows.length, rowsTotal])

  const liveEnabled = Boolean((board.settings as any)?.liveUpdatesEnabled)
  useBoardRealtime({
    boardId: board.id,
    accessToken,
    enabled: liveEnabled,
    onEvent: event => {
      if (!activeSheet) return
      if (event.sheetId && event.sheetId !== activeSheet.id) return
      const opts = { ...serverFilterRef.current }
      if (isKanbanView) {
        kanbanNextPageRef.current = 2
        void onLoadRows(board.id, activeSheet.id, { page: 1, limit: KANBAN_BATCH, ...opts })
      } else {
        tableNextPageRef.current = 2
        void onLoadRows(board.id, activeSheet.id, {
          page: 1,
          limit: activeSheet.settings.rowsPerPage || 50,
          ...opts
        })
      }
    }
  })

  const autoSyncDoneRef = useRef(false)
  useEffect(() => {
    if (!activeSheet || autoSyncDoneRef.current) return
    const ds = activeSheet.entityDataSource as Record<string, unknown> | undefined
    if (!ds?.enabled || ds.refreshMode !== 'onOpen') return
    autoSyncDoneRef.current = true
    void (async () => {
      try {
        const { BoardApiService } = await import('./services/BoardApiService')
        const dsLimit = ds.limit != null ? (ds.limit as number) : 200
        if (ds.mergeStrategy === 'populateOptions' && ds.populateTargetCol && ds.populateSourceField) {
          await BoardApiService.populateColumnOptions(
            board.id,
            activeSheet.id,
            ds.entityType as string,
            ds.populateSourceField as string,
            ds.populateTargetCol as string,
            dsLimit
          )
        } else if (ds.provider === 'flowEngine') {
          await BoardApiService.syncFromFlowEngine(board.id, activeSheet.id, {
            flowEntity: (ds.flowEntity as 'flows' | 'tasks') || 'flows',
            templateIds: ds.templateIds as string[] | undefined,
            tags: ds.tags as Array<{ key: string; value: string }> | undefined,
            scope: (ds.scope as 'all' | 'byUser') || 'all',
            userId: ds.userId as string | undefined,
            participationType: ds.participationType as 'initiated' | 'participated' | undefined,
            status: ds.status as string | undefined,
            customStatus: ds.customStatus as string | undefined,
            priority: ds.priority as string | undefined,
            limit: dsLimit,
            mode: 'replace',
            autoColumns: true
          })
        } else {
          await BoardApiService.syncFromGraphQL(board.id, activeSheet.id, {
            entity: ds.entityType as string,
            limit: dsLimit,
            mode: 'replace',
            autoColumns: true
          })
        }
        void onReloadBoard?.(board.id)
        const rpp = activeSheet.settings.rowsPerPage || 50
        const opts = { ...serverFilterRef.current }
        if (isKanbanView) {
          kanbanNextPageRef.current = 2
          void onLoadRows(board.id, activeSheet.id, { page: 1, limit: KANBAN_BATCH, ...opts })
        } else {
          tableNextPageRef.current = 2
          void onLoadRows(board.id, activeSheet.id, { page: 1, limit: rpp, ...opts })
        }
      } catch {
        /* silent */
      }
    })()
  }, [activeSheet, board.id, isKanbanView, onReloadBoard, onLoadRows])

  useEffect(() => {
    setActiveRow(null)
  }, [activeSheetId])

  const handleAddRow = useCallback(async () => {
    if (!activeSheet || !onCreateRow) return
    const emptyData: Record<string, unknown> = {}
    activeSheet.columns.forEach(col => {
      emptyData[col.name] = col.defaultValue ?? ''
    })
    await onCreateRow(board.id, activeSheet.id, emptyData)
  }, [board.id, activeSheet, onCreateRow])

  const isDashboardView = activeView?.type === 'dashboard'
  const dashboardData = useDashboardData(
    board.id,
    activeSheet?.id || '',
    isDashboardView,
    serverFilterRef.current,
    activeSheet?.entityDataSource
  )

  const handleServerFilterChange = useCallback(
    (params: { filters?: string; filterConnector?: 'and' | 'or'; sorts?: string }) => {
      serverFilterRef.current = params
      if (!activeSheet) return
      const rpp = activeSheet.settings.rowsPerPage || 50
      if (isKanbanView) {
        kanbanNextPageRef.current = 2
        void onLoadRows(board.id, activeSheet.id, { page: 1, limit: KANBAN_BATCH, ...params })
      } else {
        tableNextPageRef.current = 2
        void onLoadRows(board.id, activeSheet.id, { page: 1, limit: rpp, ...params })
      }
    },
    [activeSheet, board.id, isKanbanView, onLoadRows]
  )

  const handleRowOpen = useCallback((row: BoardRow) => {
    setActiveRow(row)
  }, [])

  const handleTableLoadMore = useCallback(() => {
    if (!activeSheet || isKanbanView || rowsLoading) return
    const rpp = activeSheet.settings.rowsPerPage || 50
    const nextPage = tableNextPageRef.current
    const totalPages = Math.ceil(rowsTotal / rpp)
    if (nextPage > totalPages) return
    tableNextPageRef.current = nextPage + 1
    void onLoadRows(board.id, activeSheet.id, {
      page: nextPage,
      limit: rpp,
      append: true,
      ...serverFilterRef.current
    })
  }, [activeSheet, board.id, isKanbanView, onLoadRows, rowsLoading, rowsTotal])

  const handlePageCreated = useCallback(() => {
    if (!activeSheet) return
    const rpp = activeSheet.settings.rowsPerPage || 50
    const opts = { ...serverFilterRef.current }
    if (isKanbanView) {
      kanbanNextPageRef.current = 2
      void onLoadRows(board.id, activeSheet.id, { page: 1, limit: KANBAN_BATCH, ...opts })
    } else {
      tableNextPageRef.current = 2
      void onLoadRows(board.id, activeSheet.id, { page: 1, limit: rpp, ...opts })
    }
  }, [activeSheet, board.id, isKanbanView, onLoadRows])

  const handleSheetChange = useCallback((sheetId: string) => {
    setActiveSheetId(sheetId)
    setActiveViewId('')
    setPage(1)
  }, [])

  const totalPages = Math.ceil(rowsTotal / (activeSheet?.settings.rowsPerPage || 50))

  const [scrollParent, setScrollParent] = useState<HTMLDivElement | null>(null)
  const scrollRefCallback = useCallback((el: HTMLDivElement | null) => {
    if (el) setScrollParent(el)
  }, [])

  return (
    <div className="gba:flex gba:flex-col gba:flex-1 gba:min-h-0 gba:min-w-0 gba:overflow-hidden" data-testid={testId}>
      {activeSheet && (
        <BoardViewerTabs
          views={activeSheet.views}
          activeViewId={activeView?.id || ''}
          onSelectView={setActiveViewId}
          onDeleteView={
            onSheetUpdate
              ? viewId => {
                  const target = activeSheet.views.find(v => v.id === viewId)
                  if (!target || target.type === 'table') return
                  const nextViews = activeSheet.views.filter(v => v.id !== viewId)
                  if (activeViewId === viewId) {
                    const fallback = nextViews[0]
                    if (fallback) setActiveViewId(fallback.id)
                  }
                  void onSheetUpdate(board.id, activeSheet.id, { views: nextViews } as any)
                }
              : undefined
          }
          onReorderViews={
            onSheetUpdate
              ? reordered => {
                  void onSheetUpdate(board.id, activeSheet.id, { views: reordered } as any)
                }
              : undefined
          }
          existingColumns={activeSheet.columns}
          boardId={board.id}
          sheetId={activeSheet.id}
          onAddColumn={column => {
            if (!onSheetUpdate) return
            const nextColumns = [...activeSheet.columns, column].map((c, i) => ({ ...c, order: c.order ?? i }))
            void onSheetUpdate(board.id, activeSheet.id, { columns: nextColumns } as any)
          }}
          onAddView={() => setIsAddViewOpen(true)}
          testId={testId}
        />
      )}

      <div className="gba:flex-1 gba:relative gba:min-h-0 gba:min-w-0 gba:overflow-hidden">
        <div ref={scrollRefCallback} className="gba:absolute gba:inset-0 gba:overflow-auto">
          {rowsError && rows.length === 0 ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
              <p className="gba:text-destructive gba:text-sm" data-testid={`${testId}-error`}>
                {rowsError}
              </p>
            </div>
          ) : (
            <>
              {rowsLoading && rows.length === 0 && (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
                  <Spinner size="lg" />
                </div>
              )}
              <BoardViewContent
                scrollParent={isKanbanView ? scrollParent : undefined}
                view={activeView}
                sheet={enrichedSheet!}
                rows={rows}
                accessToken={accessToken}
                boardId={board.id}
                sheetId={activeSheet!.id}
                highlightedRowId={highlightedRowId}
                onClearHighlight={() => setHighlightedRowId(null)}
                onRowClick={handleRowOpen}
                onAddRow={
                  canEdit && onCreateRow
                    ? async data => {
                        await onCreateRow(board.id, activeSheet!.id, data)
                      }
                    : undefined
                }
                onUpdateCell={
                  canEdit && onUpdateRow
                    ? async (rowId, colName, value, extraData) => {
                        await onUpdateRow(board.id, activeSheet!.id, rowId, { [colName]: value, ...extraData })
                      }
                    : undefined
                }
                onDeleteRow={
                  canEdit && onDeleteRow
                    ? rowId => {
                        void onDeleteRow(board.id, activeSheet!.id, rowId)
                      }
                    : undefined
                }
                onSubmitRow={
                  canEdit && onCreateRow
                    ? async data => {
                        await onCreateRow(board.id, activeSheet!.id, data)
                      }
                    : undefined
                }
                onAddColumn={
                  canEdit && onSheetUpdate
                    ? column => {
                        const nextColumns = [...activeSheet!.columns, column].map((c, i) => ({
                          ...c,
                          order: c.order ?? i
                        }))
                        void onSheetUpdate(board.id, activeSheet!.id, { columns: nextColumns } as any)
                      }
                    : undefined
                }
                onUpdateColumn={
                  canEdit && onSheetUpdate
                    ? updated => {
                        const nextColumns = activeSheet!.columns.map(c => (c.id === updated.id ? updated : c))
                        void onSheetUpdate(board.id, activeSheet!.id, { columns: nextColumns } as any)
                      }
                    : undefined
                }
                onDeleteColumn={
                  canEdit && onSheetUpdate
                    ? columnId => {
                        const target = activeSheet!.columns.find(c => c.id === columnId)
                        if (target?.isPrimary) return
                        const nextColumns = activeSheet!.columns.filter(c => c.id !== columnId)
                        void onSheetUpdate(board.id, activeSheet!.id, { columns: nextColumns } as any)
                      }
                    : undefined
                }
                onUpdateDashboardWidgets={
                  canEdit && onSheetUpdate && activeView
                    ? widgets => {
                        const updatedConfig = { ...activeView.config, widgets }
                        const updatedViews = activeSheet!.views.map(v =>
                          v.id === activeView.id ? { ...v, config: updatedConfig } : v
                        )
                        void onSheetUpdate(board.id, activeSheet!.id, { views: updatedViews } as any)
                      }
                    : undefined
                }
                onUpdateView={
                  canEdit && onSheetUpdate && activeView
                    ? (viewId, config) => {
                        const updatedViews = activeSheet!.views.map(v =>
                          v.id === viewId ? { ...v, config: { ...v.config, ...config } } : v
                        )
                        void onSheetUpdate(board.id, activeSheet!.id, { views: updatedViews } as any)
                      }
                    : undefined
                }
                onServerFilterChange={handleServerFilterChange}
                rowsTotal={rowsTotal}
                dashboardRows={dashboardData.allRows}
                dashboardLoading={dashboardData.isLoading}
                dashboardSampled={dashboardData.isSampled}
                dashboardTotalRows={dashboardData.totalRows}
                dashboardLoadedRows={dashboardData.loadedRows}
                onTableLoadMore={!isKanbanView ? handleTableLoadMore : undefined}
                rowsLoading={rowsLoading}
                quickFilters={quickFilters}
                onAddQuickFilter={canEdit ? addQuickFilter : undefined}
                onRenameQuickFilter={canEdit ? renameQuickFilter : undefined}
                onDeleteQuickFilter={canEdit ? deleteQuickFilter : undefined}
                peopleLookup={peopleLookup}
                testId={`${testId}-${viewType}`}
              />

              {activeRow && (
                <RowPagePanel
                  boardId={board.id}
                  sheetId={activeSheet!.id}
                  row={activeRow}
                  columns={activeSheet!.columns}
                  onClose={() => setActiveRow(null)}
                  onPageCreated={handlePageCreated}
                  data-testid={`${testId}-row-page`}
                />
              )}
            </>
          )}
        </div>
      </div>

      <BoardViewerFooter
        sheets={board.sheets}
        activeSheetId={activeSheetId}
        onSelectSheet={handleSheetChange}
        rowsTotal={rowsTotal}
        page={page}
        totalPages={totalPages}
        onPrevPage={() => setPage(p => Math.max(1, p - 1))}
        onNextPage={() => setPage(p => Math.min(totalPages, p + 1))}
        onAddRow={canEdit && onCreateRow ? handleAddRow : undefined}
        hidePagination
        loadedRows={rows.length}
        testId={testId}
      />

      <BoardViewerOverlays
        board={board}
        accessToken={accessToken}
        activeSheet={activeSheet || null}
        rows={rows}
        page={page}
        onReloadBoard={onReloadBoard}
        onLoadRows={onLoadRows}
        onBoardUpdate={onBoardUpdate}
        onSheetUpdate={onSheetUpdate}
        onOpenImport={() => setIsSystemDataOpen(true)}
        onOpenFlowImport={() => setIsFlowEngineDataOpen(true)}
        isSearchOpen={isSearchOpen}
        setIsSearchOpen={setIsSearchOpen}
        isSettingsOpen={isSettingsOpen}
        setIsSettingsOpen={setIsSettingsOpen}
        isAddViewOpen={isAddViewOpen}
        setIsAddViewOpen={setIsAddViewOpen}
        onSelectSearchResult={r => navigateToRow(r.sheetId, r.rowId, r.position)}
        onOpenRow={handleRowOpen}
        setActiveViewId={setActiveViewId}
        testId={testId}
      />

      {activeSheet && (
        <SystemDataSheet
          open={isSystemDataOpen}
          onOpenChange={setIsSystemDataOpen}
          boardId={board.id}
          sheetId={activeSheet.id}
          accessToken={accessToken}
          existingColumns={activeSheet.columns}
          existingRows={rows}
          onSheetUpdate={
            onSheetUpdate
              ? async (bId, sId, updates) => {
                  await onSheetUpdate(bId, sId, updates as any)
                }
              : undefined
          }
          onAfterImport={() => {
            void onReloadBoard?.(board.id)
            const rpp = activeSheet.settings.rowsPerPage || 50
            const opts = { ...serverFilterRef.current }
            if (isKanbanView) {
              kanbanNextPageRef.current = 2
              void onLoadRows(board.id, activeSheet.id, { page: 1, limit: KANBAN_BATCH, ...opts })
            } else {
              tableNextPageRef.current = 2
              void onLoadRows(board.id, activeSheet.id, { page: 1, limit: rpp, ...opts })
            }
          }}
          data-testid={`${testId}-system-data-sheet`}
        />
      )}

      {activeSheet && (
        <FlowEngineDataSheet
          open={isFlowEngineDataOpen}
          onOpenChange={setIsFlowEngineDataOpen}
          boardId={board.id}
          sheetId={activeSheet.id}
          userId={userId}
          onSheetUpdate={
            onSheetUpdate
              ? async (bId, sId, updates) => {
                  await onSheetUpdate(bId, sId, updates as any)
                }
              : undefined
          }
          onAfterImport={() => {
            void onReloadBoard?.(board.id)
            const rpp = activeSheet.settings.rowsPerPage || 50
            const opts = { ...serverFilterRef.current }
            if (isKanbanView) {
              kanbanNextPageRef.current = 2
              void onLoadRows(board.id, activeSheet.id, { page: 1, limit: KANBAN_BATCH, ...opts })
            } else {
              tableNextPageRef.current = 2
              void onLoadRows(board.id, activeSheet.id, { page: 1, limit: rpp, ...opts })
            }
          }}
          data-testid={`${testId}-flow-engine-data-sheet`}
        />
      )}
    </div>
  )
})
