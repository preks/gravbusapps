import { useState, useCallback, useEffect } from "react";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";
import { SelectOption } from "../types";

export const INVESTMENT_ROLE_CATALOG = "InvestmentRole";
export const CATALOG_VERSION = "v1";

interface UseInvestmentRoleCatalogReturn {
  options: SelectOption[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  search: (searchTerm: string) => void;
  loadMore: () => void;
  initialize: () => void;
}

interface SearchableCatalogState {
  options: SelectOption[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentSearch: string;
  offset: number;
}

export const useInvestmentRoleCatalog = (accessToken: string): UseInvestmentRoleCatalogReturn => {
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
      if (!accessToken) return;

      console.log(
        `Investment roles: fetchCatalogEntries called with searchTerm="${searchTerm}", offset=${offset}, isLoadMore=${isLoadMore}`
      ); // Debug log

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        ...(isLoadMore ? {} : { options: [] }),
      }));

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: INVESTMENT_ROLE_CATALOG,
            version: CATALOG_VERSION,
          },
          {
            limit: 20,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(searchTerm.trim() && { searchCriteria: searchTerm.trim() }),
          }
        );

        console.log("Investment roles response:", response); // Debug log

        // Use response.data like other successful implementations
        const catalogEntries = response.data || [];
        console.log(`Investment roles: found ${catalogEntries.length} entries`); // Debug log

        const newOptions: SelectOption[] = catalogEntries.map((entry: any) => {
          console.log("Investment role catalog entry:", entry);

          // Create the reference format: InvestmentRole:v1:CODE
          const referenceValue = `${INVESTMENT_ROLE_CATALOG}:${CATALOG_VERSION}:${entry.code || entry.id}`;

          return {
            id: entry.id,
            value: referenceValue, // Use reference format instead of just ID
            label: entry.value || entry.label || entry.name || "Unknown",
            name: entry.value || entry.label || entry.name || "Unknown",
          };
        });

        const totalRecords = response.paging?.totalRecords || 0;
        const newOffset = offset + 20;
        const hasMoreRecords = newOffset < totalRecords;

        console.log(
          `Investment roles: mapped ${newOptions.length} options, totalRecords=${totalRecords}, hasMore=${hasMoreRecords}`
        ); // Debug log

        setState((prev) => ({
          ...prev,
          loading: false,
          options: isLoadMore ? [...prev.options, ...newOptions] : newOptions,
          hasMore: hasMoreRecords,
          currentSearch: searchTerm,
          offset: newOffset,
        }));
      } catch (err) {
        console.error("Error loading investment role catalog:", err);
        setState((prev) => ({
          ...prev,
          loading: false,
          error: "Failed to load investment roles",
        }));
      }
    },
    [accessToken, catalogClient]
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
    initialize,
  };
};
