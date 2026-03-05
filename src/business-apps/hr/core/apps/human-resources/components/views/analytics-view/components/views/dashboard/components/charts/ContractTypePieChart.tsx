import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { Card, Typography, Spin, Empty, Tooltip, theme } from 'antd'
import { InfoIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useTranslation } from '@newwork/nw-design-system'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'
import { useContractTypeDistribution } from '../../../../../hooks/useContractTypeDistribution'

const { Title } = Typography

/**
 * ContractTypePieChart component shows the distribution of employee contract types as a pie chart
 * With a center statistic showing total employee count and custom tooltips
 */
export const ContractTypePieChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { token } = theme.useToken()
  const { t } = useTranslation(hrTranslations)

  // Fetch contract type distribution data
  const { distribution: data, loading, error } = useContractTypeDistribution(accessToken)

  // Transform data for pie chart
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      name: item.name,
      value: item.count,
      percentage: parseFloat(item.percentage.toFixed(1)),
      // Add formatted display value for consistent presentation
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
        <text x={cx} y={cy - 20} textAnchor="middle" fill={token.colorText} fontSize={20} fontWeight="600">
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={token.colorTextSecondary} fontSize={16}>
          {value.toLocaleString()} {t('hr-analytics-employees')}
        </text>
        <text x={cx} y={cy + 35} textAnchor="middle" fill={token.colorPrimary} fontSize={16} fontWeight="600">
          {payload.percentage}%
        </text>
      </g>
    )
  }

  // Tooltip has been removed as per requirement

  return (
    <Card
      title={
        <div>
          <Title level={4} className="gba:m-0">{t('hr-analytics-contract-types')}</Title>
          <Tooltip
            title={t('hr-analytics-contract-types-tooltip')}
          >
            <InfoIcon size={16} className="gba:ml-2" />
          </Tooltip>
        </div>
      }
      className="gba:shadow-lg gba:rounded-lg gba:mb-6 gba:overflow-hidden gba:border-0"
      style={{ background: 'var(--gradient-decorative-1)' }}
      data-testid="contract-type-pie-chart"
    >
      <div
        className="gba:flex gba:flex-col gba:w-full gba:transition-all gba:duration-500 gba:relative gba:m-0 gba:rounded-xl gba:px-5 gba:py-8 gba:bg-card gba:shadow-lg gba:border gba:border-border"
        data-testid="contract-type-pie-chart-container"
      >
        {/* Chart container with fixed height */}
        <div className="gba:h-[400px] gba:w-full">
          {loading ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Spin size="large" data-testid="contract-type-pie-chart-loading" />
            </div>
          ) : error ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-destructive">
              <div data-testid="contract-type-pie-chart-error">{t('hr-analytics-error-message')}</div>
            </div>
          ) : data.length === 0 ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Empty description={t('hr-analytics-no-data')} data-testid="contract-type-pie-chart-empty" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%" data-testid="contract-type-pie-chart-rendered">
              <PieChart>
                {/* Tooltip removed as requested */}
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  activeShape={renderActiveShape}
                  innerRadius="60%"
                  outerRadius="80%"
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={1200}
                  animationEasing="ease-out"
                >
                  {chartData.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                      stroke={token.colorBgContainer}
                      strokeWidth={2}
                    />
                  ))}
                  {/* Custom center label rendered directly */}
                  <text
                    x="50%"
                    y="47%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: '20px', fill: token.colorText, fontWeight: 600 }}
                  >
                    {t('hr-analytics-contract-types')}
                  </text>
                  <text
                    x="50%"
                    y="57%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: '28px', fontWeight: 'bold', fill: token.colorTextHeading }}
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
            className="gba:mt-6 gba:pt-4 gba:border-t gba:border-border gba:flex gba:flex-wrap gba:justify-center gba:gap-2 gba:px-2"
            data-testid="contract-type-legend"
          >
            {chartData.map((item, index) => {
              // Use the same dynamic colors as the chart
              const colorIndex = index % COLORS.length

              return (
                <div
                  key={`legend-${index}`}
                  className="gba:flex gba:items-center gba:mb-3 gba:px-3 gba:py-1.5 gba:bg-muted gba:rounded gba:border gba:border-border"
                >
                  <div
                    className="gba:w-3.5 gba:h-3.5 gba:rounded-full gba:mr-2.5 gba:shadow-sm"
                    style={{
                      backgroundColor: COLORS[colorIndex],
                      boxShadow: '0 0 0 1px var(--color-border)'
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

export default ContractTypePieChart
