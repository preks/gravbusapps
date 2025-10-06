import { useCallback, useEffect, useState } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

export interface SelectOption {
  id: string;
  label: string;
  value: string;
}

// Catalog identifiers for employee relationship types
const RELATIONSHIP_TYPE_CATALOG = 'RelationshipType';
const CATALOG_VERSION = 'v1';

export const useRelationshipTypes = (accessToken: string) => {
  const catalogClient = useCatalogManagerClient(accessToken);
  const [options, setOptions] = useState<SelectOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: RELATIONSHIP_TYPE_CATALOG, version: CATALOG_VERSION },
        { limit: 100, offset: 0, returnTotalRecords: true, includeChildCatalogEntries: false }
      );
      const entries = response.data || [];
      setOptions(entries.map((e: any) => ({ id: e.id, label: e.value || e.code || '—', value: e.id })));
    } catch (e: any) {
      setError(e?.message || 'Failed to load relationship types');
    } finally {
      setLoading(false);
    }
  }, [catalogClient]);

  useEffect(() => {
    if (accessToken) fetchOptions();
  }, [accessToken, fetchOptions]);

  return { options, loading, error, refetch: fetchOptions };
};


