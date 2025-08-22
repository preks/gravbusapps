import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface PlannedExitInvestment {
  id: string;
  name: string;
  accountId: string;
  opportunityId: string;
  ownerEmployeeId: string;
  acquisitionDate: string;
  exitDate?: string;
  plannedExitDate?: string;
  notesSummary?: string;
  bookValue: number;
  marketValue: number;
  initialInvestmentAmount: number;
  totalInvestmentAmount: number;
  stakePercentage: number;
  debtFinancingAmount: number;
  investmentMarketValue: number;
  investmentGroup?: {
    id: string;
    code: string;
    description: string;
  };
}

export interface UsePlannedExitsDataParams {
  accessToken: string;
  searchTerm?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface UsePlannedExitsDataReturn {
  investments: PlannedExitInvestment[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  refetch: () => void;
}

const PLANNED_EXITS_QUERY = `
  query GetPlannedExits(
    $where: InvestmentBoolExp
    $orderBy: [InvestmentOrderBy!]
    $limit: Int
    $offset: Int
  ) {
    Investment(where: $where, orderBy: $orderBy, limit: $limit, offset: $offset) {
      id
      name
      ownerEmployeeId
      acquisitionDate
      exitDate
      plannedExitDate
      initialInvestmentAmount
      totalInvestmentAmount
      stakePercentage
      debtFinancingAmount
      investmentMarketValue
      investmentGroup {
        id
        code
        description
      }
    }
    InvestmentAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const usePlannedExitsData = (params: UsePlannedExitsDataParams): UsePlannedExitsDataReturn => {
  const [investments, setInvestments] = useState<PlannedExitInvestment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const graphqlClient = useGraphQLClient(params.accessToken);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build where clause for planned exits
      const where: any = {
        planedExit: { _eq: true }
      };

      // Add search filter if provided
      if (params.searchTerm) {
        where._or = [
          { name: { _ilike: `%${params.searchTerm}%` } },
          { investmentGroup: { 
            _or: [
              { code: { _ilike: `%${params.searchTerm}%` } },
              { description: { _ilike: `%${params.searchTerm}%` } }
            ]
          }}
        ];
      }

      // Build order by clause
      const orderBy: any[] = [];
      if (params.sortBy) {
        const direction = params.sortDirection === 'desc' ? 'DESC' : 'ASC';
        
        // Handle nested fields
        if (params.sortBy.includes('.')) {
          const [relation, field] = params.sortBy.split('.');
          orderBy.push({ [relation]: { [field]: direction } });
        } else {
          orderBy.push({ [params.sortBy]: direction });
        }
      } else {
        // Default sort by planned exit date
        orderBy.push({ plannedExitDate: 'ASC' });
      }

      const variables = {
        where,
        orderBy,
        limit: params.limit || 50,
        offset: params.offset || 0
      };

      const response = await graphqlClient.request(PLANNED_EXITS_QUERY, variables);

      if (response.Investment) {
        setInvestments(response.Investment);
        setTotalCount(response.InvestmentAggregate?.aggregate?.count || 0);
      } else {
        setInvestments([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching planned exits:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch planned exits');
      setInvestments([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [
    graphqlClient,
    params.searchTerm,
    params.sortBy,
    params.sortDirection,
    params.limit,
    params.offset
  ]);

  useEffect(() => {
    if (params.accessToken) {
      fetchData();
    }
  }, [fetchData, params.accessToken]);

  const refetch = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    investments,
    isLoading,
    error,
    totalCount,
    refetch
  };
};
