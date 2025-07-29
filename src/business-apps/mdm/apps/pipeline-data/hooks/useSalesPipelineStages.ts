import { useCallback } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { CatalogEntry } from '@/common/types/CatalogTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { SalesPipelineStageData } from '../types';

export const SALES_PIPELINE_STAGE_CATALOG = 'SalesPipelineStage';
export const SALES_PIPELINE_STAGE_VERSION = 'v1';

export const useSalesPipelineStages = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken);

  const fetchSalesPipelineStages = useCallback(async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
    parentPipelineId?: string;
  }): Promise<SalesPipelineStageData> => {
    const response = await catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: SALES_PIPELINE_STAGE_CATALOG,
        version: SALES_PIPELINE_STAGE_VERSION
      },
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: true, // This is KEY for getting the stage data!
        ...(params?.search && { searchCriteria: params.search })
        // Note: parentEntryId filtering is done client-side since the API doesn't support it
      }
    );

    return response;
  }, [catalogClient]);

  const fetchSalesPipelineStagesByParent = useCallback(async (
    parentPipelineId: string,
    params?: {
      limit?: number;
      offset?: number;
      search?: string;
    }
  ): Promise<SalesPipelineStageData> => {
    return fetchSalesPipelineStages({
      ...params,
      parentPipelineId
    });
  }, [fetchSalesPipelineStages]);

  const fetchSalesPipelineStageById = useCallback(async (
    id: string, 
    includeTranslations = true
  ): Promise<CatalogEntry> => {
    const queryParams = new URLSearchParams({
      ...(includeTranslations && { includeTranslations: 'true' })
    });

    const response = await catalogClient.get<CatalogEntry>(
      `/../catalog-entries/${encodeURIComponent(id)}?${queryParams}`
    );

    return response;
  }, [catalogClient]);

  return {
    fetchSalesPipelineStages,
    fetchSalesPipelineStagesByParent,
    fetchSalesPipelineStageById
  };
}; 