import React, { useState } from 'react';
import { Tooltip, Modal, message } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { ReferenceData } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// TEST-DEBUG: Mock conditions data for tooltips - REVERT THIS
interface StageCondition {
  id: string;
  title: string;
  isCompleted: boolean;
  checkedType: 'Automated' | 'User' | 'Manager' | 'Owner';
  completedBy?: string | null; // Employee name who completed the condition
}

// Transform real stage condition status data for stage progression display
// Filter conditions based on parentEntryId matching the stage
const getStageConditionsFromReal = (stageConditionStatuses: any[], stageName: string): StageCondition[] => {
  // Build the expected stage ID from the stage name
  const expectedStageId = `SalesPipelineStage:v1:${stageName}`;
  
  // Filter conditions that belong to this specific stage
  const stageSpecificConditions = stageConditionStatuses.filter(statusData => {
    const parentEntryId = statusData.salesPipelineStageCondition?.parentEntryId;
    return parentEntryId === expectedStageId;
  });
  
  return stageSpecificConditions.map(statusData => {
    const config = statusData.configSnapshot || statusData.salesPipelineStageCondition?.objectValue || {};
    const checkedType = config.check_type === 'MANUAL' ? 'User' : 'Automated';
    
    // Get employee name - prefer displayName, fallback to firstName + lastName
    const getEmployeeName = (employee: any) => {
      if (!employee) return null;
      return employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unknown Employee';
    };
    
    return {
      id: statusData.id,
      title: statusData.salesPipelineStageCondition?.value || 'Unknown Condition',
      isCompleted: statusData.completed || false,
      checkedType: checkedType as 'Automated' | 'User' | 'Manager' | 'Owner',
      completedBy: statusData.completedByEmployee ? getEmployeeName(statusData.completedByEmployee) : null
    };
  });
};

// Calculate completion percentage for a specific stage
const getStageCompletionPercentage = (stageConditionStatuses: any[], stageName: string): number => {
  const conditions = getStageConditionsFromReal(stageConditionStatuses, stageName);
  
  if (conditions.length === 0) {
    return 0; // No conditions = 0% completion (not 100%)
  }
  
  const completedCount = conditions.filter(condition => condition.isCompleted).length;
  return Math.round((completedCount / conditions.length) * 100);
};

// Real stage tooltip content component
const StageTooltipContent: React.FC<{ 
  stageName: string; 
  stageDisplayName?: string;
  stageConditionStatuses: any[]; 
  currentStage: string; 
}> = ({ stageName, stageDisplayName, stageConditionStatuses, currentStage }) => {
  const conditions = getStageConditionsFromReal(stageConditionStatuses, stageName);
  
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
        color: '#ffffff', // TEST-DEBUG: Changed to white for dark background
        borderBottom: '1px solid #4b5563',
        paddingBottom: '6px'
      }}>
        {stageDisplayName || stageName} Stage Conditions
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
            {stageName === currentStage 
              ? 'No conditions configured for this stage'
              : 'Conditions shown only for active stage'
            }
          </div>
        )}
      </div>
      <div style={{
        fontSize: '10px',
        color: '#d1d5db', // TEST-DEBUG: Light gray for dark background
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

interface StageProgressionProps {
  currentStage: string;
  stages: ReferenceData[];
  opportunityId: string;
  stageConditionStatuses: any[];
  accessToken: string;
  opportunityVersion?: number;
  onStageUpdate?: () => void;
}

export const StageProgression: React.FC<StageProgressionProps> = ({
  currentStage,
  stages,
  stageConditionStatuses,
  onStageUpdate = () => {}
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ReferenceData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStageClick = async (stage: ReferenceData) => {
    // Don't show modal if clicking on current stage
    if (stage.value.toLowerCase() === currentStage.toLowerCase()) {
      return;
    }
    
    setSelectedStage(stage);
    setModalVisible(true);
  };

  const handleConfirmStageChange = async () => {
    if (!selectedStage) return;
    
    try {
      setIsLoading(true);
      
      // TODO: Implement actual stage update logic
      message.success(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.stageChange.success',
          `Stage changed to ${selectedStage.value}`
        )
      );
      
      setModalVisible(false);
      setSelectedStage(null);
      onStageUpdate();
      
    } catch (error) {
      console.error('Error updating stage:', error);
      message.error(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.stageChange.error',
          'Failed to update stage'
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelModal = () => {
    setModalVisible(false);
    setSelectedStage(null);
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
    <div style={{ marginBottom: '24px' }}>
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
              transform: scaleY(0.99) scaleX(0.995);
            }
            100% {
              background-position: 0% 50%;
              transform: scaleY(1) scaleX(1);
            }
          }

          @keyframes premiumShimmer {
            0% {
              transform: translateX(-120%);
              opacity: 0;
            }
            15% {
              opacity: 0.8;
            }
            25% {
              opacity: 1;
            }
            75% {
              opacity: 1;
            }
            85% {
              opacity: 0.8;
            }
            100% {
              transform: translateX(420%);
              opacity: 0;
            }
          }

          @keyframes premiumShimmerSlow {
            0% {
              transform: translateX(-150%);
              opacity: 0;
            }
            20% {
              opacity: 0.3;
            }
            80% {
              opacity: 0.3;
            }
            100% {
              transform: translateX(450%);
              opacity: 0;
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

          @keyframes ripple {
            0% {
              background-size: 200% 100%;
              background-position: -100% 0;
            }
            100% {
              background-size: 200% 100%;
              background-position: 100% 0;
            }
          }

          .stage-current-animated {
            position: relative;
            overflow: visible;
            /* Background becomes the border color with premium gradient */
            background: linear-gradient(135deg, rgba(76, 175, 80, 0.8), rgba(102, 187, 106, 0.6));
            /* Premium pulsing glow effect */
            animation: subtlePulse 4s ease-in-out infinite;
          }

          /* Inner content area with white background to create border effect */
          .stage-current-animated::before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            bottom: 2px;
            background: #ffffff;
            z-index: 1;
            /* Inherit clip-path from parent for perfect arrow shape */
            clip-path: inherit;
            -webkit-clip-path: inherit;
          }

          /* Dynamic green progress fill - will be controlled by inline styles */
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

          /* Primary premium shimmer overlay - will be controlled by inline styles */
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

          /* Restore white background for border effect */
          .stage-current-animated::before {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            bottom: 2px;
            background: #ffffff;
            z-index: 1;
            /* Inherit clip-path from parent for perfect arrow shape */
            clip-path: inherit;
            -webkit-clip-path: inherit;
          }

          /* Secondary slower shimmer for premium effect - using nested div */
          .stage-current-animated .shimmer-secondary {
            position: absolute;
            top: 2px;
            left: 2px;
            right: 2px;
            bottom: 2px;
            background: linear-gradient(
              90deg,
              rgba(255,255,255,0.1) 0%,
              rgba(255,255,255,0.2) 50%,
              rgba(255,255,255,0.1) 100%
            );
            animation: premiumShimmerSlow 6s cubic-bezier(0.25, 0.1, 0.25, 1) infinite;
            z-index: 2;
            clip-path: inherit;
            -webkit-clip-path: inherit;
            pointer-events: none;
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
        padding: '0 4px'
      }}>
        
        {stages.map((stage, index) => {
          const isCurrentStage = index === currentIndex;
          const isCompleted = index < currentIndex;
          
          // Calculate completion percentage for current stage based on conditions
          const completionPercentage = isCurrentStage 
            ? getStageCompletionPercentage(stageConditionStatuses, stage.code)
            : 0;
            
          // Debug log for testing
          if (isCurrentStage && completionPercentage > 0) {
            console.log(`Stage ${stage.code} completion: ${completionPercentage}%`);
          }
          
          let backgroundColor = 'transparent';
          let textColor = '#666666';
          
          if (isCompleted) {
            // Completed stages get full green background
            backgroundColor = '#4CAF50';
            textColor = 'white';
          } else if (isCurrentStage) {
            // Current stage gets dynamic progress fill based on condition completion
            backgroundColor = 'transparent'; // Background handled by CSS border + animations
            textColor = '#333333';
          }

          // Determine border radius based on position
          let borderRadius = '0';
          let clipPath = 'none';
          let WebkitClipPath = 'none';
          let marginRight = '0';

          if (index === 0) {
            // First stage - rounded left, pointed right
            borderRadius = '20px 0 0 20px';
            if (stages.length > 1) {
              clipPath = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)';
              WebkitClipPath = 'polygon(0 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 0 100%)';
              marginRight = '8px';
            } else {
              borderRadius = '20px';
            }
          } else if (index === stages.length - 1) {
            // Last stage - inward curve left, rounded right
            borderRadius = '0 20px 20px 0';
            clipPath = 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)';
            WebkitClipPath = 'polygon(12px 0, 100% 0, 100% 100%, 12px 100%, 24px 50%)';
          } else {
            // Middle stages - inward curve left, pointed right
            clipPath = 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)';
            WebkitClipPath = 'polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 24px 50%)';
            marginRight = '8px';
          }

          return (
            // TEST-DEBUG: Added tooltip wrapper - REVERT THIS
            <Tooltip
              key={stage.id}
              title={<StageTooltipContent stageName={stage.code} stageDisplayName={stage.value} stageConditionStatuses={stageConditionStatuses} currentStage={currentStage} />}
              placement="bottom"
              overlayStyle={{ 
                maxWidth: '300px',
                zIndex: 1050
              }}
              mouseEnterDelay={0.3}
              mouseLeaveDelay={0.1}
            >
              <div
                className={isCurrentStage ? 'stage-current-animated' : ''}
                style={{
                  position: 'relative',
                  height: '40px',
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  fontWeight: '600',
                  backgroundColor,
                  color: textColor,
                  borderRadius,
                  marginRight,
                  transition: 'all 0.3s ease',
                  clipPath,
                  WebkitClipPath,
                  cursor: isCurrentStage ? 'default' : 'pointer'
                }}
                data-testid={`stage-${stage.code}`}
                onClick={() => !isCurrentStage && handleStageClick(stage)}
              >
                {/* Dynamic progress fill and shimmer overlays - only for current stage */}
                {isCurrentStage && (
              <>
                {/* Progress fill with dynamic width based on completion percentage */}
                <div 
                  className="progress-fill" 
                  style={{ 
                    width: `${completionPercentage}%`,
                    right: 'auto' // Override CSS to use width instead of right
                  }} 
                />
                
                {/* Shimmer overlays only show on the filled portion */}
                <div className="shimmer-secondary" />
                <div 
                  className="shimmer-overlay" 
                  style={{ 
                    width: `${completionPercentage}%`,
                    right: 'auto' // Override CSS to use width instead of right
                  }} 
                />
              </>
            )}
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
                {(isCurrentStage || isCompleted) && (
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    // TEST-DEBUG: Different checkmark styles based on stage state
                    backgroundColor: isCompleted ? 'rgba(255,255,255,0.3)' : '#4CAF50',
                    color: isCompleted ? 'white' : 'white',
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
              </div>
                </div>
              </Tooltip>
          );
        })}
      </div>
      
      {/* Stage Change Confirmation Modal */}
      <Modal
        title={getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.stageChange.confirm',
          'Confirm Stage Change'
        )}
        open={modalVisible}
        onOk={handleConfirmStageChange}
        onCancel={handleCancelModal}
        confirmLoading={isLoading}
        okText={getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.stageChange.confirm',
          'Confirm'
        )}
        cancelText={getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.stageChange.cancel',
          'Cancel'
        )}
        okType="primary"
        data-testid="stage-change-modal"
      >
        <div>
          <p>
            {getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.stageChange.confirmMessage',
              'Are you sure you want to change the opportunity stage to'
            )} <strong>{selectedStage?.value}</strong>?
          </p>
          <p className="gba:mt-2 gba:text-sm gba:text-gray-600">
            {getTranslationFromI18nKeyAndLabel(
              'crm:opportunity.stageChange.directChange',
              'This action will update the opportunity\'s current stage.'
            )}
          </p>
        </div>
      </Modal>
    </div>
  );
}; 