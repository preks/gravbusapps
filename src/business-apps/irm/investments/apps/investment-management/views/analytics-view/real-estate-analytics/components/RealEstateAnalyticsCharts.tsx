import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@newwork/nw-design-system'
import { ChartContainer, ChartTooltip, ChartLegend, ChartLegendContent, IconAvatar } from '@newwork/nw-design-system'
import { ScatterChart, Scatter, XAxis, YAxis, Bar, ComposedChart } from 'recharts'
import { ChartBarIcon, PercentIcon } from '@phosphor-icons/react'
import { formatCurrencyCompact } from '../../../../utils/currencyUtils'
import { CurrencyFilter } from '../../shared/components'
import { useCurrencySync } from '../../shared/hooks'

interface RealEstateAnalyticsChartsProps {
  rawInvestments: any[]
  masterCurrency: string
  availableCurrencies: string[]
}

export const RealEstateAnalyticsCharts: React.FC<RealEstateAnalyticsChartsProps> = ({
  rawInvestments,
  masterCurrency,
  availableCurrencies
}) => {
  // Currency sync hooks - initialize with master currency from parent
  const [occupancyCurrencyFilter, setOccupancyCurrencyFilter] = useCurrencySync(masterCurrency)
  const [expensesCurrencyFilter, setExpensesCurrencyFilter] = useCurrencySync(masterCurrency)

  // Filter occupancy data by selected currency
  const filteredOccupancyData = useMemo(() => {
    const filtered = rawInvestments.filter(inv => inv.currencyCode === occupancyCurrencyFilter)
    // Group by occupancy rate ranges
    const rangeMap = new Map()
    const ranges = [
      { label: '0-20%', min: 0, max: 20 },
      { label: '21-40%', min: 21, max: 40 },
      { label: '41-60%', min: 41, max: 60 },
      { label: '61-80%', min: 61, max: 80 },
      { label: '81-100%', min: 81, max: 100 }
    ]

    ranges.forEach(range => {
      rangeMap.set(range.label, { range: range.label, count: 0, totalValue: 0 })
    })

    filtered.forEach(inv => {
      const rate = inv.realEstateInvestment?.occupancyRate || 0
      const value = inv.realEstateInvestment?.propertyValue || 0
      const matchingRange = ranges.find(r => rate >= r.min && rate <= r.max)
      if (matchingRange) {
        const entry = rangeMap.get(matchingRange.label)
        entry.count += 1
        entry.totalValue += value
      }
    })

    return Array.from(rangeMap.values())
  }, [rawInvestments, occupancyCurrencyFilter])

  // Filter expenses vs value data by selected currency
  const filteredExpensesValueData = useMemo(() => {
    return rawInvestments
      .filter(
        inv =>
          inv.currencyCode === expensesCurrencyFilter &&
          inv.realEstateInvestment?.propertyValue &&
          inv.realEstateInvestment?.annualNetColdRent
      )
      .map(inv => ({
        propertyValue: inv.realEstateInvestment!.propertyValue!,
        annualExpenses: inv.realEstateInvestment!.annualNetColdRent!,
        propertyName: inv.displayName,
        expenseEfficiency:
          inv.realEstateInvestment!.propertyValue! > 0
            ? (inv.realEstateInvestment!.annualNetColdRent! / inv.realEstateInvestment!.propertyValue!) * 100
            : 0
      }))
  }, [rawInvestments, expensesCurrencyFilter])

  // Occupancy Analysis Config
  const occupancyConfig = useMemo(
    () => ({
      count: { label: 'Count' },
      totalValue: { label: 'Total Value' }
    }),
    []
  )

  // Property Value vs Annual Net Cold Rent Config
  const expensesValueConfig = useMemo(
    () => ({
      annualExpenses: { label: 'Annual Net Cold Rent' },
      propertyValue: { label: 'Property Value' },
      expenseEfficiency: { label: 'Rent Efficiency' }
    }),
    []
  )

  return (
    <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
      {/* Occupancy Rate Distribution */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={PercentIcon} variant="success" size="md" decorative />
              <div>
                <CardTitle>Occupancy Rate Distribution</CardTitle>
                <CardDescription>Properties grouped by occupancy rate ranges</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <CurrencyFilter
                currencies={availableCurrencies}
                value={occupancyCurrencyFilter}
                onChange={setOccupancyCurrencyFilter}
                dataTestId="occupancy-currency-filter"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={occupancyConfig}>
            <ComposedChart data={filteredOccupancyData}>
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                        <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{label}</div>
                        {payload.map((entry, index) => {
                          let properLabel = ''
                          let formattedValue = ''
                          let dotColor = ''

                          if (entry.dataKey === 'count') {
                            properLabel = 'Property Count'
                            formattedValue = `${entry.value}`
                            dotColor = 'var(--color-count)'
                          } else if (entry.dataKey === 'totalValue') {
                            properLabel = 'Total Property Value'
                            formattedValue = formatCurrencyCompact(entry.value as number)
                            dotColor = 'var(--color-totalValue)'
                          }

                          return (
                            <div key={index} className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <div className="gba:w-3 gba:h-3 gba:rounded-full" style={{ backgroundColor: dotColor }} />
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
              <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" />
              <Bar yAxisId="right" dataKey="totalValue" fill="var(--color-totalValue)" opacity={0.8} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Expenses vs Property Value */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-start gba:min-h-[3rem]">
            <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
              <IconAvatar icon={ChartBarIcon} variant="warning" size="md" decorative />
              <div>
                <CardTitle>Property Value vs Annual Net Cold Rent</CardTitle>
                <CardDescription>Property values correlation with annual net cold rent</CardDescription>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:ml-4">
              <CurrencyFilter
                currencies={availableCurrencies}
                value={expensesCurrencyFilter}
                onChange={setExpensesCurrencyFilter}
                dataTestId="expenses-currency-filter"
                showLabel={false}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredExpensesValueData && filteredExpensesValueData.length > 0 ? (
            <ChartContainer config={expensesValueConfig} className="gba:h-[400px] gba:w-full">
              <ScatterChart data={filteredExpensesValueData}>
                <XAxis dataKey="propertyValue" name="Property Value" type="number" />
                <YAxis dataKey="annualExpenses" name="Annual Net Cold Rent" type="number" />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:mb-2 gba:font-medium gba:text-gray-700">{data.name || 'Property'}</div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: 'var(--color-propertyValue)' }}
                            />
                            <span className="gba:font-medium">Property Value:</span>
                            <span className="gba:font-semibold">{formatCurrencyCompact(data.propertyValue)}</span>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: 'var(--color-annualExpenses)' }}
                            />
                            <span className="gba:font-medium">Annual Net Cold Rent:</span>
                            <span className="gba:font-semibold">{formatCurrencyCompact(data.annualExpenses)}</span>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Scatter dataKey="annualExpenses" fill="var(--color-annualExpenses)" />
              </ScatterChart>
            </ChartContainer>
          ) : (
            <div className="gba:h-[400px] gba:w-full gba:flex gba:items-center gba:justify-center gba:bg-gray-50 gba:rounded-lg">
              <div className="gba:text-center">
                <p className="gba:text-gray-500 gba:text-lg gba:mb-2">No Data Available</p>
                <p className="gba:text-gray-400 gba:text-sm">
                  No properties with both annual net cold rent and value data found
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
