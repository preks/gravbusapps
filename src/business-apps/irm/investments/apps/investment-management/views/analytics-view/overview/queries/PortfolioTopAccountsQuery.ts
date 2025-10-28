/**
 * GraphQL queries for Top Accounts by Value
 *
 * This query fetches the top 10 investment accounts by total value using server-side aggregation.
 * It groups investments by account and sums their market values or investment amounts.
 */

import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'

export interface TopAccountData {
  accountId: string
  accountName: string
  totalValue: number
  investmentCount: number
}

export interface TopAccountsQueryResult {
  accounts: TopAccountData[]
}

/**
 * Query to get distinct investment accounts with their total values
 */
export const GET_DISTINCT_ACCOUNTS_QUERY = `
  query GetDistinctAccounts {
    Investment(
      where: { 
        isDeleted: { _eq: false }
        investmentAccountId: { _isNull: false }
      }
      distinctOn: investmentAccountId
      limit: 1000
    ) {
      investmentAccountId
      investmentAccount {
        id
        name
      }
    }
  }
`

/**
 * Build a query to aggregate investment values per account
 */
export const BUILD_ACCOUNT_AGGREGATE_QUERY = (accountIds: string[], currency?: string) => {
  const aliases = accountIds
    .map(accountId => {
      const sanitizedId = accountId.replace(/[^a-zA-Z0-9_]/g, '_')

      // Build where conditions
      const conditions = ['isDeleted: { _eq: false }', `investmentAccountId: { _eq: "${accountId}" }`]

      if (currency && currency !== 'ALL') {
        conditions.push(`currency: { code: { _eq: "${currency}" } }`)
      }

      return `
      account_${sanitizedId}: InvestmentAggregate(
        where: {
          ${conditions.join('\n          ')}
        }
      ) {
        aggregate {
          count
          sum {
            investmentMarketValue
            totalInvestmentAmount
          }
        }
      }
    `
    })
    .join('\n')

  return `
    query GetAccountAggregates {
      ${aliases}
    }
  `
}

export interface AccountInfo {
  accountId: string
  accountName: string
}

export interface AggregateResult {
  aggregate: {
    count: number
    sum: {
      investmentMarketValue: number | null
      totalInvestmentAmount: number | null
    } | null
  }
}

/**
 * Fetch top accounts by value with optional currency filter
 * This function is called from the hook with a GraphQL client instance
 */
export const fetchTopAccounts = async (
  graphqlClient: GraphQLClient,
  limit: number = 10,
  currency?: string
): Promise<TopAccountsQueryResult> => {
  // Step 1: Get all distinct accounts
  const distinctResult = await graphqlClient.request<{
    Investment: Array<{
      investmentAccountId: string
      investmentAccount: {
        id: string
        name: string
      }
    }>
  }>(GET_DISTINCT_ACCOUNTS_QUERY)

  const accounts: AccountInfo[] = distinctResult.Investment.filter(inv => inv.investmentAccount).map(inv => ({
    accountId: inv.investmentAccountId,
    accountName: inv.investmentAccount.name || 'Unknown Account'
  }))

  if (accounts.length === 0) {
    return { accounts: [] }
  }

  // Step 2: Build and execute aggregate query for all accounts
  const aggregateQuery = BUILD_ACCOUNT_AGGREGATE_QUERY(
    accounts.map(a => a.accountId),
    currency
  )

  const aggregateResult = await graphqlClient.request<Record<string, AggregateResult>>(aggregateQuery)

  // Step 3: Process results and map to accounts
  const accountData: TopAccountData[] = accounts.map(account => {
    const sanitizedId = account.accountId.replace(/[^a-zA-Z0-9_]/g, '_')
    const key = `account_${sanitizedId}`
    const aggregate = aggregateResult[key]

    const marketValue = aggregate?.aggregate?.sum?.investmentMarketValue || 0
    const investmentAmount = aggregate?.aggregate?.sum?.totalInvestmentAmount || 0
    const totalValue = marketValue || investmentAmount

    return {
      accountId: account.accountId,
      accountName: account.accountName,
      totalValue,
      investmentCount: aggregate?.aggregate?.count || 0
    }
  })

  // Step 4: Sort by total value descending and get top N
  const topAccounts = accountData
    .filter(a => a.totalValue > 0) // Only include accounts with value
    .sort((a, b) => b.totalValue - a.totalValue)
    .slice(0, limit)

  return { accounts: topAccounts }
}
