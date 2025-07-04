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
  loadMore: () => void;
  hasMore: boolean;
  search: (searchText: string) => void;
}

export function useContactsData(accessToken: string): UseContactsDataResult {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [refetchCount, setRefetchCount] = useState<number>(0);
  const [offset, setOffset] = useState<number>(0);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [searchText, setSearchText] = useState<string>('');
  const limit = 20;
  
  // Get GraphQL client
  const graphQLClient = useGraphqlClient(accessToken);
  
  // Function to fetch contacts
  const fetchContacts = useCallback(async (currentOffset: number, isLoadMore: boolean = false, currentSearchText: string = '') => {
    if (!accessToken) {
      console.warn('No access token available, skipping contacts fetch');
      setLoading(false);
      return;
    }

    setLoading(true);
    if (!isLoadMore) {
      setError(null);
    }
    
    try {
      let whereCondition = {};
      
      if (currentSearchText && currentSearchText.trim() !== '') {
        whereCondition = {
          _or: [
            { firstName: { _iregex: currentSearchText } },
            { lastName: { _iregex: currentSearchText } }
          ]
        };
      }

      const response = await graphQLClient.request(
        getContactsQuery,
        {
          offset: currentOffset,
          limit: limit,
          where: whereCondition,
        }
      );
      
      if (!response || !response.Contact) {
        console.warn('Invalid contacts response structure:', response);
        if (!isLoadMore) {
          setContacts([]);
        }
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
      
      setHasMore(transformedContacts.length === limit);
      
      if (isLoadMore) {
        setContacts(prev => [...prev, ...transformedContacts]);
      } else {
        setContacts(transformedContacts);
      }
    } catch (err) {
      console.error('Error fetching contacts:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch contacts'));
    } finally {
      setLoading(false);
    }
  }, [graphQLClient, accessToken, limit]);
  
  // Function to manually trigger refetch
  const refetch = useCallback(() => {
    setOffset(0);
    setRefetchCount(prev => prev + 1);
  }, []);
  
  const loadMore = useCallback(() => {
    if (!loading && hasMore) {
      const newOffset = offset + limit;
      setOffset(newOffset);
      fetchContacts(newOffset, true, searchText);
    }
  }, [loading, hasMore, offset, limit, fetchContacts, searchText]);
  
  // Function to search contacts
  const search = useCallback((text: string) => {
    setSearchText(text);
    setOffset(0);
    
    // When search text is empty, completely reset the contacts list
    if (!text || text.trim() === '') {
      setContacts([]); // Clear current contacts before fetching
    }
    
    // Fetch with the search text (empty or not)
    fetchContacts(0, false, text);
  }, [fetchContacts]);
  
  // Fetch contacts on mount and when refetch is called
  useEffect(() => {
    fetchContacts(0, false, searchText);
    setOffset(0);
  }, [fetchContacts, accessToken, refetchCount]);
  
  return { contacts, loading, error, refetch, loadMore, hasMore, search };
}
