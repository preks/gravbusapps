import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { Card, Typography, Spin, Empty, theme } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/business-apps/types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useHealthInsuranceTypeDistribution } from '../../../../../hooks/useHealthInsuranceTypeDistribution'

const { Title } = Typography

/**
 * HealthInsuranceTypeDistributionChart component shows the distribution of employee health insurance types
 * as a pie chart with a center statistic showing total employee count
 */
export const HealthInsuranceTypeDistributionChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { token } = theme.useToken()
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)

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

  // Purple color palette for health insurance type chart
  const COLORS = [
    '#9370DB',
    '#8A2BE2',
    '#9932CC',
    '#800080',
    '#4B0082',
    '#6A5ACD',
    '#BA55D3',
    '#7B68EE',
    '#9966CC',
    '#663399',
    '#D8BFD8',
    '#C3B1E1',
    '#5D3FD3',
    '#BDB2FF',
    '#DCD0FF',
    '#DDB4FF',
    '#A15DC9',
    '#A569BD'
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
        <text x={cx} y={cy - 20} textAnchor="middle" fill={token.colorText} fontSize={18} fontWeight="600">
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill={token.colorTextSecondary} fontSize={14}>
          {value.toLocaleString()} employees
        </text>
        <text x={cx} y={cy + 35} textAnchor="middle" fill={token.colorPrimary} fontSize={14} fontWeight="600">
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
          <Title level={4} style={{ margin: 0 }}>
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_health_insurance_type_distribution',
              'Health Insurance Type Distribution'
            )}
          </Title>
          <div className="gba:flex gba:items-center">
            <InfoCircleOutlined
              style={{ fontSize: '16px', color: token.colorTextSecondary }}
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
            <Empty
              description={getTranslationFromI18nKeyAndLabel('hr_analytics_error_loading', 'Error loading data')}
              data-testid="health-insurance-type-distribution-error"
            />
          </div>
        ) : data.length === 0 ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
            <Empty
              description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
              data-testid="health-insurance-type-distribution-empty"
            />
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
                    stroke={token.colorBgContainer}
                    strokeWidth={2}
                  />
                ))}
                {/* Custom center label */}
                <text
                  x="50%"
                  y="47%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fontSize: '18px', fill: token.colorText, fontWeight: 600 }}
                >
                  {getTranslationFromI18nKeyAndLabel('hr_analytics_insurance_types', 'Insurance Types')}
                </text>
                <text
                  x="50%"
                  y="57%"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ fontSize: '24px', fontWeight: 'bold', fill: token.colorTextHeading }}
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
          className="gba:mt-4 gba:pt-2 gba:border-t gba:border-gray-200"
          data-testid="health-insurance-type-distribution-legend"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '8px',
            padding: '8px 8px 0'
          }}
        >
          {chartData.map((item, index) => {
            const colorIndex = index % COLORS.length

            return (
              <div
                key={`legend-${index}`}
                className="gba:flex gba:items-center gba:mb-2"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '4px 10px',
                  backgroundColor: 'rgba(0,0,0,0.02)',
                  borderRadius: '4px',
                  border: '1px solid rgba(0,0,0,0.05)'
                }}
              >
                <div
                  className="gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: COLORS[colorIndex],
                    marginRight: '8px',
                    boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                  }}
                />
                <div style={{ fontWeight: 500, fontSize: '14px' }}>
                  <span style={{ marginRight: '6px' }}>{item.name}:</span>
                  <span style={{ fontWeight: 700 }}>
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
