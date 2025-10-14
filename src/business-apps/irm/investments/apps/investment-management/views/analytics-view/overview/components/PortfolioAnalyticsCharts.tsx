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
import { ComposedChart, Bar, Line, BarChart, XAxis, YAxis } from 'recharts'
import { formatCurrency } from '@/common/data/investment'
import { ChartBarIcon, TrendUpIcon } from '@phosphor-icons/react'

interface PortfolioAnalyticsChartsProps {
  concentrationByGroupData: any[]
  valueByAccountData: any[]
}

export const PortfolioAnalyticsCharts: React.FC<PortfolioAnalyticsChartsProps> = ({
  concentrationByGroupData,
  valueByAccountData
}) => {
  return (
    <>
      <div style={{ gridColumn: '1 / -1', marginBottom: '24px' }}>
        <Card>
          <CardHeader>
            <div className="gba:flex gba:items-center gba:gap-3">
              <IconAvatar icon={ChartBarIcon} variant="default" size="md" decorative />
              <div>
                <CardTitle>Top Accounts by Value</CardTitle>
                <CardDescription>Investment accounts ranked by total portfolio value</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={useMemo(
                () => ({
                  totalvalue: { label: 'Total Value' }
                }),
                []
              )}
              className="gba:h-[400px] gba:w-full"
            >
              <BarChart data={valueByAccountData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }} maxBarSize={60}>
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
                <YAxis tick={{ fontSize: 12 }} tickFormatter={value => formatCurrency(value).replace(/[€$£¥]/g, '')} />
                <ChartTooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0]
                      return (
                        <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
                          <div className="gba:mb-2">
                            <span className="gba:font-medium">{label}</span>
                          </div>
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-full"
                              style={{ backgroundColor: 'var(--color-totalvalue)' }}
                            />
                            <span className="gba:font-medium">Total Value:</span>
                          </div>
                          <div className="gba:mt-1 gba:text-lg gba:font-semibold">
                            {formatCurrency(data.value as number)}
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <ChartLegend content={<ChartLegendContent />} />
                <Bar dataKey="totalValue" name="totalvalue" fill="var(--color-totalvalue)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:gap-3">
            <IconAvatar icon={TrendUpIcon} variant="success" size="md" decorative />
            <div>
              <CardTitle>Portfolio Concentration by Group</CardTitle>
              <CardDescription>Investment distribution and performance across different groups</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ChartContainer
            config={useMemo(
              () => ({
                investmentcount: { label: 'Investment Count' },
                totalvalue: { label: 'Total Value' },
                averagevalue: { label: 'Average Value' }
              }),
              []
            )}
            className="gba:h-[400px] gba:w-full"
          >
            <ComposedChart data={concentrationByGroupData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
              <XAxis dataKey="group" angle={-45} textAnchor="end" height={80} interval={0} tick={{ fontSize: 12 }} />
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

                          if (entry.dataKey === 'count') {
                            formattedValue = `${entry.value}`
                            properLabel = 'Investment Count'
                            dotColor = 'var(--color-investmentcount)'
                          } else if (entry.dataKey === 'totalValue') {
                            formattedValue = formatCurrency(entry.value as number)
                            properLabel = 'Total Value'
                            dotColor = 'var(--color-totalvalue)'
                          } else if (entry.dataKey === 'averageValue') {
                            formattedValue = formatCurrency(entry.value as number)
                            properLabel = 'Average Value'
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
              <Bar
                yAxisId="left"
                dataKey="count"
                name="investmentcount"
                fill="var(--color-investmentcount)"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="totalValue"
                name="totalvalue"
                fill="var(--color-totalvalue)"
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="averageValue"
                name="averagevalue"
                stroke="var(--color-averagevalue)"
                strokeWidth={3}
                dot={{ r: 6 }}
              />
            </ComposedChart>
          </ChartContainer>
        </CardContent>
      </Card>
    </>
  )
}
