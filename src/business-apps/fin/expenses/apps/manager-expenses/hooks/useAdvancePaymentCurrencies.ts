import { useState, useEffect, useMemo, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_DISTINCT_ADVANCE_PAYMENT_CURRENCIES } from '../queries/distinctCurrencies';
import { extractCurrencyCode } from '../utils/currencyUtils';
import { useCurrencyStore } from '../store/useCurrencyStore';

interface UseAdvancePaymentCurrenciesProps {
  accessToken: string;
  managerId: string;
}

interface UseAdvancePaymentCurrenciesReturn {
  availableCurrencies: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  isInitialized: boolean;
}

/**
 * Hook to fetch distinct currencies used in advance payments
 */
export const useAdvancePaymentCurrencies = ({ 
  accessToken, 
  managerId 
}: UseAdvancePaymentCurrenciesProps): UseAdvancePaymentCurrenciesReturn => {
  // Use the global currency store for centralized state management
  const { 
    availableCurrencies: storeCurrencies, 
    setAvailableCurrencies,
    isInitialized: storeInitialized,
    setInitialized,
    mostUsedCurrency
  } = useCurrencyStore();
  
  // Local state for component-specific data
  const [localCurrencies, setLocalCurrencies] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!storeInitialized); // Start with loading only if store is not initialized
  const [error, setError] = useState<Error | null>(null);
  const [localInitialized, setLocalInitialized] = useState<boolean>(false);
  
  const graphQLClient = useGraphQLClient(accessToken);
  
  // Function to fetch currencies from the API
  const fetchCurrencies = useCallback(async () => {
    if (!accessToken || !managerId) return;
    
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await graphQLClient.request(GET_DISTINCT_ADVANCE_PAYMENT_CURRENCIES, {
        managerId
      });
      
      // Extract currency codes from currency references and filter for distinct values
      const currencyCodes = (response?.AdvancePayment || [])
        .map((item: any) => extractCurrencyCode(item.currencyRef))
        .filter(Boolean) as string[];
      
      // Add default currencies if they don't exist in the data
      const defaultCurrencies = ['EUR', 'USD'];
      
      // Create a unique set of currency codes to handle the lack of distinct_on in GraphQL
      const uniqueCurrencies = Array.from(new Set([
        ...currencyCodes,
        ...defaultCurrencies
      ])).sort();
      
      // Log the currencies found for debugging
      console.log('Advance payment currencies fetched:', {
        fromAPI: currencyCodes,
        combined: uniqueCurrencies,
        storeInitialized
      });
      
      // Update both local state and global store
      setLocalCurrencies(uniqueCurrencies);
      setAvailableCurrencies(uniqueCurrencies);
      setLocalInitialized(true);
      setInitialized(true);
    } catch (err) {
      console.error('Error fetching advance payment currencies:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch advance payment currencies'));
      
      // Fallback to default currencies on error
      const fallbackCurrencies = ['EUR', 'USD'];
      setLocalCurrencies(fallbackCurrencies);
      setAvailableCurrencies(fallbackCurrencies);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, managerId, graphQLClient, setAvailableCurrencies, setInitialized, storeInitialized]);
  
  // Effect to fetch currencies on mount or when dependencies change
  useEffect(() => {
    // If the store is already initialized, use its data and skip fetching
    if (storeInitialized && storeCurrencies.length > 0) {
      setLocalCurrencies(storeCurrencies);
      setLocalInitialized(true);
      setIsLoading(false);
      return;
    }
    
    // Only fetch if we have credentials and haven't initialized yet
    if (accessToken && managerId && !localInitialized) {
      fetchCurrencies();
    } else if (!accessToken || !managerId) {
      // Reset loading state if we don't have required props
      setIsLoading(false);
    }
  }, [accessToken, managerId, localInitialized, fetchCurrencies, storeInitialized, storeCurrencies]);
  
  // Combine local currencies with store currencies for the most complete list
  const combinedCurrencies = useMemo(() => {
    // Combine all available currencies from both sources
    const allCurrencies = Array.from(new Set([
      ...localCurrencies,
      ...storeCurrencies,
      // Always include the most used currency if available
      ...(mostUsedCurrency ? [mostUsedCurrency] : []),
      // Always include these fallback currencies
      'EUR', 'USD'
    ])).sort();
    
    return allCurrencies;
  }, [localCurrencies, storeCurrencies, mostUsedCurrency]);
  
  return {
    availableCurrencies: combinedCurrencies,
    isLoading: isLoading && !storeInitialized, // Only show loading if both local and store are not ready
    error,
    refetch: fetchCurrencies,
    isInitialized: localInitialized || storeInitialized
  };
};
