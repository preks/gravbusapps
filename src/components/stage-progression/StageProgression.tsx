import React from 'react'
import { TooltipProvider } from '@newwork/nw-design-system'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { StageProgressionProps } from './types'

export const StageProgression: React.FC<StageProgressionProps> = ({
  stages,
  currentStage,
  styling = {},
  getStageCompletionPercentage,
  onStageClick,
  renderStageContent,
  children,
  dataTestIdPrefix = 'stage-progression'
}) => {
  // Default styling with proper type safety
  const defaultColors = {
    completed: '#4CAF50',
    current: {
      border: 'linear-gradient(135deg, rgba(76, 175, 80, 0.8), rgba(102, 187, 106, 0.6))',
      background: '#ffffff',
      text: '#333333'
    },
    pending: {
      background: '#9CA3AF', // Darker gray background for better visibility
      text: '#FFFFFF' // White text for better contrast
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
      <div>
        <style>
          {`
          @keyframes premiumProgressWave {
            0% {
              background-position: 0% 50%;
              transform: scaleY(1) scaleX(1);
            }
            25% {
              transform: scaleY(1.01) scaleX(1.005);
            }
            50% {
              background-position: 100% 50%;
              transform: scaleY(1) scaleX(1);
            }
            75% {
              transform: scaleY(1.01) scaleX(1.005);
            }
            100% {
              background-position: 0% 50%;
              transform: scaleY(1) scaleX(1);
            }
          }

          @keyframes premiumShimmer {
            0% {
              background-position: -200% 0;
            }
            100% {
              background-position: 200% 0;
            }
          }

          @keyframes subtlePulse {
            0% {
              box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
            }
            50% {
              box-shadow: 0 0 16px rgba(76, 175, 80, 0.5), 0 0 24px rgba(76, 175, 80, 0.2);
            }
            100% {
              box-shadow: 0 0 8px rgba(76, 175, 80, 0.3);
            }
          }

          .stage-current-animated {
            position: relative;
            overflow: visible;
            background: linear-gradient(135deg, rgba(76, 175, 80, 0.8), rgba(102, 187, 106, 0.6));
            animation: subtlePulse 4s ease-in-out infinite;
          }

          .stage-current-animated::before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            bottom: 2px;
            background: #ffffff;
            z-index: 1;
            clip-path: inherit;
            -webkit-clip-path: inherit;
          }

          .stage-current-animated .progress-fill {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            bottom: 2px;
            background: linear-gradient(
              135deg,
              #4CAF50 0%,
              #66BB6A 25%,
              #81C784 50%,
              #66BB6A 75%,
              #4CAF50 100%
            );
            background-size: 200% 200%;
            animation: premiumProgressWave 4s ease-in-out infinite;
            z-index: 2;
            clip-path: inherit;
            -webkit-clip-path: inherit;
          }

          .stage-current-animated .shimmer-overlay {
            position: absolute;
            top: 2px;
            left: 2px;
            bottom: 2px;
            background: linear-gradient(
              90deg,
              transparent 0%,
              transparent 20%,
              rgba(255,255,255,0.3) 35%,
              rgba(255,255,255,0.8) 50%,
              rgba(255,255,255,0.3) 65%,
              transparent 80%,
              transparent 100%
            );
            animation: premiumShimmer 4s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
            z-index: 3;
            pointer-events: none;
            clip-path: inherit;
            -webkit-clip-path: inherit;
          }
        `}
        </style>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: '48px',
            backgroundColor: '#f5f5f5',
            borderRadius: '24px',
            overflow: 'visible',
            border: '1px solid #e0e0e0',
            padding: '0 4px',
            gap: '0'
          }}
        >
          {stages.map((stage, index) => {
            const isCurrentStage = index === currentIndex
            const isCompleted = index < currentIndex
            const completionPercentage = getStageCompletionPercentage ? getStageCompletionPercentage(stage.code) : 100

            // Determine colors
            let backgroundColor = defaultStyling.colors.pending?.background || defaultColors.pending.background
            let textColor = defaultStyling.colors.pending?.text || defaultColors.pending.text

            if (isCompleted) {
              backgroundColor = defaultStyling.colors.completed || defaultColors.completed
              textColor = 'white'
            } else if (isCurrentStage) {
              backgroundColor = 'transparent'
              textColor = defaultStyling.colors.current?.text || defaultColors.current.text
            }

            // Determine border radius and clip path
            let borderRadius = '0'
            let clipPath = 'none'
            let WebkitClipPath = 'none'
            let marginRight = '0'

            if (index === 0) {
              borderRadius = '20px 0 0 20px'
              if (stages.length > 1) {
                clipPath = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
                WebkitClipPath = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)'
                marginRight = '8px'
              } else {
                borderRadius = '20px'
              }
            } else if (index === stages.length - 1) {
              borderRadius = '0 20px 20px 0'
              clipPath = 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
              WebkitClipPath = 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)'
            } else {
              clipPath = 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)'
              WebkitClipPath =
                'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)'
              marginRight = '8px'
            }

            const handleStageClick = () => {
              if (onStageClick && !isCurrentStage) {
                onStageClick(stage)
              }
            }

            const stageElement = (
              <div
                className={isCurrentStage ? 'stage-current-animated' : ''}
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
                  transition: 'all 0.3s ease',
                  clipPath,
                  WebkitClipPath,
                  cursor: onStageClick && !isCurrentStage ? 'pointer' : 'default'
                }}
                data-testid={formatDataTestId(dataTestIdPrefix, `stage-${stage.code}`)}
                onClick={handleStageClick}
              >
                {/* Dynamic progress fill and shimmer overlays - only for current stage */}
                {isCurrentStage && (
                  <>
                    {/* Progress fill with dynamic width based on completion percentage */}
                    <div
                      className="progress-fill"
                      style={{
                        width: `${completionPercentage}%`,
                        right: 'auto'
                      }}
                    />

                    {/* Shimmer overlay only shows on the filled portion */}
                    <div
                      className="shimmer-overlay"
                      style={{
                        width: `${completionPercentage}%`,
                        right: 'auto'
                      }}
                    />
                  </>
                )}

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
                            backgroundColor: isCompleted ? 'rgba(255,255,255,0.3)' : '#4CAF50',
                            color: 'white',
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
      </div>
    </TooltipProvider>
  )
}

export default StageProgression
