import { useState, useEffect, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface ContactRoleOption {
  id: string;
  name: string;
}

export interface UseGetContactRolesReturn {
  contactRoleOptions: ContactRoleOption[];
  isLoading: boolean;
  error: Error | null;
}

const GET_CONTACT_ROLES_QUERY = `
  query GetContactRoles($search: String) {
    Contact(
      where: {
        _and: [
          { contactRole: { _is_null: false } }
          { contactRole: { _neq: "" } }
          { contactRole: { _ilike: $search } }
        ]
      }
      distinct_on: [contactRole]
      orderBy: [{ contactRole: ASC_NULLS_LAST }]
      limit: 100
    ) {
      contactRole
    }
  }
`;

export const useGetContactRoles = (
  context: BusinessAppContextProps,
  search: string = ""
): UseGetContactRolesReturn => {
  const [contactRoleOptions, setContactRoleOptions] = useState<ContactRoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchContactRoles = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchPattern = search ? `%${search}%` : "%";
      const result = await graphqlClient.request(GET_CONTACT_ROLES_QUERY, {
        search: searchPattern,
      });

      if (result?.Contact) {
        const options = result.Contact
          .filter((contact: any) => contact.contactRole)
          .map((contact: any, index: number) => ({
            id: `contact-role-${contact.contactRole}-${index}`,
            name: contact.contactRole,
          }))
          .sort((a: ContactRoleOption, b: ContactRoleOption) => a.name.localeCompare(b.name));
        setContactRoleOptions(options);
      } else {
        setContactRoleOptions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to fetch contact roles"));
      console.error("Error fetching contact roles:", err);
    } finally {
      setIsLoading(false);
    }
  }, [context.accessToken, search, graphqlClient]);

  useEffect(() => {
    fetchContactRoles();
  }, [fetchContactRoles]);

  return {
    contactRoleOptions,
    isLoading,
    error,
  };
}; 