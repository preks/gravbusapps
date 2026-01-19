import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { BusinessAppContextProps } from '../../../../../../../../../common/BusinessAppContext'
import { DashboardData } from '../../../../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface OptimizedAbsenceTrendsProps extends BusinessAppContextProps {
  dashboardData: DashboardData
  onMonthClick?: (month: string, year?: number) => void
}

const colorPalette = {
  column: 'var(--nw-info)',
  totalLine: 'var(--nw-foreground)'
}

const getMonthTranslation = (monthName: string): string => {
  const monthKeys = [
    'lowcoder:absence_report.employee_table.january',
    'lowcoder:absence_report.employee_table.february',
    'lowcoder:absence_report.employee_table.march',
    'lowcoder:absence_report.employee_table.april',
    'lowcoder:absence_report.employee_table.may',
    'lowcoder:absence_report.employee_table.june',
    'lowcoder:absence_report.employee_table.july',
    'lowcoder:absence_report.employee_table.august',
    'lowcoder:absence_report.employee_table.september',
    'lowcoder:absence_report.employee_table.october',
    'lowcoder:absence_report.employee_table.november',
    'lowcoder:absence_report.employee_table.december'
  ]

  const monthMap: Record<string, number> = {
    Jan: 0,
    Feb: 1,
    Mar: 2,
    Apr: 3,
    May: 4,
    Jun: 5,
    Jul: 6,
    Aug: 7,
    Sep: 8,
    Oct: 9,
    Nov: 10,
    Dec: 11
  }

  const monthIndex = monthMap[monthName]
  if (monthIndex !== undefined) {
    return getTranslationFromI18nKeyAndLabel(monthKeys[monthIndex], monthName)
  }

  return monthName
}

const ServerBackedTooltip: React.FC<any> = ({ active, payload, label, absenceTypes, getTypeColor, monthAggMap }) => {
  if (!(active && payload && payload.length > 0)) return null
  const monthData = payload[0].payload
  const serverAgg = monthAggMap?.[String(label)] || null
  const totalForMonth = serverAgg?.totalRequests != null ? serverAgg.totalRequests : monthData.total || 0
  const avgReqPerEmp =
    serverAgg?.avgRequestsPerEmployee != null ? serverAgg.avgRequestsPerEmployee : monthData.trendLine || 0
  const avgDaysPerReq =
    serverAgg?.avgDaysPerRequest != null ? serverAgg.avgDaysPerRequest : monthData.avgDurationPerRequest || 0
  const distinctEmployees =
    serverAgg?.distinctEmployees != null ? serverAgg.distinctEmployees : monthData.uniqueEmployees || 0

  return (
    <div className="gba:bg-card gba:p-3 gba:border gba:rounded gba:shadow">
      <p className="gba:font-medium gba:mb-2">{getMonthTranslation(label)}</p>
      <p className="gba:text-sm gba:text-muted-foreground gba:mb-2">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.total', 'Total')}:{' '}
        {totalForMonth}{' '}
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.absences', 'absences')}
      </p>
      {absenceTypes.map((type: string) => {
        const count = monthData[type] || 0
        if (count > 0) {
          return (
            <p key={type} className="gba:text-sm gba:flex gba:items-center gba:gap-2">
              <span
                className="gba:w-3 gba:h-3 gba:rounded gba:inline-block"
                style={{ backgroundColor: getTypeColor(type) }}
              />
              {type}: {count}
            </p>
          )
        }
        return null
      })}
      <div className="gba:text-sm gba:text-muted-foreground gba:mt-2 gba:border-t gba:pt-2">
        <p>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.avg_requests_per_employee',
            'Avg Requests per Employee'
          )}
          : {avgReqPerEmp}
        </p>
        <p>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.avg_duration_per_request',
            'Avg Duration per Request'
          )}
          : {avgDaysPerReq}{' '}
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')}
        </p>
        <p>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.unique_employees',
            'Unique Employees'
          )}
          : {distinctEmployees}
        </p>
      </div>
    </div>
  )
}

const OptimizedAbsenceTrends: React.FC<OptimizedAbsenceTrendsProps> = ({ dashboardData, onMonthClick }) => {
  const { monthlyData, isLoading, error } = dashboardData

  // No need for additional GraphQL calls - monthlyData already contains the aggregated data
  const monthAggMap = useMemo(() => {
    const map: Record<string, any> = {}
    monthlyData.forEach((monthData: any) => {
      map[monthData.month] = {
        totalRequests: monthData.total,
        totalDays: monthData.totalDuration,
        distinctEmployees: monthData.uniqueEmployees,
        avgDaysPerRequest: monthData.avgDurationPerRequest,
        avgRequestsPerEmployee: monthData.avgRequestsPerEmployee
      }
    })
    return map
  }, [monthlyData])

  const chartData = useMemo(() => {
    const allTypes = new Set<string>()
    monthlyData.forEach((monthData: any) => {
      Object.keys(monthData.typeBreakdown).forEach(type => {
        if (type !== 'Unknown' && type.trim() !== '') {
          allTypes.add(type)
        }
      })
    })

    const desiredOrder = ['Vacation', 'Sick Leave', 'Special Leave', 'Work Leave']
    const orderedTypes: string[] = []
    desiredOrder.forEach(type => {
      if (allTypes.has(type)) {
        orderedTypes.push(type)
      }
    })

    allTypes.forEach(type => {
      if (!orderedTypes.includes(type)) {
        orderedTypes.push(type)
      }
    })

    const chartItems = monthlyData.map((monthData: any) => {
      const chartItem: any = {
        month: getMonthTranslation(monthData.month),
        total: monthAggMap[monthData.month]?.totalRequests ?? monthData.total,
        uniqueEmployees: monthAggMap[monthData.month]?.distinctEmployees ?? monthData.uniqueEmployees,
        avgRequestsPerEmployee:
          monthAggMap[monthData.month]?.avgRequestsPerEmployee ?? monthData.avgRequestsPerEmployee,
        avgDurationPerRequest: monthAggMap[monthData.month]?.avgDaysPerRequest ?? monthData.avgDurationPerRequest,
        totalDuration: monthAggMap[monthData.month]?.totalDays ?? monthData.totalDuration
      }

      orderedTypes.forEach(type => {
        chartItem[type] = monthData.typeBreakdown[type] || 0
      })

      return chartItem
    })

    const trendData = chartItems.map(item => {
      const avgPerEmployee = item.avgRequestsPerEmployee || 0

      return {
        ...item,
        trendLine: avgPerEmployee,
        avgDurationPerRequest: item.avgDurationPerRequest || 0,
        uniqueEmployees: item.uniqueEmployees || 0
      }
    })

    return trendData
  }, [monthlyData, monthAggMap])

  const { totalAbsenceRequests, totalAbsenceDays, averagePerMonth } = useMemo(() => {
    const distinctTotalDays = (dashboardData.rawAbsences || []).reduce(
      (sum: number, a: any) => sum + (Number(a.effectiveDays) || 0),
      0
    )
    const nonZeroMonths = chartData.filter(month => month.total > 0).length
    const avg = nonZeroMonths > 0 ? Math.round(distinctTotalDays / nonZeroMonths) : 0
    return {
      totalAbsenceRequests: dashboardData.totalAbsences || 0,
      totalAbsenceDays: distinctTotalDays,
      averagePerMonth: avg
    }
  }, [dashboardData.totalAbsences, dashboardData.rawAbsences, chartData])

  const absenceTypes = useMemo(() => {
    if (chartData.length === 0) return []

    const firstItem = chartData[0]
    const types = Object.keys(firstItem).filter(
      key =>
        key !== 'month' &&
        key !== 'total' &&
        key !== 'trendLine' &&
        key !== 'uniqueEmployees' &&
        key !== 'avgRequestsPerEmployee' &&
        key !== 'avgDurationPerRequest' &&
        key !== 'totalDuration'
    )

    return types
  }, [chartData])

  const getTypeColor = (typeName: string) => {
    const typeData = dashboardData.typeBreakdown?.find((item: any) => item.type === typeName)

    if (typeData?.color) {
      return typeData.color
    }

    return 'var(--nw-chart-1)'
  }

  if (isLoading) {
    return (
      <Card data-testid="optimized-absence-trends-loading">
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_trends',
              'Absence Trends'
            )}{' '}
            ({getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.optimized', 'Optimized')})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:flex gba:justify-center gba:items-center gba:h-64">
            <div className="gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.loading_trends_data',
                'Loading optimized trends data...'
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid="optimized-absence-trends-error">
        <CardHeader>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_trends',
              'Absence Trends'
            )}{' '}
            ({getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.optimized', 'Optimized')})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:text-destructive gba:text-center gba:py-8">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.error_loading_trends',
              'Error loading trends'
            )}
            : {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="optimized-absence-trends-container">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <span>
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_trends',
              'Absence Trends'
            )}
          </span>
        </CardTitle>

        <div className="gba:flex gba:flex-col gba:items-start gba:gap-4 gba:mt-4">
          <div>
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">{totalAbsenceRequests}</div>
            <div className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.total_absences_current_filter',
                'Total Absences (Current Filter)'
              )}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.total_days', 'Total Days')}
              : {totalAbsenceDays}
            </div>
          </div>

          <div className="gba:text-left">
            <div className="gba:text-lg gba:font-semibold gba:text-info">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.avg', 'Avg')}:{' '}
              {averagePerMonth}{' '}
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.days_per_month',
                'days/month'
              )}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.based_on_active_months',
                'Based on'
              )}{' '}
              {chartData.filter(m => m.total > 0).length}{' '}
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.active_months',
                'active months'
              )}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.overlap_note',
                'Note: Monthly totals are overlap-based. A single request can appear in multiple months.'
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div style={{ width: '100%', height: 400, cursor: 'pointer' }}>
          <ResponsiveContainer>
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              onClick={data => {
                if (data && data.activeLabel && onMonthClick) {
                  const monthLabel = data.activeLabel as string

                  let monthPart = monthLabel
                  let yearPart = new Date().getFullYear()

                  const yearMatch = monthLabel.match(/(\w+)\s+(\d{4})/)
                  if (yearMatch) {
                    monthPart = yearMatch[1]
                    yearPart = parseInt(yearMatch[2])
                  }

                  const monthMap: Record<string, string> = {
                    Jan: 'January',
                    Feb: 'February',
                    Mar: 'March',
                    Apr: 'April',
                    May: 'May',
                    Jun: 'June',
                    Jul: 'July',
                    Aug: 'August',
                    Sep: 'September',
                    Oct: 'October',
                    Nov: 'November',
                    Dec: 'December'
                  }

                  const fullMonth = monthMap[monthPart] || monthPart
                  onMonthClick(fullMonth, yearPart)
                }
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                content={
                  <ServerBackedTooltip
                    absenceTypes={absenceTypes}
                    getTypeColor={getTypeColor}
                    monthAggMap={monthAggMap}
                    data-testid="absence-trends-tooltip"
                  />
                }
              />
              <Legend
                content={() => {
                  return (
                    <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-4 gba:mt-4">
                      {absenceTypes.map(type => (
                        <div key={type} className="gba:flex gba:items-center gba:gap-2">
                          <span
                            className="gba:w-3 gba:h-3 gba:rounded"
                            style={{ backgroundColor: getTypeColor(type) }}
                          />
                          <span className="gba:text-sm">{type}</span>
                        </div>
                      ))}
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span
                          className="gba:w-3 gba:h-3 gba:rounded"
                          style={{ backgroundColor: colorPalette.totalLine }}
                        />
                        <span className="gba:text-sm">
                          {getTranslationFromI18nKeyAndLabel(
                            'lowcoder:absence_management_hub_backoffice.trend_line_avg_requests',
                            'Trend Line (avg requests per employee)'
                          )}
                        </span>
                      </div>
                    </div>
                  )
                }}
              />

              {absenceTypes.map((type: string) => (
                <Bar key={type} dataKey={type} stackId="types" fill={getTypeColor(type)} name={type} />
              ))}

              <Line
                type="monotone"
                dataKey="trendLine"
                stroke={colorPalette.totalLine}
                strokeWidth={3}
                dot={{ fill: colorPalette.totalLine, strokeWidth: 2, r: 4 }}
                name="Trend Line (avg requests per employee)"
                connectNulls={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="gba:mt-6 gba:space-y-3">
          <div className="gba:flex gba:flex-wrap gba:gap-4 gba:text-sm">
            <div>
              🎯{' '}
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.peak_month', 'Peak month')}
              :{' '}
              {chartData.reduce((max, month) => (month.total > max.total ? month : max), chartData[0] || {}).month ||
                'N/A'}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OptimizedAbsenceTrends
