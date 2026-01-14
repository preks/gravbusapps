/**
 * NoteApiService
 *
 * Connects to the document-service backend API for note management.
 * Handles CRUD operations, sharing, and tree structure management.
 *
 * Backend: https://newwork-dev.newwork.com/document-service/api/v1 (dev)
 *          http://localhost:3002/api/v1 (local, if VITE_DOCUMENT_SERVICE_URL is set)
 */

import type {
  Note,
  NoteSummary,
  NoteShare,
  NotePermission,
  NoteQueryParams,
  CreateNoteInput,
  UpdateNoteInput,
  MoveNoteInput,
  PaginatedNotes,
  NoteTreeNode
} from '../types'
import { env } from '@/common/env/EnvUtils'

// Get the API URL from environment or default to dev environment
const getApiUrl = (): string => {
  // Check for explicit environment variable first (Vite env var)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_DOCUMENT_SERVICE_URL) {
    return import.meta.env.VITE_DOCUMENT_SERVICE_URL
  }

  // If platform is running on localhost, connect to DEV environment
  // This handles the case where UI is loaded from CDN but platform is running locally
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    const isLocalHost = host === 'localhost' || host === '127.0.0.1'
    if (isLocalHost) {
      return 'https://newwork-dev.newwork.com/document-service/api/v1'
    }
  }

  // Try to get base URL from environment and construct document-service URL
  const baseUrl = env('NEXT_PUBLIC_BASE_URL')
  if (baseUrl) {
    const trimmed = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl
    return `${trimmed}/document-service/api/v1`
  }

  // Default to dev environment
  return 'https://newwork-dev.newwork.com/document-service/api/v1'
}

const API_URL = getApiUrl()

const isNoteAppsDebugEnabled = (): boolean => {
  try {
    return (
      typeof window !== 'undefined' &&
      typeof window.localStorage !== 'undefined' &&
      window.localStorage.getItem('debug:note-apps') === '1'
    )
  } catch {
    return false
  }
}

const debugLog = (...args: unknown[]) => {
  if (isNoteAppsDebugEnabled()) {
    console.debug('[NoteApiService]', ...args)
  }
}

// Get auth token - check multiple storage locations
const getAuthToken = (): string | null => {
  try {
    // First check the IDE's storage key (Business App IDE)
    const ideToken = localStorage.getItem('business-app-ide-access-token')
    if (ideToken) return ideToken

    // Check keycloak token format
    const authData = localStorage.getItem('keycloak-token')
    if (authData) {
      try {
        const parsed = JSON.parse(authData)
        return parsed.token || parsed.access_token || null
      } catch {
        return authData
      }
    }

    // Check session storage
    const sessionToken = sessionStorage.getItem('auth_token')
    if (sessionToken) return sessionToken

    // Check window global
    if (typeof window !== 'undefined' && (window as unknown as { authToken?: string }).authToken) {
      return (window as unknown as { authToken: string }).authToken
    }

    return null
  } catch {
    return null
  }
}

// API request helper
async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }

  // Handle empty responses
  const text = await response.text()
  return text ? JSON.parse(text) : null
}

// Map API note to frontend Note type
function mapApiNoteToNote(apiNote: Record<string, unknown>): Note {
  // Map backend permission 'admin' to frontend 'owner'
  let permission = apiNote.permission as Note['permission']
  if (permission === 'admin') {
    permission = 'owner'
  }

  return {
    id: apiNote.id as string,
    title: apiNote.title as string | undefined,
    content: apiNote.content as string | undefined,
    contentJson: apiNote.contentJson as Record<string, unknown> | undefined,
    tags: apiNote.tags as string[] | undefined,
    color: apiNote.color as Note['color'],
    icon: apiNote.icon as string | undefined,
    isPinned: (apiNote.isPinned as boolean) || false,
    isArchived: (apiNote.isArchived as boolean) || false,
    parentId: apiNote.parentId as string | undefined,
    position: (apiNote.position as number) || 0,
    settings: apiNote.settings as Note['settings'],
    ownerId: apiNote.ownerId as string,
    currentVersion: (apiNote.currentVersion as number) || 1,
    createdAt: apiNote.createdAt as string,
    updatedAt: apiNote.updatedAt as string,
    children: apiNote.children ? (apiNote.children as Record<string, unknown>[]).map(mapApiNoteToNote) : undefined,
    permission,
    isShared: apiNote.isShared as boolean | undefined,
    sharedBy: apiNote.sharedBy as string | undefined
  }
}

// Map API note to summary
function mapApiNoteToSummary(apiNote: Record<string, unknown>): NoteSummary {
  let permission = apiNote.permission as NoteSummary['permission']
  if (permission === 'admin') {
    permission = 'owner'
  }

  // Extract preview from content
  const content = apiNote.content as string | undefined
  const preview = content
    ? content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 150)
    : undefined

  return {
    id: apiNote.id as string,
    title: apiNote.title as string | undefined,
    preview,
    tags: apiNote.tags as string[] | undefined,
    color: apiNote.color as NoteSummary['color'],
    icon: apiNote.icon as string | undefined,
    isPinned: (apiNote.isPinned as boolean) || false,
    isArchived: (apiNote.isArchived as boolean) || false,
    parentId: apiNote.parentId as string | undefined,
    position: (apiNote.position as number) || 0,
    ownerId: apiNote.ownerId as string,
    createdAt: apiNote.createdAt as string,
    updatedAt: apiNote.updatedAt as string,
    hasChildren: Array.isArray(apiNote.children) && (apiNote.children as unknown[]).length > 0,
    childCount: Array.isArray(apiNote.children) ? (apiNote.children as unknown[]).length : 0,
    isShared: apiNote.isShared as boolean | undefined,
    sharedBy: apiNote.sharedBy as string | undefined,
    permission
  }
}

// Convert note tree to NoteTreeNode format
function buildNoteTree(notes: Note[], depth = 0): NoteTreeNode[] {
  return notes.map(note => ({
    ...mapApiNoteToSummary(note as unknown as Record<string, unknown>),
    children: note.children ? buildNoteTree(note.children, depth + 1) : [],
    depth,
    isExpanded: false
  }))
}

/**
 * Note API Service
 */
export const NoteApiService = {
  // ============ Notes CRUD ============

  /**
   * Get all notes for the current user
   */
  async listNotes(params?: NoteQueryParams): Promise<PaginatedNotes> {
    const urlParams = new URLSearchParams()

    if (params?.parentId) urlParams.set('parentId', params.parentId)
    if (params?.rootOnly) urlParams.set('rootOnly', 'true')
    if (params?.tags?.length) urlParams.set('tags', params.tags.join(','))
    if (params?.search) urlParams.set('search', params.search)
    if (params?.includeShared !== false) urlParams.set('includeShared', 'true')
    if (params?.includeArchived) urlParams.set('includeArchived', 'true')
    if (params?.pinnedOnly) urlParams.set('pinnedOnly', 'true')
    if (params?.page) urlParams.set('page', params.page.toString())
    if (params?.limit) urlParams.set('limit', params.limit.toString())
    if (params?.sortBy) urlParams.set('sortBy', params.sortBy)
    if (params?.sortOrder) urlParams.set('sortOrder', params.sortOrder)

    const queryString = urlParams.toString()
    const endpoint = `/notes${queryString ? `?${queryString}` : ''}`

    debugLog('listNotes', endpoint)

    const response = await apiRequest<{
      items: Record<string, unknown>[]
      total: number
      page: number
      limit: number
      totalPages: number
    }>(endpoint)

    return {
      items: response.items.map(mapApiNoteToSummary),
      total: response.total,
      page: response.page,
      limit: response.limit,
      totalPages: response.totalPages
    }
  },

  /**
   * Get the note tree structure
   */
  async getNoteTree(): Promise<NoteTreeNode[]> {
    debugLog('getNoteTree')

    const response = await apiRequest<Record<string, unknown>[]>('/notes/tree')
    const notes = response.map(mapApiNoteToNote)
    return buildNoteTree(notes)
  },

  /**
   * Get a single note by ID
   */
  async getNote(id: string): Promise<Note | null> {
    try {
      debugLog('getNote', id)
      const note = await apiRequest<Record<string, unknown>>(`/notes/${id}`)
      return mapApiNoteToNote(note)
    } catch (error) {
      console.error('Failed to get note:', error)
      return null
    }
  },

  /**
   * Create a new note
   */
  async createNote(input: CreateNoteInput): Promise<Note> {
    debugLog('createNote', input)

    const payload = {
      title: input.title,
      content: input.content || '',
      contentJson: input.contentJson,
      tags: input.tags,
      color: input.color,
      icon: input.icon,
      parentId: input.parentId,
      settings: input.settings
    }

    const created = await apiRequest<Record<string, unknown>>('/notes', {
      method: 'POST',
      body: JSON.stringify(payload)
    })

    return mapApiNoteToNote(created)
  },

  /**
   * Update an existing note
   */
  async updateNote(id: string, updates: UpdateNoteInput): Promise<Note> {
    debugLog('updateNote', id, updates)

    const payload: Record<string, unknown> = {}

    if (updates.title !== undefined) payload.title = updates.title
    if (updates.content !== undefined) payload.content = updates.content
    if (updates.contentJson !== undefined) payload.contentJson = updates.contentJson
    if (updates.tags !== undefined) payload.tags = updates.tags
    if (updates.color !== undefined) payload.color = updates.color
    if (updates.icon !== undefined) payload.icon = updates.icon
    if (updates.isPinned !== undefined) payload.isPinned = updates.isPinned
    if (updates.isArchived !== undefined) payload.isArchived = updates.isArchived
    if (updates.settings !== undefined) payload.settings = updates.settings
    if (updates.createVersion !== undefined) payload.createVersion = updates.createVersion

    const updated = await apiRequest<Record<string, unknown>>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    })

    return mapApiNoteToNote(updated)
  },

  /**
   * Delete a note
   */
  async deleteNote(id: string): Promise<boolean> {
    try {
      debugLog('deleteNote', id)
      await apiRequest(`/notes/${id}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to delete note:', error)
      return false
    }
  },

  /**
   * Duplicate a note
   */
  async duplicateNote(id: string): Promise<Note | null> {
    try {
      debugLog('duplicateNote', id)
      const duplicated = await apiRequest<Record<string, unknown>>(`/notes/${id}/duplicate`, {
        method: 'POST'
      })
      return mapApiNoteToNote(duplicated)
    } catch (error) {
      console.error('Failed to duplicate note:', error)
      return null
    }
  },

  // ============ Note Actions ============

  /**
   * Toggle pin status
   */
  async togglePin(id: string): Promise<Note | null> {
    try {
      debugLog('togglePin', id)
      const updated = await apiRequest<Record<string, unknown>>(`/notes/${id}/pin`, {
        method: 'POST'
      })
      return mapApiNoteToNote(updated)
    } catch (error) {
      console.error('Failed to toggle pin:', error)
      return null
    }
  },

  /**
   * Archive a note
   */
  async archiveNote(id: string): Promise<Note | null> {
    try {
      debugLog('archiveNote', id)
      const updated = await apiRequest<Record<string, unknown>>(`/notes/${id}/archive`, {
        method: 'POST'
      })
      return mapApiNoteToNote(updated)
    } catch (error) {
      console.error('Failed to archive note:', error)
      return null
    }
  },

  /**
   * Unarchive a note
   */
  async unarchiveNote(id: string): Promise<Note | null> {
    try {
      debugLog('unarchiveNote', id)
      const updated = await apiRequest<Record<string, unknown>>(`/notes/${id}/unarchive`, {
        method: 'POST'
      })
      return mapApiNoteToNote(updated)
    } catch (error) {
      console.error('Failed to unarchive note:', error)
      return null
    }
  },

  /**
   * Move a note to a new parent or position
   */
  async moveNote(id: string, move: MoveNoteInput): Promise<Note | null> {
    try {
      debugLog('moveNote', id, move)
      const updated = await apiRequest<Record<string, unknown>>(`/notes/${id}/move`, {
        method: 'POST',
        body: JSON.stringify(move)
      })
      return mapApiNoteToNote(updated)
    } catch (error) {
      console.error('Failed to move note:', error)
      return null
    }
  },

  // ============ Sharing ============

  /**
   * Share a note with users
   */
  async shareNote(noteId: string, shares: Array<{ userId: string; permission: NotePermission }>): Promise<boolean> {
    try {
      const payload = {
        entityType: 'note',
        entityId: noteId,
        recipients: shares.map(s => ({
          userId: s.userId,
          permission: s.permission
        }))
      }
      debugLog('shareNote', noteId, shares)
      await apiRequest('/sharing', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      return true
    } catch (error) {
      console.error('Failed to share note:', error)
      return false
    }
  },

  /**
   * Get users a note is shared with
   */
  async getSharedUsers(noteId: string): Promise<Array<NoteShare>> {
    try {
      debugLog('getSharedUsers', noteId)
      const shares = await apiRequest<Array<Record<string, unknown>>>(`/sharing/note/${noteId}`)
      return (shares || []).map(s => ({
        id: s.id as string,
        userId: s.userId as string,
        permission: s.permission as NotePermission,
        sharedAt: s.createdAt as string,
        sharedBy: s.sharedBy as string,
        message: s.message as string | undefined
      }))
    } catch (error) {
      console.error('Failed to get shared users:', error)
      return []
    }
  },

  /**
   * Update a share's permission
   */
  async updateSharePermission(shareId: string, permission: NotePermission): Promise<boolean> {
    try {
      debugLog('updateSharePermission', shareId, permission)
      await apiRequest(`/sharing/${shareId}`, {
        method: 'PATCH',
        body: JSON.stringify({ permission })
      })
      return true
    } catch (error) {
      console.error('Failed to update share permission:', error)
      return false
    }
  },

  /**
   * Revoke a share by share ID
   */
  async revokeShareById(shareId: string): Promise<boolean> {
    try {
      debugLog('revokeShareById', shareId)
      await apiRequest(`/sharing/${shareId}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to revoke share:', error)
      return false
    }
  },

  /**
   * Revoke access for a user
   */
  async revokeAccess(noteId: string, userId: string): Promise<boolean> {
    try {
      debugLog('revokeAccess', noteId, userId)
      const shares = await apiRequest<Array<{ id: string; userId: string }>>(`/sharing/note/${noteId}`)
      const share = shares.find(s => s.userId === userId)
      if (share) {
        await apiRequest(`/sharing/${share.id}`, { method: 'DELETE' })
      }
      return true
    } catch (error) {
      console.error('Failed to revoke access:', error)
      return false
    }
  },

  // ============ Share Links ============

  /**
   * Create a share link for a note
   */
  async createShareLink(
    noteId: string,
    options?: {
      permission?: NotePermission
      password?: string
      expiresAt?: string
      maxUses?: number
      name?: string
    }
  ): Promise<{ token: string; url: string } | null> {
    try {
      debugLog('createShareLink', noteId, options)
      const payload = {
        entityType: 'note',
        entityId: noteId,
        permission: options?.permission || 'view',
        password: options?.password,
        expiresAt: options?.expiresAt,
        maxUses: options?.maxUses,
        name: options?.name
      }
      const result = await apiRequest<{ token: string }>('/sharing/links', {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      return {
        token: result.token,
        url: `${window.location.origin}/notes/shared/${result.token}`
      }
    } catch (error) {
      console.error('Failed to create share link:', error)
      return null
    }
  },

  /**
   * Get share links for a note
   */
  async getShareLinks(noteId: string): Promise<
    Array<{
      id: string
      token: string
      permission: NotePermission
      expiresAt?: string
      maxUses?: number
      useCount: number
      isActive: boolean
      name?: string
      createdAt: string
    }>
  > {
    try {
      debugLog('getShareLinks', noteId)
      const links = await apiRequest<Array<Record<string, unknown>>>(`/sharing/links/note/${noteId}`)
      return (links || []).map(l => ({
        id: l.id as string,
        token: l.token as string,
        permission: l.permission as NotePermission,
        expiresAt: l.expiresAt as string | undefined,
        maxUses: l.maxUses as number | undefined,
        useCount: (l.useCount as number) || 0,
        isActive: (l.isActive as boolean) ?? true,
        name: l.name as string | undefined,
        createdAt: l.createdAt as string
      }))
    } catch (error) {
      console.error('Failed to get share links:', error)
      return []
    }
  },

  /**
   * Deactivate a share link
   */
  async deactivateShareLink(linkId: string): Promise<boolean> {
    try {
      debugLog('deactivateShareLink', linkId)
      await apiRequest(`/sharing/links/${linkId}/deactivate`, { method: 'POST' })
      return true
    } catch (error) {
      console.error('Failed to deactivate share link:', error)
      return false
    }
  },

  /**
   * Delete a share link
   */
  async deleteShareLink(linkId: string): Promise<boolean> {
    try {
      debugLog('deleteShareLink', linkId)
      await apiRequest(`/sharing/links/${linkId}`, { method: 'DELETE' })
      return true
    } catch (error) {
      console.error('Failed to delete share link:', error)
      return false
    }
  }
}

export default NoteApiService
