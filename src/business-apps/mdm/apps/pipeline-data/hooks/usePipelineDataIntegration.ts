import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { CatalogEntry } from '@/common/types/CatalogTypes';
import { 
  PipelineDataIntegration, 
  EnhancedSalesPipeline, 
  EnhancedSalesPipelineStage,
  SalesPipeline,
  SalesPipelineStage,
  StageType,
  STAGE_TYPE_CONFIGS
} from '../types';
import { useSalesPipelines } from './useSalesPipelines';



export const usePipelineDataIntegration = (
  context: BusinessAppContextProps,
  options?: {
    limit?: number;
    autoFetch?: boolean;
  }
): PipelineDataIntegration & {
  refetch: () => Promise<void>;
} => {
  const [data, setData] = useState<PipelineDataIntegration>({
    pipelines: [],
    stages: [],
    isLoading: false,
    error: null,
  });

  const { fetchSalesPipelines } = useSalesPipelines(context);

  const transformPipelines = useCallback((
    pipelineEntries: CatalogEntry[],
    stageEntries: CatalogEntry[]
  ): EnhancedSalesPipeline[] => {
    console.log('Transforming pipelines:', pipelineEntries.length);
    console.log('Available stages for matching:', stageEntries.length);
    
    return pipelineEntries
      .filter((entry) => entry.id && entry.value)
      .map((entry) => {
        console.log(`Processing pipeline: ${entry.id} (${entry.value})`);
        
        // Get stages for this pipeline - try different matching strategies
        const pipelineStages = stageEntries
          .filter((stage) => {
            // Try exact match first
            if (stage.parentEntryId === entry.id) {
              return true;
            }
            // Try partial match if full ID format doesn't work
            const stageParentId = stage.parentEntryId || '';
            const pipelineId = entry.id;
            
            // Log mismatches for debugging
            if (stageParentId && !stageParentId.includes(pipelineId.split(':').pop() || '')) {
              console.log(`Stage ${stage.id} parent: "${stageParentId}" vs pipeline: "${pipelineId}"`);
            }
            
            return stageParentId === pipelineId;
          })
          .map((stage) => transformStage(stage, entry))
          .sort((a, b) => a.rank - b.rank);

        console.log(`Found ${pipelineStages.length} stages for pipeline ${entry.value}`);

        return {
          id: entry.id,
          code: entry.code,
          value: entry.value,
          objectValue: (entry.objectValue as Record<string, any>) || {},
          stages: pipelineStages,
          stageCount: pipelineStages.length,
          displayName: entry.value,
          description: entry.additionalValue1 || '', // Use additionalValue1 as description
          type: entry.type || 'CRM' // Default to CRM if no type is set
        };
      })
      .sort((a, b) => a.value.localeCompare(b.value));
  }, []);

  const transformStage = useCallback((
    stageEntry: CatalogEntry,
    pipeline?: CatalogEntry
  ): EnhancedSalesPipelineStage => {
    const stageType = (stageEntry.alternativeCode as StageType) || StageType.DISCOVERY;
    const stageConfig = STAGE_TYPE_CONFIGS[stageType] || STAGE_TYPE_CONFIGS[StageType.DISCOVERY];
    const rank = parseInt(stageEntry.additionalValue1 || '1', 10) || 1;

    console.log(`Transforming stage: ${stageEntry.id} - ${stageEntry.value} (type: ${stageType}, rank: ${rank})`);

    return {
      id: stageEntry.id,
      parentEntryId: stageEntry.parentEntryId || '',
      code: stageEntry.code || 'UNKNOWN',
      alternativeCode: stageType,
      value: stageEntry.value || 'Unnamed Stage',
      additionalValue1: stageEntry.additionalValue1 || '1',
      objectValue: (stageEntry.objectValue as Record<string, any>) || {},
      pipeline: pipeline ? {
        id: pipeline.id,
        code: pipeline.code,
        value: pipeline.value,
        objectValue: (pipeline.objectValue as Record<string, any>) || {}
      } : undefined,
      rank,
      stageTypeName: stageConfig.label,
      stageTypeColor: stageConfig.color,
      isFirst: rank === 1,
      isLast: false // Will be set after sorting all stages
    };
  }, []);

  const transformStages = useCallback((
    stageEntries: CatalogEntry[],
    pipelineEntries: CatalogEntry[]
  ): EnhancedSalesPipelineStage[] => {
    // Create a map of pipelines for quick lookup
    const pipelineMap = new Map(
      pipelineEntries.map(p => [p.id, p])
    );

    const transformedStages = stageEntries
      .filter((entry) => entry.id && entry.value)
      .map((entry) => {
        const pipeline = pipelineMap.get(entry.parentEntryId || '');
        return transformStage(entry, pipeline);
      });

    // Group by pipeline to determine isLast
    const stagesByPipeline = new Map<string, EnhancedSalesPipelineStage[]>();
    transformedStages.forEach(stage => {
      const pipelineId = stage.parentEntryId;
      if (!stagesByPipeline.has(pipelineId)) {
        stagesByPipeline.set(pipelineId, []);
      }
      stagesByPipeline.get(pipelineId)!.push(stage);
    });

    // Sort stages within each pipeline and mark last stage
    stagesByPipeline.forEach((stages) => {
      stages.sort((a, b) => a.rank - b.rank);
      if (stages.length > 0) {
        stages[stages.length - 1].isLast = true;
      }
    });

    return transformedStages.sort((a, b) => {
      // Sort by pipeline name, then by rank
      const pipelineCompare = (a.pipeline?.value || '').localeCompare(b.pipeline?.value || '');
      if (pipelineCompare !== 0) return pipelineCompare;
      return a.rank - b.rank;
    });
  }, [transformStage]);

  const fetchData = useCallback(async () => {
    if (!context.accessToken) {
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: 'No access token available. Please ensure you are authenticated.',
      }));
      return;
    }

    setData((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      console.log('Fetching pipeline data with token:', context.accessToken.substring(0, 20) + '...');

      // Only fetch pipelines for the overview - stages are loaded on-demand
      const pipelinesResult = await fetchSalesPipelines({
        limit: options?.limit || 100,
        offset: 0,
      });

      console.log('Raw pipelines result:', pipelinesResult);
      console.log('Found pipelines:', pipelinesResult.data?.length || 0);

      // Transform pipelines without stages (they'll be loaded on-demand in the modal)
      const transformedPipelines = pipelinesResult.data
        .filter((entry) => entry.id && entry.value)
        .map((entry) => {
          return {
            id: entry.id,
            code: entry.code,
            value: entry.value,
            objectValue: (entry.objectValue as Record<string, any>) || {},
            stages: [], // Empty array - stages loaded on-demand
            stageCount: 0, // Will be calculated when stages are loaded
            displayName: entry.value,
            description: entry.additionalValue1 || '', // Use additionalValue1 as description
            type: entry.type || 'CRM' // Default to CRM if no type is set
          };
        })
        .sort((a, b) => a.value.localeCompare(b.value));

      console.log('Transformed pipelines:', transformedPipelines);

      setData({
        pipelines: transformedPipelines,
        stages: [], // Empty array for overview
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching pipeline data:', error);
      setData((prev) => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }));
    }
  }, [
    context.accessToken,
    options?.limit,
    fetchSalesPipelines,
  ]);

  const refetch = useCallback(async () => {
    await fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (context.accessToken && (options?.autoFetch !== false)) {
      fetchData();
    }
  }, [context.accessToken, fetchData, options?.autoFetch]);

  return {
    ...data,
    refetch,
  };
}; 