import { useState, useCallback } from "react";
import { SelectOption } from "../types";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

interface AccountFromLead {
  account: {
    id: string;
    name: string;
  };
}

interface PaginatedAccountState {
  accounts: SelectOption[];
  offset: number;
  hasMore: boolean;
  isLoading: boolean;
  searchTerm: string;
}

const GET_ACCOUNTS_FROM_LEADS_QUERY = `
  query GetAccountsFromLeads($limit: Int, $offset: Int, $search: String) {
    Lead(
      distinctOn: accountId
      limit: $limit
      offset: $offset
      where: { 
        account: { name: { _ilike: $search } }
      }
    ) {
      account {
        id
        name
      }
    }
  }
`;

export const useAccountsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const [accountState, setAccountState] = useState<PaginatedAccountState>({
    accounts: [],
    offset: 0,
    hasMore: true,
    isLoading: false,
    searchTerm: "",
  });

  const searchAccounts = useCallback(
    async (searchTerm: string): Promise<SelectOption[]> => {
      if (!context.accessToken) {
        setAccountState({
          accounts: [],
          offset: 0,
          hasMore: true,
          isLoading: false,
          searchTerm: "",
        });
        return [];
      }

      try {
        setAccountState((prev) => ({ ...prev, isLoading: true, searchTerm }));

        // For empty search, use wildcard to get all companies
        const searchPattern = searchTerm.trim() ? `%${searchTerm}%` : "%";
        const variables = {
          limit: 20,
          offset: 0,
          search: searchPattern,
        };

        const response = await graphqlClient.request<{
          Lead: AccountFromLead[];
        }>(GET_ACCOUNTS_FROM_LEADS_QUERY, variables);

        const leadsData = response.Lead || [];
        const uniqueAccounts = new Map<string, SelectOption>();

        // Filter unique accounts from the Lead data
        leadsData.forEach((lead: AccountFromLead) => {
          if (lead.account && !uniqueAccounts.has(String(lead.account.id))) {
            uniqueAccounts.set(String(lead.account.id), {
              value: lead.account.id,
              label: lead.account.name,
              name: lead.account.name,
              id: lead.account.id,
            });
          }
        });

        const accountsArray = Array.from(uniqueAccounts.values());
        const hasMore = leadsData.length === 20; // If we got full page, there might be more

        setAccountState({
          accounts: accountsArray,
          offset: 20,
          hasMore,
          isLoading: false,
          searchTerm,
        });

        return accountsArray;
      } catch (err) {
        console.error("Error searching accounts:", err);
        setAccountState((prev) => ({ ...prev, isLoading: false }));
        return [];
      }
    },
    [context.accessToken, graphqlClient]
  );

  const loadMoreAccounts = useCallback(async (): Promise<SelectOption[]> => {
    if (
      !context.accessToken ||
      !accountState.hasMore ||
      accountState.isLoading
    ) {
      return accountState.accounts;
    }

    try {
      setAccountState((prev) => ({ ...prev, isLoading: true }));

      // For empty search, use wildcard to get all companies
      const searchPattern = accountState.searchTerm.trim()
        ? `%${accountState.searchTerm}%`
        : "%";
      const variables = {
        limit: 20,
        offset: accountState.offset,
        search: searchPattern,
      };

      const response = await graphqlClient.request<{ Lead: AccountFromLead[] }>(
        GET_ACCOUNTS_FROM_LEADS_QUERY,
        variables
      );

      const leadsData = response.Lead || [];
      const uniqueAccounts = new Map<string, SelectOption>();

      // Add existing accounts to map first
      accountState.accounts.forEach((account) => {
        uniqueAccounts.set(String(account.id), account);
      });

      // Add new accounts from the Lead data
      leadsData.forEach((lead: AccountFromLead) => {
        if (lead.account && !uniqueAccounts.has(String(lead.account.id))) {
          uniqueAccounts.set(String(lead.account.id), {
            value: lead.account.id,
            label: lead.account.name,
            name: lead.account.name,
            id: lead.account.id,
          });
        }
      });

      const updatedAccountsArray = Array.from(uniqueAccounts.values());
      const hasMore = leadsData.length === 20; // If we got full page, there might be more

      setAccountState({
        accounts: updatedAccountsArray,
        offset: accountState.offset + 20,
        hasMore,
        isLoading: false,
        searchTerm: accountState.searchTerm,
      });

      return updatedAccountsArray;
    } catch (err) {
      console.error("Error loading more accounts:", err);
      setAccountState((prev) => ({ ...prev, isLoading: false }));
      return accountState.accounts;
    }
  }, [context.accessToken, graphqlClient, accountState]);

  return {
    searchAccounts,
    loadMoreAccounts,
    accountState,
  };
};
