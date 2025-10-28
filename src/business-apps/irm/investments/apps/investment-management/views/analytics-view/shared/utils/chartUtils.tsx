/**
 * @module shared/utils/chartUtils
 * @description Chart configuration and formatting utilities for analytics views.
 * Provides consistent chart styling, colors, and helper functions.
 */

/**
 * Standard chart colors used across all analytics views.
 * Provides a consistent color palette for visualizations.
 */
export const CHART_COLORS = [
  '#8884d8', // Blue
  '#82ca9d', // Green
  '#ffc658', // Yellow/Orange
  '#ff7c7c', // Red
  '#8dd1e1', // Light Blue
  '#a4de6c', // Light Green
  '#d084d0', // Purple
  '#ff9f9f', // Pink
  '#c9c9c9', // Gray
  '#6b7280' // Dark Gray
] as const

/**
 * Semantic colors for specific chart types
 */
export const SEMANTIC_COLORS = {
  success: '#52c41a',
  warning: '#faad14',
  error: '#ff4d4f',
  info: '#1890ff',
  primary: '#8884d8',
  secondary: '#82ca9d'
} as const

/**
 * @function getChartColor
 * @description Gets a chart color by index, cycling through available colors.
 *
 * @param {number} index - The index of the color to retrieve
 * @returns {string} The hex color code
 *
 * @example
 * getChartColor(0) // Returns: '#8884d8'
 * getChartColor(10) // Returns: '#8884d8' (cycles back)
 */
export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length]
}

/**
 * @function createChartConfig
 * @description Creates a chart configuration object for recharts components.
 *
 * @param {Record<string, { label: string; color?: string }>} items - Chart items with labels and optional colors
 * @returns {Record<string, { label: string; color: string }>} Chart configuration with assigned colors
 *
 * @example
 * createChartConfig({
 *   equity: { label: 'Equity Investments' },
 *   debt: { label: 'Debt Investments', color: '#ff0000' }
 * })
 * // Returns: {
 * //   equity: { label: 'Equity Investments', color: '#8884d8' },
 * //   debt: { label: 'Debt Investments', color: '#ff0000' }
 * // }
 */
export function createChartConfig(
  items: Record<string, { label: string; color?: string }>
): Record<string, { label: string; color: string }> {
  const config: Record<string, { label: string; color: string }> = {}
  let colorIndex = 0

  for (const key of Object.keys(items)) {
    const item = items[key]
    config[key] = {
      label: item.label,
      color: item.color || getChartColor(colorIndex++)
    }
  }

  return config
}

/**
 * @function renderCustomizedLabel
 * @description Renders a customized label for pie charts with percentage display.
 *
 * @param {object} props - Label properties from recharts
 * @param {number} props.cx - Center X coordinate
 * @param {number} props.cy - Center Y coordinate
 * @param {number} props.midAngle - Middle angle of the slice
 * @param {number} props.innerRadius - Inner radius
 * @param {number} props.outerRadius - Outer radius
 * @param {number} props.percent - Percentage value (0-1)
 * @param {number} [props.index] - Index of the slice
 * @returns {JSX.Element | null} SVG text element or null if percentage is too small
 *
 * @example
 * <Pie
 *   data={data}
 *   labelLine={false}
 *   label={renderCustomizedLabel}
 * />
 */
export function renderCustomizedLabel(props: {
  cx: number
  cy: number
  midAngle: number
  innerRadius: number
  outerRadius: number
  percent: number
  index?: number
}): JSX.Element | null {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props
  const RADIAN = Math.PI / 180

  // Don't show label if percentage is too small
  if (percent < 0.05) return null

  const radius = innerRadius + (outerRadius - innerRadius) * 0.5
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="var(--nw-color-white)"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize="12"
      fontWeight="bold"
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

/**
 * @function formatChartNumber
 * @description Formats numbers for chart display (axes, tooltips).
 *
 * @param {number} value - The value to format
 * @param {object} [options] - Formatting options
 * @param {'compact' | 'standard'} [options.notation='compact'] - Number notation
 * @param {number} [options.decimals=0] - Number of decimal places
 * @returns {string} Formatted number string
 *
 * @example
 * formatChartNumber(1234567) // Returns: "1.2M"
 * formatChartNumber(1234567, { notation: 'standard' }) // Returns: "1,234,567"
 * formatChartNumber(123.456, { decimals: 2 }) // Returns: "123.46"
 */
export function formatChartNumber(
  value: number,
  options: {
    notation?: 'compact' | 'standard'
    decimals?: number
  } = {}
): string {
  const { notation = 'compact', decimals = 0 } = options

  return new Intl.NumberFormat('en-US', {
    notation,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    compactDisplay: 'short'
  }).format(value)
}

/**
 * @function formatChartPercentage
 * @description Formats percentage values for chart display.
 *
 * @param {number} value - The percentage value (0-100 or 0-1)
 * @param {object} [options] - Formatting options
 * @param {boolean} [options.isDecimal=false] - Whether input is decimal (0-1) vs percentage (0-100)
 * @param {number} [options.decimals=0] - Number of decimal places
 * @returns {string} Formatted percentage string
 *
 * @example
 * formatChartPercentage(45.5) // Returns: "46%"
 * formatChartPercentage(0.455, { isDecimal: true, decimals: 1 }) // Returns: "45.5%"
 */
export function formatChartPercentage(
  value: number,
  options: {
    isDecimal?: boolean
    decimals?: number
  } = {}
): string {
  const { isDecimal = false, decimals = 0 } = options
  const percentage = isDecimal ? value * 100 : value

  return `${percentage.toFixed(decimals)}%`
}

/**
 * @function calculateChartDimensions
 * @description Calculates optimal chart dimensions based on container and data.
 *
 * @param {object} options - Dimension options
 * @param {number} [options.containerWidth] - Container width in pixels
 * @param {number} [options.containerHeight] - Container height in pixels
 * @param {number} [options.dataPoints] - Number of data points
 * @param {number} [options.minBarWidth=40] - Minimum bar width for bar charts
 * @returns {{ width: number; height: number }} Calculated dimensions
 *
 * @example
 * calculateChartDimensions({
 *   containerWidth: 800,
 *   containerHeight: 400,
 *   dataPoints: 10
 * }) // Returns: { width: 800, height: 400 }
 */
export function calculateChartDimensions(options: {
  containerWidth?: number
  containerHeight?: number
  dataPoints?: number
  minBarWidth?: number
}): { width: number; height: number } {
  const { containerWidth = 600, containerHeight = 400, dataPoints = 10, minBarWidth = 40 } = options

  // Calculate minimum width needed for bar charts
  const minWidth = dataPoints * minBarWidth

  return {
    width: Math.max(containerWidth, minWidth),
    height: containerHeight
  }
}

/**
 * @function generateChartTooltipContent
 * @description Generates formatted content for chart tooltips.
 *
 * @template T - The data type
 * @param {T} data - The data object for the tooltip
 * @param {Array<{ key: keyof T; label: string; format?: (value: any) => string }>} fields - Fields to display in tooltip
 * @returns {Array<{ label: string; value: string }>} Formatted tooltip content
 *
 * @example
 * generateChartTooltipContent(
 *   { name: 'Investment A', amount: 1000000, percentage: 0.25 },
 *   [
 *     { key: 'name', label: 'Investment' },
 *     { key: 'amount', label: 'Amount', format: (v) => formatCurrency(v, 'EUR') },
 *     { key: 'percentage', label: 'Share', format: (v) => `${(v * 100).toFixed(1)}%` }
 *   ]
 * )
 * // Returns: [
 * //   { label: 'Investment', value: 'Investment A' },
 * //   { label: 'Amount', value: '€1.0M' },
 * //   { label: 'Share', value: '25.0%' }
 * // ]
 */
export function generateChartTooltipContent<T>(
  data: T,
  fields: Array<{ key: keyof T; label: string; format?: (value: any) => string }>
): Array<{ label: string; value: string }> {
  return fields.map(field => ({
    label: field.label,
    value: field.format ? field.format(data[field.key]) : String(data[field.key] ?? '')
  }))
}

/**
 * @function getContrastColor
 * @description Gets a contrasting text color (black or white) for a given background color.
 *
 * @param {string} hexColor - Hex color code (e.g., "#8884d8")
 * @returns {'#000000' | '#ffffff'} Black or white hex color
 *
 * @example
 * getContrastColor('#8884d8') // Returns: '#ffffff'
 * getContrastColor('#ffc658') // Returns: '#000000'
 */
export function getContrastColor(hexColor: string): '#000000' | '#ffffff' {
  // Remove # if present
  const hex = hexColor.replace('#', '')

  // Convert to RGB
  const r = Number.parseInt(hex.slice(0, 2), 16)
  const g = Number.parseInt(hex.slice(2, 4), 16)
  const b = Number.parseInt(hex.slice(4, 6), 16)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Return black for light backgrounds, white for dark backgrounds
  return luminance > 0.5 ? '#000000' : '#ffffff'
}
