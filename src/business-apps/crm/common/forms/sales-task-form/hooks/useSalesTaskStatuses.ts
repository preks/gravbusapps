import { useState, useEffect, useCallback } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { SelectOption } from '../types';

interface UseSalesTaskStatusesProps {
  accessToken: string;
}

interface UseSalesTaskStatusesReturn {
  statuses: SelectOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useSalesTaskStatuses = ({ 
  accessToken 
}: UseSalesTaskStatusesProps): UseSalesTaskStatusesReturn => {
  const [statuses, setStatuses] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchStatuses = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: 'SalesTaskStatus',
          version: 'v1'
        },
        {
          limit: 100,
          offset: 0,
          returnTotalRecords: true,
          includeChildCatalogEntries: true
        }
      );

      if (response?.data) {
        const statusOptions = response.data.map((entry: any) => ({
          id: entry.id,
          value: entry.id, // Use the full ID like "SalesTaskStatus:v1:OPEN"
          label: entry.value || entry.code || 'Unknown Status',
          name: entry.value || entry.code || 'Unknown Status'
        }));
        setStatuses(statusOptions);
      } else {
        setStatuses([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch task statuses';
      setError(errorMessage);
      console.error('Error fetching task statuses:', err);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, catalogClient]);

  const refetch = useCallback(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  useEffect(() => {
    fetchStatuses();
  }, [fetchStatuses]);

  return {
    statuses,
    isLoading,
    error,
    refetch
  };
}; 