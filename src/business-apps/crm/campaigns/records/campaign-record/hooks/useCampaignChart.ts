import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  CampaignChartData,
  CampaignChartDataPoint,
  ChartTimeFilter,
  UseCampaignChartReturn,
  CampaignRecord
} from '../types'
import { LEAD_STATUS_CODE_CONVERTED, OPPORTUNITY_STATUS_CODE_WON } from '../queries/CampaignAnalyticsGraphQL'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import isoWeek from 'dayjs/plugin/isoWeek'
import advancedFormat from 'dayjs/plugin/advancedFormat'

dayjs.extend(weekday)
dayjs.extend(isoWeek)
dayjs.extend(advancedFormat)

export const useCampaignChart = (
  context: BusinessAppContextProps,
  campaignId: string,
  campaign: CampaignRecord | null
): UseCampaignChartReturn => {
  const [chartData, setChartData] = useState<CampaignChartData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<ChartTimeFilter>('weekly')
  const graphqlClient = useGraphQLClient(context.accessToken)

  const buildPeriods = useCallback(
    (
      startDate: string,
      endDate: string,
      filter: ChartTimeFilter
    ): Array<{ start: string; end: string; label: string }> => {
      const campaignStart = dayjs(startDate)
      const campaignEnd = dayjs(endDate)

      let unit: dayjs.ManipulateType
      let format: string

      switch (filter) {
        case 'daily':
          unit = 'day'
          format = 'MMM DD'
          break
        case 'monthly':
          unit = 'month'
          format = 'MMM YYYY'
          break
        case 'yearly':
          unit = 'year'
          format = 'YYYY'
          break
        case 'weekly':
        default:
          unit = 'week'
          format = '[Week of] MMM DD'
          break
      }

      const periods: Array<{ start: string; end: string; label: string }> = []
      let cursor = campaignStart.startOf(unit)
      const endBoundary = campaignEnd.endOf('day')

      while (cursor.isBefore(endBoundary) || cursor.isSame(endBoundary, 'day')) {
        const next = cursor.add(1, unit)
        periods.push({
          start: cursor.toISOString(),
          end: next.toISOString(),
          label: cursor.format(format)
        })
        cursor = next
      }

      return periods
    },
    []
  )

  const buildAggregateQuery = useCallback((periods: Array<{ start: string; end: string }>) => {
    const queryParts = periods.map((period, index) => {
      const prefix = `period${index}`
      return `
        ${prefix}_leads: LeadAggregate(
          where: {
            salesCampaignId: { _eq: $campaignId }
            isDeleted: { _eq: false }
            createdAt: { _gte: "${period.start}", _lt: "${period.end}" }
          }
        ) { aggregate { count } }
        ${prefix}_accounts: AccountAggregate(
          where: {
            salesCampaignId: { _eq: $campaignId }
            isDeleted: { _eq: false }
            createdAt: { _gte: "${period.start}", _lt: "${period.end}" }
          }
        ) { aggregate { count } }
        ${prefix}_contacts: ContactAggregate(
          where: {
            salesCampaignId: { _eq: $campaignId }
            isDeleted: { _eq: false }
            createdAt: { _gte: "${period.start}", _lt: "${period.end}" }
          }
        ) { aggregate { count } }
        ${prefix}_opportunities: OpportunityAggregate(
          where: {
            salesCampaignId: { _eq: $campaignId }
            isDeleted: { _eq: false }
            createdAt: { _gte: "${period.start}", _lt: "${period.end}" }
          }
        ) { aggregate { count } }
        ${prefix}_convertedLeads: LeadAggregate(
          where: {
            salesCampaignId: { _eq: $campaignId }
            isDeleted: { _eq: false }
            createdAt: { _gte: "${period.start}", _lt: "${period.end}" }
            leadStatus: { code: { _eq: "${LEAD_STATUS_CODE_CONVERTED}" } }
          }
        ) { aggregate { count } }
        ${prefix}_wonOpportunities: OpportunityAggregate(
          where: {
            salesCampaignId: { _eq: $campaignId }
            isDeleted: { _eq: false }
            createdAt: { _gte: "${period.start}", _lt: "${period.end}" }
            opportunityStatus: { code: { _eq: "${OPPORTUNITY_STATUS_CODE_WON}" } }
          }
        ) { aggregate { count } }
      `
    })

    return `
      query GetCampaignTimeline($campaignId: uuid!) {
        ${queryParts.join('\n')}
      }
    `
  }, [])

  const loadChartData = useCallback(async () => {
    if (!context.accessToken || !campaignId || !campaign) {
      setError('No campaign data available')
      setIsLoading(false)
      return
    }

    if (!campaign.startDate || !campaign.endDate) {
      setError('Campaign dates are missing')
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const startDate = dayjs(campaign.startDate)
      const endDate = dayjs(campaign.endDate)

      if (!startDate.isValid() || !endDate.isValid()) {
        throw new Error('Invalid campaign dates')
      }

      if (startDate.isAfter(endDate)) {
        throw new Error('Campaign start date cannot be after end date')
      }

      const periods = buildPeriods(campaign.startDate, campaign.endDate, timeFilter)
      if (periods.length === 0) {
        setChartData({ data: [], timeFilter })
        return
      }

      const query = buildAggregateQuery(periods)
      const result = await graphqlClient.request<Record<string, { aggregate?: { count?: number } }>>(query, {
        campaignId
      })

      const data: CampaignChartDataPoint[] = periods.map((period, index) => {
        const prefix = `period${index}`
        return {
          date: period.label,
          totalLeads: result[`${prefix}_leads`]?.aggregate?.count || 0,
          totalAccounts: result[`${prefix}_accounts`]?.aggregate?.count || 0,
          totalContacts: result[`${prefix}_contacts`]?.aggregate?.count || 0,
          totalOpportunities: result[`${prefix}_opportunities`]?.aggregate?.count || 0,
          convertedLeads: result[`${prefix}_convertedLeads`]?.aggregate?.count || 0,
          wonOpportunities: result[`${prefix}_wonOpportunities`]?.aggregate?.count || 0
        }
      })

      setChartData({ data, timeFilter })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load chart data')
      setChartData(null)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, campaignId, campaign, timeFilter, buildPeriods, buildAggregateQuery, graphqlClient])

  const refetch = useCallback(() => {
    loadChartData().catch(() => undefined)
  }, [loadChartData])

  const handleSetTimeFilter = useCallback((filter: ChartTimeFilter) => {
    setTimeFilter(filter)
  }, [])

  useEffect(() => {
    if (context.accessToken && campaignId && campaign) {
      loadChartData().catch(() => undefined)
    }
  }, [context.accessToken, campaignId, campaign, timeFilter, loadChartData])

  return {
    chartData,
    isLoading,
    error,
    timeFilter,
    setTimeFilter: handleSetTimeFilter,
    refetch
  }
}
