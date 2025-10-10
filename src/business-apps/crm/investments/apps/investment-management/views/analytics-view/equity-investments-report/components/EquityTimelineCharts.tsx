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
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { ComposedChart, Bar, Line, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/common/data/investment'
import { ChartLineUpIcon, TrendUpIcon } from '@phosphor-icons/react'

const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1']

interface EquityTimelineChartsProps {
  equityTimelineData: any[]
  topCompaniesByValuationData: any[]
}

export const EquityTimelineCharts: React.FC<EquityTimelineChartsProps> = ({
  equityTimelineData,
  topCompaniesByValuationData
}) => {
  return (
    <>
      {/* Equity Investment Performance Timeline - Full Width Row */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={ChartLineUpIcon} variant="default" size="md" decorative />
            <div>
              <CardTitle>Equity Performance Timeline</CardTitle>
              <CardDescription>Timeline of equity investment activity and cumulative growth</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={useMemo(
              () => ({
                newinvestments: { label: 'New Investments' },
                totalvaluation: { label: 'Total Valuation' },
                cumulativeinvestments: { label: 'Cumulative Investments' }
              }),
              []
            )}
            className="gba:h-[400px] gba:w-full"
          >
            <ComposedChart data={equityTimelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="left" tick={{ fontSize: 12 }} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
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

                          if (entry.dataKey === 'investmentCount') {
                            formattedValue = `${entry.value}`
                            properLabel = 'New Investments'
                            dotColor = 'var(--color-newinvestments)'
                          } else if (entry.dataKey === 'totalValuation') {
                            formattedValue = formatCurrency(entry.value as number)
                            properLabel = 'Total Valuation'
                            dotColor = 'var(--color-totalvaluation)'
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
                name="newinvestments"
                fill="var(--color-newinvestments)"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="totalValuation"
                name="totalvaluation"
                stroke="var(--color-totalvaluation)"
                strokeWidth={3}
                dot={false}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="cumulativeInvestments"
                name="cumulativeinvestments"
                stroke="var(--color-cumulativeinvestments)"
                strokeWidth={2}
                dot={false}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Top Companies by Valuation - Full Width Row */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
            <div>
              <CardTitle>Top Companies by Valuation</CardTitle>
              <CardDescription>Highest valued companies in the equity investment portfolio</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={useMemo(
              () => ({
                valuation: { label: 'Valuation' }
              }),
              []
            )}
            className="gba:h-[400px] gba:w-full"
          >
            <ComposedChart data={topCompaniesByValuationData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <XAxis
                dataKey="company"
                angle={-45}
                textAnchor="end"
                height={80}
                interval={0}
                tick={{ fontSize: 11 }}
                tickFormatter={value => {
                  // Truncate company names longer than 15 characters
                  return value.length > 15 ? `${value.substring(0, 15)}...` : value
                }}
              />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={value => formatCurrency(value).replace(/[€$£¥]/g, '')} />
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

                          if (entry.dataKey === 'valuation') {
                            formattedValue = formatCurrency(entry.value as number)
                            properLabel = 'Valuation'
                            dotColor = 'var(--color-valuation)'
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
              <Bar dataKey="valuation" name="valuation" fill="var(--color-valuation)" radius={[4, 4, 0, 0]} />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  )
}
