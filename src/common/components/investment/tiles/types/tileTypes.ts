/**
 * Tile Types and Interfaces for Investment KPI Tiles
 *
 * These tiles allow users to create custom information cards
 * for tracking additional data in investment records.
 */

// Tile type constants
export const TILE_TYPES = {
  TEXT: 'text',
  KPI: 'kpi',
  TABLE: 'table', // Future
  CHART: 'chart' // Future
} as const

export type TileType = (typeof TILE_TYPES)[keyof typeof TILE_TYPES]

/**
 * Tile data structure stored in investment.additionalProperties.tilesData
 */
export interface TileData {
  /** Unique identifier (UUID) */
  id: string

  /** Type of tile */
  type: TileType

  /** Tile header/title */
  title: string

  /** Display order */
  order: number

  /** ISO timestamp of creation */
  createdAt: string

  /** ISO timestamp of last update */
  updatedAt: string

  /** User ID of the tile creator (for filtering) */
  createdBy: string

  // Type-specific data fields

  /** Text content for TEXT tiles */
  textContent?: string

  /** Numeric value for KPI tiles */
  kpiValue?: number

  /** Unit suffix for KPI tiles (e.g., "x", "%", "$") */
  kpiUnit?: string

  /** Table data for TABLE tiles */
  tableData?: TableData

  /** Chart configuration for CHART tiles */
  chartData?: ChartData
}

/**
 * Table data structure for TABLE tiles
 */
export interface TableData {
  /** Table rows - array of row objects */
  rows: TableRow[]

  /** Column definitions */
  columns: TableColumn[]
}

/**
 * Table row interface
 */
export interface TableRow {
  /** Unique row identifier */
  id: string

  /** Cell values - key is column id, value is cell content */
  cells: Record<string, string>
}

/**
 * Table column interface
 */
export interface TableColumn {
  /** Unique column identifier */
  id: string

  /** Column header/label */
  label: string
}

/**
 * Display tile interface for UI rendering
 * Extends TileData with UI-specific properties
 */
export interface DisplayTile extends TileData {
  /** Whether this tile is currently being edited */
  isEditing?: boolean

  /** Whether this is a newly created tile */
  isNew?: boolean
}

/**
 * Chart type constants
 */
export const CHART_TYPES = {
  PIE: 'pie',
  BAR: 'bar',
  LINE: 'line'
} as const

export type ChartType = (typeof CHART_TYPES)[keyof typeof CHART_TYPES]

/**
 * Chart data structure for CHART tiles
 */
export interface ChartData {
  /** Type of chart */
  chartType: ChartType

  /** Data for pie charts */
  pieData?: PieChartData[]

  /** Data for bar charts */
  barData?: BarChartData

  /** Data for line charts */
  lineData?: LineChartData
}

/**
 * Pie chart data item
 */
export interface PieChartData {
  /** Unique identifier */
  id: string

  /** Item name/label */
  name: string

  /** Percentage value (0-100) */
  percentage: number
}

/**
 * Bar chart data structure
 */
export interface BarChartData {
  /** X-axis label/name */
  xAxisName?: string

  /** Y-axis label/name */
  yAxisName?: string

  /** X-axis data points */
  xAxis: BarChartAxisData[]

  /** Y-axis data points */
  yAxis: BarChartAxisData[]
}

/**
 * Bar chart axis data point
 */
export interface BarChartAxisData {
  /** Unique identifier */
  id: string

  /** Point name/label */
  name: string

  /** Numeric amount */
  amount: number
}

/**
 * Line chart data structure
 */
export interface LineChartData {
  /** X-axis label/name */
  xAxisName?: string

  /** Y-axis label/name */
  yAxisName?: string

  /** X-axis data points */
  xAxis: LineChartAxisData[]

  /** Y-axis data points */
  yAxis: LineChartAxisData[]
}

/**
 * Line chart axis data point
 */
export interface LineChartAxisData {
  /** Unique identifier */
  id: string

  /** Point name/label */
  name: string

  /** Numeric amount */
  amount: number
}
