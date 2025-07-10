import { useCallback } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { CatalogEntry } from '@/common/types/CatalogTypes';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { SalesPipelineData } from '../types';

export const SALES_PIPELINE_CATALOG = 'SalesPipeline';
export const SALES_PIPELINE_VERSION = 'v1';

export const useSalesPipelines = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken);

  const fetchSalesPipelines = useCallback(async (params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<SalesPipelineData> => {
    const response = await catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: SALES_PIPELINE_CATALOG,
        version: SALES_PIPELINE_VERSION
      },
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: false, // We don't need stages here
        ...(params?.search && { searchCriteria: params.search })
      }
    );

    return response;
  }, [catalogClient]);

  const fetchSalesPipelineById = useCallback(async (
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
    fetchSalesPipelines,
    fetchSalesPipelineById
  };
}; 