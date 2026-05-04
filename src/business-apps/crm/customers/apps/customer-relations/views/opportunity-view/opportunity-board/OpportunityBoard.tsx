import { useState, useEffect } from 'react'
import {
  DndContext,
  DragOverlay,
  useSensors,
  useSensor,
  PointerSensor,
  closestCorners,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  RadioGroup,
  RadioGroupItem,
  Label
} from '@newwork/nw-design-system'
import { useKanbanStore } from './lib/kanban-store'
import { KanbanColumn, OpportunityCard, OpportunityDialog, EmployeeSelector } from './components'
import OpportunityRecord from '@/business-apps/crm/common/apps/opportunity-record/OpportunityRecord'
// import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { useSalesPipelines } from './hooks/useSalesPipelines'
import { usePipelineStages } from './hooks/usePipelineStages'
import { FIXED_STAGES } from './lib/stages'
import type { Opportunity } from './lib/types'

interface BusinessAppContextProps {
  accessToken: string
  userInfo?: any
  employeeId?: string
  structureId?: string
}

interface OpportunityBoardProps extends BusinessAppContextProps {
  sourceApp?: string
}

export function OpportunityBoard({ accessToken, userInfo, sourceApp }: OpportunityBoardProps) {
  const employeeId = userInfo?.employeeDetails?.employeeId
  const {
    stages,
    opportunities,
    // moveOpportunity,
    moveOpportunityToStage,
    moveOpportunityToPosition,
    reorderOpportunities,
    fetchOpportunities,
    updateStages,
    selectOpportunity,
    selectedOpportunity,
    isViewingOpportunity
  } = useKanbanStore()

  const [activeOpportunity, setActiveOpportunity] = useState<Opportunity | null>(null)
  const [filterMode, setFilterMode] = useState<'my' | 'all' | 'selected'>('my')
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([])
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | undefined>(undefined)
  const [dragOverStage, setDragOverStage] = useState<string | null>(null)
  const [dragOverOpportunity, setDragOverOpportunity] = useState<string | null>(null)
  const [insertPosition, setInsertPosition] = useState<'before' | 'after' | null>(null)
  const [isQuickEditing, setIsQuickEditing] = useState(false)

  // Fetch sales pipelines
  const { pipelines, isLoading: pipelinesLoading } = useSalesPipelines(accessToken)

  // Set default pipeline to "standard" when pipelines are loaded
  useEffect(() => {
    if (pipelines.length > 0 && selectedPipelineId === undefined) {
      // Look for a pipeline with "standard" in the name (case insensitive)
      const standardPipeline = pipelines.find(
        p => p.value.toLowerCase().includes('standard') || p.code?.toLowerCase().includes('standard')
      )
      if (standardPipeline) {
        setSelectedPipelineId(standardPipeline.id)
      }
    }
  }, [pipelines, selectedPipelineId])

  // Fetch pipeline stages for selected pipeline
  const { stages: pipelineStages, isLoading: stagesLoading } = usePipelineStages(accessToken, selectedPipelineId)

  // Update stages when pipeline stages change
  useEffect(() => {
    if (selectedPipelineId && pipelineStages.length > 0) {
      // Use pipeline-specific stages
      updateStages(pipelineStages)
    } else if (selectedPipelineId && pipelineStages.length === 0 && !stagesLoading) {
      // Clear stages when pipeline is selected but has no stages
      updateStages([])
    } else if (!selectedPipelineId) {
      // Use fixed stages when no pipeline is selected
      updateStages(FIXED_STAGES)
    }
  }, [selectedPipelineId, pipelineStages, stagesLoading, updateStages])

  useEffect(() => {
    let employeeFilter: string | undefined
    let employeeListFilter: string[] | undefined

    if (filterMode === 'my') {
      employeeFilter = employeeId
    } else if (filterMode === 'selected') {
      // Always pass the selectedEmployeeIds array, even if empty
      employeeListFilter = selectedEmployeeIds
    }
    // 'all' mode: no employee filtering

    fetchOpportunities(accessToken, employeeFilter, sourceApp, employeeListFilter, selectedPipelineId)
  }, [fetchOpportunities, employeeId, accessToken, filterMode, selectedEmployeeIds, selectedPipelineId, sourceApp])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    })
  )

  const handleDragStart = (event: any) => {
    const { active } = event
    const opportunityId = active.id

    const draggedOpportunity = opportunities.find(item => item.id === opportunityId)

    setActiveOpportunity(draggedOpportunity || null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over, active } = event

    if (over) {
      const overId = over.id as string
      const activeId = active.id as string

      // Find the active opportunity
      const activeOpportunity = opportunities.find(op => op.id === activeId)

      // Check if we're hovering over a stage (column)
      const stage = stages.find(s => s.id === overId)
      if (stage) {
        setDragOverStage(overId as string)
        setDragOverOpportunity(null)
        setInsertPosition(null)
      } else {
        // We're hovering over another opportunity
        const overOpportunity = opportunities.find(op => op.id === overId)
        if (overOpportunity && activeOpportunity) {
          const overStageId = overOpportunity.salesPipelineStageRef
          const activeStageId = activeOpportunity.salesPipelineStageRef

          setDragOverStage(overStageId || null)

          // If dragging to a different column, enable insertion positioning
          if (activeStageId !== overStageId) {
            setDragOverOpportunity(overId)
            // For simplicity, we'll insert after the hovered card
            // You could enhance this to detect mouse position for before/after
            setInsertPosition('after')
          } else {
            // Same column - use existing sortable behavior
            setDragOverOpportunity(null)
            setInsertPosition(null)
          }
        } else {
          setDragOverStage(null)
          setDragOverOpportunity(null)
          setInsertPosition(null)
        }
      }
    } else {
      setDragOverStage(null)
      setDragOverOpportunity(null)
      setInsertPosition(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // Clear all drag over states
    setDragOverStage(null)
    setDragOverOpportunity(null)
    setInsertPosition(null)
    setActiveOpportunity(null)

    if (!over || active.id === over.id) {
      return
    }

    const activeId = active.id as string
    const overId = over.id as string

    const activeOpportunity = opportunities.find(op => op.id === activeId)
    if (!activeOpportunity) return

    // Check if we're dropping on a stage (inter-column move to end)
    const targetStage = stages.find(s => s.id === overId)
    if (targetStage) {
      // Moving to a different stage at the end
      const activeStageId = activeOpportunity.salesPipelineStageRef
      if (activeStageId !== targetStage.id) {
        moveOpportunityToStage(activeId, targetStage.id, accessToken)
      }
      return
    }

    // Check if we're dropping on another opportunity
    const overOpportunity = opportunities.find(op => op.id === overId)
    if (overOpportunity) {
      const activeStageId = activeOpportunity.salesPipelineStageRef
      const overStageId = overOpportunity.salesPipelineStageRef

      if (activeStageId === overStageId) {
        // Reordering within the same column
        const stageOpportunities = opportunities.filter(op => {
          return op.salesPipelineStageRef === activeStageId
        })
        const activeIndex = stageOpportunities.findIndex(op => op.id === activeId)
        const overIndex = stageOpportunities.findIndex(op => op.id === overId)

        if (activeIndex !== overIndex) {
          const reorderedOpportunities = arrayMove(stageOpportunities, activeIndex, overIndex)
          if (activeStageId) {
            reorderOpportunities(activeStageId, reorderedOpportunities)
          }
        }
      } else {
        // Moving to a different stage with specific positioning
        const targetStageOpportunities = opportunities.filter(op => {
          return op.salesPipelineStageRef === overStageId
        })
        const insertIndex = targetStageOpportunities.findIndex(op => op.id === overId)

        // Insert after the target opportunity
        const newPosition = insertIndex + 1

        if (overStageId) {
          moveOpportunityToPosition(activeId, overStageId, newPosition, accessToken)
        }
      }
    }
  }

  if (isViewingOpportunity && selectedOpportunity) {
    return (
      <div className="gba:h-full gba:w-full" data-testid="opportunity-detail-container">
        <OpportunityRecord
          opportunityId={selectedOpportunity?.id || ''}
          accessToken={accessToken}
          onBack={() => selectOpportunity(null)}
        />
      </div>
    )
  }

  return (
    <div className="gba:h-full gba:flex gba:flex-col" data-testid="opportunity-board">
      <div className="gba:p-4 gba:border-b gba:border-gray-200 gba:dark:border-gray-800">
        <div className="gba:flex gba:justify-between gba:items-center gba:mb-4">
          <div className="gba:text-2xl gba:font-semibold">Opportunities Board</div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <button
              onClick={() => setIsQuickEditing(prev => !prev)}
              className={`gba:px-3 gba:py-1.5 gba:rounded gba:text-sm gba:font-medium gba:transition-colors gba:duration-200 ${
                isQuickEditing
                  ? 'gba:bg-blue-600 gba:text-white hover:gba:bg-blue-700'
                  : 'gba:bg-gray-100 gba:text-gray-700 hover:gba:bg-gray-200 gba:dark:bg-gray-800 gba:dark:text-gray-300'
              }`}
              data-testid="quick-edit-toggle"
              title={isQuickEditing ? 'Disable Quick Edit Mode' : 'Enable Quick Edit Mode'}
            >
              {isQuickEditing ? 'Quick Edit: On' : 'Quick Edit: Off'}
            </button>
          </div>
        </div>

        {/* Filters aligned to investment view */}
        <div className="gba:mb-6 gba:p-4 gba:bg-gray-50 gba:rounded-lg">
          <div className="gba:flex gba:flex-wrap gba:gap-4 gba:items-center">
            {/* Opportunity Filter */}
            <div className="gba:flex gba:flex-col gba:gap-2">
              <Label className="gba:text-sm gba:font-medium">Filter by:</Label>
              <RadioGroup
                value={filterMode}
                onValueChange={value => setFilterMode(value as 'my' | 'all' | 'selected')}
                className="gba:flex gba:gap-4"
              >
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <RadioGroupItem value="my" id="my-opportunities-board" />
                  <Label htmlFor="my-opportunities-board">My Opportunities</Label>
                </div>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <RadioGroupItem value="all" id="all-opportunities-board" />
                  <Label htmlFor="all-opportunities-board">All Opportunities</Label>
                </div>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <RadioGroupItem value="selected" id="selected-employees-board" />
                  <Label htmlFor="selected-employees-board">Selected Employees</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div className="gba:mt-4 gba:flex gba:flex-wrap gba:gap-4 gba:items-center">
            {/* Pipeline Selection */}
            <div className="gba:flex gba:flex-col gba:gap-2" data-testid="pipeline-filter-container">
              <Label className="gba:text-sm gba:font-medium">Pipeline:</Label>
              <Select value={selectedPipelineId} onValueChange={setSelectedPipelineId}>
                <SelectTrigger className="gba:w-48" data-testid="pipeline-filter-select">
                  <SelectValue placeholder={pipelinesLoading ? 'Loading...' : 'All Pipelines'} />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map(pipeline => (
                    <SelectItem key={pipeline.id} value={pipeline.id}>
                      {pipeline.value}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Selection - Only show when "Selected Employees" is chosen */}
            {filterMode === 'selected' && (
              <div className="gba:flex gba:flex-col gba:gap-2">
                <Label className="gba:text-sm gba:font-medium">Employees:</Label>
                <EmployeeSelector
                  {...{ accessToken, userInfo, employeeId }}
                  sourceApp={sourceApp}
                  selectedEmployeeIds={selectedEmployeeIds}
                  onEmployeeSelectionChange={setSelectedEmployeeIds}
                  disabled={filterMode !== 'selected'}
                />
              </div>
            )}
          </div>
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
          {stagesLoading && selectedPipelineId ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
              <div className="gba:text-center">
                {/* Loading spinner can be handled by design system Spinner if needed */}
                <div>Loading...</div>
                <p className="gba:mt-4 gba:text-gray-500">Loading pipeline stages...</p>
              </div>
            </div>
          ) : selectedPipelineId && stages.length === 0 && !stagesLoading ? (
            <div
              className="gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full"
              data-testid="no-stages-message"
            >
              <div className="gba:text-center gba:p-8">
                <div className="gba:text-6xl gba:mb-4">📋</div>
                <h3 className="gba:text-xl gba:font-semibold gba:text-gray-700 gba:mb-2">
                  No Stages for This Pipeline
                </h3>
                <p className="gba:text-gray-500 gba:mb-4">This pipeline doesn't have any stages configured yet.</p>
                <p className="gba:text-sm gba:text-gray-400">
                  Configure stages in the pipeline settings to start organizing opportunities.
                </p>
              </div>
            </div>
          ) : (
            stages.map(stage => (
              <KanbanColumn
                key={stage.id}
                stage={stage}
                opportunities={opportunities
                  .filter(opportunity => {
                    // Use only salesPipelineStageRef from catalog (stage field is deprecated)
                    return opportunity.salesPipelineStageRef === stage.id
                  })
                  .sort((a, b) => (a.position || 0) - (b.position || 0))}
                accessToken={accessToken}
                userInfo={userInfo}
                sourceApp={sourceApp}
                isDraggedOver={dragOverStage === stage.id}
                isDragging={activeOpportunity !== null}
                dragOverOpportunity={dragOverOpportunity}
                insertPosition={insertPosition}
                isQuickEditing={isQuickEditing}
              />
            ))
          )}
        </div>

        <DragOverlay>{activeOpportunity ? <OpportunityCard opportunity={activeOpportunity} /> : null}</DragOverlay>
      </DndContext>

      <OpportunityDialog />
    </div>
  )
}

export default OpportunityBoard
export type { OpportunityBoardProps }
