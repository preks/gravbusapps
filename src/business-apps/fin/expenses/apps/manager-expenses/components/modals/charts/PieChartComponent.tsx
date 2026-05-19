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
import { PieChart, Pie, Cell, Legend, ResponsiveContainer } from 'recharts'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { useTranslation } from '@newwork/nw-design-system'
import { resolveCssVar } from './chartUtils'
import translations from '../../../_i18n'

interface PieChartProps {
  data: Array<{
    name: string
    value: number
    [key: string]: any // Allow additional dynamic properties
  }>
  title: string
  dataKey?: string
  height?: number
  colors?: string[]
  currency?: string
  valueType?: 'amount' | 'count'
  countLabel?: string
  getColor?: (entry: any, index: number) => string | undefined
  dataTestId?: string
  /** When false, hides the built-in Recharts legend (e.g. when using {@link StatusLegend} below). */
  showLegend?: boolean
}

/**
 * Reusable pie chart component for analytics
 */
const PieChartComponent: React.FC<PieChartProps> = ({
  data,
  title,
  dataKey = 'value',
  height = 300,
  colors = [
    'var(--nw-primary)',
    'var(--nw-success)',
    'var(--nw-warning)',
    'var(--nw-destructive)',
    'var(--nw-info)',
    'var(--nw-accent)',
    'var(--nw-muted)'
  ],
  currency = 'EUR',
  valueType = 'amount',
  countLabel = 'items',
  getColor,
  dataTestId,
  showLegend = true
}) => {
  const { t } = useTranslation(translations)
  const resolvedColors = React.useMemo(() => colors.map(resolveCssVar), [colors])
  const chartHeight = showLegend ? height + 80 : height
  const pieCenterY = showLegend ? '45%' : '50%'

  // Create chart config dynamically from data
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      [dataKey]: {
        label: valueType === 'count' ? t('dashboard-charts-tooltip-count') : t('dashboard-charts-tooltip-amount')
      }
    }

    // Add each data item to config
    for (const item of data) {
      const key = item.name.toLowerCase().replaceAll(/\s+/g, '_')
      config[key] = {
        label: item.name
      }
    }

    return config
  }, [data, dataKey, valueType, t])
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
          className="gba:mx-auto gba:w-full"
          style={{ height: chartHeight, width: '100%' }}
          data-testid={dataTestId ?? `${title.toLowerCase().replaceAll(/\s+/g, '-')}-chart`}
        >
          <ResponsiveContainer width="100%" height={chartHeight}>
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    formatter={(value: any, _name: any, props: any) => {
                      const num = Number(value ?? 0)
                      if (valueType === 'count') {
                        const itemsLabel = countLabel || t('dashboard-charts-tooltip-items')
                        return `${num} ${itemsLabel}`
                      }
                      const fixed = Number.isFinite(num) ? Math.round(num * 100) / 100 : 0
                      const count = props?.payload?.count ?? null
                      const amountText = formatCurrencyDisplay(fixed, currency)
                      const countLabelText = t('dashboard-charts-tooltip-count')
                      return count === null ? amountText : `${amountText} (${countLabelText}: ${count})`
                    }}
                    nameKey="name"
                  />
                }
              />
              <Pie
                data={data}
                cx="50%"
                cy={pieCenterY}
                labelLine={false}
                label={false}
                outerRadius={showLegend ? 100 : 90}
                innerRadius={showLegend ? 60 : 55}
                fill="var(--nw-chart-1)"
                dataKey={dataKey}
                nameKey="name"
              >
                {data.map((entry, index) => {
                  const base = resolvedColors[index % resolvedColors.length]
                  const custom = getColor ? getColor(entry, index) : undefined
                  const resolved = custom ? resolveCssVar(custom) : base
                  // Use entry name or value as key fallback to ensure uniqueness
                  const entryKey = entry.name || entry[dataKey] || index
                  return <Cell key={`cell-${entryKey}`} fill={resolved} />
                })}
              </Pie>
              {showLegend ? <Legend layout="horizontal" align="center" verticalAlign="bottom" iconSize={10} /> : null}
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default PieChartComponent
