import { useState, useCallback, useEffect, useRef } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { useDebounce } from '@/common/hooks/useDebounce';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { SelectOption } from '../types';

// GraphQL query for fetching investment contacts
const GET_INVESTMENT_CONTACTS_LIST = `
  query GetInvestmentContactsList(
    $limit: Int = 20
    $offset: Int = 0
    $search: String
  ) {
    InvestmentContact(
      where: { 
        isDeleted: { _eq: false }
        _or: [
          { firstName: { _ilike: $search } }
          { lastName: { _ilike: $search } }
          { fullName: { _ilike: $search } }
          { email: { _ilike: $search } }
          { jobPosition: { _ilike: $search } }
        ]
      }
      limit: $limit
      offset: $offset
    ) {
      id
      firstName
      lastName
      fullName
      email
      jobPosition
      ownerEmployee {
        displayName
      }
    }
    InvestmentContactAggregate(
      where: { 
        isDeleted: { _eq: false }
        _or: [
          { firstName: { _ilike: $search } }
          { lastName: { _ilike: $search } }
          { fullName: { _ilike: $search } }
          { email: { _ilike: $search } }
          { jobPosition: { _ilike: $search } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

export const useContactSelection = (context: BusinessAppContextProps) => {
  const [contacts, setContacts] = useState<SelectOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [currentSearch, setCurrentSearch] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const offsetRef = useRef(0);
  const graphqlClient = useGraphQLClient(context.accessToken);

  // Debounce the search term to prevent excessive API calls
  const debouncedSearch = useDebounce(searchTerm, 300);

  const fetchContacts = useCallback(async (
    searchTerm: string = '', 
    resetOffset: boolean = false
  ) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const currentOffset = resetOffset ? 0 : offsetRef.current;
      const variables = {
        limit: 20,
        offset: currentOffset,
        search: searchTerm.trim() || null,
      };

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
      }>(GET_INVESTMENT_CONTACTS_LIST, {
        limit: variables.limit,
        offset: variables.offset,
        search: variables.search ? `%${variables.search}%` : null,
      });

      if (result?.InvestmentContact && result?.InvestmentContactAggregate) {
        const newContacts = result.InvestmentContact;
        const totalCount = result.InvestmentContactAggregate.aggregate.count;

        const contactOptions: SelectOption[] = newContacts.map(contact => ({
          id: contact.id,
          value: contact.id,
          label: contact.fullName || `${contact.firstName} ${contact.lastName}`,
          name: contact.fullName || `${contact.firstName} ${contact.lastName}`,
          extraInfo: {
            email: contact.email,
            jobPosition: contact.jobPosition,
            organizationalUnit: contact.ownerEmployee?.displayName || 'Unknown'
          }
        }));

        setContacts(prevContacts => 
          resetOffset ? contactOptions : [...prevContacts, ...contactOptions]
        );
        setTotal(totalCount);
        setHasMore(newContacts.length === 20);
        offsetRef.current = currentOffset + newContacts.length;
      }
    } catch (error) {
      console.error('Error fetching contacts:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch contacts');
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient]);

  const searchContacts = useCallback((search: string) => {
    setSearchTerm(search);
  }, []);

  const loadMoreContacts = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchContacts(currentSearch, false);
    }
  }, [fetchContacts, isLoading, hasMore, currentSearch]);

  // Effect to handle debounced search
  useEffect(() => {
    if (debouncedSearch !== currentSearch) {
      setCurrentSearch(debouncedSearch);
      fetchContacts(debouncedSearch, true);
    }
  }, [debouncedSearch, currentSearch, fetchContacts]);

  // Initial load
  useEffect(() => {
    if (!isInitialLoadComplete) {
      fetchContacts('', true);
      setIsInitialLoadComplete(true);
    }
  }, [fetchContacts, isInitialLoadComplete]);

  return {
    contacts,
    isLoading,
    hasMore,
    total,
    error,
    searchContacts,
    loadMoreContacts
  };
};
