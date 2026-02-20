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
import type { Board, BoardSheet, BoardRow } from './types'
import { RowPagePanel } from './components/RowPagePanel'
import { BoardViewContent } from './components/BoardViewContent'
import { useBoardRealtime } from './hooks/useBoardRealtime'
import { BoardViewerTabs } from './components/viewer/BoardViewerTabs'
import { BoardViewerFooter } from './components/viewer/BoardViewerFooter'
import { BoardViewerOverlays } from './components/viewer/BoardViewerOverlays'
import { SystemDataSheet } from './components/system-data/SystemDataSheet'
import { BoardApiService } from './services/BoardApiService'

export interface BoardViewerHandle {
  openSearch: () => void
  openSettings: () => void
  openSystemData: () => void
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
  const [activeRow, setActiveRow] = useState<BoardRow | null>(null)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isAddViewOpen, setIsAddViewOpen] = useState(false)
  const [isSystemDataOpen, setIsSystemDataOpen] = useState(false)
  const [highlightedRowId, setHighlightedRowId] = useState<string | null>(null)

  const navigateToRow = useCallback(
    (targetSheetId: string, rowId: string, position?: number) => {
      const effectiveSheetId = targetSheetId || activeSheetId

      if (effectiveSheetId && effectiveSheetId !== activeSheetId) {
        setActiveSheetId(effectiveSheetId)
        setActiveViewId('')
        setPage(1)
      }

      const tableSheet = board.sheets.find(s => s.id === effectiveSheetId) || board.sheets[0]
      const rpp = tableSheet?.settings.rowsPerPage || 50

      void (async () => {
        const located = await BoardApiService.locateRow(board.id, effectiveSheetId, rowId)
        if (located) {
          const targetPage = Math.floor(located.rowIndex / rpp) + 1
          setPage(targetPage)
        } else if (position !== undefined && position >= 0) {
          // Fallback only: "position" may contain gaps, so rowIndex is preferred when available.
          const targetPage = Math.floor(position / rpp) + 1
          setPage(targetPage)
        }
        setHighlightedRowId(rowId)
      })()
    },
    [activeSheetId, board.id, board.sheets]
  )

  useImperativeHandle(
    ref,
    () => ({
      openSearch: () => setIsSearchOpen(true),
      openSettings: () => setIsSettingsOpen(true),
      openSystemData: () => setIsSystemDataOpen(true),
      navigateToRow
    }),
    [navigateToRow]
  )

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

  const activeView = useMemo(() => {
    if (!activeSheet) return null
    if (activeViewId) return activeSheet.views.find(v => v.id === activeViewId) || activeSheet.views[0]
    return activeSheet.views.find(v => v.isDefault) || activeSheet.views[0]
  }, [activeSheet, activeViewId])

  useEffect(() => {
    if (!activeSheet) return
    const defaultView = activeSheet.views.find(v => v.isDefault) || activeSheet.views[0]
    if (defaultView && !activeViewId) setActiveViewId(defaultView.id)
  }, [activeSheet, activeViewId])

  useEffect(() => {
    if (!activeSheet) return
    void onLoadRows(board.id, activeSheet.id, {
      page,
      limit: activeSheet.settings.rowsPerPage || 50,
      ...serverFilterRef.current
    })
  }, [board.id, activeSheet, page, onLoadRows])

  const liveEnabled = Boolean((board.settings as any)?.liveUpdatesEnabled)
  useBoardRealtime({
    boardId: board.id,
    accessToken,
    enabled: liveEnabled,
    onEvent: event => {
      if (!activeSheet) return
      if (event.sheetId && event.sheetId !== activeSheet.id) return
      void onLoadRows(board.id, activeSheet.id, {
        page,
        limit: activeSheet.settings.rowsPerPage || 50,
        ...serverFilterRef.current
      })
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
        if (ds.mergeStrategy === 'populateOptions' && ds.populateTargetCol && ds.populateSourceField) {
          await BoardApiService.populateColumnOptions(
            board.id,
            activeSheet.id,
            ds.entityType as string,
            ds.populateSourceField as string,
            ds.populateTargetCol as string,
            (ds.limit as number) || 200
          )
        } else {
          await BoardApiService.syncFromGraphQL(board.id, activeSheet.id, {
            entity: ds.entityType as string,
            limit: (ds.limit as number) || 200,
            mode: (ds.syncMode as 'replace' | 'append' | 'merge') || 'replace',
            autoColumns: true
          })
        }
        void onReloadBoard?.(board.id)
        void onLoadRows(board.id, activeSheet.id, { page, limit: activeSheet.settings.rowsPerPage || 50 })
      } catch {
        /* silent */
      }
    })()
  }, [activeSheet, board.id, page, onReloadBoard, onLoadRows])

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

  const serverFilterRef = useRef<{ filters?: string; filterConnector?: 'and' | 'or'; sorts?: string }>({})

  const handleServerFilterChange = useCallback(
    (params: { filters?: string; filterConnector?: 'and' | 'or'; sorts?: string }) => {
      serverFilterRef.current = params
      if (!activeSheet) return
      void onLoadRows(board.id, activeSheet.id, {
        page: 1,
        limit: activeSheet.settings.rowsPerPage || 50,
        ...params
      })
      setPage(1)
    },
    [activeSheet, board.id, onLoadRows, setPage]
  )

  const handleRowOpen = useCallback((row: BoardRow) => {
    setActiveRow(row)
  }, [])

  const handlePageCreated = useCallback(() => {
    if (!activeSheet) return
    void onLoadRows(board.id, activeSheet.id, {
      page,
      limit: activeSheet.settings.rowsPerPage || 50,
      ...serverFilterRef.current
    })
  }, [activeSheet, board.id, page, onLoadRows])

  const handleSheetChange = useCallback((sheetId: string) => {
    setActiveSheetId(sheetId)
    setActiveViewId('')
    setPage(1)
  }, [])

  const viewType = activeView?.type || 'table'
  const totalPages = Math.ceil(rowsTotal / (activeSheet?.settings.rowsPerPage || 50))

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
        <div className="gba:absolute gba:inset-0 gba:overflow-auto">
          {rowsLoading && rows.length === 0 ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
              <Spinner size="lg" />
            </div>
          ) : rowsError ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-16">
              <p className="gba:text-destructive gba:text-sm" data-testid={`${testId}-error`}>
                {rowsError}
              </p>
            </div>
          ) : (
            <>
              <BoardViewContent
                view={activeView}
                sheet={activeSheet!}
                rows={rows}
                accessToken={accessToken}
                boardId={board.id}
                sheetId={activeSheet!.id}
                highlightedRowId={highlightedRowId}
                onClearHighlight={() => setHighlightedRowId(null)}
                onRowClick={handleRowOpen}
                onAddRow={
                  onCreateRow
                    ? async data => {
                        await onCreateRow(board.id, activeSheet!.id, data)
                      }
                    : undefined
                }
                onUpdateCell={
                  onUpdateRow
                    ? async (rowId, colName, value) => {
                        await onUpdateRow(board.id, activeSheet!.id, rowId, { [colName]: value })
                      }
                    : undefined
                }
                onDeleteRow={
                  onDeleteRow
                    ? rowId => {
                        void onDeleteRow(board.id, activeSheet!.id, rowId)
                      }
                    : undefined
                }
                onSubmitRow={
                  onCreateRow
                    ? async data => {
                        await onCreateRow(board.id, activeSheet!.id, data)
                      }
                    : undefined
                }
                onAddColumn={
                  onSheetUpdate
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
                  onSheetUpdate
                    ? updated => {
                        const nextColumns = activeSheet!.columns.map(c => (c.id === updated.id ? updated : c))
                        void onSheetUpdate(board.id, activeSheet!.id, { columns: nextColumns } as any)
                      }
                    : undefined
                }
                onDeleteColumn={
                  onSheetUpdate
                    ? columnId => {
                        const target = activeSheet!.columns.find(c => c.id === columnId)
                        if (target?.isPrimary) return
                        const nextColumns = activeSheet!.columns.filter(c => c.id !== columnId)
                        void onSheetUpdate(board.id, activeSheet!.id, { columns: nextColumns } as any)
                      }
                    : undefined
                }
                onUpdateDashboardWidgets={
                  onSheetUpdate && activeView
                    ? widgets => {
                        const updatedConfig = { ...activeView.config, widgets }
                        const updatedViews = activeSheet!.views.map(v =>
                          v.id === activeView.id ? { ...v, config: updatedConfig } : v
                        )
                        void onSheetUpdate(board.id, activeSheet!.id, { views: updatedViews } as any)
                      }
                    : undefined
                }
                onServerFilterChange={handleServerFilterChange}
                rowsTotal={rowsTotal}
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
        onPrevPage={() => setPage(p => p - 1)}
        onNextPage={() => setPage(p => p + 1)}
        onAddRow={onCreateRow ? handleAddRow : undefined}
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
            void onLoadRows(board.id, activeSheet.id, { page, limit: activeSheet.settings.rowsPerPage || 50 })
          }}
          data-testid={`${testId}-system-data-sheet`}
        />
      )}
    </div>
  )
})
