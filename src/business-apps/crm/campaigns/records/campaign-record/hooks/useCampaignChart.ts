import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  CampaignChartData,
  CampaignChartDataPoint,
  ChartTimeFilter,
  UseCampaignChartReturn,
  CampaignRecord,
  CampaignEntity
} from '../types'
import dayjs from 'dayjs'
import weekday from 'dayjs/plugin/weekday'
import isoWeek from 'dayjs/plugin/isoWeek'
import advancedFormat from 'dayjs/plugin/advancedFormat'

dayjs.extend(weekday)
dayjs.extend(isoWeek)
dayjs.extend(advancedFormat)

export const useCampaignChart = (
  _context: BusinessAppContextProps,
  campaignId: string,
  campaign: CampaignRecord | null,
  allEntities: CampaignEntity[]
): UseCampaignChartReturn => {
  const [chartData, setChartData] = useState<CampaignChartData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeFilter, setTimeFilter] = useState<ChartTimeFilter>('weekly')

  const generateChartData = useCallback(
    (startDate: string, endDate: string, filter: ChartTimeFilter, entities: CampaignEntity[]): CampaignChartDataPoint[] => {
      const start = dayjs(startDate)
      const end = dayjs(endDate)
      const data: CampaignChartDataPoint[] = []

      const leads = entities.filter(e => e.type === 'lead')
      const accounts = entities.filter(e => e.type === 'account')
      const contacts = entities.filter(e => e.type === 'contact')
      const opportunities = entities.filter(e => e.type === 'opportunity')

      const countInPeriod = (list: CampaignEntity[], periodStart: dayjs.Dayjs, periodEnd: dayjs.Dayjs) =>
        list.filter(entity => {
          const createdAt = dayjs(entity.creationDate)
          if (filter === 'daily') return createdAt.isSame(periodStart, 'day')
          if (filter === 'weekly') return createdAt.isSame(periodStart, 'week')
          if (filter === 'monthly') return createdAt.isSame(periodStart, 'month')
          if (filter === 'yearly') return createdAt.isSame(periodStart, 'year')
          return (
            (createdAt.isSame(periodStart, 'day') || createdAt.isAfter(periodStart)) &&
            (createdAt.isSame(periodEnd, 'day') || createdAt.isBefore(periodEnd))
          )
        }).length

      let increment: dayjs.ManipulateType
      let format: string

      switch (filter) {
        case 'daily':
          increment = 'day'
          format = 'MMM DD'
          break
        case 'monthly':
          increment = 'month'
          format = 'MMM YYYY'
          break
        case 'yearly':
          increment = 'year'
          format = 'YYYY'
          break
        case 'weekly':
        default:
          increment = 'week'
          format = '[Week of] MMM DD'
      }

      let current = start
      while (current.isBefore(end) || current.isSame(end, 'day')) {
        const periodStart = current
        const periodEnd = current.add(1, increment).subtract(1, 'day')
        const leadsInPeriod = countInPeriod(leads, periodStart, periodEnd)
        const opportunitiesInPeriod = countInPeriod(opportunities, periodStart, periodEnd)

        data.push({
          date: current.format(format),
          totalLeads: leadsInPeriod,
          totalAccounts: countInPeriod(accounts, periodStart, periodEnd),
          totalContacts: countInPeriod(contacts, periodStart, periodEnd),
          totalOpportunities: opportunitiesInPeriod,
          convertedLeads: Math.floor(leadsInPeriod * 0.15),
          wonOpportunities: Math.floor(opportunitiesInPeriod * 0.25)
        })

        current = current.add(1, increment)
      }

      return data
    },
    []
  )

  const loadChartData = useCallback(() => {
    if (!campaignId || !campaign) {
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

      const data = generateChartData(campaign.startDate, campaign.endDate, timeFilter, allEntities)
      setChartData({ data, timeFilter })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate chart data')
      setChartData(null)
    } finally {
      setIsLoading(false)
    }
  }, [campaignId, campaign, timeFilter, allEntities, generateChartData])

  const refetch = useCallback(() => {
    loadChartData()
  }, [loadChartData])

  const handleSetTimeFilter = useCallback((filter: ChartTimeFilter) => {
    setTimeFilter(filter)
  }, [])

  useEffect(() => {
    if (campaignId && campaign) {
      loadChartData()
    }
  }, [campaignId, campaign, timeFilter, allEntities, loadChartData])

  return {
    chartData,
    isLoading,
    error,
    timeFilter,
    setTimeFilter: handleSetTimeFilter,
    refetch
  }
}
