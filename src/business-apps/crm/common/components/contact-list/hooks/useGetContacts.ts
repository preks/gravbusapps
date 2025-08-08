import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

export interface ContactOption {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  jobTitle?: string;
  accountName?: string;
}

const GET_CONTACTS_QUERY = `
  query GetContactsForFilter($where: ContactBoolExp, $limit: Int, $offset: Int) {
    Contact(
      where: $where
      limit: $limit
      offset: $offset
      orderBy: [{ lastName: ASC }, { firstName: ASC }]
    ) {
      id
      firstName
      lastName
      email
      jobTitle
      account {
        id
        name
      }
    }
  }
`;

export const useGetContacts = (
  context: BusinessAppContextProps,
  search: string = "",
  offset: number = 0
) => {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<any>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchContacts = useCallback(async () => {
    if (!context.accessToken) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Build where condition with contact search
      const whereCondition = {
        isDeleted: { _eq: false },
        ...(search.trim()
          ? {
              _or: [
                { firstName: { _ilike: `%${search}%` } },
                { lastName: { _ilike: `%${search}%` } },
                { email: { _ilike: `%${search}%` } },
              ],
            }
          : {}),
      };

      const variables = {
        where: whereCondition,
        limit: 20,
        offset,
      };

      const result = await graphqlClient.request(
        GET_CONTACTS_QUERY,
        variables
      );

      if (result?.Contact) {
        const contactOptions = result.Contact.map((contact: any) => {
          // Build base name
          const baseName = `${contact.firstName || ""} ${contact.lastName || ""}`.trim() || "Unnamed Contact";
          
          // Add company information to distinguish duplicates (without email)
          const displayName = contact.account?.name 
            ? `${baseName} (${contact.account.name})`
            : baseName;

          return {
            id: contact.id,
            name: displayName,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            jobTitle: contact.jobTitle,
            accountName: contact.account?.name,
          };
        });

        setContacts(contactOptions);
      } else {
        setContacts([]);
      }
    } catch (err) {
      console.error("Error fetching contacts:", err);
      setError(err);
      setContacts([]);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, offset, graphqlClient]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  return {
    contacts,
    isLoading,
    error,
  };
}; 