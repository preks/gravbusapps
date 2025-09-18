import { useState, useEffect } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface ServiceDeskCatalogEntry {
  id: string;
  code: string;
  value: string | null;
  additionalValue1: string | null; // Display order
  additionalValue2: string | null; // Manager role
  additionalValue3: string | null; // Department data
  isDeleted: boolean;
}

export interface ServiceDeskCatalog {
  id: string;
  name: string;
  identifier: string;
  description: string | null;
  catalogEntries: ServiceDeskCatalogEntry[];
}

interface UseServiceDeskCatalogProps {
  accessToken: string;
  userInfo: any;
}

interface UseServiceDeskCatalogResult {
  catalog: ServiceDeskCatalog | null;
  catalogEntries: ServiceDeskCatalogEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const GET_SERVICE_DESK_CATALOG = `
  query GetServiceDeskCatalog {
    Catalog(where: {identifier: {_eq: "ServiceDeskCatalog"}}) {
      id
      name
      identifier
      description
      catalogEntries(where: {isDeleted: {_eq: false}}) {
        id
        code
        value
        additionalValue1
        additionalValue2
        additionalValue3
        isDeleted
      }
    }
  }
`;

export const useServiceDeskCatalog = ({ 
  accessToken, 
  userInfo 
}: UseServiceDeskCatalogProps): UseServiceDeskCatalogResult => {
  const [catalog, setCatalog] = useState<ServiceDeskCatalog | null>(null);
  const [catalogEntries, setCatalogEntries] = useState<ServiceDeskCatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphqlClient(accessToken);

  const fetchCatalog = async () => {
    if (!accessToken || !userInfo) {
      setError('Missing access token or user info');
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await graphqlClient.request<{ Catalog: ServiceDeskCatalog[] }>(
        GET_SERVICE_DESK_CATALOG
      );

      const catalogs = response?.Catalog || [];
      if (catalogs.length > 0) {
        const serviceDeskCatalog = catalogs[0];
        setCatalog(serviceDeskCatalog);
        
        // Sort catalog entries by additionalValue1 (display order) then by code
        const sortedEntries = (serviceDeskCatalog.catalogEntries || []).sort((a, b) => {
          // Parse additionalValue1 as numbers for proper sorting
          const orderA = a.additionalValue1 ? parseInt(a.additionalValue1, 10) : 999;
          const orderB = b.additionalValue1 ? parseInt(b.additionalValue1, 10) : 999;
          
          if (orderA !== orderB) {
            return orderA - orderB;
          }
          
          // If order is the same, sort by code alphabetically
          return a.code.localeCompare(b.code);
        });
        
        // Add special "Under desk" entry for uncategorized tasks
        const entriesWithUnderDesk = [
          ...sortedEntries,
          {
            id: 'under-desk-special',
            code: 'Under desk',
            value: 'Under desk',
            additionalValue1: '999', // Show last
            additionalValue2: null,
            additionalValue3: null,
            isDeleted: false,
          } as ServiceDeskCatalogEntry
        ];
        
        setCatalogEntries(entriesWithUnderDesk);
      } else {
        setCatalog(null);
        setCatalogEntries([]);
      }
    } catch (err) {
      console.error('Failed to fetch Service Desk Catalog:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setCatalog(null);
      setCatalogEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [accessToken, userInfo]);

  const refetch = () => {
    fetchCatalog();
  };

  return {
    catalog,
    catalogEntries,
    isLoading,
    error,
    refetch
  };
};
