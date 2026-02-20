import React, { useMemo, useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Eye } from 'lucide-react'
import type {
  BoardRow,
  BoardSheet,
  BoardView,
  BoardViewType,
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
  view: BoardView | null
  sheet: BoardSheet
  rows: BoardRow[]
  highlightedRowId?: string | null
  onClearHighlight?: () => void
  onRowClick?: (row: BoardRow) => void
  onAddRow?: (data: Record<string, unknown>) => Promise<void>
  onUpdateCell?: (rowId: string, columnName: string, value: unknown) => Promise<void>
  onDeleteRow?: (rowId: string) => void
  onSubmitRow?: (data: Record<string, unknown>) => Promise<void>
  onUpdateDashboardWidgets?: (widgets: DashboardWidget[]) => void
  onAddColumn?: (column: import('../types').BoardColumn) => void
  onUpdateColumn?: (updated: import('../types').BoardColumn) => void
  onDeleteColumn?: (columnId: string) => void
  onServerFilterChange?: (params: import('../hooks/useTableFilterSort').ServerFilterParams) => void
  rowsTotal?: number
  accessToken?: string
  boardId: string
  sheetId: string
  testId: string
}

export const BoardViewContent: React.FC<BoardViewContentProps> = ({
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
  rowsTotal,
  accessToken,
  boardId,
  sheetId,
  testId
}) => {
  const [kanbanGroupColumn, setKanbanGroupColumn] = useState<string | null>(null)
  const [kanbanCardFields, setKanbanCardFields] = useState<string[]>([])

  const viewType: BoardViewType = view?.type || 'table'
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
        <>
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
            testId={testId}
          />
        </>
      )
    case 'kanban': {
      const kc = (viewConfig || {}) as Partial<KanbanViewConfig>
      const autoStatusName =
        visibleColumns.find(c => c.type === 'status' || c.type === 'select')?.name || visibleColumns[0]?.name || ''
      const primaryName = getPrimaryColumn(visibleColumns)?.name || ''
      const effectiveStatusCol = kanbanGroupColumn || kc.statusColumn || autoStatusName
      return (
        <BoardKanbanView
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
          onCardFieldsChange={setKanbanCardFields}
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
          viewConfig={{
            type: 'timeline',
            startDateColumn: tc.startDateColumn || dateName,
            endDateColumn: tc.endDateColumn || dateName,
            titleColumn: tc.titleColumn || primaryName
          }}
          onRowClick={onRowClick}
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
          rows={rows}
          viewConfig={(viewConfig || { type: 'dashboard', widgets: [] }) as DashboardViewConfig}
          onUpdateWidgets={onUpdateDashboardWidgets}
          accessToken={accessToken}
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
