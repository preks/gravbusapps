import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_INVESTMENT_REPORTS } from '@/common/data/investment/queries/investmentReportQueries';

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
    // Query all equity investment reports without investment ID filter
    // since the relationship mapping is complex
    const query = GET_INVESTMENT_REPORTS({
      limit: Math.min(variables.limit || 50, 100),
      offset: variables.offset || 0,
      reportDateFrom: variables.reportDateFrom,
      reportDateTo: variables.reportDateTo,
      orderBy: variables.orderBy,
      // Remove investment ID filter - load all and filter client-side
    });
    
    const result = await graphqlClient.request<{ InvestmentReport: any[] }>(query);
    
    // Extract equity reports from the enhanced query response
    const investmentReports = result.InvestmentReport || [];
    const equityReports: any[] = [];
    
    investmentReports.forEach(investmentReport => {
      const equityData = investmentReport.equityInvestmentReport || [];
      // Filter by the specific equity investment ID if provided
      if (variables.investmentIds?.length) {
        const filteredEquityData = equityData.filter((report: any) => 
          variables.investmentIds!.includes(report.equityInvestment?.id)
        );
        equityReports.push(...filteredEquityData);
      } else {
        equityReports.push(...equityData);
      }
    });
    
    return equityReports;
  };

  return {
    fetchEquityInvestmentReports,
  };
};


