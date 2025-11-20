import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { PieChart, BarChart3, LineChart } from 'lucide-react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis
} from 'recharts'
import { TileData, CHART_TYPES } from './types/tileTypes'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatForDisplay } from '@/common/utils/dateFormatter'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ChartTileCardProps extends BusinessAppContextProps {
  tile: TileData
  investmentId: string
}

// Custom tooltip component - reusable for all chart types
interface ChartTooltipProps {
  active?: boolean
  payload?: any[]
  labelKey?: string
  showPercentage?: boolean
}

const ChartTooltipContent: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  labelKey = 'name',
  showPercentage = false
}) => {
  if (active && payload?.length) {
    const label = payload[0].payload[labelKey]
    const value = payload[0].value

    return (
      <div className="gba:bg-card gba:border gba:rounded gba:p-2 gba:shadow-lg">
        <p className="gba:font-medium">{label}</p>
        <p className="gba:text-sm">{showPercentage ? `${value}%` : `Value: ${value}`}</p>
      </div>
    )
  }
  return null
}

export const ChartTileCard: React.FC<ChartTileCardProps> = ({ tile, investmentId, ...props }) => {
  const chartData = tile.chartData

  // All hooks MUST be called before any early returns (Rules of Hooks)
  // Prepare pie chart data and config at top level (using useMemo)
  const { pieChartData, pieChartConfig } = useMemo(() => {
    if (!chartData?.pieData || chartData.pieData.length === 0) {
      return { pieChartData: [], pieChartConfig: {} }
    }

    const pieData = chartData.pieData.map(item => {
      // Using replace() instead of replaceAll() for ES2020 compatibility
      const key = item.name.toLowerCase().replace(/\s+/g, '')
      return {
        name: key,
        displayName: item.name,
        value: item.percentage
      }
    })

    const config: Record<string, { label: string }> = {}
    pieData.forEach(item => {
      config[item.name] = { label: item.displayName }
    })

    return { pieChartData: pieData, pieChartConfig: config }
  }, [chartData?.pieData])

  // Prepare bar chart config at top level
  const barChartConfig = useMemo(
    () => ({
      value: {
        label: 'Value'
      }
    }),
    []
  )

  // Prepare line chart config at top level
  const lineChartConfig = useMemo(
    () => ({
      value: {
        label: 'Value'
      }
    }),
    []
  )

  // Early return AFTER all hooks
  if (!chartData) {
    return null
  }

  const getChartIcon = () => {
    switch (chartData.chartType) {
      case CHART_TYPES.PIE:
        return <PieChart className="gba:h-5 gba:w-5 gba:text-primary" />
      case CHART_TYPES.BAR:
        return <BarChart3 className="gba:h-5 gba:w-5 gba:text-primary" />
      case CHART_TYPES.LINE:
        return <LineChart className="gba:h-5 gba:w-5 gba:text-primary" />
      default:
        return <PieChart className="gba:h-5 gba:w-5 gba:text-primary" />
    }
  }

  const renderPieChart = () => {
    if (pieChartData.length === 0) {
      return (
        <div className="gba:text-center gba:text-muted-foreground gba:py-8">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.noData', 'No data available')}
        </div>
      )
    }

    return (
      <div data-testid={`pie-chart-data-${tile.id}`}>
        <ChartContainer config={pieChartConfig} className="gba:h-[350px] gba:w-full">
          <RechartsPieChart>
            <Pie
              data={pieChartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ displayName, value }) => `${displayName}: ${value}%`}
              outerRadius={100}
            >
              {pieChartData.map(entry => (
                <Cell key={entry.name} fill={`var(--color-${entry.name})`} />
              ))}
            </Pie>
            <ChartTooltip content={<ChartTooltipContent labelKey="displayName" showPercentage={true} />} />
            <ChartLegend content={<ChartLegendContent />} />
          </RechartsPieChart>
        </ChartContainer>
      </div>
    )
  }

  const renderBarChart = () => {
    if (!chartData.barData || chartData.barData.xAxis.length === 0 || chartData.barData.yAxis.length === 0) {
      return (
        <div className="gba:text-center gba:text-muted-foreground gba:py-8">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.noData', 'No data available')}
        </div>
      )
    }

    // X-axis provides labels, Y-axis provides bar heights
    const combinedData = chartData.barData.xAxis.map((xItem, index) => ({
      name: xItem.name,
      value: chartData.barData!.yAxis[index]?.amount || 0
    }))

    return (
      <div data-testid={`bar-chart-data-${tile.id}`}>
        <ChartContainer config={barChartConfig} className="gba:h-[350px] gba:w-full">
          <RechartsBarChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <XAxis
              dataKey="name"
              label={
                chartData.barData.xAxisName
                  ? {
                      value: chartData.barData.xAxisName,
                      position: 'insideBottom',
                      offset: -10
                    }
                  : undefined
              }
            />
            <YAxis
              label={
                chartData.barData.yAxisName
                  ? {
                      value: chartData.barData.yAxisName,
                      angle: -90,
                      position: 'insideLeft'
                    }
                  : undefined
              }
            />
            <ChartTooltip content={<ChartTooltipContent labelKey="name" showPercentage={false} />} />
            <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ChartContainer>
      </div>
    )
  }

  const renderLineChart = () => {
    if (!chartData.lineData || chartData.lineData.xAxis.length === 0 || chartData.lineData.yAxis.length === 0) {
      return (
        <div className="gba:text-center gba:text-muted-foreground gba:py-8">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.noData', 'No data available')}
        </div>
      )
    }

    // X-axis provides labels, Y-axis provides line values
    const combinedData = chartData.lineData.xAxis.map((xItem, index) => ({
      name: xItem.name,
      value: chartData.lineData!.yAxis[index]?.amount || 0
    }))

    return (
      <div data-testid={`line-chart-data-${tile.id}`}>
        <ChartContainer config={lineChartConfig} className="gba:h-[350px] gba:w-full">
          <RechartsLineChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
            <XAxis
              dataKey="name"
              label={
                chartData.lineData.xAxisName
                  ? {
                      value: chartData.lineData.xAxisName,
                      position: 'insideBottom',
                      offset: -10
                    }
                  : undefined
              }
            />
            <YAxis
              label={
                chartData.lineData.yAxisName
                  ? {
                      value: chartData.lineData.yAxisName,
                      angle: -90,
                      position: 'insideLeft'
                    }
                  : undefined
              }
            />
            <ChartTooltip content={<ChartTooltipContent labelKey="name" showPercentage={false} />} />
            <Line
              type="monotone"
              dataKey="value"
              stroke="var(--color-value)"
              strokeWidth={3}
              dot={{ fill: 'var(--color-value)', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </RechartsLineChart>
        </ChartContainer>
      </div>
    )
  }

  const renderChart = () => {
    switch (chartData.chartType) {
      case CHART_TYPES.PIE:
        return renderPieChart()
      case CHART_TYPES.BAR:
        return renderBarChart()
      case CHART_TYPES.LINE:
        return renderLineChart()
      default:
        return (
          <div className="gba:text-center gba:text-muted-foreground gba:py-8">
            {getTranslationFromI18nKeyAndLabel('investment.tiles.unsupportedChart', 'Unsupported chart type')}
          </div>
        )
    }
  }

  const formattedDate = formatForDisplay(tile.updatedAt)

  return (
    <Card data-testid={`chart-tile-${tile.id}`} className="gba:border gba:shadow-sm">
      <CardHeader className="gba:pb-4">
        <div className="gba:flex gba:justify-between gba:items-start">
          <div className="gba:flex gba:items-center gba:gap-2">
            {getChartIcon()}
            <CardTitle className="gba:text-lg">{tile.title}</CardTitle>
          </div>

          {/* Action Buttons */}
          <div className="gba:flex gba:gap-2">
            <AppAction
              variant="update-secondary"
              contexts={[
                {
                  context: FlowContextName.investmentKpiTilesUpdate,
                  contextData: {
                    investmentId,
                    scope: 'chart',
                    tileId: tile.id
                  }
                }
              ]}
              accessToken={props.accessToken}
              data-testid={`edit-tile-${tile.id}`}
            />

            <AppAction
              variant="delete-secondary"
              contexts={[
                {
                  context: FlowContextName.investmentKpiTilesUpdate,
                  contextData: {
                    investmentId,
                    scope: 'delete',
                    tileId: tile.id
                  }
                }
              ]}
              accessToken={props.accessToken}
              data-testid={`delete-tile-${tile.id}`}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {renderChart()}
        <div
          className="gba:mt-4 gba:text-xs gba:text-muted-foreground gba:text-right"
          data-testid={`tile-updated-${tile.id}`}
        >
          {getTranslationFromI18nKeyAndLabel('investment.tiles.lastUpdated', 'Last updated')}: {formattedDate}
        </div>
      </CardContent>
    </Card>
  )
}
