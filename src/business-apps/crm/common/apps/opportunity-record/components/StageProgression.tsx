import React, { useState } from 'react';
import { Modal } from 'antd';
import { ReferenceData } from '../types';
import { useUpdateOpportunityStage } from '../hooks/useUpdateOpportunityStage';

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
  
  const { updateStage, isLoading } = useUpdateOpportunityStage(accessToken);

  const handleStageClick = (stage: ReferenceData) => {
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
      await updateStage(
        opportunityId, 
        opportunityVersion, 
        selectedStage.id, // Use stage id as the reference
        selectedStage.value, // Display name for the success message
        () => {
          setModalVisible(false);
          setSelectedStage(null);
          onStageUpdate();
        }
      );
    } catch (error) {
      console.error('Error updating stage:', error);
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
          
          // Determine background color
          let backgroundColor = 'transparent';
          let textColor = '#666666';
          
          if (isCurrentStage) {
            backgroundColor = '#4CAF50'; // Green for current stage
            textColor = 'white';
          } else if (isCompleted) {
            backgroundColor = '#4CAF50'; // Green for completed stages
            textColor = 'white';
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
            <div
              key={stage.id}
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
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                paddingRight: index < stages.length - 1 ? '24px' : '16px',
                paddingLeft: index > 0 ? '24px' : '16px'
              }}>
                {(isCurrentStage || isCompleted) && (
                  <span style={{ 
                    fontSize: '14px', 
                    fontWeight: 'bold',
                    backgroundColor: 'rgba(255,255,255,0.3)',
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
          );
        })}
      </div>
      
      {/* Stage Change Confirmation Modal */}
      <Modal
        title="Confirm Stage Change"
        open={modalVisible}
        onOk={handleConfirmStageChange}
        onCancel={handleCancelModal}
        confirmLoading={isLoading}
        okText="Confirm"
        cancelText="Cancel"
        okType="primary"
        data-testid="stage-change-modal"
      >
        <p>
          Are you sure you want to change the opportunity stage to{' '}
          <strong>{selectedStage?.value}</strong>?
        </p>
        <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
          This action will update the opportunity's current stage and may trigger additional workflows.
        </p>
      </Modal>
    </div>
  );
}; 