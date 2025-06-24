import { useState, useEffect } from "react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useKanbanStore } from "./lib/kanban-store";
import { KanbanColumn } from "./components/KanbanColumn";
import { OpportunityCard } from "./components/OpportunityCard";
import { OpportunityDialog } from "./components/OpportunityDialog";
import type { Opportunity } from "./lib/types";

interface BusinessAppContextProps {
  accessToken: string;
  userInfo?: any;
  employeeId?: string;
  structureId?: string;
}

export function KanbanBoard({ accessToken, userInfo }: BusinessAppContextProps) {
  const { 
    stages, 
    opportunities, 
    moveOpportunity, 
    fetchOpportunities
  } = useKanbanStore();

  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
  
  useEffect(() => {
    const loadOpportunities = async () => {
      try {
        await fetchOpportunities(accessToken);
      } catch (error) {
        // Error handled silently
      }
    };
    
    loadOpportunities();
  }, [fetchOpportunities, accessToken]);

  const sortedStages = [...stages].sort((a, b) => a.order - b.order);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const { id } = active;
    
    const draggedOpportunity = opportunities.find(opp => opp.id === id);
    if (draggedOpportunity) {
      setActiveOpportunity(draggedOpportunity);
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (over) {
      const activeId = active.id;
      const overId = over.id;
      
      if (active.data?.current?.type === 'opportunity') {
        const opportunityId = activeId;
        const targetStageId = overId;

        const isTargetStage = stages.some(stage => stage.id === targetStageId);

        if (isTargetStage) {
          moveOpportunity(opportunityId, targetStageId, accessToken);
        }
      }
    }

    setActiveOpportunity(null);
  };

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="kanban-board">
      <div className="gba:p-4 gba:border-b gba:border-gray-200 gba:dark:border-gray-800">
        <div className="gba:text-2xl gba:font-semibold">Opportunities Kanban Board</div>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="gba:flex-1 gba:overflow-x-auto gba:scrollbar-hide">
          <div className="gba:flex gba:h-full gba:gap-4 gba:p-4">
            <SortableContext items={sortedStages.map(s => s.id)} strategy={horizontalListSortingStrategy}>
              {sortedStages.map(stage => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  opportunities={opportunities.filter(opp => opp.stageId === stage.id)}
                  accessToken={accessToken}
                  userInfo={userInfo}
                />
              ))}
            </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {activeOpportunity && <OpportunityCard opportunity={activeOpportunity} />}
        </DragOverlay>
      </DndContext>

      <OpportunityDialog />
    </div>
  );
}

export default KanbanBoard;