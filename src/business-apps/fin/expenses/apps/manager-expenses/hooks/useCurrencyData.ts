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
  
  // Function to process currency data from API response
  const processCurrencyData = useCallback((response: any) => {
    // Extract currency codes from all entities and count occurrences
    const currencyMap = new Map<string, number>();
    
    // Process expense items
    if (response?.expenseItems) {
      response.expenseItems.forEach((item: any) => {
        const code = extractCurrencyCode(item.currencyRef);
        if (code) {
          currencyMap.set(code, (currencyMap.get(code) || 0) + 1);
        }
      });
    }
    
    // Process expense requests
    if (response?.expenseRequests) {
      response.expenseRequests.forEach((item: any) => {
        const code = extractCurrencyCode(item.currencyRef);
        if (code) {
          currencyMap.set(code, (currencyMap.get(code) || 0) + 1);
        }
      });
    }
    
    // Process expense plans
    if (response?.expensePlans) {
      response.expensePlans.forEach((item: any) => {
        const code = extractCurrencyCode(item.currencyRef);
        if (code) {
          currencyMap.set(code, (currencyMap.get(code) || 0) + 1);
        }
      });
    }
    
    // Process advance payments
    if (response?.advancePayments) {
      response.advancePayments.forEach((item: any) => {
        const code = extractCurrencyCode(item.currencyRef);
        if (code) {
          currencyMap.set(code, (currencyMap.get(code) || 0) + 1);
        }
      });
    }
    
    // Convert to array of currency counts
    return Array.from(currencyMap.entries()).map(([currencyCode, count]) => ({
      currencyCode,
      count
    }));
  }, []);

  // Fetch currency data on component mount
  useEffect(() => {
    // Skip fetching if no access token or manager ID
    if (!accessToken || !managerId) {
      setIsLoading(false);
      return;
    }
    
    const fetchCurrencyData = async () => {
      try {
        // Fetch all currencies from different entities
        const response = await graphQLClient.request(GET_ALL_CURRENCIES, { managerId });
        
        // Process currency data from all entities
        const currencyCounts = processCurrencyData(response);
        
        // Sort currencies by frequency
        currencyCounts.sort((a, b) => b.count - a.count);
        
        // Extract unique currency codes
        const uniqueCurrencies = Array.from(new Set(
          currencyCounts.map(c => c.currencyCode)
        )).sort();
        
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
      } catch (error) {
        console.error('Error fetching currency data:', error);
        // Use fallback currencies on error
        const fallbackCurrencies = ['EUR', 'USD'];
        setLocalCurrencies(fallbackCurrencies);
        setStoreCurrencies(fallbackCurrencies);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only fetch if we haven't initialized yet
    // IMPORTANT: We removed the dependency on store values to prevent infinite loops
    if (!isInitialized) {
      fetchCurrencyData();
    } else {
      // If already initialized, just update local state from store
      // without triggering another fetch
      setLocalCurrencies(storeCurrencies);
      setLocalMostUsedCurrency(storeMostUsedCurrency);
      setIsLoading(false);
    }
  // Remove storeCurrencies and storeMostUsedCurrency from dependencies to prevent infinite loop
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, managerId, graphQLClient, isUserSelected, setPrimaryCurrency, setStoreCurrencies, setInitialized, processCurrencyData, isInitialized, setMostUsedCurrency]);
  
  // Default to most used currency, fallback to primary currency from store
  const defaultCurrency = useMemo(() => {
    return localMostUsedCurrency || storeMostUsedCurrency || primaryCurrency || 'USD';
  }, [localMostUsedCurrency, storeMostUsedCurrency, primaryCurrency]);
  
  // Combine all data for the component
  return {
    availableCurrencies: availableCurrencies.length > 0 ? availableCurrencies : storeCurrencies,
    isLoading,
    mostUsedCurrency: localMostUsedCurrency || storeMostUsedCurrency,
    defaultCurrency,
    standardizeCurrencyRef
  };
};
