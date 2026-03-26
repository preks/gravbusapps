/**
 * External Unstructured Connector Types (Frontend)
 *
 * Defines the contract between Document Apps, Document Service, and Functions Service
 * for importing external unstructured content (Confluence, SharePoint, Drive, S3).
 */

// ── Connector discovery ─────────────────────────────────────────────────

export interface UnstructuredConnectorSummary {
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

// ── Item kind ────────────────────────────────────────────────────────────

export type UnstructuredItemKind = 'page' | 'file'

// ── Preview item ─────────────────────────────────────────────────────────

export interface UnstructuredPreviewItem {
  externalId: string
  kind: UnstructuredItemKind
  title: string
  mimeType?: string
  snippet?: string
  externalUrl?: string
  sizeBytes?: number
  externalUpdatedAt?: string
}

// ── Preview response ─────────────────────────────────────────────────────

export interface UnstructuredPreviewResponse {
  items: UnstructuredPreviewItem[]
  estimatedTotal?: number
}

// ── Start sync request ───────────────────────────────────────────────────

export interface UnstructuredStartSyncRequest {
  connectorId: string
  connectorName: string
  connectorDescription?: string
  connectionId?: string
  query?: string | Record<string, unknown>
  limit?: number
  keepConnected?: boolean
  refreshMode?: 'manual' | 'onOpen' | 'periodic'
  refreshInterval?: number
  /** Destination space for imported docs (uses user's private space if omitted). */
  destinationSpaceId?: string
  /** Destination folder within the space. */
  destinationFolderId?: string
}

// ── Sync run status ──────────────────────────────────────────────────────

export type UnstructuredSyncRunStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface UnstructuredSyncRun {
  runId: string
  status: UnstructuredSyncRunStatus
  totalDiscovered: number
  totalImported: number
  totalSkipped: number
  estimatedTotal?: number | null
  lastMessage?: string | null
  startedAt?: string
  completedAt?: string
  error?: string | null
}

// ── Provenance metadata on a Document ────────────────────────────────────

export type AclPolicy = 'nw' | 'mirror'

export interface ExternalDocumentProvenance {
  connectorId: string
  connectorName: string
  connectionId?: string
  externalId: string
  externalUrl?: string
  kind: UnstructuredItemKind
  mimeType?: string
  externalUpdatedAt?: string
  etag?: string
  aclPolicy: AclPolicy
  importedAt: string
  lastSyncedAt?: string
  isConnected: boolean
}
