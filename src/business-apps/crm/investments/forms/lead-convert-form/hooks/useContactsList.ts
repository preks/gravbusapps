import { useState, useCallback, useEffect } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useDebounce } from '@/common/hooks/useDebounce';
import { GET_INVESTMENT_CONTACTS_LIST } from '../queries/leadQueries';
import { ContactOption } from '../types';

// Enhanced hook for contacts with infinite scrolling
export const useContactsList = (accessToken: string) => {
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [currentSearch, setCurrentSearch] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const graphqlClient = useGraphQLClient(accessToken);

  // Debounce the search term to prevent excessive API calls
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchContacts = useCallback(async (
    searchTerm: string = '', 
    resetOffset: boolean = false
  ) => {
    if (!accessToken) return;
    
    setIsLoading(true);
    try {
      const currentOffset = resetOffset ? 0 : offset;
      const variables = {
        limit: 20,
        offset: currentOffset,
        search: searchTerm.trim() || null,
      };

      const query = GET_INVESTMENT_CONTACTS_LIST(variables);
      const result = await graphqlClient.request<{
        InvestmentContact: Array<{
          id: string;
          firstName?: string;
          lastName?: string;
          fullName?: string;
          email?: string;
          jobPosition?: string;
          ownerEmployee?: { displayName: string };
        }>;
        InvestmentContactAggregate: {
          aggregate: { count: number };
        };
      }>(query);

      if (result?.InvestmentContact && result?.InvestmentContactAggregate) {
        const newContacts = result.InvestmentContact;
        const totalCount = result.InvestmentContactAggregate.aggregate.count;

        const contactOptions: ContactOption[] = newContacts.map(contact => ({
          id: contact.id,
          value: contact.id,
          label: contact.fullName || `${contact.firstName} ${contact.lastName}`,
          name: contact.fullName || `${contact.firstName} ${contact.lastName}`,
          email: contact.email,
          jobPosition: contact.jobPosition
        }));

        setContacts(prevContacts => 
          resetOffset ? contactOptions : [...prevContacts, ...contactOptions]
        );
        setTotal(totalCount);
        setHasMore(newContacts.length === 20);
        setOffset(currentOffset + newContacts.length);
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, graphqlClient, offset]);

  const searchContacts = useCallback((searchTerm: string = '') => {
    setSearchTerm(searchTerm);
  }, []);

  // Effect to trigger search when debounced search term changes
  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      setCurrentSearch(debouncedSearch);
      setOffset(0);
      fetchContacts(debouncedSearch, true);
    }
  }, [debouncedSearch, currentSearch, fetchContacts]);

  const loadMoreContacts = useCallback(async () => {
    if (!isLoading && hasMore) {
      await fetchContacts(currentSearch, false);
    }
  }, [isLoading, hasMore, fetchContacts, currentSearch]);

  // Load initial contacts on mount
  useEffect(() => {
    const loadInitialContacts = async () => {
      if (!accessToken || !graphqlClient || isInitialLoadComplete) return;
      await fetchContacts('', true);
      setIsInitialLoadComplete(true);
    };

    loadInitialContacts();
  }, [accessToken, graphqlClient]);

  return { 
    contacts, 
    isLoading, 
    hasMore, 
    total,
    searchContacts, 
    loadMoreContacts 
  };
};
