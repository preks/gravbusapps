import { useState, useEffect, useCallback } from 'react';
import { useGraphqlClient } from '../../../../../common/network/graphql/useGraphQLClient';
import { getContactsQuery } from '../queries/getContactsQuery';

export interface Contact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
  fullName?: string;
}

interface UseContactsDataResult {
  contacts: Contact[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useContactsData(accessToken: string): UseContactsDataResult {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState<number>(0);
  
  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Function to fetch contacts
  const fetchContacts = useCallback(async () => {
    if (!accessToken) {
      console.warn('No access token available, skipping contacts fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await graphQLClient.request(
        getContactsQuery,
        {
          offset: 0,
        }
      );
      
      // Check if response has the expected structure
      if (!response || !response.Contact) {
        console.warn('Invalid contacts response structure:', response);
        setContacts([]);
        return;
      }
      
      const transformedContacts = response.Contact.map((contact: any) => ({
        id: contact.id,
        firstName: contact.firstName,
        lastName: contact.lastName,
        fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        email: contact.email,
        phone: contact.phone,
        createdAt: contact.createdAt,
        updatedAt: contact.updatedAt
      }));
      
      setContacts(transformedContacts);
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch contacts'));
    } finally {
      setLoading(false);
    }
  }, [graphQLClient, accessToken]);
  
  // Function to manually trigger refetch
  const refetch = useCallback(() => {
    setRefetchCount(prev => prev + 1);
  }, []);
  
  // Fetch contacts on mount and when refetch is called
  useEffect(() => {
    fetchContacts();
  }, [fetchContacts, accessToken, refetchCount]);
  
  return { contacts, loading, error, refetch };
}
