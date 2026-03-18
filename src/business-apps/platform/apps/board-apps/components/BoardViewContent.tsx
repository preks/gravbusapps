import React, { useMemo, useState, useEffect, useCallback } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Eye } from 'lucide-react'
import type {
  BoardRow,
  BoardSheet,
  BoardView,
  BoardViewType,
  BoardQuickFilter,
  KanbanViewConfig,
  CalendarViewConfig,
  TimelineViewConfig,
  FormViewConfig,
  DashboardViewConfig,
  DashboardWidget
} from '../types'
import { getPrimaryColumn } from '../types'
import { BoardKanbanView, BoardCalendarView, BoardTimelineView, BoardFormView, BoardDashboardView } from '../views'
import { BoardTableView } from '../views/BoardTableView'

export interface BoardViewContentProps {
  scrollParent?: HTMLDivElement | null
  view: BoardView | null
  sheet: BoardSheet
  rows: BoardRow[]
  highlightedRowId?: string | null
  onClearHighlight?: () => void
  onRowClick?: (row: BoardRow) => void
  onAddRow?: (data: Record<string, unknown>) => Promise<void>
  onUpdateCell?: (
    rowId: string,
    columnName: string,
    value: unknown,
    extraData?: Record<string, unknown>
  ) => Promise<void>
  onDeleteRow?: (rowId: string) => void
  onSubmitRow?: (data: Record<string, unknown>) => Promise<void>
  onUpdateDashboardWidgets?: (widgets: DashboardWidget[]) => void
  onAddColumn?: (column: import('../types').BoardColumn) => void
  onUpdateColumn?: (updated: import('../types').BoardColumn) => void
  onDeleteColumn?: (columnId: string) => void
  onServerFilterChange?: (params: import('../hooks/useTableFilterSort').ServerFilterParams) => void
  onUpdateView?: (viewId: string, config: Partial<import('../types').ViewConfig>) => void
  rowsTotal?: number
  accessToken?: string
  boardId: string
  sheetId: string
  dashboardRows?: BoardRow[]
  dashboardLoading?: boolean
  dashboardSampled?: boolean
  dashboardTotalRows?: number
  dashboardLoadedRows?: number
  onTableLoadMore?: () => void
  rowsLoading?: boolean
  quickFilters?: BoardQuickFilter[]
  onAddQuickFilter?: (qf: BoardQuickFilter) => void
  onRenameQuickFilter?: (id: string, name: string) => void
  onDeleteQuickFilter?: (id: string) => void
  onReorderRow?: (rowId: string, afterRowId: string | null, beforeRowId: string | null) => Promise<void>
  peopleLookup?: Map<string, import('../types/columns').SelectOption>
  focusedCells?: Map<string, import('../hooks/useBoardPresence').CellPresenceEntry>
  onCellFocus?: (rowId: string, columnId: string) => void
  onCellBlur?: () => void
  testId: string
}

export const BoardViewContent: React.FC<BoardViewContentProps> = ({
  scrollParent,
  view,
  sheet,
  rows,
  highlightedRowId,
  onClearHighlight,
  onRowClick,
  onAddRow,
  onUpdateCell,
  onDeleteRow,
  onSubmitRow,
  onUpdateDashboardWidgets,
  onAddColumn,
  onUpdateColumn,
  onDeleteColumn,
  onServerFilterChange,
  onUpdateView,
  rowsTotal,
  accessToken,
  boardId,
  sheetId,
  dashboardRows,
  dashboardLoading,
  dashboardSampled,
  dashboardTotalRows,
  dashboardLoadedRows,
  onTableLoadMore,
  rowsLoading,
  quickFilters,
  onAddQuickFilter,
  onRenameQuickFilter,
  onDeleteQuickFilter,
  onReorderRow,
  peopleLookup,
  focusedCells,
  onCellFocus,
  onCellBlur,
  testId
}) => {
  const [kanbanGroupColumn, setKanbanGroupColumn] = useState<string | null>(null)
  const [kanbanCardFields, setKanbanCardFields] = useState<string[]>([])

  const viewType: BoardViewType = view?.type || 'table'

  useEffect(() => {
    if (view?.type === 'kanban') {
      const kc = view.config as KanbanViewConfig
      setKanbanCardFields(kc.cardFields ?? [])
    } else {
      setKanbanCardFields([])
    }
  }, [view?.id, view?.type, view?.config])

  const handleCardFieldsChange = useCallback(
    (fields: string[]) => {
      setKanbanCardFields(fields)
      if (view && onUpdateView) {
        onUpdateView(view.id, { cardFields: fields })
      }
    },
    [view, onUpdateView]
  )
  const viewConfig = view?.config

  const visibleColumns = sheet.columns.filter(c => c.isVisible)
  const hiddenColumns = useMemo(() => sheet.columns.filter(c => !c.isVisible), [sheet.columns])

  const unhideColumn = (columnId: string) => {
    const col = sheet.columns.find(c => c.id === columnId)
    if (col && onUpdateColumn) onUpdateColumn({ ...col, isVisible: true })
  }

  const hiddenBar =
    hiddenColumns.length > 0 && onUpdateColumn ? (
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:border-b gba:border-border gba:bg-muted/30 gba:flex-wrap">
        <span className="gba:text-xs gba:text-muted-foreground">Hidden:</span>
        {hiddenColumns.map(col => (
          <Button
            key={col.id}
            variant="outline"
            size="sm"
            className="gba:h-6 gba:text-xs gba:gap-1 gba:px-2"
            onClick={() => unhideColumn(col.id)}
            data-testid={`${testId}-unhide-${col.id}`}
          >
            <Eye className="gba:w-3 gba:h-3" />
            {col.label}
          </Button>
        ))}
      </div>
    ) : null

  switch (viewType) {
    case 'table':
      return (
        <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0">
          {hiddenBar}
          <BoardTableView
            key={view?.id || 'default-table'}
            columns={visibleColumns}
            rows={rows}
            boardId={boardId}
            sheetId={sheetId}
            highlightedRowId={highlightedRowId}
            onClearHighlight={onClearHighlight}
            onAddRow={onAddRow}
            onUpdateCell={onUpdateCell}
            onDeleteRow={onDeleteRow}
            onRowClick={onRowClick}
            onAddColumn={onAddColumn}
            onUpdateColumn={onUpdateColumn}
            onDeleteColumn={onDeleteColumn}
            onServerFilterChange={onServerFilterChange}
            rowsTotal={rowsTotal}
            onLoadMore={onTableLoadMore}
            rowsLoading={rowsLoading}
            quickFilters={quickFilters}
            onAddQuickFilter={onAddQuickFilter}
            onRenameQuickFilter={onRenameQuickFilter}
            onDeleteQuickFilter={onDeleteQuickFilter}
            onReorderRow={onReorderRow}
            peopleLookup={peopleLookup}
            focusedCells={focusedCells}
            onCellFocus={onCellFocus}
            onCellBlur={onCellBlur}
            testId={testId}
          />
        </div>
      )
    case 'kanban': {
      const kc = (viewConfig || {}) as Partial<KanbanViewConfig>
      const autoStatusName =
        visibleColumns.find(c => c.type === 'status' || c.type === 'priority' || c.type === 'select')?.name ||
        visibleColumns[0]?.name ||
        ''
      const primaryName = getPrimaryColumn(visibleColumns)?.name || ''
      const effectiveStatusCol = kanbanGroupColumn || kc.statusColumn || autoStatusName
      return (
        <BoardKanbanView
          scrollParent={scrollParent}
          columns={visibleColumns}
          rows={rows}
          viewConfig={{
            type: 'kanban',
            statusColumn: effectiveStatusCol,
            titleColumn: kc.titleColumn || primaryName,
            descriptionColumn: kc.descriptionColumn
          }}
          onRowClick={onRowClick}
          onStatusChange={
            onUpdateCell ? (rowId, colName, newValue) => void onUpdateCell(rowId, colName, newValue) : undefined
          }
          onStatusColumnChange={setKanbanGroupColumn}
          cardFields={kanbanCardFields}
          onCardFieldsChange={handleCardFieldsChange}
          highlightedRowId={highlightedRowId}
          onClearHighlight={onClearHighlight}
          data-testid={testId}
        />
      )
    }
    case 'calendar': {
      const cc = (viewConfig || {}) as Partial<CalendarViewConfig>
      const dateName =
        visibleColumns.find(c => c.type === 'date' || c.type === 'datetime')?.name || visibleColumns[0]?.name || ''
      const primaryName = getPrimaryColumn(visibleColumns)?.name || ''
      return (
        <BoardCalendarView
          columns={visibleColumns}
          rows={rows}
          viewConfig={{
            type: 'calendar',
            dateColumn: cc.dateColumn || dateName,
            titleColumn: cc.titleColumn || primaryName
          }}
          onRowClick={onRowClick}
          data-testid={testId}
        />
      )
    }
    case 'timeline': {
      const tc = (viewConfig || {}) as Partial<TimelineViewConfig>
      const dateName =
        visibleColumns.find(c => c.type === 'date' || c.type === 'datetime')?.name || visibleColumns[0]?.name || ''
      const primaryName = getPrimaryColumn(visibleColumns)?.name || ''
      return (
        <BoardTimelineView
          rows={rows}
          columns={visibleColumns}
          viewConfig={{
            type: 'timeline',
            startDateColumn: tc.startDateColumn || dateName,
            endDateColumn: tc.endDateColumn || dateName,
            titleColumn: tc.titleColumn || primaryName,
            dependencyColumn: tc.dependencyColumn
          }}
          onRowClick={onRowClick}
          onUpdateCell={onUpdateCell}
          onUpdateView={
            view && onUpdateView ? (config: Partial<TimelineViewConfig>) => onUpdateView(view.id, config) : undefined
          }
          data-testid={testId}
        />
      )
    }
    case 'form':
      return (
        <BoardFormView
          columns={visibleColumns}
          viewConfig={(viewConfig || { type: 'form', fields: [], layout: 'single' }) as FormViewConfig}
          onSubmit={onSubmitRow || (async () => {})}
          data-testid={testId}
        />
      )
    case 'dashboard':
      return (
        <BoardDashboardView
          columns={visibleColumns}
          rows={dashboardRows && dashboardRows.length > 0 ? dashboardRows : rows}
          viewConfig={(viewConfig || { type: 'dashboard', widgets: [] }) as DashboardViewConfig}
          onUpdateWidgets={onUpdateDashboardWidgets}
          accessToken={accessToken}
          isLoading={dashboardLoading}
          isSampled={dashboardSampled}
          totalRows={dashboardTotalRows}
          loadedRows={dashboardLoadedRows}
          data-testid={testId}
        />
      )
    default:
      return (
        <div className="gba:flex gba:items-center gba:justify-center gba:py-16 gba:text-muted-foreground gba:text-sm">
          {viewType} view
        </div>
      )
  }
}
