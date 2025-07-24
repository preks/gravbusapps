import { useState, useEffect, useCallback } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { CatalogEntry } from '@/common/types/CatalogTypes';

export interface AbsenceTypeOption {
  id: string;
  name: string;
  // Preserve full catalog entry for color extraction
  catalogEntry: CatalogEntry;
}

export interface AbsenceGroupOption {
  id: string;
  name: string;
  // Preserve full catalog entry for color extraction
  catalogEntry: CatalogEntry;
}

export interface UseAbsenceCatalogsReturn {
  absenceTypes: AbsenceTypeOption[];
  absenceGroups: AbsenceGroupOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAbsenceCatalogs = (context: BusinessAppContextProps): UseAbsenceCatalogsReturn => {
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceTypeOption[]>([]);
  const [absenceGroups, setAbsenceGroups] = useState<AbsenceGroupOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US';

  const loadAbsenceTypes = useCallback(async () => {
    if (!context.accessToken) {
      console.log('No access token available, skipping absence types fetch');
      return [];
    }

    try {
      console.log('Fetching AbsenceType catalog...');
      const response = await catalogClient.getCatalogEntriesList({
        catalogIdentifier: 'AbsenceType',
        version: 'v1'
      }, {
        limit: 100,
        offset: 0,
        returnTotalRecords: true,
        localeCode: userLocale,
        includeChildCatalogEntries: true
      });
      
      console.log('AbsenceType response:', response);
      
      if (response?.data) {
        console.log('=== ABSENCE TYPES DETAILED ANALYSIS ===');
        const processedOptions = response.data.map((entry: CatalogEntry, index: number) => {
          console.log(`\n--- Absence Type ${index + 1}: ${entry.value || entry.code} ---`);
          console.log('Full entry:', entry);
          console.log('ID:', entry.id);
          console.log('Code:', entry.code);
          console.log('Value:', entry.value);
          console.log('ObjectValue:', entry.objectValue);
          console.log('ObjectValue (JSON):', JSON.stringify(entry.objectValue, null, 2));
          console.log('AdditionalValue1:', entry.additionalValue1);
          console.log('AdditionalValue2:', entry.additionalValue2);
          console.log('AdditionalValue3:', entry.additionalValue3);
          
          // Check for additionalProperties (even if not in TS interface)
          const entryWithProps = entry as any;
          if (entryWithProps.additionalProperties) {
            console.log('AdditionalProperties:', entryWithProps.additionalProperties);
            console.log('AdditionalProperties type:', typeof entryWithProps.additionalProperties);
            
            if (typeof entryWithProps.additionalProperties === 'string') {
              try {
                const parsed = JSON.parse(entryWithProps.additionalProperties);
                console.log('AdditionalProperties parsed:', parsed);
              } catch (e) {
                console.log('AdditionalProperties parse error:', e);
              }
            }
          } else {
            console.log('AdditionalProperties: NOT FOUND');
          }
          
          return {
            id: entry.id,
            name: entry.value || entry.code || entry.id,
            catalogEntry: entry
          };
        });
        
        console.log('AbsenceType processed options count:', processedOptions.length);
        return processedOptions;
      } else {
        console.log('No AbsenceType data received');
        return [];
      }
    } catch (err) {
      console.error('Error loading absence types:', err);
      return [];
    }
  }, [catalogClient, context.accessToken, userLocale]);

  const loadAbsenceGroups = useCallback(async () => {
    if (!context.accessToken) {
      console.log('No access token available, skipping absence groups fetch');
      return [];
    }

    try {
      console.log('Fetching AbsenceGroup catalog...');
      const response = await catalogClient.getCatalogEntriesList({
        catalogIdentifier: 'AbsenceGroup',
        version: 'v1'
      }, {
        limit: 100,
        offset: 0,
        returnTotalRecords: true,
        localeCode: userLocale,
        includeChildCatalogEntries: true
      });
      
      console.log('AbsenceGroup response:', response);
      
      if (response?.data) {
        console.log('=== ABSENCE GROUPS DETAILED ANALYSIS ===');
        const processedOptions = response.data.map((entry: CatalogEntry, index: number) => {
          console.log(`\n--- Absence Group ${index + 1}: ${entry.value || entry.code} ---`);
          console.log('Full entry:', entry);
          console.log('ID:', entry.id);
          console.log('Code:', entry.code);
          console.log('Value:', entry.value);
          console.log('ObjectValue:', entry.objectValue);
          console.log('ObjectValue (JSON):', JSON.stringify(entry.objectValue, null, 2));
          console.log('AdditionalValue1:', entry.additionalValue1);
          console.log('AdditionalValue2:', entry.additionalValue2);
          console.log('AdditionalValue3:', entry.additionalValue3);
          
          // Check for additionalProperties (even if not in TS interface)
          const entryWithProps = entry as any;
          if (entryWithProps.additionalProperties) {
            console.log('AdditionalProperties:', entryWithProps.additionalProperties);
            console.log('AdditionalProperties type:', typeof entryWithProps.additionalProperties);
            
            if (typeof entryWithProps.additionalProperties === 'string') {
              try {
                const parsed = JSON.parse(entryWithProps.additionalProperties);
                console.log('AdditionalProperties parsed:', parsed);
              } catch (e) {
                console.log('AdditionalProperties parse error:', e);
              }
            }
          } else {
            console.log('AdditionalProperties: NOT FOUND');
          }
          
          return {
            id: entry.id,
            name: entry.value || entry.code || entry.id,
            catalogEntry: entry
          };
        });
        
        console.log('AbsenceGroup processed options count:', processedOptions.length);
        return processedOptions;
      } else {
        console.log('No AbsenceGroup data received');
        return [];
      }
    } catch (err) {
      console.error('Error loading absence groups:', err);
      return [];
    }
  }, [catalogClient, context.accessToken, userLocale]);

  const loadCatalogs = useCallback(async () => {
    if (!context.accessToken) return;

    setIsLoading(true);
    setError(null);
    
    try {
      const [types, groups] = await Promise.all([
        loadAbsenceTypes(),
        loadAbsenceGroups()
      ]);
      
      setAbsenceTypes(types);
      setAbsenceGroups(groups);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load absence catalogs';
      setError(errorMessage);
      console.error('Error loading absence catalogs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, loadAbsenceTypes, loadAbsenceGroups]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  return {
    absenceTypes,
    absenceGroups,
    isLoading,
    error,
    refetch: loadCatalogs
  };
}; 