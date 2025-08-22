import React, { useState } from 'react';
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor, closestCorners, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Spinner } from '@newwork/nw-design-system';
import { KanbanColumn } from './components/KanbanColumn';
import { KanbanCard } from './components/KanbanCard';
import { KanbanItem, KanbanBoardProps } from './types';

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
  ...props
}) => {
  const [activeItem, setActiveItem] = useState<KanbanItem | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const itemId = active.id;
    
    const draggedItem = items.find(
      (item) => item.id === itemId
    );
    
    setActiveItem(draggedItem || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    setActiveItem(null);
    
    if (!over || active.id === over.id) {
      return;
    }
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeItem = items.find(item => item.id === activeId);
    if (!activeItem) return;
    
    // Check if we're dropping on a stage (inter-column move to end)
    const targetStage = stages.find(s => s.id === overId);
    if (targetStage) {
      // Moving to a different stage at the end
      const activeStageId = activeItem.stageId;
      if (activeStageId !== targetStage.id) {
        onDragEnd?.(activeId, targetStage.id, items.length);
      }
    } else {
      // Check if we're dropping on another item (reordering within same stage)
      const overItem = items.find(item => item.id === overId);
      if (overItem && activeItem.stageId === overItem.stageId) {
        const oldIndex = items.findIndex(item => item.id === activeId);
        const newIndex = items.findIndex(item => item.id === overId);
        
        if (oldIndex !== newIndex) {
          const newItems = arrayMove(items, oldIndex, newIndex);
          // Update the stageId for the moved item
          const updatedItem = { ...newItems[newIndex], stageId: activeItem.stageId };
          newItems[newIndex] = updatedItem;
          
          // Call onDragEnd with the new order
          onDragEnd?.(activeId, activeItem.stageId || '', newIndex);
        }
      }
    }
  };

  if (loading) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full gba:p-8">
        <div className="gba:text-center">
          <Spinner size="lg" />
          <p className="gba:mt-4 gba:text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (stages.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full gba:p-8">
        <div className="gba:text-center gba:text-gray-500">
          No stages available
        </div>
      </div>
    );
  }

  return (
    <div className={className} {...props}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="gba:flex gba:flex-1 gba:overflow-x-auto gba:overflow-y-hidden gba:scroll-smooth gba:p-4 gba:gap-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              items={items
                .filter((item) => item.stageId === stage.id)
                .sort((a, b) => (a.position || 0) - (b.position || 0))
              }
              renderCard={renderCard}
              renderStageHeader={renderStageHeader}
            />
          ))}
        </div>

        <DragOverlay>
          {activeItem && renderCard ? (
            renderCard(activeItem)
          ) : activeItem ? (
            <KanbanCard item={activeItem} />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
