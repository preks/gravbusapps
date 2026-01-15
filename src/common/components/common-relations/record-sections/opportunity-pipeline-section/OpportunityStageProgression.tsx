import React, { useState, useCallback, useMemo } from 'react'
import { StageProgression, StageItem } from '@newwork/nw-design-system'
import { OpportunityStageTooltipContent } from './OpportunityStageTooltipContent'
import { AppAction } from '@/components/app-action/AppAction'
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

  // Calculate activeStageProgress for the current stage based on completed conditions
  const activeStageProgress = useMemo(() => {
    // Find the current stage
    const currentStageData = stages.find(
      s => s.value.toLowerCase() === currentStage.toLowerCase() || s.code.toLowerCase() === currentStage.toLowerCase()
    )

    if (!currentStageData) return undefined

    // Extract conditions for the current stage
    const conditions = contextConfig.extractStageConditions(stageConditionStatuses, currentStageData)

    if (conditions.length === 0) return undefined

    // Calculate progress: (completed / total) * 100
    const completedCount = conditions.filter(c => c.isCompleted).length
    return Math.round((completedCount / conditions.length) * 100)
  }, [stages, currentStage, stageConditionStatuses, contextConfig])

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

    for (const stage of stages || []) {
      // Use case-insensitive comparison for both value and code
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
        currentStage={currentStage}
        orientation="horizontal"
        variant="card"
        activeStageProgress={activeStageProgress}
      >
        {stages.map(stage => {
          const isCurrentStage =
            stage.value.toLowerCase() === currentStage.toLowerCase() ||
            stage.code.toLowerCase() === currentStage.toLowerCase()
          const isDisabled = readonly && !isCurrentStage

          const stagePropsData = stageProps[stage.id]

          // For the current stage, render directly with mouse handlers
          if (isCurrentStage) {
            return (
              <StageItem
                key={stage.id}
                value={stage.value}
                title={stage.value}
                disabled={isDisabled}
                onMouseEnter={stagePropsData?.mouseHandlers.onMouseEnter}
                onMouseLeave={stagePropsData?.mouseHandlers.onMouseLeave}
                data-testid={`${dataTestIdPrefix}-action-menu-${stage.code}`}
              />
            )
          }

          // For non-current stages, wrap with AppAction and pass mouse handlers to StageItem
          return (
            <AppAction
              key={`stage-${stage.id}-not-current`}
              mode="trigger"
              contextsArray={stagePropsData?.contextsArray}
              externalContextData={stagePropsData?.externalContextData}
              accessToken={accessToken}
              prefixDataTestId={`${dataTestIdPrefix}-action-${stage.code}`}
              lazyLoad={true}
              emptyState="enable"
              autoExecute={true}
              className="gba:contents"
            >
              <StageItem
                value={stage.value}
                title={stage.value}
                disabled={isDisabled}
                onMouseEnter={stagePropsData?.mouseHandlers.onMouseEnter}
                onMouseLeave={stagePropsData?.mouseHandlers.onMouseLeave}
                data-testid={`${dataTestIdPrefix}-action-menu-${stage.code}`}
              />
            </AppAction>
          )
        })}
      </StageProgression>

      {/* Custom Tooltip Overlay - only show if tooltips are enabled */}
      {tooltipsEnabled &&
        hoveredStageId &&
        tooltipPosition &&
        (() => {
          const hoveredStage = stages.find(s => s.id === hoveredStageId)
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
