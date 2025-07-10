import { useCallback } from 'react';
import { SelectOption } from '../types';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface ContactResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

const GET_CONTACTS_QUERY = `
  query GetContacts($limit: Int, $offset: Int, $search: String) {
    Contact(
      limit: $limit
      offset: $offset
      where: {
        _or: [
          { firstName: { _ilike: $search } }
          { lastName: { _ilike: $search } }
          { email: { _ilike: $search } }
        ]
      }
      orderBy: [
        { firstName: ASC }
        { lastName: ASC }
      ]
    ) {
      id
      firstName
      lastName
      email
      phone
    }
  }
`;

export const useContactsData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const searchContacts = useCallback(async (searchTerm: string): Promise<SelectOption[]> => {
    if (!context.accessToken || !searchTerm.trim()) {
      return [];
    }
    
    try {
      const searchPattern = `%${searchTerm}%`;
      const variables = {
        limit: 50,
        offset: 0,
        search: searchPattern
      };

      const response = await graphqlClient.request<{ Contact: ContactResponse[] }>(
        GET_CONTACTS_QUERY,
        variables
      );

      const contactsData = response.Contact || [];
      return contactsData.map((contact: ContactResponse) => ({
        value: contact.id,
        label: `${contact.firstName} ${contact.lastName}`.trim(),
        name: `${contact.firstName} ${contact.lastName}`.trim(),
        id: contact.id,
        extraInfo: {
          email: contact.email,
          phone: contact.phone,
        }
      }));
    } catch (err) {
      console.error('Error searching contacts:', err);
      return [];
    }
  }, [context.accessToken, graphqlClient]);

  return {
    searchContacts
  };
}; 