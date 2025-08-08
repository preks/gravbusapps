import { useState, useCallback } from "react";
import { SelectOption } from "../types";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";

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
  displayCount: number; // New field to track how many items to display
  initialized: boolean; // Track if initial load has been done
}

export const useSearchableCatalog = ({
  accessToken,
  catalogIdentifier,
  version = "v1",
  pageSize = 100, // Increased from 20 to 100 for better UX
}: SearchableCatalogHookParams) => {
  const [state, setState] = useState<SearchableCatalogState>({
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    currentSearch: "",
    offset: 0,
    displayCount: 5, // Back to 5 as requested by user
    initialized: false, // Track initialization
  });

  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchCatalogEntries = useCallback(
    async (
      searchTerm: string = "",
      offset: number = 0,
      isLoadMore: boolean = false
    ): Promise<void> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        ...(isLoadMore ? {} : { options: [] }),
      }));

      try {
        console.log(
          `Fetching ${catalogIdentifier} with offset: ${offset}, searchTerm: "${searchTerm}"`
        );

        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier,
            version,
          },
          {
            limit: pageSize,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(searchTerm.trim() && { value: searchTerm.trim() }),
          }
        );

        console.log(`${catalogIdentifier} Response:`, response);
        console.log(
          `Received ${response.data.length} items, total records: ${response.paging?.totalRecords}`
        );

        const mappedOptions: SelectOption[] = response.data.map(
          (entry: any) => ({
            id: entry.id,
            name: entry.value || entry.label || entry.name || "Unknown",
            label: entry.value || entry.label || entry.name || "Unknown",
            value: entry.id,
          })
        );

        const totalRecords = response.paging?.totalRecords || 0;
        const currentOffset = offset + response.data.length; // Update offset based on actual received items
        const hasMoreRecords = currentOffset < totalRecords;

        console.log(
          `Updated offset: ${currentOffset}, hasMore: ${hasMoreRecords}`
        );

        setState((prev) => ({
          ...prev,
          loading: false,
          options: isLoadMore
            ? [...prev.options, ...mappedOptions]
            : mappedOptions,
          hasMore: hasMoreRecords,
          currentSearch: searchTerm,
          offset: currentOffset, // Store the current offset (where next request should start)
          initialized: true, // Mark as initialized after successful load
        }));
      } catch (err) {
        console.error(`Error fetching ${catalogIdentifier} catalog:`, err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error occurred",
        }));
      }
    },
    [catalogClient, catalogIdentifier, version, pageSize]
  );

  const search = useCallback(
    (searchTerm: string) => {
      setState((prev) => ({ ...prev, offset: 0 }));
      fetchCatalogEntries(searchTerm, 0, false);
    },
    [fetchCatalogEntries]
  );

  const loadMore = useCallback(() => {
    console.log(`LoadMore called for ${catalogIdentifier}:`, {
      hasMore: state.hasMore,
      loading: state.loading,
      currentOffset: state.offset,
      optionsLength: state.options.length,
      currentSearch: state.currentSearch,
    });

    if (state.hasMore && !state.loading) {
      console.log(
        `Executing loadMore for ${catalogIdentifier} from offset ${state.offset}`
      );
      fetchCatalogEntries(state.currentSearch, state.offset, true);
    } else {
      console.log(
        `LoadMore skipped for ${catalogIdentifier} - hasMore: ${state.hasMore}, loading: ${state.loading}`
      );
    }
  }, [
    fetchCatalogEntries,
    state.hasMore,
    state.loading,
    state.currentSearch,
    state.offset,
    catalogIdentifier,
  ]);

  const reset = useCallback(() => {
    setState({
      options: [],
      loading: false,
      error: null,
      hasMore: false,
      currentSearch: "",
      offset: 0,
      displayCount: 5, // Back to 5 as requested
      initialized: false,
    });
  }, []);

  // Initial load - simplified version that works
  const initialize = useCallback(() => {
    if (state.initialized || state.loading) {
      console.log(
        `${catalogIdentifier} already initialized or loading, skipping...`
      );
      return;
    }

    console.log(`Initializing ${catalogIdentifier}...`);
    fetchCatalogEntries("", 0, false);
  }, [
    fetchCatalogEntries,
    catalogIdentifier,
    state.initialized,
    state.loading,
  ]);

  // Show more items from already fetched data
  const showMore = useCallback(() => {
    setState((prev) => ({
      ...prev,
      displayCount: Math.min(prev.displayCount + 5, prev.options.length), // Back to 5 more items at a time
    }));
  }, []);

  // Check if we need to fetch more data from API
  const needsMoreData =
    state.displayCount >= state.options.length && state.hasMore;

  // Get currently displayed options
  const displayedOptions = state.options.slice(0, state.displayCount);
  const hasMoreToShow =
    state.displayCount < state.options.length || state.hasMore;

  return {
    options: displayedOptions, // Return only the items that should be displayed
    allOptions: state.options, // Return all fetched options for debugging
    loading: state.loading,
    error: state.error,
    hasMore: hasMoreToShow, // Has more to show (either from fetched data or API)
    needsMoreData, // Need to fetch more from API
    displayCount: state.displayCount,
    totalFetched: state.options.length,
    search,
    loadMore, // Fetch more from API
    showMore, // Show more from already fetched data
    reset,
    initialize,
  };
};
