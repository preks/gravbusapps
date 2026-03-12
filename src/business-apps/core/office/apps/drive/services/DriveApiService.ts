import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type {
  DriveFolder,
  DriveItem,
  DriveListResult,
  DriveSearchResult,
  DriveFavorite,
  DriveBreadcrumb,
  DriveSection,
  DriveSortBy,
  DriveShortcut,
  ShareInfo,
  ShareLinkInfo
} from '../types/drive.types'

const API_URL = getDocumentServiceApiUrl()

let currentAccessToken: string | null = null

async function apiRequest<T>(endpoint: string, options: RequestInit = {}, tokenOverride?: string | null): Promise<T> {
  const token = tokenOverride ?? currentAccessToken
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) ?? {})
  }
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Drive API error ${response.status}: ${text}`)
  }
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

export class DriveApiService {
  static setAccessToken(token: string | null) {
    currentAccessToken = token
  }

  static async listItems(params: {
    section?: DriveSection
    folderId?: string
    spaceId?: string
    type?: string
    sortBy?: DriveSortBy
    sortOrder?: 'ASC' | 'DESC'
    page?: number
    limit?: number
  }): Promise<DriveListResult> {
    const qs = new URLSearchParams()
    if (params.section) qs.set('section', params.section)
    if (params.folderId) qs.set('folderId', params.folderId)
    if (params.spaceId) qs.set('spaceId', params.spaceId)
    if (params.type) qs.set('type', params.type)
    if (params.sortBy) qs.set('sortBy', params.sortBy)
    if (params.sortOrder) qs.set('sortOrder', params.sortOrder)
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    return apiRequest<DriveListResult>(`/drive?${qs.toString()}`)
  }

  static async listFolders(parentId?: string): Promise<DriveFolder[]> {
    const qs = parentId ? `?parentId=${parentId}` : ''
    return apiRequest<DriveFolder[]>(`/drive/folders${qs}`)
  }

  static async getFolder(id: string): Promise<DriveFolder> {
    return apiRequest<DriveFolder>(`/drive/folders/${id}`)
  }

  static async getBreadcrumbs(folderId: string): Promise<{ breadcrumbs: DriveBreadcrumb[]; isShared: boolean }> {
    return apiRequest<{ breadcrumbs: DriveBreadcrumb[]; isShared: boolean }>(`/drive/folders/${folderId}/breadcrumbs`)
  }

  static async createFolder(name: string, parentId?: string): Promise<DriveFolder> {
    return apiRequest<DriveFolder>('/drive/folders', {
      method: 'POST',
      body: JSON.stringify({ name, parentId })
    })
  }

  static async updateFolder(id: string, updates: { name?: string; parentId?: string | null }): Promise<DriveFolder> {
    return apiRequest<DriveFolder>(`/drive/folders/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
  }

  static async deleteFolder(id: string): Promise<void> {
    await apiRequest<void>(`/drive/folders/${id}`, { method: 'DELETE' })
  }

  static async addFavorite(entityType: string, entityId: string): Promise<DriveFavorite> {
    return apiRequest<DriveFavorite>('/drive/favorites', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId })
    })
  }

  static async removeFavorite(entityType: string, entityId: string): Promise<void> {
    await apiRequest<void>(`/drive/favorites/${entityType}/${entityId}`, { method: 'DELETE' })
  }

  static async listFavorites(): Promise<DriveFavorite[]> {
    return apiRequest<DriveFavorite[]>('/drive/favorites')
  }

  static async moveItems(
    items: Array<{ entityType: string; entityId: string }>,
    folderId?: string | null
  ): Promise<void> {
    await apiRequest<void>('/drive/move', {
      method: 'POST',
      body: JSON.stringify({ items, folderId })
    })
  }

  static async createShortcut(
    targetEntityType: string,
    targetEntityId: string,
    folderId?: string | null
  ): Promise<DriveShortcut> {
    return apiRequest<DriveShortcut>('/drive/shortcuts', {
      method: 'POST',
      body: JSON.stringify({ targetEntityType, targetEntityId, folderId })
    })
  }

  static async moveShortcut(shortcutId: string, folderId: string | null): Promise<DriveShortcut> {
    return apiRequest<DriveShortcut>(`/drive/shortcuts/${shortcutId}`, {
      method: 'PATCH',
      body: JSON.stringify({ folderId })
    })
  }

  static async deleteShortcut(shortcutId: string): Promise<void> {
    await apiRequest<void>(`/drive/shortcuts/${shortcutId}`, { method: 'DELETE' })
  }

  static async trashItems(items: Array<{ entityType: string; entityId: string }>): Promise<void> {
    await apiRequest<void>('/drive/trash', {
      method: 'POST',
      body: JSON.stringify({ items })
    })
  }

  static async restoreItems(items: Array<{ entityType: string; entityId: string }>): Promise<void> {
    await apiRequest<void>('/drive/restore', {
      method: 'POST',
      body: JSON.stringify({ items })
    })
  }

  static async emptyTrash(): Promise<{ deleted: number }> {
    return apiRequest<{ deleted: number }>('/drive/trash', { method: 'DELETE' })
  }

  static async search(query: string, contentTypes?: string[], limit?: number): Promise<DriveSearchResult[]> {
    return apiRequest<DriveSearchResult[]>('/drive/search', {
      method: 'POST',
      body: JSON.stringify({ query, contentTypes, limit })
    })
  }

  static async downloadFile(fileId: string): Promise<void> {
    const token = currentAccessToken
    const response = await fetch(`${API_URL}/drive/files/${fileId}/download`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    })
    if (!response.ok) throw new Error(`Download failed: ${response.status}`)
    const blob = await response.blob()
    const disposition = response.headers.get('Content-Disposition') ?? ''
    const nameMatch = disposition.match(/filename="(.+)"/)
    const fileName = nameMatch ? decodeURIComponent(nameMatch[1]) : 'download'
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  static async getFilePreviewBlob(fileId: string): Promise<{ url: string; mimeType: string }> {
    const token = currentAccessToken
    const response = await fetch(`${API_URL}/drive/files/${fileId}/download`, {
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    })
    if (!response.ok) throw new Error(`Preview fetch failed: ${response.status}`)
    const blob = await response.blob()
    const mimeType = blob.type || response.headers.get('Content-Type') || 'application/octet-stream'
    return { url: URL.createObjectURL(blob), mimeType }
  }

  static async fetchDocument(id: string): Promise<{ id: string; title: string; content: string; plainText?: string }> {
    return apiRequest(`/documents/${id}`)
  }

  static async fetchNote(id: string): Promise<{ id: string; title: string; content: string }> {
    return apiRequest(`/notes/${id}`)
  }

  static async fetchSpreadsheet(id: string): Promise<{
    id: string
    name: string
    sheets?: Array<{ id: string; name: string; columns: unknown[]; position: number }>
  }> {
    return apiRequest(`/spreadsheets/${id}`)
  }

  static async fetchSpreadsheetRows(appId: string, sheetId: string): Promise<Array<{ data: Record<string, unknown> }>> {
    return apiRequest(`/spreadsheets/${appId}/sheets/${sheetId}/rows`)
  }

  static async fetchSlide(id: string): Promise<{ id: string; title: string; content?: string; contentJson?: unknown }> {
    return apiRequest(`/slides/${id}`)
  }

  static async renameFile(fileId: string, name: string): Promise<DriveItem> {
    return apiRequest<DriveItem>(`/drive/files/${fileId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name })
    })
  }

  static async shareItem(
    entityType: string,
    entityId: string,
    recipients: Array<{ userId: string; permission: 'view' | 'comment' | 'edit' | 'admin' }>,
    message?: string,
    expiresAt?: string
  ): Promise<void> {
    await apiRequest<void>('/sharing', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, recipients, message, expiresAt })
    })
  }

  static async getSharedUsers(entityType: string, entityId: string): Promise<ShareInfo[]> {
    return apiRequest<ShareInfo[]>(`/sharing/${entityType}/${entityId}`)
  }

  static async updateSharePermission(shareId: string, permission: string): Promise<void> {
    await apiRequest<void>(`/sharing/${shareId}`, {
      method: 'PATCH',
      body: JSON.stringify({ permission })
    })
  }

  static async revokeShare(shareId: string): Promise<void> {
    await apiRequest<void>(`/sharing/${shareId}`, { method: 'DELETE' })
  }

  static async createShareLink(
    entityType: string,
    entityId: string,
    options?: { permission?: string; password?: string; expiresAt?: string; maxUses?: number; name?: string }
  ): Promise<ShareLinkInfo> {
    return apiRequest<ShareLinkInfo>('/sharing/links', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, ...options })
    })
  }

  static async getShareLinks(entityType: string, entityId: string): Promise<ShareLinkInfo[]> {
    return apiRequest<ShareLinkInfo[]>(`/sharing/links/${entityType}/${entityId}`)
  }

  static async deactivateShareLink(linkId: string): Promise<void> {
    await apiRequest<void>(`/sharing/links/${linkId}/deactivate`, { method: 'PATCH' })
  }

  static async uploadFile(
    file: File,
    folderId?: string
  ): Promise<DriveItem | { entityType: string; entityId: string; name: string }> {
    const token = currentAccessToken
    const formData = new FormData()
    formData.append('file', file)
    if (folderId) formData.append('folderId', folderId)

    const response = await fetch(`${API_URL}/drive/files/upload`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData
    })
    if (!response.ok) throw new Error(`Upload failed: ${response.status}`)
    return response.json()
  }
}
