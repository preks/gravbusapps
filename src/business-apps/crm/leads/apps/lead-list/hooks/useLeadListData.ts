import { useState, useCallback } from 'react';
import { Lead, LeadQueryVariables } from '../types';
import { useGetLeadsData } from '../queries/LeadQueries';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface UseLeadListDataProps {
  search?: string;
  accessToken: string;
}

interface UseLeadListDataReturn {
  leads: Lead[];
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (page: number, pageSize?: number, additionalFilters?: any) => Promise<void>;
  retry: () => void;
}

export const useLeadListData = ({ 
  search = '', 
  accessToken 
}: UseLeadListDataProps): UseLeadListDataReturn => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);
  
  const { fetchLeadsData } = useGetLeadsData({ accessToken } as BusinessAppContextProps);

  const buildWhereClause = useCallback((searchTerm: string = '', additionalFilters: any = {}) => {
    const baseWhere = { isDeleted: { _eq: false } };
    
    if (!searchTerm && Object.keys(additionalFilters).length === 0) {
      return baseWhere;
    }

    const conditions: any[] = [];

    // Add search conditions
    if (searchTerm) {
      const searchConditions = [
        { firstName: { _ilike: `%${searchTerm}%` } },
        { lastName: { _ilike: `%${searchTerm}%` } },
        { email: { _ilike: `%${searchTerm}%` } },
        { companyName: { _ilike: `%${searchTerm}%` } },
        { position: { _ilike: `%${searchTerm}%` } },
        { ownerEmployee: { firstName: { _ilike: `%${searchTerm}%` } } },
        { ownerEmployee: { lastName: { _ilike: `%${searchTerm}%` } } },
        { ownerEmployee: { fullName: { _ilike: `%${searchTerm}%` } } },
        { account: { name: { _ilike: `%${searchTerm}%` } } },
        { contact: { firstName: { _ilike: `%${searchTerm}%` } } },
        { contact: { lastName: { _ilike: `%${searchTerm}%` } } },
        { contact: { email: { _ilike: `%${searchTerm}%` } } }
      ];
      conditions.push({ _or: searchConditions });
    }

    // Add additional filters
    if (Object.keys(additionalFilters).length > 0) {
      conditions.push(additionalFilters);
    }

    return {
      ...baseWhere,
      _and: conditions
    };
  }, []);

  const loadPage = useCallback(async (
    page: number, 
    newPageSize: number = pageSize, 
    additionalFilters: any = {}
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const offset = (page - 1) * newPageSize;
      const where = buildWhereClause(search, additionalFilters);
      
      const variables: LeadQueryVariables = {
        offset,
        limit: newPageSize,
        orderBy: [{ createdAt: "DESC_NULLS_LAST" }],
        where
      };

      const result = await fetchLeadsData(variables);
      
      setLeads(result.Lead || []);
      setTotal(result.LeadAggregate?.aggregate?.count || 0);
      setCurrentPage(page);
      setPageSize(newPageSize);
      setHasMore((result.Lead || []).length === newPageSize);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load leads'));
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fetchLeadsData, search, pageSize, buildWhereClause]);

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    loadPage(currentPage + 1);
  }, [hasMore, loading, currentPage, loadPage]);

  const retry = useCallback(() => {
    loadPage(currentPage);
  }, [currentPage, loadPage]);

  return {
    leads,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  };
}; 