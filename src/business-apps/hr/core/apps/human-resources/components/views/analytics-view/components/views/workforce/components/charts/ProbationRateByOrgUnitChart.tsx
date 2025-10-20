import React, { useMemo } from 'react'
import { Card, Spinner, Alert, Badge } from '@newwork/nw-design-system'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useProbationRateByOrgUnit } from '../../../../../hooks/useProbationRateByOrgUnit'
import { mapValueToColor } from '@/common/utils/chartColorMapper'

interface ProbationRateByOrgUnitChartProps {
  accessToken: string
}

/**
 * Bar chart component for displaying probation rate across organizational units
 * Probation Rate = (Employees in Probation / Total Employees) * 100
 */
const ProbationRateByOrgUnitChart: React.FC<ProbationRateByOrgUnitChartProps> = ({ accessToken }) => {
  const { data, loading, error } = useProbationRateByOrgUnit(accessToken)
  const prefixDataTestId = 'ProbationRateByOrgUnitChart'

  // Transform data for the bar chart - limit to top 10 org units with highest probation rates
  const chartData = useMemo(() => {
    const sortedData = [...data].sort((a, b) => b.probationRate - a.probationRate).slice(0, 10)
    return sortedData.map(item => ({
      orgUnit: item.name,
      probationRate: item.probationRate,
      employeesInProbation: item.employeesInProbation,
      totalEmployees: item.totalEmployees
    }))
  }, [data])

  const getBarColor = React.useCallback(
    (probationRate: number) => {
      // Map probation rate to color intensity - lowest rates get lighter colors, highest get darker
      const allRates = chartData.map(item => item.probationRate)
      const chartColors = [
        'var(--nw-chart-1)',
        'var(--nw-chart-2)',
        'var(--nw-chart-3)',
        'var(--nw-chart-4)',
        'var(--nw-chart-5)',
        'var(--nw-chart-6)',
        'var(--nw-chart-7)',
        'var(--nw-chart-8)'
      ]
      return mapValueToColor(probationRate, allRates, [...chartColors])
    },
    [chartData]
  )

  // Format org unit names for display (truncate if too long)
  const formatXAxis = (value: string) => {
    if (value.length > 20) {
      return value.substring(0, 20) + '...'
    }
    return value
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null
    }

    const data = payload[0].payload

    return (
      <div className="gba:p-4 gba:bg-card gba:rounded-lg gba:shadow-lg gba:border gba:border-border">
        <p className="gba:text-lg gba:font-semibold gba:border-b gba:border-border gba:pb-2 gba:mb-3">{label}</p>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <span className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_probation_rate', 'Probation Rate')}
          </span>
          <span className="gba:text-foreground gba:font-medium">{data.probationRate}%</span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <span className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_employees_in_probation', 'Employees in Probation')}
          </span>
          <span className="gba:text-foreground gba:font-medium">{data.employeesInProbation}</span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_total_employees', 'Total Employees')}
          </span>
          <span className="gba:text-foreground gba:font-medium">{data.totalEmployees}</span>
        </div>
      </div>
    )
  }

  // Custom label renderer for the bars
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props

    if (!value || width < 40) return null

    return (
      <text
        x={x + width + 10}
        y={y + height / 2}
        fill="var(--nw-color-foreground)"
        textAnchor="start"
        dy={4}
        fontSize={12}
        fontWeight="600"
      >
        {value.toFixed(1)}%
      </text>
    )
  }

  if (loading) {
    return (
      <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-loading`}>
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_probation_rate_by_org',
              'Probation Rate by Organizational Unit'
            )}
          </h3>
          <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">
            Shows the percentage of employees in probation period relative to total employees across organizational
            units
          </p>
        </div>
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96">
          <Spinner className="gba:w-8 gba:h-8" />
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-error`}>
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_probation_rate_by_org',
              'Probation Rate by Organizational Unit'
            )}
          </h3>
          <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">
            Shows the percentage of employees in probation period relative to total employees across organizational
            units
          </p>
        </div>
        <Alert variant="destructive">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
        </Alert>
      </Card>
    )
  }

  return (
    <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-chart`}>
      <div className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_probation_rate_by_org',
              'Probation Rate by Organizational Unit'
            )}
          </h3>
          <Badge variant="outline" className="gba:text-xs">
            Probation status
          </Badge>
        </div>
        <p className="gba:text-muted-foreground gba:text-sm">
          Shows the percentage of employees in probation period relative to total employees across organizational units
        </p>
      </div>

      {data.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96 gba:text-muted-foreground">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
        </div>
      ) : (
        <>
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
                barSize={20}
                barGap={2}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nw-color-border)" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tickFormatter={value => `${value}%`}
                  tick={{ fill: 'var(--nw-color-muted-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--nw-color-border)' }}
                  tickLine={{ stroke: 'var(--nw-color-border)' }}
                  label={{
                    value: getTranslationFromI18nKeyAndLabel(
                      'hr_analytics_probation_rate_percent',
                      'Probation Rate (%)'
                    ),
                    position: 'insideBottom',
                    offset: -10,
                    style: {
                      textAnchor: 'middle',
                      fill: 'var(--nw-color-muted-foreground)',
                      fontSize: 12,
                      fontWeight: 500
                    }
                  }}
                />
                <YAxis
                  dataKey="orgUnit"
                  type="category"
                  width={160}
                  tickFormatter={formatXAxis}
                  tick={{ fill: 'var(--nw-color-muted-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--nw-color-border)' }}
                  tickLine={{ stroke: 'var(--nw-color-border)' }}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--nw-color-muted)' }} />
                <Bar
                  name={getTranslationFromI18nKeyAndLabel('hr_analytics_probation_rate', 'Probation Rate')}
                  dataKey="probationRate"
                  radius={[0, 6, 6, 0]}
                  animationDuration={1200}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.probationRate)} />
                  ))}
                  <LabelList dataKey="probationRate" position="right" content={renderCustomBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Display footnote about showing only top 10 */}
          {data.length > 10 && (
            <div
              className="gba:text-center gba:text-sm gba:text-muted-foreground gba:mt-4"
              data-testid={`${prefixDataTestId}-footnote`}
            >
              {getTranslationFromI18nKeyAndLabel(
                'hr_analytics_top_org_units_note',
                `Showing top 10 organizational units with highest probation rates out of ${data.length} total`
              )}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default ProbationRateByOrgUnitChart
