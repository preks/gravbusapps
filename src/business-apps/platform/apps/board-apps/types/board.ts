/**
 * Core Board types.
 *
 * Boards reuse the spreadsheet storage model (nw_docs.spreadsheet_apps/sheets/rows)
 * but are isolated by app_kind='board' and have board-specific extensions
 * (groups, subitems, cross-board relations, row pages, audit events).
 */

import type { EntityDataSource } from '../../spreadsheet-apps/types/entityDataSource'
import type { BoardColumn } from './columns'
import type { BoardView } from './views'

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

export type { EntityDataSource }
