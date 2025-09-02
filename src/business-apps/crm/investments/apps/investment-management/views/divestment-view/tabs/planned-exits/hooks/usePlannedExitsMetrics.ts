import { useState, useEffect, useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';

export interface PlannedExitsMetrics {
  totalCount: number;
  totalValue: number;
  averageStakePercentage: number;
  averageExitDate: string;
}

export interface UsePlannedExitsMetricsReturn {
  metrics: PlannedExitsMetrics | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

const PLANNED_EXITS_METRICS_QUERY = `
  query GetPlannedExitsMetrics($where: InvestmentBoolExp) {
    Investment(where: $where) {
      id
      investmentMarketValue
      stakePercentage
      plannedExitDate
    }
    InvestmentAggregate(where: $where) {
      aggregate {
        count
      }
    }
  }
`;

export const usePlannedExitsMetrics = (accessToken: string): UsePlannedExitsMetricsReturn => {
  const [metrics, setMetrics] = useState<PlannedExitsMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(accessToken);

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Query only investments planned for exit
      const where = {
        planedExit: { _eq: true }
      };

      const response = await graphqlClient.request(PLANNED_EXITS_METRICS_QUERY, { where });

      if (response.Investment && Array.isArray(response.Investment)) {
        const investments = response.Investment;
        const totalCount = response.InvestmentAggregate?.aggregate?.count || 0;

        // Calculate metrics
        const totalValue = investments.reduce(
          (sum: number, inv: any) => sum + (inv.investmentMarketValue || 0), 
          0
        );

        const averageStakePercentage = investments.length > 0 
          ? investments.reduce((sum: number, inv: any) => sum + (inv.stakePercentage || 0), 0) / investments.length
          : 0;

        // Calculate average exit date
        const validExitDates = investments
          .filter((inv: any) => inv.plannedExitDate)
          .map((inv: any) => new Date(inv.plannedExitDate));

        let averageExitDate = "N/A";
        if (validExitDates.length > 0) {
          const averageTimestamp = validExitDates.reduce(
            (sum, date) => sum + date.getTime(), 
            0
          ) / validExitDates.length;
          
          const avgDate = new Date(averageTimestamp);
          averageExitDate = avgDate.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }

        setMetrics({
          totalCount,
          totalValue,
          averageStakePercentage,
          averageExitDate,
        });
      } else {
        setMetrics({
          totalCount: 0,
          totalValue: 0,
          averageStakePercentage: 0,
          averageExitDate: "N/A",
        });
      }
    } catch (err) {
      console.error('Error fetching planned exits metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics');
      setMetrics(null);
    } finally {
      setIsLoading(false);
    }
  }, [graphqlClient]);

  useEffect(() => {
    if (accessToken) {
      fetchMetrics();
    }
  }, [fetchMetrics, accessToken]);

  const refetch = useCallback(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  return {
    metrics,
    isLoading,
    error,
    refetch
  };
};
