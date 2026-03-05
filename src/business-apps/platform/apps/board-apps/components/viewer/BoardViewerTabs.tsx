import React, { useCallback, useRef, useState } from 'react'
import { Plus, LayoutGrid, Columns3, Calendar, GanttChart, FileInput, BarChart3, X, GripVertical } from 'lucide-react'
import type { BoardView, BoardViewType, BoardColumn } from '../../types'
import { AddColumnPopover } from '../columns/AddColumnPopover'

const VIEW_ICONS: Record<BoardViewType, React.ReactNode> = {
  table: <LayoutGrid className="gba:w-3.5 gba:h-3.5" />,
  kanban: <Columns3 className="gba:w-3.5 gba:h-3.5" />,
  calendar: <Calendar className="gba:w-3.5 gba:h-3.5" />,
  timeline: <GanttChart className="gba:w-3.5 gba:h-3.5" />,
  form: <FileInput className="gba:w-3.5 gba:h-3.5" />,
  dashboard: <BarChart3 className="gba:w-3.5 gba:h-3.5" />
}

export interface BoardViewerTabsProps {
  views: BoardView[]
  activeViewId: string
  onSelectView: (id: string) => void
  onDeleteView?: (viewId: string) => void
  onReorderViews?: (reordered: BoardView[]) => void
  existingColumns: BoardColumn[]
  boardId: string
  sheetId: string
  onAddColumn: (column: BoardColumn) => void
  onAddView: () => void
  testId: string
}

export const BoardViewerTabs: React.FC<BoardViewerTabsProps> = ({
  views,
  activeViewId,
  onSelectView,
  onDeleteView,
  onReorderViews,
  existingColumns,
  boardId,
  sheetId,
  onAddColumn,
  onAddView,
  testId
}) => {
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [dropIdx, setDropIdx] = useState<number | null>(null)
  const dragNodeRef = useRef<HTMLElement | null>(null)

  const tableView = views.find(v => v.type === 'table')
  const reorderableViews = views.filter(v => v !== tableView)

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, idx: number) => {
      if (!onReorderViews) return
      setDragIdx(idx)
      dragNodeRef.current = e.currentTarget
      e.dataTransfer.effectAllowed = 'move'
      e.dataTransfer.setData('text/plain', String(idx))
      requestAnimationFrame(() => {
        if (dragNodeRef.current) dragNodeRef.current.style.opacity = '0.4'
      })
    },
    [onReorderViews]
  )

  const handleDragEnd = useCallback(() => {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = '1'
    setDragIdx(null)
    setDropIdx(null)
    dragNodeRef.current = null
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, idx: number) => {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
      if (idx !== dropIdx) setDropIdx(idx)
    },
    [dropIdx]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>, targetIdx: number) => {
      e.preventDefault()
      if (dragIdx === null || dragIdx === targetIdx || !onReorderViews) {
        handleDragEnd()
        return
      }
      const updated = [...reorderableViews]
      const [moved] = updated.splice(dragIdx, 1)
      updated.splice(targetIdx, 0, moved)
      const final = tableView ? [tableView, ...updated] : updated
      onReorderViews(final)
      handleDragEnd()
    },
    [dragIdx, reorderableViews, tableView, onReorderViews, handleDragEnd]
  )

  const canDelete = (view: BoardView) => {
    if (view.type === 'table') return false
    return views.length > 1
  }

  return (
    <div className="gba:shrink-0 gba:border-b gba:border-border gba:bg-background gba:flex gba:items-center gba:overflow-x-auto gba:scrollbar-none">
      <nav className="gba:flex gba:items-center gba:px-2" data-testid={`${testId}-view-nav`}>
        {/* Table tab is always first and not draggable */}
        {tableView && (
          <button
            onClick={() => onSelectView(tableView.id)}
            className={`gba:relative gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2 gba:text-xs gba:font-medium gba:whitespace-nowrap gba:transition-colors gba:rounded-none gba:border-b-2 ${
              activeViewId === tableView.id
                ? 'gba:text-foreground gba:border-primary'
                : 'gba:text-muted-foreground gba:border-transparent gba:hover:text-foreground'
            }`}
            data-testid={`${testId}-view-${tableView.id}`}
          >
            {VIEW_ICONS[tableView.type]}
            {tableView.name}
          </button>
        )}

        {/* Reorderable views */}
        {reorderableViews.map((view, idx) => {
          const isActive = activeViewId === view.id
          const isDropTarget = dropIdx === idx && dragIdx !== idx

          return (
            <button
              key={view.id || `view-${idx}`}
              draggable={Boolean(onReorderViews)}
              onDragStart={e => handleDragStart(e, idx)}
              onDragEnd={handleDragEnd}
              onDragOver={e => handleDragOver(e, idx)}
              onDrop={e => handleDrop(e, idx)}
              onClick={() => onSelectView(view.id)}
              className={`gba:relative gba:flex gba:items-center gba:gap-1 gba:pl-1.5 gba:pr-1 gba:py-2 gba:text-xs gba:font-medium gba:whitespace-nowrap gba:transition-colors gba:rounded-none gba:border-b-2 gba:group ${
                isActive
                  ? 'gba:text-foreground gba:border-primary'
                  : 'gba:text-muted-foreground gba:border-transparent gba:hover:text-foreground'
              } ${isDropTarget ? 'gba:border-l-2 gba:border-l-primary' : ''}`}
              data-testid={`${testId}-view-${view.id || idx}`}
            >
              {onReorderViews && (
                <GripVertical className="gba:w-3 gba:h-3 gba:text-muted-foreground/40 gba:group-hover:text-muted-foreground gba:cursor-grab gba:flex-shrink-0" />
              )}
              {VIEW_ICONS[view.type]}
              <span className="gba:px-0.5">{view.name}</span>
              {onDeleteView && canDelete(view) && (
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={e => {
                    e.stopPropagation()
                    onDeleteView(view.id)
                  }}
                  className="gba:ml-0.5 gba:p-0.5 gba:rounded gba:opacity-0 gba:group-hover:opacity-100 gba:hover:bg-destructive/10 gba:text-muted-foreground gba:hover:text-destructive gba:transition-all gba:flex-shrink-0"
                  data-testid={`${testId}-delete-view-${view.id || idx}`}
                >
                  <X className="gba:w-3 gba:h-3" />
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <span className="gba:w-px gba:h-4 gba:bg-border gba:mx-1 gba:flex-shrink-0" />

      <AddColumnPopover
        existingColumns={existingColumns}
        boardId={boardId}
        sheetId={sheetId}
        onAdd={onAddColumn}
        data-testid={`${testId}-add-column-popover`}
      >
        <button
          className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1.5 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:whitespace-nowrap"
          data-testid={`${testId}-add-column`}
        >
          <Plus className="gba:w-3 gba:h-3" /> Add column
        </button>
      </AddColumnPopover>

      <button
        onClick={onAddView}
        className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1.5 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:whitespace-nowrap"
        data-testid={`${testId}-add-view`}
      >
        <Plus className="gba:w-3 gba:h-3" /> Add view
      </button>
    </div>
  )
}
