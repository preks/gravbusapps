import React from 'react'
import { TooltipProvider } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { StageProgressionProps } from './types'

const getStageStyles = (index: number, stagesLength: number) => {
  const isFirst = index === 0
  const isLast = index === stagesLength - 1
  const isSingle = stagesLength === 1

  if (isFirst && isSingle) {
    return {
      borderRadius: '20px',
      clipPath: 'none',
      WebkitClipPath: 'none',
      marginRight: '0'
    }
  }

  if (isFirst) {
    return {
      borderRadius: '20px 0 0 20px',
      clipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
      WebkitClipPath: 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)',
      marginRight: '8px'
    }
  }

  if (isLast) {
    return {
      borderRadius: '0 20px 20px 0',
      clipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)',
      WebkitClipPath: 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)',
      marginRight: '0'
    }
  }

  return {
    borderRadius: '0',
    clipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)',
    WebkitClipPath: 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)',
    marginRight: '8px'
  }
}

const getColorClasses = (isActive: boolean) => {
  return isActive ? 'gba:bg-success gba:text-primary-foreground' : 'gba:bg-muted gba:text-muted-foreground'
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
  const defaultStyling = {
    height: '40px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '20px',
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
          const isActive = isCompleted || isCurrentStage
          const isClickable = onStageClick && !isCurrentStage

          const stageStyles = getStageStyles(index, stages.length)

          const handleStageClick = () => {
            if (isClickable) {
              onStageClick(stage)
            }
          }

          const handleKeyDown = (event: React.KeyboardEvent) => {
            if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
              event.preventDefault()
              onStageClick(stage)
            }
          }

          const stageElement = (
            <div
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              aria-label={isClickable ? `Navigate to ${stage.value} stage` : undefined}
              className={getColorClasses(isActive)}
              style={{
                position: 'relative',
                height: defaultStyling.height,
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: defaultStyling.fontSize,
                fontWeight: defaultStyling.fontWeight,
                borderRadius: stageStyles.borderRadius,
                marginRight: stageStyles.marginRight,
                clipPath: stageStyles.clipPath,
                WebkitClipPath: stageStyles.WebkitClipPath,
                cursor: isClickable ? 'pointer' : 'default'
              }}
              data-testid={formatDataTestId(dataTestIdPrefix, `stage-${stage.code}`)}
              onClick={handleStageClick}
              onKeyDown={handleKeyDown}
            >
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
                    {isActive && (
                      <span
                        className={`gba:text-sm gba:font-bold gba:text-primary-foreground gba:rounded-full gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center ${isCompleted ? 'gba:bg-primary-100' : 'gba:bg-success'}`}
                      >
                        ✓
                      </span>
                    )}
                    <span className={`gba:whitespace-nowrap ${stages.length > 4 ? 'gba:text-xs' : 'gba:text-sm'}`}>
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
