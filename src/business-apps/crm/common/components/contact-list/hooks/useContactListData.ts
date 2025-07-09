import { useState, useCallback } from 'react';
import { Contact, UseContactListDataReturn } from '../types';

interface UseContactListDataParams {
  search?: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  accessToken: string;
  sourceApp?: string;
  contactTypes?: string[];
  jobTitles?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export const useContactListData = (params: UseContactListDataParams): UseContactListDataReturn => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadPage = useCallback(async (page: number, pageSize = 20, additionalFilters?: any) => {
    if (!params.accessToken) {
      console.warn('No access token provided for contact data loading');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Mock data for now - will be replaced with actual GraphQL queries
      const mockContacts: Contact[] = Array.from({ length: pageSize }, (_, index) => ({
        id: `contact-${page}-${index + 1}`,
        firstName: `Contact${(page - 1) * pageSize + index + 1}`,
        lastName: 'Person',
        email: `contact${(page - 1) * pageSize + index + 1}@example.com`,
        phone: `+1-555-${String(100 + index).padStart(3, '0')}-0000`,
        jobTitle: ['CEO', 'CTO', 'Manager', 'Director', 'Analyst', 'Consultant'][index % 6],
        bio: `Professional with extensive experience in ${['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail'][index % 5]}.`,
        linkedinUrl: `https://linkedin.com/in/contact${(page - 1) * pageSize + index + 1}`,
        contactRole: ['Primary', 'Secondary', 'Technical'][index % 3],
        contactType: ['Executive', 'Technical', 'Financial'][index % 3],
        academicTitle: index % 3 === 0 ? {
          id: `title-${index}`,
          value: ['Dr.', 'Prof.', 'MBA'][index % 3]
        } : undefined,
        account: index % 2 === 0 ? {
          id: `account-${index}`,
          name: `Account ${index + 1}`
        } : undefined,
        accountId: index % 2 === 0 ? `account-${index}` : undefined,
        ownerEmployee: {
          id: `employee-${index}`,
          firstName: `Owner${index}`,
          lastName: 'Employee',
          displayName: `Owner${index} Employee`,
          pictureThumbnail: undefined
        },
        sourceApp: params.sourceApp,
        createdAt: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date().toISOString()
      }));

      setContacts(mockContacts);
      setTotal(params.sourceApp === 'CRM' ? 89 : 12); // Mock totals based on sourceApp
      setHasMore(page * pageSize < (params.sourceApp === 'CRM' ? 89 : 12));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [params.accessToken, params.sourceApp, params.search, params.sortField, params.sortOrder, params.contactTypes, params.jobTitles, params.createdAfter, params.createdBefore]);

  const loadMore = useCallback(() => {
    // Load more functionality for infinite scroll
    console.log('Load more contacts requested');
  }, []);

  const retry = useCallback(() => {
    console.log('Retrying contact data load');
    // Will be implemented with actual retry logic
  }, []);

  return {
    contacts,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  };
}; 