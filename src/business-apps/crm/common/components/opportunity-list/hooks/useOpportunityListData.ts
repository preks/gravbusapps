import { useState, useCallback } from 'react';
import { Opportunity, UseOpportunityListDataReturn } from '../types';
import { useGetOpportunitiesData, OpportunityData } from '../queries/OpportunityQueries';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { enforceQueryLimit } from '../../../utils/queryLimits';

const temporaryMapToStage = (stage: string) => {
  return {
    UNKNOWN_STAGE: 'Unknown Stage',
    NEW_OPPORTUNITY: 'New Opportunity',
    IN_QUALIFICATION: 'In Qualification',
    PROPOSAL: 'Proposal',
    PROPOSAL_IN_PROGRESS: 'Proposal In Progress',
    NEGOTIATION: 'Negotiation',
    CLOSED: 'Closed'
  }[stage] || 'Unknown Stage';
};

interface UseOpportunityListDataParams {
  search?: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  context: BusinessAppContextProps;
  sourceApp?: string;
  stages?: string[];
  winningChanceRanges?: Array<{ min?: number; max?: number }>;
  amountRanges?: Array<{ min?: number; max?: number }>;
  statuses?: string[];
  createdAfter?: string;
  createdBefore?: string;
}

const transformOpportunityData = (apiOpportunity: OpportunityData): Opportunity => {
  return {
    id: apiOpportunity.id,
    name: apiOpportunity.name || '',
    description: '', // Field doesn't exist in API, set empty string
    estimatedAmount: apiOpportunity.estimatedAmount || 0,
    winningChance: apiOpportunity.winningChance || 0,
    closeDate: apiOpportunity.closeDate || '',
    stage: apiOpportunity.salesPipelineStage?.value || '',
    salesPipeline: apiOpportunity.salesPipeline ? {
      id: apiOpportunity.salesPipeline.id,
      value: apiOpportunity.salesPipeline.value,
      code: apiOpportunity.salesPipeline.code,
      objectValue: apiOpportunity.salesPipeline.objectValue
    } : { id: '', value: '', code: '', objectValue: undefined },
    salesPipelineStage: apiOpportunity.salesPipelineStage ? {
      id: apiOpportunity.salesPipelineStage.id,
      value: apiOpportunity.salesPipelineStage.value,
      code: apiOpportunity.salesPipelineStage.code,
      objectValue: apiOpportunity.salesPipelineStage.objectValue
    } : { id: '', value: '', code: '', objectValue: undefined },
    salesOpportunityStatus: { id: '', value: '', code: '' }, // Field doesn't exist in API
    salesLeadSource: { id: '', value: '', code: '' }, // Field doesn't exist in API
    currency: apiOpportunity.currency ? {
      id: apiOpportunity.currency.id,
      value: apiOpportunity.currency.value,
      code: apiOpportunity.currency.code,
      objectValue: apiOpportunity.currency.objectValue
    } : { id: '', value: 'USD', code: 'USD', objectValue: undefined },
    account: apiOpportunity.account ? {
      id: apiOpportunity.account.id,
      name: apiOpportunity.account.name
    } : undefined,
    accountId: apiOpportunity.accountId || '',
    ownerEmployee: apiOpportunity.ownerEmployee ? {
      id: apiOpportunity.ownerEmployee.id,
      firstName: apiOpportunity.ownerEmployee.firstName || '',
      lastName: apiOpportunity.ownerEmployee.lastName || '',
      displayName: apiOpportunity.ownerEmployee.displayName || 
        `${apiOpportunity.ownerEmployee.firstName} ${apiOpportunity.ownerEmployee.lastName}`,
      pictureThumbnail: apiOpportunity.ownerEmployee.pictureThumbnail || ''
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
      // Enforce query limit to ensure optimal performance
      const safePageSize = enforceQueryLimit(pageSize);
      const offset = (page - 1) * safePageSize;
      
      // Build where conditions - start with base condition
      const whereConditions: any[] = [
        { isDeleted: { _eq: false } }
      ];

      // Add search functionality - only search name and related fields that exist
      if (params.search?.trim()) {
        const searchTerm = `%${params.search.trim()}%`;
        const isNumber = !isNaN(Number(params.search));
        
        const searchConditions: any[] = [
          { name: { _ilike: searchTerm } }
        ];
        
        // Add account name search
        searchConditions.push({ 
          account: { 
            name: { _ilike: searchTerm } 
          } 
        });
        
        // Add owner employee search
        searchConditions.push({ 
          ownerEmployee: { 
            firstName: { _ilike: searchTerm } 
          } 
        });
        searchConditions.push({ 
          ownerEmployee: { 
            lastName: { _ilike: searchTerm } 
          } 
        });
        searchConditions.push({ 
          ownerEmployee: { 
            displayName: { _ilike: searchTerm } 
          } 
        });

        // Add stage and pipeline search
        searchConditions.push({ stage: { _ilike: searchTerm } }); // Added: displayed in stage
        searchConditions.push({ salesPipelineStage: { value: { _ilike: searchTerm } } }); // Added: displayed in stage
        searchConditions.push({ pipeline: { value: { _ilike: searchTerm } } }); // Added: displayed in pipeline
        searchConditions.push({ salesPipeline: { value: { _ilike: searchTerm } } }); // Added: displayed in pipeline
        
        // Add number-specific conditions if the search term can be parsed as a number
        if (isNumber) {
          const numericValue = Number(params.search);
          searchConditions.push({ estimatedAmount: { _eq: numericValue } });
          searchConditions.push({ winningChance: { _eq: numericValue } });
        }
        
        whereConditions.push({ _or: searchConditions });
      }

      // Add stage filtering
      if (params.stages && params.stages.length > 0) {
        const stageConditions: any[] = [
          { stage: { _in: params.stages } },
          { salesPipelineStage: { value: { _in: params.stages } } }
        ];
        whereConditions.push({ _or: stageConditions });
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
        whereConditions.push({ _or: winningChanceConditions });
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
        whereConditions.push({ _or: amountConditions });
      }

      // Add status filtering (Java enum values)
      if (params.statuses && params.statuses.length > 0) {
        whereConditions.push({ status: { _in: params.statuses } });
      }

      // Add date filtering
      if (params.createdAfter || params.createdBefore) {
        const dateCondition: any = {};
        if (params.createdAfter) {
          dateCondition._gte = params.createdAfter;
        }
        if (params.createdBefore) {
          dateCondition._lte = params.createdBefore;
        }
        whereConditions.push({ createdAt: dateCondition });
      }

      // Combine all where conditions with _and
      const whereCondition = whereConditions.length > 1 
        ? { _and: whereConditions }
        : whereConditions[0] || {};

      // Build order by condition
      let orderBy: any[] = [];
      if (params.sortField && params.sortField !== '' && params.sortOrder) {
        const sortCondition: any = {};
        
        if (params.sortField === 'name') {
          sortCondition.name = params.sortOrder;
        } else if (params.sortField === 'estimatedAmount') {
          sortCondition.estimatedAmount = params.sortOrder;
        } else if (params.sortField === 'winningChance') {
          sortCondition.winningChance = params.sortOrder;
        } else if (params.sortField === 'closeDate') {
          sortCondition.closeDate = params.sortOrder;
        } else if (params.sortField === 'createdAt') {
          sortCondition.createdAt = params.sortOrder;
        } else if (params.sortField === 'ownerEmployeeId') {
          sortCondition.ownerEmployee = { lastName: params.sortOrder };
        } else if (params.sortField === 'stage') {
          sortCondition.stage = params.sortOrder;
        }
        
        if (Object.keys(sortCondition).length > 0) {
          orderBy = [sortCondition];
        }
      }
      
      // Default sorting if no specific sort is provided
      if (orderBy.length === 0) {
        orderBy = [{ createdAt: 'DESC' }];
      }

      const result = await fetchOpportunitiesData({
        offset,
        limit: safePageSize,
        where: whereCondition,
        orderBy
      });

      if (result?.Opportunity) {
        const transformedOpportunities = result.Opportunity.map(transformOpportunityData);
        setOpportunities(transformedOpportunities);
        
        const totalCount = result.OpportunityAggregate?.aggregate?.count || 0;
        setTotal(totalCount);
        setHasMore(offset + safePageSize < totalCount);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load opportunities'));
      console.error('Error loading opportunities:', err);
    } finally {
      setLoading(false);
    }
  }, [
    fetchOpportunitiesData, 
    params.search, 
    params.sortField, 
    params.sortOrder, 
    JSON.stringify(params.stages), // Use JSON.stringify for array
    JSON.stringify(params.winningChanceRanges), // Use JSON.stringify for array
    JSON.stringify(params.amountRanges), // Use JSON.stringify for array
    JSON.stringify(params.statuses), // Use JSON.stringify for array
    params.createdAfter, 
    params.createdBefore, 
    params.context.accessToken
  ]);

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