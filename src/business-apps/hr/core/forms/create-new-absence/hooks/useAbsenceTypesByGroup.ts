import { useState, useEffect, useCallback } from 'react';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils';
import { CatalogEntry } from '@/common/types/CatalogTypes';

export interface AbsenceTypeOption {
  id: string;
  name: string;
  parentEntryId: string;
  catalogEntry: CatalogEntry;
}

export interface UseAbsenceTypesByGroupReturn {
  absenceTypes: AbsenceTypeOption[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export const useAbsenceTypesByGroup = (
  context: BusinessAppContextProps,
  parentEntryId?: string
): UseAbsenceTypesByGroupReturn => {
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const catalogClient = useCatalogManagerClient(context.accessToken);
  const userLocale = getCurrentActiveUserLocale() ?? 'en-US';

  const loadAbsenceTypes = useCallback(async () => {
    if (!context.accessToken) {
      return [];
    }
    
    // Always fetch all absence types first, then filter by parentEntryId if provided
    try {
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

      console.log("response from hook", response);
      
      if (response?.data) {
        // Filter by group: if parentEntryId provided, it can be either
        // - a parent entry id (e.g. 'AbsenceType:v1:A001') OR
        // - a child entry value (e.g. 'Vacation')
        // Find the parent id first, then return all entries with the same parentEntryId
        let filteredEntries = response.data;
        if (parentEntryId) {
          const normalize = (s?: string) => (s ?? '').toLowerCase().trim();

          // Try to find an entry matching by id OR by value
          const matchedEntry = response.data.find((entry: CatalogEntry) => {
            return entry.id === parentEntryId || normalize(entry.value) === normalize(parentEntryId);
          });

          // Determine the target parent id
          const targetParentId = matchedEntry
            ? (matchedEntry.parentEntryId || matchedEntry.id)
            : parentEntryId;

          // Return all entries that share this parent id
          filteredEntries = response.data.filter((entry: CatalogEntry) => entry.parentEntryId === targetParentId);
        }
        
        const processedOptions = filteredEntries.map((entry: CatalogEntry) => {
          return {
            id: entry.id,
            name: entry.value || entry.code || entry.id,
            parentEntryId: entry.parentEntryId || '',
            catalogEntry: entry
          };
        });

        console.log("parentEntryId", parentEntryId);
        console.log("processedOptions", processedOptions);
        
        return processedOptions;
      } else {
        return [];
      }
    } catch (err) {
      console.error('Error loading absence types:', err);
      return [];
    }
  }, [catalogClient, context.accessToken, userLocale, parentEntryId]);

  const loadCatalogs = useCallback(async () => {
    if (!context.accessToken) {
      setAbsenceTypes([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const types = await loadAbsenceTypes();
      console.log("types from hook", types);
      setAbsenceTypes(types);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load absence types';
      console.error('Error loading absence types:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, parentEntryId, loadAbsenceTypes]);

  useEffect(() => {
    loadCatalogs();
  }, [loadCatalogs]);

  return {
    absenceTypes,
    isLoading,
    error,
    refetch: loadCatalogs
  };
};
