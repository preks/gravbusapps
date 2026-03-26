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
import { officeClient } from '@/common/network/office/OfficeClient'

let currentAccessToken: string | null = null

function getOfficeClient() {
  if (currentAccessToken) {
    officeClient.setAccessToken(currentAccessToken)
  }
  return officeClient
}

export const DocumentExternalSourceService = {
  setAccessToken(token: string) {
    currentAccessToken = token
    officeClient.setAccessToken(token)
  },

  async listConnectors(): Promise<UnstructuredConnectorSummary[]> {
    const res = await apiFetch<UnstructuredConnectorSummary[]>('listConnectors')
    return res ?? []
  },

  async preview(
    connectorId: string,
    connectionId?: string,
    limit?: number
  ): Promise<UnstructuredPreviewResponse | null> {
    return apiFetch<UnstructuredPreviewResponse>('preview', {
      body: JSON.stringify({ connectorId, connectionId, limit: limit ?? 20 }),
      timeoutMs: 30000,
      throwOnError: true,
      timeoutMessage: 'Preview request timed out. Please check the connector configuration and try again.'
    })
  },

  async startSync(request: UnstructuredStartSyncRequest): Promise<{ runId: string } | null> {
    return apiFetch<{ runId: string }>('startSync', {
      body: JSON.stringify(request),
      throwOnError: true
    })
  },

  async getRunStatus(runId: string): Promise<UnstructuredSyncRun | null> {
    return apiFetch<UnstructuredSyncRun>('getRunStatus', { runId })
  },

  async cancelRun(runId: string): Promise<void> {
    await apiFetch('cancelRun', {
      runId,
      throwOnError: true
    })
  },

  async listRuns(): Promise<UnstructuredSyncRun[]> {
    const res = await apiFetch<UnstructuredSyncRun[]>('listRuns')
    return res ?? []
  }
}

type ApiFetchAction = 'listConnectors' | 'preview' | 'startSync' | 'getRunStatus' | 'cancelRun' | 'listRuns'

type ApiFetchOptions = {
  body?: string
  runId?: string
  timeoutMs?: number
  throwOnError?: boolean
  timeoutMessage?: string
}

async function apiFetch<T>(action: ApiFetchAction, options: ApiFetchOptions = {}): Promise<T | null> {
  const client = getOfficeClient()
  const { body, runId, timeoutMs, throwOnError = false, timeoutMessage } = options
  const controller = new AbortController()
  const timeoutId = timeoutMs
    ? setTimeout(() => controller.abort(timeoutMessage ?? 'Request timed out'), timeoutMs)
    : null

  try {
    switch (action) {
      case 'listConnectors':
        return await client.documents.listExternalSourceConnectors<T>({ signal: controller.signal })
      case 'preview':
        return await client.documents.previewExternalSources<T>(parseJsonBody(body), { signal: controller.signal })
      case 'startSync':
        return await client.documents.startExternalSourceSync<T>(parseJsonBody(body), { signal: controller.signal })
      case 'getRunStatus':
        return await client.documents.getExternalSourceRunStatus<T>(runId ?? '', { signal: controller.signal })
      case 'cancelRun':
        await client.documents.cancelExternalSourceRun(runId ?? '', { signal: controller.signal })
        return null
      case 'listRuns':
        return await client.documents.listExternalSourceRuns<T>({ signal: controller.signal })
    }
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

function parseJsonBody(body?: string): unknown {
  if (!body) {
    return undefined
  }

  try {
    return JSON.parse(body)
  } catch {
    return undefined
  }
}
