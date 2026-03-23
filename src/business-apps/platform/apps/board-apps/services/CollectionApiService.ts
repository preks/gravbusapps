import type { BoardCollection, CollectionMember, CollectionMemberRole } from '../types/collection'
import type { BoardSummary } from '../types/board'
import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

let externalAuthTokenProvider: (() => string | null) | null = null

export function setCollectionApiAuthTokenProvider(provider: (() => string | null) | null) {
  externalAuthTokenProvider = provider
}

const getAuthToken = (): string | null => {
  try {
    return externalAuthTokenProvider?.() || null
  } catch {
    return null
  }
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }

  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    const err = new Error(error.message || `API Error: ${response.status}`) as Error & { status: number }
    err.status = response.status
    throw err
  }

  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T)
}

const COLLECTION_SETTINGS_TYPE = 'board_collection'

interface SpaceApiResponse {
  id: string
  name: string
  description?: string
  icon?: string
  color?: string
  coverImage?: string
  isPublic: boolean
  ownerId: string
  settings?: Record<string, unknown>
  members?: SpaceMemberApiResponse[]
  createdAt: string
  updatedAt: string
}

interface SpaceMemberApiResponse {
  id: string
  userId: string
  teamId?: string
  role: string
  invitedBy?: string
  joinedAt: string
}

interface SpaceContentItem {
  entityType: string
  entityId: string
  id: string
  title?: string
  name?: string
  description?: string
  ownerId: string
  createdAt: string
  updatedAt: string
  spaceId: string
  folderId?: string | null
}

function mapToCollection(space: SpaceApiResponse): BoardCollection {
  const contentCounts = (space.settings as Record<string, unknown>)?.contentCounts as Record<string, number> | undefined
  return {
    id: space.id,
    name: space.name,
    description: space.description,
    icon: space.icon,
    color: space.color,
    coverImage: space.coverImage,
    isPublic: space.isPublic,
    ownerId: space.ownerId,
    memberCount: space.members?.length ?? 0,
    boardCount: contentCounts?.spreadsheets ?? 0,
    createdAt: space.createdAt,
    updatedAt: space.updatedAt
  }
}

function mapToMember(m: SpaceMemberApiResponse): CollectionMember {
  return {
    id: m.id,
    userId: m.userId,
    role: m.role.toLowerCase() as CollectionMemberRole,
    joinedAt: m.joinedAt,
    invitedBy: m.invitedBy
  }
}

function mapToBoardSummary(item: SpaceContentItem): BoardSummary {
  return {
    id: item.entityId,
    name: item.name || item.title || 'Untitled',
    description: item.description,
    status: 'draft',
    sheetCount: 0,
    rowCount: 0,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt
  }
}

export const CollectionApiService = {
  /**
   * Lists every space the current user can access (owner or member), same universe as the Spaces app.
   * New spaces created from Boards still set settings.type === board_collection for analytics/distinguishing
   * creators, but listing is not limited to that — otherwise Spaces-app spaces would be hidden here.
   */
  async listCollections(): Promise<BoardCollection[]> {
    const params = new URLSearchParams({ includeContent: 'true' })
    const spaces = await apiRequest<SpaceApiResponse[]>(`/spaces?${params}`)
    return spaces.map(mapToCollection)
  },

  async createCollection(data: {
    name: string
    description?: string
    icon?: string
    color?: string
    isPublic?: boolean
    dimension?: { type: string; id: string; name: string }
    memberIds?: string[]
  }): Promise<BoardCollection> {
    const settings: Record<string, unknown> = { type: COLLECTION_SETTINGS_TYPE }
    if (data.dimension) {
      settings.dimension = { type: data.dimension.type, id: data.dimension.id, name: data.dimension.name }
    }

    const space = await apiRequest<SpaceApiResponse>('/spaces', {
      method: 'POST',
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        icon: data.icon,
        color: data.color,
        isPublic: data.isPublic ?? false,
        settings
      })
    })

    if (data.memberIds && data.memberIds.length > 0) {
      try {
        await apiRequest(`/spaces/${space.id}/members/bulk`, {
          method: 'POST',
          body: JSON.stringify({
            members: data.memberIds.map(userId => ({ userId, role: 'editor' }))
          })
        })
      } catch (err) {
        console.error('[CollectionApiService] Error adding members after creation:', err)
      }
    }

    return mapToCollection(space)
  },

  async getCollection(id: string): Promise<BoardCollection | null> {
    try {
      const space = await apiRequest<SpaceApiResponse>(`/spaces/${id}?includeContent=true`)
      return mapToCollection(space)
    } catch {
      return null
    }
  },

  async updateCollection(
    id: string,
    updates: Partial<Pick<BoardCollection, 'name' | 'description' | 'icon' | 'color'>>
  ): Promise<BoardCollection> {
    const space = await apiRequest<SpaceApiResponse>(`/spaces/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    })
    return mapToCollection(space)
  },

  async deleteCollection(id: string): Promise<boolean> {
    try {
      await apiRequest(`/spaces/${id}`, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  },

  async getCollectionBoards(collectionId: string): Promise<BoardSummary[]> {
    try {
      const content = await apiRequest<SpaceContentItem[]>(`/spaces/${collectionId}/content`)
      return content.filter(item => item.entityType === 'spreadsheet_app').map(mapToBoardSummary)
    } catch {
      return []
    }
  },

  async moveBoardToCollection(collectionId: string, boardId: string): Promise<boolean> {
    try {
      await apiRequest(`/spaces/${collectionId}/content`, {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'spreadsheet_app',
          entityId: boardId
        })
      })
      return true
    } catch {
      return false
    }
  },

  async removeBoardFromCollection(collectionId: string, boardId: string): Promise<boolean> {
    try {
      await apiRequest(`/spaces/${collectionId}/content/spreadsheet_app/${boardId}`, {
        method: 'DELETE'
      })
      return true
    } catch {
      return false
    }
  },

  async getMembers(collectionId: string): Promise<CollectionMember[]> {
    try {
      const space = await apiRequest<SpaceApiResponse>(`/spaces/${collectionId}`)
      return (space.members || []).map(mapToMember)
    } catch {
      return []
    }
  },

  async addMembers(
    collectionId: string,
    members: Array<{ userId: string; role: CollectionMemberRole }>
  ): Promise<boolean> {
    try {
      await apiRequest(`/spaces/${collectionId}/members/bulk`, {
        method: 'POST',
        body: JSON.stringify({
          members: members.map(m => ({
            userId: m.userId,
            role: m.role
          }))
        })
      })
      return true
    } catch {
      return false
    }
  },

  /**
   * Document service routes use the member's user id in the path (same as Spaces `useSpace`),
   * not the space-membership row id — using the latter returns 404 "Member not found".
   */
  async updateMemberRole(collectionId: string, userId: string, role: CollectionMemberRole): Promise<boolean> {
    try {
      await apiRequest(`/spaces/${collectionId}/members/${userId}`, {
        method: 'PATCH',
        body: JSON.stringify({ role })
      })
      return true
    } catch {
      return false
    }
  },

  async removeMember(collectionId: string, userId: string): Promise<boolean> {
    try {
      await apiRequest(`/spaces/${collectionId}/members/${userId}`, {
        method: 'DELETE'
      })
      return true
    } catch {
      return false
    }
  }
}

export default CollectionApiService
