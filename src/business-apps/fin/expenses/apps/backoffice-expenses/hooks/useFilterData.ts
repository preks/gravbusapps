/**
 * Hook for fetching filter data (organizational units and currencies)
 */

import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";

import {
  GET_ORGANIZATIONAL_UNITS,
  GET_EXPENSE_CURRENCIES,
} from "../queries/filterData.queries";

// ⚡ SECURITY: Hash function for sensitive data in cache keys
const createHash = (input: string): string => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

export interface OrganizationalUnit {
  id: string;
  name: string;
  code?: string;
  description?: string;
  structureId?: string;
  displayName?: string;
  structureName?: string;
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
  mostUsedCurrency: string | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// ⚡ PERFORMANCE OPTIMIZATION: Add simple cache to prevent refetching
const FILTER_DATA_CACHE = new Map<string, { data: any; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useFilterData = ({
  accessToken,
}: Pick<BusinessAppContextProps, "accessToken">): UseFilterDataResult => {
  const [organizationalUnits, setOrganizationalUnits] = useState<
    OrganizationalUnit[]
  >([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [mostUsedCurrency, setMostUsedCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const client = useGraphqlClient(accessToken);

  const fetchFilterData = useCallback(async () => {
    if (!accessToken || !client) {
      setError(new Error("Access token and GraphQL client are required."));
      setLoading(false);
      return;
    }

    // ⚡ SECURITY: Use hashed access token for cache key
    const cacheKey = `filter_data_${createHash(accessToken)}`;
    const cached = FILTER_DATA_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setOrganizationalUnits(cached.data.orgUnits);
      setCurrencies(cached.data.currencies);
      setMostUsedCurrency(cached.data.mostUsedCurrency);
      setLoading(false);
      return;
    }

    // Clear cache for debugging
    FILTER_DATA_CACHE.delete(cacheKey);

    setLoading(true);
    setError(null);

    try {
      // Execute queries in parallel
      const [orgUnitsResponse, currenciesResponse] = await Promise.all([
        client.request(GET_ORGANIZATIONAL_UNITS, {}),
        client.request(GET_EXPENSE_CURRENCIES, {}),
      ]);

      // Process organizational units from expense requests
      const allOrgUnits = new Map<string, any>();

      console.log("Processing organizational units from expense requests...");
      console.log(
        "Total expense requests:",
        orgUnitsResponse?.ExpenseRequest?.length || 0
      );

      if (orgUnitsResponse?.ExpenseRequest) {
        orgUnitsResponse.ExpenseRequest.forEach((item: any, index: number) => {
          console.log(`Request ${index}:`, {
            hasEmployeePosition: !!item.employeePosition,
            hasOrgUnit: !!item.employeePosition?.organizationalUnit,
            orgUnit: item.employeePosition?.organizationalUnit,
          });

          const orgUnit = item.employeePosition?.organizationalUnit;
          if (orgUnit && orgUnit.id) {
            allOrgUnits.set(orgUnit.id, {
              ...orgUnit,
              displayName: orgUnit.name,
              structureName: "Unknown Structure", // Default since no structure field
            });
          }
        });
      }

      console.log("Found unique organizational units:", allOrgUnits.size);
      console.log(
        "Organizational units:",
        Array.from(allOrgUnits.values()).map((ou) => ({
          id: ou.id,
          name: ou.name,
        }))
      );

      // Convert to array and sort by name
      const orgUnits = Array.from(allOrgUnits.values()).sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      setOrganizationalUnits(orgUnits);

      // Process currencies from expense requests
      const allCurrencies = new Map<string, Currency>();
      const currencyCounts = new Map<string, number>();

      if (currenciesResponse?.ExpenseRequest) {
        currenciesResponse.ExpenseRequest.forEach((item: any) => {
          if (item.currency && item.currencyRef) {
            const currencyCode =
              item.currency.code || item.currencyRef.split(":").pop();
            allCurrencies.set(item.currencyRef, {
              code: currencyCode,
              value: item.currency.value || currencyCode,
              currencyRef: item.currencyRef,
            });

            // Count currency usage
            const count = currencyCounts.get(item.currencyRef) || 0;
            currencyCounts.set(item.currencyRef, count + 1);
          }
        });
      }

      // Convert to array and sort by code
      const uniqueCurrencies = Array.from(allCurrencies.values()).sort((a, b) =>
        a.code.localeCompare(b.code)
      );

      // If no currencies found, provide some defaults
      const finalCurrencies =
        uniqueCurrencies.length > 0
          ? uniqueCurrencies
          : [
              { code: "EUR", value: "Euro", currencyRef: "Currency:v1:EUR" },
              {
                code: "USD",
                value: "US Dollar",
                currencyRef: "Currency:v1:USD",
              },
              {
                code: "GBP",
                value: "British Pound",
                currencyRef: "Currency:v1:GBP",
              },
            ];

      setCurrencies(finalCurrencies);

      // Find most used currency
      let maxCount = 0;
      let mostUsed = null;
      currencyCounts.forEach((count, currencyRef) => {
        if (count > maxCount) {
          maxCount = count;
          mostUsed = currencyRef;
        }
      });

      // If no most used currency found, default to EUR
      if (!mostUsed) {
        mostUsed = "Currency:v1:EUR";
      }

      setMostUsedCurrency(mostUsed);

      // ⚡ Store in cache
      FILTER_DATA_CACHE.set(cacheKey, {
        data: {
          orgUnits,
          currencies: finalCurrencies,
          mostUsedCurrency: mostUsed,
        },
        timestamp: Date.now(),
      });
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to fetch filter data")
      );
    } finally {
      setLoading(false);
    }
  }, [accessToken, client]);

  useEffect(() => {
    fetchFilterData();
  }, [fetchFilterData]);

  return {
    organizationalUnits,
    currencies,
    mostUsedCurrency,
    loading,
    error,
    refetch: fetchFilterData,
  };
};

export default useFilterData;
