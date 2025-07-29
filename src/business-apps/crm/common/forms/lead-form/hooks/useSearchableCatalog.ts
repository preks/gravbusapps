import { useState, useCallback } from 'react';
import { SelectOption } from '../types';
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient';

interface SearchableCatalogHookParams {
  accessToken: string;
  catalogIdentifier: string;
  version?: string;
  pageSize?: number;
}

interface SearchableCatalogState {
  options: SelectOption[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentSearch: string;
  offset: number;
}

export const useSearchableCatalog = ({ 
  accessToken, 
  catalogIdentifier, 
  version = 'v1',
  pageSize = 20 
}: SearchableCatalogHookParams) => {
  const [state, setState] = useState<SearchableCatalogState>({
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    currentSearch: '',
    offset: 0
  });

  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchCatalogEntries = useCallback(async (
    searchTerm: string = '',
    offset: number = 0,
    isLoadMore: boolean = false
  ): Promise<void> => {
    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
      ...(isLoadMore ? {} : { options: [] })
    }));

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier,
          version
        },
        {
          limit: pageSize,
          offset,
          returnTotalRecords: true,
          includeChildCatalogEntries: true,
          ...(searchTerm.trim() && { searchCriteria: searchTerm.trim() })
        }
      );

      const mappedOptions: SelectOption[] = response.data.map((entry: any) => ({
        id: entry.id,
        name: entry.value || entry.label || entry.name || 'Unknown',
        label: entry.value || entry.label || entry.name || 'Unknown',
        value: entry.id
      }));

      const totalRecords = response.paging?.totalRecords || 0;
      const newOffset = offset + pageSize;
      const hasMoreRecords = newOffset < totalRecords;

      setState(prev => ({
        ...prev,
        loading: false,
        options: isLoadMore ? [...prev.options, ...mappedOptions] : mappedOptions,
        hasMore: hasMoreRecords,
        currentSearch: searchTerm,
        offset: newOffset
      }));
    } catch (err) {
      console.error(`Error fetching ${catalogIdentifier} catalog:`, err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error occurred'
      }));
    }
  }, [catalogClient, catalogIdentifier, version, pageSize]);

  const search = useCallback((searchTerm: string) => {
    setState(prev => ({ ...prev, offset: 0 }));
    fetchCatalogEntries(searchTerm, 0, false);
  }, [fetchCatalogEntries]);

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchCatalogEntries(state.currentSearch, state.offset, true);
    }
  }, [fetchCatalogEntries, state.hasMore, state.loading, state.currentSearch, state.offset]);

  const reset = useCallback(() => {
    setState({
      options: [],
      loading: false,
      error: null,
      hasMore: false,
      currentSearch: '',
      offset: 0
    });
  }, []);

  // Initial load
  const initialize = useCallback(() => {
    fetchCatalogEntries('', 0, false);
  }, [fetchCatalogEntries]);

  return {
    options: state.options,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    search,
    loadMore,
    reset,
    initialize
  };
}; 