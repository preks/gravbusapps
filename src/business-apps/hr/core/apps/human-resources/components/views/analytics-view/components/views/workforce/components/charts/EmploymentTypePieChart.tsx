import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Sector } from 'recharts'
import { Card, Spinner, Alert, Badge } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
  const prefixDataTestId = 'EmploymentTypePieChart'

  // Transform data for the pie chart
  const chartData = React.useMemo(() => {
    return data.map(item => ({
      name: item.name,
      value: item.count,
      percentage: item.percentage,
      displayValue: `${item.count.toLocaleString()} (${item.percentage}%)`
    }))
  }, [data])

  // Standard colors for consistent presentation
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
        <text x={cx} y={cy - 20} textAnchor="middle" fill="#374151" fontSize={20} fontWeight="600">
          {payload.name}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#6B7280" fontSize={16}>
          {value.toLocaleString()} employees
        </text>
        <text x={cx} y={cy + 35} textAnchor="middle" fill="#1890FF" fontSize={16} fontWeight="600">
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

  if (loading) {
    return (
      <Card className="gba:w-full gba:p-6 gba:shadow-sm" data-testid={`${prefixDataTestId}-loading`}>
        <div className="gba:mb-4">
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_employment_type', 'Employment Type')}
          </h3>
          <p className="gba:text-gray-600 gba:text-sm gba:mt-1">
            Distribution of employees by employment types such as internal, external, full-time, part-time, etc.
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
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_employment_type', 'Employment Type')}
          </h3>
          <p className="gba:text-gray-600 gba:text-sm gba:mt-1">
            Distribution of employees by employment types such as internal, external, full-time, part-time, etc.
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
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_employment_type', 'Employment Type')}
          </h3>
          <Badge variant="outline" className="gba:text-xs">
            {data.length} types
          </Badge>
        </div>
        <p className="gba:text-gray-600 gba:text-sm">
          Distribution of employees by employment types such as internal, external, full-time, part-time, etc.
        </p>
      </div>

      {data.length === 0 ? (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-96 gba:text-gray-500">
          {getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
        </div>
      ) : (
        <>
          {/* Chart container */}
          <div className="gba:h-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart data-testid={`${prefixDataTestId}-rendered`}>
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
                >
                  {chartData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#ffffff" strokeWidth={2} />
                  ))}
                  {/* Custom center label */}
                  <text
                    x="50%"
                    y="47%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: '20px', fill: '#374151', fontWeight: 600 }}
                  >
                    {getTranslationFromI18nKeyAndLabel('hr_analytics_total_employees', 'Total Employees')}
                  </text>
                  <text
                    x="50%"
                    y="57%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    style={{ fontSize: '28px', fontWeight: 'bold', fill: '#111827' }}
                  >
                    {totalEmployees.toLocaleString()}
                  </text>
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Legend */}
          <div
            className="gba:mt-6 gba:pt-4 gba:border-t gba:border-gray-200"
            data-testid={`${prefixDataTestId}-legend`}
          >
            <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-3">
              {chartData.map((item, index) => (
                <div
                  key={`legend-${index}`}
                  className="gba:flex gba:items-center gba:px-3 gba:py-2 gba:bg-gray-50 gba:rounded gba:border gba:border-gray-100"
                >
                  <div
                    className="gba:w-3 gba:h-3 gba:rounded-full gba:mr-2"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="gba:text-sm gba:font-medium gba:text-gray-700">
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

export default EmploymentTypePieChart
