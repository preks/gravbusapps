import React, { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  closestCorners,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core'
import { Spinner } from '@newwork/nw-design-system'
import { KanbanColumn } from './components/KanbanColumn'
import { KanbanCard } from './components/KanbanCard'
import { KanbanItem, KanbanBoardProps } from './types'

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  stages,
  items,
  onDragEnd,
  renderCard,
  renderStageHeader,

  // Generic props
  className = '',
  loading = false,
  emptyStateMessage,
  allowReorderWithinStage = true,
  ...props
}) => {
  const [activeItem, setActiveItem] = useState<KanbanItem | null>(null)
  const [sourceStage, setSourceStage] = useState<string | null>(null)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)
  const [insertPosition, setInsertPosition] = useState<'before' | 'after' | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  const handleDragStart = (event: any) => {
    const { active } = event
    const itemId = active.id

    const draggedItem = items.find(item => item.id === itemId)

    setActiveItem(draggedItem || null)
    setSourceStage(draggedItem?.stageId || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event

    if (over) {
      const overId = over.id as string
      const activeId = active.id as string

      // Find the active item
      const activeItem = items.find(item => item.id === activeId)

      // Check if we're hovering over a stage (column)
      const stage = stages.find(s => s.id === overId)
      if (stage) {
        // Only show feedback if this is not the source stage
        if (stage.id !== sourceStage) {
          setDragOverStage(overId)
        } else {
          setDragOverStage(null)
        }
        setDragOverItem(null)
        setInsertPosition(null)
      } else {
        // We're hovering over another item
        const overItem = items.find(item => item.id === overId)
        if (overItem && activeItem) {
          const overStageId = overItem.stageId
          const activeStageId = activeItem.stageId

          // Only show feedback if this is not the source stage
          if (overStageId !== sourceStage) {
            setDragOverStage(overStageId || null)
            // No insertion lines - we'll show "Drop here" card at first position instead
            setDragOverItem(null)
            setInsertPosition(null)
          } else {
            // In source stage - no visual feedback
            setDragOverStage(null)
            setDragOverItem(null)
            setInsertPosition(null)
          }
        } else {
          setDragOverStage(null)
          setDragOverItem(null)
          setInsertPosition(null)
        }
      }
    } else {
      setDragOverStage(null)
      setDragOverItem(null)
      setInsertPosition(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // Clear all drag over states
    setDragOverStage(null)
    setDragOverItem(null)
    setInsertPosition(null)
    setActiveItem(null)
    setSourceStage(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    const activeItem = items.find(item => item.id === activeId)
    if (!activeItem) return

    // Check if we're dropping on a stage (inter-column move to end)
    const targetStage = stages.find(s => s.id === overId)
    if (targetStage) {
      // Moving to a different stage at the end
      const activeStageId = activeItem.stageId
      if (activeStageId !== targetStage.id) {
        onDragEnd?.(activeId, targetStage.id, items.length)
      }
      return
    }

    // Check if we're dropping on another item
    const overItem = items.find(item => item.id === overId)
    if (overItem) {
      const activeStageId = activeItem.stageId
      const overStageId = overItem.stageId

      if (activeStageId === overStageId) {
        if (!allowReorderWithinStage) {
          // Reordering disabled: treat as no-op
          return
        }
        // Reordering within the same column - calculate new position
        const stageItems = items.filter(item => item.stageId === activeStageId)
        const activeIndex = stageItems.findIndex(item => item.id === activeId)
        const overIndex = stageItems.findIndex(item => item.id === overId)

        if (activeIndex !== overIndex) {
          onDragEnd?.(activeId, activeStageId || '', overIndex)
        }
      } else {
        // Moving to a different stage with specific positioning
        const targetStageItems = items.filter(item => item.stageId === overStageId)
        const insertIndex = targetStageItems.findIndex(item => item.id === overId)

        // Insert after the target item
        const newPosition = insertIndex + 1

        onDragEnd?.(activeId, overStageId || '', newPosition)
      }
    }
  }

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full gba:p-8">
        <div className="gba:text-center">
          <Spinner size="lg" />
          <p className="gba:mt-4 gba:text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (stages.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full gba:p-8">
        <div className="gba:text-center gba:text-gray-500">No stages available</div>
      </div>
    )
  }

  return (
    <div className={className} {...props}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="gba:flex gba:flex-1 gba:overflow-x-auto gba:overflow-y-hidden gba:scroll-smooth gba:p-4 gba:gap-4">
          {stages.map(stage => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              items={items
                .filter(item => item.stageId === stage.id)
                .sort((a, b) => (a.position || 0) - (b.position || 0))}
              renderCard={renderCard}
              renderStageHeader={renderStageHeader}
              isDraggedOver={dragOverStage === stage.id}
              isDragging={activeItem !== null}
              dragOverItem={dragOverItem}
              insertPosition={insertPosition}
              sourceStageId={sourceStage}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem && renderCard ? renderCard(activeItem) : activeItem ? <KanbanCard item={activeItem} /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
