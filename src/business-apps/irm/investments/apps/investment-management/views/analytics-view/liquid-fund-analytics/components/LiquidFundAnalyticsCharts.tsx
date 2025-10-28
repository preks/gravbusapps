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
  ChartLegendContent
} from '@newwork/nw-design-system'
import { ScatterChart, Scatter, XAxis, YAxis, BarChart, Bar } from 'recharts'
import { formatCurrencyCompact } from '../../../../utils/currencyUtils'
import { ChartScatterIcon, ChartBarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { useLiquidFundCorrelationData, useLiquidFundPerformanceByType } from '../hooks'

interface LiquidFundAnalyticsChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

export const LiquidFundAnalyticsCharts: React.FC<LiquidFundAnalyticsChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Currency sync hooks - initialize with master currency from parent
  const [correlationCurrencyFilter, setCorrelationCurrencyFilter] = useCurrencySync(masterCurrency)
  const [performanceCurrencyFilter, setPerformanceCurrencyFilter] = useCurrencySync(masterCurrency)

  // Fetch correlation data independently (only refetches when correlationCurrencyFilter changes)
  const {
    correlationData: interestRateCorrelationData,
    isLoading: correlationLoading,
    error: correlationError
  } = useLiquidFundCorrelationData(props, correlationCurrencyFilter)

  // Fetch performance by type data independently (only refetches when performanceCurrencyFilter changes)
  const {
    performanceByTypeData,
    isLoading: performanceLoading,
    error: performanceError
  } = useLiquidFundPerformanceByType(props, performanceCurrencyFilter)

  // Chart config - MUST be at top level (before any conditional rendering)
  const performanceChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    config.averageInterestRate = { label: 'Average Interest Rate' }
    config.averageInvestmentAmount = { label: 'Average Investment Amount' }
    return config
  }, [])

  return (
    <div className="gba:space-y-6">
      {/* Interest Rate vs Investment Amount Correlation */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartScatterIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Interest Rate vs Amount Correlation for Fixed-Term Deposits</CardTitle>
                <CardDescription>
                  Correlation between interest rates and investment amounts for fixed-term deposits
                </CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <CurrencyFilter
                currencies={availableCurrencies}
                value={correlationCurrencyFilter}
                onChange={setCorrelationCurrencyFilter}
                dataTestId="correlation-currency-filter"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (correlationLoading) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">Loading correlation data...</div>
                </div>
              )
            }
            if (correlationError) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                  <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                    {correlationError}
                  </div>
                </div>
              )
            }
            if (interestRateCorrelationData.length === 0) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">
                    No correlation data available for {correlationCurrencyFilter}
                  </div>
                </div>
              )
            }
            return (
              <ChartContainer
                config={{
                  ratevsamount: { label: 'Rate vs Amount' }
                }}
                className="gba:h-[400px] gba:w-full"
              >
                <ScatterChart data={interestRateCorrelationData}>
                  <XAxis
                    type="number"
                    dataKey="interestRate"
                    name="Interest Rate"
                    unit="%"
                    tickFormatter={value => `${value}%`}
                  />
                  <YAxis
                    type="number"
                    dataKey="investmentAmount"
                    name="Investment Amount"
                    tickFormatter={value => formatCurrencyCompact(value)}
                  />
                  <ChartTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload
                        return (
                          <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                            <div className="gba:mb-2 gba:font-medium gba:text-gray-700">Fixed-Term Deposit</div>
                            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <div
                                className="gba:w-3 gba:h-3 gba:rounded-full"
                                style={{ backgroundColor: 'var(--color-ratevsamount)' }}
                              />
                              <span className="gba:font-medium">Interest Rate:</span>
                              <span className="gba:font-semibold">{data.interestRate}%</span>
                            </div>
                            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <div
                                className="gba:w-3 gba:h-3 gba:rounded-full"
                                style={{ backgroundColor: 'var(--color-ratevsamount)' }}
                              />
                              <span className="gba:font-medium">Investment Amount:</span>
                              <span className="gba:font-semibold">{formatCurrencyCompact(data.investmentAmount)}</span>
                            </div>
                          </div>
                        )
                      }
                      return null
                    }}
                  />
                  <Scatter name="ratevsamount" fill="var(--color-ratevsamount)" />
                </ScatterChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>

      {/* Performance by Fund Type */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartBarIcon} variant="secondary" size="md" decorative />
              <div>
                <CardTitle>Performance Analysis by Fund Type</CardTitle>
                <CardDescription>Average interest rates and investment amounts by fund type</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <CurrencyFilter
                currencies={availableCurrencies}
                value={performanceCurrencyFilter}
                onChange={setPerformanceCurrencyFilter}
                dataTestId="performance-currency-filter"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {(() => {
            if (performanceLoading) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">Loading performance data...</div>
                </div>
              )
            }
            if (performanceError) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                  <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                  <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                    {performanceError}
                  </div>
                </div>
              )
            }
            if (performanceByTypeData.length === 0) {
              return (
                <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center">
                  <div className="gba:text-gray-500 gba:text-lg">
                    No performance data available for {performanceCurrencyFilter}
                  </div>
                </div>
              )
            }
            return (
              <ChartContainer config={performanceChartConfig} className="gba:h-[400px] gba:w-full">
                <BarChart data={performanceByTypeData}>
                  <XAxis dataKey="fundType" />
                  <YAxis yAxisId="left" tickFormatter={value => `${value}%`} />
                  <YAxis yAxisId="right" orientation="right" tickFormatter={value => formatCurrencyCompact(value)} />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                            <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
                            {payload.map((entry, index) => {
                              let formattedValue = ''
                              let properLabel = ''
                              let dotColor = ''

                              if (entry.dataKey === 'averageInterestRate') {
                                formattedValue = `${(entry.value as number).toFixed(2)}%`
                                properLabel = 'Average Interest Rate'
                                dotColor = 'var(--color-averageInterestRate)'
                              } else if (entry.dataKey === 'averageInvestmentAmount') {
                                formattedValue = formatCurrencyCompact(entry.value as number)
                                properLabel = 'Average Investment Amount'
                                dotColor = 'var(--color-averageInvestmentAmount)'
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
                  <Bar
                    yAxisId="left"
                    dataKey="averageInterestRate"
                    fill="var(--color-averageInterestRate)"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="averageInvestmentAmount"
                    fill="var(--color-averageInvestmentAmount)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            )
          })()}
        </CardContent>
      </Card>
    </div>
  )
}
