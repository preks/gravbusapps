import React, { useState, useCallback, useMemo } from 'react'
import { ReferenceData } from '../types'
import { StageProgression, type Stage, type StageCondition } from '@/components/stage-progression'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'

// Tooltip content component for opportunity stage conditions
const OpportunityStageTooltipContent: React.FC<{
  stage: Stage
  conditions: StageCondition[]
}> = ({ stage, conditions }) => {
  // Sort conditions: incomplete (false) first, then completed (true)
  const sortedConditions = [...conditions].sort((a, b) => {
    if (a.isCompleted === b.isCompleted) return 0
    return a.isCompleted ? 1 : -1 // false comes before true
  })

  return (
    <div className="gba:max-w-[280px] gba:py-1">
      <div className="gba:text-popover-foreground gba:text-sm gba:font-semibold gba:mb-2 gba:pb-1.5 gba:border-b gba:border-border">
        {stage.value} Stage Conditions
      </div>
      <div className="gba:max-h-[150px] gba:overflow-y-auto">
        {sortedConditions.length > 0 ? (
          sortedConditions.map(condition => (
            <div key={condition.id} className="gba:flex gba:items-start gba:gap-2 gba:py-1 gba:text-xs">
              {condition.isCompleted ? (
                <CheckCircleFilled
                  className="gba:text-success"
                  style={{ fontSize: '12px', marginTop: '2px', flexShrink: 0 }}
                />
              ) : (
                <CloseCircleFilled
                  className="gba:text-muted-foreground"
                  style={{ fontSize: '12px', marginTop: '2px', flexShrink: 0 }}
                />
              )}
              <div className="gba:flex-1">
                <div
                  className={
                    condition.isCompleted
                      ? 'gba:text-success gba:font-medium'
                      : 'gba:text-popover-foreground gba:font-medium'
                  }
                  style={{ lineHeight: '1.3' }}
                >
                  {condition.title}
                </div>
                {condition.isCompleted && condition.completedBy && (
                  <div className="gba:text-muted-foreground gba:text-[10px] gba:mt-0.5">
                    Completed by: {condition.completedBy}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="gba:text-muted-foreground gba:text-xs gba:italic gba:text-center gba:py-2">
            No conditions configured for this stage
          </div>
        )}
      </div>
      {conditions.length > 0 && (
        <div className="gba:text-muted-foreground gba:text-[10px] gba:mt-2 gba:pt-1.5 gba:border-t gba:border-border gba:italic">
          Click stage to change • {conditions.filter(c => c.isCompleted).length}/{conditions.length} completed
        </div>
      )}
    </div>
  )
}

// Transform real stage condition status data for stage progression display
// Filter conditions based on parentEntryId matching the stage
const getStageConditionsFromReal = (stageConditionStatuses: any[], stageName: string): StageCondition[] => {
  // Build the expected stage ID from the stage name
  const expectedStageId = `SalesPipelineStage:v1:${stageName}`

  // Filter conditions that belong to this specific stage
  const stageSpecificConditions = stageConditionStatuses.filter(statusData => {
    const parentEntryId = statusData.salesPipelineStageCondition?.parentEntryId
    return parentEntryId === expectedStageId
  })

  return stageSpecificConditions.map(statusData => {
    const config = statusData.configSnapshot || statusData.salesPipelineStageCondition?.objectValue || {}
    const checkedType = config.check_type === 'MANUAL' ? 'User' : 'Automated'

    // Get employee name - prefer displayName, fallback to firstName + lastName
    const getEmployeeName = (employee: any) => {
      if (!employee) return null
      return (
        employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee'
      )
    }

    return {
      id: statusData.id,
      title: statusData.salesPipelineStageCondition?.value || 'Unknown Condition',
      isCompleted: statusData.completed || false,
      checkedType: checkedType as 'Automated' | 'User' | 'Manager' | 'Owner',
      completedBy: statusData.completedByEmployee ? getEmployeeName(statusData.completedByEmployee) : null
    }
  })
}

// Convert ReferenceData to Stage format
const convertToStageFormat = (referenceData: ReferenceData[]): Stage[] => {
  return referenceData.map(ref => ({
    id: ref.id,
    value: ref.value,
    code: ref.code
  }))
}

interface OpportunityStageProgressionProps {
  currentStage: string
  stages: ReferenceData[]
  opportunityId: string
  stageConditionStatuses: any[]
  accessToken: string
  opportunityVersion?: number
  onStageUpdate?: () => void
}

export const OpportunityStageProgression: React.FC<OpportunityStageProgressionProps> = ({
  currentStage,
  stages,
  opportunityId,
  stageConditionStatuses,
  accessToken
}) => {
  // State for hover-based tooltip
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; width: number } | null>(null)

  // Handle tooltip hover using AppActionMenu hover handlers
  const handleTooltipMouseEnter = useCallback((stageId: string, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect()
    setHoveredStageId(stageId)
    setTooltipPosition({
      x: rect.left, // Use left edge instead of center
      y: rect.bottom + 10, // Show below the stage
      width: rect.width // Store the stage width
    })
  }, [])

  const handleTooltipMouseLeave = useCallback(() => {
    setHoveredStageId(null)
    setTooltipPosition(null)
  }, [])

  // Stable context arrays
  const emptyContextsArray = useMemo(() => [], [])
  const transitionContextsArray = useMemo(() => [FlowContextName.transitionOpportunityStage], [])
  const stageStyle = useMemo(() => ({ flex: 1, display: 'flex' as const }), [])

  // Create stable props for all stages
  const stageProps = useMemo(() => {
    const props: Record<
      string,
      {
        mouseHandlers: {
          onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => void
          onMouseLeave: (e: React.MouseEvent<HTMLDivElement>) => void
        }
        externalContextData: { opportunityId: string; targetStageRef: string }
        contextsArray: FlowContextName[]
      }
    > = {}

    convertToStageFormat(stages).forEach(stage => {
      const isCurrentStage = stage.code === currentStage
      props[stage.id] = {
        mouseHandlers: {
          onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => handleTooltipMouseEnter(stage.id, e),
          onMouseLeave: handleTooltipMouseLeave
        },
        externalContextData: {
          opportunityId: opportunityId,
          targetStageRef: stage.id
        },
        contextsArray: isCurrentStage ? emptyContextsArray : transitionContextsArray
      }
    })

    return props
  }, [
    stages,
    currentStage,
    opportunityId,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
    emptyContextsArray,
    transitionContextsArray
  ])

  if (stages.length === 0) {
    return null
  }

  return (
    <>
      <StageProgression
        stages={convertToStageFormat(stages)}
        currentStage={currentStage}
        dataTestIdPrefix="opportunity-stage-progression"
        onStageClick={() => {}} // Dummy function to enable pointer cursor
      >
        {(stage, isCurrentStage, _isCompleted, stageElement) => {
          const stagePropsData = stageProps[stage.id]
          return (
            <AppActionMenu
              key={`stage-${stage.id}-${isCurrentStage ? 'current' : 'not-current'}`}
              contextsArray={stagePropsData?.contextsArray}
              externalContextData={stagePropsData?.externalContextData}
              accessToken={accessToken}
              prefixDataTestId={`opportunity-stage-action-${stage.code}`}
              deferMainContextRequestsUntilClick={false}
              emptyStateBehavior="disable"
              autoExecuteSingleAction={true}
              style={stageStyle}
              onMouseEnter={stagePropsData?.mouseHandlers.onMouseEnter}
              onMouseLeave={stagePropsData?.mouseHandlers.onMouseLeave}
              data-testid={`opportunity-stage-action-menu-${stage.code}`}
            >
              {stageElement}
            </AppActionMenu>
          )
        }}
      </StageProgression>

      {/* Custom Tooltip Overlay */}
      {hoveredStageId &&
        tooltipPosition &&
        (() => {
          const hoveredStage = convertToStageFormat(stages).find(s => s.id === hoveredStageId)
          if (!hoveredStage) return null

          const conditions = getStageConditionsFromReal(stageConditionStatuses, hoveredStage.code)

          return (
            <div
              className="gba:bg-popover gba:text-popover-foreground gba:rounded-md gba:p-3 gba:shadow-lg gba:border gba:border-border"
              style={{
                position: 'fixed',
                left: tooltipPosition.x,
                top: tooltipPosition.y,
                width: tooltipPosition.width,
                zIndex: 1050,
                pointerEvents: 'none'
              }}
            >
              <OpportunityStageTooltipContent stage={hoveredStage} conditions={conditions} />
            </div>
          )
        })()}
    </>
  )
}
