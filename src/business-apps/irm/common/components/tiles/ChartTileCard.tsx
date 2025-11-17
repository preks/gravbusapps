import React from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button } from '@newwork/nw-design-system'
import { Pencil, Trash2, PieChart, BarChart3, LineChart } from 'lucide-react'
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart as RechartsBarChart,
  Bar,
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts'
import { TileData, CHART_TYPES } from '../../types/tileTypes'
import { AppAction } from '@/components/app-action'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ChartTileCardProps extends BusinessAppContextProps {
  tile: TileData
  investmentId: string
  onDelete: (tileId: string) => void
}

// Design system chart colors (nw-design-system tokens)
const CHART_COLORS = [
  'var(--nw-chart-1)',
  'var(--nw-chart-2)',
  'var(--nw-chart-3)',
  'var(--nw-chart-4)',
  'var(--nw-chart-5)',
  'var(--nw-chart-6)'
]

export const ChartTileCard: React.FC<ChartTileCardProps> = ({ tile, investmentId, onDelete, ...props }) => {
  const chartData = tile.chartData

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
    if (!chartData.pieData || chartData.pieData.length === 0) {
      return (
        <div className="gba:text-center gba:text-muted-foreground gba:py-8">
          {getTranslationFromI18nKeyAndLabel('investment.tiles.noData', 'No data available')}
        </div>
      )
    }

    // Format data for recharts
    const pieChartData = chartData.pieData.map(item => ({
      name: item.name,
      value: item.percentage
    }))

    return (
      <div data-testid={`pie-chart-data-${tile.id}`}>
        <ResponsiveContainer width="100%" height={350}>
          <RechartsPieChart>
            <Pie
              data={pieChartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, value }) => `${name}: ${value}%`}
              outerRadius={100}
              dataKey="value"
            >
              {pieChartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: any) => `${value}%`} />
            <Legend />
          </RechartsPieChart>
        </ResponsiveContainer>
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

    // Combine X and Y axis data for the chart
    const combinedData = chartData.barData.xAxis.map((xItem, index) => ({
      name: xItem.name,
      xValue: xItem.amount,
      yValue: chartData.barData!.yAxis[index]?.amount || 0
    }))

    return (
      <div data-testid={`bar-chart-data-${tile.id}`}>
        <ResponsiveContainer width="100%" height={350}>
          <RechartsBarChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="name" stroke="var(--nw-color-muted-foreground)" />
            <YAxis stroke="var(--nw-color-muted-foreground)" />
            <Tooltip />
            <Legend />
            <Bar dataKey="xValue" fill={CHART_COLORS[0]} name="X-Axis" radius={[4, 4, 0, 0]} />
            <Bar dataKey="yValue" fill={CHART_COLORS[1]} name="Y-Axis" radius={[4, 4, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
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

    // Combine X and Y axis data for the chart
    const combinedData = chartData.lineData.xAxis.map((xItem, index) => ({
      name: xItem.name,
      xValue: xItem.amount,
      yValue: chartData.lineData!.yAxis[index]?.amount || 0
    }))

    return (
      <div data-testid={`line-chart-data-${tile.id}`}>
        <ResponsiveContainer width="100%" height={350}>
          <RechartsLineChart data={combinedData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <XAxis dataKey="name" stroke="var(--nw-color-muted-foreground)" />
            <YAxis stroke="var(--nw-color-muted-foreground)" />
            <Tooltip />
            <Legend />
            <Line
              type="monotone"
              dataKey="xValue"
              stroke={CHART_COLORS[0]}
              name="X-Axis"
              strokeWidth={3}
              dot={{ fill: CHART_COLORS[0], r: 4 }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="yValue"
              stroke={CHART_COLORS[1]}
              name="Y-Axis"
              strokeWidth={3}
              dot={{ fill: CHART_COLORS[1], r: 4 }}
              activeDot={{ r: 6 }}
            />
          </RechartsLineChart>
        </ResponsiveContainer>
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

  const formattedDate = new Date(tile.updatedAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })

  return (
    <Card data-testid={`chart-tile-${tile.id}`} className="gba:border gba:shadow-sm">
      <CardHeader className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:space-y-0 gba:pb-4">
        <div className="gba:flex gba:items-center gba:gap-2">
          {getChartIcon()}
          <CardTitle className="gba:text-lg gba:font-semibold" data-testid={`tile-title-${tile.id}`}>
            {tile.title}
          </CardTitle>
        </div>
        <div className="gba:flex gba:gap-2">
          <AppAction
            contextsArray={[FlowContextName.investmentKpiTilesUpdate]}
            externalContextData={{
              investmentId,
              scope: 'chart',
              tileId: tile.id
            }}
            accessToken={props.accessToken}
            emptyStateBehavior="enable"
            data-testid={formatDataTestId(`edit-chart-tile-${tile.id}`, 'action')}
          >
            <Button
              variant="ghost"
              size="icon"
              data-testid={formatDataTestId(`edit-chart-tile-${tile.id}`, 'button')}
              title={getTranslationFromI18nKeyAndLabel('common.edit', 'Edit')}
            >
              <Pencil className="gba:h-4 gba:w-4" />
            </Button>
          </AppAction>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(tile.id)}
            data-testid={formatDataTestId(`delete-chart-tile-${tile.id}`, 'button')}
            title={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
          >
            <Trash2 className="gba:h-4 gba:w-4 gba:text-destructive" />
          </Button>
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
