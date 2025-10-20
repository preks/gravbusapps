import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  IconAvatar,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { BarChart, Bar, XAxis, YAxis } from 'recharts'
import { ChartBarIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyForChart } from '../../../../../utils/currencyUtils'
import { getChartColor } from '../../../../../utils/chartColorUtils'

// Chart layout constants
// Note: Recharts requires numeric values for margin and radius props
// These values are optimized for chart readability and cannot use CSS variables
const CHART_MARGIN = { top: 20, right: 30, left: 20, bottom: 20 }
const BAR_BORDER_RADIUS: [number, number, number, number] = [4, 4, 0, 0] // Top-left, top-right, bottom-right, bottom-left

interface PlanVsRequestChartProps {
  chartData: Array<{
    month: string
    a_planned: number
    b_actual: number
  }>
  selectedCurrencyCode: string
}

export const PlanVsRequestChart: React.FC<PlanVsRequestChartProps> = ({ chartData, selectedCurrencyCode }) => {
  // Chart configuration - using design system tokens resolved to actual colors
  // Recharts requires actual color values, so we resolve CSS variables at runtime
  const chartConfig = useMemo(
    () => ({
      a_planned: {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:cards.planned_chart_legend', 'Planned'),
        color: getChartColor('chart1') // Design system chart-1 token (blue)
      },
      b_actual: {
        label: getTranslationFromI18nKeyAndLabel('lowcoder:cards.actual_chart_legend', 'Actual'),
        color: getChartColor('chart3') // Design system chart-3 token (orange)
      }
    }),
    []
  )

  return (
    <Card data-testid="trends-chart">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <IconAvatar icon={ChartBarIcon} variant="default" size="md" decorative />
          {getTranslationFromI18nKeyAndLabel('lowcoder:cards.monthly_trend', 'Monthly Trend')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <div className="gba:text-center gba:p-8" data-testid="chart-empty-state">
            <ChartBarIcon className="gba:mx-auto gba:h-12 gba:w-12 gba:text-muted-foreground" />
            <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-foreground">No data available</h3>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
              No trend data found for the selected period.
            </p>
          </div>
        ) : (
          <ChartContainer config={chartConfig} className="gba:h-[320px] gba:w-full" data-testid="plan-vs-request-chart">
            <BarChart data={chartData} margin={CHART_MARGIN}>
              <XAxis dataKey="month" tick={{ fontSize: 12 }} interval={0} />
              <YAxis
                tickFormatter={value => formatCurrencyForChart(value, selectedCurrencyCode)}
                tick={{ fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent labelKey="month" />} />
              <ChartLegend content={<ChartLegendContent />} />
              <Bar dataKey="a_planned" fill="var(--color-a_planned)" radius={BAR_BORDER_RADIUS} />
              <Bar dataKey="b_actual" fill="var(--color-b_actual)" radius={BAR_BORDER_RADIUS} />
            </BarChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  )
}
