import { useState, useEffect, useMemo } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_ALL_CURRENCIES } from '../queries/analytics';
import { useCurrencyStore } from '../store/useCurrencyStore';

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
 * Helper function to extract currency code from currency reference
 */
const extractCurrencyCode = (currencyRef: string): string | null => {
  if (!currencyRef) return null;
  
  const match = currencyRef.match(/Currency:v1:([A-Z]{3})/);
  return match ? match[1] : null;
};

/**
 * Hook to fetch available currencies and most used currency
 */
export const useCurrencyData = (accessToken: string, managerId: string) => {
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [mostUsedCurrency, setMostUsedCurrency] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  const graphQLClient = useGraphQLClient(accessToken);
  
  // Fetch all currency data in a single request
  useEffect(() => {
    const fetchCurrencyData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await graphQLClient.request(GET_ALL_CURRENCIES, {
          managerId
        });
        
        // Extract and combine all currency references
        const allCurrencyRefs = [
          ...(response?.expenseItems || []).map((item: any) => item.currencyRef),
          ...(response?.expenseRequests || []).map((item: any) => item.currencyRef),
          ...(response?.expensePlans || []).map((item: any) => item.currencyRef),
          ...(response?.advancePayments || []).map((item: any) => item.currencyRef)
        ].filter(Boolean);
        
        // Process for distinct currencies
        const uniqueCurrencyCodes = Array.from(new Set(allCurrencyRefs))
          .map(extractCurrencyCode)
          .filter(Boolean) as string[];
        
        setAvailableCurrencies(uniqueCurrencyCodes);
        
        // Process for most used currency
        const currencyCounts: Record<string, number> = {};
        
        allCurrencyRefs.forEach(currencyRef => {
          const currencyCode = extractCurrencyCode(currencyRef);
          if (currencyCode) {
            currencyCounts[currencyCode] = (currencyCounts[currencyCode] || 0) + 1;
          }
        });
        
        // Find the most used currency
        let highestCount = 0;
        let mostUsed = null;
        
        Object.entries(currencyCounts).forEach(([currency, count]) => {
          if (count > highestCount) {
            mostUsed = currency;
            highestCount = count;
          }
        });
        
        setMostUsedCurrency(mostUsed);
      } catch (err) {
        console.error('Error fetching currency data:', err);
        setError(err as Error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (accessToken && managerId) {
      fetchCurrencyData();
    }
  }, [accessToken, managerId, graphQLClient]);
  
  // Get primary currency from store as fallback
  const { primaryCurrency } = useCurrencyStore();
  
  // Default to most used currency, fallback to primary currency
  const defaultCurrency = useMemo(() => {
    return mostUsedCurrency || primaryCurrency || 'USD';
  }, [mostUsedCurrency, primaryCurrency]);
  
  return {
    availableCurrencies,
    mostUsedCurrency,
    defaultCurrency,
    isLoading,
    error,
    standardizeCurrencyRef
  };
};
