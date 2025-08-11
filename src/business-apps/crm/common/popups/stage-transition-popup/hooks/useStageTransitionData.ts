import { useState, useEffect, useCallback, useMemo } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { 
  OpportunityQueryResult, 
  SalesPipelineStageResult, 
  StageTransitionPopupValues 
} from '../types';

export interface UseStageTransitionDataReturn {
  opportunityData: OpportunityQueryResult | null;
  targetStageData: SalesPipelineStageResult | null;
  isLoading: boolean;
  error: string | null;
  mapToFormValues: (
    opportunity: OpportunityQueryResult, 
    targetStage: SalesPipelineStageResult
  ) => Partial<StageTransitionPopupValues>;
}

export const useStageTransitionData = (
  businessAppContext: BusinessAppContextProps
): UseStageTransitionDataReturn => {
  const [opportunityData, setOpportunityData] = useState<OpportunityQueryResult | null>(null);
  const [targetStageData, setTargetStageData] = useState<SalesPipelineStageResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(businessAppContext.accessToken);
  const catalogClient = useCatalogManagerClient(businessAppContext.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US';

  // Function to map opportunity and stage data to form values
  const mapToFormValues = useCallback((
    opportunity: OpportunityQueryResult, 
    targetStage: SalesPipelineStageResult
  ): Partial<StageTransitionPopupValues> => {
    return {
      opportunityId: opportunity.id,
      opportunityName: opportunity.name,
      sourceStageRef: opportunity.salesPipelineStageRef,
      sourceStage: opportunity.salesPipelineStage,
      targetStageRef: targetStage.id,
      targetStage: {
        id: targetStage.id,
        value: targetStage.value,
        code: targetStage.code,
      },
    };
  }, []);

  // Memoize the identifiers to prevent unnecessary re-renders
  const opportunityId = useMemo(() => {
    return businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId ||
           businessAppContext.additionalData?.opportunityId ||
           businessAppContext.additionalData?.id;
  }, [
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId,
    businessAppContext.additionalData?.opportunityId,
    businessAppContext.additionalData?.id
  ]);

  const targetStageRef = useMemo(() => {
    return businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.targetStageRef ||
           businessAppContext.additionalData?.targetStageRef;
  }, [
    businessAppContext.additionalData?.psi_taskPayload?.psi_initialParameters?.targetStageRef,
    businessAppContext.additionalData?.targetStageRef
  ]);

  // Load opportunity and stage data
  useEffect(() => {
    const loadData = async () => {
      if (!opportunityId || !targetStageRef) {
        setError('Missing required data: opportunityId or targetStageRef');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Load opportunity data
        const opportunityQuery = `
          query GetOpportunityForTransition($id: uuid!) {
            Opportunity(where: { id: {_eq: $id}, isDeleted: {_eq: false} }) {
              id
              name
              salesPipelineStageRef
              salesPipelineStage {
                id
                value
                code
              }
            }
          }
        `;

        const opportunityResult = await graphqlClient.request<{
          Opportunity: OpportunityQueryResult[];
        }>(opportunityQuery, { id: opportunityId });

        if (!opportunityResult?.Opportunity?.length) {
          throw new Error('Opportunity not found');
        }

        const opportunity = opportunityResult.Opportunity[0];
        setOpportunityData(opportunity);

        // Load target stage data from catalog
        const targetStageResponse = await catalogClient.getCatalogEntryById(
          targetStageRef,
          {
            params: {
              includeTranslations: true,
              localeCode: userLocale
            }
          }
        );

        if (!targetStageResponse) {
          throw new Error('Target stage not found');
        }

        setTargetStageData(targetStageResponse);

      } catch (err: any) {
        console.error('Error loading stage transition data:', err);
        setError(err?.message || 'Failed to load transition data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [opportunityId, targetStageRef, businessAppContext.accessToken, graphqlClient, catalogClient, userLocale]);

  return {
    opportunityData,
    targetStageData,
    isLoading,
    error,
    mapToFormValues,
  };
};
