/**
 * Session Management API Client
 *
 * Handles communication with the AI builder service session endpoints.
 */

import { SessionMetadata, SessionUser } from '../types/session'
import { ENV } from '../config/environment'

export interface SaveSessionRequest {
  sessionId: string
  repoId?: string
  screenPath: string | null
  resourceUrl: string | null
  fileCount: number
  description?: string
  createdBy: SessionUser
}

export interface SaveSessionResponse {
  success: boolean
  action: 'created' | 'updated'
  sessionId: string
  error?: string
  message?: string
}

export interface ListSessionsResponse {
  success: boolean
  sessions: SessionMetadata[]
  error?: string
  message?: string
}

export interface GetSessionResponse {
  success: boolean
  session?: SessionMetadata
  error?: string
  message?: string
}

export interface DeleteSessionResponse {
  success: boolean
  sessionId: string
  error?: string
  message?: string
}

/**
 * Save or update a session
 */
export async function saveSession(request: SaveSessionRequest): Promise<SaveSessionResponse> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/sessions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(request)
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to save session')
  }

  return data
}

/**
 * List all sessions (or filter by userId if provided)
 */
export async function listSessions(userId: string = '', limit: number = 50): Promise<ListSessionsResponse> {
  const url = userId
    ? `${ENV.AI_SERVICE_API_URL}/api/sessions?userId=${userId}&limit=${limit}`
    : `${ENV.AI_SERVICE_API_URL}/api/sessions?limit=${limit}`

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to list sessions')
  }

  return data
}

/**
 * Get a specific session by ID
 */
export async function getSession(sessionId: string): Promise<GetSessionResponse> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/sessions/${sessionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to get session')
  }

  return data
}

/**
 * Delete a session
 */
export async function deleteSession(sessionId: string): Promise<DeleteSessionResponse> {
  const response = await fetch(`${ENV.AI_SERVICE_API_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json'
    }
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.error || data.message || 'Failed to delete session')
  }

  return data
}
