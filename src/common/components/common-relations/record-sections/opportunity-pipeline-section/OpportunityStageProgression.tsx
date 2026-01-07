import React, { useState, useCallback, useMemo } from 'react'
import { StageProgression } from '@/components/stage-progression/StageProgression'
import { OpportunityStageTooltipContent } from './OpportunityStageTooltipContent'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import { convertToStageFormat } from './utils'
import type { OpportunityStageProgressionProps } from './types'

/**
 * Context-agnostic OpportunityStageProgression component
 *
 * This component does NOT contain any investment or customer-specific logic.
 * All context-specific behavior is injected via the contextConfig prop.
 */
export const OpportunityStageProgression: React.FC<OpportunityStageProgressionProps> = ({
  currentStage,
  stages,
  opportunityId,
  stageConditionStatuses,
  accessToken,
  contextConfig,
  readonly = false,
  opportunityStatus,
  dataTestIdPrefix = 'opportunity-stage-progression'
}) => {
  // State for hover-based tooltip
  const [hoveredStageId, setHoveredStageId] = useState<string | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number; width: number } | null>(null)

  // Check if tooltips should be enabled (use context config or default to true)
  const tooltipsEnabled = contextConfig.isTooltipEnabled ? contextConfig.isTooltipEnabled(opportunityStatus) : true

  // Handle tooltip hover
  const handleTooltipMouseEnter = useCallback(
    (stageId: string, event: React.MouseEvent) => {
      if (!tooltipsEnabled) {
        return
      }

      const rect = event.currentTarget.getBoundingClientRect()
      setHoveredStageId(stageId)
      setTooltipPosition({
        x: rect.left,
        y: rect.bottom + 10,
        width: rect.width
      })
    },
    [tooltipsEnabled]
  )

  const handleTooltipMouseLeave = useCallback(() => {
    setHoveredStageId(null)
    setTooltipPosition(null)
  }, [])

  // Stable context arrays
  const emptyContextsArray = useMemo(() => [], [])
  const transitionContextsArray = useMemo(
    () => [contextConfig.transitionFlowContext],
    [contextConfig.transitionFlowContext]
  )
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
        externalContextData: Record<string, string>
        contextsArray: (typeof contextConfig.transitionFlowContext)[]
      }
    > = {}

    for (const stage of convertToStageFormat(stages)) {
      // Use case-insensitive comparison for both value and code, matching StageProgression logic
      const isCurrentStage =
        stage.value.toLowerCase() === currentStage.toLowerCase() ||
        stage.code.toLowerCase() === currentStage.toLowerCase()
      const isDisabled = readonly && !isCurrentStage

      props[stage.id] = {
        mouseHandlers: {
          onMouseEnter: (e: React.MouseEvent<HTMLDivElement>) => handleTooltipMouseEnter(stage.id, e),
          onMouseLeave: handleTooltipMouseLeave
        },
        externalContextData: {
          [contextConfig.opportunityIdField]: opportunityId,
          [contextConfig.targetStageRefField]: stage.id
        },
        contextsArray: isCurrentStage || isDisabled ? emptyContextsArray : transitionContextsArray
      }
    }

    return props
  }, [
    stages,
    currentStage,
    opportunityId,
    contextConfig.opportunityIdField,
    contextConfig.targetStageRefField,
    handleTooltipMouseEnter,
    handleTooltipMouseLeave,
    emptyContextsArray,
    transitionContextsArray,
    readonly
  ])

  if (!stages || stages.length === 0) {
    return null
  }

  return (
    <>
      <StageProgression
        stages={convertToStageFormat(stages)}
        currentStage={currentStage}
        dataTestIdPrefix={dataTestIdPrefix}
        onStageClick={() => {}} // Dummy function to enable pointer cursor for non-current stages
        renderStageWrapper={(stage, isCurrentStage, _isCompleted, stageElement) => {
          const stagePropsData = stageProps[stage.id]

          // For the current stage, render a plain container (no action menu)
          if (isCurrentStage) {
            return (
              <div
                key={`stage-${stage.id}-current`}
                style={stageStyle}
                onMouseEnter={stagePropsData?.mouseHandlers.onMouseEnter}
                onMouseLeave={stagePropsData?.mouseHandlers.onMouseLeave}
                data-testid={`${dataTestIdPrefix}-action-menu-${stage.code}`}
              >
                {stageElement}
              </div>
            )
          }

          // For non-current stages, use action menu to allow transitions
          return (
            <AppActionMenu
              key={`stage-${stage.id}-not-current`}
              contextsArray={stagePropsData?.contextsArray}
              externalContextData={stagePropsData?.externalContextData}
              accessToken={accessToken}
              prefixDataTestId={`${dataTestIdPrefix}-action-${stage.code}`}
              deferMainContextRequestsUntilClick={true}
              emptyStateBehavior="enable"
              autoExecuteSingleAction={true}
              style={stageStyle}
              onMouseEnter={stagePropsData?.mouseHandlers.onMouseEnter}
              onMouseLeave={stagePropsData?.mouseHandlers.onMouseLeave}
              data-testid={`${dataTestIdPrefix}-action-menu-${stage.code}`}
            >
              {stageElement}
            </AppActionMenu>
          )
        }}
      />

      {/* Custom Tooltip Overlay - only show if tooltips are enabled */}
      {tooltipsEnabled &&
        hoveredStageId &&
        tooltipPosition &&
        (() => {
          const hoveredStage = convertToStageFormat(stages).find(s => s.id === hoveredStageId)
          if (!hoveredStage) return null

          // Use context-specific extractor to get stage conditions
          // Pass the full stage object so the extractor can use id, code, or value as needed
          const conditions = contextConfig.extractStageConditions(stageConditionStatuses, hoveredStage)

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
