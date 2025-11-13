import React, { useState, useCallback, useMemo } from 'react'
import { StageProgression } from '@/components/stage-progression/StageProgression'
import type { Stage, StageCondition } from '@/components/stage-progression/types'
import { OpportunityStageTooltipContent } from '@/components/stage-progression/OpportunityStageTooltipContent'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'

// Reference data interface for pipeline stages
export interface ReferenceData {
  id: string
  code: string
  value: string
  alternativeCode?: string
  additionalValue1?: string
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
  const transitionContextsArray = useMemo(() => [FlowContextName.customerOpportunityStageTransition], [])
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
        onStageClick={() => {}} // Dummy function to enable pointer cursor for non-current stages
      >
        {(stage, isCurrentStage, _isCompleted, stageElement) => {
          const stagePropsData = stageProps[stage.id]
          // For the current stage, render a plain container (no action menu) to prevent any click interaction
          if (isCurrentStage) {
            return (
              <div
                key={`stage-${stage.id}-current`}
                style={stageStyle}
                onMouseEnter={stagePropsData?.mouseHandlers.onMouseEnter}
                onMouseLeave={stagePropsData?.mouseHandlers.onMouseLeave}
                data-testid={`opportunity-stage-action-menu-${stage.code}`}
              >
                {stageElement}
              </div>
            )
          }

          // For non-current stages, keep the action menu to allow transitions
          return (
            <AppActionMenu
              key={`stage-${stage.id}-not-current`}
              contextsArray={stagePropsData?.contextsArray}
              externalContextData={stagePropsData?.externalContextData}
              accessToken={accessToken}
              prefixDataTestId={`opportunity-stage-action-${stage.code}`}
              deferMainContextRequestsUntilClick={true}
              emptyStateBehavior="enable"
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
