import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  ChartContainer,
  ChartConfig,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { resolveCssVar } from './chartUtils'

interface BarChartProps {
  data: {
    name: string
    value: number
    [key: string]: any
  }[]
  title: string
  xAxisDataKey?: string
  barDataKey?: string
  barColor?: string
  height?: number
  currency?: string
  valueType?: 'amount' | 'count'
  countLabel?: string
  getColor?: (entry: any, index: number) => string | undefined
  dataTestId?: string
}

/**
 * Reusable bar chart component for analytics
 */
const BarChartComponent: React.FC<BarChartProps> = ({
  data,
  title,
  xAxisDataKey = 'name',
  barDataKey = 'value',
  barColor = 'var(--nw-primary)',
  height = 300,
  currency = 'EUR',
  valueType = 'amount',
  countLabel = 'items',
  getColor,
  dataTestId
}) => {
  const [isChartReady, setIsChartReady] = React.useState(false)
  const chartWrapperRef = React.useRef<HTMLDivElement | null>(null)
  const [hasChartSpace, setHasChartSpace] = React.useState(false)
  const [chartWidth, setChartWidth] = React.useState(0)
  React.useEffect(() => {
    const rafId = globalThis.requestAnimationFrame(() => setIsChartReady(true))
    return () => globalThis.cancelAnimationFrame(rafId)
  }, [])
  React.useEffect(() => {
    const wrapper = chartWrapperRef.current
    if (!wrapper) return

    const syncChartSpace = () => {
      const width = wrapper.clientWidth
      const hasSpace = width > 0 && wrapper.clientHeight > 0
      setChartWidth(width)
      setHasChartSpace(hasSpace)
    }

    syncChartSpace()
    const observer = new ResizeObserver(syncChartSpace)
    observer.observe(wrapper)

    return () => observer.disconnect()
  }, [height])
  const resolvedBarColor = React.useMemo(() => resolveCssVar(barColor), [barColor])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      [barDataKey]: {
        label:
          valueType === 'count'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:charts.tooltip.count', 'Count')
            : getTranslationFromI18nKeyAndLabel('lowcoder:charts.tooltip.amount', 'Amount')
      }
    }
    return config
  }, [barDataKey, valueType])

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
        <div ref={chartWrapperRef} className="gba:w-full" style={{ minHeight: height }}>
          {isChartReady && hasChartSpace ? (
            <ChartContainer
              config={chartConfig}
              className="gba:w-full gba:min-w-0"
              style={{ height: height, width: `${chartWidth}px`, minWidth: 1 }}
              data-testid={dataTestId ?? 'bar-chart'}
            >
              <BarChart
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
                      formatter={(value: any) => {
                        if (valueType === 'count') {
                          const num = typeof value === 'number' ? value : Number(value ?? 0)
                          const itemsLabel = getTranslationFromI18nKeyAndLabel(
                            'lowcoder:charts.tooltip.items',
                            countLabel
                          )
                          return `${num} ${itemsLabel}`
                        }
                        // For amount type, just return the formatted currency
                        return formatCurrencyDisplay(value, currency)
                      }}
                    />
                  }
                />
                <Bar dataKey={barDataKey} fill={resolvedBarColor}>
                  {data.map((entry, index) => {
                    const entryKey = `${index}-${String(entry[xAxisDataKey] ?? '')}-${String(entry[barDataKey] ?? '')}`
                    const candidate = getColor ? getColor(entry, index) || resolvedBarColor : resolvedBarColor
                    const fill = resolveCssVar(candidate)
                    return <Cell key={`cell-${entryKey}`} fill={fill} />
                  })}
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <div className="gba:w-full" style={{ minHeight: height }} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default BarChartComponent
