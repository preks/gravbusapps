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
  Button,
  Spinner
} from '@newwork/nw-design-system'
import { ComposedChart, Bar, Line, BarChart, XAxis, YAxis } from 'recharts'
import { formatCurrencyCompact, extractCurrencyCode, formatAmount } from '@/common/utils/numberFormatter'
import { ChartBarIcon, TrendUpIcon } from '@phosphor-icons/react'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { usePortfolioTopAccounts, usePortfolioConcentration } from '../hooks'

interface PortfolioAnalyticsChartsProps {
  masterCurrency: string
  availableCurrencies: string[]
  accessToken: string
}

export const PortfolioAnalyticsCharts: React.FC<PortfolioAnalyticsChartsProps> = ({
  masterCurrency,
  availableCurrencies,
  accessToken
}) => {
  // Currency sync hooks - automatically sync with master currency
  const [accountValueCurrency, setAccountValueCurrency] = useCurrencySync(masterCurrency)
  const [concentrationCurrency, setConcentrationCurrency] = useCurrencySync(masterCurrency)

  // Fetch top accounts data using server-side aggregation
  const {
    accounts: topAccountsData,
    isLoading: isLoadingAccounts,
    error: accountsError,
    refetch: refetchAccounts
  } = usePortfolioTopAccounts(accessToken, accountValueCurrency, 10)

  // Map server data to chart format
  const filteredAccountData = useMemo(() => {
    return topAccountsData.map(account => ({
      account: account.accountName,
      totalValue: account.totalValue
    }))
  }, [topAccountsData])

  // Fetch concentration data using server-side aggregation
  const {
    concentrationData,
    isLoading: isLoadingConcentration,
    error: concentrationError,
    refetch: refetchConcentration
  } = usePortfolioConcentration(accessToken, concentrationCurrency)

  // Map server data to chart format
  const filteredConcentrationData = useMemo(() => {
    return concentrationData
  }, [concentrationData])

  // Pre-compute chart configs (must be outside conditional rendering)
  const accountValueChartConfig = useMemo(
    () => ({
      totalValue: { label: 'Total Value' }
    }),
    []
  )

  const concentrationChartConfig = useMemo(
    () => ({
      count: { label: 'Investment Count' },
      totalValue: { label: 'Total Value' },
      averageValue: { label: 'Average Value' }
    }),
    []
  )

  return (
    <>
      <div className="gba:col-span-full gba:mb-6">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={ChartBarIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Top Accounts by Value ({accountValueCurrency})</CardTitle>
                  <CardDescription>Investment accounts ranked by total portfolio value</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <span className="gba:text-xs gba:text-gray-500">Currency:</span>
                <CurrencyFilter
                  value={accountValueCurrency}
                  onChange={setAccountValueCurrency}
                  currencies={availableCurrencies}
                  showLabel={false}
                  dataTestId="account-value-currency-filter"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (isLoadingAccounts) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px]">
                    <Spinner size="lg" />
                  </div>
                )
              }
              if (accountsError) {
                return (
                  <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-[400px] gba:gap-4">
                    <div className="gba:text-red-600 gba:text-center">
                      <div className="gba:font-semibold">Error Loading Data</div>
                      <div className="gba:text-sm gba:mt-2">{accountsError}</div>
                    </div>
                    <Button size="sm" onClick={refetchAccounts}>
                      Retry
                    </Button>
                  </div>
                )
              }
              if (filteredAccountData.length === 0) {
                return (
                  <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px] gba:text-gray-500">
                    No account data available
                  </div>
                )
              }
              return (
                <ChartContainer config={accountValueChartConfig} className="gba:h-[400px] gba:w-full">
                  <BarChart
                    data={filteredAccountData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                    maxBarSize={60}
                  >
                    <XAxis
                      dataKey="account"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      interval={0}
                      tick={{ fontSize: 12 }}
                      tickFormatter={value => {
                        if (value.length > 15) {
                          return value.substring(0, 12) + '...'
                        }
                        return value
                      }}
                    />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={value =>
                        formatCurrencyCompact(
                          value,
                          extractCurrencyCode(accountValueCurrency),
                          undefined,
                          1,
                          true
                        ).replace(/[€$£¥]/g, '')
                      }
                    />
                    <ChartTooltip
                      content={({ active, payload, label }) => {
                        if (active && payload?.length) {
                          const data = payload[0]
                          return (
                            <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                              <div className="gba:mb-2">
                                <span className="gba:font-medium">{label}</span>
                              </div>
                              <div className="gba:flex gba:items-center gba:gap-2">
                                <div
                                  className="gba:w-3 gba:h-3 gba:rounded-full"
                                  style={{ backgroundColor: 'var(--color-totalValue)' }}
                                />
                                <span className="gba:font-medium">Total Value:</span>
                              </div>
                              <div className="gba:mt-1 gba:text-lg gba:font-semibold">
                                {formatCurrencyCompact(
                                  data.value as number,
                                  extractCurrencyCode(accountValueCurrency),
                                  undefined,
                                  1,
                                  true
                                )}
                              </div>
                            </div>
                          )
                        }
                        return null
                      }}
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

      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Portfolio Concentration by Group ({concentrationCurrency})</CardTitle>
                <CardDescription>Investment distribution and performance across different groups</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <span className="gba:text-xs gba:text-gray-500">Currency:</span>
              <CurrencyFilter
                value={concentrationCurrency}
                onChange={setConcentrationCurrency}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="concentration-currency-filter"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (isLoadingConcentration) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px]">
                  <Spinner size="lg" />
                </div>
              )
            }
            if (concentrationError) {
              return (
                <div className="gba:flex gba:flex-col gba:justify-center gba:items-center gba:h-[400px] gba:gap-4">
                  <div className="gba:text-red-600 gba:text-center">
                    <div className="gba:font-semibold">Error Loading Data</div>
                    <div className="gba:text-sm gba:mt-2">{concentrationError}</div>
                  </div>
                  <Button size="sm" onClick={refetchConcentration}>
                    Retry
                  </Button>
                </div>
              )
            }
            if (filteredConcentrationData.length === 0) {
              return (
                <div className="gba:flex gba:justify-center gba:items-center gba:h-[400px] gba:text-gray-500">
                  No concentration data available
                </div>
              )
            }
            return (
              <ChartContainer config={concentrationChartConfig} className="gba:h-[400px] gba:w-full">
                <ComposedChart data={filteredConcentrationData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                  <XAxis
                    dataKey="group"
                    angle={-45}
                    textAnchor="end"
                    height={80}
                    interval={0}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} tickFormatter={value => formatAmount(value, 1)} />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    tickFormatter={value =>
                      formatCurrencyCompact(
                        value,
                        extractCurrencyCode(concentrationCurrency),
                        undefined,
                        1,
                        true
                      ).replace(/[€$£¥]/g, '')
                    }
                  />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload?.length) {
                        return (
                          <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                            <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
                            {payload.map((entry, index) => {
                              let formattedValue = ''
                              let properLabel = ''
                              let dotColor = ''

                              if (entry.dataKey === 'count') {
                                formattedValue = `${entry.value}`
                                properLabel = 'Investment Count'
                                dotColor = 'var(--color-count)'
                              } else if (entry.dataKey === 'totalValue') {
                                formattedValue = formatCurrencyCompact(
                                  entry.value as number,
                                  extractCurrencyCode(concentrationCurrency),
                                  undefined,
                                  1,
                                  true
                                )
                                properLabel = 'Total Value'
                                dotColor = 'var(--color-totalValue)'
                              } else if (entry.dataKey === 'averageValue') {
                                formattedValue = formatCurrencyCompact(
                                  entry.value as number,
                                  extractCurrencyCode(concentrationCurrency),
                                  undefined,
                                  1,
                                  true
                                )
                                properLabel = 'Average Value'
                                dotColor = 'var(--color-averageValue)'
                              }

                              return (
                                <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                                  <div
                                    className="gba:w-3 gba:h-3 gba:rounded-full"
                                    style={{ backgroundColor: dotColor }}
                                  />
                                  <span className="gba:font-medium">{properLabel}:</span>
                                  <span className="gba:font-semibold">{formattedValue}</span>
                                </div>
                              )
                            })}
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="totalValue" fill="var(--color-totalValue)" radius={[4, 4, 0, 0]} />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="averageValue"
                    stroke="var(--color-averageValue)"
                    strokeWidth={3}
                    dot={{ r: 6 }}
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
