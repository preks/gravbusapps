import { useState } from "react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useKanbanStore } from "./lib/kanban-store";
import { KanbanColumn } from "./components/KanbanColumn";
import { OpportunityCard } from "./components/OpportunityCard";
import { PlusOutlined } from "@ant-design/icons";
import { StageDialog } from "./components/StageDialog";
import { OpportunityDialog } from "./components/OpportunityDialog";
import { PipelineDialog } from "./components/PipelineDialog";
import { PipelineSelector } from "./components/PipelineSelector";
import { currentUser } from "./lib/data";
import type { Opportunity } from "./lib/data";

export function KanbanBoard() {
  const { selectedPipelineId, stages, opportunities, moveOpportunity, setIsAddingStage, reorderStages } = useKanbanStore();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);

  const isSalesManager = currentUser.role === "sales_manager";

  const pipelineStages = stages
    .filter((stage: any) => stage.pipelineId === selectedPipelineId)
    .sort((a: any, b: any) => a.order - b.order);

  const pipelineOpportunities = opportunities.filter((opp: any) => opp.pipelineId === selectedPipelineId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const id = active.id;

    setActiveId(id);

    const draggedOpportunity = pipelineOpportunities.find((opp: any) => opp.id === id);
    if (draggedOpportunity) {
      setActiveOpportunity(draggedOpportunity);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeData = active.data?.current;
      const activeId = active.id;
      const overId = over.id;
      
      if (activeData?.type === 'opportunity') {
        const opportunityId = activeId;
        const targetStageId = overId;

        const isTargetStage = pipelineStages.some((stage: any) => stage.id === targetStageId);

        if (isTargetStage) {
          moveOpportunity(opportunityId, targetStageId);
        }
      } else if (activeData?.type === 'stage') {
        reorderStages(activeId, overId);
      }
    }

    setActiveId(null);
    setActiveOpportunity(null);
  };

  const handleAddStage = () => {
    setIsAddingStage(true);
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-xs">
          <PipelineSelector />
        </div>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="flex h-full gap-4 p-4">
            <SortableContext items={pipelineStages.map((s: any) => s.id)} strategy={horizontalListSortingStrategy}>
              {pipelineStages.map((stage: any) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  opportunities={pipelineOpportunities.filter((opp: any) => opp.stageId === stage.id)}
                />
              ))}
            </SortableContext>

            {isSalesManager && (
              <div className="flex-shrink-0 w-72 h-full">
                <button
                  className="w-full h-16 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 dark:border-gray-700 dark:text-gray-400 dark:hover:text-gray-300 dark:hover:border-gray-600"
                  onClick={handleAddStage}
                >
                  <PlusOutlined style={{ marginRight: '8px' }} />
                  Add Column
                </button>
              </div>
            )}
          </div>
        </div>

        <DragOverlay>
          {activeId && activeOpportunity ? (
            <div className="w-64">
              <OpportunityCard opportunity={activeOpportunity} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <StageDialog />
      <OpportunityDialog />
      <PipelineDialog />
    </div>
  );
}

export default KanbanBoard;