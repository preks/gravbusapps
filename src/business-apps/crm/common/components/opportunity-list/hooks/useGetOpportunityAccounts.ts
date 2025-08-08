import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface AccountOption {
  id: string;
  name: string;
}

export interface UseGetOpportunityAccountsReturn {
  accountOptions: AccountOption[];
  isLoading: boolean;
  error: Error | null;
}

const GET_ACCOUNTS_QUERY = `
  query GetAccountsForFilter($search: String) {
    Account(
      where: {
        _and: [
          { name: { _ilike: $search } }
        ]
      }
      orderBy: [{ name: ASC_NULLS_LAST }]
      limit: 100
    ) {
      id
      name
    }
  }
`;

export const useGetOpportunityAccounts = (
  context: BusinessAppContextProps,
  search: string = ""
): UseGetOpportunityAccountsReturn => {
  const [accountOptions, setAccountOptions] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchAccounts = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchPattern = search ? `%${search}%` : "%";
      const result = await graphqlClient.request(GET_ACCOUNTS_QUERY, {
        search: searchPattern,
      });

      if (result?.Account) {
        const options = result.Account.map((account: any) => ({
          id: account.id,
          name: account.name || "Unknown Account",
        }));
        setAccountOptions(options);
      } else {
        setAccountOptions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch accounts"));
      console.error("Error fetching accounts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, graphqlClient]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accountOptions,
    isLoading,
    error,
  };
}; 