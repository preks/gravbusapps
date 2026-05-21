import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Spinner
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import { TrendUpIcon } from '@phosphor-icons/react'
import type { GrowthMetric } from '../../hooks/useAccountGrowthDrillDownState'

export interface MonthlyGrowthPoint {
  month: string
  date: string
  accountsCreated: number
  accountsWithOpportunities: number
}

export interface TopAccountData {
  id: string
  name: string
  industry: string
  totalValue: number
  wonOpportunities?: number
}

export interface AccountGrowthAnalysisProps {
  data: {
    monthlyGrowthTrend: MonthlyGrowthPoint[]
  }
  isLoading?: boolean
  moduleColor?: string
  onBarClick?: (month: string, date: string, metric: GrowthMetric) => void
}

const METRIC_LABELS: Record<GrowthMetric, string> = {
  accountsCreated: 'New Accounts',
  accountsWithOpportunities: 'Accounts with Opportunities'
}

const CHART_CONFIG: ChartConfig = {
  accountsCreated: { label: METRIC_LABELS.accountsCreated },
  accountsWithOpportunities: { label: METRIC_LABELS.accountsWithOpportunities }
}

const formatTooltipValue = (value: any, name: any): [string, string] => {
  const key = typeof name === 'string' ? name : ''
  const label = METRIC_LABELS[key as GrowthMetric] ?? key
  return [`${value} ${label}`, '']
}

const formatTooltipLabel = (label: any) => `Month: ${label}`

const renderClickableBackground = (
  metric: GrowthMetric,
  onBarClick: NonNullable<AccountGrowthAnalysisProps['onBarClick']>
) =>
  function ClickableBackground(props: any) {
    return (
      <rect
        x={props.x}
        y={props.y}
        width={props.width}
        height={props.height}
        fill="transparent"
        style={{ cursor: 'pointer' }}
        onClick={() => onBarClick(props.payload.month, props.payload.date, metric)}
      />
    )
  }

interface GrowthBarProps {
  metric: GrowthMetric
  onBarClick?: AccountGrowthAnalysisProps['onBarClick']
}

const GrowthBar: React.FC<GrowthBarProps> = ({ metric, onBarClick }) => {
  const background = onBarClick ? renderClickableBackground(metric, onBarClick) : false
  const handleBarClick = onBarClick ? (item: any) => onBarClick(item.month, item.date, metric) : undefined

  return (
    <Bar
      dataKey={metric}
      fill={`var(--color-${metric})`}
      style={onBarClick ? { cursor: 'pointer' } : undefined}
      background={background}
      onClick={handleBarClick}
    />
  )
}

export const AccountGrowthAnalysis: React.FC<AccountGrowthAnalysisProps> = ({
  data,
  isLoading = false,
  moduleColor = 'default',
  onBarClick
}) => {
  const growthTrendData = data?.monthlyGrowthTrend || []

  return (
    <Card data-testid="account-growth-analysis">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>Account Growth Analysis</CardTitle>
          <CardDescription>Account performance and growth metrics</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div
            className="gba:flex gba:justify-center gba:items-center gba:h-[300px]"
            data-testid="account-growth-analysis-loading"
          >
            <Spinner size="lg" />
          </div>
        )}
        {!isLoading && growthTrendData.length === 0 && (
          <div className="gba:text-center gba:text-gray-500 gba:py-4">
            <p className="gba:text-sm">No growth trend data available</p>
          </div>
        )}
        {!isLoading && growthTrendData.length > 0 && (
          <div className="gba:h-56">
            <h4 className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">Recent Growth Trend (Monthly)</h4>
            <ChartContainer
              config={CHART_CONFIG}
              className={`gba:w-full gba:h-full ${onBarClick ? 'gba:cursor-pointer' : ''}`}
            >
              <BarChart
                data={growthTrendData}
                maxBarSize={30}
                barCategoryGap="25%"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis dataKey="month" tick={{ fontSize: 10 }} height={40} />
                <YAxis tick={{ fontSize: 10 }} />
                <ChartTooltip
                  content={<ChartTooltipContent formatter={formatTooltipValue} labelFormatter={formatTooltipLabel} />}
                />
                <GrowthBar metric="accountsCreated" onBarClick={onBarClick} />
                <GrowthBar metric="accountsWithOpportunities" onBarClick={onBarClick} />
                <ChartLegend content={<ChartLegendContent />} />
              </BarChart>
            </ChartContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AccountGrowthAnalysis
