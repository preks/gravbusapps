import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { extractCurrencyCode } from '../utils/currencyUtils';
import { useCurrencyStore } from '../store/useCurrencyStore';
import { GET_ALL_CURRENCIES } from '../queries/analytics';

/**
 * Helper function to standardize currency reference format
 */
const standardizeCurrencyRef = (currencyRef: string): string => {
  if (!currencyRef) return '';
  
  // If it's already in the format Currency:v1:CODE, return as is
  if (currencyRef.startsWith('Currency:v1:')) {
    return currencyRef;
  }
  
  // If it's just a currency code (e.g., USD, EUR), convert to standard format
  return `Currency:v1:${currencyRef}`;
};

/**
 * Hook to fetch available currencies and most used currency
 */
export const useCurrencyData = (accessToken: string, managerId: string) => {
  const [availableCurrencies, setLocalCurrencies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [localMostUsedCurrency, setLocalMostUsedCurrency] = useState<string | null>(null);
  
  // Access the global currency store
  const { 
    setAvailableCurrencies: setStoreCurrencies,
    availableCurrencies: storeCurrencies,
    primaryCurrency,
    setPrimaryCurrency,
    isUserSelected,
    setInitialized,
    setMostUsedCurrency,
    mostUsedCurrency: storeMostUsedCurrency,
    isInitialized
  } = useCurrencyStore();
  
  // GraphQL client for data fetching
  const graphQLClient = useGraphQLClient(accessToken);

  // Centralized fetch with error + loading handling
  const fetchCurrencyData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      // Fetch all currencies from different entities
      const response = await graphQLClient.request(GET_ALL_CURRENCIES, { managerId });
      // Process currency data from all entities
      const currencyCounts = processCurrencyData(response);
      // Sort currencies by frequency
      currencyCounts.sort((a, b) => b.count - a.count);
      // Extract unique currency codes
      const uniqueCurrencies = Array.from(
        new Set(currencyCounts.map((c) => c.currencyCode))
      ).sort();
      // Determine most used currency
      const mostUsed = currencyCounts.length > 0 ? currencyCounts[0].currencyCode : null;
      // Update local state
      setLocalCurrencies(uniqueCurrencies);
      setLocalMostUsedCurrency(mostUsed);
      // Update global store
      setStoreCurrencies(uniqueCurrencies);
      setMostUsedCurrency(mostUsed);
      // Update primary currency if user hasn't made a selection
      if (!isUserSelected && mostUsed) {
        setPrimaryCurrency(mostUsed);
      }
      // Mark as initialized in the store
      setInitialized(true);
    } catch (err) {
      console.error('Error fetching currency data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch currency data');
      setLocalCurrencies([]);
    } finally {
      setIsLoading(false);
    }
  }, [graphQLClient, managerId, setStoreCurrencies, setMostUsedCurrency, isUserSelected, setPrimaryCurrency, setInitialized, processCurrencyData]);
  
  // Function to process currency data from API response (regular function to avoid TDZ)
  function processCurrencyData(response: any) {
    const currencyMap = new Map<string, number>();

    if (response?.expenseItems) {
      response.expenseItems.forEach((item: any) => {
        const code = extractCurrencyCode(item.currencyRef);
        if (code) currencyMap.set(code, (currencyMap.get(code) || 0) + 1);
      });
    }

    if (response?.expenseRequests) {
      response.expenseRequests.forEach((item: any) => {
        const code = extractCurrencyCode(item.currencyRef);
        if (code) currencyMap.set(code, (currencyMap.get(code) || 0) + 1);
      });
    }

    if (response?.expensePlans) {
      response.expensePlans.forEach((item: any) => {
        const code = extractCurrencyCode(item.currencyRef);
        if (code) currencyMap.set(code, (currencyMap.get(code) || 0) + 1);
      });
    }

    if (response?.advancePayments) {
      response.advancePayments.forEach((item: any) => {
        const code = extractCurrencyCode(item.currencyRef);
        if (code) currencyMap.set(code, (currencyMap.get(code) || 0) + 1);
      });
    }

    return Array.from(currencyMap.entries()).map(([currencyCode, count]) => ({ currencyCode, count }));
  }

  // Fetch currency data on component mount
  useEffect(() => {
    if (!accessToken || !managerId) {
      setIsLoading(false);
      return;
    }
    if (!isInitialized) {
      fetchCurrencyData();
    } else {
      setLocalCurrencies(storeCurrencies);
      setLocalMostUsedCurrency(storeMostUsedCurrency);
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, managerId, fetchCurrencyData, isInitialized]);
  
  // Default to most used currency, fallback to primary currency from store
  const defaultCurrency = useMemo(() => {
    return localMostUsedCurrency || storeMostUsedCurrency || primaryCurrency || 'USD';
  }, [localMostUsedCurrency, storeMostUsedCurrency, primaryCurrency]);
  
  // Combine all data for the component
  return {
    availableCurrencies: availableCurrencies.length > 0 ? availableCurrencies : storeCurrencies,
    isLoading,
    error,
    mostUsedCurrency: localMostUsedCurrency || storeMostUsedCurrency,
    defaultCurrency,
    standardizeCurrencyRef,
    refetch: useCallback(() => fetchCurrencyData(), [fetchCurrencyData])
  };
};
