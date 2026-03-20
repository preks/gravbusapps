import React, { useState, useEffect, useCallback } from 'react'
import type { WidgetItem } from '@/components/widget-group'
import { CurrencyDollarIcon, CheckCircleIcon, MedalIcon, TargetIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCompactCurrency } from '@/common/utils/numberFormatter'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { calculateChange } from '@/common/data/investment/kpis/utils'
import { DivestmentStatisticsPanel, WIDGET_SPAN, VS_LAST_QUARTER } from '../../../utils/DivestmentStatisticsPanel'
import {
  WON_STATUS_CONDITION,
  HISTORICAL_DAYS,
  type InvestmentOpportunityAggregateBlock
} from '../../../config/divestmentOpportunityConditions'

export interface ExitsStatisticsProps {
  accessToken: string
  currencyCode?: string
  enabled?: boolean
}

interface ExitsMetrics {
  totalExits: number
  totalExitAmount: number
  averageExitAmount: number
  exitsThisYear: number
  prevTotalExits: number
  prevTotalExitAmount: number
  prevAverageExitAmount: number
  prevExitsThisYear: number
  currencyCode: string
}

const EXITS_METRICS_QUERY = `
  query GetExitsMetrics(
    $currentWhere: InvestmentOpportunityBoolExp
    $historicalWhere: InvestmentOpportunityBoolExp
    $thisYearWhere: InvestmentOpportunityBoolExp
    $lastYearWhere: InvestmentOpportunityBoolExp
  ) {
    current: InvestmentOpportunityAggregate(where: $currentWhere) {
      aggregate { count sum { estimatedAmount } avg { estimatedAmount } }
    }
    historical: InvestmentOpportunityAggregate(where: $historicalWhere) {
      aggregate { count sum { estimatedAmount } avg { estimatedAmount } }
    }
    thisYear: InvestmentOpportunityAggregate(where: $thisYearWhere) {
      aggregate { count }
    }
    lastYear: InvestmentOpportunityAggregate(where: $lastYearWhere) {
      aggregate { count }
    }
  }
`

function buildExitsWidgets(metrics: ExitsMetrics): WidgetItem[] {
  const totalExitsTrend = calculateChange(metrics.totalExits, metrics.prevTotalExits)
  const avgExitAmountTrend = calculateChange(metrics.averageExitAmount, metrics.prevAverageExitAmount)
  const totalExitAmountTrend = calculateChange(metrics.totalExitAmount, metrics.prevTotalExitAmount)
  const exitsThisYearTrend = calculateChange(metrics.exitsThisYear, metrics.prevExitsThisYear)

  return [
    {
      key: 'total-exits',
      title: getTranslationFromI18nKeyAndLabel('total_exits', 'Total Exit'),
      value: metrics.totalExits,
      prefix: <CheckCircleIcon className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#52c41a',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('exited_opportunities', 'Exited opportunities'),
      trend: { ...totalExitsTrend, description: VS_LAST_QUARTER }
    },
    {
      key: 'average-exit-amount',
      title: getTranslationFromI18nKeyAndLabel('average_exit_amount', 'Average Exit Amount'),
      value: formatCompactCurrency(metrics.averageExitAmount, metrics.currencyCode),
      valueIsString: true,
      prefix: <TargetIcon className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#722ed1',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('avg_per_exit', 'Avg per exit'),
      trend: { ...avgExitAmountTrend, description: VS_LAST_QUARTER }
    },
    {
      key: 'total-exit-amount',
      title: getTranslationFromI18nKeyAndLabel('total_exit_amount', 'Total Exit Amount'),
      value: formatCompactCurrency(metrics.totalExitAmount, metrics.currencyCode),
      valueIsString: true,
      prefix: <CurrencyDollarIcon className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#389e0d',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('total_generated', 'Total generated'),
      trend: { ...totalExitAmountTrend, description: VS_LAST_QUARTER }
    },
    {
      key: 'exits-this-year',
      title: getTranslationFromI18nKeyAndLabel('exits_this_year', 'Exits This Year'),
      value: metrics.exitsThisYear,
      prefix: <MedalIcon className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1890ff',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('closed_ytd', 'Closed YTD'),
      trend: { ...exitsThisYearTrend, description: 'vs same period last year' }
    }
  ]
}

function buildBaseWhere(currencyCode?: string) {
  const conditions: any[] = [
    { isDeleted: { _eq: false } },
    { dealType: { _eq: 'DIVESTMENT_DEAL' } },
    WON_STATUS_CONDITION
  ]
  if (currencyCode) {
    conditions.push({ currency: { code: { _eq: currencyCode } } })
  }
  return { _and: conditions }
}

export const ExitsStatistics: React.FC<ExitsStatisticsProps> = ({ accessToken, currencyCode, enabled = true }) => {
  const [metrics, setMetrics] = useState<ExitsMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(enabled ? accessToken : '')

  const loadMetrics = useCallback(async () => {
    if (!enabled || !accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const now = new Date()
      const quarterAgo = new Date()
      quarterAgo.setDate(now.getDate() - HISTORICAL_DAYS)
      const thisYearStart = new Date(now.getFullYear(), 0, 1)
      const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
      const lastYearSameDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())

      const baseWhere = buildBaseWhere(currencyCode)

      const result = await graphqlClient.request<{
        current: InvestmentOpportunityAggregateBlock
        historical: InvestmentOpportunityAggregateBlock
        thisYear: InvestmentOpportunityAggregateBlock
        lastYear: InvestmentOpportunityAggregateBlock
      }>(EXITS_METRICS_QUERY, {
        currentWhere: baseWhere,
        historicalWhere: {
          _and: [...baseWhere._and, { updatedAt: { _lte: quarterAgo.toISOString() } }]
        },
        thisYearWhere: {
          _and: [...baseWhere._and, { closeDate: { _gte: thisYearStart.toISOString() } }]
        },
        lastYearWhere: {
          _and: [
            ...baseWhere._and,
            { closeDate: { _gte: lastYearStart.toISOString(), _lte: lastYearSameDate.toISOString() } }
          ]
        }
      })

      const cur = result.current.aggregate
      const hist = result.historical.aggregate

      setMetrics({
        totalExits: cur?.count || 0,
        totalExitAmount: cur?.sum?.estimatedAmount || 0,
        averageExitAmount: cur?.avg?.estimatedAmount || 0,
        exitsThisYear: result.thisYear.aggregate?.count || 0,
        prevTotalExits: hist?.count || 0,
        prevTotalExitAmount: hist?.sum?.estimatedAmount || 0,
        prevAverageExitAmount: hist?.avg?.estimatedAmount || 0,
        prevExitsThisYear: result.lastYear.aggregate?.count || 0,
        currencyCode: currencyCode || 'EUR'
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exits metrics')
    } finally {
      setIsLoading(false)
    }
  }, [enabled, accessToken, graphqlClient, currencyCode])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  const widgets = metrics ? buildExitsWidgets(metrics) : []

  return (
    <DivestmentStatisticsPanel
      widgets={widgets}
      isLoading={isLoading}
      error={error}
      onRetry={loadMetrics}
      dataTestId="exits-statistics"
    />
  )
}

export default ExitsStatistics
