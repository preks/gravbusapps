import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { Card, Spinner, useTranslation } from '@newwork/nw-design-system'
import { InfoIcon } from '@phosphor-icons/react'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

// Using the imported type from useEmploymentTypeDistribution hook
import { EmploymentTypeDistribution } from '../../../../../hooks/useEmploymentTypeDistribution'

interface EmploymentTypePieChartProps {
  data: EmploymentTypeDistribution[]
  loading?: boolean
  error?: Error | null
}

/**
 * Pie chart component for displaying employment type distribution
 */
const EmploymentTypePieChart: React.FC<EmploymentTypePieChartProps> = ({ data, loading = false, error = null }) => {
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)
  const { t } = useTranslation(hrTranslations)

  // Transform data for the pie chart
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      name: item.name,
      value: item.count,
      percentage: item.percentage,
      // Add formatted display value for consistent presentation
      displayValue: `${item.count.toLocaleString()} (${item.percentage}%)`
    }))
  }, [data])

  // Get chart colors that automatically update with theme changes
  const CHART_COLORS = [
    'var(--nw-chart-1)',
    'var(--nw-chart-2)',
    'var(--nw-chart-3)',
    'var(--nw-chart-4)',
    'var(--nw-chart-5)',
    'var(--nw-chart-6)',
    'var(--nw-chart-7)',
    'var(--nw-chart-8)'
  ]

  // Calculate the total number of employees
  const totalEmployees = React.useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0)
  }, [chartData])

  // Custom active shape for the pie chart when hovering
  const renderActiveShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, value } = props

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={innerRadius}
          outerRadius={outerRadius + 10}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={0.8}
        />
        <Sector
          cx={cx}
          cy={cy}
          startAngle={startAngle}
          endAngle={endAngle}
          innerRadius={innerRadius - 6}
          outerRadius={innerRadius - 2}
          fill={fill}
        />
        <text x={cx} y={cy - 20} textAnchor="middle" fill="var(--nw-color-foreground)" fontSize={20} fontWeight="600">
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--nw-color-muted-foreground)" fontSize={16}>
          {value.toLocaleString()} {t('hr-analytics-employees')}
        </text>
        <text x={cx} y={cy + 35} textAnchor="middle" fill="var(--nw-color-primary)" fontSize={16} fontWeight="600">
          {payload.percentage}%
        </text>
      </g>
    )
  }

  // Tooltip has been removed as per requirement

  // Event handlers for pie slice hover
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(-1)
  }

  return (
    <Card
      className="gba:shadow-lg gba:rounded-lg gba:mb-6 gba:overflow-hidden gba:border-0 gba:bg-card"
      data-testid="employment-type-pie-chart"
    >
        <div className="gba:flex gba:items-center gba:mb-4">
          <h4 className="gba:m-0 gba:text-lg gba:font-semibold">{t('hr-analytics-employment-type')}</h4>
          <span title={t('hr-analytics-employment-tooltip')}>
            <InfoIcon size={16} className="gba:ml-2" />
          </span>
        </div>
      <div
        className="gba:flex gba:flex-col gba:w-full gba:relative gba:m-0 gba:py-[30px] gba:px-5 gba:transition-all gba:duration-500 gba:bg-card gba:border gba:rounded-xl"
        data-testid="employment-type-pie-chart-container"
      >
        {/* Chart container with fixed height */}
        <div className="gba:h-[400px] gba:w-full">
          {loading ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Spinner data-testid="employment-type-pie-chart-loading" />
            </div>
          ) : error ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-destructive">
              <div data-testid="employment-type-pie-chart-error">{t('hr-analytics-error-message')}</div>
            </div>
          ) : data.length === 0 ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <span className="gba:text-sm gba:text-muted-foreground" data-testid="employment-type-pie-chart-empty">
                {t('hr-analytics-no-data')}
              </span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart width={400} height={400} data-testid="employment-type-pie-chart-rendered">
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  activeIndex={activeIndex}
                  activeShape={renderActiveShape}
                  innerRadius="60%"
                  outerRadius="80%"
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                      stroke="var(--nw-color-card)"
                      strokeWidth={2}
                    />
                  ))}
                  {/* Custom center label rendered directly instead of using Label component */}
                  <text
                    x="50%"
                    y="47%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="20"
                    fontWeight="600"
                    fill="var(--nw-color-foreground)"
                  >
                    {t('hr-analytics-total-employees')}
                  </text>
                  <text
                    x="50%"
                    y="57%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="28"
                    fontWeight="bold"
                    fill="var(--nw-color-foreground)"
                  >
                    {totalEmployees.toLocaleString()}
                  </text>
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Custom Legend at bottom with proper colors and formatting */}
        {!loading && !error && data.length > 0 && (
          <div
            className="gba:mt-6 gba:pt-4 gba:border-t gba:border-border gba:flex gba:flex-wrap gba:justify-center gba:gap-2 gba:py-4 gba:px-2"
            data-testid="employment-type-legend"
          >
            {chartData.map((item, index) => {
              const colorIndex = index % CHART_COLORS.length

              return (
                <div
                  key={`legend-${index}`}
                  className="gba:flex gba:items-center gba:mb-3 gba:bg-muted gba:border gba:rounded gba:py-1.5 gba:px-3"
                >
                  <div
                    className="gba:w-3.5 gba:h-3.5 gba:rounded-full gba:mr-2.5"
                    style={{
                      backgroundColor: CHART_COLORS[colorIndex],
                      boxShadow: `0 0 0 1px var(--nw-border)`
                    }}
                  />
                  <div className="gba:font-medium gba:text-base">
                    <span className="gba:mr-2">{item.name}:</span>
                    <span className="gba:font-bold">
                      {item.value.toLocaleString()} ({item.percentage}%)
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </Card>
  )
}

export default EmploymentTypePieChart
