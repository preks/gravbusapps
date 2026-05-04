import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useTeamCoverageData } from '../../../hooks/useTeamCoverageData'
import { TeamDailyFactsSource, useTeamDailyFactsByTypeMonthly } from '../../../hooks/useTeamDailyFacts'

interface YearComparisonSectionProps extends BusinessAppContextProps {
  factsSource?: TeamDailyFactsSource
}

const getMonthTotal = (monthData: { [key: string]: string | number }): number =>
  Object.entries(monthData).reduce((sum, [key, value]) => {
    if (key === 'month') {
      return sum
    }
    return sum + (typeof value === 'number' ? value : Number(value) || 0)
  }, 0)

export const YearComparisonSection: React.FC<YearComparisonSectionProps> = ({ factsSource = 'net', ...props }) => {
  const { accessToken } = props
  const { teamMemberIds, isLoading: coverageLoading, error: coverageError } = useTeamCoverageData(props)
  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1
  const previousYearFrom = `${previousYear}-01-01`
  const previousYearTo = `${previousYear}-12-31`
  const currentYearFrom = dayjs().startOf('year').format('YYYY-MM-DD')
  const currentYearTo = dayjs().endOf('year').format('YYYY-MM-DD')

  const previousYearFacts = useTeamDailyFactsByTypeMonthly(
    accessToken,
    teamMemberIds,
    previousYearFrom,
    previousYearTo,
    undefined,
    factsSource === 'net' ? undefined : ['APPROVED'],
    factsSource
  )
  const currentYearFacts = useTeamDailyFactsByTypeMonthly(
    accessToken,
    teamMemberIds,
    currentYearFrom,
    currentYearTo,
    undefined,
    factsSource === 'net' ? undefined : ['APPROVED'],
    factsSource
  )

  const chartData = useMemo(() => {
    const previousYearMonthly = previousYearFacts.data.barChartData.map(getMonthTotal)
    const currentYearMonthly = currentYearFacts.data.barChartData.map(getMonthTotal)
    const monthLabelsSource =
      currentYearFacts.data.barChartData.length > 0
        ? currentYearFacts.data.barChartData
        : previousYearFacts.data.barChartData
    const monthLabels = monthLabelsSource.map(monthData => String(monthData.month || ''))

    return monthLabels.map((month, index) => ({
      month,
      [previousYear]: Math.round((previousYearMonthly[index] || 0) * 100) / 100,
      [currentYear]: Math.round((currentYearMonthly[index] || 0) * 100) / 100
    }))
  }, [previousYearFacts.data.barChartData, currentYearFacts.data.barChartData, previousYear, currentYear])

  const isLoading = coverageLoading || previousYearFacts.loading || currentYearFacts.loading
  const error = coverageError || previousYearFacts.error?.message || currentYearFacts.error?.message

  if (isLoading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="year-comparison-loading">
        {getTranslationFromI18nKeyAndLabel('lowcoder:add_items_to_plan.loading_text', 'Loading...')}
      </div>
    )
  }

  if (error) {
    return (
      <div className="gba:p-6 gba:text-center gba:text-destructive" data-testid="year-comparison-error">
        Error: {error}
      </div>
    )
  }

  if (chartData.length === 0) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid="year-comparison-no-data">
        No year-over-year data available.
      </div>
    )
  }

  return (
    <Card className="gba:shadow-sm" data-testid="year-comparison-section">
      <CardHeader>
        <CardTitle className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_manager.dashboard.yoy_title',
            'Year-over-Year Comparison'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Bar dataKey={previousYear.toString()} fill="var(--nw-chart-4)" />
              <Bar dataKey={currentYear.toString()} fill="var(--nw-chart-3)" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
