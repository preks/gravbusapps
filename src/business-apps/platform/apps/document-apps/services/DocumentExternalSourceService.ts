/**
 * API service for document external-source endpoints.
 * Mirrors the pattern from BoardApiService for external imports.
 */

import type {
  UnstructuredConnectorSummary,
  UnstructuredPreviewResponse,
  UnstructuredStartSyncRequest,
  UnstructuredSyncRun
} from '../types/externalUnstructuredConnector'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()
let currentAccessToken: string | null = null

export const DocumentExternalSourceService = {
  setAccessToken(token: string) {
    currentAccessToken = token
  },

  async listConnectors(): Promise<UnstructuredConnectorSummary[]> {
    const res = await apiFetch<UnstructuredConnectorSummary[]>('/documents/external-sources/connectors')
    return res ?? []
  },

  async preview(
    connectorId: string,
    connectionId?: string,
    limit?: number
  ): Promise<UnstructuredPreviewResponse | null> {
    return apiFetch<UnstructuredPreviewResponse>('/documents/external-sources/preview', {
      method: 'POST',
      body: JSON.stringify({ connectorId, connectionId, limit: limit ?? 20 })
    })
  },

  async startSync(request: UnstructuredStartSyncRequest): Promise<{ runId: string } | null> {
    return apiFetch<{ runId: string }>('/documents/external-sources/start-sync', {
      method: 'POST',
      body: JSON.stringify(request)
    })
  },

  async getRunStatus(runId: string): Promise<UnstructuredSyncRun | null> {
    return apiFetch<UnstructuredSyncRun>(`/documents/external-sources/runs/${runId}`)
  },

  async cancelRun(runId: string): Promise<void> {
    await apiFetch(`/documents/external-sources/runs/${runId}/cancel`, { method: 'POST' })
  },

  async listRuns(): Promise<UnstructuredSyncRun[]> {
    const res = await apiFetch<UnstructuredSyncRun[]>('/documents/external-sources/runs')
    return res ?? []
  }
}

async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
  const token = currentAccessToken
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers
    })

    if (!response.ok) return null
    const text = await response.text()
    return text ? (JSON.parse(text) as T) : null
  } catch {
    return null
  }
}
