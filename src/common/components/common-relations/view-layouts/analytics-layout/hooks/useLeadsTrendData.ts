import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type TimeFilter = 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical'

export interface LeadsTrendData {
  currentMonthLeads: number
  previousMonthLeads: number
  currentMonthConvertedLeads: number
  previousMonthConvertedLeads: number
  totalLeadsThisMonth: number
  totalLeadsLastMonth: number
  actualConversionRateThisMonth: number
  actualConversionRateLastMonth: number
  actualAvgConversionTimeThisMonth: number
  actualAvgConversionTimeLastMonth: number
  currentPeriodLeads: number
  previousPeriodLeads: number
}

/**
 * Shared hook for fetching leads trend data
 * Used by both CRM and IRM analytics modules
 *
 * @param accessToken - Authentication token
 * @param selectedTimeFilter - Time period filter
 * @param entityName - Entity name ('Lead' for CRM, 'InvestmentLead' for IRM)
 */
export const useLeadsTrendData = (
  accessToken: string,
  selectedTimeFilter: TimeFilter,
  entityName: 'Lead' | 'InvestmentLead' = 'Lead'
) => {
  const [trendData, setTrendData] = useState<LeadsTrendData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)

        const currentDate = new Date()
        const currentYear = currentDate.getFullYear()
        const currentMonth = currentDate.getMonth() + 1

        const pad2 = (n: number) => String(n).padStart(2, '0')
        const currentMonthStart = `${currentYear}-${pad2(currentMonth)}-01T00:00:00Z`
        const nextMonthStart =
          currentMonth === 12
            ? `${currentYear + 1}-01-01T00:00:00Z`
            : `${currentYear}-${pad2(currentMonth + 1)}-01T00:00:00Z`
        const previousMonthStart =
          currentMonth === 1
            ? `${currentYear - 1}-12-01T00:00:00Z`
            : `${currentYear}-${pad2(currentMonth - 1)}-01T00:00:00Z`

        let currentPeriodStart: string, previousPeriodStart: string, previousPeriodEnd: string
        switch (selectedTimeFilter) {
          case 'quarter': {
            const quarterStartMonth = Math.floor((currentMonth - 1) / 3) * 3 + 1
            currentPeriodStart = `${currentYear}-${pad2(quarterStartMonth)}-01T00:00:00Z`
            previousPeriodStart =
              quarterStartMonth > 3
                ? `${currentYear}-${pad2(quarterStartMonth - 3)}-01T00:00:00Z`
                : `${currentYear - 1}-${pad2(quarterStartMonth + 9)}-01T00:00:00Z`
            previousPeriodEnd = currentPeriodStart
            break
          }
          case 'year':
            currentPeriodStart = `${currentYear}-01-01T00:00:00Z`
            previousPeriodStart = `${currentYear - 1}-01-01T00:00:00Z`
            previousPeriodEnd = currentPeriodStart
            break
          case 'month':
          default:
            currentPeriodStart = currentMonthStart
            previousPeriodStart = previousMonthStart
            previousPeriodEnd = currentMonthStart
        }

        const query = `
          query GetLeadsTrendData {
            currentMonthLeads: ${entityName}Aggregate(where: {isDeleted: {_eq: false}, createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}}) { aggregate { count } }
            currentMonthConvertedLeads: ${entityName}Aggregate(where: {isDeleted: {_eq: false}, createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}, leadStatus: {value: {_in: ["Converted"]}}}) { aggregate { count } }
            previousMonthLeads: ${entityName}Aggregate(where: {isDeleted: {_eq: false}, createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}}) { aggregate { count } }
            previousMonthConvertedLeads: ${entityName}Aggregate(where: {isDeleted: {_eq: false}, createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}, leadStatus: {value: {_in: ["Converted"]}}}) { aggregate { count } }
            totalLeadsThisMonth: ${entityName}Aggregate(where: {isDeleted: {_eq: false}, createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}}) { aggregate { count } }
            totalLeadsLastMonth: ${entityName}Aggregate(where: {isDeleted: {_eq: false}, createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}}) { aggregate { count } }
            currentPeriodLeads: ${entityName}Aggregate(where: {isDeleted: {_eq: false}, createdAt: {_gte: "${currentPeriodStart}", _lt: "${nextMonthStart}"}}) { aggregate { count } }
            previousPeriodLeads: ${entityName}Aggregate(where: {isDeleted: {_eq: false}, createdAt: {_gte: "${previousPeriodStart}", _lt: "${previousPeriodEnd}"}}) { aggregate { count } }
          }
        `

        const result = await graphqlClient.request<any>(query)

        const currentMonthConversionRate =
          result.currentMonthLeads.aggregate.count > 0
            ? (result.currentMonthConvertedLeads.aggregate.count / result.currentMonthLeads.aggregate.count) * 100
            : 0
        const previousMonthConversionRate =
          result.previousMonthLeads.aggregate.count > 0
            ? (result.previousMonthConvertedLeads.aggregate.count / result.previousMonthLeads.aggregate.count) * 100
            : 0

        setTrendData({
          currentMonthLeads: result.currentMonthLeads.aggregate.count,
          previousMonthLeads: result.previousMonthLeads.aggregate.count,
          currentMonthConvertedLeads: result.currentMonthConvertedLeads.aggregate.count,
          previousMonthConvertedLeads: result.previousMonthConvertedLeads.aggregate.count,
          totalLeadsThisMonth: result.totalLeadsThisMonth.aggregate.count,
          totalLeadsLastMonth: result.totalLeadsLastMonth.aggregate.count,
          actualConversionRateThisMonth: Math.round(currentMonthConversionRate),
          actualConversionRateLastMonth: Math.round(previousMonthConversionRate),
          actualAvgConversionTimeThisMonth: 0,
          actualAvgConversionTimeLastMonth: 0,
          currentPeriodLeads: result.currentPeriodLeads.aggregate.count,
          previousPeriodLeads: result.previousPeriodLeads.aggregate.count
        })
      } finally {
        setIsLoading(false)
      }
    }

    if (accessToken) {
      fetchData()
    }
  }, [accessToken, graphqlClient, selectedTimeFilter, entityName])

  return { trendData, isLoading }
}
