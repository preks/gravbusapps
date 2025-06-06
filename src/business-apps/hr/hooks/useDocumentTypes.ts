import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { DocumentType } from '../document-management/types';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';
import { CatalogEntry, GetCatalogEntriesParams, GetCatalogsParams } from '../../../common/types/CatalogTypes';

const PAGE_SIZE = 5; // Or make this configurable

const useDocumentTypes = (accessToken: string, moduleFilter?: string) => {
  const userLocale = 'en-US';
  const client = useCatalogManagerClient(accessToken);
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalDocumentTypes, setTotalDocumentTypes] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  // const [filteredModuleTotalCount, setFilteredModuleTotalCount] = useState<number | null>(null); // No longer needed
  const [allPossibleModules, setAllPossibleModules] = useState<string[]>([]);

  // newPageSize is part of Ant Design's Table pagination onChange signature.
  // We are not currently using it to change PAGE_SIZE, hence the lint warning.
  const handlePageChange = useCallback((page: number, _newPageSize?: number) => {
    setCurrentPage(page);
  }, []);

  // Effect to fetch all unique module names once for the filter dropdown
  useEffect(() => {
    if (!accessToken || !client) {
      setAllPossibleModules([]); // Clear if no token or client
      return;
    }

    const fetchAllEntriesForModuleExtraction = async () => {
      // console.log('[useDocumentTypes] Attempting to fetch all entries for module names...');
      try {
        const pathParams: GetCatalogEntriesParams = {
          catalogIdentifier: 'DocumentType',
          version: 'v1',
        };
        const queryParamsForAllModules: GetCatalogsParams = {
          // includeLocalizedVersions: false, // Not strictly needed for parentEntryId
          includeChildCatalogEntries: true, // Essential for parentEntryId
          limit: 1000, // Fetch a large number of entries to get all unique modules
          offset: 0,
          // No searchCriteria here, we want all parentEntryIds to extract modules
          // No returnTotalRecords needed for this specific task either
        };

        const response = await client.getCatalogEntriesList(pathParams, queryParamsForAllModules);

        if (response && response.data) {
          const uniqueModules = new Set<string>();
          response.data.forEach((entry: CatalogEntry) => {
            if (entry.parentEntryId) {
              const parts = entry.parentEntryId.split(':');
              // Assuming module name is the last part, e.g., DocumentGroup:v1:MODULE_NAME
              if (parts.length > 0) {
                const moduleName = parts[parts.length - 1];
                if (moduleName) { // Ensure moduleName is not empty
                  uniqueModules.add(moduleName);
                }
              }
            }
          });
          // console.log('[useDocumentTypes] Extracted unique modules:', Array.from(uniqueModules));
          setAllPossibleModules(Array.from(uniqueModules).sort());
        } else {
          setAllPossibleModules([]);
        }
      } catch (e) {
        console.error('[useDocumentTypes] Failed to fetch entries for module extraction:', e);
        setAllPossibleModules([]); // Clear on error
        // Optionally, set a specific error state or display a message to the user
      }
    };

    fetchAllEntriesForModuleExtraction();
  }, [accessToken, client]); // Runs when accessToken or client changes (effectively once on init)

  useEffect(() => {
    if (!accessToken || !client) {
      // If there's no token or client, don't attempt to fetch.
      // Optionally, clear existing data or set an appropriate state.
      setDocumentTypes([]); // Clear previous data if token becomes invalid
      setLoading(false);
      return;
    }

    const fetchAndSetDocumentTypes = async () => {
      setLoading(true);
      setError(null);
      try {
        const pathParams: GetCatalogEntriesParams = {
          catalogIdentifier: 'DocumentType', // Critical: Verify this identifier
          version: 'v1',
        };
        const offset = (currentPage - 1) * PAGE_SIZE;
        const queryParams: GetCatalogsParams = { 
          includeLocalizedVersions: true,
          includeChildCatalogEntries: true,
          returnTotalRecords: true,
          localeCode: userLocale,
          limit: PAGE_SIZE,
          offset: offset,
        };

        if (moduleFilter) {
          // If a module filter is active, apply it to the main data query
          // This means totalDocumentTypes will also reflect the filtered count.
          queryParams.searchCriteria = `DocumentGroup:v1:${moduleFilter}`;
        }

        const response = await client.getCatalogEntriesList(pathParams, queryParams);
        if (!response || !response.data) {
          throw new Error('No data received from API');
        }

        setTotalDocumentTypes(response.paging?.totalRecords || 0);
        const fetchedEntries: CatalogEntry[] = response.data || [];
        
        const mappedDocumentTypes = fetchedEntries.map((entry: CatalogEntry): DocumentType | null => {
          try {
            // Validate essential fields from CatalogEntry for mapping
            if (typeof entry.id !== 'string' || entry.id === '') {
              console.warn(`CatalogEntry is missing 'id' or it's not a string. Skipping entry.`);
              return null;
            }
            if (typeof entry.code !== 'string' || entry.code === '') {
              console.warn(`CatalogEntry (id: ${entry.id}) is missing 'code' or it's not a string. Skipping entry.`);
              return null;
            }
            if (typeof entry.value !== 'string') { // value can be an empty string
              console.warn(`CatalogEntry (id: ${entry.id}) is missing 'value' or it's not a string. Skipping entry.`);
              return null;
            }

            const constructedId = `${pathParams.catalogIdentifier}:${pathParams.version}:${entry.code}`;

            return {
              id: constructedId,
              code: entry.code,
              value: entry.value,
              parentEntryId: entry.parentEntryId || '',
              additionalValue1: entry.additionalValue1 || '',
              objectValue: entry.objectValue || {},
              catalogEntryLocalId: entry.id, // Map CatalogEntry.id to catalogEntryLocalId
              localeCode: entry.localeCode || userLocale,
            };
          } catch (mapError: any) {
            console.error(`Error mapping CatalogEntry (id: ${entry.id || 'N/A'}) to DocumentType:`, mapError);
            message.error(`Error processing document entry: ${entry.value || entry.code || entry.id || 'Unknown Entry'}`);
            return null;
          }
        }).filter((docType): docType is DocumentType => docType !== null);

        setDocumentTypes(mappedDocumentTypes);
      } catch (e: any) {
        setError(e);
        message.error(e.message || 'Failed to fetch document types');
      } finally {
        setLoading(false);
      }
    };

    fetchAndSetDocumentTypes();
  }, [accessToken, client, userLocale, currentPage, moduleFilter]);

  const createDocumentType = useCallback(async (documentType: Omit<DocumentType, 'id'>) => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      const newType: DocumentType = {
        ...documentType,
        id: Math.random().toString(36).substr(2, 9),
      };
      setDocumentTypes(prev => [...prev, newType]);
      message.success('Document type created successfully');
      return newType;
    } catch (err) {
      message.error('Failed to create document type');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateDocumentType = useCallback(async (id: string, updates: Partial<DocumentType>) => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setDocumentTypes(prev => 
        prev.map(doc => doc.id === id ? { ...doc, ...updates } : doc)
      );
      message.success('Document type updated successfully');
    } catch (err) {
      message.error('Failed to update document type');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDocumentType = useCallback(async (id: string) => {
    try {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 500));
      setDocumentTypes(prev => prev.filter(doc => doc.id !== id));
      message.success('Document type deleted successfully');
    } catch (err) {
      message.error('Failed to delete document type');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    documentTypes,
    loading,
    error,
    totalDocumentTypes,
    currentPage,
    PAGE_SIZE,
    handlePageChange,
    // filteredModuleTotalCount, // No longer needed
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
    allPossibleModules, // Add to return object
  };
};

export default useDocumentTypes;
