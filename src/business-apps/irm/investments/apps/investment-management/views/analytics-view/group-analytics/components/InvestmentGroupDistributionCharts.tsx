import React, { useEffect, useMemo, useState } from 'react'
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip } from '@newwork/nw-design-system'
import { Pie, PieChart } from 'recharts'
import { ChartPieSliceIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { AnalyticsChartTooltip, CurrencyFilter } from '../../shared/components'
import { useInvestmentGroupDistributions } from '../hooks/useInvestmentGroupDistributions'
import type { InvestmentGroupDistributionDatum } from '../queries/shared'
import { AnalyticsChartCard } from './AnalyticsChartCard'
import { formatCompactCurrency, formatCompactNumber, getDisplayCurrency, toChartKey } from './chartFormatters'

interface InvestmentGroupDistributionChartsProps {
  accessToken?: string
  availableCurrencies: string[]
  groupId: string
  hasInvestmentTypes?: boolean
  selectedCurrency: string
}

interface DistributionChartProps {
  data: InvestmentGroupDistributionDatum[]
  valueKey: 'count' | 'totalAmount'
  currencyCode?: string
  useCategoryAsCurrencyCode?: boolean
}

interface DistributionPieTooltipContentProps {
  active?: boolean
  payload?: Array<{
    payload?: {
      category: string
      fill: string
      value: number
    }
  }>
  valueKey: 'count' | 'totalAmount'
  totalValue: number
  currencyCode: string
  useCategoryAsCurrencyCode: boolean
}

const DistributionPieTooltipContent: React.FC<DistributionPieTooltipContentProps> = ({
  active,
  payload,
  valueKey,
  totalValue,
  currencyCode,
  useCategoryAsCurrencyCode
}) => {
  if (!active || !payload?.length || !payload[0].payload) {
    return null
  }

  const dataPoint = payload[0].payload
  const isAmount = valueKey === 'totalAmount'
  const percentage = totalValue > 0 ? `${((dataPoint.value / totalValue) * 100).toFixed(1)}%` : '0%'
  const displayCurrencyCode = useCategoryAsCurrencyCode ? dataPoint.category : currencyCode

  return (
    <AnalyticsChartTooltip
      title={dataPoint.category}
      metrics={[
        {
          label: isAmount ? 'Total amount' : 'Investment count',
          value: isAmount
            ? formatCompactCurrency(dataPoint.value, displayCurrencyCode)
            : formatCompactNumber(dataPoint.value),
          color: dataPoint.fill
        }
      ]}
      metadata={[{ label: 'Share of total', value: percentage }]}
    />
  )
}

const DistributionPieChart: React.FC<DistributionChartProps> = ({
  data,
  valueKey,
  currencyCode = 'EUR',
  useCategoryAsCurrencyCode = false
}) => {
  const chartData = useMemo(
    () =>
      data
        .map(item => {
          const key = toChartKey(item.category)
          return {
            name: key,
            category: item.category,
            value: item[valueKey],
            fill: `var(--color-${key})`
          }
        })
        .filter(item => item.value > 0),
    [data, valueKey]
  )

  const chartConfig = useMemo(
    () =>
      Object.fromEntries(
        chartData.map(item => [
          item.name,
          {
            label: item.category
          }
        ])
      ),
    [chartData]
  )
  const totalValue = useMemo(() => chartData.reduce((sum, item) => sum + item.value, 0), [chartData])

  return (
    <ChartContainer config={chartConfig} className="gba:h-80 gba:w-full">
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" outerRadius={96} dataKey="value" nameKey="name" />
        <ChartTooltip
          content={
            <DistributionPieTooltipContent
              valueKey={valueKey}
              totalValue={totalValue}
              currencyCode={currencyCode}
              useCategoryAsCurrencyCode={useCategoryAsCurrencyCode}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  )
}

export const InvestmentGroupDistributionCharts: React.FC<InvestmentGroupDistributionChartsProps> = ({
  accessToken,
  availableCurrencies,
  groupId,
  hasInvestmentTypes = false,
  selectedCurrency
}) => {
  const [typeCountCurrency, setTypeCountCurrency] = useState(selectedCurrency)
  const [typeAmountCurrency, setTypeAmountCurrency] = useState(selectedCurrency)
  const [statusCountCurrency, setStatusCountCurrency] = useState(selectedCurrency)
  const [statusAmountCurrency, setStatusAmountCurrency] = useState(selectedCurrency)
  const allOptionLabel = getTranslationFromI18nKeyAndLabel('currency.filter.all', 'All')

  useEffect(() => {
    setTypeCountCurrency(selectedCurrency)
    setStatusCountCurrency(selectedCurrency)
    setTypeAmountCurrency(selectedCurrency)
    setStatusAmountCurrency(selectedCurrency)
  }, [selectedCurrency])

  const {
    typeCountDistribution,
    typeAmountDistribution,
    statusCountDistribution,
    statusAmountDistribution,
    currencyDistribution,
    typeCountLoading,
    typeAmountLoading,
    statusCountLoading,
    statusAmountLoading,
    currencyLoading,
    error,
    refetch
  } = useInvestmentGroupDistributions(
    accessToken,
    groupId,
    {
      typeCountCurrency,
      typeAmountCurrency,
      statusCountCurrency,
      statusAmountCurrency
    },
    true,
    hasInvestmentTypes
  )
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
    <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:xl:grid-cols-2">
      {hasInvestmentTypes && (
        <>
          <AnalyticsChartCard
            title="Type Distribution by Count"
            description="Number of investments by investment type"
            icon={ChartPieSliceIcon}
            isLoading={typeCountLoading}
            error={error}
            isEmpty={typeCountDistribution.every(item => item.count === 0)}
            onRetry={refetch}
            headerAction={renderCurrencyFilter(typeCountCurrency, setTypeCountCurrency, 'type-count-currency-filter')}
          >
            <DistributionPieChart data={typeCountDistribution} valueKey="count" />
          </AnalyticsChartCard>

          <AnalyticsChartCard
            title={`Type Distribution by Amount (${getDisplayCurrency(typeAmountCurrency)})`}
            description="Total investment amount by investment type"
            icon={CurrencyCircleDollarIcon}
            isLoading={typeAmountLoading}
            error={error}
            isEmpty={typeAmountDistribution.every(item => item.totalAmount === 0)}
            onRetry={refetch}
            headerAction={renderCurrencyFilter(
              typeAmountCurrency,
              setTypeAmountCurrency,
              'type-amount-currency-filter'
            )}
          >
            <DistributionPieChart
              data={typeAmountDistribution}
              valueKey="totalAmount"
              currencyCode={getDisplayCurrency(typeAmountCurrency)}
            />
          </AnalyticsChartCard>
        </>
      )}

      <AnalyticsChartCard
        title="Status Distribution by Count"
        description="Number of investments by status"
        icon={ChartPieSliceIcon}
        isLoading={statusCountLoading}
        error={error}
        isEmpty={statusCountDistribution.every(item => item.count === 0)}
        onRetry={refetch}
        headerAction={renderCurrencyFilter(statusCountCurrency, setStatusCountCurrency, 'status-count-currency-filter')}
      >
        <DistributionPieChart data={statusCountDistribution} valueKey="count" />
      </AnalyticsChartCard>

      <AnalyticsChartCard
        title={`Status Distribution by Amount (${getDisplayCurrency(statusAmountCurrency)})`}
        description="Total investment amount by status"
        icon={CurrencyCircleDollarIcon}
        isLoading={statusAmountLoading}
        error={error}
        isEmpty={statusAmountDistribution.every(item => item.totalAmount === 0)}
        onRetry={refetch}
        headerAction={renderCurrencyFilter(
          statusAmountCurrency,
          setStatusAmountCurrency,
          'status-amount-currency-filter'
        )}
      >
        <DistributionPieChart
          data={statusAmountDistribution}
          valueKey="totalAmount"
          currencyCode={getDisplayCurrency(statusAmountCurrency)}
        />
      </AnalyticsChartCard>

      <AnalyticsChartCard
        title="Currency Distribution by Count"
        description="Number of investments by currency"
        icon={ChartPieSliceIcon}
        isLoading={currencyLoading}
        error={error}
        isEmpty={currencyDistribution.every(item => item.count === 0)}
        onRetry={refetch}
      >
        <DistributionPieChart data={currencyDistribution} valueKey="count" />
      </AnalyticsChartCard>

      <AnalyticsChartCard
        title="Currency Distribution by Amount"
        description="Total investment amount by currency"
        icon={CurrencyCircleDollarIcon}
        isLoading={currencyLoading}
        error={error}
        isEmpty={currencyDistribution.every(item => item.totalAmount === 0)}
        onRetry={refetch}
      >
        <DistributionPieChart data={currencyDistribution} valueKey="totalAmount" useCategoryAsCurrencyCode />
      </AnalyticsChartCard>
    </div>
  )
}
