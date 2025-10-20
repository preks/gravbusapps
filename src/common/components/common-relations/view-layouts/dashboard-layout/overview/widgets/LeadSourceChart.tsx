import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, IconAvatar, Badge } from '@newwork/nw-design-system'
import { getQualityLevelBadgeVariant } from '@/common/utils/badgeUtils'
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { PieChart, Pie } from 'recharts'
import { ChartPieIcon } from '@phosphor-icons/react'
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

export const LeadSourceChart: React.FC<LeadSourceChartProps> = ({ items, totalLeads, moduleColor }) => {
  const dataKey = 'leads'
  const nameKey = 'source'

  const chartData = useMemo(() => {
    return items.map(item => {
      const key = toKey(item.source)
      return {
        [nameKey]: key,
        [dataKey]: item.value,
        fill: `var(--color-${key})`
      } as Record<string, string | number>
    })
  }, [items])

  const chartConfig = useMemo(() => {
    const config: Record<string, { label?: string }> = {
      [dataKey]: {}
    }
    items.forEach(item => {
      const key = toKey(item.source)
      config[key] = { label: item.source }
    })
    return config as ChartConfig
  }, [items])

  // Calculate flexible height based on number of sources and quality indicators
  const getFlexibleHeight = useMemo(() => {
    const baseChartHeight = 250 // Increased minimum chart height for bigger pie chart
    const qualityIndicatorHeight = items.length * 44 // Each quality indicator row is ~44px
    const headerHeight = 80 // Approximate header height
    const paddingAndSpacing = 60 // Additional padding and spacing

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
        <IconAvatar icon={ChartPieIcon} variant={moduleColor as any} size="md" iconWeight="regular" decorative={true} />
        <div>
          <CardTitle>
            {getTranslationFromI18nKeyAndLabel('leadSources.monthlyOpenLeads', 'Lead Sources - Monthly Open Leads')}
          </CardTitle>
          <CardDescription>
            {getTranslationFromI18nKeyAndLabel('leadSources.distributionBySource', 'Distribution by source')}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="gba:flex-1 gba:flex gba:flex-col">
        {items && items.length > 0 ? (
          <div className="gba:space-y-4 gba:flex-1 gba:flex gba:flex-col gba:justify-between">
            {/* Chart with center content */}
            <div className="gba:relative gba:w-full gba:flex gba:justify-center gba:flex-1 gba:items-center">
              <ChartContainer config={chartConfig} className="gba:w-full" style={{ height: `${getFlexibleHeight}px` }}>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius="65%"
                    outerRadius="85%"
                    dataKey={dataKey}
                    nameKey={nameKey}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel labelKey={dataKey} nameKey={nameKey} />} />
                  <ChartLegend
                    content={<ChartLegendContent />}
                    className="gba:-translate-y-2 gba:flex-wrap gba:gap-2 gba:*:basis-1/4 gba:*:justify-center"
                  />
                </PieChart>
              </ChartContainer>

              {/* Center content overlay */}
              <div
                className="gba:absolute gba:pointer-events-none"
                style={{
                  transform: 'translate(-50%, -50%)',
                  left: '50%',
                  top: '50%'
                }}
              >
                <div className="gba:text-center">
                  <div className="gba:text-base gba:font-semibold gba:text-gray-700">
                    {getTranslationFromI18nKeyAndLabel('leadSources.totalLeads', 'Total Leads')}
                  </div>
                  <div className="gba:text-2xl gba:font-bold gba:text-gray-900">{formatLargeNumber(totalLeads)}</div>
                </div>
              </div>
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
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <div
                          className="gba:w-3 gba:h-3 gba:rounded-full gba:flex-shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="gba:text-sm gba:font-medium gba:text-gray-900">{item.source}</span>
                      </div>
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
