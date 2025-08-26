import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_EQUITY_INVESTMENT_REPORTS } from '@/common/data/investment/queries/investmentReportQueries';

export type OrderByDirection = 'ASC' | 'DESC';

export interface EquityInvestmentReportQueryVariables {
  limit?: number;
  offset?: number;
  reportDateFrom?: string;
  reportDateTo?: string;
  orderBy?: Array<{ field: string; direction: OrderByDirection }>;
  // Note: expects Equity Investment IDs
  investmentIds?: string[];
}

export const useGetEquityInvestmentReports = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken);

  const fetchEquityInvestmentReports = async (variables: EquityInvestmentReportQueryVariables = {}) => {
    const query = GET_EQUITY_INVESTMENT_REPORTS({
      limit: Math.min(variables.limit || 50, 100),
      offset: variables.offset || 0,
      reportDateFrom: variables.reportDateFrom,
      reportDateTo: variables.reportDateTo,
      orderBy: variables.orderBy,
      investmentIds: variables.investmentIds,
    });
    const result = await graphqlClient.request<{ EquityInvestmentReport: any[] }>(query);
    return result.EquityInvestmentReport || [];
  };

  return {
    fetchEquityInvestmentReports,
  };
};


