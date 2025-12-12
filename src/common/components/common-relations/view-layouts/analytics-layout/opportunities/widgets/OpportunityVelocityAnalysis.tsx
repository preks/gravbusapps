import React from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
  Badge,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { LineChart, Line, XAxis, YAxis } from 'recharts'
import { ClockCircleOutlined, RiseOutlined, TrophyOutlined } from '@ant-design/icons'
import { TrendUpIcon } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'

export interface OpportunityVelocityData {
  averageDaysInPipeline: number
  velocityTrend: { month: string; averageDays: number; opportunityCount: number; conversionRate: number }[]
  quickWins: {
    id: string
    title: string
    value: number
    closeDate: string
    daysSinceClosed: number
    isWon: boolean
    currencyCode: string
  }[]
  slowMovers: {
    id: string
    title: string
    value: number
    createdAt: string
    daysSinceCreated: number
    currencyCode: string
  }[]
}

interface OpportunityVelocityAnalysisProps {
  data: OpportunityVelocityData
  moduleColor?: string
}

export const OpportunityVelocityAnalysis: React.FC<OpportunityVelocityAnalysisProps> = ({
  data,
  moduleColor = 'default'
}) => {
  const chartConfig = {
    opportunityCount: {
      label: 'Opportunities Created'
    },
    conversionRate: {
      label: 'High Win Chance (%)'
    }
  } satisfies ChartConfig

  // Helper function to format currency
  const formatCurrency = (value: number, currencyCode: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      notation: 'standard',
      maximumFractionDigits: 0
    }).format(value)
  }

  // Helper function to navigate to opportunity record
  const handleOpportunityClick = (opportunityId: string) => {
    const url = buildPlatformUrl('/platform/crm/opportunity-record', { opportunityId })
    navigateTo(url)
  }

  return (
    <Card data-testid="opportunity-velocity-analysis">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={TrendUpIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>Opportunity Velocity Analysis</CardTitle>
          <CardDescription>Pipeline flow and opportunity progression (Last 6 months)</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="gba:grid gba:grid-cols-1 md:gba:grid-cols-2 gba:gap-4 gba:mb-6">
          <div className="gba:bg-blue-50 gba:p-4 gba:rounded-lg" data-testid="avg-pipeline-days">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <ClockCircleOutlined className="gba:text-blue-600" />
              <span className="gba:text-sm gba:font-medium gba:text-blue-600">Avg. Pipeline Days</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-blue-900">{data.averageDaysInPipeline}</div>
            <div className="gba:text-xs gba:text-blue-600 gba:mt-1">Last 6 months</div>
          </div>
          <div className="gba:bg-purple-50 gba:p-4 gba:rounded-lg" data-testid="velocity-trend">
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
              <RiseOutlined className="gba:text-purple-600" />
              <span className="gba:text-sm gba:font-medium gba:text-purple-600">Velocity Trend</span>
            </div>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-900">
              {(() => {
                if (data.velocityTrend.length <= 1) return '→'
                const lastCount = data.velocityTrend[data.velocityTrend.length - 1].opportunityCount
                const prevCount = data.velocityTrend[data.velocityTrend.length - 2].opportunityCount
                return lastCount > prevCount ? '↗️' : '↘️'
              })()}
            </div>
            <div className="gba:text-xs gba:text-purple-600 gba:mt-1">Monthly opportunity creation trend</div>
          </div>
        </div>

        <div className="gba:h-80 gba:mb-6">
          <ChartContainer config={chartConfig} className="gba:w-full gba:h-full">
            <LineChart data={data.velocityTrend}>
              <XAxis dataKey="month" />
              <YAxis />
              <ChartTooltip content={<ChartTooltipContent labelKey="month" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Line type="monotone" dataKey="opportunityCount" stroke="var(--color-opportunityCount)" strokeWidth={3} />
              <Line type="monotone" dataKey="conversionRate" stroke="var(--color-conversionRate)" strokeWidth={2} />
            </LineChart>
          </ChartContainer>
        </div>

        <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6 gba:mt-6">
          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
              <TrophyOutlined className="gba:text-green-600" />
              <h4 className="gba:text-lg gba:font-semibold gba:text-green-800">Recent Wins</h4>
              <Badge variant="secondary" className="gba:ml-2">
                {data.quickWins.length}
              </Badge>
            </div>
            <div className="gba:space-y-3">
              {data.quickWins.length > 0 ? (
                data.quickWins.map(win => (
                  <button
                    key={win.id}
                    type="button"
                    className="gba:p-3 gba:bg-green-50 gba:border gba:border-green-200 gba:rounded-lg gba:cursor-pointer gba:hover:bg-green-100 gba:transition-colors gba:text-left gba:w-full"
                    data-testid={`recent-win-${win.id}`}
                    onClick={() => handleOpportunityClick(win.id)}
                  >
                    <div className="gba:flex gba:justify-between gba:items-start">
                      <div className="gba:flex-1">
                        <h5 className="gba:font-medium gba:text-green-900 gba:text-sm gba:truncate gba:hover:underline">
                          {win.title}
                        </h5>
                        <p className="gba:text-xs gba:text-green-600 gba:mt-1">Closed {win.daysSinceClosed} days ago</p>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:text-sm gba:font-semibold gba:text-green-800">
                          {formatCurrency(win.value, win.currencyCode)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="gba:text-center gba:py-8 gba:text-gray-500">
                  <p className="gba:text-sm">No recent wins found</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
              <ClockCircleOutlined className="gba:text-orange-600" />
              <h4 className="gba:text-lg gba:font-semibold gba:text-orange-800">Oldest Open</h4>
              <Badge variant="secondary" className="gba:ml-2">
                {data.slowMovers.length}
              </Badge>
            </div>
            <div className="gba:space-y-3">
              {data.slowMovers.length > 0 ? (
                data.slowMovers.map(mover => (
                  <button
                    key={mover.id}
                    type="button"
                    className="gba:p-3 gba:bg-orange-50 gba:border gba:border-orange-200 gba:rounded-lg gba:cursor-pointer gba:hover:bg-orange-100 gba:transition-colors gba:text-left gba:w-full"
                    data-testid={`slow-mover-${mover.id}`}
                    onClick={() => handleOpportunityClick(mover.id)}
                  >
                    <div className="gba:flex gba:justify-between gba:items-start">
                      <div className="gba:flex-1">
                        <h5 className="gba:font-medium gba:text-orange-900 gba:text-sm gba:truncate gba:hover:underline">
                          {mover.title}
                        </h5>
                        <p className="gba:text-xs gba:text-orange-600 gba:mt-1">
                          Open for {mover.daysSinceCreated} days
                        </p>
                      </div>
                      <div className="gba:text-right">
                        <div className="gba:text-sm gba:font-semibold gba:text-orange-800">
                          {formatCurrency(mover.value, mover.currencyCode)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              ) : (
                <div className="gba:text-center gba:py-8 gba:text-gray-500">
                  <p className="gba:text-sm">No open opportunities found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default OpportunityVelocityAnalysis
