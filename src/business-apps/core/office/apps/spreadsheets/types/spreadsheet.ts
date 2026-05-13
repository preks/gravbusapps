/**
 * Excel-to-App Types
 *
 * Core type definitions for the spreadsheet-to-app transformation feature.
 * These types define the structure for parsing, analyzing, and rendering
 * business applications generated from Excel files.
 */

import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
export type {
  Version,
  Comment,
  FileLock,
  PublishStatus,
  PublishMetadata
} from '../../../../../platform/apps/shared/types/versioning'
import type { EntityDataSource } from './entityDataSource'
import type { SpreadsheetAutomation, WorkflowRowLink, WorkflowStatusColumnConfig } from './automation'

// ============================================================================
// Excel Parsing Types
// ============================================================================

/**
 * Raw parsed data from an Excel file
 */
export interface ParsedExcelFile {
  fileName: string
  fileSize: number
  sheets: ParsedSheet[]
  metadata: ExcelMetadata
}

export interface SpreadsheetMergeRange {
  startRow: number
  startColumn: number
  endRow: number
  endColumn: number
}

/**
 * A single parsed sheet from the Excel file
 */
export interface ParsedSheet {
  name: string
  index: number
  columns: ParsedColumn[]
  rows: Record<string, unknown>[] // row may include _height for row height preservation
  mergeData?: SpreadsheetMergeRange[]
  rowCount: number
  isEmpty: boolean
}

/**
 * Column information extracted from the sheet
 */
export interface ParsedColumn {
  name: string
  index: number
  sampleValues: unknown[]
  hasFormula: boolean
  formula?: string
  width?: number
}

/**
 * Excel file metadata
 */
export interface ExcelMetadata {
  author?: string
  createdAt?: string
  modifiedAt?: string
  sheetCount: number
}

// ============================================================================
// AI Analysis Types
// ============================================================================

/**
 * Complete AI analysis result for the entire Excel file
 */
export interface SpreadsheetAnalysis {
  sheets: SheetAnalysis[]
  relationships: SheetRelationship[]
  suggestedAppType: AppType
  suggestedAppName: string
  confidence: number
}

/**
 * AI analysis result for a single sheet
 */
export interface SheetAnalysis {
  name: string
  purpose: string
  columns: ColumnAnalysis[]
  suggestedViews: SuggestedView[]
  primaryKeyColumn?: string
  isLookupTable: boolean
}

/**
 * Detected column type and metadata
 */
export interface ColumnAnalysis {
  name: string
  detectedType: ColumnType
  isRequired: boolean
  isUnique: boolean
  sampleValues: unknown[]
  selectOptions?: string[]
  formula?: string
  description?: string
  validation?: ColumnValidation
}

/**
 * Column types that can be detected
 */
export type ColumnType =
  | 'text'
  | 'number'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'email'
  | 'phone'
  | 'url'
  | 'select'
  | 'multiselect'
  | 'boolean'
  | 'calculated'
  | 'reference'
  | 'workflow_status' // Displays linked workflow status
  | 'image' // Displays an image (e.g., avatar)

/**
 * Validation rules for a column
 */
export interface ColumnValidation {
  required?: boolean
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  message?: string
}

/**
 * Relationship between sheets (foreign key style)
 */
export interface SheetRelationship {
  fromSheet: string
  fromColumn: string
  toSheet: string
  toColumn: string
  type: 'one-to-one' | 'one-to-many' | 'many-to-many'
}

/**
 * Suggested view for a sheet
 */
export interface SuggestedView {
  type: ViewType
  name: string
  description: string
  config: ViewConfig
}

/**
 * Types of views that can be generated
 */
export type ViewType = 'table' | 'form' | 'dashboard' | 'kanban' | 'calendar'

/**
 * Configuration for different view types
 */
export type ViewConfig = TableViewConfig | FormViewConfig | DashboardViewConfig | KanbanViewConfig | CalendarViewConfig

export interface TableViewConfig {
  type: 'table'
  columns: string[]
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  groupBy?: string
  filters?: TableFilter[]
}

export interface FormViewConfig {
  type: 'form'
  fields: string[]
  layout?: 'single' | 'two-column' | 'sections'
}

export interface DashboardViewConfig {
  type: 'dashboard'
  widgets: DashboardWidget[]
}

export interface KanbanViewConfig {
  type: 'kanban'
  statusColumn: string
  titleColumn: string
  descriptionColumn?: string
}

export interface CalendarViewConfig {
  type: 'calendar'
  dateColumn: string
  titleColumn: string
  endDateColumn?: string
}

export interface TableFilter {
  column: string
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between'
  value: unknown
}

export interface DashboardWidget {
  type: 'kpi' | 'chart' | 'table'
  title: string
  config: KpiWidgetConfig | ChartWidgetConfig | TableWidgetConfig
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

// ============================================================================
// App Schema Types
// ============================================================================

/**
 * Overall app type classification
 */
export type AppType = 'data_grid' | 'form_table' | 'dashboard' | 'mixed'

export type AppPermission = 'owner' | 'view' | 'edit' | 'comment' | 'admin'

/**
 * Complete spreadsheet app definition
 */
export interface SpreadsheetApp {
  id: string
  name: string
  description?: string
  icon?: string
  sourceFile: SpreadsheetFileInfo
  sheets: SpreadsheetSheet[]
  relationships: SheetRelationship[]
  createdAt: string
  updatedAt: string
  createdBy: string
  status: AppStatus
  trashedAt?: string | null
  promotedEntityId?: string
  settings: AppSettings
  // Storage path (for shareable URLs)
  filePath?: string
  // Sharing metadata
  sharedWith?: Array<{
    userId: string
    permission: 'view' | 'edit'
    sharedAt: string
  }>
  // Permission info (from backend for shared apps)
  permission?: AppPermission
  isShared?: boolean
  sharedBy?: string
  isFavorite?: boolean

  // Versioning, locking, and publishing metadata
  currentVersion?: number
  lock?: FileLock
  publishMetadata?: PublishMetadata
  commentCount?: number
  hasUnresolvedComments?: boolean
}

/**
 * App status - whether data is file-based or promoted to database
 */
export type AppStatus = 'draft' | 'file_based' | 'promoted' | 'archived'

/**
 * Source file information
 */
export interface SpreadsheetFileInfo {
  fileId: string
  fileName: string
  fileSize: number
  uploadedAt: string
  mimeType: string
}

/**
 * A sheet within the app
 */
export interface SpreadsheetSheet {
  id: string
  name: string
  description?: string
  version?: number
  /** Hidden state for the native Univer worksheet tab. */
  hidden?: boolean
  /** Present on some API responses (duplicate/create) for Univer materialization. */
  worksheetSnapshot?: Record<string, unknown>
  viewType: ViewType
  columns: SpreadsheetColumn[]
  views: SheetView[]
  data: Record<string, unknown>[]
  chartConfigs?: ChartConfig[]
  settings: SheetSettings
  /**
   * Optional entity data source configuration.
   * When configured, the sheet loads data from a NEWWORK entity instead of static data.
   */
  entityDataSource?: EntityDataSource
  /**
   * Process automations configured for this sheet.
   * Enables row-level workflows, bulk collection, and approval flows.
   */
  automations?: SpreadsheetAutomation[]
  /**
   * Links between rows and their associated workflow instances.
   * Tracks workflow status for each row that has an active or completed workflow.
   */
  workflowLinks?: WorkflowRowLink[]
}

/**
 * Column definition for the app
 */
export interface SpreadsheetColumn {
  id: string
  name: string
  label: string
  type: ColumnType
  width?: number
  isVisible: boolean
  isEditable: boolean
  isRequired: boolean
  isUnique: boolean
  defaultValue?: unknown
  selectOptions?: SelectOption[]
  validation?: ColumnValidation
  formula?: string
  referenceTo?: ColumnReference
  order: number
  /**
   * Whether this is an auto-generated tracking column from bulk collection.
   * Tracking columns are displayed first and styled differently.
   */
  isTracking?: boolean
  /**
   * Configuration for workflow_status column type.
   * Defines how the linked workflow status is displayed and interacted with.
   */
  workflowStatusConfig?: WorkflowStatusColumnConfig
}

export interface SelectOption {
  value: string
  label: string
  color?: string
}

export interface ColumnReference {
  sheetId: string
  columnId: string
  displayColumn?: string
}

/**
 * A saved view configuration
 */
export interface SheetView {
  id: string
  name: string
  type: ViewType
  isDefault: boolean
  config: ViewConfig
}

/**
 * Chart configuration for dashboard views
 */
export interface ChartConfig {
  id: string
  type: 'bar' | 'line' | 'pie' | 'donut' | 'area' | 'scatter'
  title: string
  xAxis: ChartAxis
  yAxis: ChartAxis
  aggregation?: 'sum' | 'avg' | 'count' | 'min' | 'max'
  groupBy?: string
  filters?: TableFilter[]
  colors?: string[]
}

export interface ChartAxis {
  column: string
  label?: string
}

/**
 * Sheet-level settings
 */
export interface SheetSettings {
  allowAdd: boolean
  allowEdit: boolean
  allowDelete: boolean
  /** Preserved merged-cell ranges from imported spreadsheets. */
  mergeData?: SpreadsheetMergeRange[]
  /** Explicit row ordering (array of backend row UUIDs). When present, rows are sorted by this order on load. */
  rowOrder?: string[]
  allowExport: boolean
  allowImport: boolean
  rowsPerPage: number
  showRowNumbers: boolean
  /** Persisted FortuneSheet filter state (restored on reload to preserve active filters). */
  fortuneSheetFilterState?: {
    filter?: Record<string, unknown> | null
    filter_select?: Record<string, unknown>
    rowhidden?: Record<string, number>
  }
  /** Persisted FortuneSheet row/column sizing state (restored on reload after manual resize). */
  fortuneSheetLayoutState?: {
    rowlen?: Record<string, number>
    columnlen?: Record<string, number>
  }
  /** Fallback persisted state for native Univer worksheet tab visibility. */
  univerSheetHidden?: boolean
  /** Cell comments keyed by `${rowId}_${columnId}` */
  cellComments?: Record<string, { value: string }>
}

/**
 * App-level settings
 */
export interface AppSettings {
  theme?: 'light' | 'dark' | 'system'
  primaryColor?: string
  allowPublicAccess: boolean
  requireAuthentication: boolean
  /** Set when app is a copy created for Excel Collection; enables Submit button for recipient */
  excel_collection_copy?: boolean
  /** ISO timestamp set when the recipient submits their Excel Collection copy */
  excel_collection_submitted_at?: string
}

// ============================================================================
// Runtime Types
// ============================================================================

/**
 * Props for the spreadsheet app viewer
 */
export interface SpreadsheetAppViewerProps {
  app: SpreadsheetApp
  activeSheetId?: string
  activeViewId?: string
  onDataChange?: (sheetId: string, data: Record<string, unknown>[]) => void
  onRowAdd?: (
    appId: string,
    sheetId: string,
    rowData: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  onRowUpdate?: (
    appId: string,
    sheetId: string,
    rowId: string,
    updates: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  onAppUpdate?: (app: SpreadsheetApp) => void
  onLocalAppUpdate?: (updater: (app: SpreadsheetApp) => SpreadsheetApp) => void
  /** Trigger full app reload (e.g. after creating a new sheet). Optional newSheetId to switch to. */
  onAppRefreshNeeded?: (appId: string, newSheetId?: string) => Promise<void>
  onSheetUpdate?: (
    appId: string,
    sheetId: string,
    updates: Partial<SpreadsheetSheet>
  ) => Promise<SpreadsheetSheet | null>
  /**
   * Create a new real sheet on the backend. Called when Univer's native sheet-bar
   * "+" fires InsertSheetCommand; the frontend passes the Univer-chosen id so the
   * backend row and the in-memory workbook stay in sync.
   */
  onSheetAdd?: (
    appId: string,
    sheet?: Partial<SpreadsheetSheet> & { worksheetSnapshot?: Record<string, unknown> }
  ) => Promise<SpreadsheetSheet | null>
  onSheetDuplicate?: (
    appId: string,
    sourceSheetId: string,
    sheet: { id?: string; name: string; visualWorksheetSnapshot?: Record<string, unknown> }
  ) => Promise<SpreadsheetSheet | null>
  /**
   * Delete a real sheet on the backend. Called when Univer fires RemoveSheetCommand.
   */
  onSheetDelete?: (appId: string, sheetId: string) => Promise<boolean>
  onBack?: () => void
  /** Header breadcrumb (Spreadsheets home): spreadsheet hub only. Falls back to onBack when omitted. */
  onNavigateToSpreadsheetHub?: () => void
  onShare?: () => void
  onEdit?: () => void
  isEditing?: boolean
  isTrashedApp?: boolean
  accessToken?: string
  userId?: string
  'data-testid'?: string
}

/**
 * Props for the spreadsheet app editor
 */
export interface SpreadsheetAppEditorProps {
  app: SpreadsheetApp
  onSave: (app: SpreadsheetApp) => Promise<void>
  onCancel: () => void
}

/**
 * State for managing row selection
 */
export interface RowSelectionState {
  selectedRows: Set<string>
  lastSelectedIndex: number | null
}

/**
 * State for managing column sorting
 */
export interface SortState {
  column: string | null
  direction: 'asc' | 'desc'
}

/**
 * State for managing filters
 */
export interface FilterState {
  filters: Record<string, FilterValue>
}

export interface FilterValue {
  operator: 'equals' | 'contains' | 'greater' | 'less' | 'between' | 'isEmpty' | 'isNotEmpty'
  value: unknown
  secondValue?: unknown // For 'between' operator
}

// ============================================================================
// Conversion Utilities Types
// ============================================================================

/**
 * Maps ColumnType to DynamicFormField type
 */
export const columnTypeToDynamicFormType: Record<ColumnType, DynamicFormField['type']> = {
  text: 'TEXT',
  number: 'NUMBER',
  currency: 'NUMBER',
  percentage: 'NUMBER',
  date: 'DATE',
  datetime: 'DATETIME',
  email: 'EMAIL',
  phone: 'TEXT',
  url: 'URL',
  select: 'SELECT',
  multiselect: 'MULTISELECT',
  boolean: 'CHECKBOX',
  calculated: 'TEXT',
  reference: 'SELECT'
}

/**
 * Convert a SpreadsheetColumn to DynamicFormField
 */
export function columnToFormField(column: SpreadsheetColumn, order: number): DynamicFormField {
  return {
    name: column.id,
    label: column.label,
    type: columnTypeToDynamicFormType[column.type],
    required: column.isRequired,
    placeholder: `Enter ${column.label.toLowerCase()}`,
    description: undefined,
    order,
    options: column.selectOptions?.map(opt => ({
      value: opt.value,
      label: opt.label
    })),
    validation: column.validation
      ? [
          ...(column.validation.required
            ? [{ type: 'required' as const, message: `${column.label} is required` }]
            : []),
          ...(column.validation.min !== undefined
            ? [{ type: 'min' as const, value: column.validation.min, message: column.validation.message }]
            : []),
          ...(column.validation.max !== undefined
            ? [{ type: 'max' as const, value: column.validation.max, message: column.validation.message }]
            : []),
          ...(column.validation.pattern
            ? [{ type: 'pattern' as const, value: column.validation.pattern, message: column.validation.message }]
            : [])
        ]
      : undefined,
    readonly: !column.isEditable
  }
}

// ============================================================================
// Event Types
// ============================================================================

export interface SpreadsheetAppEvent {
  type: 'row_added' | 'row_updated' | 'row_deleted' | 'data_imported' | 'data_exported'
  sheetId: string
  timestamp: string
  userId: string
  data?: Record<string, unknown>
  previousData?: Record<string, unknown>
}

// ============================================================================
// Storage Types
// ============================================================================

export interface SpreadsheetAppStorage {
  apps: SpreadsheetApp[]
  lastUpdated: string
}

/**
 * Summary info for app listing
 */
export interface SpreadsheetAppSummary {
  id: string
  name: string
  description?: string
  icon?: string
  sheetCount: number
  rowCount: number
  status: AppStatus
  createdAt: string
  updatedAt: string
  trashedAt?: string | null
  createdBy?: string
  // File storage path (for sharing URLs)
  filePath?: string
  // Sharing metadata
  isShared?: boolean
  isOwner?: boolean
  sharedWithCount?: number
  /** Recipient user ids for hub avatars (from list API); full share rows load on demand */
  sharedPreviewUserIds?: string[]
  // Permission info from backend
  permission?: AppPermission
  sharedBy?: string
  sharedByName?: string
  isFavorite?: boolean
  /** App settings (e.g. excel_collection_copy for Excel Collection copies to hide from list) */
  settings?: Record<string, unknown>
  /** First sheet ID when available (from list API) - used for grid preview thumbnail */
  firstSheetId?: string
}

/**
 * Sharing permission levels
 */
export type SharePermission = 'view' | 'edit' | 'admin'

/**
 * Share entry for tracking who has access
 */
export interface AppShareEntry {
  userId: string
  permission: SharePermission
  sharedAt: string
  sharedBy: string
}
