import React, { useMemo } from 'react'
import { Card, Typography, Spin, Empty, theme } from 'antd'
import { InfoIcon } from '@phosphor-icons/react'
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
import { useTranslation } from '@newwork/nw-design-system'
import { useProbationRateByOrgUnit } from '../../../../../hooks/useProbationRateByOrgUnit'
import { BusinessAppContextProps } from '@/business-apps/types'
import { mapValueToColor } from '@/common/utils/chartColorMapper'
import hrTranslations from '@/business-apps/hr/core/apps/human-resources/_i18n'

const { Title } = Typography

type ProbationRateByOrgUnitChartProps = BusinessAppContextProps

/**
 * Bar chart component for displaying probation rate across organizational units
 * Probation Rate = (Employees in probation / Total Employees) * 100
 */
const ProbationRateByOrgUnitChart: React.FC<ProbationRateByOrgUnitChartProps> = ({ accessToken }) => {
  // Use the hook to fetch probation rate data
  const { data, loading, error } = useProbationRateByOrgUnit(accessToken)
  const { token } = theme.useToken()
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

  // Map probation rate to chart colors - lower rates get lighter colors, higher rates get darker
  const getBarColor = React.useCallback(
    (probationRate: number) => {
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

  // Function to format X axis labels to prevent long names
  const formatXAxis = (value: string) => {
    return value.length > 20 ? `${value.substring(0, 20)}...` : value
  }

  // Custom label for the bars - positioned to the right of each bar
  const renderCustomBarLabel = (props: any) => {
    const { x, y, width, value, height } = props
    const labelOffset = 5 // Space between bar end and label

    return (
      <text
        x={x + width + labelOffset}
        y={y + height / 2}
        fill={token.colorText}
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight={500}
        data-testid="probation-rate-bar-label"
      >
        {`${value}%`}
      </text>
    )
  }

  return (
    <Card
      title={
        <div className="gba:flex gba:justify-between gba:items-center">
          <Title level={4} style={{ margin: 0 }}>
            {t('hr-analytics-probation-rate-by-org-unit')}
          </Title>
          <div className="gba:flex gba:items-center">
            <InfoIcon
              size={16}
              className="gba:text-muted-foreground"
              data-testid="probation-rate-by-org-unit-info-icon"
            />
          </div>
        </div>
      }
      bordered={false}
      style={{ height: '100%' }}
      data-testid="probation-rate-by-org-unit-chart"
    >
      <div
        className="gba:h-full gba:flex gba:flex-col gba:w-full"
        style={{
          height: '450px',
          position: 'relative'
        }}
        data-testid="probation-rate-by-org-unit-chart-container"
      >
        <div className="gba:h-full gba:w-full gba:flex-grow">
          {loading ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Spin size="large" data-testid="probation-rate-by-org-unit-chart-loading" />
            </div>
          ) : error ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-destructive">
              <div data-testid="probation-rate-by-org-unit-chart-error">
                {t('hr-analytics-error-message')}
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Empty description={t('hr-analytics-no-data')} data-testid="probation-rate-by-org-unit-chart-empty" />
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
              className="gba:w-full"
              data-testid="probation-rate-by-org-unit-chart-rendered"
            >
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
                  animationEasing="ease-in-out"
                  isAnimationActive={true}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.probationRate)} />
                  ))}
                  <LabelList dataKey="probationRate" position="right" content={renderCustomBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
        {/* Display footnote about showing only top 10 */}
        {!loading && !error && data.length > 10 && (
          <div
            className="gba:text-center gba:text-sm gba:text-muted-foreground gba:pb-4 gba:px-6"
            data-testid="probation-rate-chart-footnote"
          >
            {t('hr-analytics-top-org-units-note', { total: data.length })}
          </div>
        )}
      </div>
    </Card>
  )
}

export default ProbationRateByOrgUnitChart
