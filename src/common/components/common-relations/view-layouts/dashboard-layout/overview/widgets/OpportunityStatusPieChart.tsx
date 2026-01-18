import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
  Spinner
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { OpportunityStatusDataItem } from '../../hooks/useOpportunityStatusData'

interface OpportunityStatusPieChartProps {
  data: OpportunityStatusDataItem[]
  totalCount: number
  openComparison?: {
    beforeCurrentQuarter: number
    currentQuarter: number
  }
  isLoading?: boolean
  error?: string | null
}

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

/**
 * Pie chart widget for displaying opportunity distribution by status
 * Shows data for the current quarter
 * Matches the style and colors of the analytics Leads by Source chart
 */
export const OpportunityStatusPieChart: React.FC<OpportunityStatusPieChartProps> = ({
  data,
  totalCount,
  openComparison = { beforeCurrentQuarter: 0, currentQuarter: 0 },
  isLoading = false,
  error = null
}) => {
  const dataKey = 'opportunities'
  const nameKey = 'status'

  // Calculate current quarter dynamically
  const currentQuarterInfo = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth() // 0-11
    const currentYear = now.getFullYear()
    const quarter = Math.floor(currentMonth / 3) + 1 // 1, 2, 3, or 4
    return {
      quarter,
      year: currentYear,
      label: `Q${quarter} ${currentYear}`
    }
  }, [])

  const chartData = useMemo(() => {
    if (!data || data.length === 0) return []
    return data.map(item => {
      const key = toKey(item.status)
      return {
        [nameKey]: key,
        [dataKey]: item.count,
        fill: `var(--color-${key})`
      } as Record<string, string | number>
    })
  }, [data])

  const chartConfig = useMemo(() => {
    if (!data || data.length === 0) return {} as ChartConfig
    const config: Record<string, { label?: string }> = {}
    data.forEach(item => {
      const key = toKey(item.status)
      config[key] = { label: item.status }
    })
    return config as ChartConfig
  }, [data])

  if (isLoading) {
    return (
      <Card data-testid="opportunities-by-status-chart" className="gba:flex gba:flex-col gba:h-full">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <div>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'opportunityStatus.title',
                'Opportunities by Status - Current Quarter'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel('opportunityStatus.description', 'Distribution by status')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="gba:flex-1 gba:pb-0">
          <div className="gba:flex gba:justify-center gba:items-center gba:py-12">
            <Spinner size="lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card data-testid="opportunities-by-status-chart" className="gba:flex gba:flex-col gba:h-full">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <div>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'opportunityStatus.title',
                'Opportunities by Status - Current Quarter'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel('opportunityStatus.description', 'Distribution by status')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="gba:flex-1 gba:pb-0">
          <div className="gba:text-sm gba:text-destructive gba:py-8">{error}</div>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.length === 0) {
    return (
      <Card data-testid="opportunities-by-status-chart" className="gba:flex gba:flex-col gba:h-full">
        <CardHeader className="gba:flex gba:items-center gba:gap-3">
          <div>
            <CardTitle>
              {getTranslationFromI18nKeyAndLabel(
                'opportunityStatus.title',
                'Opportunities by Status - Current Quarter'
              )}
            </CardTitle>
            <CardDescription>
              {getTranslationFromI18nKeyAndLabel('opportunityStatus.description', 'Distribution by status')}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="gba:flex-1 gba:pb-0">
          <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-8">
            {getTranslationFromI18nKeyAndLabel(
              'opportunityStatus.noData',
              'No opportunities found for the current quarter'
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid="opportunities-by-status-chart" className="gba:flex gba:flex-col gba:h-full">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <div>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('opportunityStatus.title', 'Opportunities by Status - Current Quarter')}
          </CardTitle>
          <CardDescription>
            {getTranslationFromI18nKeyAndLabel(
              totalCount === 1 ? 'opportunityStatus.totalSingular' : 'opportunityStatus.totalPlural',
              totalCount === 1 ? `Total: ${totalCount} opportunity` : `Total: ${totalCount} opportunities`
            )}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:pb-4 gba:space-y-6">
        <ChartContainer
          config={chartConfig}
          className="[&_.recharts-pie-label-text]:fill-foreground gba:mx-auto gba:aspect-square gba:max-h-[300px] gba:pb-0"
        >
          <PieChart>
            <Pie data={chartData} cx="50%" cy="40%" outerRadius={75} dataKey={dataKey} nameKey={nameKey} />
            <ChartTooltip content={<ChartTooltipContent hideLabel labelKey={dataKey} nameKey={nameKey} />} />
            <ChartLegend
              content={
                <ChartLegendContent className="gba:-translate-y-2 gba:flex-wrap gba:gap-2 gba:*:basis-1/4 gba:*:justify-center" />
              }
            />
          </PieChart>
        </ChartContainer>

        {/* Open Opportunities Comparison with Trend - Fancy Style */}
        {(() => {
          const currentCount = openComparison.currentQuarter
          const previousCount = openComparison.beforeCurrentQuarter
          const hasData = currentCount > 0 || previousCount > 0

          // Calculate trend
          let trendPercentage = 0
          let trendDirection: 'up' | 'down' | 'neutral' = 'neutral'

          if (previousCount > 0) {
            trendPercentage = ((currentCount - previousCount) / previousCount) * 100
            if (trendPercentage > 0) trendDirection = 'up'
            else if (trendPercentage < 0) trendDirection = 'down'
          } else if (currentCount > 0) {
            trendPercentage = 100
            trendDirection = 'up'
          }

          // Determine trend icon based on direction
          let TrendIcon = Minus
          if (trendDirection === 'up') {
            TrendIcon = TrendingUp
          } else if (trendDirection === 'down') {
            TrendIcon = TrendingDown
          }

          // Determine trend color based on direction
          let trendColor = 'gba:text-muted-foreground'
          if (trendDirection === 'up') {
            trendColor = 'gba:text-success'
          } else if (trendDirection === 'down') {
            trendColor = 'gba:text-destructive'
          }

          // Determine trend background color based on direction
          let trendBgColor = 'gba:bg-muted gba:border-border'
          if (trendDirection === 'up') {
            trendBgColor = 'gba:bg-success/10 gba:border-success/20'
          } else if (trendDirection === 'down') {
            trendBgColor = 'gba:bg-destructive/10 gba:border-destructive/20'
          }

          return (
            <div className="gba:pt-6 gba:border-t gba:border-border">
              {/* Header with Icon */}
              <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
                <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary/10">
                  <TrendingUp className="gba:w-4 gba:h-4 gba:text-primary" />
                </div>
                <div className="gba:text-sm gba:font-semibold gba:text-foreground">
                  {getTranslationFromI18nKeyAndLabel('opportunityStatus.comparison', 'Open Opportunities Comparison')}
                </div>
              </div>

              <div className="gba:grid gba:grid-cols-2 gba:gap-3">
                {/* Before Current Quarter - Elevated Card */}
                <div className="gba:relative gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-4 gba:shadow-sm gba:transition-all hover:gba:shadow-md">
                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                        {getTranslationFromI18nKeyAndLabel('opportunityStatus.previous', 'Previous')}
                      </div>
                      <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-muted-foreground/40" />
                    </div>
                    <div className="gba:text-4xl gba:font-bold gba:text-foreground gba:tabular-nums">
                      {previousCount}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel(
                        'opportunityStatus.beforeQuarter',
                        `Before ${currentQuarterInfo.label}`
                      )}
                    </div>
                  </div>
                </div>

                {/* Current Quarter with Trend - Highlighted Card */}
                <div className="gba:relative gba:rounded-lg gba:border gba:border-primary/20 gba:bg-primary/5 gba:p-4 gba:shadow-sm gba:transition-all hover:gba:shadow-md hover:gba:border-primary/30">
                  <div className="gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:justify-between">
                      <div className="gba:text-xs gba:font-medium gba:text-primary gba:uppercase gba:tracking-wider">
                        {getTranslationFromI18nKeyAndLabel('opportunityStatus.current', 'Current')}
                      </div>
                      <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:animate-pulse" />
                    </div>
                    <div className="gba:flex gba:items-baseline gba:gap-2">
                      <div className="gba:text-4xl gba:font-bold gba:text-foreground gba:tabular-nums">
                        {currentCount}
                      </div>
                      {hasData && Math.abs(trendPercentage) > 0 && (
                        <div
                          className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:border ${trendBgColor} ${trendColor} gba:text-xs gba:font-semibold`}
                        >
                          <TrendIcon className="gba:w-3 gba:h-3" />
                          <span className="gba:tabular-nums">
                            {trendPercentage > 0 ? '+' : ''}
                            {trendPercentage.toFixed(1)}%
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {getTranslationFromI18nKeyAndLabel('opportunityStatus.currentQuarter', currentQuarterInfo.label)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })()}
      </CardContent>
    </Card>
  )
}
