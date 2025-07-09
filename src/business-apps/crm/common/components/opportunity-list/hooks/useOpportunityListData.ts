import { useState, useCallback } from 'react';
import { Opportunity, UseOpportunityListDataReturn } from '../types';
import { useGetOpportunitiesData, OpportunityData } from '../queries/OpportunityQueries';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

interface UseOpportunityListDataParams {
  search?: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  context: BusinessAppContextProps;
  sourceApp?: string;
  stages?: string[];
  winningChanceRanges?: Array<{ min?: number; max?: number }>;
  amountRanges?: Array<{ min?: number; max?: number }>;
  createdAfter?: string;
  createdBefore?: string;
}

const transformOpportunityData = (apiOpportunity: OpportunityData): Opportunity => {
  return {
    id: apiOpportunity.id,
    name: apiOpportunity.name || '',
    description: apiOpportunity.description || '',
    estimatedAmount: apiOpportunity.estimatedAmount || 0,
    winningChance: apiOpportunity.winningChance || 0,
    closeDate: apiOpportunity.closeDate || '',
    stage: apiOpportunity.stage || apiOpportunity.salesPipelineStage?.value || '',
    salesPipeline: apiOpportunity.salesPipeline ? {
      id: apiOpportunity.salesPipeline.id,
      value: apiOpportunity.salesPipeline.value,
      code: apiOpportunity.salesPipeline.code
    } : { id: '', value: '', code: '' },
    salesPipelineStage: apiOpportunity.salesPipelineStage ? {
      id: apiOpportunity.salesPipelineStage.id,
      value: apiOpportunity.salesPipelineStage.value,
      code: apiOpportunity.salesPipelineStage.code
    } : { id: '', value: '', code: '' },
    salesOpportunityStatus: apiOpportunity.salesOpportunityStatus ? {
      id: apiOpportunity.salesOpportunityStatus.id,
      value: apiOpportunity.salesOpportunityStatus.value,
      code: apiOpportunity.salesOpportunityStatus.code
    } : { id: '', value: '', code: '' },
    salesLeadSource: apiOpportunity.salesLeadSource ? {
      id: apiOpportunity.salesLeadSource.id,
      value: apiOpportunity.salesLeadSource.value,
      code: apiOpportunity.salesLeadSource.code
    } : { id: '', value: '', code: '' },
    currency: apiOpportunity.currency ? {
      id: apiOpportunity.currency.id,
      value: apiOpportunity.currency.value,
      code: apiOpportunity.currency.code
    } : { id: '', value: 'USD', code: 'USD' },
    account: apiOpportunity.account ? {
      id: '', // Account ID not available in this structure
      name: apiOpportunity.account.name
    } : undefined,
    accountId: '', // Not available in this structure
    ownerEmployee: apiOpportunity.ownerEmployee ? {
      id: apiOpportunity.ownerEmployee.id,
      firstName: apiOpportunity.ownerEmployee.firstName || '',
      lastName: apiOpportunity.ownerEmployee.lastName || '',
      displayName: apiOpportunity.ownerEmployee.displayName || 
        `${apiOpportunity.ownerEmployee.firstName} ${apiOpportunity.ownerEmployee.lastName}`,
      pictureThumbnail: undefined
    } : undefined,
    sourceApp: '',
    createdAt: apiOpportunity.createdAt,
    updatedAt: apiOpportunity.updatedAt || ''
  };
};

export const useOpportunityListData = (params: UseOpportunityListDataParams): UseOpportunityListDataReturn => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const { fetchOpportunitiesData } = useGetOpportunitiesData(params.context);

  const loadPage = useCallback(async (page: number, pageSize = 20, additionalFilters?: any) => {
    if (!params.context.accessToken) {
      console.warn('No access token provided for opportunity data loading');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const offset = (page - 1) * pageSize;
      
      // Build where conditions
      const whereCondition: any = {
        isDeleted: { _eq: false }
      };

      // Add search functionality
      if (params.search?.trim()) {
        const searchPattern = { _iregex: params.search.trim() };
        const isNumber = !isNaN(Number(params.search));
        
        const searchConditions: any[] = [
          { name: searchPattern },
          { description: searchPattern },
          { account: { name: searchPattern } },
          { ownerEmployee: { firstName: searchPattern } },
          { ownerEmployee: { lastName: searchPattern } },
          { ownerEmployee: { displayName: searchPattern } }
        ];
        
        // Add number-specific conditions if the search term can be parsed as a number
        if (isNumber) {
          const numericValue = Number(params.search);
          searchConditions.push({ estimatedAmount: { _eq: numericValue } });
          searchConditions.push({ winningChance: { _eq: numericValue } });
        }
        
        whereCondition._or = searchConditions;
      }

      // Add stage filtering
      if (params.stages && params.stages.length > 0) {
        whereCondition._or = whereCondition._or || [];
        whereCondition._or.push({ stage: { _in: params.stages } });
        whereCondition._or.push({ salesPipelineStage: { value: { _in: params.stages } } });
      }

      // Add winning chance filtering
      if (params.winningChanceRanges && params.winningChanceRanges.length > 0) {
        const winningChanceConditions = params.winningChanceRanges.map(range => {
          const condition: any = {};
          if (range.min !== undefined) {
            condition._gte = range.min;
          }
          if (range.max !== undefined) {
            condition._lte = range.max;
          }
          return { winningChance: condition };
        });
        whereCondition._and = whereCondition._and || [];
        whereCondition._and.push({ _or: winningChanceConditions });
      }

      // Add amount filtering
      if (params.amountRanges && params.amountRanges.length > 0) {
        const amountConditions = params.amountRanges.map(range => {
          const condition: any = {};
          if (range.min !== undefined) {
            condition._gte = range.min;
          }
          if (range.max !== undefined) {
            condition._lte = range.max;
          }
          return { estimatedAmount: condition };
        });
        whereCondition._and = whereCondition._and || [];
        whereCondition._and.push({ _or: amountConditions });
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
        } else if (params.sortField === 'estimatedAmount') {
          orderBy.estimatedAmount = params.sortOrder;
        } else if (params.sortField === 'winningChance') {
          orderBy.winningChance = params.sortOrder;
        } else if (params.sortField === 'closeDate') {
          orderBy.closeDate = params.sortOrder;
        } else if (params.sortField === 'createdAt') {
          orderBy.createdAt = params.sortOrder;
        }
      } else {
        orderBy.createdAt = 'DESC';
      }

      const result = await fetchOpportunitiesData({
        offset,
        limit: pageSize,
        where: whereCondition,
        orderBy: Object.keys(orderBy).length > 0 ? [orderBy] : [{ createdAt: 'DESC' }]
      });

      if (result?.Opportunity) {
        const transformedOpportunities = result.Opportunity.map(transformOpportunityData);
        setOpportunities(transformedOpportunities);
        
        const totalCount = result.OpportunityAggregate?.aggregate?.count || 0;
        setTotal(totalCount);
        setHasMore(offset + pageSize < totalCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load opportunities'));
      console.error('Error loading opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchOpportunitiesData, params.search, params.sortField, params.sortOrder, params.stages, params.winningChanceRanges, params.amountRanges, params.createdAfter, params.createdBefore, params.context.accessToken]);

  const loadMore = useCallback(() => {
    console.log('Load more opportunities requested');
    // Implementation for infinite scroll if needed
  }, []);

  const retry = useCallback(() => {
    console.log('Retrying opportunity data load');
    // Will be implemented with actual retry logic
  }, []);

  return {
    opportunities,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry
  };
}; 