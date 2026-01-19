import React from 'react'

// Use common formatters directly
export {
  formatCompactCurrency as formatCurrency,
  formatAmount as formatNumber,
  formatPercentage
} from '@/common/utils/numberFormatter'

// Chart utilities (local implementation)
export const CHART_COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#8dd1e1']
export const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null
  const RADIAN = Math.PI / 180
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return React.createElement(
    'text',
    {
      x,
      y,
      fill: 'white',
      textAnchor: x > cx ? 'start' : 'end',
      dominantBaseline: 'central',
      fontSize: '12',
      fontWeight: 'bold'
    },
    `${(percent * 100).toFixed(1)}%`
  )
}
export const renderLineTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null

  return React.createElement(
    'div',
    {
      className: 'custom-tooltip',
      style: {
        backgroundColor: 'white',
        padding: '10px',
        border: '1px solid #ccc',
        borderRadius: '4px'
      }
    },
    [
      React.createElement('p', { key: 'date' }, `Date: ${label}`),
      ...payload.map((item: any, index: number) =>
        React.createElement(
          'p',
          {
            key: `value-${index}`,
            style: { color: item.color }
          },
          `${item.dataKey}: ${formatCurrency(item.value, 'EUR')}`
        )
      )
    ]
  )
}
