import { useState, useCallback } from 'react';
import { Opportunity, UseOpportunityListDataReturn } from '../types';

interface UseOpportunityListDataParams {
  search?: string;
  sortField: string;
  sortOrder: 'ASC' | 'DESC';
  accessToken: string;
  sourceApp?: string;
  stages?: string[];
  winningChanceRanges?: Array<{ min?: number; max?: number }>;
  amountRanges?: Array<{ min?: number; max?: number }>;
  createdAfter?: string;
  createdBefore?: string;
}

export const useOpportunityListData = (params: UseOpportunityListDataParams): UseOpportunityListDataReturn => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const loadPage = useCallback(async (page: number, pageSize = 20, additionalFilters?: any) => {
    if (!params.accessToken) {
      console.warn('No access token provided for opportunity data loading');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Mock data for now - will be replaced with actual GraphQL queries
      const mockOpportunities: Opportunity[] = Array.from({ length: pageSize }, (_, index) => ({
        id: `opportunity-${page}-${index + 1}`,
        name: `Opportunity ${(page - 1) * pageSize + index + 1}`,
        description: `Strategic opportunity for ${['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail'][index % 5]} sector`,
        estimatedAmount: Math.round((Math.random() * 500000 + 50000) * 100) / 100,
        winningChance: Math.round(Math.random() * 100),
        closeDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        stage: ['Qualification', 'Needs Analysis', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'][index % 6],
        salesPipeline: {
          id: `pipeline-${index}`,
          value: ['Standard Sales', 'Enterprise Sales', 'Partner Sales'][index % 3],
          code: ['STANDARD', 'ENTERPRISE', 'PARTNER'][index % 3]
        },
        salesPipelineStage: {
          id: `stage-${index}`,
          value: ['Initial Contact', 'Discovery', 'Demo', 'Proposal'][index % 4],
          code: ['INITIAL', 'DISCOVERY', 'DEMO', 'PROPOSAL'][index % 4]
        },
        salesOpportunityStatus: {
          id: `status-${index}`,
          value: ['Open', 'In Progress', 'Closed'][index % 3],
          code: ['OPEN', 'IN_PROGRESS', 'CLOSED'][index % 3]
        },
        salesLeadSource: {
          id: `source-${index}`,
          value: ['Website', 'Referral', 'Cold Call', 'Trade Show'][index % 4],
          code: ['WEBSITE', 'REFERRAL', 'COLD_CALL', 'TRADE_SHOW'][index % 4]
        },
        currency: {
          id: `currency-${index}`,
          value: ['USD', 'EUR', 'GBP'][index % 3],
          code: ['USD', 'EUR', 'GBP'][index % 3]
        },
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

      setOpportunities(mockOpportunities);
      setTotal(params.sourceApp === 'CRM' ? 157 : 23); // Mock totals based on sourceApp
      setHasMore(page * pageSize < (params.sourceApp === 'CRM' ? 157 : 23));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
    } finally {
      setLoading(false);
    }
  }, [params.accessToken, params.sourceApp, params.search, params.sortField, params.sortOrder, params.stages, params.winningChanceRanges, params.amountRanges, params.createdAfter, params.createdBefore]);

  const loadMore = useCallback(() => {
    // Load more functionality for infinite scroll
    console.log('Load more opportunities requested');
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