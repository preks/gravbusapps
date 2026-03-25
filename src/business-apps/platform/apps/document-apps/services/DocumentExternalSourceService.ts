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
      body: JSON.stringify({ connectorId, connectionId, limit: limit ?? 20 }),
      timeoutMs: 30000,
      throwOnError: true,
      timeoutMessage: 'Preview request timed out. Please check the connector configuration and try again.'
    })
  },

  async startSync(request: UnstructuredStartSyncRequest): Promise<{ runId: string } | null> {
    return apiFetch<{ runId: string }>('/documents/external-sources/start-sync', {
      method: 'POST',
      body: JSON.stringify(request),
      throwOnError: true
    })
  },

  async getRunStatus(runId: string): Promise<UnstructuredSyncRun | null> {
    return apiFetch<UnstructuredSyncRun>(`/documents/external-sources/runs/${runId}`)
  },

  async cancelRun(runId: string): Promise<void> {
    await apiFetch(`/documents/external-sources/runs/${runId}/cancel`, {
      method: 'POST',
      throwOnError: true
    })
  },

  async listRuns(): Promise<UnstructuredSyncRun[]> {
    const res = await apiFetch<UnstructuredSyncRun[]>('/documents/external-sources/runs')
    return res ?? []
  }
}

type ApiFetchOptions = RequestInit & {
  timeoutMs?: number
  throwOnError?: boolean
  timeoutMessage?: string
}

async function apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T | null> {
  const token = currentAccessToken
  const { timeoutMs, throwOnError = false, timeoutMessage, ...requestOptions } = options
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...requestOptions.headers
  }
  const controller = new AbortController()
  const timeoutId = timeoutMs
    ? setTimeout(() => controller.abort(timeoutMessage ?? 'Request timed out'), timeoutMs)
    : null

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...requestOptions,
      headers,
      signal: controller.signal
    })

    if (!response.ok) {
      const errorMessage = await extractErrorMessage(response)
      if (throwOnError) throw new Error(errorMessage)
      return null
    }
    const text = await response.text()
    return text ? (JSON.parse(text) as T) : null
  } catch (err) {
    if (throwOnError) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error(timeoutMessage ?? 'Request timed out')
      }
      throw err instanceof Error ? err : new Error('Request failed')
    }
    return null
  } finally {
    if (timeoutId) clearTimeout(timeoutId)
  }
}

async function extractErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => '')
  if (!text) {
    return `Request failed (${response.status})`
  }

  try {
    const parsed = JSON.parse(text) as { message?: string; detail?: string }
    return parsed.message || parsed.detail || text
  } catch {
    return text
  }
}
