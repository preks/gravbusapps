import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  IconAvatar,
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { getQualityLevelBadgeVariant } from '@/common/utils/badgeUtils'
import { PieChart, Pie } from 'recharts'
import { ChartDonutIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface LeadSourceItem {
  source: string
  value: number
  percentage: number
  color?: string
  // Quality indicators
  qualityLevel?: 'high' | 'medium' | 'low'
  qualityIndicator?: string
  qualityText?: string
  conversionRate?: number
  recentCount?: number
  revenue?: number
}

export interface LeadSourceChartProps {
  items: LeadSourceItem[]
  totalLeads: number
  moduleColor?: string
}

const formatLargeNumber = (value: number | undefined): string => {
  if (value === undefined || value === null) return '0'
  if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)}B`
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`
  return value.toString()
}

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')

// Design system chart colors
const CHART_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)',
  'var(--nw-chart-7)',
  'var(--nw-chart-8)'
]

export const LeadSourceChart: React.FC<LeadSourceChartProps> = ({ items, totalLeads, moduleColor = 'default' }) => {
  const dataKey = 'leads'
  const nameKey = 'source'

  const chartData = useMemo(() => {
    // Track used keys to avoid duplicates
    const usedKeys = new Set<string>()
    return items.map((item, index) => {
      let key = toKey(item.source)
      // If key already exists, append index to make it unique
      if (usedKeys.has(key)) {
        key = `${key}-${index}`
      }
      usedKeys.add(key)
      return {
        [nameKey]: key,
        [dataKey]: item.value,
        fill: CHART_COLORS[index % CHART_COLORS.length],
        originalSource: item.source // Keep original for display
      } as Record<string, string | number>
    })
  }, [items])

  const chartConfig = useMemo(() => {
    const config: Record<string, { label?: string; color?: string }> = {
      [dataKey]: {}
    }
    // Track used keys to avoid duplicates
    const usedKeys = new Set<string>()
    items.forEach((item, index) => {
      let key = toKey(item.source)
      // If key already exists, append index to make it unique
      if (usedKeys.has(key)) {
        key = `${key}-${index}`
      }
      usedKeys.add(key)
      config[key] = { label: item.source, color: CHART_COLORS[index % CHART_COLORS.length] }
    })
    return config as ChartConfig
  }, [items])

  // Calculate flexible height based on number of sources and quality indicators
  const getFlexibleHeight = useMemo(() => {
    const baseChartHeight = 250 // Increased minimum chart height for bigger pie chart
    const qualityIndicatorHeight = items.length * 44 // Each quality indicator row is ~44px

    // For fewer sources, make chart significantly bigger to fill card better
    const chartHeight =
      items.length <= 2
        ? Math.max(baseChartHeight, 350 - qualityIndicatorHeight) // Much larger chart for fewer sources
        : items.length <= 4
          ? Math.max(baseChartHeight, 300 - qualityIndicatorHeight) // Medium-large chart
          : baseChartHeight // Standard chart for many sources

    return Math.max(250, chartHeight) // Never go below 250px (increased from 180px)
  }, [items.length])
  return (
    <Card className="gba:h-full gba:flex gba:flex-col">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        <IconAvatar icon={ChartDonutIcon} variant={moduleColor as any} size="md" decorative={true} />
        <div className="gba:flex-1">
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('leadSources.monthlyOpenLeads', 'Lead Sources - Monthly Open Leads')}
          </CardTitle>
          <CardDescription>
            {getTranslationFromI18nKeyAndLabel('leadSources.distributionBySource', 'Distribution by source')}
          </CardDescription>
        </div>
        <div className="gba:text-center">
          <div className="gba:text-3xl gba:font-bold gba:text-foreground">{formatLargeNumber(totalLeads)}</div>
          <div className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('leadSources.totalLeads', 'Total Leads')}
          </div>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:flex gba:flex-col">
        {items && items.length > 0 ? (
          <div className="gba:space-y-4 gba:flex-1 gba:flex gba:flex-col gba:justify-between">
            {/* Chart with center content */}
            <div className="gba:relative gba:w-full gba:flex gba:justify-center gba:flex-1 gba:items-center">
              <ChartContainer config={chartConfig} className="gba:w-full" style={{ height: `${getFlexibleHeight}px` }}>
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius="80%" dataKey={dataKey} nameKey={nameKey} />
                  <ChartTooltip content={<ChartTooltipContent hideLabel labelKey={dataKey} nameKey={nameKey} />} />
                  <ChartLegend
                    content={<ChartLegendContent />}
                    className="gba:-translate-y-2 gba:flex-wrap gba:gap-2 gba:*:basis-1/4 gba:*:justify-center"
                  />
                </PieChart>
              </ChartContainer>
            </div>

            {/* Source Quality Indicators */}
            <div className="gba:mt-4 gba:space-y-3" data-testid="lead-source-quality-container">
              <div className="gba:text-sm gba:font-medium gba:text-gray-700 gba:mb-2">
                {getTranslationFromI18nKeyAndLabel('dashboard.leadSources.performanceTitle', 'Source Performance')}
              </div>
              <div className="gba:space-y-2">
                {items.map(item => {
                  return (
                    <div
                      key={item.source}
                      className="gba:flex gba:items-center gba:justify-between gba:p-2 gba:rounded-lg gba:bg-gray-50 gba:border"
                      data-testid={`lead-source-quality-${item.source.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <span className="gba:text-sm gba:font-medium gba:text-gray-900">{item.source}</span>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Badge variant={getQualityLevelBadgeVariant(item.qualityLevel)} className="gba:text-xs">
                          {item.qualityText}
                        </Badge>
                        {item.conversionRate !== undefined && (
                          <span className="gba:text-xs gba:text-gray-600">
                            {getTranslationFromI18nKeyAndLabel(
                              'dashboard.leadSources.conversionLabel',
                              `${item.conversionRate}% conv.`
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="gba:text-center gba:py-8">
            <div className="gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel('noLeadSourceDataAvailable', 'No lead source data available')}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default LeadSourceChart
