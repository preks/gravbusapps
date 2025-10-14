import React, { useState, useMemo } from 'react'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@newwork/nw-design-system'
import { PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '@/common/data/investment'
import { ChartPieSliceIcon, ChartDonutIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { LiquidFundInvestmentSummary } from '../../shared/types'

interface LiquidFundDistributionChartsProps {
  chartData: any
  rawLiquidFunds: LiquidFundInvestmentSummary[]
}

export const LiquidFundDistributionCharts: React.FC<LiquidFundDistributionChartsProps> = ({ rawLiquidFunds }) => {
  // Fixed currency options - only EUR and USD
  const availableCurrencies = ['EUR', 'USD']

  // Currency filters for value charts - default to EUR
  const [investmentTypeCurrencyFilter, setInvestmentTypeCurrencyFilter] = useState('EUR')
  const [liquidFundTypeCurrencyFilter, setLiquidFundTypeCurrencyFilter] = useState('EUR')

  // Type Distribution by Count
  const investmentTypeCountData = useMemo(() => {
    return rawLiquidFunds.reduce((acc: any[], fund: any) => {
      const investmentType = fund.investment.investmentType?.value || 'Unknown'
      const existing = acc.find(item => item.investmentType === investmentType)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({
          investmentType,
          count: 1,
          name: investmentType.toLowerCase().replace(/\s+/g, '')
        })
      }
      return acc
    }, [])
  }, [rawLiquidFunds])

  // Type Distribution by Total Amount (filtered by currency)
  const investmentTypeAmountData = useMemo(() => {
    const filteredFunds = rawLiquidFunds.filter(fund => fund.currencyCode === investmentTypeCurrencyFilter)
    return filteredFunds.reduce((acc: any[], fund: any) => {
      const investmentType = fund.investment.investmentType?.value || 'Unknown'
      const existing = acc.find(item => item.investmentType === investmentType)
      if (existing) {
        existing.totalAmount += fund.investment.investmentMarketValue || fund.investment.totalInvestmentAmount || 0
      } else {
        acc.push({
          investmentType,
          totalAmount: fund.investment.investmentMarketValue || fund.investment.totalInvestmentAmount || 0,
          name: investmentType.toLowerCase().replace(/\s+/g, '')
        })
      }
      return acc
    }, [])
  }, [rawLiquidFunds, investmentTypeCurrencyFilter])

  // Type Distribution by Count
  const liquidFundTypeCountData = useMemo(() => {
    return rawLiquidFunds.reduce((acc: any[], fund: any) => {
      const liquidFundType = fund.liquidFundInvestment?.investmentLiquidFundType?.value || 'Unknown'
      const existing = acc.find(item => item.liquidFundType === liquidFundType)
      if (existing) {
        existing.count += 1
      } else {
        acc.push({
          liquidFundType,
          count: 1,
          name: liquidFundType.toLowerCase().replace(/\s+/g, '')
        })
      }
      return acc
    }, [])
  }, [rawLiquidFunds])

  // Type Distribution by Total Amount (filtered by currency)
  const liquidFundTypeAmountData = useMemo(() => {
    const filteredFunds = rawLiquidFunds.filter(fund => fund.currencyCode === liquidFundTypeCurrencyFilter)
    return filteredFunds.reduce((acc: any[], fund: any) => {
      const liquidFundType = fund.liquidFundInvestment?.investmentLiquidFundType?.value || 'Unknown'
      const existing = acc.find(item => item.liquidFundType === liquidFundType)
      if (existing) {
        existing.totalAmount += fund.investment.investmentMarketValue || fund.investment.totalInvestmentAmount || 0
      } else {
        acc.push({
          liquidFundType,
          totalAmount: fund.investment.investmentMarketValue || fund.investment.totalInvestmentAmount || 0,
          name: liquidFundType.toLowerCase().replace(/\s+/g, '')
        })
      }
      return acc
    }, [])
  }, [rawLiquidFunds, liquidFundTypeCurrencyFilter])

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
                  <CardTitle>Type Distribution by Count</CardTitle>
                  <CardDescription>Number per type</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {}
                investmentTypeCountData.forEach((item: any) => {
                  config[item.name] = { label: item.investmentType }
                })
                return config
              }, [investmentTypeCountData])}
              className="gba:h-[350px] gba:w-full"
            >
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
                  {investmentTypeCountData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: `var(--color-${data.payload.name})` }}
                            />
                            <span className="gba:font-medium">{data.payload.investmentType}</span>
                          </div>
                          <div className="gba:mt-1 gba:text-lg gba:font-semibold">{data.value} investments</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Type Distribution by Total Amount ({investmentTypeCurrencyFilter})</CardTitle>
                  <CardDescription>Total amount per type</CardDescription>
                </div>
              </div>
              <Select value={investmentTypeCurrencyFilter} onValueChange={setInvestmentTypeCurrencyFilter}>
                <SelectTrigger className="gba:w-24 gba:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {}
                investmentTypeAmountData.forEach((item: any) => {
                  config[item.name] = { label: item.investmentType }
                })
                return config
              }, [investmentTypeAmountData])}
              className="gba:h-[350px] gba:w-full"
            >
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
                  {investmentTypeAmountData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: `var(--color-${data.payload.name})` }}
                            />
                            <span className="gba:font-medium">{data.payload.investmentType}</span>
                          </div>
                          <div className="gba:mt-1 gba:text-lg gba:font-semibold">
                            {formatCurrency(data.value as number, investmentTypeCurrencyFilter)}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Type Distribution - Side by Side */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={ChartDonutIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Type Distribution by Count</CardTitle>
                  <CardDescription>Number per type</CardDescription>
                </div>
              </div>
              <div className="gba:w-24 gba:h-8"></div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {}
                liquidFundTypeCountData.forEach((item: any) => {
                  config[item.name] = { label: item.liquidFundType }
                })
                return config
              }, [liquidFundTypeCountData])}
              className="gba:h-[350px] gba:w-full"
            >
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
                  {liquidFundTypeCountData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: `var(--color-${data.payload.name})` }}
                            />
                            <span className="gba:font-medium">{data.payload.liquidFundType}</span>
                          </div>
                          <div className="gba:mt-1 gba:text-lg gba:font-semibold">{data.value} funds</div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="secondary" size="md" decorative />
                <div>
                  <CardTitle>Type Distribution by Total Amount ({liquidFundTypeCurrencyFilter})</CardTitle>
                  <CardDescription>Total amount per type</CardDescription>
                </div>
              </div>
              <Select value={liquidFundTypeCurrencyFilter} onValueChange={setLiquidFundTypeCurrencyFilter}>
                <SelectTrigger className="gba:w-24 gba:h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableCurrencies.map(currency => (
                    <SelectItem key={currency} value={currency}>
                      {currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {}
                liquidFundTypeAmountData.forEach((item: any) => {
                  config[item.name] = { label: item.liquidFundType }
                })
                return config
              }, [liquidFundTypeAmountData])}
              className="gba:h-[350px] gba:w-full"
            >
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
                  {liquidFundTypeAmountData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Pie>
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: `var(--color-${data.payload.name})` }}
                            />
                            <span className="gba:font-medium">{data.payload.liquidFundType}</span>
                          </div>
                          <div className="gba:mt-1 gba:text-lg gba:font-semibold">
                            {formatCurrency(data.value as number, liquidFundTypeCurrencyFilter)}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
