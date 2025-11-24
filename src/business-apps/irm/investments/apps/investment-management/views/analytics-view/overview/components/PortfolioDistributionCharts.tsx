import React, { useMemo, useState, useEffect } from 'react'
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
import { PieChart, Pie, Cell } from 'recharts'
import { formatCurrencyCompact, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { ChartPieSliceIcon, ChartDonutIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { CurrencyFilter } from '../../shared/components'
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

export const PortfolioDistributionCharts: React.FC<PortfolioDistributionChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Currency filters with "All" support for count charts
  const [groupCountCurrency, setGroupCountCurrency] = useState('All')
  const [groupAmountCurrency, setGroupAmountCurrency] = useCurrencySync(masterCurrency)
  const [statusCountCurrency, setStatusCountCurrency] = useState('All')
  const [statusAmountCurrency, setStatusAmountCurrency] = useCurrencySync(masterCurrency)

  // Sync count currency with master when master changes
  useEffect(() => {
    setGroupCountCurrency('All')
    setStatusCountCurrency('All')
  }, [masterCurrency])

  // Currency options with "All" for count charts
  const currencyOptionsWithAll = useMemo(() => ['All', ...availableCurrencies], [availableCurrencies])

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
      const key = item.group.toLowerCase().replaceAll(/\s+/g, '')
      config[key] = { label: item.group }
    }
    return config
  }, [groupCountData])

  const groupAmountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of groupAmountData) {
      const key = item.group.toLowerCase().replaceAll(/\s+/g, '')
      config[key] = { label: item.group }
    }
    return config
  }, [groupAmountData])

  const statusCountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of statusCountData) {
      const key = item.status.toLowerCase().replaceAll(/\s+/g, '')
      config[key] = { label: item.status }
    }
    return config
  }, [statusCountData])

  const statusAmountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of statusAmountData) {
      const key = item.status.toLowerCase().replaceAll(/\s+/g, '')
      config[key] = { label: item.status }
    }
    return config
  }, [statusAmountData])

  const currencyCountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of currencyCountData) {
      const key = item.currency.toLowerCase().replaceAll(/\s+/g, '')
      config[key] = { label: item.currency }
    }
    return config
  }, [currencyCountData])

  const currencyAmountChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    for (const item of currencyAmountData) {
      const key = item.currency.toLowerCase().replaceAll(/\s+/g, '')
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
                  <CardDescription>Number of investments per investment group ({groupCountCurrency})</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <CurrencyFilter
                  currencies={currencyOptionsWithAll}
                  value={groupCountCurrency}
                  onChange={setGroupCountCurrency}
                  dataTestId="group-count-currency-filter"
                  showLabel={false}
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
                        const key = item.group.toLowerCase().replaceAll(/\s+/g, '')
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
                    >
                      {groupCountData.map((entry: any) => {
                        const key = entry.group.toLowerCase().replaceAll(/\s+/g, '')
                        return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                      })}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const data = payload[0]
                          const groupKey = data.payload.name
                          const total = groupCountData.reduce((sum, item) => sum + item.count, 0)
                          const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                          return (
                            <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: `var(--color-${groupKey})` }}
                                />
                                <span className="gba:font-medium">{data.payload.group}</span>
                              </div>
                              <div className="gba:text-lg gba:font-semibold">{data.value} investments</div>
                              <div className="gba:text-sm gba:text-gray-500">{percentage}% of total</div>
                            </div>
                          )
                        }
                        return null
                      }}
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
                  <CardDescription>Total amount per group ({groupAmountCurrency})</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <CurrencyFilter
                  value={groupAmountCurrency}
                  onChange={setGroupAmountCurrency}
                  currencies={availableCurrencies}
                  showLabel={false}
                  dataTestId="group-amount-currency-filter"
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
                        const key = item.group.toLowerCase().replaceAll(/\s+/g, '')
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
                    >
                      {groupAmountData.map((entry: any) => {
                        const key = entry.group.toLowerCase().replaceAll(/\s+/g, '')
                        return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                      })}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const data = payload[0]
                          const groupKey = data.payload.name
                          const total = groupAmountData.reduce((sum, item) => sum + item.totalAmount, 0)
                          const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                          return (
                            <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: `var(--color-${groupKey})` }}
                                />
                                <span className="gba:font-medium">{data.payload.group}</span>
                              </div>
                              <div className="gba:text-lg gba:font-semibold">
                                {formatCurrencyCompact(
                                  data.value as number,
                                  extractCurrencyCode(groupAmountCurrency),
                                  undefined,
                                  1,
                                  true
                                )}
                              </div>
                              <div className="gba:text-sm gba:text-gray-500">{percentage}% of total</div>
                            </div>
                          )
                        }
                        return null
                      }}
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
                  <CardDescription>Number of investments per status ({statusCountCurrency})</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <CurrencyFilter
                  currencies={currencyOptionsWithAll}
                  value={statusCountCurrency}
                  onChange={setStatusCountCurrency}
                  dataTestId="status-count-currency-filter"
                  showLabel={false}
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
                        const key = item.status.toLowerCase().replaceAll(/\s+/g, '')
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
                    >
                      {statusCountData.map((entry: any) => {
                        const key = entry.status.toLowerCase().replaceAll(/\s+/g, '')
                        return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                      })}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const data = payload[0]
                          const statusKey = data.payload.name
                          const total = statusCountData.reduce((sum: number, item: any) => sum + item.count, 0)
                          const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                          return (
                            <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: `var(--color-${statusKey})` }}
                                />
                                <span className="gba:font-medium">{data.payload.status}</span>
                              </div>
                              <div className="gba:text-lg gba:font-semibold">{data.value} investments</div>
                              <div className="gba:text-sm gba:text-gray-500">{percentage}% of total</div>
                            </div>
                          )
                        }
                        return null
                      }}
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
                  <CardTitle>Status Distribution by Total Amount ({statusAmountCurrency})</CardTitle>
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
                        const key = item.status.toLowerCase().replaceAll(/\s+/g, '')
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
                    >
                      {statusAmountData.map((entry: any) => {
                        const key = entry.status.toLowerCase().replaceAll(/\s+/g, '')
                        return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                      })}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const data = payload[0]
                          const statusKey = data.payload.name
                          const total = statusAmountData.reduce((sum: number, item: any) => sum + item.totalAmount, 0)
                          const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                          return (
                            <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: `var(--color-${statusKey})` }}
                                />
                                <span className="gba:font-medium">{data.payload.status}</span>
                              </div>
                              <div className="gba:text-lg gba:font-semibold">
                                {formatCurrencyCompact(
                                  data.value as number,
                                  extractCurrencyCode(statusAmountCurrency),
                                  undefined,
                                  1,
                                  true
                                )}
                              </div>
                              <div className="gba:text-sm gba:text-gray-500">{percentage}% of total</div>
                            </div>
                          )
                        }
                        return null
                      }}
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
                        const key = item.currency.toLowerCase().replaceAll(/\s+/g, '')
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
                    >
                      {currencyCountData.map((entry: any) => {
                        const key = entry.currency.toLowerCase().replaceAll(/\s+/g, '')
                        return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                      })}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const data = payload[0]
                          const currencyKey = data.payload.name
                          const total = currencyCountData.reduce((sum: number, item: any) => sum + item.count, 0)
                          const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                          return (
                            <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: `var(--color-${currencyKey})` }}
                                />
                                <span className="gba:font-medium">{data.payload.currency}</span>
                              </div>
                              <div className="gba:text-lg gba:font-semibold">{data.value} investments</div>
                              <div className="gba:text-sm gba:text-gray-500">{percentage}% of total</div>
                            </div>
                          )
                        }
                        return null
                      }}
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
                        const key = item.currency.toLowerCase().replaceAll(/\s+/g, '')
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
                    >
                      {currencyAmountData.map((entry: any) => {
                        const key = entry.currency.toLowerCase().replaceAll(/\s+/g, '')
                        return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                      })}
                    </Pie>
                    <ChartTooltip
                      content={({ active, payload }) => {
                        if (active && payload?.length) {
                          const data = payload[0]
                          const currencyKey = data.payload.name
                          const total = currencyAmountData.reduce((sum: number, item: any) => sum + item.totalAmount, 0)
                          const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
                          return (
                            <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: `var(--color-${currencyKey})` }}
                                />
                                <span className="gba:font-medium">{data.payload.currency}</span>
                              </div>
                              <div className="gba:text-lg gba:font-semibold">
                                {formatCurrencyCompact(
                                  data.value as number,
                                  extractCurrencyCode(data.payload.currency),
                                  undefined,
                                  1,
                                  true
                                )}
                              </div>
                              <div className="gba:text-sm gba:text-gray-500">{percentage}% of total</div>
                            </div>
                          )
                        }
                        return null
                      }}
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
