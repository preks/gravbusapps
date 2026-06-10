import type { GraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import {
  INVESTMENT_REPORT_DESCRIPTORS,
  type InvestmentReport
} from '@/common/data/investment/types/investmentReportTypes'
import {
  buildInvestmentReportFragment,
  INVESTMENT_REPORT_QUERY_CONFIGS,
  type InvestmentReportQueryVariables
} from '@/common/data/investment/queries/investmentReportQueries.new'

function resolveOrderBy(vars: InvestmentReportQueryVariables) {
  if (vars.orderBy && vars.orderBy.length > 0) {
    return vars.orderBy
  }
  return [{ field: 'date', direction: 'DESC_NULLS_LAST' as const }]
}

export async function fetchInvestmentReportExportPage(
  graphqlClient: GraphQLClient,
  variables: InvestmentReportQueryVariables
): Promise<{ items: InvestmentReport[]; total: number }> {
  const fields = INVESTMENT_REPORT_QUERY_CONFIGS.record
  const fragment = buildInvestmentReportFragment(fields)
  const varsWithFilters = variables as InvestmentReportQueryVariables & Record<string, unknown>
  const customConditions: Record<string, unknown>[] = Array.isArray(varsWithFilters.customConditions)
    ? [...varsWithFilters.customConditions]
    : []

  const filteredVars = { ...varsWithFilters }
  delete filteredVars.customConditions
  delete filteredVars.investmentGroupIds

  const whereObj = buildWhere({
    variables: filteredVars,
    descriptors: INVESTMENT_REPORT_DESCRIPTORS,
    isDeleted: true,
    customConditions
  })

  const orderByArray = buildOrderBy(resolveOrderBy(variables), INVESTMENT_REPORT_DESCRIPTORS)

  const query = `
    query GetInvestmentReportsForExport(
      $limit: Int
      $offset: Int
      $where: InvestmentReportBoolExp
      $orderBy: [InvestmentReportOrderBy!]
    ) {
      InvestmentReport(limit: $limit offset: $offset orderBy: $orderBy where: $where) {
        ${fragment}
      }
      InvestmentReportAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `

  const result = await graphqlClient.request<{
    InvestmentReport: InvestmentReport[]
    InvestmentReportAggregate: { aggregate: { count: number } }
  }>(query, {
    limit: variables.limit,
    offset: variables.offset ?? 0,
    where: whereObj,
    orderBy: orderByArray
  })

  return {
    items: result.InvestmentReport ?? [],
    total: result.InvestmentReportAggregate?.aggregate?.count ?? 0
  }
}
