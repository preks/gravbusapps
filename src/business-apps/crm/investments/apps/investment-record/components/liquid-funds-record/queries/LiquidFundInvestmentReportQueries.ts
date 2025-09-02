import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_INVESTMENT_REPORTS } from '@/common/data/investment/queries/investmentReportQueries';

export type OrderByDirection = 'ASC' | 'DESC';

export interface LiquidFundInvestmentReportQueryVariables {
	limit?: number;
	offset?: number;
	reportDateFrom?: string;
	reportDateTo?: string;
	orderBy?: Array<{ field: string; direction: OrderByDirection }>;
	// Note: expects Liquid Fund Investment IDs
	investmentIds?: string[];
}

export const useGetLiquidFundInvestmentReports = (context: BusinessAppContextProps) => {
	const graphqlClient = useGraphQLClient(context.accessToken);

	const buildWhereClause = (variables: LiquidFundInvestmentReportQueryVariables = {}) => {
		let whereClause = 'where: { isDeleted: { _eq: false }';

		if (variables.investmentIds?.length) {
			whereClause += `, liquidFundInvestment: { id: { _in: [${variables.investmentIds.map(id => `"${id}"`).join(', ')}] } }`;
		}
		if (variables.reportDateFrom) {
			whereClause += `, date: { _gte: "${variables.reportDateFrom}" }`;
		}
		if (variables.reportDateTo) {
			whereClause += `, date: { _lte: "${variables.reportDateTo}" }`;
		}
		whereClause += ' }';
		return whereClause;
	};

	const buildOrderByClause = (variables: LiquidFundInvestmentReportQueryVariables = {}) => {
		return variables.orderBy?.length
			? `orderBy: [${variables.orderBy.map(o => `{ ${o.field}: ${o.direction} }`).join(', ')}]`
			: 'orderBy: [{ date: DESC }]';
	};

	const fetchLiquidFundInvestmentReports = async (variables: LiquidFundInvestmentReportQueryVariables = {}) => {
		// Query all liquid fund investment reports without investment ID filter
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
		
		// Extract liquid fund reports from the enhanced query response
		const investmentReports = result.InvestmentReport || [];
		const liquidFundReports: any[] = [];
		
		investmentReports.forEach(investmentReport => {
			const liquidFundData = investmentReport.liquidFundInvestmentReport || [];
			// Filter by the specific liquid fund investment ID if provided
			if (variables.investmentIds?.length) {
				const filteredLiquidFundData = liquidFundData.filter((report: any) => 
					variables.investmentIds!.includes(report.liquidFundInvestment?.id)
				);
				liquidFundReports.push(...filteredLiquidFundData);
			} else {
				liquidFundReports.push(...liquidFundData);
			}
		});
		
		return liquidFundReports;
	};

	const fetchLiquidFundInvestmentReportsCount = async (variables: LiquidFundInvestmentReportQueryVariables = {}) => {
		// For simplicity, just fetch all data and count client-side 
		// since we need to filter by specific liquid fund investment ID
		const reports = await fetchLiquidFundInvestmentReports(variables);
		return reports.length;
	};

	return {
		fetchLiquidFundInvestmentReports,
		fetchLiquidFundInvestmentReportsCount
	};
};


