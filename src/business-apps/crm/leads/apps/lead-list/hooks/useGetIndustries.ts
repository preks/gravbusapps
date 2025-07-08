"use client";

import { useState, useEffect, useCallback } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';

export interface IndustryOption {
  id: string;
  name: string;
}

export interface UseGetIndustriesReturn {
  industryOptions: IndustryOption[];
  isLoading: boolean;
  error: string | null;
}

export const useGetIndustries = (context: BusinessAppContextProps, searchRegex: string = '', offset: number = 0): UseGetIndustriesReturn => {
  const [industryOptions, setIndustryOptions] = useState<IndustryOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US';

  const loadIndustries = useCallback(async () => {
    if (!context.accessToken) {
      console.log('No access token available, skipping industry fetch');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Fetching IndustryClass catalog...');
      const response = await catalogClient.getCatalogEntriesList({
        catalogIdentifier: 'IndustryClass',
        version: 'v1'
      }, {
        limit: 5,
        offset,
        returnTotalRecords: true,
        localeCode: userLocale,
        ...(searchRegex ? { searchCriteria: searchRegex } : {})
      });
      
      console.log('IndustryClass response:', response);
      
      if (response?.data) {
        console.log('IndustryClass entries:', response.data);
        
        const processedOptions = response.data.map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || entry.id
        }));
        
        console.log('IndustryClass processed:', processedOptions);
        setIndustryOptions(processedOptions);
      } else {
        console.log('No IndustryClass data received');
        setIndustryOptions([]);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load industries';
      setError(errorMessage);
      console.error('Error loading industries:', err);
      setIndustryOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [catalogClient, context.accessToken, searchRegex, offset, userLocale]);

  useEffect(() => {
    loadIndustries();
  }, [loadIndustries]);

  return {
    industryOptions,
    isLoading,
    error
  };
}; 