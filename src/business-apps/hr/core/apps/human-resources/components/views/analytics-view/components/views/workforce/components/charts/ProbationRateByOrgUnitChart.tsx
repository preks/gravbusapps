import React, { useMemo } from 'react'
import { Card, Spinner, Alert, Badge, useTranslation } from '@newwork/nw-design-system'
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
import { useProbationRateByOrgUnit } from '../../../../../hooks/useProbationRateByOrgUnit'
import { mapValueToColor } from '@/common/utils/chartColorMapper'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

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
  const { t } = useTranslation(hrTranslations)

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
          <span className="gba:text-muted-foreground">{t('hr-analytics-probation-rate')}</span>
          <span className="gba:text-foreground gba:font-medium">{data.probationRate}%</span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <span className="gba:text-muted-foreground">{t('hr-analytics-employees-in-probation')}</span>
          <span className="gba:text-foreground gba:font-medium">{data.employeesInProbation}</span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-muted-foreground">{t('hr-analytics-total-employees')}</span>
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
            {t('hr-analytics-probation-rate-by-org')}
          </h3>
          <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">
            {t('hr-analytics-probation-rate-description')}
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
            {t('hr-analytics-probation-rate-by-org')}
          </h3>
          <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">
            {t('hr-analytics-probation-rate-description')}
          </p>
        </div>
        <Alert variant="destructive">{t('hr-analytics-error-message')}</Alert>
      </Card>
    )
  }

  return (
    <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-chart`}>
      <div className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
            {t('hr-analytics-probation-rate-by-org')}
          </h3>
          <Badge variant="outline" className="gba:text-xs">
            {t('hr-analytics-probation-status')}
          </Badge>
        </div>
        <p className="gba:text-muted-foreground gba:text-sm">{t('hr-analytics-probation-rate-description')}</p>
      </div>

      {data.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96 gba:text-muted-foreground">
          {t('hr-analytics-no-data')}
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
                accessibilityLayer={false}
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
                    value: t('hr-analytics-probation-rate-percent'),
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
                  name={t('hr-analytics-probation-rate')}
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
              {t('hr-analytics-top-org-units-note', { total: data.length })}
            </div>
          )}
        </>
      )}
    </Card>
  )
}

export default ProbationRateByOrgUnitChart
