import React from 'react'
import { Plus, LayoutGrid, Columns3, Calendar, GanttChart, FileInput, BarChart3 } from 'lucide-react'
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
  existingColumns: BoardColumn[]
  onAddColumn: (column: BoardColumn) => void
  onAddView: () => void
  testId: string
}

export const BoardViewerTabs: React.FC<BoardViewerTabsProps> = ({
  views,
  activeViewId,
  onSelectView,
  existingColumns,
  onAddColumn,
  onAddView,
  testId
}) => {
  return (
    <div className="gba:shrink-0 gba:border-b gba:border-border gba:bg-background gba:flex gba:items-center gba:overflow-x-auto gba:scrollbar-none">
      <nav className="gba:flex gba:items-center gba:gap-1 gba:px-5" data-testid={`${testId}-view-nav`}>
        {views.map((view, idx) => (
          <button
            key={`${view.id || 'view'}-${idx}`}
            onClick={() => onSelectView(view.id)}
            className={`gba:relative gba:flex gba:items-center gba:gap-1.5 gba:px-3 gba:py-2.5 gba:text-xs gba:font-medium gba:whitespace-nowrap gba:transition-colors gba:rounded-none gba:border-b-2 ${
              activeViewId === view.id
                ? 'gba:text-foreground gba:border-primary'
                : 'gba:text-muted-foreground gba:border-transparent gba:hover:text-foreground'
            }`}
            data-testid={`${testId}-view-${view.id || idx}`}
          >
            {VIEW_ICONS[view.type]}
            {view.name}
          </button>
        ))}
      </nav>

      <span className="gba:w-px gba:h-4 gba:bg-border gba:mx-1" />

      <AddColumnPopover
        existingColumns={existingColumns}
        onAdd={onAddColumn}
        data-testid={`${testId}-add-column-popover`}
      >
        <button
          className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1.5 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
          data-testid={`${testId}-add-column`}
        >
          <Plus className="gba:w-3 gba:h-3" /> Add column
        </button>
      </AddColumnPopover>

      <button
        onClick={onAddView}
        className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1.5 gba:text-xs gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
        data-testid={`${testId}-add-view`}
      >
        <Plus className="gba:w-3 gba:h-3" /> Add view
      </button>
    </div>
  )
}
