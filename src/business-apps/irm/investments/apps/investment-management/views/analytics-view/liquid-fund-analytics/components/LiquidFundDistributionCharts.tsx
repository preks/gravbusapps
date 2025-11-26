import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react'
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
import { PieChart, Pie, Cell } from 'recharts'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { ChartPieSliceIcon, ChartDonutIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'
import { useLiquidFundInvestmentTypeDistribution, useLiquidFundTypeDistribution } from '../hooks'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Distribution pie chart tooltip component for count
interface DistributionCountTooltipProps {
  active?: boolean
  payload?: any[]
  chartData: any[]
  label?: string // Optional label for the count (defaults to "investments")
}

const DistributionCountTooltip: React.FC<DistributionCountTooltipProps> = ({
  active,
  payload,
  chartData,
  label = 'investments'
}) => {
  if (active && payload?.length) {
    const data = payload[0]
    // Calculate percentage of total
    const total = chartData.reduce((sum: number, item: any) => sum + item.count, 0)
    const percentage = total > 0 ? ((data.value as number) / total) * 100 : 0
    // Support both investmentType and liquidFundType field names
    const typeName = data.payload.investmentType || data.payload.liquidFundType || data.payload.type
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${data.payload.name})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{typeName}</span>
        </div>
        <div className="gba:text-lg gba:font-semibold gba:text-gray-900">
          {data.value} {label}
        </div>
        <div className="gba:text-sm gba:font-medium gba:text-gray-600">{percentage.toFixed(1)}% of total</div>
      </div>
    )
  }
  return null
}

// Distribution pie chart tooltip component for amount
interface DistributionAmountTooltipProps {
  active?: boolean
  payload?: any[]
  formatCurrency: (amount: number, currency: string) => string
  currency: string
  chartData: any[]
}

const DistributionAmountTooltip: React.FC<DistributionAmountTooltipProps> = ({
  active,
  payload,
  formatCurrency,
  currency,
  chartData
}) => {
  if (active && payload?.length) {
    const data = payload[0]
    // Support both investmentType and liquidFundType field names
    const typeName = data.payload.investmentType || data.payload.liquidFundType
    // Calculate percentage of total
    const total = chartData.reduce((sum: number, item: any) => sum + item.totalAmount, 0)
    const percentage = total > 0 ? ((data.value as number) / total) * 100 : 0
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${data.payload.name})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{typeName}</span>
        </div>
        <div className="gba:text-lg gba:font-semibold gba:text-gray-900">
          {formatCurrency(data.value as number, currency)}
        </div>
        <div className="gba:text-sm gba:font-medium gba:text-gray-600">{percentage.toFixed(1)}% of total</div>
      </div>
    )
  }
  return null
}

interface LiquidFundDistributionChartsProps extends BusinessAppContextProps {
  masterCurrency: string
  availableCurrencies: string[]
}

// Helper: Transform chart data
const transformCountData = (rawData: any[]) => {
  return rawData.map(item => ({
    type: item.type,
    count: item.count,
    name: item.type.toLowerCase().replaceAll(/\s+/g, '')
  }))
}

const transformAmountData = (rawData: any[]) => {
  return rawData.map(item => ({
    type: item.type,
    totalAmount: item.totalAmount,
    name: item.type.toLowerCase().replaceAll(/\s+/g, '')
  }))
}

// Helper: Generate chart config
const generateChartConfig = (data: any[], typeKey: string) => {
  const config: Record<string, { label: string }> = {}
  for (const item of data) {
    config[item.name] = { label: item[typeKey] }
  }
  return config
}

export const LiquidFundDistributionCharts: React.FC<LiquidFundDistributionChartsProps> = props => {
  const { masterCurrency, availableCurrencies } = props

  // Currency state for count-based charts - start with "All", then sync with master
  const [investmentTypeCountCurrency, setInvestmentTypeCountCurrency] = useState<string>('All')
  const [liquidFundTypeCountCurrency, setLiquidFundTypeCountCurrency] = useState<string>('All')

  const prevMasterCurrencyForCount = useRef<string>(masterCurrency)

  // Currency sync hooks for amount-based charts (synced with master currency)
  const [investmentTypeAmountCurrency, setInvestmentTypeAmountCurrency] = useCurrencySync(masterCurrency)
  const [liquidFundTypeAmountCurrency, setLiquidFundTypeAmountCurrency] = useCurrencySync(masterCurrency)

  // Fetch Investment Type distribution data
  // Count chart: uses selected currency (can be "All" = null, or specific currency)
  // Amount chart: uses selected currency (specific currency only, no "All" option)
  const {
    countData: investmentTypeCountDataRaw,
    isLoading: investmentTypeCountLoading,
    error: investmentTypeCountError
  } = useLiquidFundInvestmentTypeDistribution(
    props,
    investmentTypeCountCurrency === 'All' ? null : investmentTypeCountCurrency
  )

  const {
    amountData: investmentTypeAmountDataRaw,
    isLoading: investmentTypeAmountLoading,
    error: investmentTypeAmountError
  } = useLiquidFundInvestmentTypeDistribution(props, investmentTypeAmountCurrency)

  // Fetch Liquid Fund Type distribution data
  // Count chart: uses selected currency (can be "All" = null, or specific currency)
  // Amount chart: uses selected currency (specific currency only, no "All" option)
  const {
    countData: liquidFundTypeCountDataRaw,
    isLoading: liquidFundTypeCountLoading,
    error: liquidFundTypeCountError
  } = useLiquidFundTypeDistribution(props, liquidFundTypeCountCurrency === 'All' ? null : liquidFundTypeCountCurrency)

  const {
    amountData: liquidFundTypeAmountDataRaw,
    isLoading: liquidFundTypeAmountLoading,
    error: liquidFundTypeAmountError
  } = useLiquidFundTypeDistribution(props, liquidFundTypeAmountCurrency)

  // Sync count currencies with master currency when it actually changes
  useEffect(() => {
    // Only sync if the master currency has actually changed
    if (prevMasterCurrencyForCount.current !== masterCurrency) {
      setInvestmentTypeCountCurrency(masterCurrency)
      setLiquidFundTypeCountCurrency(masterCurrency)
    }
    prevMasterCurrencyForCount.current = masterCurrency
  }, [masterCurrency])

  // Enhanced currency options with "All" option for count charts
  const currencyOptionsWithAll = ['All', ...availableCurrencies]

  // Transform data using helpers
  const investmentTypeCountData = useMemo(
    () => transformCountData(investmentTypeCountDataRaw),
    [investmentTypeCountDataRaw]
  )
  const investmentTypeAmountData = useMemo(
    () => transformAmountData(investmentTypeAmountDataRaw),
    [investmentTypeAmountDataRaw]
  )
  const liquidFundTypeCountData = useMemo(
    () => transformCountData(liquidFundTypeCountDataRaw),
    [liquidFundTypeCountDataRaw]
  )
  const liquidFundTypeAmountData = useMemo(
    () => transformAmountData(liquidFundTypeAmountDataRaw),
    [liquidFundTypeAmountDataRaw]
  )

  // Generate chart configs using helper
  const investmentTypeCountChartConfig = useMemo(
    () => generateChartConfig(investmentTypeCountData, 'type'),
    [investmentTypeCountData]
  )
  const investmentTypeAmountChartConfig = useMemo(
    () => generateChartConfig(investmentTypeAmountData, 'type'),
    [investmentTypeAmountData]
  )
  const liquidFundTypeCountChartConfig = useMemo(
    () => generateChartConfig(liquidFundTypeCountData, 'type'),
    [liquidFundTypeCountData]
  )
  const liquidFundTypeAmountChartConfig = useMemo(
    () => generateChartConfig(liquidFundTypeAmountData, 'type'),
    [liquidFundTypeAmountData]
  )

  // Memoized tooltip render functions
  const renderInvestmentTypeCountTooltip = useCallback(
    (props: any) => <DistributionCountTooltip {...props} chartData={investmentTypeCountData} />,
    [investmentTypeCountData]
  )

  const renderInvestmentTypeAmountTooltip = useCallback(
    (props: any) => (
      <DistributionAmountTooltip
        {...props}
        formatCurrency={formatCurrencyCompact}
        currency={investmentTypeAmountCurrency}
        chartData={investmentTypeAmountData}
      />
    ),
    [investmentTypeAmountCurrency, investmentTypeAmountData]
  )

  const renderLiquidFundTypeCountTooltip = useCallback(
    (props: any) => <DistributionCountTooltip {...props} chartData={liquidFundTypeCountData} label="funds" />,
    [liquidFundTypeCountData]
  )

  const renderLiquidFundTypeAmountTooltip = useCallback(
    (props: any) => (
      <DistributionAmountTooltip
        {...props}
        formatCurrency={formatCurrencyCompact}
        currency={liquidFundTypeAmountCurrency}
        chartData={liquidFundTypeAmountData}
      />
    ),
    [liquidFundTypeAmountCurrency, liquidFundTypeAmountData]
  )

  return (
    <div className="gba:space-y-6">
      {/* Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={ChartPieSliceIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Type Distribution by Count ({investmentTypeCountCurrency})</CardTitle>
                  <CardDescription>Number per type</CardDescription>
                </div>
              </div>
              <CurrencyFilter
                value={investmentTypeCountCurrency}
                onChange={setInvestmentTypeCountCurrency}
                currencies={currencyOptionsWithAll}
                showLabel={false}
                dataTestId="investment-type-count-currency-filter"
              />
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (investmentTypeCountLoading) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                    <div className="gba:text-gray-500 gba:text-lg">Loading distribution data...</div>
                  </div>
                )
              } else if (investmentTypeCountError) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                    <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                    <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                      {investmentTypeCountError}
                    </div>
                  </div>
                )
              } else if (investmentTypeCountData.length === 0) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                    <div className="gba:text-gray-500 gba:text-lg">
                      No investment type data available for {investmentTypeCountCurrency}
                    </div>
                  </div>
                )
              }
              return (
                <ChartContainer config={investmentTypeCountChartConfig} className="gba:h-[350px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={investmentTypeCountData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="var(--color-default)"
                      dataKey="count"
                      nameKey="name"
                    >
                      {investmentTypeCountData.map((entry: any) => (
                        <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                      ))}
                    </Pie>
                    <ChartTooltip content={renderInvestmentTypeCountTooltip} />
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
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Type Distribution by Total Amount ({investmentTypeAmountCurrency})</CardTitle>
                  <CardDescription>Total amount per type</CardDescription>
                </div>
              </div>
              <CurrencyFilter
                value={investmentTypeAmountCurrency}
                onChange={setInvestmentTypeAmountCurrency}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="investment-type-amount-currency-filter"
              />
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (investmentTypeAmountLoading) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                    <div className="gba:text-gray-500 gba:text-lg">Loading distribution data...</div>
                  </div>
                )
              } else if (investmentTypeAmountError) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                    <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                    <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                      {investmentTypeAmountError}
                    </div>
                  </div>
                )
              } else if (investmentTypeAmountData.length === 0) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                    <div className="gba:text-gray-500 gba:text-lg">
                      No investment type data available for {investmentTypeAmountCurrency}
                    </div>
                  </div>
                )
              }
              return (
                <ChartContainer config={investmentTypeAmountChartConfig} className="gba:h-[350px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={investmentTypeAmountData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="var(--color-default)"
                      dataKey="totalAmount"
                      nameKey="name"
                    >
                      {investmentTypeAmountData.map((entry: any) => (
                        <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                      ))}
                    </Pie>
                    <ChartTooltip content={renderInvestmentTypeAmountTooltip} />
                    <ChartLegend content={<ChartLegendContent />} />
                  </PieChart>
                </ChartContainer>
              )
            })()}
          </CardContent>
        </Card>
      </div>

      {/* Liquid Fund Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={ChartDonutIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Liquid Fund Type Distribution by Count ({liquidFundTypeCountCurrency})</CardTitle>
                  <CardDescription>Number per type</CardDescription>
                </div>
              </div>
              <CurrencyFilter
                value={liquidFundTypeCountCurrency}
                onChange={setLiquidFundTypeCountCurrency}
                currencies={currencyOptionsWithAll}
                showLabel={false}
                dataTestId="liquid-fund-type-count-currency-filter"
              />
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (liquidFundTypeCountLoading) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                    <div className="gba:text-gray-500 gba:text-lg">Loading distribution data...</div>
                  </div>
                )
              } else if (liquidFundTypeCountError) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                    <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                    <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                      {liquidFundTypeCountError}
                    </div>
                  </div>
                )
              } else if (liquidFundTypeCountData.length === 0) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                    <div className="gba:text-gray-500 gba:text-lg">
                      No liquid fund type data available for {liquidFundTypeCountCurrency}
                    </div>
                  </div>
                )
              }
              return (
                <ChartContainer config={liquidFundTypeCountChartConfig} className="gba:h-[350px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={liquidFundTypeCountData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="var(--color-default)"
                      dataKey="count"
                      nameKey="name"
                    >
                      {liquidFundTypeCountData.map((entry: any) => (
                        <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                      ))}
                    </Pie>
                    <ChartTooltip content={renderLiquidFundTypeCountTooltip} />
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
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Liquid Fund Type Distribution by Total Amount ({liquidFundTypeAmountCurrency})</CardTitle>
                  <CardDescription>Total amount per type</CardDescription>
                </div>
              </div>
              <CurrencyFilter
                value={liquidFundTypeAmountCurrency}
                onChange={setLiquidFundTypeAmountCurrency}
                currencies={availableCurrencies}
                showLabel={false}
                dataTestId="liquid-fund-type-amount-currency-filter"
              />
            </div>
          </CardHeader>
          <CardContent>
            {(() => {
              if (liquidFundTypeAmountLoading) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                    <div className="gba:text-gray-500 gba:text-lg">Loading distribution data...</div>
                  </div>
                )
              } else if (liquidFundTypeAmountError) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2">
                    <div className="gba:text-destructive gba:text-lg gba:font-semibold">Error loading data</div>
                    <div className="gba:text-destructive gba:text-sm gba:max-w-xl gba:text-center">
                      {liquidFundTypeAmountError}
                    </div>
                  </div>
                )
              } else if (liquidFundTypeAmountData.length === 0) {
                return (
                  <div className="gba:h-[350px] gba:w-full gba:flex gba:items-center gba:justify-center">
                    <div className="gba:text-gray-500 gba:text-lg">
                      No liquid fund type data available for {liquidFundTypeAmountCurrency}
                    </div>
                  </div>
                )
              }
              return (
                <ChartContainer config={liquidFundTypeAmountChartConfig} className="gba:h-[350px] gba:w-full">
                  <PieChart>
                    <Pie
                      data={liquidFundTypeAmountData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="var(--color-default)"
                      dataKey="totalAmount"
                      nameKey="name"
                    >
                      {liquidFundTypeAmountData.map((entry: any) => (
                        <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                      ))}
                    </Pie>
                    <ChartTooltip content={renderLiquidFundTypeAmountTooltip} />
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
