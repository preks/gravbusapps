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
}

export const INTEREST_PAYMENT_FREQUENCY_CATALOG = "InterestPaymentFrequency";
export const CATALOG_VERSION = "v1";

export const useInterestPaymentFrequencyCatalog = ({
  accessToken,
  catalogIdentifier = INTEREST_PAYMENT_FREQUENCY_CATALOG,
  version = CATALOG_VERSION,
  pageSize = 50,
}: SearchableCatalogHookParams) => {
  const [state, setState] = useState<SearchableCatalogState>({
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    currentSearch: "",
    offset: 0,
  });

  const catalogClient = useCatalogManagerClient(accessToken);

  const fetchCatalogEntries = useCallback(
    async (searchTerm: string = "", offset: number = 0, isLoadMore: boolean = false): Promise<void> => {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        ...(isLoadMore ? {} : { options: [] }),
      }));

      try {
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
            ...(searchTerm.trim() && { searchCriteria: searchTerm.trim() }),
          }
        );

        const mappedOptions: SelectOption[] = response.data.map((entry: any) => {
          console.log("Interest payment frequency catalog entry:", entry);

          // Create the reference format: InterestPaymentFrequency:v1:CODE
          const referenceValue = `${catalogIdentifier}:${version}:${entry.code || entry.id}`;

          return {
            id: entry.id,
            name: entry.value || entry.label || entry.name || "Unknown",
            label: entry.value || entry.label || entry.name || "Unknown",
            value: referenceValue, // Use reference format instead of just ID
          };
        });

        console.log("Interest payment frequency mapped options:", mappedOptions);

        const totalRecords = response.paging?.totalRecords || 0;
        const newOffset = offset + pageSize;
        const hasMoreRecords = newOffset < totalRecords;

        setState((prev) => ({
          ...prev,
          loading: false,
          options: isLoadMore ? [...prev.options, ...mappedOptions] : mappedOptions,
          hasMore: hasMoreRecords,
          currentSearch: searchTerm,
          offset: newOffset,
        }));
      } catch (error) {
        console.error("Error fetching interest payment frequency catalog:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : "Unknown error occurred",
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
      currentSearch: "",
      offset: 0,
    });
  }, []);

  // Initial load
  const initialize = useCallback(() => {
    fetchCatalogEntries("", 0, false);
  }, [fetchCatalogEntries]);

  return {
    options: state.options,
    loading: state.loading,
    error: state.error,
    hasMore: state.hasMore,
    search,
    loadMore,
    reset,
    initialize,
  };
};

// Export a specific hook for interest payment frequencies
export const useInterestPaymentFrequencies = (accessToken: string) => {
  return useInterestPaymentFrequencyCatalog({
    accessToken,
    catalogIdentifier: INTEREST_PAYMENT_FREQUENCY_CATALOG,
    version: CATALOG_VERSION,
  });
};
