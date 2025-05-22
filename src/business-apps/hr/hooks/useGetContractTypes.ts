"use client";

import { useEffect, useState } from 'react';
import { useUserLocale } from '@/hooks/useUserLocale';
import { useGetCatalogEntriesList } from '@/services/catalog-management';

export interface ContractTypeOption {
  id: string;
  name: string;
}

/**
 * Custom hook to fetch contract types with a search filter and pagination (limit 5).
 * Uses the catalog-management API utilities for consistency and CORS compliance.
 * @param searchRegex Search regex string for filtering contract types.
 * @param offset Pagination offset
 */
export function useGetContractTypes(searchRegex: string, offset: number = 0) {
  const userLocale = useUserLocale().get() ?? 'en-US';
  const [types, setTypes] = useState<ContractTypeOption[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { trigger, data, isMutating } = useGetCatalogEntriesList();

  useEffect(() => {
    setError(null);
    trigger({
      pathParams: {
        catalogIdentifier: 'ContractType',
        version: 'v1',
      },
      queryParams: {
        limit: 5,
        offset,
        returnTotalRecords: true,
        localeCode: userLocale,
        ...(searchRegex ? { searchCriteria: searchRegex } : {}),
      },
    })
      .then((response: any) => {
        const entries = Array.isArray(response?.data?.data)
          ? response.data.data
          : [];
        const typesArr: ContractTypeOption[] = entries.map((entry: any) => ({
          id: entry.id ?? '',
          name: entry.value ?? '',
        }));
        setTypes(typesArr);
        setHasMore(typesArr.length === 5);
      })
      .catch((err: any) => {
        setError(err);
        setTypes([]);
        setHasMore(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchRegex, offset, userLocale]);

  return { types, loading: isMutating, error, hasMore };
}
