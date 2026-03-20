/**
 * External Connector Types
 *
 * Defines the contract between Board Apps, Document Service, and Functions Service
 * for importing external data (SAP, Oracle, REST APIs, etc.) into board sheets.
 */

// ── Connector discovery ─────────────────────────────────────────────────

export interface ConnectorSummary {
  id: string
  name: string
  description?: string | null
  connectorEnabled: boolean
  config: Record<string, string>
  latestVersion: {
    version: number
    inputSchema: Record<string, unknown>
    outputSchema: Record<string, unknown>
    createdAt: string
  }
}

// ── Connector invocation actions ────────────────────────────────────────

export type ConnectorAction = 'discover' | 'schema' | 'preview' | 'page'

export interface ConnectorInvokePayload {
  action: ConnectorAction
  connectionId?: string
  query?: Record<string, unknown>
  cursor?: string | null
  pageSize?: number
  fields?: string[]
}

export interface ConnectorField {
  name: string
  label: string
  type: 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'object' | 'array'
  description?: string
}

export interface ConnectorSchemaResult {
  fields: ConnectorField[]
  estimatedTotal?: number
  supportsFiltering?: boolean
  supportsPaging?: boolean
}

export interface ConnectorPageResult {
  records: Array<Record<string, unknown>>
  nextCursor: string | null
  estimatedTotal?: number
  schema?: ConnectorField[]
}

// ── External data source config (saved on sheet.entityDataSource) ────────

export interface ExternalDataSourceConfig {
  id: string
  enabled: boolean
  provider: 'functionManager'
  connectorId: string
  connectorName: string
  connectorDescription?: string
  /** Opaque reference to credentials stored in a secure vault; never store raw secrets here */
  connectionId?: string
  query: Record<string, unknown>
  selectedFields: string[]
  limit: number
  refreshMode: 'manual' | 'onOpen' | 'periodic'
  refreshInterval?: number
  syncMode: 'replace' | 'append' | 'merge'
  mergeKey?: string
  lastSyncAt?: string
  lastSyncCount?: number
  lastSyncError?: string
}

// ── Sync run status (returned by document-service) ──────────────────────

export type SyncRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface SyncRun {
  runId: string
  status: SyncRunStatus
  totalFetched: number
  totalSynced: number
  estimatedTotal?: number | null
  lastMessage?: string | null
  currentCursor?: string | null
  startedAt?: string
  completedAt?: string
  error?: string | null
}

// ── Dataset abstraction (Phase 2+) ──────────────────────────────────────
// First-class datasets decoupled from boards, enabling reuse across apps
// and cross-dataset AI analysis.

export type DatasetFieldType = 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'object' | 'array'

export interface DatasetFieldSchema {
  name: string
  label?: string
  type: DatasetFieldType
  nullable?: boolean
  description?: string
}

export interface DatasetSummary {
  id: string
  name: string
  description?: string
  connectorName: string
  schema: DatasetFieldSchema[]
  totalRecords: number
  lastSyncAt?: string
  status: 'active' | 'archived' | 'error'
}

export interface DatasetSheetBinding {
  datasetId: string
  mode: 'materialized' | 'virtual'
  selectedFields?: string[]
  filterExpression?: string
}

// ── Preview request / response ──────────────────────────────────────────

export interface ExternalPreviewRequest {
  connectorId: string
  connectionId?: string
  query?: Record<string, unknown>
  limit?: number
}

export interface ExternalPreviewResponse {
  records: Array<Record<string, unknown>>
  schema: ConnectorField[]
  estimatedTotal?: number
}

// ── Start sync request ──────────────────────────────────────────────────

export interface ExternalStartSyncRequest {
  connectorId: string
  connectorName: string
  connectorDescription?: string
  connectionId?: string
  query?: Record<string, unknown>
  selectedFields?: string[]
  limit?: number
  mode: 'replace' | 'append' | 'merge'
  mergeKey?: string
  autoColumns?: boolean
  keepConnected?: boolean
  refreshMode?: 'manual' | 'onOpen' | 'periodic'
  refreshInterval?: number
}
