import { useState, useCallback } from 'react';
import { Account, UseAccountListDataReturn } from '../types';
import { useGetAccountsData, AccountData } from '../queries/AccountQueries';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { enforceQueryLimit } from '../../../utils/queryLimits';

interface UseAccountListDataParams {
  search?: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  context: BusinessAppContextProps;
  sourceApp?: string;
  accountTypes?: string[];
  industries?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

const transformAccountData = (apiAccount: AccountData): Account => {
  const city = apiAccount.addresses?.[0]?.city;
  const country = apiAccount.addresses?.[0]?.country?.value;
  let location = '';
  if (city && country) {
    location = `${city}, ${country}`;
  } else if (city) {
    location = city;
  } else if (country) {
    location = country;
  }

  return {
    id: apiAccount.id,
    name: apiAccount.name || '',
    website: apiAccount.website || '',
    phone: apiAccount.contact?.[0]?.phone || '',
    email: apiAccount.contact?.[0]?.email || '',
    industry: {
      id: apiAccount.industry?.id || '',
      value: apiAccount.industry?.value || ''
    },
    type: {
      id: apiAccount.legalForm?.id || '',
      value: apiAccount.legalForm?.value || ''
    },
    ownerEmployee: {
      id: apiAccount.ownerEmployee?.id || '',
      firstName: apiAccount.ownerEmployee?.firstName || '',
      lastName: apiAccount.ownerEmployee?.lastName || '',
      displayName: apiAccount.ownerEmployee 
        ? `${apiAccount.ownerEmployee.firstName} ${apiAccount.ownerEmployee.lastName}` 
        : '',
      pictureThumbnail: undefined
    },
    annualRevenue: 0, // Not available in current schema
    numberOfEmployees: parseInt(apiAccount.numberOfEmployees?.value || '0') || 0,
    sourceApp: '',
    createdAt: apiAccount.createdAt,
    updatedAt: apiAccount.updatedAt
  };
};

export const useAccountListData = (params: UseAccountListDataParams): UseAccountListDataReturn => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const { fetchAccountsData } = useGetAccountsData(params.context);

  const loadPage = useCallback(async (page: number, pageSize = 20, additionalFilters?: any) => {
    if (!params.context.accessToken) {
      console.warn('No access token provided for account data loading');
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
        const searchPattern = { _iregex: params.search.trim() };
        whereCondition._or = [
          { name: searchPattern },
          { website: searchPattern },
          { legalForm: { value: searchPattern } },
          { industry: { value: searchPattern } },
          { ownerEmployee: { firstName: searchPattern } },
          { ownerEmployee: { lastName: searchPattern } },
          { addresses: { city: searchPattern } },
          { addresses: { country: { value: searchPattern } } }
        ];
      }

      // Add industry filtering
      if (params.industries && params.industries.length > 0) {
        whereCondition.industry = { value: { _in: params.industries } };
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
      if (params.sortField && params.sortOrder) {
        if (params.sortField === 'name') {
          orderBy.name = params.sortOrder;
        } else if (params.sortField === 'website') {
          orderBy.website = params.sortOrder;
        } else if (params.sortField === 'createdAt') {
          orderBy.createdAt = params.sortOrder;
        } else if (params.sortField === 'ownerEmployeeId') {
          orderBy.ownerEmployee = { lastName: params.sortOrder };
        } else if (params.sortField === 'typeRef') {
          orderBy.legalForm = { value: params.sortOrder };
        } else if (params.sortField === 'industryRef') {
          orderBy.industry = { value: params.sortOrder };
        }
      } else {
        // No sorting - use natural order (by ID)
        orderBy.id = 'ASC';
      }

      const result = await fetchAccountsData({
        offset,
        limit: safePageSize,
        where: whereCondition,
        orderBy: Object.keys(orderBy).length > 0 ? [orderBy] : [{ createdAt: 'DESC' }]
      });

      if (result?.Account) {
        const transformedAccounts = result.Account.map(transformAccountData);
        setAccounts(transformedAccounts);
        
        const totalCount = result.AccountAggregate?.aggregate?.count || 0;
        setTotal(totalCount);
        setHasMore(offset + safePageSize < totalCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load accounts'));
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchAccountsData, params.search, params.sortField, params.sortOrder, params.industries, params.createdAfter, params.createdBefore, params.context.accessToken]);

  const loadMore = useCallback(() => {
    console.log('Load more accounts requested');
    // Implementation for infinite scroll if needed
  }, []);

  const retry = useCallback(() => {
    console.log('Retrying account data load');
    // Will be implemented with actual retry logic
  }, []);

  return {
    accounts,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  };
}; 