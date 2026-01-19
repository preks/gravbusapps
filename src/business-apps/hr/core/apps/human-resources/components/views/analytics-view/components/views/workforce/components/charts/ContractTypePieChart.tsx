import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { Card, Spinner, Alert, Badge, useTranslation } from '@newwork/nw-design-system'
import { useContractTypeDistribution } from '../../../../../hooks/useContractTypeDistribution'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface ContractTypePieChartProps {
  accessToken: string
}

/**
 * ContractTypePieChart component shows the distribution of employee contract types as a pie chart
 */
const ContractTypePieChart: React.FC<ContractTypePieChartProps> = ({ accessToken }) => {
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)
  const prefixDataTestId = 'ContractTypePieChart'
  const { t } = useTranslation(hrTranslations)

  // Fetch contract type distribution data
  const { distribution: data, loading, error } = useContractTypeDistribution(accessToken)

  // Transform data for pie chart
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      name: item.name,
      value: item.count,
      percentage: parseFloat(item.percentage.toFixed(1)),
      displayValue: `${item.count.toLocaleString()} (${item.percentage.toFixed(1)}%)`
    }))
  }, [data])

  // Get chart colors that automatically update with theme changes
  const COLORS = [
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

  // Shape renderer using local hover state (no deprecated props)
  const renderShape = (props: any) => {
    const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, index } = props
    const isActive = index === activeIndex
    const adjustedOuter = isActive ? outerRadius + 10 : outerRadius
    const adjustedInner = isActive ? innerRadius - 6 : innerRadius

    return (
      <g>
        <Sector
          cx={cx}
          cy={cy}
          innerRadius={adjustedInner}
          outerRadius={adjustedOuter}
          startAngle={startAngle}
          endAngle={endAngle}
          fill={fill}
          opacity={isActive ? 0.9 : 1}
        />
        {isActive && (
          <Sector
            cx={cx}
            cy={cy}
            startAngle={startAngle}
            endAngle={endAngle}
            innerRadius={adjustedInner - 2}
            outerRadius={adjustedInner}
            fill={fill}
          />
        )}
      </g>
    )
  }

  // Event handlers for pie slice hover
  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index)
  }

  const onPieLeave = () => {
    setActiveIndex(-1)
  }

  if (loading) {
    return (
      <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-loading`}>
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-foreground gba:m-0">
            {t('hr-analytics-contract-types')}
          </h3>
          <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">
            {t('hr-analytics-contract-types-description')}
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
            {t('hr-analytics-contract-types')}
          </h3>
          <p className="gba:text-muted-foreground gba:text-sm gba:mt-1">
            {t('hr-analytics-contract-types-description')}
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
            {t('hr-analytics-contract-types')}
          </h3>
          <Badge variant="outline" className="gba:text-xs">
            {t('hr-analytics-contract-breakdown')}
          </Badge>
        </div>
        <p className="gba:text-muted-foreground gba:text-sm">{t('hr-analytics-contract-types-description')}</p>
      </div>

      {data.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96 gba:text-muted-foreground">
          {t('hr-analytics-no-data')}
        </div>
      ) : (
        <>
          {/* Chart container */}
          <div className="gba:h-96" onMouseLeave={() => setActiveIndex(-1)}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart data-testid={`${prefixDataTestId}-rendered`} onMouseLeave={() => setActiveIndex(-1)}>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  shape={renderShape}
                  innerRadius="60%"
                  outerRadius="80%"
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  animationBegin={0}
                  animationDuration={1200}
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke="var(--nw-color-card)"
                      strokeWidth={2}
                    />
                  ))}
                  {/* Custom center label: totals or active slice details */}
                  {activeIndex === -1 ? (
                    <>
                      <text
                        x="50%"
                        y="47%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '20px', fill: 'var(--nw-color-foreground)', fontWeight: 600 }}
                      >
                        {t('hr-analytics-contract-types')}
                      </text>
                      <text
                        x="50%"
                        y="57%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '28px', fontWeight: 'bold', fill: 'var(--nw-color-foreground)' }}
                      >
                        {totalEmployees.toLocaleString()}
                      </text>
                    </>
                  ) : (
                    <>
                      <text
                        x="50%"
                        y="45%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '18px', fill: 'var(--nw-color-foreground)', fontWeight: 600 }}
                      >
                        {chartData[activeIndex]?.name}
                      </text>
                      <text
                        x="50%"
                        y="56%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '22px', fontWeight: 'bold', fill: 'var(--nw-color-foreground)' }}
                      >
                        {chartData[activeIndex]?.value.toLocaleString()} {t('hr-analytics-employees')}
                      </text>
                      <text
                        x="50%"
                        y="66%"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        style={{ fontSize: '16px', fontWeight: 600, fill: 'var(--nw-color-primary)' }}
                      >
                        {chartData[activeIndex]?.percentage}%
                      </text>
                    </>
                  )}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <div className="gba:mt-6 gba:pt-4 gba:border-t gba:border-border" data-testid={`${prefixDataTestId}-legend`}>
            <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-3">
              {chartData.map((item, index) => (
                <div
                  key={`legend-${index}`}
                  className="gba:flex gba:items-center gba:px-3 gba:py-2 gba:bg-background gba:rounded gba:border gba:border-border"
                >
                  <div
                    className="gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="gba:text-sm gba:font-medium gba:text-foreground">
                    {item.name}:{' '}
                    <span className="gba:font-semibold">
                      {item.value.toLocaleString()} ({item.percentage}%)
                    </span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </Card>
  )
}

export default ContractTypePieChart
