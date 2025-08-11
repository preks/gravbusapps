import React, { useState } from 'react';
import { Modal, message } from 'antd';
import { ReferenceData } from '../types';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { StageProgression as GeneralStageProgression } from '@/components/stage-progression';
import type { Stage, StageCondition } from '@/components/stage-progression';

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

// Convert ReferenceData to Stage format
const convertToStageFormat = (referenceData: ReferenceData[]): Stage[] => {
  return referenceData.map(ref => ({
    id: ref.id,
    value: ref.value,
    code: ref.code
  }));
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

  const handleStageClick = async (stage: Stage) => {
    // Find the original ReferenceData for the stage
    const originalStage = stages.find(s => s.code === stage.code || s.value === stage.value);
    if (!originalStage) return;

    // Don't show modal if clicking on current stage
    if (stage.value.toLowerCase() === currentStage.toLowerCase()) {
      return;
    }
    
    setSelectedStage(originalStage);
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

  if (stages.length === 0) {
    return null;
  }

  return (
    <div style={{ marginBottom: '24px' }}>
      <GeneralStageProgression
        stages={convertToStageFormat(stages)}
        currentStage={currentStage}
        getStageConditions={(stageCode) => getStageConditionsFromReal(stageConditionStatuses, stageCode)}
        getStageCompletionPercentage={(stageCode) => getStageCompletionPercentage(stageConditionStatuses, stageCode)}
        onStageClick={handleStageClick}
        dataTestIdPrefix="opportunity-stage-progression"
      />
      
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
