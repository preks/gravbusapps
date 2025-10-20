import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface YearComparisonSectionProps {
  data: any
}

export const YearComparisonSection: React.FC<YearComparisonSectionProps> = ({ data }) => {
  const chartData = data?.yearOverYearData || []

  const currentYear = new Date().getFullYear()
  const previousYear = currentYear - 1

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
