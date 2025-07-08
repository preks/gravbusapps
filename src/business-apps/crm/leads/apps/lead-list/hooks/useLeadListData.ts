import { useState, useCallback } from 'react';
import { Lead, LeadQueryVariables } from '../types';
import { useGetLeadsData } from '../queries/LeadQueries';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { LeadFilters } from './useLeadFilters';

interface UseLeadListDataProps extends LeadFilters {
  sortField?: string;
  sortOrder?: 'ASC' | 'DESC';
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
  leadStatuses = [],
  leadRatings = [],
  leadSources = [],
  industries = [],
  companySizes = [],
  createdAfter,
  createdBefore,
  sortField = 'createdAt',
  sortOrder = 'DESC',
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



  const loadPage = useCallback(async (
    targetPage: number, 
    newPageSize: number = pageSize, 
    additionalFilters: any = {}
  ) => {
    setLoading(true);
    setError(null);
    
    try {
      const offset = (targetPage - 1) * newPageSize;
      
      // Build where clause directly (similar to employee hook pattern)
      const baseWhere = { isDeleted: { _eq: false } };
      const conditions: any[] = [];

      // Add search conditions
      if (search) {
        const searchConditions = [
          { firstName: { _ilike: `%${search}%` } },
          { lastName: { _ilike: `%${search}%` } },
          { email: { _ilike: `%${search}%` } },
          { companyName: { _ilike: `%${search}%` } },
          { position: { _ilike: `%${search}%` } },
          { ownerEmployee: { firstName: { _ilike: `%${search}%` } } },
          { ownerEmployee: { lastName: { _ilike: `%${search}%` } } },
          { ownerEmployee: { fullName: { _ilike: `%${search}%` } } },
          { account: { name: { _ilike: `%${search}%` } } },
          { contact: { firstName: { _ilike: `%${search}%` } } },
          { contact: { lastName: { _ilike: `%${search}%` } } },
          { contact: { email: { _ilike: `%${search}%` } } }
        ];
        conditions.push({ _or: searchConditions });
      }

      // Add filter conditions
      if (leadStatuses.length > 0) {
        conditions.push({ leadStatus: { id: { _in: leadStatuses } } });
      }

      if (leadRatings.length > 0) {
        conditions.push({ leadRating: { id: { _in: leadRatings } } });
      }

      if (leadSources.length > 0) {
        conditions.push({ leadSource: { id: { _in: leadSources } } });
      }

      if (industries.length > 0) {
        conditions.push({ industry: { id: { _in: industries } } });
      }

      // Company size filters - filter through account relationship using employee count ranges
      if (companySizes.length > 0) {
        const sizeConditions: any[] = [];
        
        companySizes.forEach(sizeId => {
          switch (sizeId) {
            case 'startup':
              // 1-10 employees - this could map to specific catalog values or use text matching
              sizeConditions.push({ 
                account: { 
                  numberOfEmployees: { 
                    value: { _iregex: "1-10|startup|micro" } 
                  } 
                } 
              });
              break;
            case 'small':
              // 11-50 employees
              sizeConditions.push({ 
                account: { 
                  numberOfEmployees: { 
                    value: { _iregex: "11-50|small|1[1-9]|[2-4][0-9]|50" } 
                  } 
                } 
              });
              break;
            case 'medium':
              // 51-200 employees
              sizeConditions.push({ 
                account: { 
                  numberOfEmployees: { 
                    value: { _iregex: "51-200|medium|[5-9][0-9]|1[0-9][0-9]|200" } 
                  } 
                } 
              });
              break;
            case 'large':
              // 201-1000 employees
              sizeConditions.push({ 
                account: { 
                  numberOfEmployees: { 
                    value: { _iregex: "201-1000|large|[2-9][0-9][0-9]|1000" } 
                  } 
                } 
              });
              break;
            case 'enterprise':
              // 1000+ employees
              sizeConditions.push({ 
                account: { 
                  numberOfEmployees: { 
                    value: { _iregex: "1000\\+|enterprise|[1-9][0-9]{3,}" } 
                  } 
                } 
              });
              break;
          }
        });
        
        if (sizeConditions.length > 0) {
          conditions.push({ _or: sizeConditions });
        }
      }

      // Date range filters
      if (createdAfter) {
        conditions.push({ createdAt: { _gte: createdAfter } });
      }

      if (createdBefore) {
        conditions.push({ createdAt: { _lte: createdBefore } });
      }

      // Add additional filters
      if (Object.keys(additionalFilters).length > 0) {
        conditions.push(additionalFilters);
      }

      const where = conditions.length === 0 ? baseWhere : {
        ...baseWhere,
        _and: conditions
      };
      
      // Build orderBy based on sortField and sortOrder
      const orderBy: any = {};
      orderBy[sortField] = sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST';

      const variables: LeadQueryVariables = {
        offset,
        limit: newPageSize,
        orderBy: [orderBy],
        where
      };

      const result = await fetchLeadsData(variables);
      
      setLeads(result.Lead || []);
      setTotal(result.LeadAggregate?.aggregate?.count || 0);
      setCurrentPage(targetPage);
      setPageSize(newPageSize);
      setHasMore((result.Lead || []).length === newPageSize);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load leads'));
      setLeads([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [
    fetchLeadsData, 
    search, 
    pageSize, 
    sortField, 
    sortOrder, 
    JSON.stringify(leadStatuses),
    JSON.stringify(leadRatings),
    JSON.stringify(leadSources),
    JSON.stringify(industries),
    JSON.stringify(companySizes),
    createdAfter,
    createdBefore
  ]);

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