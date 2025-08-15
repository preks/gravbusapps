import { useState, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { ReferenceData } from '../types';

export const useSalesPipelineStages = (salesPipelineRef: string | undefined, accessToken: string) => {
  const [pipelineStages, setPipelineStages] = useState<ReferenceData[]>([]);
  const [loadingPipelineStages, setLoadingPipelineStages] = useState(false);
  const [errorPipelineStages, setErrorPipelineStages] = useState<string | null>(null);

  const graphQLClient = useGraphQLClient(accessToken);

  const fetchPipelineStages = async (pipelineRef: string) => {
    try {
      setLoadingPipelineStages(true);
      setErrorPipelineStages(null);

      const GET_PIPELINE_STAGES = `
        query GetPipelineStages($pipelineRef: String!) {
          stages: CatalogEntry(
            where: {
              catalog: { identifier: { _eq: "SalesPipelineStage" } }
              parentEntryId: { _eq: $pipelineRef }
            }
            orderBy: { additionalValue1: ASC }
          ) {
            id
            code
            value
            alternativeCode
            additionalValue1
            parentEntryId
          }
        }
      `;
      
      const result = await graphQLClient.request<{
        stages: any[];
      }>(GET_PIPELINE_STAGES, { pipelineRef });
      
      if (result && result.stages) {
        const stageData = result.stages.map((entry: any) => ({
          id: entry.id,
          code: entry.code,
          value: entry.value,
          alternativeCode: entry.alternativeCode,
          additionalValue1: entry.additionalValue1,
        }));
        
        // Sort by additionalValue1 in ascending order (1, 2, 3, etc.) for left-to-right display
        const sortedStages = stageData.sort((a, b) => {
          const aOrder = parseInt(a.additionalValue1 || '999');
          const bOrder = parseInt(b.additionalValue1 || '999');
          return aOrder - bOrder;
        });
        
        setPipelineStages(sortedStages);
      } else {
        setPipelineStages([]);
      }
    } catch (err) {
      console.error('Error fetching pipeline stages:', err);
      setErrorPipelineStages(err instanceof Error ? err.message : 'Failed to fetch pipeline stages');
      setPipelineStages([]);
    } finally {
      setLoadingPipelineStages(false);
    }
  };

  useEffect(() => {
    if (salesPipelineRef && accessToken) {
      fetchPipelineStages(salesPipelineRef);
    } else {
      setPipelineStages([]);
    }
  }, [salesPipelineRef, accessToken]);

  return {
    pipelineStages,
    loadingPipelineStages,
    errorPipelineStages,
    refetchPipelineStages: () => {
      if (salesPipelineRef) {
        fetchPipelineStages(salesPipelineRef);
      }
    }
  };
}; 