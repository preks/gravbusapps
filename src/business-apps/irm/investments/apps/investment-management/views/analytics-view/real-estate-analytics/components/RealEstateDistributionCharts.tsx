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
import { ChartPieSliceIcon, CurrencyCircleDollarIcon, HouseIcon } from '@phosphor-icons/react'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'

interface RealEstateDistributionChartsProps {
  rawInvestments: any[] // Raw investment data for filtering
  masterCurrency: string
  availableCurrencies: string[]
}

interface StatusCountTooltipProps {
  active?: boolean
  payload?: any[]
  filteredData: any[]
}

const StatusCountTooltip: React.FC<StatusCountTooltipProps> = ({ active, payload, filteredData }) => {
  if (active && payload?.length) {
    const data = payload[0]
    const total = filteredData.reduce((sum: number, item: any) => sum + item.count, 0)
    const percentage = total > 0 ? ((data.value as number) / total) * 100 : 0
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${data.payload.name})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{data.payload.status}</span>
        </div>
        <div className="gba:text-lg gba:font-semibold gba:text-gray-900">{data.value} properties</div>
        <div className="gba:text-sm gba:font-medium gba:text-gray-600">{percentage.toFixed(1)}% of total</div>
      </div>
    )
  }
  return null
}

// Type count tooltip component (for property type distribution by count)
interface TypeCountTooltipProps {
  active?: boolean
  payload?: any[]
  filteredData: any[]
}

const TypeCountTooltip: React.FC<TypeCountTooltipProps> = ({ active, payload, filteredData }) => {
  if (active && payload?.length) {
    const data = payload[0]
    const total = filteredData.reduce((sum: number, item: any) => sum + item.count, 0)
    const percentage = total > 0 ? ((data.value as number) / total) * 100 : 0
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${data.payload.name})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{data.payload.type}</span>
        </div>
        <div className="gba:text-lg gba:font-semibold gba:text-gray-900">{data.value} properties</div>
        <div className="gba:text-sm gba:font-medium gba:text-gray-600">{percentage.toFixed(1)}% of total</div>
      </div>
    )
  }
  return null
}

// Type amount tooltip component (for property type distribution by amount)
interface TypeAmountTooltipProps {
  active?: boolean
  payload?: any[]
  filteredData: any[]
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const TypeAmountTooltip: React.FC<TypeAmountTooltipProps> = ({
  active,
  payload,
  filteredData,
  formatCurrency,
  currency
}) => {
  if (active && payload?.length) {
    const data = payload[0]
    const total = filteredData.reduce((sum: number, item: any) => sum + item.totalAmount, 0)
    const percentage = total > 0 ? ((data.value as number) / total) * 100 : 0
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${data.payload.name})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{data.payload.type}</span>
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

// Status amount tooltip component (for property status distribution by amount)
interface StatusAmountTooltipProps {
  active?: boolean
  payload?: any[]
  filteredData: any[]
  formatCurrency: (amount: number, currency: string) => string
  currency: string
}

const StatusAmountTooltip: React.FC<StatusAmountTooltipProps> = ({
  active,
  payload,
  filteredData,
  formatCurrency,
  currency
}) => {
  if (active && payload?.length) {
    const data = payload[0]
    const total = filteredData.reduce((sum: number, item: any) => sum + item.totalAmount, 0)
    const percentage = total > 0 ? ((data.value as number) / total) * 100 : 0
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${data.payload.name})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{data.payload.status}</span>
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

export const RealEstateDistributionCharts: React.FC<RealEstateDistributionChartsProps> = ({
  rawInvestments,
  masterCurrency,
  availableCurrencies
}) => {
  // Currency state for count-based charts - start with "All", then sync with master
  const [typeCountCurrency, setTypeCountCurrency] = useState<string>('All')
  const [statusCountCurrency, setStatusCountCurrency] = useState<string>('All')

  const prevMasterCurrencyForCount = useRef<string>(masterCurrency)

  // Currency sync hooks for amount-based charts (synced with master currency)
  const [typeCurrencyFilter, setTypeCurrencyFilter] = useCurrencySync(masterCurrency)
  const [statusCurrencyFilter, setStatusCurrencyFilter] = useCurrencySync(masterCurrency)

  // Sync count currencies with master currency when it actually changes
  useEffect(() => {
    // Only sync if the master currency has actually changed
    if (prevMasterCurrencyForCount.current !== masterCurrency) {
      setTypeCountCurrency(masterCurrency)
      setStatusCountCurrency(masterCurrency)
    }
    prevMasterCurrencyForCount.current = masterCurrency
  }, [masterCurrency])

  // Enhanced currency options with "All" option for count charts
  const currencyOptionsWithAll = ['All', ...availableCurrencies]

  // Filter data for Type Count chart (can show all currencies or specific currency)
  const filteredTypeCountData = useMemo(() => {
    return rawInvestments
      .filter(inv => typeCountCurrency === 'All' || (inv.currencyCode || 'EUR') === typeCountCurrency)
      .reduce((acc, investment) => {
        const type = investment.investment?.investmentType?.value || 'Unknown Type'
        const existing = acc.find((item: any) => item.type === type)
        if (existing) {
          existing.count += 1
        } else {
          acc.push({ type, count: 1 })
        }
        return acc
      }, [] as any[])
  }, [rawInvestments, typeCountCurrency])

  // Filter data based on selected currency for Type Total Amount chart
  const filteredTypeData = useMemo(() => {
    return rawInvestments
      .filter(inv => (inv.currencyCode || 'EUR') === typeCurrencyFilter)
      .reduce((acc, investment) => {
        const type = investment.investment?.investmentType?.value || 'Unknown Type'
        const existing = acc.find((item: any) => item.type === type)
        const totalAmount = investment.investment?.totalInvestmentAmount || 0
        if (existing) {
          existing.count += 1
          existing.totalAmount += totalAmount
        } else {
          acc.push({ type, count: 1, totalAmount })
        }
        return acc
      }, [] as any[])
  }, [rawInvestments, typeCurrencyFilter])

  // Filter data for Status Count chart (can show all currencies or specific currency)
  const filteredStatusCountData = useMemo(() => {
    return rawInvestments
      .filter(inv => statusCountCurrency === 'All' || (inv.currencyCode || 'EUR') === statusCountCurrency)
      .reduce((acc, investment) => {
        const status = investment.investment?.investmentStatus?.value || 'Unknown Status'
        const existing = acc.find((item: any) => item.status === status)
        if (existing) {
          existing.count += 1
        } else {
          acc.push({ status, count: 1 })
        }
        return acc
      }, [] as any[])
  }, [rawInvestments, statusCountCurrency])

  // Memoized tooltip renderer to prevent component definition inside render
  const renderStatusCountTooltip = useCallback(
    (tooltipProps: any) => <StatusCountTooltip {...tooltipProps} filteredData={filteredStatusCountData} />,
    [filteredStatusCountData]
  )

  // Filter data based on selected currency for Status Total Amount chart
  const filteredStatusData = useMemo(() => {
    return rawInvestments
      .filter(inv => (inv.currencyCode || 'EUR') === statusCurrencyFilter)
      .reduce((acc, investment) => {
        const status = investment.investment?.investmentStatus?.value || 'Unknown Status'
        const existing = acc.find((item: any) => item.status === status)
        const totalAmount = investment.investment?.totalInvestmentAmount || 0
        if (existing) {
          existing.count += 1
          existing.totalAmount += totalAmount
        } else {
          acc.push({ status, count: 1, totalAmount })
        }
        return acc
      }, [] as any[])
  }, [rawInvestments, statusCurrencyFilter])

  // Memoized tooltip render functions
  const renderTypeCountTooltip = useCallback(
    (props: any) => <TypeCountTooltip {...props} filteredData={filteredTypeCountData} />,
    [filteredTypeCountData]
  )

  const renderTypeAmountTooltip = useCallback(
    (props: any) => (
      <TypeAmountTooltip
        {...props}
        filteredData={filteredTypeData}
        formatCurrency={formatCurrencyCompact}
        currency={typeCurrencyFilter}
      />
    ),
    [filteredTypeData, typeCurrencyFilter]
  )

  const renderStatusAmountTooltip = useCallback(
    (props: any) => (
      <StatusAmountTooltip
        {...props}
        filteredData={filteredStatusData}
        formatCurrency={formatCurrencyCompact}
        currency={statusCurrencyFilter}
      />
    ),
    [filteredStatusData, statusCurrencyFilter]
  )

  return (
    <div className="gba:space-y-6">
      {/* Type Distribution */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={ChartPieSliceIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Type Distribution by Count ({typeCountCurrency})</CardTitle>
                  <CardDescription>Number of properties per type</CardDescription>
                </div>
              </div>
              <CurrencyFilter
                value={typeCountCurrency}
                onChange={setTypeCountCurrency}
                currencies={currencyOptionsWithAll}
                showLabel={false}
                dataTestId="type-count-currency-filter"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {}
                for (const item of filteredTypeCountData) {
                  const key = item.type.toLowerCase().replaceAll(/\s+/g, '')
                  config[key] = { label: item.type }
                }
                return config
              }, [filteredTypeCountData])}
              className="gba:h-[300px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={filteredTypeCountData.map((item: any) => {
                    const key = item.type.toLowerCase().replaceAll(/\s+/g, '')
                    return {
                      ...item,
                      name: key,
                      value: item.count
                    }
                  })}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="value"
                  nameKey="name"
                >
                  {filteredTypeCountData.map((entry: any) => {
                    const key = entry.type.toLowerCase().replaceAll(/\s+/g, '')
                    return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                  })}
                </Pie>
                <ChartTooltip content={renderTypeCountTooltip} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="default" size="md" decorative />
                <div>
                  <CardTitle>Type Distribution by Total Amount ({typeCurrencyFilter})</CardTitle>
                  <CardDescription>Total amount per type</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <span className="gba:text-xs gba:text-gray-500">Currency:</span>
                <CurrencyFilter
                  value={typeCurrencyFilter}
                  onChange={setTypeCurrencyFilter}
                  currencies={availableCurrencies}
                  showLabel={false}
                  dataTestId="type-currency-filter"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {}
                for (const item of filteredTypeData) {
                  const key = item.type.toLowerCase().replaceAll(/\s+/g, '')
                  config[key] = { label: item.type }
                }
                return config
              }, [filteredTypeData])}
              className="gba:h-[300px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={filteredTypeData.map((item: any) => {
                    const key = item.type.toLowerCase().replaceAll(/\s+/g, '')
                    return {
                      ...item,
                      name: key,
                      value: item.totalAmount
                    }
                  })}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="value"
                  nameKey="name"
                >
                  {filteredTypeData.map((entry: any) => {
                    const key = entry.type.toLowerCase().replaceAll(/\s+/g, '')
                    return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                  })}
                </Pie>
                <ChartTooltip content={renderTypeAmountTooltip} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Status Distribution */}
      <div className="gba:grid gba:grid-cols-2 gba:gap-4">
        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={HouseIcon} variant="success" size="md" decorative />
                <div>
                  <CardTitle>Status Distribution by Count ({statusCountCurrency})</CardTitle>
                  <CardDescription>Number of properties per status</CardDescription>
                </div>
              </div>
              <CurrencyFilter
                value={statusCountCurrency}
                onChange={setStatusCountCurrency}
                currencies={currencyOptionsWithAll}
                showLabel={false}
                dataTestId="status-count-currency-filter"
              />
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {}
                for (const item of filteredStatusCountData) {
                  const key = item.status.toLowerCase().replaceAll(/\s+/g, '')
                  config[key] = { label: item.status }
                }
                return config
              }, [filteredStatusCountData])}
              className="gba:h-[300px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={filteredStatusCountData.map((item: any) => {
                    const key = item.status.toLowerCase().replaceAll(/\s+/g, '')
                    return {
                      ...item,
                      name: key,
                      value: item.count
                    }
                  })}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="value"
                  nameKey="name"
                >
                  {filteredStatusCountData.map((entry: any) => {
                    const key = entry.status.toLowerCase().replaceAll(/\s+/g, '')
                    return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                  })}
                </Pie>
                <ChartTooltip content={renderStatusCountTooltip} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <IconAvatar icon={CurrencyCircleDollarIcon} variant="success" size="md" decorative />
                <div>
                  <CardTitle>Status Distribution by Total Amount ({statusCurrencyFilter})</CardTitle>
                  <CardDescription>Total invested amount per status</CardDescription>
                </div>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
                <span className="gba:text-xs gba:text-gray-500">Currency:</span>
                <CurrencyFilter
                  value={statusCurrencyFilter}
                  onChange={setStatusCurrencyFilter}
                  currencies={availableCurrencies}
                  showLabel={false}
                  dataTestId="status-currency-filter"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={useMemo(() => {
                const config: Record<string, { label: string }> = {}
                for (const item of filteredStatusData) {
                  const key = item.status.toLowerCase().replaceAll(/\s+/g, '')
                  config[key] = { label: item.status }
                }
                return config
              }, [filteredStatusData])}
              className="gba:h-[300px] gba:w-full"
            >
              <PieChart>
                <Pie
                  data={filteredStatusData.map((item: any) => {
                    const key = item.status.toLowerCase().replaceAll(/\s+/g, '')
                    return {
                      ...item,
                      name: key,
                      value: item.totalAmount
                    }
                  })}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="var(--color-default)"
                  dataKey="value"
                  nameKey="name"
                >
                  {filteredStatusData.map((entry: any) => {
                    const key = entry.status.toLowerCase().replaceAll(/\s+/g, '')
                    return <Cell key={`cell-${key}`} fill={`var(--color-${key})`} />
                  })}
                </Pie>
                <ChartTooltip content={renderStatusAmountTooltip} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
