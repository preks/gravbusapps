/**
 * Shared helper components and field description constants for the
 * AddWidgetDialog and its field sub-components.
 */

import React from 'react'
import type { BoardRow, ViewFilter, ViewFilterGroup } from '../../types'

function matchesFilter(row: BoardRow, f: ViewFilter): boolean {
  const raw = row.data[f.column]
  const str = raw == null ? '' : String(raw)
  const num = Number(raw)

  switch (f.operator) {
    case 'equals':
      return str.toLowerCase() === String(f.value ?? '').toLowerCase()
    case 'not_equals':
      return str.toLowerCase() !== String(f.value ?? '').toLowerCase()
    case 'contains':
      return str.toLowerCase().includes(String(f.value ?? '').toLowerCase())
    case 'not_contains':
      return !str.toLowerCase().includes(String(f.value ?? '').toLowerCase())
    case 'starts_with':
      return str.toLowerCase().startsWith(String(f.value ?? '').toLowerCase())
    case 'ends_with':
      return str.toLowerCase().endsWith(String(f.value ?? '').toLowerCase())
    case 'greater':
      return !isNaN(num) && num > Number(f.value)
    case 'less':
      return !isNaN(num) && num < Number(f.value)
    case 'greater_or_equal':
      return !isNaN(num) && num >= Number(f.value)
    case 'less_or_equal':
      return !isNaN(num) && num <= Number(f.value)
    case 'in': {
      const list = Array.isArray(f.value)
        ? f.value.map(v => String(v).toLowerCase())
        : String(f.value ?? '')
            .toLowerCase()
            .split(',')
            .map(s => s.trim())
      return list.includes(str.toLowerCase())
    }
    case 'not_in': {
      const list = Array.isArray(f.value)
        ? f.value.map(v => String(v).toLowerCase())
        : String(f.value ?? '')
            .toLowerCase()
            .split(',')
            .map(s => s.trim())
      return !list.includes(str.toLowerCase())
    }
    case 'is_empty':
      return raw == null || str === ''
    case 'is_not_empty':
      return raw != null && str !== ''
    case 'is_true':
      return raw === true || str.toLowerCase() === 'true'
    case 'is_false':
      return raw === false || str.toLowerCase() === 'false' || str === ''
    default:
      return true
  }
}

export function applyWidgetFilters(rows: BoardRow[], filterGroup?: ViewFilterGroup): BoardRow[] {
  if (!filterGroup || filterGroup.filters.length === 0) return rows
  return rows.filter(row => {
    const results = filterGroup.filters.map(f => matchesFilter(row, f))
    return filterGroup.connector === 'or' ? results.some(Boolean) : results.every(Boolean)
  })
}

export const Hint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="gba:text-[10px] gba:leading-tight gba:text-muted-foreground gba:mt-0.5">{children}</p>
)

export const HINTS = {
  widgetType:
    'KPI = single number, Chart = categories, Multi-Series = compare metrics, Time Series = trends over time, Scatter = correlations, Histogram = distributions, Table = raw data.',
  title: 'A short label shown above the widget.',

  kpiColumn: 'The column whose values will be aggregated.',
  kpiAggregation: 'How to combine values. Count = rows, Sum = total, Avg = average, Min/Max = extremes.',
  kpiFormat: 'Display format. Currency adds $, Percentage adds %.',

  chartType: 'Bar = vertical bars, Line = connected points, Area = filled line, Pie/Donut = circular segments.',
  chartGroupBy: 'Column used to create categories along the horizontal axis.',
  chartValue: 'Numeric column to measure for each category.',
  chartAgg: 'How to combine values when multiple rows share the same category.',
  chartSort: 'Order categories by their computed value or label.',
  chartLimit: 'Only show the top N categories. Leave empty to show all.',

  multiChartType: 'Multi = separate series side by side. Stacked = series layered on top of each other.',
  multiGroupBy: 'Column that defines the X-axis categories.',
  multiBreakdown: 'Optional second grouping that splits each series into sub-groups.',
  multiTimeBucket: 'If the group-by column is a date, bucket values into time periods.',
  multiSeries: 'Each series is a separate metric on the chart. Add multiple to compare.',
  multiSort: 'Order the groups by their total value.',
  multiLimit: 'Only show the top N groups. Leave empty to show all.',

  tsDate: 'The date or datetime column used as the time axis.',
  tsBucket: 'How to group dates. Day = daily, Week = weekly, Month = monthly, etc.',
  tsChartType: 'Visual style for the trend line.',
  tsSeries: 'Each series is a metric plotted over time. Add the label to customise legend text.',

  scatterX: 'Numeric column for the horizontal axis.',
  scatterY: 'Numeric column for the vertical axis.',
  scatterLabel: 'Optional column shown as a tooltip for each point.',
  scatterSize: 'Optional numeric column that controls dot size (bubble chart).',
  scatterColor: 'Optional categorical column that colors dots by group.',

  histColumn: 'The numeric column whose distribution to visualise.',
  histBins: 'Number of equal-width buckets. More bins = finer detail.',

  width: 'Grid columns the widget spans. 1 = narrow, 4 = full width.',

  tableCols: 'Select which columns appear in the table.',
  tableLimit: 'Maximum number of rows to display.',
  tableSort: 'Column to sort the table rows by.',
  tableSortDir: 'Sort ascending (A-Z, 0-9) or descending (Z-A, 9-0).',

  seriesAgg: 'Count = number of rows, Sum = total, Avg = average, Min = smallest, Max = largest.',

  filter: 'Narrow the data this widget sees. E.g., only rows where Status = "Converted".'
} as const
