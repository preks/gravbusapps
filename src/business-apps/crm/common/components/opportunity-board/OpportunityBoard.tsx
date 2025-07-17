import { useState, useEffect } from "react";
import { DndContext, DragOverlay, useSensors, useSensor, PointerSensor, closestCorners, DragOverEvent, DragEndEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
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
    moveOpportunityToStage,
    moveOpportunityToPosition,
    reorderOpportunities,
    fetchOpportunities,
    selectOpportunity,
    selectedOpportunity,
    isViewingOpportunity
  } = useKanbanStore();

  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null);
  const [filterMode, setFilterMode] = useState<'my' | 'all' | 'selected'>('my');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [dragOverOpportunity, setDragOverOpportunity] = useState<string | null>(null);
  const [insertPosition, setInsertPosition] = useState<'before' | 'after' | null>(null);

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

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event;
    
    if (over) {
      const overId = over.id as string;
      const activeId = active.id as string;
      
      // Find the active opportunity
      const activeOpportunity = opportunities.find(op => op.id === activeId);
      
      // Check if we're hovering over a stage (column)
      const stage = stages.find(s => s.id === overId);
      if (stage) {
        setDragOverStage(overId as string);
        setDragOverOpportunity(null);
        setInsertPosition(null);
      } else {
        // We're hovering over another opportunity
        const overOpportunity = opportunities.find(op => op.id === overId);
        if (overOpportunity && activeOpportunity) {
          setDragOverStage(overOpportunity.stageId || null);
          
          // If dragging to a different column, enable insertion positioning
          if (activeOpportunity.stageId !== overOpportunity.stageId) {
            setDragOverOpportunity(overId);
            // For simplicity, we'll insert after the hovered card
            // You could enhance this to detect mouse position for before/after
            setInsertPosition('after');
          } else {
            // Same column - use existing sortable behavior
            setDragOverOpportunity(null);
            setInsertPosition(null);
          }
        } else {
          setDragOverStage(null);
          setDragOverOpportunity(null);
          setInsertPosition(null);
        }
      }
    } else {
      setDragOverStage(null);
      setDragOverOpportunity(null);
      setInsertPosition(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    // Clear all drag over states
    setDragOverStage(null);
    setDragOverOpportunity(null);
    setInsertPosition(null);
    setActiveOpportunity(null);
    
    if (!over || active.id === over.id) {
      return;
    }
    
    const activeId = active.id as string;
    const overId = over.id as string;
    
    const activeOpportunity = opportunities.find(op => op.id === activeId);
    if (!activeOpportunity) return;
    
    // Check if we're dropping on a stage (inter-column move to end)
    const targetStage = stages.find(s => s.id === overId);
    if (targetStage) {
      // Moving to a different stage at the end
      if (activeOpportunity.stageId !== targetStage.id) {
        moveOpportunityToStage(activeId, targetStage.id, accessToken);
      }
      return;
    }
    
    // Check if we're dropping on another opportunity
    const overOpportunity = opportunities.find(op => op.id === overId);
    if (overOpportunity) {
      const activeStageId = activeOpportunity.stageId;
      const overStageId = overOpportunity.stageId;
      
      if (activeStageId === overStageId) {
        // Reordering within the same column
        const stageOpportunities = opportunities.filter(op => op.stageId === activeStageId);
        const activeIndex = stageOpportunities.findIndex(op => op.id === activeId);
        const overIndex = stageOpportunities.findIndex(op => op.id === overId);
        
        if (activeIndex !== overIndex) {
          const reorderedOpportunities = arrayMove(stageOpportunities, activeIndex, overIndex);
          reorderOpportunities(activeStageId || '', reorderedOpportunities);
        }
      } else {
        // Moving to a different stage with specific positioning
        const targetStageOpportunities = opportunities.filter(op => op.stageId === overStageId);
        const insertIndex = targetStageOpportunities.findIndex(op => op.id === overId);
        
        // Insert after the target opportunity
        const newPosition = insertIndex + 1;
        
        moveOpportunityToPosition(activeId, overStageId || '', newPosition, accessToken);
      }
    }
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
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="gba:flex gba:flex-1 gba:overflow-x-auto gba:overflow-y-hidden gba:scroll-smooth gba:p-4 gba:gap-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              stage={stage}
              opportunities={opportunities
                .filter((opportunity) => opportunity.stageId === stage.id)
                .sort((a, b) => (a.position || 0) - (b.position || 0))
              }
              accessToken={accessToken}
              userInfo={userInfo}
              sourceApp={sourceApp}
              isDraggedOver={dragOverStage === stage.id}
              isDragging={activeOpportunity !== null}
              dragOverOpportunity={dragOverOpportunity}
              insertPosition={insertPosition}
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