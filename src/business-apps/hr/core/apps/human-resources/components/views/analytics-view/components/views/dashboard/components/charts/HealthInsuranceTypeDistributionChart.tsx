import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { Card, Typography, Spin, Empty } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useTranslation } from '@newwork/nw-design-system'
import { useHealthInsuranceTypeDistribution } from '../../../../../hooks/useHealthInsuranceTypeDistribution'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title } = Typography

/**
 * HealthInsuranceTypeDistributionChart component shows the distribution of employee health insurance types
 * as a pie chart with a center statistic showing total employee count
 */
export const HealthInsuranceTypeDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)
  const { t } = useTranslation(hrTranslations)

  // Fetch health insurance type distribution data
  const { distribution: data, loading, error, totalEmployees } = useHealthInsuranceTypeDistribution(accessToken)

  // Transform data for pie chart
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      name: item.name,
      value: item.count,
      percentage: parseFloat(item.percentage.toFixed(1)),
      displayValue: `${item.count.toLocaleString()} (${item.percentage.toFixed(1)}%)`
    }))
  }, [data])

  // Chart color palette using design system tokens - cycle through 8 colors
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
        <text x={cx} y={cy - 20} textAnchor="middle" fill="var(--nw-foreground)" fontSize={18} fontWeight="600">
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="var(--nw-muted-foreground)" fontSize={14}>
          {value.toLocaleString()} employees
        </text>
        <text x={cx} y={cy + 35} textAnchor="middle" fill="var(--nw-info)" fontSize={14} fontWeight="600">
          {payload.percentage}%
        </text>
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

  return (
    <Card
      title={
        <div className="gba:flex gba:justify-between gba:items-center">
          <Title level={4} style={{ margin: 0 }}>{t('hr-analytics-health-insurance-type-distribution')}</Title>
          <div className="gba:flex gba:items-center">
            <InfoCircleOutlined
              className="gba:text-muted-foreground"
              style={{ fontSize: '16px' }}
              data-testid="health-insurance-type-distribution-info-icon"
            />
          </div>
        </div>
      }
      bordered={false}
      style={{ height: '100%' }}
      data-testid="health-insurance-type-distribution-chart"
    >
      <div className="gba:h-[450px] gba:flex gba:justify-center gba:items-center">
        {loading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <Spin size="large" data-testid="health-insurance-type-distribution-loading" />
          </div>
        ) : error ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <Empty description={t('hr-analytics-error-loading')} data-testid="health-insurance-type-distribution-error" />
          </div>
        ) : data.length === 0 ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <Empty description={t('hr-analytics-no-data')} data-testid="health-insurance-type-distribution-empty" />
          </div>
        ) : (
          <ResponsiveContainer
            width="100%"
            height="100%"
            className="gba:w-full"
            data-testid="health-insurance-type-distribution-rendered"
          >
            <PieChart>
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
                    fill={COLORS[index % COLORS.length]}
                    stroke="var(--nw-card)"
                    strokeWidth={2}
                  />
                ))}
                {/* Custom center label */}
                <text
                  x="50%"
                  y="47%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fontSize: '18px', fill: 'var(--nw-foreground)', fontWeight: 600 }}
                >
                  {t('hr-analytics-insurance-types')}
                </text>
                <text
                  x="50%"
                  y="57%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fontSize: '24px', fontWeight: 'bold', fill: 'var(--nw-foreground)' }}
                >
                  {totalEmployees.toLocaleString()}
                </text>
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Custom Legend at bottom */}
      {!loading && !error && data.length > 0 && (
        <div
          className="gba:mt-4 gba:pt-2 gba:border-t gba:border-border gba:flex gba:flex-wrap gba:justify-center gba:gap-2 gba:px-2"
          data-testid="health-insurance-type-distribution-legend"
        >
          {chartData.map((item, index) => {
            const colorIndex = index % COLORS.length

            return (
              <div
                key={`legend-${index}`}
                className="gba:flex gba:items-center gba:mb-2 gba:px-2.5 gba:py-1 gba:bg-muted gba:rounded gba:border gba:border-border"
              >
                <div
                  className="gba:w-3 gba:h-3 gba:rounded-full gba:mr-2 gba:shadow-sm"
                  style={{
                    backgroundColor: COLORS[colorIndex],
                    boxShadow: '0 0 0 1px var(--nw-border)'
                  }}
                />
                <div className="gba:font-medium gba:text-sm">
                  <span className="gba:mr-1.5">{item.name}:</span>
                  <span className="gba:font-bold">
                    {item.value.toLocaleString()} ({item.percentage}%)
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}

export default HealthInsuranceTypeDistributionChart
