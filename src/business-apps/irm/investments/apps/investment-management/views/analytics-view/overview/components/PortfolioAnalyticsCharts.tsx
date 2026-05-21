import React from 'react'
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
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { Bar, BarChart, ComposedChart, Line, XAxis, YAxis } from 'recharts'
import { formatCurrencyCompact, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { isAllCurrencySelection } from '@/common/data/investment/utils/investmentCurrencySelection'
import { ChartBarIcon, ChartLineUpIcon } from '@phosphor-icons/react'
import {
  CATEGORY_AXIS_PROPS,
  CATEGORY_CHART_MARGIN,
  getShortCategoryLabel
} from '../../group-analytics/components/chartLayout'
import { AnalyticsChartTooltip, CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { usePortfolioTopInvestments } from '../hooks'

interface PortfolioAnalyticsChartsProps {
  masterCurrency: string
  availableCurrencies: string[]
  accessToken: string
}

const getDisplayCurrency = (currency: string) =>
  isAllCurrencySelection(currency) ? 'EUR' : extractCurrencyCode(currency)

interface PortfolioInvestmentTooltipDatum {
  name: string
  groupName: string
  typeName: string
  totalValue: number
  cumulativePercentage: number
  cumulativeValue: number
  currencyCode?: string
}

interface PortfolioInvestmentTooltipContentProps {
  active?: boolean
  payload?: Array<{ payload?: PortfolioInvestmentTooltipDatum }>
  currencyCode: string
}

const TopInvestmentTooltipContent: React.FC<PortfolioInvestmentTooltipContentProps> = ({
  active,
  payload,
  currencyCode
}) => {
  if (!active || !payload?.length || !payload[0].payload) {
    return null
  }

  const data = payload[0].payload

  return (
    <AnalyticsChartTooltip
      title={data.name}
      metrics={[
        {
          label: 'Investment value',
          value: formatCurrencyCompact(data.totalValue, data.currencyCode || currencyCode, undefined, 1, true),
          color: 'var(--color-totalValue)'
        }
      ]}
      metadata={[
        { label: 'Group', value: data.groupName },
        { label: 'Type', value: data.typeName }
      ]}
    />
  )
}

const PortfolioParetoTooltipContent: React.FC<PortfolioInvestmentTooltipContentProps> = ({
  active,
  payload,
  currencyCode
}) => {
  if (!active || !payload?.length || !payload[0].payload) {
    return null
  }

  const data = payload[0].payload

  return (
    <AnalyticsChartTooltip
      title={data.name}
      metrics={[
        {
          label: 'Investment value',
          value: formatCurrencyCompact(data.totalValue, data.currencyCode || currencyCode, undefined, 1, true),
          color: 'var(--color-totalValue)'
        },
        {
          label: 'Cumulative share',
          value: `${data.cumulativePercentage.toFixed(1)}%`,
          color: 'var(--color-cumulativePercentage)'
        }
      ]}
      metadata={[
        { label: 'Group', value: data.groupName },
        { label: 'Type', value: data.typeName },
        {
          label: 'Cumulative value',
          value: formatCurrencyCompact(data.cumulativeValue, currencyCode, undefined, 1, true)
        }
      ]}
    />
  )
}

export const PortfolioAnalyticsCharts: React.FC<PortfolioAnalyticsChartsProps> = ({
  masterCurrency,
  availableCurrencies,
  accessToken
}) => {
  const allOptionLabel = getTranslationFromI18nKeyAndLabel('currency.all', 'All')
  const formatCurrencyLabel = (currency: string) => (isAllCurrencySelection(currency) ? allOptionLabel : currency)
  const [topInvestmentsCurrency, setTopInvestmentsCurrency] = useCurrencySync(masterCurrency, 'all')
  const [paretoCurrency, setParetoCurrency] = useCurrencySync(masterCurrency, 'all')

  const {
    investments: topInvestments,
    isLoading: isLoadingTopInvestments,
    error: topInvestmentsError,
    refetch: refetchTopInvestments
  } = usePortfolioTopInvestments(accessToken, topInvestmentsCurrency, 10)

  const {
    investments: paretoInvestments,
    isLoading: isLoadingPareto,
    error: paretoError,
    refetch: refetchPareto
  } = usePortfolioTopInvestments(accessToken, paretoCurrency, 10)

  const topInvestmentsChartConfig = {
    totalValue: { label: 'Investment value' }
  }

  const paretoChartConfig = {
    totalValue: { label: 'Investment value' },
    cumulativePercentage: { label: 'Cumulative share' }
  }
  const topInvestmentsChartData = topInvestments.map(investment => ({
    ...investment,
    label: getShortCategoryLabel(investment.name)
  }))
  const paretoChartData = paretoInvestments.map(investment => ({
    ...investment,
    label: getShortCategoryLabel(investment.name)
  }))

  return (
    <>
      <div className="gba:col-span-full gba:mb-6">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={ChartBarIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Top 10 Investments by Value ({formatCurrencyLabel(topInvestmentsCurrency)})</CardTitle>
                  <CardDescription>Largest investments ranked by total invested value</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <span className="gba:text-xs gba:text-gray-500">Currency:</span>
                <CurrencyFilter
                  value={topInvestmentsCurrency}
                  onChange={setTopInvestmentsCurrency}
                  currencies={availableCurrencies}
                  showLabel={false}
                  dataTestId="top-investments-currency-filter"
                  allOptionLabel={allOptionLabel}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoadingTopInvestments) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px]">
                    <Spinner size="lg" />
                  </div>
                )
              }
              if (topInvestmentsError) {
                return (
                  <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-[400px] gba:gap-4">
                    <div className="gba:text-red-600 gba:text-center">
                      <div className="gba:font-semibold">Error Loading Data</div>
                      <div className="gba:text-sm gba:mt-2">{topInvestmentsError}</div>
                    </div>
                    <Button size="sm" onClick={refetchTopInvestments}>
                      Retry
                    </Button>
                  </div>
                )
              }
              if (topInvestments.length === 0) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px] gba:text-gray-500">
                    No investment data available
                  </div>
                )
              }
              return (
                <ChartContainer config={topInvestmentsChartConfig} className="gba:h-[400px] gba:w-full">
                  <BarChart data={topInvestmentsChartData} margin={CATEGORY_CHART_MARGIN} maxBarSize={60}>
                    <XAxis dataKey="label" {...CATEGORY_AXIS_PROPS} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={value =>
                        formatCurrencyCompact(
                          value,
                          getDisplayCurrency(topInvestmentsCurrency),
                          undefined,
                          1,
                          true
                        ).replace(/[€$£¥]/g, '')
                      }
                    />
                    <ChartTooltip
                      content={
                        <TopInvestmentTooltipContent currencyCode={getDisplayCurrency(topInvestmentsCurrency)} />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="totalValue" fill="var(--color-totalValue)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      <Card className="gba:col-span-full">
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartLineUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Top 10 Investment Pareto ({formatCurrencyLabel(paretoCurrency)})</CardTitle>
                <CardDescription>Top investments by value with cumulative portfolio share</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <CurrencyFilter
                value={paretoCurrency}
                onChange={setParetoCurrency}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="pareto-investments-currency-filter"
                allOptionLabel={allOptionLabel}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (isLoadingPareto) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px]">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (paretoError) {
              return (
                <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-[400px] gba:gap-4">
                  <div className="gba:text-red-600 gba:text-center">
                    <div className="gba:font-semibold">Error Loading Data</div>
                    <div className="gba:text-sm gba:mt-2">{paretoError}</div>
                  </div>
                  <Button size="sm" onClick={refetchPareto}>
                    Retry
                  </Button>
                </div>
              )
            }
            if (paretoInvestments.length === 0) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px] gba:text-gray-500">
                  No investment data available
                </div>
              )
            }
            return (
              <ChartContainer config={paretoChartConfig} className="gba:h-[400px] gba:w-full">
                <ComposedChart data={paretoChartData} margin={CATEGORY_CHART_MARGIN}>
                  <XAxis dataKey="label" {...CATEGORY_AXIS_PROPS} />
                  <YAxis
                    yAxisId="amount"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(value, getDisplayCurrency(paretoCurrency), undefined, 1, true).replace(
                        /[€$£¥]/g,
                        ''
                      )
                    }
                  />
                  <YAxis
                    yAxisId="percentage"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    domain={[0, 100]}
                    tickFormatter={value => `${value}%`}
                  />
                  <ChartTooltip
                    content={<PortfolioParetoTooltipContent currencyCode={getDisplayCurrency(paretoCurrency)} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="amount" dataKey="totalValue" fill="var(--color-totalValue)" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="percentage"
                    type="monotone"
                    dataKey="cumulativePercentage"
                    stroke="var(--color-cumulativePercentage)"
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
    </>
  )
}
