import React from 'react'
import { DndContext, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { DragStartEvent, DragMoveEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'
import { DragPreview } from './DragPreview'
import type { EnrichedMenuItem } from '../../types/menuTree.types'

interface DndTreeContextProps {
  sensors: any
  allSortableIds: string[]
  activeItem: EnrichedMenuItem | null
  onDragStart: (event: DragStartEvent) => void
  onDragMove: (event: DragMoveEvent) => void
  onDragOver: (event: DragOverEvent) => void
  onDragEnd: (event: DragEndEvent) => Promise<void>
  children: React.ReactNode
}

/**
 * Context wrapper for drag and drop functionality
 */
export const DndTreeContext: React.FC<DndTreeContextProps> = ({
  sensors,
  allSortableIds,
  activeItem,
  onDragStart,
  onDragMove,
  onDragOver,
  onDragEnd,
  children
}) => {
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={allSortableIds} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
      <DragPreview item={activeItem} />
    </DndContext>
  )
}
