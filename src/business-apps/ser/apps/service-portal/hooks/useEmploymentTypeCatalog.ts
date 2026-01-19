import { useState, useEffect, useCallback } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';

export interface EmploymentTypeOption {
  id: string;
  name: string;
  value: string;
}

export const EMPLOYMENT_TYPE_CATALOG = 'EmploymentType';
export const EMPLOYMENT_TYPE_VERSION = 'v1';

/**
 * Custom hook to fetch employment types from the catalog
 * Uses the same pattern as other HR forms in the platform
 */
export const useEmploymentTypeCatalog = (context: BusinessAppContextProps) => {
  const [employmentTypes, setEmploymentTypes] = useState<EmploymentTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US';
  const catalogClient = useCatalogManagerClient(context.accessToken);

  const fetchEmploymentTypes = useCallback(async (search: string = '') => {
    if (!context.accessToken || !catalogClient) {
      setError('Catalog client not available');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: EMPLOYMENT_TYPE_CATALOG,
          version: EMPLOYMENT_TYPE_VERSION
        },
        {
          limit: 100, // Get all employment types
          offset: 0,
          returnTotalRecords: true,
          localeCode: userLocale,
          includeChildCatalogEntries: true,
          ...(search && { searchCriteria: search })
        }
      );

      // Use same pattern as other HR hooks - direct response.data access
      const entries = response.data || [];
      
      // Filter and map entries exactly like other HR catalog hooks
      const employmentTypeOptions: EmploymentTypeOption[] = entries
        .filter((entry: any) => {
          const isValid = entry && entry.id && (entry.value || entry.code);
          const isTranslation = entry.code?.toLowerCase().includes('translation') || 
                               entry.value?.toLowerCase().includes('translation');
          
          return isValid && !isTranslation;
        }) // Only entries with valid value/code, exclude translations
        .map((entry: any) => ({
          id: entry.id,
          name: entry.value || entry.code || 'Unknown', // Same pattern as other HR hooks
          value: entry.id
        }));

      setEmploymentTypes(employmentTypeOptions);
    } catch (err) {
      console.error('Error fetching employment types from catalog:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch employment types');
      
      // Fallback to common employment types if catalog fails
      const fallbackTypes: EmploymentTypeOption[] = [
        { id: 'full-time', name: 'Full-time', value: 'full-time' },
        { id: 'part-time', name: 'Part-time', value: 'part-time' },
        { id: 'contract', name: 'Contract', value: 'contract' },
        { id: 'intern', name: 'Intern', value: 'intern' },
        { id: 'temporary', name: 'Temporary', value: 'temporary' }
      ];
      setEmploymentTypes(fallbackTypes);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, catalogClient, userLocale]);

  // Load employment types on mount
  useEffect(() => {
    fetchEmploymentTypes();
  }, [fetchEmploymentTypes]);

  return {
    employmentTypes,
    isLoading,
    error,
    refetch: fetchEmploymentTypes
  };
};

// Helper function to get employment type options for Select components
export const getEmploymentTypeOptions = (employmentTypes: EmploymentTypeOption[]) => {
  return employmentTypes
    .filter(type => type.name && type.name.trim() !== '' && !type.name.toLowerCase().includes('translation')) // Extra safety filter
    .map(type => ({
      value: type.value,
      label: type.name
    }));
};
