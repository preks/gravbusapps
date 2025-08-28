import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_LIQUID_FUND_INVESTMENT_REPORTS } from '@/common/data/investment/queries/investmentReportQueries';

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
		const query = GET_LIQUID_FUND_INVESTMENT_REPORTS({
			limit: Math.min(variables.limit || 50, 100),
			offset: variables.offset || 0,
			reportDateFrom: variables.reportDateFrom,
			reportDateTo: variables.reportDateTo,
			orderBy: variables.orderBy,
			investmentIds: variables.investmentIds,
		});
		const result = await graphqlClient.request<{ LiquidFundInvestmentReport: any[] }>(query);
		return result.LiquidFundInvestmentReport || [];
	};

	const fetchLiquidFundInvestmentReportsCount = async (variables: LiquidFundInvestmentReportQueryVariables = {}) => {
		const whereClause = buildWhereClause(variables);
		const query = `
			query GetLiquidFundInvestmentReportsCount {
				LiquidFundInvestmentReportAggregate(${whereClause}) {
					aggregate { count }
				}
			}
		`;
		const result = await graphqlClient.request<{ LiquidFundInvestmentReportAggregate: { aggregate: { count: number } } }>(query);
		return result.LiquidFundInvestmentReportAggregate?.aggregate?.count || 0;
	};

	return {
		fetchLiquidFundInvestmentReports,
		fetchLiquidFundInvestmentReportsCount
	};
};


