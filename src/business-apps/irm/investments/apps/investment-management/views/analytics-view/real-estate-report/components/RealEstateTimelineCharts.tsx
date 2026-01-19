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
import { ComposedChart, Bar, Line, XAxis, YAxis } from 'recharts'
import { ChartLineUpIcon, TrendUpIcon, CalendarIcon } from '@phosphor-icons/react'
import { formatCurrency } from '@/common/data/investment/utils/formatters'
import { formatAmount } from '@/common/utils/numberFormatter'

interface RealEstateTimelineChartsProps {
  chartData: {
    timelineData: any[]
    performanceData: any[]
    buildingYearData: any[]
  }
}

export const RealEstateTimelineCharts: React.FC<RealEstateTimelineChartsProps> = ({ chartData }) => {
  const { timelineData, performanceData, buildingYearData } = chartData

  // Timeline Config
  const timelineConfig = useMemo(
    () => ({
      investmentcount: { label: 'Investment Count' },
      totalinvestmentamount: { label: 'Total Investment Amount' },
      cumulativeinvestments: { label: 'Cumulative Investments' }
    }),
    []
  )

  // Performance Config
  const performanceConfig = useMemo(
    () => ({
      averageoccupancyrate: { label: 'Average Occupancy Rate' },
      totalpropertyvalue: { label: 'Total Property Value' }
    }),
    []
  )

  // Building Year Config
  const buildingYearConfig = useMemo(
    () => ({
      averagevalue: { label: 'Average Value' },
      propertycount: { label: 'Property Count' }
    }),
    []
  )

  return (
    <div className="gba:space-y-6">
      {/* Investment Timeline */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={ChartLineUpIcon} variant="default" />
            <div>
              <CardTitle>Real Estate Timeline</CardTitle>
              <CardDescription>Investment count and amounts over time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={timelineConfig} className="gba:h-[400px] gba:w-full">
            <ComposedChart data={timelineData}>
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={value => formatAmount(value, 1)} />
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

                          if (entry.dataKey === 'investmentCount') {
                            formattedValue = `${entry.value}`
                            properLabel = 'Investment Count'
                            dotColor = 'var(--color-investmentcount)'
                          } else if (entry.dataKey === 'totalInvestmentAmount') {
                            formattedValue = formatCurrency(entry.value as number)
                            properLabel = 'Total Investment Amount'
                            dotColor = 'var(--color-totalinvestmentamount)'
                          } else if (entry.dataKey === 'cumulativeInvestments') {
                            formattedValue = `${entry.value}`
                            properLabel = 'Cumulative Investments'
                            dotColor = 'var(--color-cumulativeinvestments)'
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
              <Bar
                yAxisId="left"
                dataKey="investmentCount"
                fill="var(--color-investmentcount)"
                name="Investment Count"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalInvestmentAmount"
                stroke="var(--color-totalinvestmentamount)"
                strokeWidth={3}
                name="Total Investment Amount"
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeInvestments"
                stroke="var(--color-cumulativeinvestments)"
                strokeWidth={2}
                strokeDasharray="5 5"
                name="Cumulative Investments"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Performance Over Time */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={TrendUpIcon} variant="success" />
            <div>
              <CardTitle>Property Performance Over Time</CardTitle>
              <CardDescription>Occupancy rates and property values over time</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={performanceConfig} className="gba:h-[400px] gba:w-full">
            <ComposedChart data={performanceData}>
              <XAxis dataKey="period" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={value => formatAmount(value, 1)} />
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

                          if (entry.dataKey === 'averageOccupancyRate') {
                            properLabel = 'Average Occupancy Rate'
                            formattedValue = `${entry.value}%`
                            dotColor = 'var(--color-averageoccupancyrate)'
                          } else if (entry.dataKey === 'totalPropertyValue') {
                            properLabel = 'Total Property Value'
                            formattedValue = formatCurrency(entry.value as number)
                            dotColor = 'var(--color-totalpropertyvalue)'
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
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="averageOccupancyRate"
                stroke="var(--color-averageoccupancyrate)"
                strokeWidth={3}
                name="Average Occupancy Rate"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalPropertyValue"
                stroke="var(--color-totalpropertyvalue)"
                strokeWidth={3}
                name="Total Property Value"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Building Year Analysis */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-2">
            <IconAvatar icon={CalendarIcon} variant="secondary" />
            <div>
              <CardTitle>Building Year Analysis</CardTitle>
              <CardDescription>Property values by construction year</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer config={buildingYearConfig} className="gba:h-[400px] gba:w-full">
            <ComposedChart data={buildingYearData}>
              <XAxis dataKey="yearRange" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" tickFormatter={value => formatAmount(value, 1)} />
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

                          if (entry.dataKey === 'propertyCount') {
                            properLabel = 'Property Count'
                            formattedValue = `${entry.value}`
                            dotColor = 'var(--color-propertycount)'
                          } else if (entry.dataKey === 'averageValue') {
                            properLabel = 'Average Value'
                            formattedValue = formatCurrency(entry.value as number)
                            dotColor = 'var(--color-averagevalue)'
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
              <Bar yAxisId="left" dataKey="propertyCount" fill="var(--color-propertycount)" name="Property Count" />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="averageValue"
                stroke="var(--color-averagevalue)"
                strokeWidth={3}
                name="Average Value"
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </div>
  )
}
