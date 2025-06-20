import { useState, useEffect } from 'react';
import { useCatalogManagerClient } from '../../../../../common/network/catalogs/useCatalogManagerClient';
import { CatalogEntry } from '../../../../../common/types/CatalogTypes';

// We'll use CatalogEntry directly from CatalogTypes
export type ReferenceData = CatalogEntry;

interface UseLeadCatalogsResult {
  leadSources: ReferenceData[];
  leadStatuses: ReferenceData[];
  leadRatings: ReferenceData[];
  loading: boolean;
  error: Error | null;
}

export function useLeadCatalogs(accessToken: string): UseLeadCatalogsResult {
  const [leadSources, setLeadSources] = useState<ReferenceData[]>([]);
  const [leadStatuses, setLeadStatuses] = useState<ReferenceData[]>([]);
  const [leadRatings, setLeadRatings] = useState<ReferenceData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Get catalog manager client
  const catalogClient = useCatalogManagerClient(accessToken);

  // Function to fetch catalog data
  useEffect(() => {
    const fetchCatalogs = async () => {
      if (!accessToken) {
        console.warn('No access token available, skipping catalog fetch');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Fetch lead sources
        const sourcesResponse = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'SalesLeadSource', version: 'v1' }
        );
        if (sourcesResponse && Array.isArray(sourcesResponse.data)) {
          setLeadSources(sourcesResponse.data);
        }

        // Fetch lead statuses
        const statusesResponse = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'SalesLeadStatus', version: 'v1' }
        );
        console.log(statusesResponse)
        if (statusesResponse && Array.isArray(statusesResponse.data)) {
          setLeadStatuses(statusesResponse.data);
        }
        
        // Fetch lead ratings
        const ratingsResponse = await catalogClient.getCatalogEntriesList(
          { catalogIdentifier: 'SalesLeadRating', version: 'v1' }
        );
        if (ratingsResponse && Array.isArray(ratingsResponse.data)) {
          setLeadRatings(ratingsResponse.data);
        }
      } catch (err) {
        console.error('Error fetching lead catalogs:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch lead catalogs'));
      } finally {
        setLoading(false);
      }
    };

    fetchCatalogs();
  }, [catalogClient, accessToken]);

  return {
    leadSources,
    leadStatuses,
    leadRatings,
    loading,
    error
  };
}
