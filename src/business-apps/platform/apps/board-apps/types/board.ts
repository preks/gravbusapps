/**
 * Core Board types.
 *
 * Boards reuse the spreadsheet storage model (nw_docs.spreadsheet_apps/sheets/rows)
 * but are isolated by app_kind='board' and have board-specific extensions
 * (groups, subitems, cross-board relations, row pages, audit events).
 */

import type { EntityDataSource } from '../../../../core/office/apps/spreadsheets/types/entityDataSource'
import type { BoardColumn } from './columns'
import type { BoardView, ViewFilterOperator } from './views'

export type BoardStatus = 'draft' | 'promoted' | 'archived'

export interface Board {
  id: string
  name: string
  description?: string
  icon?: string
  status: BoardStatus
  settings: BoardSettings
  sheets: BoardSheet[]
  relationships: BoardRelationship[]
  ownerId: string
  spaceId?: string
  folderId?: string | null
  permission?: 'owner' | 'view' | 'edit' | 'comment' | 'admin'
  isShared?: boolean
  sharedBy?: string
  createdAt: string
  updatedAt: string
}

export interface BoardSettings {
  density?: 'compact' | 'comfortable' | 'spacious'
  defaultViewId?: string
  aiSettings?: Record<string, unknown>
}

export interface BoardSheet {
  id: string
  name: string
  description?: string
  columns: BoardColumn[]
  views: BoardView[]
  groups: BoardGroup[]
  settings: BoardSheetSettings
  entityDataSource?: EntityDataSource
  chartConfigs?: ChartConfig[]
  position: number
}

export interface BoardSheetSettings {
  allowAdd: boolean
  allowEdit: boolean
  allowDelete: boolean
  allowExport: boolean
  allowImport: boolean
  rowsPerPage: number
  showRowNumbers: boolean
  quickFilters?: BoardQuickFilter[]
}

export interface BoardQuickFilter {
  id: string
  name: string
  column: string
  operator: ViewFilterOperator
  value?: unknown
  secondValue?: unknown
}

export interface BoardGroup {
  id: string
  name: string
  order: number
  collapsed?: boolean
  colorToken?: string
}

export interface BoardRow {
  id: string
  data: Record<string, unknown>
  groupId?: string | null
  parentRowId?: string | null
  createdBy?: string
  updatedBy?: string
  createdAt?: string
  updatedAt?: string
}

export interface BoardRelationship {
  fromSheet: string
  fromColumn: string
  toSheet: string
  toColumn: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
}

export interface ChartConfig {
  id: string
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter'
  title: string
  xAxis: { column: string; label?: string }
  yAxis: { column: string; label?: string }
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  groupBy?: string
  colors?: string[]
}

export interface BoardSummary {
  id: string
  name: string
  description?: string
  icon?: string
  status: BoardStatus
  sheetCount: number
  rowCount: number
  createdAt: string
  updatedAt: string
  permission?: string
  isShared?: boolean
  sharedBy?: string
}

export interface MyWorkItem {
  rowId: string
  boardId: string
  boardName: string
  boardIcon?: string
  sheetId: string
  sheetName: string
  title: string
  status?: string
  statusColor?: string
  deadline?: string
  updatedAt: string
}

export interface MyWorkResponse {
  overdue: MyWorkItem[]
  dueToday: MyWorkItem[]
  dueThisWeek: MyWorkItem[]
  upcoming: MyWorkItem[]
  blocked: MyWorkItem[]
  recentlyCompleted: MyWorkItem[]
  totalAssigned: number
}

export interface BoardStatsResponse {
  totalBoards: number
  totalRows: number
  sharedBoards: number
  activeThisWeek: number
  overdueItems: number
  boardsByStatus: { draft: number; promoted: number; archived: number }
}

export interface BoardShare {
  id: string
  userId: string
  userName?: string
  userEmail?: string
  permission: 'view' | 'edit' | 'comment'
  sharedAt: string
  sharedBy: string
}

export type BoardPermission = 'view' | 'edit' | 'comment'

export type { EntityDataSource }
