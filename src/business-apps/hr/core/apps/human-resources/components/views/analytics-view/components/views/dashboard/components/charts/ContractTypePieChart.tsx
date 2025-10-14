import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { Card, Typography, Spin, Empty, Tooltip, theme } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/business-apps/types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useContractTypeDistribution } from '../../../../../hooks/useContractTypeDistribution'

const { Title } = Typography

/**
 * ContractTypePieChart component shows the distribution of employee contract types as a pie chart
 * With a center statistic showing total employee count and custom tooltips
 */
export const ContractTypePieChart: React.FC<BusinessAppContextProps> = ({ accessToken }) => {
  const { token } = theme.useToken()
  const [activeIndex, setActiveIndex] = React.useState<number>(-1)

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

  // Standard Ant Design colors to match the chart's default color palette
  const COLORS = [
    '#1890FF',
    '#2FC25B',
    '#FACC14',
    '#223273',
    '#8543E0',
    '#13C2C2',
    '#3436C7',
    '#F04864',
    '#D0021B',
    '#5B8FF9',
    '#5AD8A6',
    '#5D7092',
    '#F6BD16',
    '#E8684A',
    '#6DC8EC',
    '#9270CA',
    '#FF9D4D',
    '#269A99'
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
          {value.toLocaleString()} employees
        </text>
        <text x={cx} y={cy + 35} textAnchor="middle" fill={token.colorPrimary} fontSize={16} fontWeight="600">
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
      title={
        <div>
          <Title level={4} style={{ margin: 0 }}>
            {getTranslationFromI18nKeyAndLabel('hr_analytics_contract_types', 'Contract Types')}
          </Title>
          <Tooltip
            title={getTranslationFromI18nKeyAndLabel(
              'hr_analytics_contract_types_tooltip',
              'Distribution of employees by contract types such as permanent, fixed-term, etc.'
            )}
          >
            <InfoCircleOutlined className="gba:ml-2" />
          </Tooltip>
        </div>
      }
      className="gba:shadow-lg gba:rounded-lg gba:mb-6 gba:overflow-hidden gba:border-0"
      style={{ background: 'linear-gradient(to bottom, #ffffff, #f0f2f5)' }}
      data-testid="contract-type-pie-chart"
    >
      <div
        className="gba:flex gba:flex-col gba:w-full gba:transition-all gba:duration-500"
        style={{
          width: '100%',
          position: 'relative',
          margin: '0',
          borderRadius: '12px',
          padding: '30px 20px',
          backgroundColor: '#ffffff',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e8e8e8'
        }}
        data-testid="contract-type-pie-chart-container"
      >
        {/* Chart container with fixed height */}
        <div className="gba:h-[400px] gba:w-full" style={{ height: '400px' }}>
          {loading ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Spin size="large" data-testid="contract-type-pie-chart-loading" />
            </div>
          ) : error ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-red-500">
              <div data-testid="contract-type-pie-chart-error">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Empty
                description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
                data-testid="contract-type-pie-chart-empty"
              />
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
                  {/* Custom center label rendered directly */}
                  <text
                    x="50%"
                    y="47%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: '20px', fill: token.colorText, fontWeight: 600 }}
                  >
                    {getTranslationFromI18nKeyAndLabel('hr_analytics_contract_types', 'Contract Types')}
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
            className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200"
            data-testid="contract-type-legend"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px 8px 0'
            }}
          >
            {chartData.map((item, index) => {
              // Standard Ant Design Plots colors to match the chart's default color palette
              const colors = [
                '#1890FF',
                '#2FC25B',
                '#FACC14',
                '#223273',
                '#8543E0',
                '#13C2C2',
                '#3436C7',
                '#F04864',
                '#D0021B',
                '#5B8FF9',
                '#5AD8A6',
                '#5D7092',
                '#F6BD16',
                '#E8684A',
                '#6DC8EC',
                '#9270CA',
                '#FF9D4D',
                '#269A99'
              ]
              const colorIndex = index % colors.length

              return (
                <div
                  key={`legend-${index}`}
                  className="gba:flex gba:items-center gba:mb-3"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '6px 12px',
                    backgroundColor: 'rgba(0,0,0,0.02)',
                    borderRadius: '4px',
                    border: '1px solid rgba(0,0,0,0.05)'
                  }}
                >
                  <div
                    className="gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                    style={{
                      width: '14px',
                      height: '14px',
                      borderRadius: '50%',
                      backgroundColor: colors[colorIndex],
                      marginRight: '10px',
                      boxShadow: '0 0 0 1px rgba(0,0,0,0.1)'
                    }}
                  />
                  <div style={{ fontWeight: 500, fontSize: '16px' }}>
                    <span style={{ marginRight: '8px' }}>{item.name}:</span>
                    <span style={{ fontWeight: 700 }}>
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
