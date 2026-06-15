import React, { useMemo } from 'react'
import { Card, Spinner, useTranslation } from '@newwork/nw-design-system'
import { InfoIcon, TrendUpIcon, UsersIcon } from '@phosphor-icons/react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList
} from 'recharts'
import { OrganizationalUnitSalary } from '../../../../../hooks/useSalaryByOrgUnit'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

interface SalaryByOrgUnitChartProps {
  data: OrganizationalUnitSalary[]
  loading?: boolean
  error?: Error | null
}

/**
 * Enhanced bar chart component to display average salary by organizational unit
 * Shows bars sorted by average salary in descending order with improved UI
 */
const SalaryByOrgUnitChart: React.FC<SalaryByOrgUnitChartProps> = ({ data, loading = false, error = null }) => {
  const { t } = useTranslation(hrTranslations)
  // Transform data for the bar chart
  const chartData = useMemo(() => {
    // Add validation to prevent rendering issues
    const validData = data.filter(
      item =>
        typeof item.name === 'string' && typeof item.averageSalary === 'number' && !Number.isNaN(item.averageSalary)
    )

    // Sort by average salary in descending order and limit to top 10
    const sortedData = [...validData].sort((a, b) => b.averageSalary - a.averageSalary).slice(0, 10)

    // Return properly formatted data for display
    return sortedData.map(item => ({
      orgUnit: item.name, // This will be shown on the Y-axis
      salary: item.averageSalary,
      count: item.employeeCount,
      // Format for display
      formattedSalary: `$${item.averageSalary.toLocaleString()}`
    }))
  }, [data])

  // Calculate statistics for the summary cards
  const totalEmployees = useMemo(() => {
    return data.reduce((total, item) => total + item.employeeCount, 0)
  }, [data])

  const highestSalary = useMemo(() => {
    if (data.length === 0) return 0
    return Math.max(...data.map(item => item.averageSalary))
  }, [data])

  // Prepare colors for the bars based on values using design system chart tokens
  const getBarColor = (salary: number) => {
    const chartColors = ['var(--nw-chart-1)', 'var(--nw-chart-3)', 'var(--nw-chart-5)', 'var(--nw-chart-7)']

    const max = Math.max(...chartData.map(d => d.salary))
    const min = Math.min(...chartData.map(d => d.salary))
    const percent = (salary - min) / (max - min || 1) // Avoid division by zero
    const colorIndex = Math.floor(percent * (chartColors.length - 1))

    return chartColors[colorIndex] || chartColors[0]
  }

  // Custom tooltip formatter for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) {
      return null
    }

    const data = payload[0].payload as any
    const percentOfTotal = Math.round((data.count / totalEmployees) * 100)

    return (
      <div className="gba:p-4 gba:bg-card gba:rounded-lg gba:shadow-lg gba:border-border">
        <p className="gba:text-lg gba:font-semibold gba:border-b gba:border-border gba:pb-2 gba:mb-3 gba:text-foreground">
          {label}
        </p>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <span className="gba:text-muted-foreground">{t('hr-analytics-average-salary')}</span>
          <span className="gba:text-foreground gba:font-medium">${data.salary.toLocaleString()}</span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <span className="gba:text-muted-foreground">{t('hr-analytics-employee-count')}</span>
          <span className="gba:text-foreground gba:font-medium">{data.count}</span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-muted-foreground">{t('hr-analytics-percentage')}</span>
          <span className="gba:text-foreground gba:font-medium">{percentOfTotal}%</span>
        </div>
      </div>
    )
  }

  // Function to format tick values on Y axis
  const formatYAxis = (value: number) => {
    return `$${value.toLocaleString()}`
  }

  // Function to format X axis labels to prevent long names
  const formatXAxis = (value: string) => {
    return value.length > 15 ? `${value.substring(0, 12)}...` : value
  }

  // Custom label for the bars
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value } = props
    return (
      <text
        key={`label-${x}-${y}`}
        x={x + width + 10}
        y={y + 9}
        fill="var(--nw-muted-foreground)"
        textAnchor="start"
        fontSize={13}
        fontWeight={600}
        className="gba:drop-shadow-sm"
      >
        ${value.toLocaleString()}
      </text>
    )
  }

  let chartStateContent: React.ReactNode
  if (loading) {
    chartStateContent = (
      <div className="gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-muted gba:rounded-lg gba:border">
        <Spinner data-testid="salary-by-org-unit-chart-loading" />
        <span className="gba:text-muted-foreground gba:mt-4">{t('hr-analytics-loading-data')}</span>
      </div>
    )
  } else if (error) {
    chartStateContent = (
      <div className="gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-muted gba:rounded-lg gba:p-6 gba:border-destructive">
        <div className="gba:flex gba:items-center gba:justify-center gba:bg-destructive-secondary gba:w-12 gba:h-12 gba:rounded-full gba:mb-4">
          <svg
            className="gba:w-6 gba:h-6 gba:text-destructive"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
        <div
          className="gba:text-destructive gba:text-lg gba:font-medium gba:mb-2 gba:text-center"
          data-testid="salary-by-org-unit-chart-error"
        >
          {t('hr-analytics-error-message')}
        </div>
        <span
          className="gba:text-muted-foreground gba:text-center gba:max-w-md"
          data-testid="salary-by-org-unit-chart-error-details"
        >
          {error.message}
        </span>
      </div>
    )
  } else if (data.length === 0) {
    chartStateContent = (
      <div className="gba:h-full gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-muted gba:rounded-lg gba:border">
        <div className="gba:flex gba:flex-col gba:items-center" data-testid="salary-by-org-unit-chart-empty">
          <span className="gba:text-muted-foreground gba:font-medium">{t('hr-analytics-no-data')}</span>
          <span className="gba:text-muted-foreground gba:text-sm gba:mt-1">
            {t('hr-analytics-no-data-description')}
          </span>
        </div>
      </div>
    )
  } else if (chartData.length > 0) {
    chartStateContent = (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 20, right: 20, left: 20, bottom: 20 }}
          barSize={20}
          barGap={2}
          data-testid="salary-by-org-unit-chart-rendered"
          className="gba:animate-fade-in"
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nw-border)" />
          <XAxis
            type="number"
            tickFormatter={formatYAxis}
            tick={{ fill: 'var(--nw-foreground)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--nw-border)' }}
            tickLine={{ stroke: 'var(--nw-border)' }}
            label={{
              value: t('hr-analytics-annual-salary'),
              position: 'insideBottom',
              offset: -10,
              style: {
                textAnchor: 'middle',
                fill: 'var(--nw-muted-foreground)',
                fontSize: 12,
                fontWeight: 500
              }
            }}
          />
          <YAxis
            dataKey="orgUnit"
            type="category"
            width={120}
            tickFormatter={formatXAxis}
            tick={{ fill: 'var(--nw-foreground)', fontSize: 12 }}
            axisLine={{ stroke: 'var(--nw-border)' }}
            tickLine={{ stroke: 'var(--nw-border)' }}
          />
          <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0, 0, 0, 0.05)' }} />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            wrapperStyle={{
              paddingBottom: 20
            }}
          />
          <Bar
            name={t('hr-analytics-average-salary')}
            dataKey="salary"
            radius={[0, 6, 6, 0]}
            animationDuration={1200}
            animationEasing="ease-in-out"
            isAnimationActive={true}
          >
            {chartData.map(entry => (
              <Cell
                key={`cell-${entry.orgUnit}`}
                fill={getBarColor(entry.salary)}
                stroke="var(--nw-border)"
                strokeWidth={1}
              />
            ))}
            <LabelList dataKey="salary" position="top" content={renderCustomBarLabel} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    )
  } else {
    chartStateContent = (
      <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:bg-muted gba:rounded-lg gba:p-6 gba:border">
        <span className="gba:text-muted-foreground">{t('hr-analytics-no-data')}</span>
      </div>
    )
  }

  return (
    <Card
      className="gba:shadow-lg gba:rounded-xl gba:mt-4 gba:mb-6 gba:overflow-hidden gba:border-border gba:transition-all gba:duration-300 hover:gba:shadow-xl"
      data-testid="salary-by-org-unit-chart"
    >
      {/* Header */}
      <div className="gba:border-b gba:border-border gba:p-6 gba:bg-card">
        <div className="gba:flex gba:justify-between gba:items-center gba:flex-wrap">
          <div className="gba:flex gba:items-center">
            <h4
              className="gba:m-0 gba:text-lg gba:font-medium gba:text-foreground"
              data-testid="salary-by-org-unit-chart-title"
            >
              {t('hr-analytics-salary-by-org-unit')}
            </h4>
            <span title={t('hr-analytics-salary-by-org-unit-tooltip')}>
              <InfoIcon size={16} className="gba:ml-2 gba:text-muted-foreground" />
            </span>
          </div>
        </div>
      </div>
      {/* Summary statistics cards */}
      <div className="gba:flex gba:justify-between gba:flex-wrap gba:gap-4 gba:p-6 gba:bg-muted">
        <Card
          className="gba:flex-1 gba:min-w-[200px] gba:shadow-sm gba:rounded-lg gba:border-border gba:transition-all gba:duration-300 hover:gba:shadow-md hover:gba:border-primary gba:p-4"
          data-testid="salary-by-org-unit-total-employees"
        >
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <UsersIcon size={16} />
            {t('hr-analytics-total-employees')}
          </div>
          <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-foreground">{totalEmployees}</div>
        </Card>
        <Card
          className="gba:flex-1 gba:min-w-[200px] gba:shadow-sm gba:rounded-lg gba:border-border gba:transition-all gba:duration-300 hover:gba:shadow-md hover:gba:border-primary gba:p-4"
          data-testid="salary-by-org-unit-highest-avg-salary"
        >
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
            <TrendUpIcon size={16} />
            {t('hr-analytics-highest-salary')}
          </div>
          <div className="gba:mt-2 gba:text-2xl gba:font-semibold gba:text-info">
            ${highestSalary.toLocaleString()}
          </div>
        </Card>
      </div>

      {/* Main chart container */}
      <div
        className="gba:flex gba:flex-col gba:w-full gba:transition-all gba:duration-500 gba:pt-4 gba:px-6 gba:pb-8"
        data-testid="salary-by-org-unit-chart-container"
      >
        {/* Chart container with fixed height for vertical bar chart */}
        <div
          className="gba:w-full gba:min-h-[400px] gba:relative gba:overflow-visible gba:h-[500px]"
          data-testid="salary-by-org-unit-chart-height-container"
        >
          {chartStateContent}
        </div>

        {/* Display footnote about showing only top 10 */}
        {!loading && !error && data.length > 10 && (
          <div
            className="gba:text-center gba:text-sm gba:text-muted-foreground gba:pb-4 gba:px-6"
            data-testid="salary-chart-footnote"
          >
            {t('hr-analytics-top-org-units-note', { total: data.length })}
          </div>
        )}
      </div>
    </Card>
  )
}

export default SalaryByOrgUnitChart
