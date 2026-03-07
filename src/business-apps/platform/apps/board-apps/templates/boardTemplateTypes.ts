import type {
  BoardColumn,
  BoardColumnType,
  BoardView,
  BoardGroup,
  Board,
  BoardSheet,
  DashboardWidget,
  DashboardViewConfig,
  KpiWidgetConfig,
  ChartWidgetConfig
} from '../types'

export interface TemplateSheetConfig {
  name: string
  description?: string
  columns: Partial<BoardColumn>[]
  views: Partial<BoardView>[]
  groups?: Partial<BoardGroup>[]
  getSeedRows: () => Record<string, unknown>[]
}

export interface TemplateConfig {
  id: string
  name: string
  description: string
  iconName: string
  sheets: TemplateSheetConfig[]
}

export function daysFromNow(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export function col(
  id: string,
  label: string,
  type: BoardColumnType,
  order: number,
  opts?: Partial<BoardColumn>
): Partial<BoardColumn> {
  return {
    id,
    name: id,
    label,
    type,
    order,
    isVisible: true,
    isEditable: true,
    isRequired: false,
    isUnique: false,
    ...opts
  }
}

export function statusCol(
  id: string,
  label: string,
  order: number,
  options: Array<{ value: string; label: string; colorToken: string }>,
  doneValues?: string[]
): Partial<BoardColumn> {
  return col(id, label, 'status', order, {
    selectOptions: options,
    statusConfig: doneValues ? { doneValues, blockedValues: [] } : undefined
  })
}

export function selectCol(
  id: string,
  label: string,
  order: number,
  options: Array<{ value: string; label: string; colorToken: string }>
): Partial<BoardColumn> {
  return col(id, label, 'select', order, { selectOptions: options })
}

export function priorityCol(
  id: string,
  label: string,
  order: number,
  options?: Array<{ value: string; label: string; colorToken: string }>
): Partial<BoardColumn> {
  const defaultOpts = [
    { value: 'low', label: 'Low', colorToken: 'muted' },
    { value: 'medium', label: 'Medium', colorToken: 'info' },
    { value: 'high', label: 'High', colorToken: 'warning' },
    { value: 'critical', label: 'Critical', colorToken: 'destructive' }
  ]
  return col(id, label, 'priority', order, { selectOptions: options || defaultOpts })
}

export function kpiWidget(
  id: string,
  title: string,
  column: string,
  aggregation: KpiWidgetConfig['aggregation'],
  w: number = 1,
  format?: KpiWidgetConfig['format']
): DashboardWidget {
  return {
    id,
    type: 'kpi',
    title,
    config: { type: 'kpi', column, aggregation, format },
    position: { x: 0, y: 0, w, h: 1 }
  }
}

export function chartWidget(
  id: string,
  title: string,
  chartType: ChartWidgetConfig['chartType'],
  xAxis: string,
  yAxis: string,
  w: number = 2,
  aggregation?: ChartWidgetConfig['aggregation']
): DashboardWidget {
  return {
    id,
    type: 'chart',
    title,
    config: { type: 'chart', chartType, xAxis, yAxis, aggregation },
    position: { x: 0, y: 0, w, h: 1 }
  }
}

export function dashboardView(id: string, widgets: DashboardWidget[]): Partial<BoardView> {
  return {
    id,
    name: 'Dashboard',
    type: 'dashboard',
    isDefault: false,
    config: { type: 'dashboard', widgets } as DashboardViewConfig
  }
}

const DEFAULT_SETTINGS: BoardSheet['settings'] = {
  allowAdd: true,
  allowEdit: true,
  allowDelete: true,
  allowExport: true,
  allowImport: true,
  rowsPerPage: 50,
  showRowNumbers: false
}

export function buildBoardFromTemplate(tpl: TemplateConfig): Partial<Board> {
  return {
    name: tpl.name,
    sheets: tpl.sheets.map((sheet, idx) => ({
      id: '',
      name: sheet.name,
      description: sheet.description || '',
      position: idx,
      columns: sheet.columns.map((c, ci) => ({
        id: c.id || `col_${ci}`,
        name: c.name || `col_${ci}`,
        label: c.label || c.name || `Column ${ci + 1}`,
        type: c.type || 'text',
        order: c.order ?? ci,
        isPrimary: c.isPrimary,
        isVisible: c.isVisible ?? true,
        isEditable: c.isEditable ?? true,
        isRequired: c.isRequired ?? false,
        isUnique: c.isUnique ?? false,
        selectOptions: c.selectOptions,
        statusConfig: c.statusConfig,
        peopleConfig: c.peopleConfig
      })) as BoardColumn[],
      views: sheet.views.map((v, vi) => ({
        id: v.id || `v_${vi}`,
        name: v.name || `View ${vi + 1}`,
        type: v.type || 'table',
        isDefault: v.isDefault ?? vi === 0,
        config: v.config || { type: 'table' }
      })) as BoardView[],
      groups: (sheet.groups || []).map((g, gi) => ({
        id: g.id || `grp_${gi}`,
        name: g.name || `Group ${gi + 1}`,
        order: g.order ?? gi,
        colorToken: g.colorToken
      })) as BoardGroup[],
      settings: DEFAULT_SETTINGS
    }))
  }
}
