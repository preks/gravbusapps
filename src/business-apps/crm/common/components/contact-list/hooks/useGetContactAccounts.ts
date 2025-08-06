import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface ContactAccount {
  id: string;
  name: string;
}

const GET_CONTACT_ACCOUNTS_QUERY = `
  query GetContactAccounts($where: ContactBoolExp, $limit: Int, $offset: Int) {
    Contact(
      where: $where
      limit: $limit
      offset: $offset
      distinctOn: [accountId]
    ) {
      account {
        id
        name
      }
    }
  }
`;

export const useGetContactAccounts = (
  context: BusinessAppContextProps,
  search: string = "",
  offset: number = 0
) => {
  const [contactAccounts, setContactAccounts] = useState<ContactAccount[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchContactAccounts = useCallback(async () => {
    if (!context.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build where condition with account search and ensure account exists
      const whereCondition = {
        isDeleted: { _eq: false },
        account: {
          _and: [
            { id: { _isNull: false } },
            ...(search.trim()
              ? [
                  {
                    _or: [
                      { name: { _ilike: `%${search}%` } },
                    ],
                  },
                ]
              : []),
          ],
        },
      };

      const variables = {
        where: whereCondition,
        limit: 20,
        offset,
      };

      const result = await graphqlClient.request(
        GET_CONTACT_ACCOUNTS_QUERY,
        variables
      );

      if (result?.Contact) {
        const accounts = result.Contact.filter((contact: any) => contact.account) // Ensure account exists
          .map((contact: any) => ({
            id: contact.account.id,
            name: contact.account.name || "Unnamed Account",
          }))
          .filter((account: ContactAccount, index: number, self: ContactAccount[]) => {
            // Remove duplicates by account ID
            return self.findIndex(a => a.id === account.id) === index;
          })
          .slice(0, 20); // Frontend enforcement of limit

        setContactAccounts(accounts);
      } else {
        setContactAccounts([]);
      }
    } catch (err) {
      console.error("Error fetching contact accounts:", err);
      setError(err);
      setContactAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, offset, graphqlClient]);

  useEffect(() => {
    fetchContactAccounts();
  }, [fetchContactAccounts]);

  return {
    contactAccounts,
    isLoading,
    error,
  };
}; 