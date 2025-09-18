import { useState, useCallback, useEffect } from "react";
import { SelectOption } from "../types";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

interface CurrenciesHookParams {
  accessToken: string;
  pageSize?: number;
}

interface CurrenciesState {
  options: SelectOption[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  currentSearch: string;
  offset: number;
}

export const useCurrenciesGraphQL = ({
  accessToken,
  pageSize = 20,
}: CurrenciesHookParams) => {
  const [state, setState] = useState<CurrenciesState>({
    options: [],
    loading: false,
    error: null,
    hasMore: false,
    currentSearch: "",
    offset: 0,
  });

  const graphqlClient = useGraphQLClient(accessToken);

  const buildCurrenciesQuery = (
    search: string = "",
    offset: number = 0,
    limit: number = 20
  ) =>
    search.trim()
      ? `
        query GetCurrencies($limit: Int, $offset: Int, $search: String) {
          CatalogEntry(
            where: {
              catalog: {
                identifier: { _eq: "Currency" }
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
        query GetCurrencies($limit: Int, $offset: Int) {
          CatalogEntry(
            where: {
              catalog: {
                identifier: { _eq: "Currency" }
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

  const fetchCurrencies = useCallback(
    async (
      search: string = "",
      offset: number = 0,
      append: boolean = false
    ) => {
      if (!accessToken) {
        return;
      }

      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
        ...(append ? {} : { options: [] }),
      }));

      try {
        const query = buildCurrenciesQuery(search, offset, pageSize);

        const variables: any = {
          limit: pageSize,
          offset,
        };

        if (search.trim()) {
          variables.search = `%${search.trim()}%`;
        }

        const response = await graphqlClient.request(query, variables);

        const mappedOptions: SelectOption[] = response.CatalogEntry.map(
          (entry: any) => ({
            id: String(entry.id),
            name: entry.value || "Unknown",
            label: entry.value || "Unknown",
            value: String(entry.id),
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

        setState((prev) => ({
          ...prev,
          options: append ? [...prev.options, ...mappedOptions] : mappedOptions,
          loading: false,
          hasMore: hasMoreRecords,
          currentSearch: search,
          offset: append
            ? prev.offset + mappedOptions.length
            : mappedOptions.length,
        }));
      } catch (error) {
        console.error("❌ Error fetching currencies:", error);
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to fetch currencies",
        }));
      }
    },
    [accessToken, graphqlClient, pageSize]
  );

  const search = useCallback(
    (searchTerm: string) => {
      fetchCurrencies(searchTerm, 0, false);
    },
    [fetchCurrencies]
  );

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.loading) {
      fetchCurrencies(state.currentSearch, state.offset, true);
    }
  }, [
    fetchCurrencies,
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

  const initialize = useCallback(() => {
    fetchCurrencies("", 0, false);
  }, [fetchCurrencies]);

  useEffect(() => {
    if (accessToken) {
      initialize();
    } else {
      console.log("⚠️ Currencies GraphQL hook: No access token, waiting...");
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
