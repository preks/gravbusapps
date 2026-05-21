import React, { useEffect, useMemo, useState } from 'react'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@newwork/nw-design-system'
import { Bar, BarChart, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { ChartBarIcon, ChartLineUpIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  useInvestmentGroupTopInvestments,
  useInvestmentGroupTypePerformance,
  useInvestmentGroupParetoInvestments
} from '../hooks/useInvestmentGroupPerformance'
import type {
  InvestmentGroupDistributionDatum,
  InvestmentGroupParetoDatum,
  TopInvestmentDatum
} from '../queries/shared'
import { AnalyticsChartCard } from './AnalyticsChartCard'
import { CATEGORY_AXIS_PROPS, CATEGORY_CHART_MARGIN, getShortCategoryLabel } from './chartLayout'
import { formatCompactCurrency, getDisplayCurrency } from './chartFormatters'
import { AnalyticsChartTooltip, CurrencyFilter } from '../../shared/components'

interface InvestmentGroupPerformanceChartsProps {
  accessToken?: string
  availableCurrencies: string[]
  groupId: string
  hasInvestmentTypes?: boolean
  selectedCurrency: string
}

const topInvestmentsConfig = {
  totalAmount: { label: 'Total amount' }
}

const averageAmountConfig = {
  averageAmount: { label: 'Average amount' }
}

const paretoConfig = {
  totalAmount: { label: 'Total amount' },
  cumulativePercentage: { label: 'Cumulative share' }
}

interface ChartTooltipContentProps<TPayload> {
  active?: boolean
  payload?: Array<{ payload?: TPayload }>
}

const TopInvestmentsTooltipContent: React.FC<
  ChartTooltipContentProps<TopInvestmentDatum> & { currencyCode: string }
> = ({ active, payload, currencyCode }) => {
  if (!active || !payload?.length || !payload[0].payload) {
    return null
  }

  const dataPoint = payload[0].payload

  return (
    <AnalyticsChartTooltip
      title={dataPoint.name}
      metrics={[
        {
          label: 'Total amount',
          value: formatCompactCurrency(dataPoint.totalAmount, dataPoint.currencyCode || currencyCode),
          color: 'var(--color-totalAmount)'
        }
      ]}
    />
  )
}

const AverageAmountTooltipContent: React.FC<
  ChartTooltipContentProps<InvestmentGroupDistributionDatum> & { currencyCode: string }
> = ({ active, payload, currencyCode }) => {
  if (!active || !payload?.length || !payload[0].payload) {
    return null
  }

  const dataPoint = payload[0].payload

  return (
    <AnalyticsChartTooltip
      title={dataPoint.category}
      metrics={[
        {
          label: 'Average amount',
          value: formatCompactCurrency(dataPoint.averageAmount, currencyCode),
          color: 'var(--color-averageAmount)'
        }
      ]}
      metadata={[
        { label: 'Investment count', value: dataPoint.count },
        { label: 'Total amount', value: formatCompactCurrency(dataPoint.totalAmount, currencyCode) }
      ]}
    />
  )
}

const InvestmentParetoTooltipContent: React.FC<
  ChartTooltipContentProps<InvestmentGroupParetoDatum> & { currencyCode: string }
> = ({ active, payload, currencyCode }) => {
  if (!active || !payload?.length || !payload[0].payload) {
    return null
  }

  const dataPoint = payload[0].payload

  return (
    <AnalyticsChartTooltip
      title={dataPoint.name}
      metrics={[
        {
          label: 'Total amount',
          value: formatCompactCurrency(dataPoint.totalAmount, dataPoint.currencyCode || currencyCode),
          color: 'var(--color-totalAmount)'
        },
        {
          label: 'Cumulative share',
          value: `${dataPoint.cumulativePercentage.toFixed(1)}%`,
          color: 'var(--color-cumulativePercentage)'
        }
      ]}
      metadata={[
        {
          label: 'Cumulative amount',
          value: formatCompactCurrency(dataPoint.cumulativeAmount, currencyCode)
        }
      ]}
    />
  )
}

const TopInvestmentsChart: React.FC<{ data: TopInvestmentDatum[]; currencyCode: string }> = ({
  data,
  currencyCode
}) => {
  const chartData = useMemo(() => data.map(item => ({ ...item, label: getShortCategoryLabel(item.name) })), [data])

  return (
    <ChartContainer config={topInvestmentsConfig} className="gba:h-96 gba:w-full">
      <BarChart data={chartData} margin={CATEGORY_CHART_MARGIN}>
        <XAxis dataKey="label" {...CATEGORY_AXIS_PROPS} />
        <YAxis tickFormatter={value => formatCompactCurrency(Number(value), currencyCode).replace(/[€$£¥]/g, '')} />
        <ChartTooltip content={<TopInvestmentsTooltipContent currencyCode={currencyCode} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="totalAmount" fill="var(--color-totalAmount)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

const AverageAmountChart: React.FC<{ data: InvestmentGroupDistributionDatum[]; currencyCode: string }> = ({
  data,
  currencyCode
}) => {
  const chartData = useMemo(() => data.map(item => ({ ...item, label: getShortCategoryLabel(item.category) })), [data])

  return (
    <ChartContainer config={averageAmountConfig} className="gba:h-80 gba:w-full">
      <BarChart data={chartData} margin={CATEGORY_CHART_MARGIN}>
        <XAxis dataKey="label" {...CATEGORY_AXIS_PROPS} />
        <YAxis tickFormatter={value => formatCompactCurrency(Number(value), currencyCode).replace(/[€$£¥]/g, '')} />
        <ChartTooltip content={<AverageAmountTooltipContent currencyCode={currencyCode} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="averageAmount" fill="var(--color-averageAmount)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

const InvestmentParetoChart: React.FC<{ data: InvestmentGroupParetoDatum[]; currencyCode: string }> = ({
  data,
  currencyCode
}) => {
  const chartData = useMemo(() => data.map(item => ({ ...item, label: getShortCategoryLabel(item.name) })), [data])

  return (
    <ChartContainer config={paretoConfig} className="gba:h-80 gba:w-full">
      <ComposedChart data={chartData} margin={CATEGORY_CHART_MARGIN}>
        <XAxis dataKey="label" {...CATEGORY_AXIS_PROPS} />
        <YAxis
          yAxisId="amount"
          tickFormatter={value => formatCompactCurrency(Number(value), currencyCode).replace(/[€$£¥]/g, '')}
        />
        <YAxis
          yAxisId="percentage"
          orientation="right"
          domain={[0, 100]}
          tickFormatter={value => `${Number(value).toFixed(0)}%`}
        />
        <ChartTooltip content={<InvestmentParetoTooltipContent currencyCode={currencyCode} />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar yAxisId="amount" dataKey="totalAmount" fill="var(--color-totalAmount)" radius={[4, 4, 0, 0]} />
        <Line
          yAxisId="percentage"
          dataKey="cumulativePercentage"
          stroke="var(--color-cumulativePercentage)"
          strokeWidth={3}
          dot={false}
        />
      </ComposedChart>
    </ChartContainer>
  )
}

export const InvestmentGroupPerformanceCharts: React.FC<InvestmentGroupPerformanceChartsProps> = ({
  accessToken,
  availableCurrencies,
  groupId,
  hasInvestmentTypes = false,
  selectedCurrency
}) => {
  const [topInvestmentsCurrency, setTopInvestmentsCurrency] = useState(selectedCurrency)
  const [typePerformanceCurrency, setTypePerformanceCurrency] = useState(selectedCurrency)
  const [paretoCurrency, setParetoCurrency] = useState(selectedCurrency)

  const allOptionLabel = getTranslationFromI18nKeyAndLabel('currency.filter.all', 'All')

  useEffect(() => {
    setTopInvestmentsCurrency(selectedCurrency)
    setTypePerformanceCurrency(selectedCurrency)
    setParetoCurrency(selectedCurrency)
  }, [selectedCurrency])

  const {
    topInvestments,
    isLoading: topLoading,
    error: topError,
    refetch: refetchTop
  } = useInvestmentGroupTopInvestments(accessToken, groupId, topInvestmentsCurrency)

  const {
    typePerformance,
    isLoading: typeLoading,
    error: typeError,
    refetch: refetchType
  } = useInvestmentGroupTypePerformance(accessToken, groupId, typePerformanceCurrency, hasInvestmentTypes)

  const {
    paretoInvestments,
    isLoading: paretoLoading,
    error: paretoError,
    refetch: refetchPareto
  } = useInvestmentGroupParetoInvestments(accessToken, groupId, paretoCurrency)

  return (
    <div className="gba:grid gba:grid-cols-1 gba:gap-6">
      <AnalyticsChartCard
        title="Top Investments by Amount"
        description="Largest investments in this group by total investment amount"
        icon={ChartBarIcon}
        isLoading={topLoading}
        error={topError}
        isEmpty={topInvestments.length === 0}
        onRetry={refetchTop}
        headerAction={
          <CurrencyFilter
            value={topInvestmentsCurrency}
            onChange={setTopInvestmentsCurrency}
            currencies={availableCurrencies}
            allOptionLabel={allOptionLabel}
            showLabel={false}
            dataTestId="top-investments-performance-currency-filter"
          />
        }
      >
        <TopInvestmentsChart data={topInvestments} currencyCode={getDisplayCurrency(topInvestmentsCurrency)} />
      </AnalyticsChartCard>

      {hasInvestmentTypes && (
        <AnalyticsChartCard
          title="Average Amount by Type"
          description="Average total investment amount per investment type"
          icon={ChartBarIcon}
          isLoading={typeLoading}
          error={typeError}
          isEmpty={typePerformance.length === 0}
          onRetry={refetchType}
          headerAction={
            <CurrencyFilter
              value={typePerformanceCurrency}
              onChange={setTypePerformanceCurrency}
              currencies={availableCurrencies}
              allOptionLabel={allOptionLabel}
              showLabel={false}
              dataTestId="average-type-performance-currency-filter"
            />
          }
        >
          <AverageAmountChart data={typePerformance} currencyCode={getDisplayCurrency(typePerformanceCurrency)} />
        </AnalyticsChartCard>
      )}

      <AnalyticsChartCard
        title="Investment Amount Pareto"
        description="Top investments by amount with cumulative share of total invested amount"
        icon={ChartLineUpIcon}
        isLoading={paretoLoading}
        error={paretoError}
        isEmpty={paretoInvestments.length === 0}
        onRetry={refetchPareto}
        headerAction={
          <CurrencyFilter
            value={paretoCurrency}
            onChange={setParetoCurrency}
            currencies={availableCurrencies}
            allOptionLabel={allOptionLabel}
            showLabel={false}
            dataTestId="pareto-performance-currency-filter"
          />
        }
      >
        <InvestmentParetoChart data={paretoInvestments} currencyCode={getDisplayCurrency(paretoCurrency)} />
      </AnalyticsChartCard>
    </div>
  )
}
