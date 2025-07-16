import { useState, useCallback } from 'react';
import { Contact, UseContactListDataReturn } from '../types';
import { useGetContactsData, ContactData } from '../queries/ContactQueries';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { enforceQueryLimit } from '../../../utils/queryLimits';

interface UseContactListDataParams {
  search?: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  context: BusinessAppContextProps;
  sourceApp?: string;
  contactTypes?: string[];
  jobTitles?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

const transformContactData = (apiContact: ContactData): Contact => {
  return {
    id: apiContact.id,
    firstName: apiContact.firstName || '',
    lastName: apiContact.lastName || '',
    email: apiContact.email || '',
    phone: apiContact.phone || '',
    jobTitle: apiContact.jobTitle || '',
    bio: apiContact.bio || '',
    linkedinUrl: apiContact.linkedinUrl?.trim() || '',
    contactRole: apiContact.contactRole || '',
    contactType: apiContact.contactType || '',
    academicTitle: apiContact.academicTitle ? {
      id: apiContact.academicTitle.id,
      value: apiContact.academicTitle.value
    } : undefined,
    account: apiContact.account ? {
      id: apiContact.account.id || '',
      name: apiContact.account.name || ''
    } : undefined,
    accountId: apiContact.accountId || '',
    ownerEmployee: apiContact.ownerEmployee ? {
      id: apiContact.ownerEmployee.id,
      firstName: apiContact.ownerEmployee.firstName || '',
      lastName: apiContact.ownerEmployee.lastName || '',
      displayName: apiContact.ownerEmployee.displayName || 
        apiContact.ownerEmployee.fullName ||
        `${apiContact.ownerEmployee.firstName} ${apiContact.ownerEmployee.lastName}`,
      pictureThumbnail: undefined
    } : undefined,
    sourceApp: '',
    createdAt: apiContact.createdAt || '',
    updatedAt: apiContact.updatedAt || ''
  };
};

export const useContactListData = (params: UseContactListDataParams): UseContactListDataReturn => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const { fetchContactsData } = useGetContactsData(params.context);

  const loadPage = useCallback(async (page: number, pageSize = 20, additionalFilters?: any) => {
    if (!params.context.accessToken) {
      console.warn('No access token provided for contact data loading');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Enforce query limit to ensure optimal performance
      const safePageSize = enforceQueryLimit(pageSize);
      const offset = (page - 1) * safePageSize;
      
      // Build where conditions
      const whereCondition: any = {
        isDeleted: { _eq: false }
      };

      // Add search functionality
      if (params.search?.trim()) {
        const searchPattern = { _ilike: `%${params.search.trim()}%` };
        whereCondition._or = [
          { firstName: searchPattern },
          { lastName: searchPattern },
          { email: searchPattern },
          { phone: searchPattern },
          { jobTitle: searchPattern },
          { account: { name: searchPattern } },
          { ownerEmployee: { firstName: searchPattern } },
          { ownerEmployee: { lastName: searchPattern } }
        ];
      }

      // Add contact type filtering
      if (params.contactTypes && params.contactTypes.length > 0) {
        whereCondition.contactType = { _in: params.contactTypes };
      }

      // Add job title filtering
      if (params.jobTitles && params.jobTitles.length > 0) {
        whereCondition.jobTitle = { _in: params.jobTitles };
      }

      // Add date filtering
      if (params.createdAfter) {
        whereCondition.createdAt = { _gte: params.createdAfter };
      }
      if (params.createdBefore) {
        if (whereCondition.createdAt) {
          whereCondition.createdAt._lte = params.createdBefore;
        } else {
          whereCondition.createdAt = { _lte: params.createdBefore };
        }
      }

      // Build order by condition
      const orderBy: any = {};
      if (params.sortField && params.sortField !== '' && params.sortOrder) {
        if (params.sortField === 'firstName') {
          orderBy.firstName = params.sortOrder;
        } else if (params.sortField === 'lastName') {
          orderBy.lastName = params.sortOrder;
        } else if (params.sortField === 'email') {
          orderBy.email = params.sortOrder;
        } else if (params.sortField === 'jobTitle') {
          orderBy.jobTitle = params.sortOrder;
        } else if (params.sortField === 'createdAt') {
          orderBy.createdAt = params.sortOrder;
        } else if (params.sortField === 'ownerEmployeeId') {
          orderBy.ownerEmployee = { lastName: params.sortOrder };
        }
      } else {
        // No sorting - use natural order (by ID)
        orderBy.id = 'ASC';
      }

      const result = await fetchContactsData({
        offset,
        limit: safePageSize,
        where: whereCondition,
        orderBy: Object.keys(orderBy).length > 0 ? [orderBy] : [{ createdAt: 'DESC' }]
      });

      if (result?.Contact) {
        const transformedContacts = result.Contact.map(transformContactData);
        setContacts(transformedContacts);
        
        const totalCount = result.ContactAggregate?.aggregate?.count || 0;
        setTotal(totalCount);
        setHasMore(offset + safePageSize < totalCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load contacts'));
      console.error('Error loading contacts:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchContactsData, params.search, params.sortField, params.sortOrder, JSON.stringify(params.contactTypes), JSON.stringify(params.jobTitles), params.createdAfter, params.createdBefore, params.context.accessToken]);

  const loadMore = useCallback(() => {
    console.log('Load more contacts requested');
    // Implementation for infinite scroll if needed
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