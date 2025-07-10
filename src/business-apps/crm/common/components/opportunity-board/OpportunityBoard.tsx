import { useState, useEffect } from "react";
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor, closestCorners } from "@dnd-kit/core";
import { Switch, Radio } from "antd";
import { useKanbanStore } from "./lib/kanban-store";
import { 
  KanbanColumn, 
  OpportunityCard, 
  OpportunityDialog, 
  EmployeeSelector 
} from "./components";
import OpportunityRecord from "../../apps/opportunity-record/OpportunityRecord";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import type { Opportunity } from "./lib/types";

interface BusinessAppContextProps {
  accessToken: string;
  userInfo?: any;
  employeeId?: string;
  structureId?: string;
}

interface OpportunityBoardProps extends BusinessAppContextProps {
  sourceApp?: string;
}

export function OpportunityBoard({ accessToken, userInfo, sourceApp }: OpportunityBoardProps) {
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
  const [filterMode, setFilterMode] = useState<'my' | 'all' | 'selected'>('my');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  useEffect(() => {
    let employeeFilter: string | undefined;
    let employeeListFilter: string[] | undefined;

    if (filterMode === 'my') {
      employeeFilter = employeeId;
    } else if (filterMode === 'selected') {
      // Always pass the selectedEmployeeIds array, even if empty
      employeeListFilter = selectedEmployeeIds;
    }
    // 'all' mode: no employee filtering

    fetchOpportunities(
      accessToken,
      employeeFilter,
      sourceApp,
      employeeListFilter
    );
  }, [fetchOpportunities, employeeId, accessToken, filterMode, selectedEmployeeIds, sourceApp]);

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
        <OpportunityRecord 
          opportunityId={selectedOpportunity?.id || ''}
          accessToken={accessToken}
          onBack={() => selectOpportunity(null)}
        />
      </div>
    );
  }


  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="opportunity-board">
      <div className="gba:p-4 gba:border-b gba:border-gray-200 gba:dark:border-gray-800">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div className="gba:text-2xl gba:font-semibold">Opportunities Board</div>
        </div>
        
        <div className="gba:flex gba:flex-col gba:gap-4 sm:gba:flex-row sm:gba:items-center">
          <div className="gba:flex gba:items-center gba:gap-4" data-testid="opportunity-filter-radio">
            <span className="gba:text-sm gba:font-medium gba:text-gray-700 gba:dark:text-gray-300">
              Filter by:
            </span>
            <Radio.Group
              value={filterMode}
              onChange={(e) => setFilterMode(e.target.value)}
              size="small"
            >
              <Radio value="my">My Opportunities</Radio>
              <Radio value="all">All Opportunities</Radio>
              <Radio value="selected">Selected Employees</Radio>
            </Radio.Group>
          </div>
          
          {filterMode === 'selected' && (
            <EmployeeSelector
              {...{ accessToken, userInfo, employeeId }}
              sourceApp={sourceApp}
              selectedEmployeeIds={selectedEmployeeIds}
              onEmployeeSelectionChange={setSelectedEmployeeIds}
              disabled={filterMode !== 'selected'}
            />
          )}
        </div>
      </div>
      
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
              opportunities={opportunities.filter(
                (opportunity) => opportunity.stageId === stage.id
              )}
              accessToken={accessToken}
              userInfo={userInfo}
              sourceApp={sourceApp}
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

export default OpportunityBoard;
export type { OpportunityBoardProps }; 