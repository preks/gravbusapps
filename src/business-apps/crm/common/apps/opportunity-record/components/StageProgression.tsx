import React, { useState } from 'react';
import { Modal, Tooltip, message } from 'antd';
import { CheckCircleFilled, CloseCircleFilled } from '@ant-design/icons';
import { ReferenceData } from '../types';
import { useUpdateOpportunityStage } from '../hooks/useUpdateOpportunityStage';
import { WorkflowsStatusModal } from './WorkflowsStatusModal';
import { WorkflowStatusService } from '../services/WorkflowStatusService';
import { getStageTransitionConditions, hasStageTransitionConditions } from '../config/stageTransitionConditions';
import { StageTransitionCondition } from '../types/stageTransition';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

// TEST-DEBUG: Mock conditions data for tooltips - REVERT THIS
interface StageCondition {
  id: string;
  title: string;
  isCompleted: boolean;
  checkedType: 'Automated' | 'User' | 'Manager' | 'Owner';
}

// TEST-DEBUG: Mock stage conditions mapping - REVERT THIS
const getStageConditions = (stageName: string): StageCondition[] => {
  const allConditions: StageCondition[] = [
    { id: '1', title: 'Budget confirmation received', isCompleted: true, checkedType: 'Manager' },
    { id: '2', title: 'Decision maker identified', isCompleted: true, checkedType: 'User' },
    { id: '3', title: 'Technical requirements documented', isCompleted: false, checkedType: 'Owner' },
    { id: '4', title: 'Proposal submitted and acknowledged', isCompleted: false, checkedType: 'User' },
    { id: '5', title: 'Legal review completed', isCompleted: false, checkedType: 'Manager' }
  ];
  
  // Mock logic: Different stages show different conditions
  switch (stageName.toLowerCase()) {
    case 'discovery':
    case 'qualification':
      return allConditions.slice(0, 2); // First 2 conditions
    case 'proposal':
    case 'needs analysis':
      return allConditions.slice(2, 4); // Middle 2 conditions
    case 'negotiation':
    case 'closed won':
    case 'closed lost':
      return allConditions.slice(4); // Last condition
    default:
      return allConditions.slice(0, 3); // Default: first 3 conditions
  }
};

// TEST-DEBUG: Compact tooltip content component - REVERT THIS
const StageTooltipContent: React.FC<{ stageName: string }> = ({ stageName }) => {
  const conditions = getStageConditions(stageName);
  
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
        {stageName} Stage Conditions
      </div>
      <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
        {conditions.map((condition) => (
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
                color: condition.isCompleted ? '#4ade80' : '#e5e7eb', // TEST-DEBUG: Light colors for dark bg
                lineHeight: '1.3'
              }}>
                {condition.title}
              </div>
              <div style={{ 
                fontSize: '10px', 
                color: '#d1d5db', // TEST-DEBUG: Light gray for dark background
                marginTop: '2px'
              }}>
                Checked by: {condition.checkedType}
              </div>
            </div>
          </div>
        ))}
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
  opportunityVersion: number;
  accessToken: string;
  onStageUpdate: () => void;
}

export const StageProgression: React.FC<StageProgressionProps> = ({
  currentStage,
  stages,
  opportunityId,
  opportunityVersion,
  accessToken,
  onStageUpdate
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<ReferenceData | null>(null);
  const [workflowsModalVisible, setWorkflowsModalVisible] = useState(false);
  const [activeWorkflows, setActiveWorkflows] = useState<any[]>([]);
  const [transitionConditions, setTransitionConditions] = useState<StageTransitionCondition[]>([]);
  const [loadingWorkflows, setLoadingWorkflows] = useState(false);
  
  const { updateStage, isLoading } = useUpdateOpportunityStage(accessToken);

  const handleStageClick = async (stage: ReferenceData) => {
    // Don't show modal if clicking on current stage
    if (stage.value.toLowerCase() === currentStage.toLowerCase()) {
      return;
    }
    
    setSelectedStage(stage);
    
    // Check if transition conditions exist for this stage change
    const conditions = getStageTransitionConditions(
      currentStage,
      stage.value,
      'default-pipeline', // TODO: Get actual pipeline ID from opportunity data
      0 // TODO: Get actual opportunity value
    );
    
    if (conditions.length > 0) {
      // Check for existing active workflows
      setLoadingWorkflows(true);
      try {
        const existingWorkflows = await WorkflowStatusService.getStageTransitionWorkflows(
          opportunityId,
          currentStage,
          stage.value,
          accessToken
        );
        
        if (existingWorkflows.length > 0) {
          // Show existing workflows status
          setActiveWorkflows(existingWorkflows);
          setWorkflowsModalVisible(true);
        } else {
          // Start new workflows
          setTransitionConditions(conditions);
          setModalVisible(true);
        }
      } catch (error) {
        console.error('Error checking workflows:', error);
        message.error(
          getTranslationFromI18nKeyAndLabel(
            'crm:opportunity.workflowStatus.checkError',
            'Failed to check approval status'
          )
        );
        // Fallback to direct stage change
        setModalVisible(true);
      } finally {
        setLoadingWorkflows(false);
      }
    } else {
      // No conditions required - direct stage change
      setModalVisible(true);
    }
  };

  const handleConfirmStageChange = async () => {
    if (!selectedStage) return;
    
    // If there are transition conditions, start workflows instead of direct stage change
    if (transitionConditions.length > 0) {
      try {
        setLoadingWorkflows(true);
        
        // Start workflows for each condition
        for (const condition of transitionConditions) {
          await WorkflowStatusService.startStageTransitionWorkflow(
            opportunityId,
            condition,
            {}, // TODO: Pass actual opportunity data
            accessToken
          );
        }
        
        message.success(
          getTranslationFromI18nKeyAndLabel(
            'crm:opportunity.workflowStatus.workflowsStarted',
            'Approval workflows have been started'
          )
        );
        
        // Close the modal and show workflows status
        setModalVisible(false);
        setSelectedStage(null);
        
        // Refresh workflows and show status modal
        const workflows = await WorkflowStatusService.getStageTransitionWorkflows(
          opportunityId,
          currentStage,
          selectedStage.value,
          accessToken
        );
        setActiveWorkflows(workflows);
        setWorkflowsModalVisible(true);
        
      } catch (error) {
        console.error('Error starting workflows:', error);
        message.error(
          getTranslationFromI18nKeyAndLabel(
            'crm:opportunity.workflowStatus.startError',
            'Failed to start approval workflows'
          )
        );
      } finally {
        setLoadingWorkflows(false);
      }
    } else {
      // Direct stage change (no conditions)
      try {
        await updateStage(
          opportunityId, 
          opportunityVersion, 
          selectedStage.id,
          selectedStage.value,
          () => {
            setModalVisible(false);
            setSelectedStage(null);
            onStageUpdate();
          }
        );
      } catch (error) {
        console.error('Error updating stage:', error);
      }
    }
  };

  const handleCancelModal = () => {
    setModalVisible(false);
    setSelectedStage(null);
    setTransitionConditions([]);
  };

  const handleWorkflowsCompleted = async () => {
    if (!selectedStage) return;
    
    try {
      // All workflows completed - proceed with stage change
      await updateStage(
        opportunityId, 
        opportunityVersion, 
        selectedStage.id,
        selectedStage.value,
        () => {
          setWorkflowsModalVisible(false);
          setSelectedStage(null);
          setActiveWorkflows([]);
          setTransitionConditions([]);
          onStageUpdate();
        }
      );
    } catch (error) {
      console.error('Error updating stage after workflow completion:', error);
    }
  };

  const handleCancelWorkflowsModal = () => {
    setWorkflowsModalVisible(false);
    setSelectedStage(null);
    setActiveWorkflows([]);
    setTransitionConditions([]);
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

          /* Static green progress fill - 25% of the arrow, same dimensions as white background */
          .stage-current-animated::after {
            content: '';
            position: absolute;
            top: 2px;
            left: 2px;
            right: 75%;
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
          }

          /* Primary premium shimmer overlay */
          .stage-current-animated .shimmer-overlay {
            position: absolute;
            top: 2px;
            left: 2px;
            right: 75%;
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
          const isPending = index > currentIndex;
          
          // TODO: TEST-DEBUG ONLY - REVERT THIS CHANGE LATER
          // Original: Full green background for completed/current stages
          // Test: Previous stages 100% filled, current stage 20% bar from left
          let backgroundColor = 'transparent';
          let textColor = '#666666';
          let backgroundImage = 'none';
          
          if (isCompleted) {
            // Test-Debug: Completed stages get full green background (original behavior)
            backgroundColor = '#4CAF50';
            textColor = 'white';
          } else if (isCurrentStage) {
            // Test-Debug: Current stage gets animated 20% fill from left
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
              title={<StageTooltipContent stageName={stage.value} />}
              placement="top"
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
                {/* Moving shimmer overlay - only for current stage */}
                {isCurrentStage && (
              <>
                <div className="shimmer-secondary" />
                <div className="shimmer-overlay" />
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
        title={
          transitionConditions.length > 0 
            ? getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.stageChange.approvalRequired',
                'Approval Required for Stage Change'
              )
            : getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.stageChange.confirm',
                'Confirm Stage Change'
              )
        }
        open={modalVisible}
        onOk={handleConfirmStageChange}
        onCancel={handleCancelModal}
        confirmLoading={isLoading || loadingWorkflows}
        okText={
          transitionConditions.length > 0
            ? getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.stageChange.startApprovals',
                'Start Approvals'
              )
            : getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.stageChange.confirm',
                'Confirm'
              )
        }
        cancelText={getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.stageChange.cancel',
          'Cancel'
        )}
        okType="primary"
        data-testid="stage-change-modal"
      >
        {transitionConditions.length > 0 ? (
          <div>
            <p>
              {getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.stageChange.approvalRequiredMessage',
                'Changing the opportunity stage to'
              )} <strong>{selectedStage?.value}</strong> {getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.stageChange.requiresApproval',
                'requires the following approvals:'
              )}
            </p>
            <ul className="gba:mt-3 gba:space-y-2">
              {transitionConditions.map(condition => 
                condition.conditions.map((item, index) => (
                  <li key={`${condition.id}-${index}`} className="gba:flex gba:items-center">
                    <CheckCircleFilled className="gba:text-blue-500 gba:mr-2" />
                    <span className="gba:text-sm">{item.title || item.description}</span>
                  </li>
                ))
              )}
            </ul>
            <p className="gba:mt-3 gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                'crm:opportunity.stageChange.approvalProcess',
                'Click "Start Approvals" to initiate the approval process. The stage change will be completed once all approvals are received.'
              )}
            </p>
          </div>
        ) : (
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
        )}
      </Modal>

      {/* Workflows Status Modal */}
      <WorkflowsStatusModal
        visible={workflowsModalVisible}
        workflows={activeWorkflows}
        opportunityId={opportunityId}
        fromStage={currentStage}
        toStage={selectedStage?.value || ''}
        opportunityData={{}}
        accessToken={accessToken}
        onWorkflowsCompleted={handleWorkflowsCompleted}
        onCancel={handleCancelWorkflowsModal}
      />
    </div>
  );
}; 