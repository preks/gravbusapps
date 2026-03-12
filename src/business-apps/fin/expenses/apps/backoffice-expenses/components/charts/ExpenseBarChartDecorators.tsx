import React from 'react'
import { ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@newwork/nw-design-system'
import { XAxis, YAxis } from 'recharts'
import { formatCurrencyForChart } from '../../utils/currencyUtils'

interface ExpenseBarChartDecoratorsProps {
  xDataKey: string
  tooltipLabelKey: string
  selectedCurrencyCode: string
  xTickFormatter?: (value: string) => string
}

const ExpenseBarChartDecorators: React.FC<ExpenseBarChartDecoratorsProps> = ({
  xDataKey,
  tooltipLabelKey,
  selectedCurrencyCode,
  xTickFormatter
}) => (
  <>
    <XAxis dataKey={xDataKey} tick={{ fontSize: 12 }} interval={0} tickFormatter={xTickFormatter} />
    <YAxis tickFormatter={value => formatCurrencyForChart(value, selectedCurrencyCode)} tick={{ fontSize: 12 }} />
    <ChartTooltip content={<ChartTooltipContent labelKey={tooltipLabelKey} />} />
    <ChartLegend content={<ChartLegendContent />} />
  </>
)

export default ExpenseBarChartDecorators
