/**
 * Cache-aware hook for ServiceDeskCatalog data
 * Uses ServiceDeskCatalogCacheProvider when available, falls back to direct API calls
 */

import { useState, useEffect } from 'react';
import { useServiceDeskCatalogCacheOptional } from '../services/catalog-cache/ServiceDeskCatalogCacheProvider';
import { ServiceDeskCatalog, ServiceDeskCatalogEntry } from '../services/catalog-cache/types';
import { env } from '@/common/env/EnvUtils';

export interface UseServiceDeskCatalogCacheProps {
  accessToken: string;
  userInfo: any;
  enabled?: boolean;
}

export interface UseServiceDeskCatalogCacheReturn {
  catalog: ServiceDeskCatalog | null;
  catalogEntries: ServiceDeskCatalogEntry[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useServiceDeskCatalogCache = ({
  accessToken,
  userInfo,
  enabled = true,
}: UseServiceDeskCatalogCacheProps): UseServiceDeskCatalogCacheReturn => {
  const [catalog, setCatalog] = useState<ServiceDeskCatalog | null>(null);
  const [catalogEntries, setCatalogEntries] = useState<ServiceDeskCatalogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Try to get cache from context
  const cacheContext = useServiceDeskCatalogCacheOptional();

  const fetchCatalog = async () => {
    if (!enabled || !accessToken || !userInfo) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (cacheContext?.isInitialized) {
        // Use cache when available
        console.log('[useServiceDeskCatalogCache] Using cached data');
        
        const [cachedCatalog, cachedEntries] = await Promise.all([
          cacheContext.cache.get(),
          cacheContext.cache.getCatalogEntries(),
        ]);

        setCatalog(cachedCatalog);
        setCatalogEntries(cachedEntries);
      } else {
        // Fallback to direct API call when cache is not available
        console.log('[useServiceDeskCatalogCache] Cache not available, using direct API call');
        
        const result = await fetchCatalogDirectly(accessToken);
        setCatalog(result.catalog);
        setCatalogEntries(result.catalogEntries);
      }
    } catch (err) {
      console.error('[useServiceDeskCatalogCache] Failed to fetch catalog:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch catalog');
      setCatalog(null);
      setCatalogEntries([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCatalog();
  }, [enabled, accessToken, userInfo, cacheContext?.isInitialized]);

  const refetch = () => {
    if (cacheContext?.isInitialized) {
      // Clear cache and refetch
      cacheContext.cache.clear();
    }
    fetchCatalog();
  };

  return {
    catalog,
    catalogEntries,
    isLoading,
    error,
    refetch,
  };
};

/**
 * Fallback function to fetch catalog directly when cache is not available
 * This maintains backward compatibility with the original useServiceDeskCatalog hook
 */
async function fetchCatalogDirectly(accessToken: string): Promise<{
  catalog: ServiceDeskCatalog | null;
  catalogEntries: ServiceDeskCatalogEntry[];
}> {
  let endpoint: string;
  try {
    endpoint = env('NEXT_PUBLIC_GRAPHQL_ENDPOINT_NEWWORK') || 'https://newwork-dev.newwork.com/v1/graphql';
  } catch (error) {
    console.warn('[useServiceDeskCatalogCache] Could not access environment variable, using default endpoint:', error);
    endpoint = 'https://newwork-dev.newwork.com/v1/graphql';
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

  // Use fetch directly to avoid dependency issues
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: GET_SERVICE_DESK_CATALOG,
    }),
  });

  if (!response.ok) {
    throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
  }

  const result: { data: { Catalog: ServiceDeskCatalog[] } } = await response.json();
  
  const catalogs = result.data?.Catalog || [];
  const catalog = catalogs.length > 0 ? catalogs[0] : null;

  let catalogEntries: ServiceDeskCatalogEntry[] = [];
  
  if (catalog?.catalogEntries) {
    // Sort catalog entries by additionalValue1 (display order) then by code
    const sortedEntries = catalog.catalogEntries.sort((a: ServiceDeskCatalogEntry, b: ServiceDeskCatalogEntry) => {
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
    catalogEntries = [
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
  }

  return { catalog, catalogEntries };
}
