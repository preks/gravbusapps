import { useState, useEffect } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

export const SALES_TASK_PRIORITY_CATALOG = 'SalesTaskPriority';
export const SALES_TASK_PRIORITY_VERSION = 'v1';

export interface UseSalesTaskPrioritiesParams {
  search?: string;
  limit?: number;
  offset?: number;
}

export const useSalesTaskPriorities = (accessToken: string, params?: UseSalesTaskPrioritiesParams) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>(null);
  const catalogClient = useCatalogManagerClient(accessToken);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: SALES_TASK_PRIORITY_CATALOG,
        version: SALES_TASK_PRIORITY_VERSION,
      },
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: true,
        ...(params?.search && { searchCriteria: params.search }),
      }
    )
      .then((response: any) => {
        if (isMounted) setData(response?.data || []);
      })
      .catch((err: any) => {
        if (isMounted) setError(err);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, [accessToken, params?.search, params?.limit, params?.offset]);

  return { data, loading, error };
}; 