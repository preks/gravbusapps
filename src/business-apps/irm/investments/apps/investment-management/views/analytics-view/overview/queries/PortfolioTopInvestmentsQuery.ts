import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { isAllCurrencySelection } from '@/common/data/investment/utils/investmentCurrencySelection'

export interface TopInvestmentData {
  id: string
  name: string
  groupName: string
  typeName: string
  totalValue: number
  cumulativeValue: number
  cumulativePercentage: number
  currencyCode: string
}

export interface TopInvestmentsQueryResult {
  investments: TopInvestmentData[]
}

interface AggregateResult {
  aggregate: {
    sum: {
      totalInvestmentAmount: number | null
    } | null
  } | null
}

interface InvestmentResult {
  id: string
  name: string | null
  totalInvestmentAmount: number | null
  currency: { code: string } | null
  investmentGroup: { value: string } | null
  investmentType: { value: string } | null
}

const buildInvestmentWhere = (currency?: string): Record<string, any> => {
  const where: Record<string, any> = {
    isDeleted: { _eq: false },
    totalInvestmentAmount: { _isNull: false }
  }

  if (!isAllCurrencySelection(currency)) {
    where.currency = { code: { _eq: currency } }
  }

  return where
}

export const fetchTopInvestmentsByValue = async (
  graphqlClient: GraphQLClient,
  currency?: string,
  limit = 10
): Promise<TopInvestmentsQueryResult> => {
  const where = buildInvestmentWhere(currency)

  const result = await graphqlClient.request<{
    InvestmentAggregate: AggregateResult | null
    Investment: InvestmentResult[]
  }>(
    `
      query GetTopInvestmentsByValue($where: InvestmentBoolExp!, $limit: Int) {
        InvestmentAggregate(where: $where) {
          aggregate {
            sum { totalInvestmentAmount }
          }
        }
        Investment(where: $where, limit: $limit, orderBy: [{ totalInvestmentAmount: DESC_NULLS_LAST }]) {
          id
          name
          totalInvestmentAmount
          currency { code }
          investmentGroup { value }
          investmentType { value }
        }
      }
    `,
    { where, limit }
  )

  const portfolioTotal = result.InvestmentAggregate?.aggregate?.sum?.totalInvestmentAmount || 0
  let cumulativeValue = 0

  const investments = (result.Investment || [])
    .map(investment => {
      const totalValue = investment.totalInvestmentAmount || 0
      cumulativeValue += totalValue

      return {
        id: investment.id,
        name: investment.name || 'Unknown investment',
        groupName: investment.investmentGroup?.value || 'Unknown group',
        typeName: investment.investmentType?.value || 'No type',
        totalValue,
        cumulativeValue,
        cumulativePercentage: portfolioTotal > 0 ? (cumulativeValue / portfolioTotal) * 100 : 0,
        currencyCode: investment.currency?.code || (isAllCurrencySelection(currency) ? 'EUR' : currency || 'EUR')
      }
    })
    .filter(investment => investment.totalValue > 0)

  return { investments }
}
