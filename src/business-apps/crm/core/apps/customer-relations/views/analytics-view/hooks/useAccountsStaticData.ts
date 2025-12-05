import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface TopAccountData {
  id: string
  name: string
  industry: string
  totalValue: number
  wonOpportunities?: number
}

export interface MonthlyGrowthPoint {
  month: string
  date: string
  accountsCreated: number
  accountsWithOpportunities: number
  accountsActive: number
}

export interface AccountIndustryData {
  industry: string
  industryId: string
  count: number
  percentage: number
}

export interface AccountSizeData {
  sizeRange: string
  count: number
  percentage: number
}

export interface AccountsStaticData {
  // Basic metrics
  totalAccounts: number
  accountsWithOpportunities: number
  avgOpportunitiesPerAccount: number

  // Trend data (last 30 days vs previous 30 days)
  last30DaysAccounts: number
  previous30DaysAccounts: number
  last30DaysAccountsWithOpportunities: number
  previous30DaysAccountsWithOpportunities: number

  // Account Growth Analysis data
  topAccounts: TopAccountData[]
  monthlyGrowthTrend: MonthlyGrowthPoint[]

  // Account Health Matrix data
  accountsByIndustry: AccountIndustryData[]
  accountsBySize: AccountSizeData[]
}

/**
 * Fetches all static (non-filtered) account analytics data using GraphQL aggregates
 *
 * Data Sources:
 * - Account entity (distinctOn for industries and sizes)
 * - OpportunityAggregate for revenue calculations
 *
 * Pattern: Similar to useLeadsStaticData but without catalog API calls
 */
export const useAccountsStaticData = (accessToken: string) => {
  const [data, setData] = useState<AccountsStaticData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchAllAccountsData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Calculate date ranges
        const now = new Date()
        const last30DaysStart = new Date(now)
        last30DaysStart.setDate(now.getDate() - 30)

        const previous30DaysStart = new Date(now)
        previous30DaysStart.setDate(now.getDate() - 60)

        const previous30DaysEnd = last30DaysStart

        // === STEP 1: Build monthly growth queries (for mega query) ===
        const monthlyGrowthQueries = []
        const months = []

        for (let i = 5; i >= 0; i--) {
          const monthDate = new Date(now)
          monthDate.setMonth(now.getMonth() - i)
          monthDate.setDate(1)
          monthDate.setHours(0, 0, 0, 0)

          const monthStart = monthDate.toISOString()
          const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).toISOString()
          const monthLabel = monthDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })

          months.push({ start: monthStart, end: monthEnd, label: monthLabel })

          // Accounts created in this month
          monthlyGrowthQueries.push(
            `
            month_${i}_created: AccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${monthStart}", _lt: "${monthEnd}"}
              }
            ) { aggregate { count } }
          `,
            // Accounts with opportunities (cumulative up to end of month)
            `
            month_${i}_withOpportunities: AccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${monthEnd}"}
                opportunity: {id: {_isNull: false}}
              }
            ) { aggregate { count } }
          `
          )

          // Active accounts (with opportunities updated in last 90 days from month end)
          const activeThreshold = new Date(monthDate)
          activeThreshold.setDate(activeThreshold.getDate() - 90)
          monthlyGrowthQueries.push(`
            month_${i}_active: AccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${monthEnd}"}
                opportunity: {updatedAt: {_gte: "${activeThreshold.toISOString()}"}}
              }
            ) { aggregate { count } }
          `)
        }

        // === STEP 2: MEGA KPI QUERY - Combine KPIs + trends + monthly + distinct + accounts ===
        const query = `
        query GetAccountsStaticDataMega {
          # === Basic KPIs ===
          totalAccounts: AccountAggregate(
            where: {isDeleted: {_eq: false}}
          ) { aggregate { count } }

          accountsWithOpportunities: AccountAggregate(
            where: {isDeleted: {_eq: false}, opportunity: {id: {_isNull: false}}}
          ) { aggregate { count } }

          totalOpportunities: OpportunityAggregate(
            where: {isDeleted: {_eq: false}, accountId: {_isNull: false}}
          ) { aggregate { count } }

          # === 30-day Trend Data ===
          last30DaysAccounts: AccountAggregate(
            where: {isDeleted: {_eq: false}, createdAt: {_gte: "${last30DaysStart.toISOString()}"}}
          ) { aggregate { count } }

          previous30DaysAccounts: AccountAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${previous30DaysStart.toISOString()}", _lt: "${previous30DaysEnd.toISOString()}"}
            }
          ) { aggregate { count } }

          last30DaysAccountsWithOpportunities: AccountAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${last30DaysStart.toISOString()}"}
              opportunity: {id: {_isNull: false}}
            }
          ) { aggregate { count } }

          previous30DaysAccountsWithOpportunities: AccountAggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${previous30DaysStart.toISOString()}", _lt: "${previous30DaysEnd.toISOString()}"}
              opportunity: {id: {_isNull: false}}
            }
          ) { aggregate { count } }

          # === Monthly Growth Trend (Last 6 Months) ===
          ${monthlyGrowthQueries.join('\n')}

          # === Distinct Industries and Sizes ===
          industries: Account(
            where: {isDeleted: {_eq: false}, industry: {id: {_isNull: false}}}
            distinctOn: [industryRef]
          ) {
            industry {
              id
              code
              value
            }
          }

          sizes: Account(
            where: {isDeleted: {_eq: false}, numberOfEmployees: {id: {_isNull: false}}}
            distinctOn: [numberOfEmployeesRef]
          ) {
            numberOfEmployees {
              id
              code
              value
            }
          }

          # === Top Account IDs ===
          topAccountIds: Account(
            where: {
              isDeleted: {_eq: false}
              opportunity: {opportunityStatus: {code: {_eq: "WON"}}}
            }
            distinctOn: [id]
          ) {
            id
            name
            industry {
              value
            }
          }
        }
      `

        const result = await graphqlClient.request(query)

        // Extract data from mega query
        const industries = (result.industries || []).map((acc: any) => ({
          code: acc.industry.code,
          value: acc.industry.value,
          id: acc.industry.id
        }))

        const companySizes = (result.sizes || []).map((acc: any) => ({
          code: acc.numberOfEmployees.code,
          value: acc.numberOfEmployees.value,
          id: acc.numberOfEmployees.id
        }))

        const accounts = result.topAccountIds || []

        // === STEP 3: Top Accounts Revenue Aggregates (depends on mega query account IDs) ===
        const accountAggregates = accounts
          .map((account: any, index: number) => {
            return `
            acc_${index}_revenue: OpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                accountId: {_eq: "${account.id}"}
                opportunityStatus: {code: {_eq: "WON"}}
              }
            ) {
              aggregate {
                sum { estimatedAmount }
                count
              }
            }
          `
          })
          .join('\n')

        const revenueAggregatesQuery = `
        query GetAccountRevenueAggregates {
          ${accountAggregates}
        }
      `

        const revenueResult = await graphqlClient.request(revenueAggregatesQuery)

        // Combine results and sort by revenue
        const topAccounts: TopAccountData[] = accounts
          .map((account: any, index: number) => {
            const revenue = revenueResult[`acc_${index}_revenue`]?.aggregate?.sum?.estimatedAmount || 0
            const wonCount = revenueResult[`acc_${index}_revenue`]?.aggregate?.count || 0

            return {
              id: account.id,
              name: account.name,
              industry: account.industry?.value || 'Unknown',
              totalValue: revenue,
              wonOpportunities: wonCount
            }
          })
          .sort((a: TopAccountData, b: TopAccountData) => b.totalValue - a.totalValue)
          .slice(0, 5) // Top 5 accounts

        // Process monthly growth trend from mega query
        const monthlyGrowthTrend: MonthlyGrowthPoint[] = months.map((month, index) => ({
          month: month.label,
          date: month.start,
          accountsCreated: result[`month_${5 - index}_created`]?.aggregate?.count || 0,
          accountsWithOpportunities: result[`month_${5 - index}_withOpportunities`]?.aggregate?.count || 0,
          accountsActive: result[`month_${5 - index}_active`]?.aggregate?.count || 0
        }))

        // Calculate basic metrics (used by multiple sections)
        const totalAccounts = result.totalAccounts?.aggregate?.count || 0
        const accountsWithOpportunities = result.accountsWithOpportunities?.aggregate?.count || 0
        const totalOpportunities = result.totalOpportunities?.aggregate?.count || 0

        const avgOpportunitiesPerAccount =
          accountsWithOpportunities > 0 ? Math.round((totalOpportunities / accountsWithOpportunities) * 100) / 100 : 0

        // === STEP 4: Industry & Size Distribution (Combined Query) ===
        let accountsByIndustry: AccountIndustryData[] = []
        let accountsBySize: AccountSizeData[] = []

        if (industries.length > 0 || companySizes.length > 0) {
          const industryAggregates = industries
            .map((industry: any, index: number) => {
              const code = industry.code
              return `
              industry_${index}_total: AccountAggregate(
                where: {
                  isDeleted: {_eq: false}
                  industry: {code: {_eq: "${code}"}}
                }
              ) {
                aggregate { count }
              }
            `
            })
            .join('\n')

          const sizeAggregates = companySizes
            .map((size: any, index: number) => {
              const code = size.code
              return `
              size_${index}_total: AccountAggregate(
                where: {
                  isDeleted: {_eq: false}
                  numberOfEmployees: {code: {_eq: "${code}"}}
                }
              ) {
                aggregate { count }
              }
            `
            })
            .join('\n')

          const combinedQuery = `
          query GetAccountsByIndustryAndSize {
            ${industryAggregates}
            ${sizeAggregates}
          }
        `

          const combinedResult = await graphqlClient.request(combinedQuery)

          // Process industry data
          if (industries.length > 0) {
            accountsByIndustry = industries
              .map((industry: any, index: number) => {
                const count = combinedResult[`industry_${index}_total`]?.aggregate?.count || 0
                return {
                  industry: industry.value,
                  industryId: industry.id,
                  count,
                  percentage: totalAccounts > 0 ? Math.round((count / totalAccounts) * 100 * 10) / 10 : 0
                }
              })
              .filter((item: AccountIndustryData) => item.count > 0)
              .sort((a: AccountIndustryData, b: AccountIndustryData) => b.count - a.count)
          }

          // Process size data
          if (companySizes.length > 0) {
            accountsBySize = companySizes
              .map((size: any, index: number) => {
                const count = combinedResult[`size_${index}_total`]?.aggregate?.count || 0
                return {
                  sizeRange: size.value,
                  count,
                  percentage: totalAccounts > 0 ? Math.round((count / totalAccounts) * 100 * 10) / 10 : 0
                }
              })
              .filter((item: AccountSizeData) => item.count > 0)
          }
        }

        const finalData = {
          totalAccounts,
          accountsWithOpportunities,
          avgOpportunitiesPerAccount,
          last30DaysAccounts: result.last30DaysAccounts?.aggregate?.count || 0,
          previous30DaysAccounts: result.previous30DaysAccounts?.aggregate?.count || 0,
          last30DaysAccountsWithOpportunities: result.last30DaysAccountsWithOpportunities?.aggregate?.count || 0,
          previous30DaysAccountsWithOpportunities:
            result.previous30DaysAccountsWithOpportunities?.aggregate?.count || 0,
          topAccounts,
          monthlyGrowthTrend,
          accountsByIndustry,
          accountsBySize
        }

        setData(finalData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchAllAccountsData()
    }
  }, [accessToken, graphqlClient])

  return { data, isLoading, error }
}
