import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface AccountOption {
  id: string;
  name: string;
}

const GET_ACCOUNTS_QUERY = `
  query GetAccountsForFilter($where: AccountBoolExp, $limit: Int, $offset: Int) {
    Account(
      where: $where
      limit: $limit
      offset: $offset
      orderBy: [{ name: ASC }]
      distinctOn: [name]
    ) {
      id
      name
    }
  }
`;

export const useGetAccounts = (
  context: BusinessAppContextProps,
  search: string = "",
  offset: number = 0
) => {
  const [accounts, setAccounts] = useState<AccountOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchAccounts = useCallback(async () => {
    if (!context.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build where condition with account search
      const whereCondition = {
        isDeleted: { _eq: false },
        ...(search.trim()
          ? {
              name: { _ilike: `%${search.trim()}%` }
            }
          : {}),
      };

      const variables = {
        where: whereCondition,
        limit: 20,
        offset,
      };

      const result = await graphqlClient.request(
        GET_ACCOUNTS_QUERY,
        variables
      );

      if (result?.Account) {
        const accountOptions = result.Account.map((account: any) => ({
          id: account.id,
          name: account.name || "Unnamed Account",
        }));

        setAccounts(accountOptions);
      } else {
        setAccounts([]);
      }
    } catch (err) {
      console.error("Error fetching accounts:", err);
      setError(err);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, offset, graphqlClient]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return {
    accounts,
    isLoading,
    error,
  };
}; 