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
}

export interface CalendarViewConfig {
  type: 'calendar'
  dateColumn: string
  titleColumn: string
  endDateColumn?: string
  colorColumn?: string
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

export interface DashboardWidget {
  id: string
  type: 'kpi' | 'chart' | 'table'
  title: string
  config: KpiWidgetConfig | ChartWidgetConfig | TableWidgetConfig
  position: { x: number; y: number; w: number; h: number }
}

export interface KpiWidgetConfig {
  type: 'kpi'
  column: string
  aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max'
  format?: 'number' | 'currency' | 'percentage'
}

export interface ChartWidgetConfig {
  type: 'chart'
  chartType: 'bar' | 'line' | 'pie' | 'donut' | 'area'
  xAxis: string
  yAxis: string
  aggregation?: 'sum' | 'avg' | 'count'
}

export interface TableWidgetConfig {
  type: 'table'
  columns: string[]
  limit?: number
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
  | 'greater'
  | 'less'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'between'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'
