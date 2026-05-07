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
  Alert
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'
import { formatCurrencyCompact, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { isAllCurrencySelection } from '@/common/data/investment/utils/investmentCurrencySelection'
import { ChartPieSliceIcon, ChartDonutIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { AnalyticsChartTooltip, CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import {
  usePortfolioGroupCountDistribution,
  usePortfolioGroupAmountDistribution,
  usePortfolioStatusCountDistribution,
  usePortfolioStatusAmountDistribution,
  usePortfolioCurrencyCountDistribution,
  usePortfolioCurrencyAmountDistribution
} from '../hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface PortfolioDistributionChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

const getDisplayCurrency = (currency: string) =>
  isAllCurrencySelection(currency) ? 'EUR' : extractCurrencyCode(currency)

const renderDistributionTooltip = ({
  active,
  payload,
  labelKey,
  total,
  metricLabel,
  valueFormatter
}: {
  active?: boolean
  payload?: Array<{ value?: number; payload?: Record<string, any> }>
  labelKey: string
  total: number
  metricLabel: string
  valueFormatter: (value: number, item: Record<string, any>) => string
}) => {
  if (active && payload?.length) {
    const data = payload[0]
    const item = data.payload ?? {}
    const value = Number(data.value ?? 0)
    const percentage = total > 0 ? `${((value / total) * 100).toFixed(1)}%` : '0%'

    return (
      <AnalyticsChartTooltip
        title={item[labelKey]}
        metrics={[
          {
            label: metricLabel,
            value: valueFormatter(value, item),
            color: `var(--color-${item.name})`
          }
        ]}
        metadata={[{ label: 'Share of total', value: percentage }]}
      />
    )
  }

  return null
}

interface PortfolioDistributionTooltipContentProps {
  active?: boolean
  payload?: Array<{ value?: number; payload?: Record<string, any> }>
  labelKey: string
  total: number
  metricLabel: string
  valueFormatter: (value: number, item: Record<string, any>) => string
}

const PortfolioDistributionTooltipContent: React.FC<PortfolioDistributionTooltipContentProps> = props =>
  renderDistributionTooltip(props)

export const PortfolioDistributionCharts: React.FC<PortfolioDistributionChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Currency filters sync with the overview-level currency selection.
  const [groupCountCurrency, setGroupCountCurrency] = useCurrencySync(masterCurrency, 'all')
  const [groupAmountCurrency, setGroupAmountCurrency] = useCurrencySync(masterCurrency, 'all')
  const [statusCountCurrency, setStatusCountCurrency] = useCurrencySync(masterCurrency, 'all')
  const [statusAmountCurrency, setStatusAmountCurrency] = useCurrencySync(masterCurrency, 'all')
  const allOptionLabel = getTranslationFromI18nKeyAndLabel('currency.all', 'All')
  const formatCurrencyLabel = (currency: string) => (isAllCurrencySelection(currency) ? allOptionLabel : currency)

  // Fetch group distribution data using server-side queries
  const {
    data: groupCountData,
    isLoading: isLoadingGroupCount,
    error: groupCountError,
    refetch: refetchGroupCount
  } = usePortfolioGroupCountDistribution(props, groupCountCurrency)

  const {
    data: groupAmountData,
    isLoading: isLoadingGroupAmount,
    error: groupAmountError,
    refetch: refetchGroupAmount
  } = usePortfolioGroupAmountDistribution(props, groupAmountCurrency)

  // Fetch status distribution data using server-side queries
  const {
    data: statusCountData,
    isLoading: isLoadingStatusCount,
    error: statusCountError,
    refetch: refetchStatusCount
  } = usePortfolioStatusCountDistribution(props, statusCountCurrency)

  const {
    data: statusAmountData,
    isLoading: isLoadingStatusAmount,
    error: statusAmountError,
    refetch: refetchStatusAmount
  } = usePortfolioStatusAmountDistribution(props, statusAmountCurrency)

  // Fetch currency distribution data using server-side queries
  const {
    data: currencyCountData,
    isLoading: isLoadingCurrencyCount,
    error: currencyCountError,
    refetch: refetchCurrencyCount
  } = usePortfolioCurrencyCountDistribution(props)

  const {
    data: currencyAmountData,
    isLoading: isLoadingCurrencyAmount,
    error: currencyAmountError,
    refetch: refetchCurrencyAmount
  } = usePortfolioCurrencyAmountDistribution(props)

  // Pre-compute chart configs (must be outside conditional rendering)
  const groupCountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of groupCountData) {
      const key = item.group.toLowerCase().replace(/\s+/g, '')
      config[key] = { label: item.group }
    }
    return config
  }, [groupCountData])

  const groupAmountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of groupAmountData) {
      const key = item.group.toLowerCase().replace(/\s+/g, '')
      config[key] = { label: item.group }
    }
    return config
  }, [groupAmountData])

  const statusCountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of statusCountData) {
      const key = item.status.toLowerCase().replace(/\s+/g, '')
      config[key] = { label: item.status }
    }
    return config
  }, [statusCountData])

  const statusAmountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of statusAmountData) {
      const key = item.status.toLowerCase().replace(/\s+/g, '')
      config[key] = { label: item.status }
    }
    return config
  }, [statusAmountData])

  const currencyCountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of currencyCountData) {
      const key = item.currency.toLowerCase().replace(/\s+/g, '')
      config[key] = { label: item.currency }
    }
    return config
  }, [currencyCountData])

  const currencyAmountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of currencyAmountData) {
      const key = item.currency.toLowerCase().replace(/\s+/g, '')
      config[key] = { label: item.currency }
    }
    return config
  }, [currencyAmountData])

  return (
    <div className="gba:space-y-6">
      {/* Group Distribution */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={ChartPieSliceIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Group Distribution by Count</CardTitle>
                  <CardDescription>
                    Number of investments per investment group ({formatCurrencyLabel(groupCountCurrency)})
                  </CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <CurrencyFilter
                  currencies={availableCurrencies}
                  value={groupCountCurrency}
                  onChange={setGroupCountCurrency}
                  dataTestId="group-count-currency-filter"
                  showLabel={false}
                  allOptionLabel={allOptionLabel}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoadingGroupCount) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[300px]">
                    <Spinner size="lg" />
                  </div>
                )
              }
              if (groupCountError) {
                return (
                  <Alert variant="destructive" className="gba:mb-4">
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <span>Error loading group count data: {groupCountError}</span>
                      <button
                        onClick={refetchGroupCount}
                        className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive/90"
                      >
                        Retry
                      </button>
                    </div>
                  </Alert>
                )
              }
              return (
                <ChartContainer config={groupCountChartConfig} className="gba:h-[300px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={groupCountData.map((item: any) => {
                        const key = item.group.toLowerCase().replace(/\s+/g, '')
                        return {
                          ...item,
                          name: key,
                          value: item.count,
                          fill: `var(--color-${key})`
                        }
                      })}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                    />
                    <ChartTooltip
                      content={
                        <PortfolioDistributionTooltipContent
                          labelKey="group"
                          total={groupCountData.reduce((sum, item) => sum + item.count, 0)}
                          metricLabel="Investment count"
                          valueFormatter={value => `${value} investments`}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Group Distribution by Total Amount</CardTitle>
                  <CardDescription>Total amount per group ({formatCurrencyLabel(groupAmountCurrency)})</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <CurrencyFilter
                  value={groupAmountCurrency}
                  onChange={setGroupAmountCurrency}
                  currencies={availableCurrencies}
                  showLabel={false}
                  dataTestId="group-amount-currency-filter"
                  allOptionLabel={allOptionLabel}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoadingGroupAmount) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[300px]">
                    <Spinner size="lg" />
                  </div>
                )
              }
              if (groupAmountError) {
                return (
                  <Alert variant="destructive" className="gba:mb-4">
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <span>Error loading group amount data: {groupAmountError}</span>
                      <button
                        onClick={refetchGroupAmount}
                        className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive/90"
                      >
                        Retry
                      </button>
                    </div>
                  </Alert>
                )
              }
              return (
                <ChartContainer config={groupAmountChartConfig} className="gba:h-[300px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={groupAmountData.map((item: any) => {
                        const key = item.group.toLowerCase().replace(/\s+/g, '')
                        return {
                          ...item,
                          name: key,
                          value: item.totalAmount,
                          fill: `var(--color-${key})`
                        }
                      })}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                    />
                    <ChartTooltip
                      content={
                        <PortfolioDistributionTooltipContent
                          labelKey="group"
                          total={groupAmountData.reduce((sum, item) => sum + item.totalAmount, 0)}
                          metricLabel="Total amount"
                          valueFormatter={value =>
                            formatCurrencyCompact(value, getDisplayCurrency(groupAmountCurrency), undefined, 1, true)
                          }
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={ChartDonutIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Status Distribution by Count</CardTitle>
                  <CardDescription>
                    Number of investments per status ({formatCurrencyLabel(statusCountCurrency)})
                  </CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <CurrencyFilter
                  currencies={availableCurrencies}
                  value={statusCountCurrency}
                  onChange={setStatusCountCurrency}
                  dataTestId="status-count-currency-filter"
                  showLabel={false}
                  allOptionLabel={allOptionLabel}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoadingStatusCount) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[300px]">
                    <Spinner size="lg" />
                  </div>
                )
              }
              if (statusCountError) {
                return (
                  <Alert variant="destructive" className="gba:mb-4">
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <span>Error loading status count data: {statusCountError}</span>
                      <button
                        onClick={refetchStatusCount}
                        className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive/90"
                      >
                        Retry
                      </button>
                    </div>
                  </Alert>
                )
              }
              return (
                <ChartContainer config={statusCountChartConfig} className="gba:h-[300px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={statusCountData.map((item: any) => {
                        const key = item.status.toLowerCase().replace(/\s+/g, '')
                        return {
                          ...item,
                          name: key,
                          value: item.count,
                          fill: `var(--color-${key})`
                        }
                      })}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                    />
                    <ChartTooltip
                      content={
                        <PortfolioDistributionTooltipContent
                          labelKey="status"
                          total={statusCountData.reduce((sum: number, item: any) => sum + item.count, 0)}
                          metricLabel="Investment count"
                          valueFormatter={value => `${value} investments`}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>
                    Status Distribution by Total Amount ({formatCurrencyLabel(statusAmountCurrency)})
                  </CardTitle>
                  <CardDescription>Total invested amount per status</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <CurrencyFilter
                  value={statusAmountCurrency}
                  onChange={setStatusAmountCurrency}
                  currencies={availableCurrencies}
                  showLabel={false}
                  dataTestId="status-amount-currency-filter"
                  allOptionLabel={allOptionLabel}
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoadingStatusAmount) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[300px]">
                    <Spinner size="lg" />
                  </div>
                )
              }
              if (statusAmountError) {
                return (
                  <Alert variant="destructive" className="gba:mb-4">
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <span>Error loading status amount data: {statusAmountError}</span>
                      <button
                        onClick={refetchStatusAmount}
                        className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive/90"
                      >
                        Retry
                      </button>
                    </div>
                  </Alert>
                )
              }
              return (
                <ChartContainer config={statusAmountChartConfig} className="gba:h-[300px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={statusAmountData.map((item: any) => {
                        const key = item.status.toLowerCase().replace(/\s+/g, '')
                        return {
                          ...item,
                          name: key,
                          value: item.totalAmount,
                          fill: `var(--color-${key})`
                        }
                      })}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                    />
                    <ChartTooltip
                      content={
                        <PortfolioDistributionTooltipContent
                          labelKey="status"
                          total={statusAmountData.reduce((sum: number, item: any) => sum + item.totalAmount, 0)}
                          metricLabel="Total amount"
                          valueFormatter={value =>
                            formatCurrencyCompact(value, getDisplayCurrency(statusAmountCurrency), undefined, 1, true)
                          }
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Currency Distribution */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Currency Distribution by Count</CardTitle>
                  <CardDescription>Number of investments per currency</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div> {/* Placeholder to match filter area */}
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoadingCurrencyCount) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[300px]">
                    <Spinner size="lg" />
                  </div>
                )
              }
              if (currencyCountError) {
                return (
                  <Alert variant="destructive" className="gba:mb-4">
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <span>Error loading currency count data: {currencyCountError}</span>
                      <button
                        onClick={refetchCurrencyCount}
                        className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive/90"
                      >
                        Retry
                      </button>
                    </div>
                  </Alert>
                )
              }
              return (
                <ChartContainer config={currencyCountChartConfig} className="gba:h-[300px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={currencyCountData.map((item: any) => {
                        const key = item.currency.toLowerCase().replace(/\s+/g, '')
                        return {
                          ...item,
                          name: key,
                          value: item.count,
                          fill: `var(--color-${key})`
                        }
                      })}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                    />
                    <ChartTooltip
                      content={
                        <PortfolioDistributionTooltipContent
                          labelKey="currency"
                          total={currencyCountData.reduce((sum: number, item: any) => sum + item.count, 0)}
                          metricLabel="Investment count"
                          valueFormatter={value => `${value} investments`}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )
            })()}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Currency Distribution by Total Amount</CardTitle>
                  <CardDescription>Total invested amount per currency</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div> {/* Placeholder to match filter area */}
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoadingCurrencyAmount) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[300px]">
                    <Spinner size="lg" />
                  </div>
                )
              }
              if (currencyAmountError) {
                return (
                  <Alert variant="destructive" className="gba:mb-4">
                    <div className="gba:flex gba:justify-between gba:items-center">
                      <span>Error loading currency amount data: {currencyAmountError}</span>
                      <button
                        onClick={refetchCurrencyAmount}
                        className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive gba:text-destructive-foreground gba:rounded gba:hover:bg-destructive/90"
                      >
                        Retry
                      </button>
                    </div>
                  </Alert>
                )
              }
              return (
                <ChartContainer config={currencyAmountChartConfig} className="gba:h-[300px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={currencyAmountData.map((item: any) => {
                        const key = item.currency.toLowerCase().replace(/\s+/g, '')
                        return {
                          ...item,
                          name: key,
                          value: item.totalAmount,
                          fill: `var(--color-${key})`
                        }
                      })}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      nameKey="name"
                    />
                    <ChartTooltip
                      content={
                        <PortfolioDistributionTooltipContent
                          labelKey="currency"
                          total={currencyAmountData.reduce((sum: number, item: any) => sum + item.totalAmount, 0)}
                          metricLabel="Total amount"
                          valueFormatter={(value, item) =>
                            formatCurrencyCompact(value, extractCurrencyCode(item.currency), undefined, 1, true)
                          }
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
