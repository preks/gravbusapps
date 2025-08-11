import React from 'react';
import { Tooltip } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { formatDataTestId } from '@/common/utils/formatDataTestId';
import { StageProgressionProps, Stage, StageCondition } from './types';

// Default tooltip content component
const DefaultTooltipContent: React.FC<{ 
  stage: Stage; 
  conditions: StageCondition[];
  isCurrentStage: boolean;
}> = ({ stage, conditions, isCurrentStage }) => {
  // Sort conditions: incomplete (false) first, then completed (true)
  const sortedConditions = [...conditions].sort((a, b) => {
    if (a.isCompleted === b.isCompleted) return 0;
    return a.isCompleted ? 1 : -1; // false comes before true
  });
  
  return (
    <div style={{ maxWidth: '280px', padding: '4px 0' }}>
      <div style={{ 
        fontSize: '13px', 
        fontWeight: '600', 
        marginBottom: '8px',
        color: '#ffffff',
        borderBottom: '1px solid #4b5563',
        paddingBottom: '6px'
      }}>
        {stage.value} Stage Conditions
      </div>
      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
        {sortedConditions.length > 0 ? (
          sortedConditions.map((condition) => (
            <div 
              key={condition.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                padding: '4px 0',
                fontSize: '12px'
              }}
            >
              {condition.isCompleted ? (
                <CheckCircleFilled style={{ color: '#4ade80', fontSize: '12px', marginTop: '2px', flexShrink: 0 }} />
              ) : (
                <CloseCircleFilled style={{ color: '#d1d5db', fontSize: '12px', marginTop: '2px', flexShrink: 0 }} />
              )}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '500',
                  color: condition.isCompleted ? '#4ade80' : '#e5e7eb',
                  lineHeight: '1.3'
                }}>
                  {condition.title}
                </div>
                {condition.isCompleted && condition.completedBy && (
                  <div style={{ 
                    fontSize: '10px', 
                    color: '#d1d5db',
                    marginTop: '2px'
                  }}>
                    Completed by: {condition.completedBy}
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{
            color: '#d1d5db',
            fontSize: '12px',
            fontStyle: 'italic',
            textAlign: 'center',
            padding: '8px 0'
          }}>
            {isCurrentStage 
              ? 'No conditions configured for this stage'
              : 'Conditions shown only for active stage'
            }
          </div>
        )}
      </div>
      <div style={{
        fontSize: '10px',
        color: '#d1d5db',
        marginTop: '8px',
        paddingTop: '6px',
        borderTop: '1px solid #4b5563',
        fontStyle: 'italic'
      }}>
        Click stage to change • {conditions.filter(c => c.isCompleted).length}/{conditions.length} completed
      </div>
    </div>
  );
};

export const StageProgression: React.FC<StageProgressionProps> = ({
  stages,
  currentStage,
  styling = {},
  tooltip = { showConditions: true },
  getStageConditions,
  getStageCompletionPercentage,
  onStageClick,
  renderStageContent,
  renderTooltipContent,
  dataTestIdPrefix = 'stage-progression'
}) => {
  // Default styling
  const defaultStyling = {
    height: '40px',
    fontSize: '14px',
    fontWeight: '600',
    borderRadius: '20px',
    colors: {
      completed: '#4CAF50',
      current: {
        border: 'linear-gradient(135deg, rgba(76, 175, 80, 0.8), rgba(102, 187, 106, 0.6))',
        background: '#ffffff',
        text: '#333333'
      },
      pending: {
        background: 'transparent',
        text: '#666666'
      }
    },
    ...styling
  };

  const getCurrentStageIndex = () => {
    const currentIndex = stages.findIndex(stage => 
      stage.value.toLowerCase() === currentStage.toLowerCase() || 
      stage.code.toLowerCase() === currentStage.toLowerCase()
    );
    return currentIndex >= 0 ? currentIndex : 0;
  };

  const currentIndex = getCurrentStageIndex();

  if (stages.length === 0) {
    return null;
  }

  return (
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
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        height: '48px',
        backgroundColor: '#f5f5f5',
        borderRadius: '24px',
        overflow: 'visible',
        border: '1px solid #e0e0e0',
        padding: '0 4px',
        gap: '0'
      }}>
        {stages.map((stage, index) => {
          const isCurrentStage = index === currentIndex;
          const isCompleted = index < currentIndex;
          const conditions = getStageConditions ? getStageConditions(stage.code) : [];
          const completionPercentage = getStageCompletionPercentage ? getStageCompletionPercentage(stage.code) : 100;
          
          // Determine colors
          let backgroundColor = 'transparent';
          let textColor = defaultStyling.colors.pending.text;
          
          if (isCompleted) {
            backgroundColor = defaultStyling.colors.completed;
            textColor = 'white';
          } else if (isCurrentStage) {
            backgroundColor = 'transparent';
            textColor = defaultStyling.colors.current.text;
          }

          // Determine border radius and clip path
          let borderRadius = '0';
          let clipPath = 'none';
          let WebkitClipPath = 'none';
          let marginRight = '0';

          if (index === 0) {
            borderRadius = '20px 0 0 20px';
            if (stages.length > 1) {
              clipPath = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)';
              WebkitClipPath = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)';
              marginRight = '8px';
            } else {
              borderRadius = '20px';
            }
          } else if (index === stages.length - 1) {
            borderRadius = '0 20px 20px 0';
            clipPath = 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)';
            WebkitClipPath = 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)';
          } else {
            clipPath = 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)';
            WebkitClipPath = 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)';
            marginRight = '8px';
          }

          const handleStageClick = () => {
            if (onStageClick && !isCurrentStage) {
              onStageClick(stage);
            }
          };

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
                cursor: isCurrentStage ? 'default' : (onStageClick ? 'pointer' : 'default')
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                paddingRight: index < stages.length - 1 ? '24px' : '16px',
                paddingLeft: index > 0 ? '24px' : '16px',
                position: 'relative',
                zIndex: 10
              }}>
                {renderStageContent ? (
                  renderStageContent(stage, isCurrentStage, isCompleted)
                ) : (
                  <>
                    {(isCurrentStage || isCompleted) && (
                      <span style={{ 
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
                      }}>
                        ✓
                      </span>
                    )}
                    <span style={{ 
                      whiteSpace: 'nowrap',
                      fontSize: stages.length > 4 ? '12px' : '14px'
                    }}>
                      {stage.value}
                    </span>
                  </>
                )}
              </div>
            </div>
          );

          // Always wrap with tooltip for consistent DOM structure, but conditionally show content
          const tooltipContent = (tooltip.showConditions && conditions.length > 0) ? 
            (renderTooltipContent ? 
              renderTooltipContent(stage, conditions) : 
              <DefaultTooltipContent stage={stage} conditions={conditions} isCurrentStage={isCurrentStage} />
            ) : null;

          return (
            <Tooltip
              key={stage.id}
              title={tooltipContent}
              placement={tooltip.placement || 'bottom'}
              overlayStyle={{ 
                maxWidth: tooltip.maxWidth || '300px',
                zIndex: 1050
              }}
              mouseEnterDelay={tooltip.mouseEnterDelay || 0.3}
              mouseLeaveDelay={tooltip.mouseLeaveDelay || 0.1}
            >
              {stageElement}
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
};

export default StageProgression;
