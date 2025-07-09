import { useState, useEffect } from "react";
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor, closestCorners } from "@dnd-kit/core";
import { Switch } from "antd";
import { useKanbanStore } from "./lib/kanban-store";
import { KanbanColumn } from "./components/KanbanColumn";
import { OpportunityCard } from "./components/OpportunityCard";
import { OpportunityDialog } from "./components/OpportunityDialog";
import OpportunityDetail from "../../../crm/common/apps/opportunity-record/OpportunityDetail";
import { getTranslationFromI18nKeyAndLabel } from "../../../../common/utils/windowUtils";
import type { Opportunity } from "./lib/types";

interface BusinessAppContextProps {
  accessToken: string;
  userInfo?: any;
  employeeId?: string;
  structureId?: string;
}

export function KanbanBoard({ accessToken, userInfo }: BusinessAppContextProps) {
  const employeeId = userInfo?.employeeDetails?.employeeId;
  const { 
    stages, 
    opportunities, 
    moveOpportunity, 
    fetchOpportunities,
    selectOpportunity,
    selectedOpportunity,
    isViewingOpportunity
  } = useKanbanStore();

  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
  const [showAllOpportunities, setShowAllOpportunities] = useState<boolean>(false);

  useEffect(() => {
    fetchOpportunities(
      accessToken,
      showAllOpportunities ? undefined : employeeId
    );
  }, [fetchOpportunities, employeeId, accessToken, showAllOpportunities]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = (event: any) => {
    const { active } = event;
    const opportunityId = active.id;
    
    const draggedOpportunity = opportunities.find(
      (item) => item.id === opportunityId
    );
    
    setActiveOpportunity(draggedOpportunity || null);
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    
    if (!over) {
      setActiveOpportunity(null);
      return;
    }
    
    const activeId = active.id;
    const overId = over.id;
    
    if (activeId === overId) {
      setActiveOpportunity(null);
      return;
    }
    
    const activeOpportunityData = opportunities.find(
      (item) => item.id === activeId
    );
    
    if (!activeOpportunityData) {
      setActiveOpportunity(null);
      return;
    }
    
    const targetStageId = overId;
    
    if (activeOpportunityData.stageId !== targetStageId) {
      moveOpportunity(activeId, targetStageId, accessToken);
    }
    
    setActiveOpportunity(null);
  };


  if (isViewingOpportunity && selectedOpportunity) {
    return (
      <div className="gba:h-full gba:w-full" data-testid="opportunity-detail-container">
        <OpportunityDetail 
          opportunityId={selectedOpportunity?.id || ''}
          accessToken={accessToken}
          onBack={() => selectOpportunity(null)}
        />
      </div>
    );
  }


  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="kanban-board">
      <div className="gba:p-4 gba:border-b gba:border-gray-200 gba:dark:border-gray-800 gba:flex gba:justify-between gba:items-center">
        <div className="gba:text-2xl gba:font-semibold">Opportunities Kanban Board</div>
        <div className="gba:flex gba:items-center gba:gap-2" data-testid="opportunity-filter-toggle">
          <span className="gba:text-sm gba:text-gray-600 gba:dark:text-gray-300">
            {getTranslationFromI18nKeyAndLabel('myOpportunities', 'My Opportunities')}
          </span>
          <Switch 
            checked={showAllOpportunities}
            onChange={setShowAllOpportunities}
            data-testid="opportunity-filter-switch"
          />
          <span className="gba:text-sm gba:text-gray-600 gba:dark:text-gray-300">
            {getTranslationFromI18nKeyAndLabel('allOpportunities', 'All Opportunities')}
          </span>
        </div>
      </div>
      
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="gba:flex gba:flex-1 gba:overflow-x-auto gba:overflow-y-hidden gba:p-4 gba:gap-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunities.filter(
                (opportunity) => opportunity.stageId === stage.id
              )}
              accessToken={accessToken}
              userInfo={userInfo}
            />
          ))}
        </div>

        <DragOverlay>
          {activeOpportunity ? <OpportunityCard opportunity={activeOpportunity} /> : null}
        </DragOverlay>
      </DndContext>

      <OpportunityDialog />
    </div>
  );
}

export default KanbanBoard;