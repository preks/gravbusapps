import { useState, useCallback, useEffect } from "react";
import { SelectOption } from "../types";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

interface CountriesHookParams {
  accessToken: string;
  pageSize?: number;
}

interface CountriesState {
  options: SelectOption[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentSearch: string;
  offset: number;
}

export const useCountriesGraphQL = ({
  accessToken,
  pageSize = 20,
}: CountriesHookParams) => {
  const [state, setState] = useState<CountriesState>({
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    currentSearch: "",
    offset: 0,
  });

  const graphqlClient = useGraphQLClient(accessToken);

  const fetchCountries = useCallback(
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
        // Create the query with proper conditional where clause
        const query = searchTerm.trim()
          ? `
        query GetCountries($limit: Int, $offset: Int, $search: String) {
          CatalogEntry(
            where: {
              catalog: {
                identifier: { _eq: "Country" }
                version: { _eq: "v1" }
              }
              _and: [{ value: { _ilike: $search } }]
            }
            limit: $limit
            offset: $offset
            orderBy: [{ value: ASC }]
          ) {
            id
            code
            value
            additionalValue1
            additionalValue2
            additionalValue3
            alternativeCode
            catalog {
              identifier
              version
            }
          }
        }
      `
          : `
        query GetCountries($limit: Int, $offset: Int) {
          CatalogEntry(
            where: {
              catalog: {
                identifier: { _eq: "Country" }
                version: { _eq: "v1" }
              }
            }
            limit: $limit
            offset: $offset
            orderBy: [{ value: ASC }]
          ) {
            id
            code
            value
            additionalValue1
            additionalValue2
            additionalValue3
            alternativeCode
            catalog {
              identifier
              version
            }
          }
        }
      `;

        const variables: any = {
          limit: pageSize,
          offset,
        };

        if (searchTerm.trim()) {
          variables.search = `%${searchTerm.trim()}%`;
        }

        console.log("🚀 GraphQL Query Variables:", variables);
        const response = await graphqlClient.request(query, variables);
        console.log(
          "📊 GraphQL Response:",
          response.CatalogEntry?.length || 0,
          "countries found"
        );

        const mappedOptions: SelectOption[] = response.CatalogEntry.map(
          (entry: any) => ({
            id: entry.id,
            name: entry.value || "Unknown",
            label: entry.value || "Unknown",
            value: entry.id,
            extraInfo: {
              code: entry.code,
              alternativeCode: entry.alternativeCode,
              additionalValue1: entry.additionalValue1,
              additionalValue2: entry.additionalValue2,
              additionalValue3: entry.additionalValue3,
            },
          })
        );

        // Since GraphQL doesn't return total count in this query, we assume there's more if we get a full page
        const hasMoreRecords = mappedOptions.length === pageSize;
        const newOffset = offset + pageSize;

        setState((prev) => ({
          ...prev,
          loading: false,
          options: isLoadMore
            ? [...prev.options, ...mappedOptions]
            : mappedOptions,
          hasMore: hasMoreRecords,
          currentSearch: searchTerm,
          offset: newOffset,
        }));
      } catch (err) {
        console.error("❌ Error fetching countries via GraphQL:", {
          error: err,
          message: err instanceof Error ? err.message : "Unknown error",
          searchTerm,
          offset,
          isLoadMore,
          hasGraphQLClient: !!graphqlClient,
        });
        setState((prev) => ({
          ...prev,
          loading: false,
          error: err instanceof Error ? err.message : "Unknown error occurred",
        }));
      }
    },
    [graphqlClient, pageSize]
  );

  const search = useCallback(
    (searchTerm: string) => {
      console.log("🔍 Searching countries with term:", searchTerm);
      setState((prev) => ({ ...prev, offset: 0 }));
      fetchCountries(searchTerm, 0, false);
    },
    [fetchCountries]
  );

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchCountries(state.currentSearch, state.offset, true);
    }
  }, [
    fetchCountries,
    state.hasMore,
    state.loading,
    state.currentSearch,
    state.offset,
  ]);

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
    fetchCountries("", 0, false);
  }, [fetchCountries]);

  // Auto-initialize when access token is available
  useEffect(() => {
    if (accessToken) {
      console.log("🌍 Countries GraphQL hook initializing...");
      initialize();
    } else {
      console.log("⚠️ Countries GraphQL hook: No access token, waiting...");
    }
  }, [accessToken, initialize]);

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
