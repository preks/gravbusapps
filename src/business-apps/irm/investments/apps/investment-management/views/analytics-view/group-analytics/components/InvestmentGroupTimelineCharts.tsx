import React, { useEffect, useMemo, useState } from 'react'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@newwork/nw-design-system'
import { Bar, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AnalyticsChartTooltip, CurrencyFilter } from '../../shared/components'
import {
  useInvestmentGroupMonthlyTimeline,
  useInvestmentGroupTimeline,
  useInvestmentGroupTypeTimeline
} from '../hooks/useInvestmentGroupTimeline'
import { AnalyticsChartCard } from './AnalyticsChartCard'
import { formatCompactCurrency, formatCompactNumber, getDisplayCurrency } from './chartFormatters'
import { PlannedExitCalendarHeatmap } from './PlannedExitCalendarHeatmap'

interface InvestmentGroupTimelineChartsProps {
  accessToken?: string
  availableCurrencies: string[]
  groupId: string
  selectedCurrency: string
}

const activityChartConfig = {
  count: { label: 'Investment count' },
  totalAmount: { label: 'Total amount' },
  cumulativeAmount: { label: 'Cumulative amount' },
  averageAmount: { label: 'Average investment value' }
}

interface TimelineTooltipPayload {
  color?: string
  dataKey?: string | number
  name?: string | number
  value?: number | string
}

interface InvestmentGroupActivityTooltipContentProps {
  active?: boolean
  payload?: TimelineTooltipPayload[]
  label?: string | number
  currencyCode: string
}

const InvestmentGroupActivityTooltipContent: React.FC<InvestmentGroupActivityTooltipContentProps> = ({
  active,
  payload,
  label,
  currencyCode
}) => {
  if (!active || !payload?.length) {
    return null
  }

  return (
    <AnalyticsChartTooltip
      title={String(label)}
      metrics={payload.map(item => {
        const dataKey = String(item.dataKey)
        const numericValue = Number(item.value)
        const isCount = dataKey === 'count'

        return {
          label: activityChartConfig[dataKey as keyof typeof activityChartConfig]?.label ?? dataKey,
          value: isCount ? formatCompactNumber(numericValue) : formatCompactCurrency(numericValue, currencyCode),
          color: item.color
        }
      })}
    />
  )
}

interface TypeTimelineTooltipContentProps {
  active?: boolean
  payload?: TimelineTooltipPayload[]
  label?: string | number
  currencyCode: string
}

const TypeTimelineTooltipContent: React.FC<TypeTimelineTooltipContentProps> = ({
  active,
  payload,
  label,
  currencyCode
}) => {
  if (!active || !payload?.length) {
    return null
  }

  const totalEntry = payload.find(item => item.dataKey === 'total')

  return (
    <AnalyticsChartTooltip
      title={String(label)}
      metrics={
        totalEntry
          ? [
              {
                label: 'Total amount',
                value: formatCompactCurrency(Number(totalEntry.value), currencyCode),
                color: totalEntry.color
              }
            ]
          : []
      }
      groups={payload
        .filter(item => item.dataKey !== 'total' && Number(item.value) > 0)
        .map(item => ({
          label: String(item.name || item.dataKey),
          color: item.color,
          metrics: [
            {
              label: 'Amount',
              value: formatCompactCurrency(Number(item.value), currencyCode)
            }
          ]
        }))}
    />
  )
}

export const InvestmentGroupTimelineCharts: React.FC<InvestmentGroupTimelineChartsProps> = ({
  accessToken,
  availableCurrencies,
  groupId,
  selectedCurrency
}) => {
  const [performanceCurrency, setPerformanceCurrency] = useState(selectedCurrency)
  const [typeTimelineCurrency, setTypeTimelineCurrency] = useState(selectedCurrency)
  const [plannedExitCurrency, setPlannedExitCurrency] = useState(selectedCurrency)
  const allOptionLabel = getTranslationFromI18nKeyAndLabel('currency.filter.all', 'All')
  const {
    timelineData: performanceTimelineData,
    isLoading: isPerformanceLoading,
    error: performanceError,
    refetch: refetchPerformance
  } = useInvestmentGroupTimeline(accessToken, groupId, performanceCurrency)
  const {
    timelineData: plannedExitTimelineData,
    isLoading: isPlannedExitLoading,
    error: plannedExitError,
    refetch: refetchPlannedExit
  } = useInvestmentGroupMonthlyTimeline(accessToken, groupId, plannedExitCurrency, true, 'plannedExitDate')
  const {
    timelineData: typeTimelineData,
    investmentTypes,
    typeKeyByLabel,
    isLoading: isTypeTimelineLoading,
    error: typeTimelineError,
    refetch: refetchTypeTimeline
  } = useInvestmentGroupTypeTimeline(accessToken, groupId, typeTimelineCurrency)
  const performanceDisplayCurrency = getDisplayCurrency(performanceCurrency)
  const plannedExitDisplayCurrency = getDisplayCurrency(plannedExitCurrency)
  const typeTimelineDisplayCurrency = getDisplayCurrency(typeTimelineCurrency)
  const hasPerformanceData = useMemo(
    () => performanceTimelineData.some(item => item.count > 0 || item.totalAmount > 0),
    [performanceTimelineData]
  )
  const hasTypeTimelineData = useMemo(
    () => typeTimelineData.some(item => Number(item.total) > 0) && investmentTypes.length > 0,
    [investmentTypes.length, typeTimelineData]
  )
  const hasPlannedExitData = useMemo(
    () => plannedExitTimelineData.some(item => item.count > 0 || item.totalAmount > 0),
    [plannedExitTimelineData]
  )
  const typeTimelineChartConfig = useMemo(
    () => ({
      ...Object.fromEntries(investmentTypes.map(type => [typeKeyByLabel[type], { label: type }])),
      total: { label: 'Total amount' }
    }),
    [investmentTypes, typeKeyByLabel]
  )
  const shouldShowTypeTimeline = isTypeTimelineLoading || Boolean(typeTimelineError) || hasTypeTimelineData

  useEffect(() => {
    setPerformanceCurrency(selectedCurrency)
    setTypeTimelineCurrency(selectedCurrency)
    setPlannedExitCurrency(selectedCurrency)
  }, [selectedCurrency])

  const renderCurrencyFilter = (value: string, onChange: (value: string) => void, dataTestId: string) => (
    <CurrencyFilter
      value={value}
      onChange={onChange}
      currencies={availableCurrencies}
      allOptionLabel={allOptionLabel}
      showLabel={false}
      dataTestId={dataTestId}
    />
  )

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-6">
      <AnalyticsChartCard
        title="Performance Timeline"
        description="Investment count, total amount, cumulative amount, and average value over the last 5 years"
        icon={ChartLineUpIcon}
        isLoading={isPerformanceLoading}
        error={performanceError}
        isEmpty={!hasPerformanceData}
        onRetry={refetchPerformance}
        headerAction={renderCurrencyFilter(
          performanceCurrency,
          setPerformanceCurrency,
          'performance-timeline-currency-filter'
        )}
      >
        <ChartContainer config={activityChartConfig} className="gba:h-96 gba:w-full">
          <ComposedChart data={performanceTimelineData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
            <XAxis dataKey="period" />
            <YAxis yAxisId="count" tickFormatter={value => formatCompactNumber(Number(value))} />
            <YAxis
              yAxisId="amount"
              orientation="right"
              tickFormatter={value =>
                formatCompactCurrency(Number(value), performanceDisplayCurrency).replace(/[€$£¥]/g, '')
              }
            />
            <ChartTooltip
              content={<InvestmentGroupActivityTooltipContent currencyCode={performanceDisplayCurrency} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar yAxisId="count" dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="amount"
              dataKey="totalAmount"
              stroke="var(--color-totalAmount)"
              strokeWidth={3}
              dot={false}
            />
            <Line
              yAxisId="amount"
              dataKey="cumulativeAmount"
              stroke="var(--color-cumulativeAmount)"
              strokeWidth={3}
              dot={false}
            />
            <Line
              yAxisId="amount"
              dataKey="averageAmount"
              stroke="var(--color-averageAmount)"
              strokeWidth={3}
              dot={false}
            />
          </ComposedChart>
        </ChartContainer>
      </AnalyticsChartCard>

      {shouldShowTypeTimeline && (
        <AnalyticsChartCard
          title={`Performance by Type (${typeTimelineDisplayCurrency})`}
          description="Stacked investment amounts by type over the last 5 years"
          icon={TrendUpIcon}
          isLoading={isTypeTimelineLoading}
          error={typeTimelineError}
          isEmpty={false}
          onRetry={refetchTypeTimeline}
          headerAction={renderCurrencyFilter(
            typeTimelineCurrency,
            setTypeTimelineCurrency,
            'type-performance-timeline-currency-filter'
          )}
        >
          <ChartContainer config={typeTimelineChartConfig} className="gba:h-96 gba:w-full">
            <ComposedChart data={typeTimelineData} margin={{ top: 16, right: 24, left: 8, bottom: 8 }}>
              <XAxis dataKey="period" />
              <YAxis
                tickFormatter={value =>
                  formatCompactCurrency(Number(value), typeTimelineDisplayCurrency).replace(/[€$£¥]/g, '')
                }
              />
              <ChartTooltip content={<TypeTimelineTooltipContent currencyCode={typeTimelineDisplayCurrency} />} />
              <ChartLegend content={<ChartLegendContent />} />
              {investmentTypes.map((type, index) => {
                const dataKey = typeKeyByLabel[type]
                const isLastType = index === investmentTypes.length - 1
                return (
                  <Bar
                    key={type}
                    dataKey={dataKey}
                    name={type}
                    stackId="investment-types"
                    fill={`var(--color-${dataKey})`}
                    radius={isLastType ? [4, 4, 0, 0] : undefined}
                  />
                )
              })}
              <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={3} dot={false} />
            </ComposedChart>
          </ChartContainer>
        </AnalyticsChartCard>
      )}

      <AnalyticsChartCard
        title="Planned Exit Calendar"
        description="Monthly planned exits by planned exit date over the next 5 years"
        icon={TrendUpIcon}
        isLoading={isPlannedExitLoading}
        error={plannedExitError}
        isEmpty={!hasPlannedExitData}
        onRetry={refetchPlannedExit}
        headerAction={renderCurrencyFilter(
          plannedExitCurrency,
          setPlannedExitCurrency,
          'planned-exit-timeline-currency-filter'
        )}
      >
        <PlannedExitCalendarHeatmap data={plannedExitTimelineData} currencyCode={plannedExitDisplayCurrency} />
      </AnalyticsChartCard>
    </div>
  )
}
