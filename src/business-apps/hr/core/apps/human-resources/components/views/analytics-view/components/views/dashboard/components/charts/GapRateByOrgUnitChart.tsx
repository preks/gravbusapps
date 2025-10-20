import React, { useMemo } from 'react'
import { Card, Typography, Spin, Empty } from 'antd'
import { InfoCircleOutlined } from '@ant-design/icons'
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
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGapRateByOrgUnit } from '../../../../../hooks/useGapRateByOrgUnit'
import { mapValueToColor } from '@/common/utils/chartColorMapper'

const { Title } = Typography

interface GapRateByOrgUnitChartProps {
  accessToken: string
}

/**
 * Bar chart component for displaying gap rate across organizational units
 * Gap Rate = (Vacant Positions / Total Positions) * 100
 */
const GapRateByOrgUnitChart: React.FC<GapRateByOrgUnitChartProps> = ({ accessToken }) => {
  // Use the hook to fetch gap rate data
  const { data, loading, error } = useGapRateByOrgUnit(accessToken)

  // Transform data for the bar chart - limit to top 10 org units with highest gap rates
  const chartData = useMemo(() => {
    const sortedData = [...data].sort((a, b) => b.gapRate - a.gapRate).slice(0, 10)
    return sortedData.map(item => ({
      orgUnit: item.name,
      gapRate: item.gapRate,
      vacantPositions: item.vacantPositions,
      totalPositions: item.totalPositions
    }))
  }, [data])

  // Map gap rate to chart colors - lower rates get lighter colors, higher rates get darker
  const getBarColor = React.useCallback(
    (gapRate: number) => {
      const allRates = chartData.map(item => item.gapRate)
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
      return mapValueToColor(gapRate, allRates, [...chartColors])
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
          <span className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate', 'Gap Rate')}
          </span>
          <span className="gba:text-foreground gba:font-medium">{data.gapRate}%</span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-2">
          <span className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_vacant_positions', 'Vacant Positions')}
          </span>
          <span className="gba:text-foreground gba:font-medium">{data.vacantPositions}</span>
        </div>
        <div className="gba:flex gba:items-center gba:justify-between">
          <span className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_total_positions', 'Total Positions')}
          </span>
          <span className="gba:text-foreground gba:font-medium">{data.totalPositions}</span>
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
        fill="var(--nw-color-foreground)"
        textAnchor="start"
        dominantBaseline="middle"
        fontSize={12}
        fontWeight={500}
        data-testid="gap-rate-bar-label"
      >
        {`${value}%`}
      </text>
    )
  }

  return (
    <Card
      title={
        <div className="gba:flex gba:justify-between gba:items-center">
          <Title level={4} className="gba:m-0">
            {getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate_by_org_unit', 'Gap Rate by Org Unit')}
          </Title>
          <div className="gba:flex gba:items-center">
            <InfoCircleOutlined className="gba:text-base" data-testid="gap-rate-by-org-unit-info-icon" />
          </div>
        </div>
      }
      bordered={false}
      className="gba:h-full"
      data-testid="gap-rate-by-org-unit-chart"
    >
      <div
        className="gba:flex gba:flex-col gba:w-full gba:h-[450px] gba:relative"
        data-testid="gap-rate-by-org-unit-chart-container"
      >
        {/* Chart container with full height */}
        <div className="gba:h-full gba:w-full gba:flex-grow">
          {loading ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Spin size="large" data-testid="gap-rate-by-org-unit-chart-loading" />
            </div>
          ) : error ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center gba:text-destructive">
              <div data-testid="gap-rate-by-org-unit-chart-error">
                {getTranslationFromI18nKeyAndLabel('hr_analytics_error_message', 'Error loading data')}
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="gba:h-full gba:flex gba:items-center gba:justify-center">
              <Empty
                description={getTranslationFromI18nKeyAndLabel('hr_analytics_no_data', 'No data available')}
                data-testid="gap-rate-by-org-unit-chart-empty"
              />
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height="100%"
              className="gba:w-full"
              data-testid="gap-rate-by-org-unit-chart-rendered"
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
                  tick={{ fill: 'var(--nw-color-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--nw-color-border)' }}
                  tickLine={{ stroke: 'var(--nw-color-border)' }}
                  label={{
                    value: getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate_percent', 'Gap Rate (%)'),
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
                  tick={{ fill: 'var(--nw-color-foreground)', fontSize: 12 }}
                  axisLine={{ stroke: 'var(--nw-color-border)' }}
                  tickLine={{ stroke: 'var(--nw-color-border)' }}
                />
                <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'var(--nw-color-muted)' }} />
                <Bar
                  name={getTranslationFromI18nKeyAndLabel('hr_analytics_gap_rate', 'Gap Rate')}
                  dataKey="gapRate"
                  radius={[0, 6, 6, 0]}
                  animationDuration={1200}
                  animationEasing="ease-in-out"
                  isAnimationActive={true}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getBarColor(entry.gapRate)} />
                  ))}
                  <LabelList dataKey="gapRate" position="right" content={renderCustomBarLabel} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Display footnote about showing only top 10 */}
        {!loading && !error && data.length > 10 && (
          <div
            className="gba:text-center gba:text-sm gba:text-muted-foreground gba:pb-4 gba:px-6"
            data-testid="gap-rate-chart-footnote"
          >
            {getTranslationFromI18nKeyAndLabel(
              'hr_analytics_top_org_units_note',
              `Showing top 10 organizational units with highest gap rates out of ${data.length} total`
            )}
          </div>
        )}
      </div>
    </Card>
  )
}

export default GapRateByOrgUnitChart
