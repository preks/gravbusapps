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
import { PieChart, Pie, Cell, Legend } from 'recharts'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { resolveCssVar } from './chartUtils'

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
  dataTestId
}) => {
  const resolvedColors = React.useMemo(() => colors.map(resolveCssVar), [colors])

  // Create chart config dynamically from data
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {
      [dataKey]: {
        label:
          valueType === 'count'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:charts.tooltip.count', 'Count')
            : getTranslationFromI18nKeyAndLabel('lowcoder:charts.tooltip.amount', 'Amount')
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
  }, [data, dataKey, valueType])
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
        <ChartContainer
          config={chartConfig}
          className="gba:mx-auto"
          style={{ minHeight: height, width: '100%' }}
          data-testid={dataTestId ?? `${title.toLowerCase().replaceAll(/\s+/g, '-')}-chart`}
        >
          <PieChart width={500} height={400}>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value: any, _name: any, props: any) => {
                    const num = Number(value ?? 0)
                    if (valueType === 'count') {
                      const itemsLabel = getTranslationFromI18nKeyAndLabel('lowcoder:charts.tooltip.items', countLabel)
                      return `${num} ${itemsLabel}`
                    }
                    const fixed = Number.isFinite(num) ? Math.round(num * 100) / 100 : 0
                    const count = props?.payload?.count ?? null
                    const amountText = formatCurrencyDisplay(fixed, currency)
                    const countLabelText = getTranslationFromI18nKeyAndLabel('lowcoder:charts.tooltip.count', 'Count')
                    return count === null ? amountText : `${amountText} (${countLabelText}: ${count})`
                  }}
                  nameKey="name"
                />
              }
            />
            <Pie
              data={data}
              cx="50%"
              cy="45%"
              labelLine={false}
              label={false}
              outerRadius={100}
              innerRadius={60}
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
            <Legend layout="horizontal" align="center" verticalAlign="bottom" iconSize={10} />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

export default PieChartComponent
