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
  userId?: string
  /** Some responses use snake_case */
  user_id?: string
  teamId?: string
  team_id?: string
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

function normalizeCollectionMemberRole(raw: string): CollectionMemberRole {
  const r = raw.toLowerCase()
  if (r === 'owner' || r === 'admin' || r === 'editor' || r === 'viewer') {
    return r
  }
  return 'viewer'
}

function mapToMember(m: SpaceMemberApiResponse): CollectionMember {
  const userIdRaw = m.userId ?? m.user_id
  const teamIdRaw = m.teamId ?? m.team_id
  const userId = typeof userIdRaw === 'string' ? userIdRaw.trim() : ''
  const teamId = typeof teamIdRaw === 'string' ? teamIdRaw.trim() : undefined
  return {
    id: m.id,
    userId,
    ...(teamId ? { teamId } : {}),
    role: normalizeCollectionMemberRole(m.role),
    joinedAt: m.joinedAt,
    invitedBy: m.invitedBy
  }
}

/** Path segment for member sub-routes: prefer user id, then team id (document-service parity with Spaces). */
function memberSubresourceSegment(member: Pick<CollectionMember, 'id' | 'userId' | 'teamId'>): string | null {
  const uid = member.userId?.trim()
  if (uid) return uid
  const tid = member.teamId?.trim()
  if (tid) return tid
  return null
}

async function requestMemberMutation(
  collectionId: string,
  method: 'PATCH' | 'DELETE',
  pathSegment: string,
  body?: Record<string, unknown>
): Promise<void> {
  const encoded = encodeURIComponent(pathSegment)
  await apiRequest(`/spaces/${encodeURIComponent(collectionId)}/members/${encoded}`, {
    method,
    ...(body ? { body: JSON.stringify(body) } : {})
  })
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
   * PATCH member role. Path segment is user id or team id (see `useSpace`); if that 404s, retries with membership row `id`
   * for backends that key PATCH differently than DELETE.
   */
  async updateMemberRole(
    collectionId: string,
    member: Pick<CollectionMember, 'id' | 'userId' | 'teamId'>,
    role: CollectionMemberRole
  ): Promise<boolean> {
    const primary = memberSubresourceSegment(member)
    const membershipId = member.id?.trim()
    const tryPatch = async (segment: string) => {
      await requestMemberMutation(collectionId, 'PATCH', segment, { role })
    }
    try {
      if (primary) {
        await tryPatch(primary)
        return true
      }
      if (membershipId) {
        await tryPatch(membershipId)
        return true
      }
      return false
    } catch (err) {
      const status = (err as Error & { status?: number }).status
      if (status === 404 && primary && membershipId && membershipId !== primary) {
        try {
          await tryPatch(membershipId)
          return true
        } catch {
          return false
        }
      }
      return false
    }
  },

  /** DELETE must use user or team id in the path (same as `useSpace`); membership row id returns 404. */
  async removeMember(
    collectionId: string,
    member: Pick<CollectionMember, 'id' | 'userId' | 'teamId'>
  ): Promise<boolean> {
    const primary = memberSubresourceSegment(member)
    if (!primary) return false
    try {
      await requestMemberMutation(collectionId, 'DELETE', primary)
      return true
    } catch {
      return false
    }
  }
}

export default CollectionApiService
