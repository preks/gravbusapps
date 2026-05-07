import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  Spinner,
  Alert,
  Button
} from '@newwork/nw-design-system'
import { Bar, ComposedChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatCurrencyCompact, extractCurrencyCode, formatAmount } from '@/common/utils/numberFormatter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { isAllCurrencySelection } from '@/common/data/investment/utils/investmentCurrencySelection'
import { ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'
import { AnalyticsChartTooltip, CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { getPortfolioTimelineGroupKey, usePortfolioTimelineAggregate } from '../hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface PortfolioTimelineChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

const getDisplayCurrency = (currency: string) =>
  isAllCurrencySelection(currency) ? 'EUR' : extractCurrencyCode(currency)

interface PortfolioTimelineTooltipPayload {
  dataKey?: string | number
  value?: number | string
  payload?: Record<string, string | number>
}

interface PortfolioPerformanceTooltipContentProps {
  active?: boolean
  payload?: PortfolioTimelineTooltipPayload[]
  label?: string | number
  currencyCode: string
}

const PortfolioPerformanceTooltipContent: React.FC<PortfolioPerformanceTooltipContentProps> = ({
  active,
  payload,
  label,
  currencyCode
}) => {
  if (!active || !payload?.length) {
    return null
  }

  const countEntry = payload.find(p => p.dataKey === 'count')
  const totalEntry = payload.find(p => p.dataKey === 'total')

  return (
    <AnalyticsChartTooltip
      title={`Year: ${label}`}
      metrics={[
        ...(countEntry
          ? [
              {
                label: 'Investment count',
                value: formatAmount(countEntry.value as number, 1),
                color: 'var(--color-count)'
              }
            ]
          : []),
        ...(totalEntry
          ? [
              {
                label: 'Total investment amount',
                value: formatCurrencyCompact(totalEntry.value as number, currencyCode, undefined, 1, true),
                color: 'var(--color-total)'
              }
            ]
          : [])
      ]}
    />
  )
}

interface PortfolioGroupTimelineTooltipContentProps {
  active?: boolean
  payload?: PortfolioTimelineTooltipPayload[]
  label?: string | number
  groups: string[]
  currencyCode: string
}

const PortfolioGroupTimelineTooltipContent: React.FC<PortfolioGroupTimelineTooltipContentProps> = ({
  active,
  payload,
  label,
  groups,
  currencyCode
}) => {
  if (!active || !payload?.length || !payload[0].payload) {
    return null
  }

  const row = payload[0].payload

  return (
    <AnalyticsChartTooltip
      title={`Year: ${label}`}
      groups={groups
        .map(group => {
          const amountKey = getPortfolioTimelineGroupKey(group)
          const countKey = `${amountKey}_count`
          const count = Number(row[countKey] ?? 0)
          const amount = Number(row[amountKey] ?? 0)

          if (count === 0 && amount === 0) {
            return null
          }

          return {
            label: group,
            color: `var(--color-${countKey})`,
            metrics: [
              { label: 'Investment count', value: formatAmount(count, 1) },
              {
                label: 'Total amount',
                value: formatCurrencyCompact(amount, currencyCode, undefined, 1, true)
              }
            ]
          }
        })
        .filter(group => group !== null)}
    />
  )
}

export const PortfolioTimelineCharts: React.FC<PortfolioTimelineChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props
  const allOptionLabel = getTranslationFromI18nKeyAndLabel('currency.all', 'All')
  const formatCurrencyLabel = (currency: string) => (isAllCurrencySelection(currency) ? allOptionLabel : currency)

  // Currency sync hooks - automatically sync with master currency
  const [performanceCurrencyFilter, setPerformanceCurrencyFilter] = useCurrencySync(masterCurrency, 'all')
  const [valueCurrencyFilter, setValueCurrencyFilter] = useCurrencySync(masterCurrency, 'all')

  // Fetch timeline data for performance chart (last 5 years)
  const {
    timelineData: performanceData,
    isLoading: isLoadingPerformance,
    error: performanceError,
    refetch: refetchPerformance
  } = usePortfolioTimelineAggregate(props, 5, performanceCurrencyFilter)

  // Fetch timeline data for value chart (last 5 years)
  const {
    timelineData: groupTimelineData,
    investmentGroups: groupTimelineGroups,
    isLoading: isLoadingValue,
    error: valueError,
    refetch: refetchValue
  } = usePortfolioTimelineAggregate(props, 5, valueCurrencyFilter)

  // Pre-compute chart configs
  const performanceChartConfig = useMemo(
    () => ({
      count: { label: 'Investment Count' },
      total: { label: 'Total Investment Amount' }
    }),
    []
  )

  const groupTimelineChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const group of groupTimelineGroups) {
      const amountKey = getPortfolioTimelineGroupKey(group)
      const countKey = `${amountKey}_count`
      config[countKey] = { label: `${group} count` }
      config[amountKey] = { label: `${group} amount` }
    }
    return config
  }, [groupTimelineGroups])

  return (
    <div className="gba:flex gba:flex-col gba:gap-6 gba:w-full">
      {/* Performance Timeline Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>
                  Investment Performance Timeline ({formatCurrencyLabel(performanceCurrencyFilter)})
                </CardTitle>
                <CardDescription>Investment count and total investment amount over the last 5 years</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <CurrencyFilter
                value={performanceCurrencyFilter}
                onChange={setPerformanceCurrencyFilter}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="performance-currency-filter"
                allOptionLabel={allOptionLabel}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (isLoadingPerformance) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[350px]">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (performanceError) {
              return (
                <Alert variant="destructive" className="gba:mb-4">
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <span>Error loading performance timeline: {performanceError}</span>
                    <Button variant="outline" size="sm" onClick={refetchPerformance}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              )
            }
            return (
              <ChartContainer config={performanceChartConfig} className="gba:h-[350px] gba:w-full">
                <ComposedChart data={performanceData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                    tickFormatter={value => formatAmount(value, 1)}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(
                        value,
                        getDisplayCurrency(performanceCurrencyFilter),
                        undefined,
                        1,
                        true
                      ).replace(/[€$£¥]/g, '')
                    }
                    label={{ value: 'Amount', angle: 90, position: 'insideRight' }}
                  />
                  <ChartTooltip
                    content={
                      <PortfolioPerformanceTooltipContent
                        currencyCode={getDisplayCurrency(performanceCurrencyFilter)}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="total"
                    stroke="var(--color-total)"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* Group Timeline Chart */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Group Investment Timeline ({formatCurrencyLabel(valueCurrencyFilter)})</CardTitle>
                <CardDescription>Investment count and total amount by group over the last 5 years</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <CurrencyFilter
                value={valueCurrencyFilter}
                onChange={setValueCurrencyFilter}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="value-currency-filter"
                allOptionLabel={allOptionLabel}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (isLoadingValue) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[300px]">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (valueError) {
              return (
                <Alert variant="destructive" className="gba:mb-4">
                  <div className="gba:flex gba:justify-between gba:items-center">
                    <span>Error loading group timeline: {valueError}</span>
                    <Button variant="outline" size="sm" onClick={refetchValue}>
                      Retry
                    </Button>
                  </div>
                </Alert>
              )
            }
            return (
              <ChartContainer config={groupTimelineChartConfig} className="gba:h-[350px] gba:w-full">
                <ComposedChart data={groupTimelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                  <YAxis
                    yAxisId="count"
                    tick={{ fontSize: 12 }}
                    label={{ value: 'Count', angle: -90, position: 'insideLeft' }}
                    tickFormatter={value => formatAmount(value, 1)}
                  />
                  <YAxis
                    yAxisId="amount"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(value, getDisplayCurrency(valueCurrencyFilter), undefined, 1, true).replace(
                        /[€$£¥]/g,
                        ''
                      )
                    }
                    label={{ value: 'Amount', angle: 90, position: 'insideRight' }}
                  />
                  <ChartTooltip
                    content={
                      <PortfolioGroupTimelineTooltipContent
                        groups={groupTimelineGroups}
                        currencyCode={getDisplayCurrency(valueCurrencyFilter)}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  {groupTimelineGroups.map(group => {
                    const amountKey = getPortfolioTimelineGroupKey(group)
                    const countKey = `${amountKey}_count`
                    return (
                      <Bar
                        key={countKey}
                        yAxisId="count"
                        dataKey={countKey}
                        stackId="count"
                        fill={`var(--color-${countKey})`}
                        radius={[4, 4, 0, 0]}
                      />
                    )
                  })}
                  {groupTimelineGroups.map(group => {
                    const amountKey = getPortfolioTimelineGroupKey(group)
                    const countKey = `${amountKey}_count`
                    return (
                      <Line
                        key={amountKey}
                        yAxisId="amount"
                        type="monotone"
                        dataKey={amountKey}
                        stroke={`var(--color-${countKey})`}
                        strokeWidth={3}
                        dot={false}
                        activeDot={{ r: 4 }}
                      />
                    )
                  })}
                </ComposedChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>
    </div>
  )
}
