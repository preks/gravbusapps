import { useCallback } from "react";
import { SelectOption } from "../types";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

interface InvestmentAccountResponse {
  id: string;
  name: string;
  businessKey?: string;
  code?: string;
}

export const INVESTMENT_ACCOUNTS_QUERY = `
  query InvestmentAccountsQuery($search: String) {
    InvestmentAccount(
      limit: 20, 
      orderBy: { name: ASC },
      where: { 
        _and: [
          { isDeleted: { _eq: false } },
          { name: { _ilike: $search } }
        ]
      }
    ) {
      id
      name
      businessKey
      code
    }
  }
`;

export const DEFAULT_INVESTMENT_ACCOUNTS_QUERY = `
  query DefaultInvestmentAccountsQuery {
    InvestmentAccount(
      limit: 20, 
      orderBy: { name: ASC },
      where: { isDeleted: { _eq: false } }
    ) {
      id
      name
      businessKey
      code
    }
  }
`;

export const useAccountsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const searchAccounts = useCallback(
    async (searchTerm: string): Promise<SelectOption[]> => {
      if (!context.accessToken) {
        return [];
      }

      // If no search term or less than 2 characters, return default first 20 accounts
      if (!searchTerm.trim() || searchTerm.trim().length < 2) {
        try {
          const response = await graphqlClient.request<{
            InvestmentAccount: InvestmentAccountResponse[];
          }>(DEFAULT_INVESTMENT_ACCOUNTS_QUERY);
          const accountsData = response.InvestmentAccount || [];

          return accountsData.map((account: InvestmentAccountResponse) => ({
            value: account.id,
            label: account.name,
            name: account.name,
            id: account.id,
          }));
        } catch (err) {
          console.error("Error loading default accounts in search:", err);
          return [];
        }
      }

      try {
        // Format search term for PostgreSQL ILIKE operator (case-insensitive)
        const searchPattern = `%${searchTerm.trim()}%`;

        const response = await graphqlClient.request<{
          InvestmentAccount: InvestmentAccountResponse[];
        }>(INVESTMENT_ACCOUNTS_QUERY, {
          search: searchPattern,
        });

        const accountsData = response.InvestmentAccount || [];

        return accountsData.map((account: InvestmentAccountResponse) => ({
          value: account.id,
          label: account.name,
          name: account.name,
          id: account.id,
        }));
      } catch (err) {
        console.error("Error searching accounts:", err);
        return [];
      }
    },
    [context.accessToken, graphqlClient]
  );

  const loadDefaultAccounts = useCallback(async (): Promise<SelectOption[]> => {
    if (!context.accessToken) {
      return [];
    }

    try {
      const response = await graphqlClient.request<{
        InvestmentAccount: InvestmentAccountResponse[];
      }>(DEFAULT_INVESTMENT_ACCOUNTS_QUERY);

      const accountsData = response.InvestmentAccount || [];

      return accountsData.map((account: InvestmentAccountResponse) => ({
        value: account.id,
        label: account.name,
        name: account.name,
        id: account.id,
      }));
    } catch (err) {
      console.error("Error loading default accounts:", err);
      return [];
    }
  }, [context.accessToken, graphqlClient]);

  return {
    searchAccounts,
    loadDefaultAccounts,
  };
};
