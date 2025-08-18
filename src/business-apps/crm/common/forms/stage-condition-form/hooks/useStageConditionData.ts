import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { StageConditionFormValues } from '../types';

interface UseStageConditionDataProps {
  businessAppContext: BusinessAppContextProps;
}

interface StageConditionQueryResult {
  id: string;
  completed: boolean;
  version: number;
  salesPipelineStageCondition?: {
    id: string;
    value: string;
    code: string;
  };
  configSnapshot?: any;
}

interface UseStageConditionDataReturn {
  stageConditionData: StageConditionQueryResult | null;
  isLoading: boolean;
  error: string | null;
  mapStageConditionToFormValues: (condition: StageConditionQueryResult) => Partial<StageConditionFormValues>;
}

export const useStageConditionData = ({ businessAppContext }: UseStageConditionDataProps): UseStageConditionDataReturn => {
  const [stageConditionData, setStageConditionData] = useState<StageConditionQueryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const graphqlClient = useGraphQLClient(businessAppContext.accessToken);

  // Function to map stage condition data to form values
  const mapStageConditionToFormValues = useCallback((condition: StageConditionQueryResult): Partial<StageConditionFormValues> => {
    return {
      id: condition.id,
      version: condition.version,
      completed: condition.completed || false,
      conditionTitle: condition.salesPipelineStageCondition?.value || 'Unknown Condition',
      currentStatus: condition.completed ? 'Completed' : 'Pending',
    };
  }, []);

  // Load stage condition data when stageConditionStatusId is provided in additionalData
  useEffect(() => {
    const loadStageConditionData = async () => {
      // Extract stage condition status ID from the correct path in process payload
      const stageConditionStatusId = 
        businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.stageConditionStatusId ||
        businessAppContext.additionalData?.stageConditionStatusId ||
        businessAppContext.additionalData?.id;
      
      if (!stageConditionStatusId || !businessAppContext.accessToken) {
        setError('No stage condition status ID provided in process payload');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const query = `
          query GetStageConditionStatus($id: uuid!) {
            OpportunityStageConditionStatusByPk(id: $id) {
              id
              completed
              version
              salesPipelineStageCondition {
                id
                value
                code
              }
              configSnapshot
            }
          }
        `;

        const response = await graphqlClient.request(query, {
          id: stageConditionStatusId
        });

        if (response?.OpportunityStageConditionStatusByPk) {
          const conditionData = response.OpportunityStageConditionStatusByPk;
          setStageConditionData(conditionData);
        } else {
          setError('Stage condition not found');
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load stage condition data';
        setError(errorMessage);
        console.error('❌ useStageConditionData - Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadStageConditionData();
  }, [
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.stageConditionStatusId,
    businessAppContext.additionalData?.stageConditionStatusId,
    businessAppContext.additionalData?.id,
    businessAppContext.accessToken,
    graphqlClient
  ]);

  return {
    stageConditionData,
    isLoading,
    error,
    mapStageConditionToFormValues,
  };
};
