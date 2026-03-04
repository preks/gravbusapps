import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { resolveCssVar } from './chartUtils'

interface LineChartProps {
  data: {
    date: string
    value: number
  }[]
  title: string
  xAxisDataKey?: string
  lineDataKey?: string
  lineColor?: string
  height?: number
  currency?: string
  dataTestId?: string
}

/**
 * Reusable line chart component for time series analytics
 */
const LineChartComponent: React.FC<LineChartProps> = ({
  data,
  title,
  xAxisDataKey = 'date',
  lineDataKey = 'value',
  lineColor = 'var(--nw-success)',
  height = 300,
  currency = 'EUR',
  dataTestId
}) => {
  const [isChartReady, setIsChartReady] = React.useState(false)
  React.useEffect(() => {
    const rafId = window.requestAnimationFrame(() => setIsChartReady(true))
    return () => window.cancelAnimationFrame(rafId)
  }, [])
  const resolvedLineColor = React.useMemo(() => resolveCssVar(lineColor), [lineColor])
  const lineName = getTranslationFromI18nKeyAndLabel('lowcoder:charts.legend.amount', 'Amount')

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      [lineDataKey]: {
        label: lineName
      }
    }
    return config
  }, [lineDataKey, lineName])

  if (!data || data.length === 0) {
    return (
      <Card className="gba:w-full">
        {title && (
          <CardHeader>
            <CardTitle>{title}</CardTitle>
          </CardHeader>
        )}
        <CardContent>
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:p-8 gba:text-center gba:min-h-[200px]">
            <div className="gba:text-muted-foreground gba:text-lg gba:font-medium gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('lowcoder:charts.empty.title', 'No data available')}
            </div>
            <div className="gba:text-muted-foreground gba:text-sm">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:charts.empty.description',
                'There is no data to display for this chart.'
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:w-full">
      {title && (
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {!isChartReady ? (
          <div className="gba:w-full gba:min-h-[300px]" />
        ) : (
          <ChartContainer
            config={chartConfig}
            className="gba:w-full gba:min-w-0"
            style={{ height: height }}
            data-testid={dataTestId ?? 'line-chart'}
          >
            <LineChart
              data={data}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xAxisDataKey} />
              <YAxis />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={value => {
                      const num = typeof value === 'number' ? value : Number(value ?? 0)
                      const fixed = Number.isFinite(num) ? Number(num.toFixed(2)) : 0
                      return formatCurrencyDisplay(fixed, currency)
                    }}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Line
                type="monotone"
                dataKey={lineDataKey}
                stroke={resolvedLineColor}
                activeDot={{ r: 8 }}
                name={lineName}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}

export default LineChartComponent
