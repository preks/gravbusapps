/**
 * View type definitions for Boards.
 *
 * Each view is a saved configuration that renders the same sheet data
 * through a different lens (table, kanban, calendar, timeline, form, dashboard).
 */

export type BoardViewType = 'table' | 'kanban' | 'calendar' | 'timeline' | 'form' | 'dashboard'

export interface BoardView {
  id: string
  name: string
  type: BoardViewType
  isDefault: boolean
  config: ViewConfig
}

export type ViewConfig =
  | TableViewConfig
  | KanbanViewConfig
  | CalendarViewConfig
  | TimelineViewConfig
  | FormViewConfig
  | DashboardViewConfig

export interface TableViewConfig {
  type: 'table'
  columns?: string[]
  density?: 'compact' | 'comfortable' | 'spacious'
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  groupBy?: string
  filters?: ViewFilter[]
  pinnedColumns?: string[]
}

export interface KanbanViewConfig {
  type: 'kanban'
  statusColumn: string
  titleColumn: string
  descriptionColumn?: string
  coverImageColumn?: string
  cardFields?: string[]
}

export interface CalendarViewConfig {
  type: 'calendar'
  dateColumn: string
  titleColumn: string
  endDateColumn?: string
  colorColumn?: string
}

export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF'

export interface DependencyMeta {
  [predecessorRowId: string]: DependencyType
}

export interface TimelineViewConfig {
  type: 'timeline'
  startDateColumn: string
  endDateColumn: string
  titleColumn: string
  groupByColumn?: string
  dependencyColumn?: string
}

export interface FormViewConfig {
  type: 'form'
  fields: string[]
  layout: 'single' | 'two-column' | 'sections'
  submitLabel?: string
  successMessage?: string
}

export interface DashboardViewConfig {
  type: 'dashboard'
  widgets: DashboardWidget[]
}

export type WidgetConfigType =
  | KpiWidgetConfig
  | ChartWidgetConfig
  | TableWidgetConfig
  | MultiSeriesChartWidgetConfig
  | TimeSeriesWidgetConfig
  | ScatterWidgetConfig
  | HistogramWidgetConfig

export interface DashboardWidget {
  id: string
  type: 'kpi' | 'chart' | 'table' | 'multi_chart' | 'timeseries' | 'scatter' | 'histogram'
  title: string
  config: WidgetConfigType
  position: { x: number; y: number; w: number; h: number }
  filters?: ViewFilterGroup
}

export interface KpiWidgetConfig {
  type: 'kpi'
  column: string
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'
  format?: 'number' | 'currency' | 'percentage'
  compareTo?: { mode: 'previousPeriod' | 'target'; target?: number; dateColumn?: string }
  sparkline?: { dateColumn: string; bucket: 'day' | 'week' | 'month' }
}

export interface ChartWidgetConfig {
  type: 'chart'
  chartType: 'bar' | 'line' | 'pie' | 'donut' | 'area'
  xAxis: string
  yAxis: string
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  sortBy?: 'value' | 'label'
  sortDirection?: 'asc' | 'desc'
  limit?: number
}

export interface MultiSeriesChartWidgetConfig {
  type: 'multi_chart'
  chartType: 'bar' | 'line' | 'area' | 'stacked_bar' | 'stacked_area'
  groupBy: string
  series: Array<{ column: string; aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'; label?: string }>
  breakdown?: string
  timeBucket?: 'day' | 'week' | 'month' | 'quarter' | 'year'
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
  limit?: number
}

export interface TimeSeriesWidgetConfig {
  type: 'timeseries'
  dateColumn: string
  bucket: 'day' | 'week' | 'month' | 'quarter' | 'year'
  series: Array<{ column: string; aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'; label?: string }>
  chartType?: 'line' | 'area' | 'bar'
  breakdown?: string
}

export interface ScatterWidgetConfig {
  type: 'scatter'
  xColumn: string
  yColumn: string
  labelColumn?: string
  sizeColumn?: string
  colorColumn?: string
}

export interface HistogramWidgetConfig {
  type: 'histogram'
  column: string
  bins?: number
}

export interface TableWidgetConfig {
  type: 'table'
  columns: string[]
  limit?: number
  sortBy?: string
  sortDirection?: 'asc' | 'desc'
}

export interface ViewFilter {
  id: string
  column: string
  operator: ViewFilterOperator
  value: unknown
  secondValue?: unknown
}

export type ViewFilterOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater'
  | 'less'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'
  | 'is_true'
  | 'is_false'
  | 'is_today'
  | 'is_this_week'
  | 'is_this_month'
  | 'is_before'
  | 'is_after'

export type FilterConnector = 'and' | 'or'

export interface ViewFilterGroup {
  connector: FilterConnector
  filters: ViewFilter[]
}

export interface ViewSort {
  id: string
  column: string
  direction: 'asc' | 'desc'
}
