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
  avgRevenuePerAccount: number // Average revenue from won opportunities per account

  // Trend data (last 30 days vs previous 30 days)
  last30DaysAccounts: number
  previous30DaysAccounts: number
  last30DaysAccountsWithOpportunities: number
  previous30DaysAccountsWithOpportunities: number

  // Account Growth Analysis data
  monthlyGrowthTrend: MonthlyGrowthPoint[]

  // Account Health Matrix data
  accountsByIndustry: AccountIndustryData[]
  accountsBySize: AccountSizeData[]
}

export interface AccountsEntityConfig {
  accountEntity: string // "Account" | "InvestmentAccount"
  opportunityEntity: string // "Opportunity" | "InvestmentOpportunity"
  industryField: string // "industry" | "industryClass"
  sizeField: string // "numberOfEmployees" | "companySize"
  opportunityRelation?: string // "opportunity" | "opportunityAccounts" (junction table for IRM)
  isOpportunityRelationList?: boolean // true for IRM (list relationship), false for CRM (singular)
  isJunctionTable?: boolean // true if using junction table (IRM uses opportunityAccounts)
}

// Helper function to build opportunity filter for accounts with opportunities
const buildAccountOpportunityFilter = (config: AccountsEntityConfig): string => {
  if (config.isJunctionTable) {
    return `${config.opportunityRelation}: {opportunity: {isDeleted: {_eq: false}}}`
  }
  if (config.isOpportunityRelationList) {
    return `${config.opportunityRelation}: {isDeleted: {_eq: false}}`
  }
  return `${config.opportunityRelation || 'opportunity'}: {id: {_isNull: false}}`
}

// Helper function to build opportunity filter with date range for active accounts
const buildActiveAccountOpportunityFilter = (config: AccountsEntityConfig, cutoffDate: string): string => {
  if (config.isJunctionTable) {
    return `${config.opportunityRelation}: {opportunity: {isDeleted: {_eq: false}, updatedAt: {_gte: "${cutoffDate}"}}}`
  }
  if (config.isOpportunityRelationList) {
    return `${config.opportunityRelation}: {updatedAt: {_gte: "${cutoffDate}"}}`
  }
  return `${config.opportunityRelation || 'opportunity'}: {updatedAt: {_gte: "${cutoffDate}"}}`
}

// Helper function to build opportunity filter for accounts with won opportunities
const buildWonOpportunityAccountFilter = (config: AccountsEntityConfig): string => {
  if (config.isJunctionTable) {
    return `${config.opportunityRelation}: {opportunity: {isDeleted: {_eq: false}, opportunityStatus: {code: {_eq: "WON"}}}}`
  }
  if (config.isOpportunityRelationList) {
    return `${config.opportunityRelation}: {isDeleted: {_eq: false}, opportunityStatus: {code: {_eq: "WON"}}}}`
  }
  return `${config.opportunityRelation || 'opportunity'}: {opportunityStatus: {code: {_eq: "WON"}}}`
}

/**
 * Generic hook for fetching account static data (KPIs, distributions, trends)
 * Configurable for both CRM and IRM modules
 */
export const useGenericAccountsStaticData = (accessToken: string, config: AccountsEntityConfig) => {
  const [data, setData] = useState<AccountsStaticData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchAllAccountsData = async () => {
      if (!accessToken) {
        setIsLoading(false)
        return
      }

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
            month_${i}_created: ${config.accountEntity}Aggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${monthStart}", _lt: "${monthEnd}"}
              }
            ) { aggregate { count } }
          `,
            // Accounts with opportunities (cumulative up to end of month)
            `
            month_${i}_withOpportunities: ${config.accountEntity}Aggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${monthEnd}"}
                ${buildAccountOpportunityFilter(config)}
              }
            ) { aggregate { count } }
          `
          )

          // Active accounts (with opportunities updated in last 90 days from month end)
          const activeThreshold = new Date(monthDate)
          activeThreshold.setDate(activeThreshold.getDate() - 90)
          monthlyGrowthQueries.push(`
            month_${i}_active: ${config.accountEntity}Aggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_lt: "${monthEnd}"}
                ${buildActiveAccountOpportunityFilter(config, activeThreshold.toISOString())}
              }
            ) { aggregate { count } }
          `)
        }

        // === STEP 2: MEGA KPI QUERY - Combine KPIs + trends + monthly + distinct + accounts ===
        const query = `
        query GetAccountsStaticDataMega {
          # === Basic KPIs ===
          totalAccounts: ${config.accountEntity}Aggregate(
            where: {isDeleted: {_eq: false}}
          ) { aggregate { count } }

          accountsWithOpportunities: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              ${buildAccountOpportunityFilter(config)}
            }
          ) { aggregate { count } }

          totalOpportunities: ${config.opportunityEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              ${
                config.isJunctionTable
                  ? `opportunityAccounts: {}` // Junction table: opportunities that have account links in the junction table
                  : `accountId: {_isNull: false}` // Direct link: opportunities with accountId
              }
            }
          ) { aggregate { count } }

          # === Revenue Data for Average Calculation ===
          wonOpportunitiesRevenue: ${config.opportunityEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              ${
                config.isJunctionTable
                  ? `opportunityAccounts: {}` // Junction table: opportunities that have account links in the junction table
                  : `accountId: {_isNull: false}` // Direct link: opportunities with accountId
              }
              opportunityStatus: {code: {_eq: "WON"}}
            }
          ) {
            aggregate {
              sum { estimatedAmount }
            }
          }

          accountsWithWonOpportunities: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              ${buildWonOpportunityAccountFilter(config)}
            }
          ) { aggregate { count } }

          # === 30-day Trend Data ===
          last30DaysAccounts: ${config.accountEntity}Aggregate(
            where: {isDeleted: {_eq: false}, createdAt: {_gte: "${last30DaysStart.toISOString()}"}}
          ) { aggregate { count } }

          previous30DaysAccounts: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${previous30DaysStart.toISOString()}", _lt: "${previous30DaysEnd.toISOString()}"}
            }
          ) { aggregate { count } }

          last30DaysAccountsWithOpportunities: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${last30DaysStart.toISOString()}"}
              ${buildAccountOpportunityFilter(config)}
            }
          ) { aggregate { count } }

          previous30DaysAccountsWithOpportunities: ${config.accountEntity}Aggregate(
            where: {
              isDeleted: {_eq: false}
              createdAt: {_gte: "${previous30DaysStart.toISOString()}", _lt: "${previous30DaysEnd.toISOString()}"}
              ${buildAccountOpportunityFilter(config)}
            }
          ) { aggregate { count } }

          # === Monthly Growth Trend (Last 6 Months) ===
          ${monthlyGrowthQueries.join('\n')}

          # === Distinct Industries and Sizes ===
          industries: ${config.accountEntity}(
            where: {isDeleted: {_eq: false}, ${config.industryField}: {id: {_isNull: false}}}
            distinctOn: [${config.industryField}Ref]
          ) {
            ${config.industryField} {
              id
              code
              value
            }
          }

          sizes: ${config.accountEntity}(
            where: {isDeleted: {_eq: false}, ${config.sizeField}: {id: {_isNull: false}}}
            distinctOn: [${config.sizeField}Ref]
          ) {
            ${config.sizeField} {
              id
              code
              value
            }
          }
        }
      `

        const result = await graphqlClient.request(query)

        // Extract data from mega query
        const industries = (result.industries || []).map((acc: any) => ({
          code: acc[config.industryField].code,
          value: acc[config.industryField].value,
          id: acc[config.industryField].id
        }))

        const companySizes = (result.sizes || []).map((acc: any) => ({
          code: acc[config.sizeField].code,
          value: acc[config.sizeField].value,
          id: acc[config.sizeField].id
        }))

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
              industry_${index}_total: ${config.accountEntity}Aggregate(
                where: {
                  isDeleted: {_eq: false}
                  ${config.industryField}: {code: {_eq: "${code}"}}
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
              size_${index}_total: ${config.accountEntity}Aggregate(
                where: {
                  isDeleted: {_eq: false}
                  ${config.sizeField}: {code: {_eq: "${code}"}}
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

        // Calculate average revenue per account from won opportunities
        const totalWonRevenue = result.wonOpportunitiesRevenue?.aggregate?.sum?.estimatedAmount || 0
        const accountsWithWonOpps = result.accountsWithWonOpportunities?.aggregate?.count || 0
        const avgRevenuePerAccount = accountsWithWonOpps > 0 ? Math.round(totalWonRevenue / accountsWithWonOpps) : 0

        const finalData: AccountsStaticData = {
          totalAccounts,
          accountsWithOpportunities,
          avgOpportunitiesPerAccount,
          avgRevenuePerAccount, // Average revenue from won opportunities per account
          last30DaysAccounts: result.last30DaysAccounts?.aggregate?.count || 0,
          previous30DaysAccounts: result.previous30DaysAccounts?.aggregate?.count || 0,
          last30DaysAccountsWithOpportunities: result.last30DaysAccountsWithOpportunities?.aggregate?.count || 0,
          previous30DaysAccountsWithOpportunities:
            result.previous30DaysAccountsWithOpportunities?.aggregate?.count || 0,
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

    fetchAllAccountsData()
  }, [
    accessToken,
    config.accountEntity,
    config.opportunityEntity,
    config.industryField,
    config.sizeField,
    config.opportunityRelation
  ])

  return { data, isLoading, error }
}
