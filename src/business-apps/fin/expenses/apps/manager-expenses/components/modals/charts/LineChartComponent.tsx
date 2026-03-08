import React from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
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
  const resolvedLineColor = React.useMemo(() => resolveCssVar(lineColor), [lineColor])
  const lineName = getTranslationFromI18nKeyAndLabel('lowcoder:charts.legend.amount', 'Amount')

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
            <div
              className="gba:w-full gba:min-w-0"
              style={{ height: height, width: `${chartWidth}px`, minWidth: 1 }}
              data-testid={dataTestId ?? 'line-chart'}
            >
              <LineChart
                width={Math.max(chartWidth, 1)}
                height={height}
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
                <Tooltip
                  formatter={value => {
                    const num = typeof value === 'number' ? value : Number(value ?? 0)
                    const fixed = Number.isFinite(num) ? Number(num.toFixed(2)) : 0
                    return formatCurrencyDisplay(fixed, currency)
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey={lineDataKey}
                  stroke={resolvedLineColor}
                  activeDot={{ r: 8 }}
                  name={lineName}
                />
              </LineChart>
            </div>
          ) : (
            <div className="gba:w-full" style={{ minHeight: height }} />
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default LineChartComponent
