import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { KanbanCardProps } from '../types'

export function KanbanCard({
  item,
  onClick,
  renderContent,
  className = '',
  isInSourceColumn = false
}: KanbanCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: {
      type: 'item',
      item
    }
  })

  // Disable transform in source column to prevent position preview
  const style = {
    transform: isInSourceColumn ? undefined : CSS.Transform.toString(transform),
    transition: isInSourceColumn ? undefined : transition
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()

    if (!isDragging && onClick) {
      onClick(item.id)
    }
  }

  if (renderContent) {
    return (
      <div
        ref={setNodeRef}
        {...attributes}
        {...listeners}
        style={style}
        className={className}
        data-testid={`kanban-card-${item.id}`}
      >
        {renderContent(item)}
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      onClick={handleClick}
      className={`gba:bg-white gba:dark:bg-gray-800 gba:rounded-md gba:shadow-sm gba:border gba:border-gray-200 gba:dark:border-gray-700 gba:flex gba:flex-col gba:cursor-pointer ${
        isDragging ? 'gba:opacity-50' : ''
      } ${className}`}
      data-testid={`kanban-card-${item.id}`}
    >
      <div className="gba:p-3 gba:space-y-2">
        <div>
          <h4 className="gba:font-medium gba:text-sm gba:line-clamp-2">
            <span className="gba:text-sm gba:font-medium gba:text-gray-900 gba:dark:text-gray-100">{item.name}</span>
          </h4>
          {item.description && (
            <p className="gba:text-xs gba:text-gray-500 gba:dark:text-gray-400 gba:line-clamp-1 gba:mt-1">
              {item.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
