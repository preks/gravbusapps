import { useState } from 'react';
import { opportunityClient, OpportunityPayload } from '@/common/network/opportunity/OpportunityClient';
import { message } from 'antd';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export const useUpdateOpportunityStage = (accessToken: string) => {
  const [isLoading, setIsLoading] = useState(false);

  const updateStage = async (
    opportunityId: string, 
    version: number, 
    newStageRef: string,
    stageDisplayName: string,
    onSuccess?: () => void
  ) => {
    setIsLoading(true);
    try {
      // Build minimal payload for stage update
      const opportunityPayload: OpportunityPayload = {
        id: opportunityId,
        version: version,
        salesPipelineStageRef: newStageRef
      };

      await opportunityClient.saveOpportunity(
        opportunityPayload,
        accessToken,
        'UPDATE'
      );

      message.success(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.stageUpdateSuccess',
          `Opportunity stage updated to ${stageDisplayName} successfully`
        )
      );
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating opportunity stage:', error);
      message.error(
        getTranslationFromI18nKeyAndLabel(
          'crm:opportunity.stageUpdateError',
          `Failed to update opportunity stage to ${stageDisplayName}`
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  return {
    updateStage,
    isLoading
  };
}; 