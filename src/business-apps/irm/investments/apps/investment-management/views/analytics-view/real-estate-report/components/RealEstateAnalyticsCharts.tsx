import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent,
  IconAvatar
} from '@newwork/nw-design-system'
import { ScatterChart, Scatter, XAxis, YAxis, Bar, ComposedChart } from 'recharts'
import { ChartBarIcon, PercentIcon } from '@phosphor-icons/react'
import { formatCurrency } from '@/common/data/investment/utils/formatters'
import { formatCompactNumber } from '@/common/utils/numberFormatter'

interface RealEstateAnalyticsChartsProps {
  chartData: {
    occupancyData: any[]
    expensesValueData: any[]
  }
}

export const RealEstateAnalyticsCharts: React.FC<RealEstateAnalyticsChartsProps> = ({ chartData }) => {
  const { occupancyData, expensesValueData } = chartData

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
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={PercentIcon} variant="success" />
            <div>
              <CardTitle>Occupancy Rate Distribution</CardTitle>
              <CardDescription>Properties grouped by occupancy rate ranges</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={occupancyConfig}>
            <ComposedChart data={occupancyData}>
              <XAxis dataKey="range" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={value => formatCompactNumber(value, 1)} />
              <ChartTooltip
                content={({ active, payload, label }) => {
                  if (active && payload?.length) {
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
                            formattedValue = formatCurrency(entry.value as number)
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
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartBarIcon} variant="warning" />
            <div>
              <CardTitle>Property Value vs Annual Net Cold Rent</CardTitle>
              <CardDescription>Property values correlation with annual net cold rent</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {expensesValueData && expensesValueData.length > 0 ? (
            <ChartContainer config={expensesValueConfig} className="gba:h-[400px] gba:w-full">
              <ScatterChart data={expensesValueData}>
                <XAxis
                  dataKey="propertyValue"
                  name="Property Value"
                  type="number"
                  tickFormatter={value => formatCompactNumber(value, 1)}
                />
                <YAxis
                  dataKey="annualExpenses"
                  name="Annual Net Cold Rent"
                  type="number"
                  tickFormatter={value => formatCompactNumber(value, 1)}
                />
                <ChartTooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
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
                            <span className="gba:font-semibold">{formatCurrency(data.propertyValue)}</span>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: 'var(--color-annualExpenses)' }}
                            />
                            <span className="gba:font-medium">Annual Net Cold Rent:</span>
                            <span className="gba:font-semibold">{formatCurrency(data.annualExpenses)}</span>
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
