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
  useTranslation
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell } from 'recharts'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { resolveCssVar } from './chartUtils'
import translations from '../../../_i18n'

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
  const { t } = useTranslation(translations)
  const resolvedBarColor = React.useMemo(() => resolveCssVar(barColor), [barColor])

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      [barDataKey]: {
        label: valueType === 'count' ? t('dashboard-charts-tooltip-count') : t('dashboard-charts-tooltip-amount')
      }
    }
    return config
  }, [barDataKey, valueType, t])

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
              {t('dashboard-charts-empty-title')}
            </div>
            <div className="gba:text-muted-foreground gba:text-sm">{t('dashboard-charts-empty-description')}</div>
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
        <ChartContainer
          config={chartConfig}
          className="gba:w-full"
          style={{ height: height }}
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
                      const itemsLabel = countLabel || t('dashboard-charts-tooltip-items')
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
                const entryKey = entry[xAxisDataKey] || entry[barDataKey] || index
                const candidate = getColor ? getColor(entry, index) || resolvedBarColor : resolvedBarColor
                const fill = resolveCssVar(candidate)
                return <Cell key={`cell-${entryKey}`} fill={fill} />
              })}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default BarChartComponent
