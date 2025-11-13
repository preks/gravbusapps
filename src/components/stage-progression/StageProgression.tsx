import React from 'react'
import { TooltipProvider } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { StageProgressionProps } from './types'

// Helper function to determine stage colors
const getStageColors = (isCurrentStage: boolean, isCompleted: boolean, defaultStyling: any, defaultColors: any) => {
  // Both completed and current stages use the same colors
  if (isCompleted || isCurrentStage) {
    return {
      backgroundColor: defaultStyling.colors.completed || defaultColors.completed,
      textColor: 'var(--nw-color-primary-foreground)'
    }
  }

  return {
    backgroundColor: defaultStyling.colors.pending?.background || defaultColors.pending.background,
    textColor: defaultStyling.colors.pending?.text || defaultColors.pending.text
  }
}

// Helper function to determine border styling
const getBorderStyling = (index: number, totalStages: number) => {
  const styling = {
    borderRadius: '0',
    clipPath: 'none',
    WebkitClipPath: 'none',
    marginRight: '0'
  }

  if (index === 0) {
    styling.borderRadius = '20px 0 0 20px'
    if (totalStages > 1) {
      styling.clipPath = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
      styling.WebkitClipPath = styling.clipPath
      styling.marginRight = '8px'
    } else {
      styling.borderRadius = '20px'
    }
  } else if (index === totalStages - 1) {
    styling.borderRadius = '0 20px 20px 0'
    styling.clipPath = 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
    styling.WebkitClipPath = styling.clipPath
  } else {
    styling.clipPath = 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)'
    styling.WebkitClipPath = styling.clipPath
    styling.marginRight = '8px'
  }

  return styling
}

export const StageProgression: React.FC<StageProgressionProps> = ({
  stages,
  currentStage,
  styling = {},
  onStageClick,
  renderStageContent,
  children,
  dataTestIdPrefix = 'stage-progression'
}) => {
  // Default styling with design system tokens
  const defaultColors = {
    completed: 'var(--nw-color-success)',
    current: {
      border: 'linear-gradient(135deg, rgba(76, 175, 80, 0.8), rgba(102, 187, 106, 0.6))',
      background: 'var(--nw-color-background)',
      text: 'var(--nw-color-foreground)'
    },
    pending: {
      background: 'var(--nw-color-muted)',
      text: 'var(--nw-color-muted-foreground)'
    }
  }

  const defaultStyling = {
    height: '40px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '20px',
    colors: {
      ...defaultColors,
      ...(styling.colors || {})
    },
    ...styling
  }

  const getCurrentStageIndex = () => {
    const currentIndex = stages.findIndex(
      stage =>
        stage.value.toLowerCase() === currentStage.toLowerCase() ||
        stage.code.toLowerCase() === currentStage.toLowerCase()
    )
    return currentIndex >= 0 ? currentIndex : 0
  }

  const currentIndex = getCurrentStageIndex()

  if (stages.length === 0) {
    return null
  }

  return (
    <TooltipProvider>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '48px',
          backgroundColor: 'var(--nw-color-muted-100)',
          borderRadius: '24px',
          overflow: 'visible',
          border: '1px solid var(--nw-color-border)',
          padding: '0 4px',
          gap: '0'
        }}
      >
        {stages.map((stage, index) => {
          const isCurrentStage = index === currentIndex
          const isCompleted = index < currentIndex

          // Get colors using helper function
          const { backgroundColor, textColor } = getStageColors(
            isCurrentStage,
            isCompleted,
            defaultStyling,
            defaultColors
          )

          // Get border styling using helper function
          const { borderRadius, clipPath, WebkitClipPath, marginRight } = getBorderStyling(index, stages.length)

          const handleStageClick = () => {
            if (onStageClick && !isCurrentStage) {
              onStageClick(stage)
            }
          }

          const stageElement = (
            <div
              style={{
                position: 'relative',
                height: defaultStyling.height,
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: defaultStyling.fontSize,
                fontWeight: defaultStyling.fontWeight,
                backgroundColor,
                color: textColor,
                borderRadius,
                marginRight,
                clipPath,
                WebkitClipPath,
                cursor: onStageClick && !isCurrentStage ? 'pointer' : 'default'
              }}
              data-testid={formatDataTestId(dataTestIdPrefix, `stage-${stage.code}`)}
              onClick={handleStageClick}
            >
              {/* Stage content */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0 16px',
                  paddingRight: index < stages.length - 1 ? '24px' : '16px',
                  paddingLeft: index > 0 ? '24px' : '16px',
                  position: 'relative',
                  zIndex: 10
                }}
              >
                {renderStageContent ? (
                  renderStageContent(stage, isCurrentStage, isCompleted)
                ) : (
                  <>
                    {(isCurrentStage || isCompleted) && (
                      <span
                        style={{
                          fontSize: '14px',
                          fontWeight: 'bold',
                          backgroundColor: isCompleted ? 'var(--nw-color-primary-100)' : 'var(--nw-color-success)',
                          color: 'var(--nw-color-primary-foreground)',
                          borderRadius: '50%',
                          width: '20px',
                          height: '20px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✓
                      </span>
                    )}
                    <span
                      style={{
                        whiteSpace: 'nowrap',
                        fontSize: stages.length > 4 ? '12px' : '14px'
                      }}
                    >
                      {stage.value}
                    </span>
                  </>
                )}
              </div>
            </div>
          )

          return (
            <React.Fragment key={stage.id}>
              {children ? children(stage, isCurrentStage, isCompleted, stageElement) : stageElement}
            </React.Fragment>
          )
        })}
      </div>
    </TooltipProvider>
  )
}

export default StageProgression
