import React, { useMemo } from 'react'
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
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { FunnelChart, Funnel, LabelList } from 'recharts'
import { FunnelSimpleIcon } from '@phosphor-icons/react'
import { CurrencyFilter } from '@/business-apps/irm/investments/apps/investment-management/views/analytics-view/shared/components/CurrencyFilter'

export interface AggregatedFunnelStage {
  stage: string
  count: number
  value: number
  color?: string
}

export interface PipelineFunnelProps {
  aggregatedFunnel: AggregatedFunnelStage[]
  title?: string
  description?: string
  headerIcon?: React.ReactNode
  moduleColor?: string
  availableCurrencies?: string[]
  selectedCurrency?: string
  onCurrencyChange?: (currency: string) => void
}

const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  try {
    // Use compact notation for large numbers
    const abs = Math.abs(amount)
    if (abs >= 1_000_000) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currencyCode,
        notation: 'compact',
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
      }).format(amount)
    }
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  } catch {
    return `${currencyCode} ${amount.toLocaleString()}`
  }
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

// Helper to find data item from chart data
const findDataItem = (chartData: any[], props: any) => {
  const { name, value, index, payload } = props

  // Method 1: Match by name (stage key)
  if (name) {
    const byName = chartData.find(item => item.stage === name)
    if (byName) return byName
  }

  // Method 2: Match by index (most reliable for FunnelChart)
  if (index !== undefined && chartData[index]) {
    return chartData[index]
  }

  // Method 3: Match by value as fallback
  if (value) {
    const byValue = chartData.find(item => item.value === value)
    if (byValue) return byValue
  }

  // Method 4: Try payload
  if (payload) {
    return chartData.find(item => item.stage === payload.stage || item.originalValue === payload.originalValue)
  }

  return null
}

// Helper to calculate center position
const calculateCenterPosition = (props: any): { centerX: number; centerY: number } => {
  const { y, height, cx, cy, index, trapezoids } = props

  if (typeof cx === 'number' && typeof cy === 'number') {
    return { centerX: cx, centerY: cy }
  }

  if (trapezoids?.[index]) {
    const trap = trapezoids[index]
    return { centerX: trap.x + trap.upperWidth / 2, centerY: trap.y + trap.height / 2 }
  }

  // Fallback: chart is 400px wide, center is 200
  return { centerX: 200, centerY: y + height / 2 }
}

// Custom label renderer for funnel elements
const renderCustomLabel = (chartData: any[], currencyCode: string) => (props: any) => {
  const dataItem = findDataItem(chartData, props)
  if (!dataItem) return null

  const count = dataItem.count || 0
  const originalValue = dataItem.originalValue || 0

  // Safety check - don't render if no valid data
  if (!originalValue || Number.isNaN(originalValue) || originalValue === 0) {
    return null
  }

  const { centerX, centerY } = calculateCenterPosition(props)

  return (
    <g>
      <text
        x={centerX}
        y={centerY - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="gba:fill-white gba:text-sm gba:font-bold"
        style={{
          stroke: 'hsl(0 0% 0%)',
          strokeWidth: '2px',
          strokeLinejoin: 'round',
          paintOrder: 'stroke fill'
        }}
      >
        {formatCurrency(originalValue, currencyCode)}
      </text>
      <text
        x={centerX}
        y={centerY + 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="gba:fill-white gba:text-xs gba:opacity-90"
        style={{
          stroke: 'hsl(0 0% 0%)',
          strokeWidth: '1.5px',
          strokeLinejoin: 'round',
          paintOrder: 'stroke fill'
        }}
      >
        {count} opp{count !== 1 ? 's' : ''}
      </text>
    </g>
  )
}

export const PipelineFunnel: React.FC<PipelineFunnelProps> = ({
  aggregatedFunnel,
  title = 'All Pipeline - Current Year',
  description = 'Opportunity progression by stage',
  headerIcon,
  moduleColor = 'default',
  availableCurrencies = ['EUR'],
  selectedCurrency = 'EUR',
  onCurrencyChange
}) => {
  const dataKey = 'value'
  const nameKey = 'stage'

  const chartData = useMemo(() => {
    if (aggregatedFunnel.length === 0) return []

    // Calculate better proportional sizing for funnel visibility
    const values = aggregatedFunnel.map(stage => stage.value).filter(v => v > 0)
    if (values.length === 0) return []

    const maxValue = Math.max(...values)
    const minValue = Math.min(...values)

    // If the ratio is too extreme (>100:1), apply logarithmic scaling
    const shouldNormalize = maxValue > 0 && minValue > 0 && maxValue / minValue > 100

    // Preserve the original order from aggregatedFunnel (which is ordered by pipeline progression)
    return aggregatedFunnel.map((stage, index) => {
      const key = toKey(stage.stage)

      let visualValue = stage.value
      if (shouldNormalize && stage.value > 0) {
        // Use square root scaling to compress extreme ratios while maintaining order
        const normalizedRatio = Math.sqrt(stage.value / maxValue)
        // Ensure minimum 20% and maximum 100% relative size
        visualValue = Math.max(maxValue * 0.2, maxValue * normalizedRatio)
      }

      return {
        [nameKey]: key,
        [dataKey]: visualValue,
        count: stage.count,
        originalValue: stage.value, // Keep original for labels
        originalIndex: index, // Preserve original order
        fill: CHART_COLORS[index % CHART_COLORS.length],
        // Add payload data for the label renderer
        payload: {
          originalValue: stage.value,
          count: stage.count,
          stage: stage.stage
        }
      } as Record<string, any>
    })
  }, [aggregatedFunnel])

  const chartConfig = useMemo(() => {
    const config: Record<string, { label?: string; color?: string }> = {
      [dataKey]: {}
    }
    aggregatedFunnel.forEach((stage, index) => {
      const key = toKey(stage.stage)
      config[key] = { label: stage.stage, color: CHART_COLORS[index % CHART_COLORS.length] }
    })
    return config as ChartConfig
  }, [aggregatedFunnel])

  return (
    <Card className="gba:h-full">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        {headerIcon ?? <IconAvatar icon={FunnelSimpleIcon} variant={moduleColor as any} size="md" decorative={true} />}
        <div className="gba:flex-1">
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {availableCurrencies && availableCurrencies.length > 1 && onCurrencyChange && (
          <div className="gba:mb-4">
            <CurrencyFilter
              value={selectedCurrency || 'EUR'}
              onChange={onCurrencyChange}
              currencies={availableCurrencies}
              showLabel={true}
              label="Currency:"
              dataTestId="pipeline-funnel-currency-filter"
            />
          </div>
        )}
        {aggregatedFunnel && aggregatedFunnel.length > 0 ? (
          <div className="gba:space-y-4">
            {/* Funnel Chart */}
            <div className="gba:relative gba:w-full gba:flex gba:justify-center">
              <ChartContainer config={chartConfig} className="gba:w-[400px] gba:h-[300px]">
                <FunnelChart width={400} height={300}>
                  <Funnel
                    data={chartData}
                    dataKey={dataKey}
                    nameKey={nameKey}
                    cx="50%"
                    cy="50%"
                    isAnimationActive={true}
                  >
                    <LabelList content={renderCustomLabel(chartData, selectedCurrency)} />
                  </Funnel>
                  <ChartTooltip content={<ChartTooltipContent hideLabel labelKey={dataKey} nameKey={nameKey} />} />
                </FunnelChart>
              </ChartContainer>
            </div>

            {/* Stage legend */}
            <div className="gba:space-y-2 gba:mt-4">
              {aggregatedFunnel.map((stage, index) => {
                return (
                  <div key={stage.stage} className="gba:flex gba:items-center gba:justify-between gba:text-sm">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div
                        className="gba:w-3 gba:h-3 gba:rounded-sm"
                        style={{
                          backgroundColor: CHART_COLORS[index % CHART_COLORS.length]
                        }}
                      />
                      <span className="gba:text-gray-700">{stage.stage}</span>
                    </div>
                    <div className="gba:text-right">
                      <div className="gba:font-medium gba:text-gray-900">
                        {formatCurrency(stage.value, selectedCurrency)}
                      </div>
                      <div className="gba:text-xs gba:text-gray-500">
                        {stage.count} opp{stage.count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Total summary */}
            <div className="gba:pt-4 gba:border-t gba:border-gray-200">
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
                  {aggregatedFunnel.reduce((sum, stage) => sum + stage.count, 0)}
                </div>
                <div className="gba:text-sm gba:text-gray-600 gba:mt-1">Total Opportunities</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="gba:text-center gba:py-8">
            <div className="gba:text-gray-500">No funnel data available</div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PipelineFunnel
