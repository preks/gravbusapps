import React from 'react'
import { DndContext, closestCorners } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import type { DragStartEvent, DragMoveEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core'

interface DndTreeContextProps {
  sensors: any
  allSortableIds: string[]
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
    </DndContext>
  )
}
