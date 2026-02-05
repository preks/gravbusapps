/**
 * Admin API Client
 *
 * Handles communication with the AI builder service admin endpoints.
 */

import { ENV } from '../config/environment'
import { AutoInitConfig, CreateAutoInitConfigRequest, UpdateAutoInitConfigRequest } from '../types/admin'

/**
 * Get all auto-init configurations
 */
export async function getAutoInitConfigs(): Promise<AutoInitConfig[]> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/admin/auto-init-configs`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to fetch auto-init configurations')
  }

  return response.json()
}

/**
 * Get a single auto-init configuration by ID
 */
export async function getAutoInitConfig(id: string): Promise<AutoInitConfig> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/admin/auto-init-configs/${id}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to fetch auto-init configuration')
  }

  return response.json()
}

/**
 * Create a new auto-init configuration
 */
export async function createAutoInitConfig(request: CreateAutoInitConfigRequest): Promise<AutoInitConfig> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/admin/auto-init-configs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to create auto-init configuration')
  }

  return response.json()
}

/**
 * Update an auto-init configuration
 */
export async function updateAutoInitConfig(id: string, request: UpdateAutoInitConfigRequest): Promise<AutoInitConfig> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/admin/auto-init-configs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to update auto-init configuration')
  }

  return response.json()
}

/**
 * Delete an auto-init configuration
 */
export async function deleteAutoInitConfig(id: string): Promise<void> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/admin/auto-init-configs/${id}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to delete auto-init configuration')
  }
}

/**
 * Trigger a sync for a configured repository
 */
export async function syncAutoInitConfig(
  id: string,
  forceReindex = false
): Promise<{ success: boolean; message: string; hasChanges?: boolean }> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/admin/auto-init-configs/${id}/sync`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ forceReindex })
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to sync repository')
  }

  return response.json()
}

/**
 * Indexing progress interface
 */
export interface IndexProgress {
  totalFiles: number
  processedFiles: number
  totalChunks: number
  processedChunks: number
  currentFile?: string
  status: 'scanning' | 'parsing' | 'embedding' | 'storing' | 'completed' | 'failed'
  error?: string
}

/**
 * Indexing status for a repository
 */
export interface IndexingStatus {
  configId: string
  url: string
  owner: string
  name: string
  repoId: string | null
  indexStatus: string | null
  progress: IndexProgress | null
}

/**
 * Get indexing status for all configured repositories
 */
export async function getAllIndexingStatus(): Promise<IndexingStatus[]> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/admin/indexing-status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to get indexing status')
  }

  return response.json()
}

/**
 * Get indexing status for a specific configured repository
 */
export async function getIndexingStatus(configId: string): Promise<{
  repoId: string | null
  indexStatus: string | null
  progress: IndexProgress | null
}> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/admin/auto-init-configs/${configId}/status`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  if (!response.ok) {
    const data = await response.json().catch(() => ({}))
    throw new Error(data.message || 'Failed to get indexing status')
  }

  return response.json()
}
