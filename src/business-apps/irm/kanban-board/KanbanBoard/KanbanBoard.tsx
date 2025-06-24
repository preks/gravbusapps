import { useState, useEffect } from "react";
import { DndContext, DragOverlay, closestCorners, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { useKanbanStore } from "./lib/kanban-store";
import { KanbanColumn } from "./components/KanbanColumn";
import { OpportunityCard } from "./components/OpportunityCard";
import { OpportunityDialog } from "./components/OpportunityDialog";
import type { Opportunity } from "./lib/types";

// Define BusinessAppContextProps interface as it's used in other components
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

  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
  
  // Fetch opportunities when component mounts
  useEffect(() => {
    const loadOpportunities = async () => {
      try {
        console.log('Fetching opportunities...');
        await fetchOpportunities(accessToken);
      } catch (error) {
        console.error('Error loading opportunities:', error);
      }
    };
    
    loadOpportunities();
  }, [fetchOpportunities, accessToken]);

  // No longer need to check for sales manager role as we're using fixed stages

  // Sort stages by their order
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
    const id = active.id;

    setActiveId(id);

    const draggedOpportunity = opportunities.find(opp => opp.id === id);
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

        const isTargetStage = stages.some(stage => stage.id === targetStageId);

        if (isTargetStage) {
          // Pass the accessToken to update the opportunity in the backend
          moveOpportunity(opportunityId, targetStageId, accessToken);
        }
      }
      // We no longer support reordering stages as they're fixed
    }

    setActiveId(null);
    setActiveOpportunity(null);
  };

  // No longer need handleAddOpportunity as it's handled in KanbanColumn

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

            {/* No longer adding stages as we use fixed stages */}
          </div>
        </div>

        <DragOverlay>
          {activeId && activeOpportunity ? (
            <div className="gba:w-64">
              <OpportunityCard opportunity={activeOpportunity} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <OpportunityDialog />
    </div>
  );
}

export default KanbanBoard;