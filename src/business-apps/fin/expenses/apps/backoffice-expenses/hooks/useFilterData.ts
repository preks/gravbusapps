/**
 * Hook for fetching filter data (organizational units and currencies)
 */

import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';

import { GET_ORGANIZATIONAL_UNITS, GET_EXPENSE_CURRENCIES } from '../queries/filterData.queries';

// ⚡ SECURITY: Hash function for sensitive data in cache keys
const createHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

export interface OrganizationalUnit {
  id: string;
  name: string;
  code: string;
  description?: string;
  structureId?: string;
  displayName?: string;
  structureName?: string;
  structure?: {
    id: string;
    name: string;
    description?: string;
  };
  company?: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface Currency {
  code: string;
  value: string;
  currencyRef: string;
}

interface UseFilterDataResult {
  organizationalUnits: OrganizationalUnit[];
  currencies: Currency[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ⚡ PERFORMANCE OPTIMIZATION: Add simple cache to prevent refetching
const FILTER_DATA_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useFilterData = ({ accessToken }: Pick<BusinessAppContextProps, 'accessToken'>): UseFilterDataResult => {
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const client = useGraphqlClient(accessToken);

  const fetchFilterData = useCallback(async () => {
    if (!accessToken || !client) {
      setError(new Error('Access token and GraphQL client are required.'));
      setLoading(false);
      return;
    }

    // ⚡ SECURITY: Use hashed access token for cache key
    const cacheKey = `filter_data_${createHash(accessToken)}`;
    const cached = FILTER_DATA_CACHE.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      setOrganizationalUnits(cached.data.orgUnits);
      setCurrencies(cached.data.currencies);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Execute queries in parallel
      const [orgUnitsResponse, currenciesResponse] = await Promise.all([
        client.request(GET_ORGANIZATIONAL_UNITS, {}),
        client.request(GET_EXPENSE_CURRENCIES, {}),
      ]);

      // Process organizational units with improved display
      const orgUnits = (orgUnitsResponse?.OrganizationalUnit || []).map((unit: any) => ({
        ...unit,
        displayName: unit.structure?.name 
          ? `${unit.name} (${unit.structure.name})`
          : unit.name,
        structureName: unit.structure?.name || 'Unknown Structure'
      }));
      setOrganizationalUnits(orgUnits);

      // Process currencies - combine and deduplicate from both expense requests and plans
      const allCurrencies = new Map<string, Currency>();
      
      // Add currencies from expense requests
      if (currenciesResponse?.expenseRequestCurrencies) {
        currenciesResponse.expenseRequestCurrencies.forEach((item: any) => {
          if (item.currency && item.currencyRef) {
            const currencyCode = item.currency.code || item.currencyRef.split(':').pop();
            allCurrencies.set(item.currencyRef, {
              code: currencyCode,
              value: item.currency.value || currencyCode,
              currencyRef: item.currencyRef,
            });
          }
        });
      }

      // Add currencies from expense plans
      if (currenciesResponse?.expensePlanCurrencies) {
        currenciesResponse.expensePlanCurrencies.forEach((item: any) => {
          if (item.currency && item.currencyRef) {
            const currencyCode = item.currency.code || item.currencyRef.split(':').pop();
            allCurrencies.set(item.currencyRef, {
              code: currencyCode,
              value: item.currency.value || currencyCode,
              currencyRef: item.currencyRef,
            });
          }
        });
      }

      // Add currencies from advance payments
      if (currenciesResponse?.advancePaymentCurrencies) {
        currenciesResponse.advancePaymentCurrencies.forEach((item: any) => {
          if (item.currency && item.currencyRef) {
            const currencyCode = item.currency.code || item.currencyRef.split(':').pop();
            allCurrencies.set(item.currencyRef, {
              code: currencyCode,
              value: item.currency.value || currencyCode,
              currencyRef: item.currencyRef,
            });
          }
        });
      }

      // Convert to array and sort by code
      const uniqueCurrencies = Array.from(allCurrencies.values()).sort((a, b) => 
        a.code.localeCompare(b.code)
      );
      
      setCurrencies(uniqueCurrencies);
      
      // ⚡ Store in cache
      FILTER_DATA_CACHE.set(cacheKey, {
        data: { orgUnits, currencies: uniqueCurrencies },
        timestamp: Date.now()
      });
    } catch (err) {
      console.error('Error fetching filter data:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch filter data'));
    } finally {
      setLoading(false);
    }
  }, [accessToken, client]);

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  return { organizationalUnits, currencies, loading, error, refetch: fetchFilterData };
};

export default useFilterData;
