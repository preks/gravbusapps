import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCallback } from 'react';

export const GET_INVESTMENT_RECENT_OPPORTUNITIES_WITH_TREND = `
  query GetInvestmentRecentOpportunitiesWithTrend($currentStart: timestamptz!, $previousStart: timestamptz!, $previousEnd: timestamptz!) {
    current: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $currentStart},
      isDeleted: {_eq: false}
    }) { aggregate { count } }
    previous: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $previousStart, _lt: $previousEnd},
      isDeleted: {_eq: false}
    }) { aggregate { count } }
  }
`;

export const GET_INVESTMENT_OPPORTUNITY_VALUE_WITH_TREND = `
  query GetInvestmentOpportunityValueWithTrend($lastQuarter: timestamptz!) {
    current: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      estimatedAmount: {_isNull: false}
    }) { aggregate { sum { estimatedAmount } } }
    previous: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      estimatedAmount: {_isNull: false},
      createdAt: {_lt: $lastQuarter}
    }) { aggregate { sum { estimatedAmount } } }
  }
`;

export const GET_INVESTMENT_WIN_RATE_WITH_TREND = `
  query GetInvestmentWinRateWithTrend($lastQuarter: timestamptz!) {
    currentTotal: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false}
    }) { aggregate { count } }
    currentWins: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      opportunityStatus: { code: {_in: ["HIGH_PROBABILITY", "LIKELY_TO_WIN", "CLOSED_WON"] } }
    }) { aggregate { count } }
    previousTotal: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      createdAt: {_lt: $lastQuarter}
    }) { aggregate { count } }
    previousWins: InvestmentOpportunityAggregate(where: {
      isDeleted: {_eq: false},
      opportunityStatus: { code: {_in: ["HIGH_PROBABILITY", "LIKELY_TO_WIN", "CLOSED_WON"] } },
      createdAt: {_lt: $lastQuarter}
    }) { aggregate { count } }
  }
`;

export const GET_INVESTMENT_OPPORTUNITIES_THIS_YEAR_WITH_TREND = `
  query GetInvestmentOpportunitiesThisYearWithTrend($thisYearStart: timestamptz!, $lastYearStart: timestamptz!, $lastYearEnd: timestamptz!) {
    current: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $thisYearStart},
      isDeleted: {_eq: false}
    }) { aggregate { count } }
    previous: InvestmentOpportunityAggregate(where: {
      createdAt: {_gte: $lastYearStart, _lt: $lastYearEnd},
      isDeleted: {_eq: false}
    }) { aggregate { count } }
  }
`;

export interface TrendData { current: number; previous: number; }

export const useOpportunityStatisticsQueries = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchRecentOpportunitiesWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date();
    const currentStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const previousEnd = currentStart;
    const previousStart = new Date(currentStart.getTime() - 14 * 24 * 60 * 60 * 1000);
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } };
      previous: { aggregate: { count: number } };
    }>(GET_INVESTMENT_RECENT_OPPORTUNITIES_WITH_TREND, {
      currentStart: currentStart.toISOString(),
      previousStart: previousStart.toISOString(),
      previousEnd: previousEnd.toISOString(),
    });
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count };
  }, [graphqlClient]);

  const fetchOpportunityValueWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date();
    const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const result = await graphqlClient.request<{
      current: { aggregate: { sum: { estimatedAmount: number | null } } };
      previous: { aggregate: { sum: { estimatedAmount: number | null } } };
    }>(GET_INVESTMENT_OPPORTUNITY_VALUE_WITH_TREND, { lastQuarter: lastQuarter.toISOString() });
    const current = result.current.aggregate.sum?.estimatedAmount || 0;
    const previous = result.previous.aggregate.sum?.estimatedAmount || 0;
    return { current, previous };
  }, [graphqlClient]);

  const fetchWinRateWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date();
    const lastQuarter = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    const result = await graphqlClient.request<{
      currentTotal: { aggregate: { count: number } };
      currentWins: { aggregate: { count: number } };
      previousTotal: { aggregate: { count: number } };
      previousWins: { aggregate: { count: number } };
    }>(GET_INVESTMENT_WIN_RATE_WITH_TREND, { lastQuarter: lastQuarter.toISOString() });
    const currentRate = result.currentTotal.aggregate.count > 0 ? (result.currentWins.aggregate.count / result.currentTotal.aggregate.count) * 100 : 0;
    const previousRate = result.previousTotal.aggregate.count > 0 ? (result.previousWins.aggregate.count / result.previousTotal.aggregate.count) * 100 : 0;
    return { current: currentRate, previous: previousRate };
  }, [graphqlClient]);

  const fetchOpportunitiesThisYearWithTrend = useCallback(async (): Promise<TrendData> => {
    const now = new Date();
    const thisYearStart = new Date(now.getFullYear(), 0, 1);
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const result = await graphqlClient.request<{
      current: { aggregate: { count: number } };
      previous: { aggregate: { count: number } };
    }>(GET_INVESTMENT_OPPORTUNITIES_THIS_YEAR_WITH_TREND, {
      thisYearStart: thisYearStart.toISOString(),
      lastYearStart: lastYearStart.toISOString(),
      lastYearEnd: lastYearEnd.toISOString(),
    });
    return { current: result.current.aggregate.count, previous: result.previous.aggregate.count };
  }, [graphqlClient]);

  return {
    fetchRecentOpportunitiesWithTrend,
    fetchOpportunityValueWithTrend,
    fetchWinRateWithTrend,
    fetchOpportunitiesThisYearWithTrend,
  };
};


