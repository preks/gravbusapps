import type { GraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildWhere, buildOrderBy } from '@/common/network/graphql/queryHelpers'
import { INVESTMENT_DESCRIPTORS, type Investment } from '@/common/data/investment/types/investmentTypes.new'
import {
  buildInvestmentFragment,
  INVESTMENT_QUERY_CONFIGS,
  type InvestmentQueryVariables
} from '@/common/data/investment/queries/investmentQueries.new'

function resolveOrderBy(vars: InvestmentQueryVariables) {
  if (vars.orderBy && vars.orderBy.length > 0) {
    return vars.orderBy
  }
  return [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' as const }]
}

export async function fetchInvestmentExportPage(
  graphqlClient: GraphQLClient,
  variables: InvestmentQueryVariables
): Promise<{ items: Investment[]; total: number }> {
  const fields = INVESTMENT_QUERY_CONFIGS.list
  const fragment = buildInvestmentFragment(fields)
  const varsWithFilters = variables as InvestmentQueryVariables & Record<string, unknown>
  const customConditions: Record<string, unknown>[] = Array.isArray(varsWithFilters.customConditions)
    ? [...varsWithFilters.customConditions]
    : []

  const filteredVars = { ...varsWithFilters }
  delete filteredVars.customConditions

  const whereObj = buildWhere({
    variables: filteredVars,
    descriptors: INVESTMENT_DESCRIPTORS,
    ids: filteredVars.ids,
    isDeleted: true,
    customConditions
  })

  const orderByArray = buildOrderBy(resolveOrderBy(variables), INVESTMENT_DESCRIPTORS)

  const query = `
    query GetInvestmentsForExport(
      $limit: Int
      $offset: Int
      $where: InvestmentBoolExp
      $orderBy: [InvestmentOrderBy!]
    ) {
      Investment(limit: $limit offset: $offset orderBy: $orderBy where: $where) {
        ${fragment}
      }
      InvestmentAggregate(where: $where) {
        aggregate {
          count
        }
      }
    }
  `

  const result = await graphqlClient.request<{
    Investment: Investment[]
    InvestmentAggregate: { aggregate: { count: number } }
  }>(query, {
    limit: variables.limit,
    offset: variables.offset ?? 0,
    where: whereObj,
    orderBy: orderByArray
  })

  return {
    items: result.Investment ?? [],
    total: result.InvestmentAggregate?.aggregate?.count ?? 0
  }
}
