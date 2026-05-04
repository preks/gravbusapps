import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'
import type {
  Comment,
  CommentQueryOptions,
  CreateCommentInput
} from '@/business-apps/platform/apps/shared/types/versioning'
import type { WhiteboardSummary, Whiteboard } from '../types'

interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface WhiteboardMetadataUpdate {
  title?: string
  description?: string
  spaceId?: string
  settings?: Record<string, unknown>
  createVersion?: boolean
}

function parseWhiteboardAnchorPath(anchorPath: string | undefined): Comment['anchorData'] {
  if (!anchorPath) {
    return undefined
  }

  try {
    return JSON.parse(anchorPath) as Comment['anchorData']
  } catch {
    return undefined
  }
}

function parseJsonSafely<T>(rawText: string): T | null {
  const text = rawText.trim()
  if (!text) return null
  try {
    return JSON.parse(text) as T
  } catch {
    // Defensive: avoid crashing screen bootstrap on malformed backend payloads.
    return null
  }
}

async function request<T>(path: string, accessToken: string, options?: RequestInit): Promise<T> {
  const baseUrl = getDocumentServiceApiUrl()
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...(options?.headers || {})
    }
  })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(error.message || `API Error: ${response.status}`)
  }
  const text = await response.text()
  return parseJsonSafely<T>(text) as T
}

function mapApiComment(rawComment: Record<string, unknown>, whiteboardId: string): Comment {
  return {
    id: rawComment.id as string,
    entityId: whiteboardId,
    entityType: 'whiteboard',
    type: rawComment.type as Comment['type'],
    content: rawComment.content as string,
    createdBy: rawComment.createdBy as string,
    createdByName: rawComment.createdByName as string | undefined,
    createdByAvatar: rawComment.createdByAvatar as string | undefined,
    createdAt: rawComment.createdAt as string,
    updatedAt: rawComment.updatedAt as string | undefined,
    resolvedAt: rawComment.resolvedAt as string | undefined,
    resolvedBy: rawComment.resolvedBy as string | undefined,
    selectionStart: rawComment.selectionStart as number | undefined,
    selectionEnd: rawComment.selectionEnd as number | undefined,
    selectedText: rawComment.selectedText as string | undefined,
    anchorPath: rawComment.anchorPath as string | undefined,
    anchorData: parseWhiteboardAnchorPath(rawComment.anchorPath as string | undefined),
    cellReference: rawComment.cellReference as string | undefined,
    sheetId: rawComment.sheetId as string | undefined,
    parentId: rawComment.parentId as string | undefined,
    replies: (rawComment.replies as Record<string, unknown>[] | undefined)?.map(reply =>
      mapApiComment({ ...reply, parentId: reply.parentId ?? rawComment.id }, whiteboardId)
    )
  }
}

export const WhiteboardApiService = {
  async list(
    accessToken: string,
    params?: {
      search?: string
      includeShared?: boolean
      page?: number
      limit?: number
      sortBy?: string
      sortOrder?: string
    }
  ): Promise<PaginatedResponse<WhiteboardSummary>> {
    const searchParams = new URLSearchParams()
    if (params?.search) searchParams.set('search', params.search)
    if (params?.includeShared !== undefined) searchParams.set('includeShared', String(params.includeShared))
    if (params?.page) searchParams.set('page', String(params.page))
    if (params?.limit) searchParams.set('limit', String(params.limit))
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy)
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder)
    const qs = searchParams.toString()
    return request(`/whiteboards${qs ? `?${qs}` : ''}`, accessToken)
  },

  async get(accessToken: string, id: string): Promise<WhiteboardSummary> {
    return request(`/whiteboards/${id}`, accessToken)
  },

  async getTrashedPreview(accessToken: string, id: string): Promise<WhiteboardSummary> {
    return request(`/whiteboards/${id}/trashed-preview`, accessToken)
  },

  async create(
    accessToken: string,
    data: { title: string; description?: string; spaceId?: string }
  ): Promise<Whiteboard> {
    return request('/whiteboards', accessToken, {
      method: 'POST',
      body: JSON.stringify(data)
    })
  },

  async update(accessToken: string, id: string, data: WhiteboardMetadataUpdate): Promise<WhiteboardSummary> {
    return request(`/whiteboards/${id}`, accessToken, {
      method: 'PATCH',
      body: JSON.stringify(data)
    })
  },

  async remove(accessToken: string, id: string): Promise<void> {
    await request(`/whiteboards/${id}`, accessToken, { method: 'DELETE' })
  },

  async duplicate(accessToken: string, id: string): Promise<Whiteboard> {
    return request(`/whiteboards/${id}/duplicate`, accessToken, { method: 'POST' })
  },

  async share(
    accessToken: string,
    id: string,
    data: { userId: string; permission: string; message?: string }
  ): Promise<unknown> {
    return request('/sharing', accessToken, {
      method: 'POST',
      body: JSON.stringify({
        entityType: 'whiteboard',
        entityId: id,
        recipients: [{ userId: data.userId, permission: data.permission }],
        ...(data.message ? { message: data.message } : {})
      })
    })
  },

  /** Share with multiple users (same contract as slide/note sharing). */
  async shareMany(
    accessToken: string,
    whiteboardId: string,
    userIds: string[],
    permission: 'view' | 'edit' | 'comment',
    message?: string
  ): Promise<boolean> {
    try {
      if (userIds.length === 0) return true

      await request('/sharing', accessToken, {
        method: 'POST',
        body: JSON.stringify({
          entityType: 'whiteboard',
          entityId: whiteboardId,
          recipients: userIds.map(userId => ({ userId, permission })),
          ...(message ? { message } : {})
        })
      })
      return true
    } catch {
      return false
    }
  },

  async getSharedUsers(accessToken: string, id: string): Promise<unknown[]> {
    return request(`/sharing/whiteboard/${id}`, accessToken)
  },

  async createComment(accessToken: string, whiteboardId: string, input: CreateCommentInput): Promise<Comment | null> {
    try {
      const { anchorData, ...restInput } = input
      const response = await request<Record<string, unknown>>(`/comments/whiteboard/${whiteboardId}`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
          ...restInput,
          ...(anchorData ? { anchorPath: JSON.stringify(anchorData) } : {})
        })
      })

      return mapApiComment(response, whiteboardId)
    } catch {
      return null
    }
  },

  async listComments(accessToken: string, whiteboardId: string, options?: CommentQueryOptions): Promise<Comment[]> {
    try {
      const params = new URLSearchParams()
      if (options?.includeResolved) params.set('includeResolved', 'true')
      if (options?.includeReplies) params.set('includeReplies', 'true')
      if (options?.type) params.set('type', options.type)

      const queryString = params.toString()
      const response = await request<Record<string, unknown>[]>(
        `/comments/whiteboard/${whiteboardId}${queryString ? `?${queryString}` : ''}`,
        accessToken
      )

      return response.map(comment => mapApiComment(comment, whiteboardId))
    } catch {
      return []
    }
  },

  async updateComment(accessToken: string, commentId: string, updates: Partial<Comment>): Promise<Comment | null> {
    try {
      const response = await request<Record<string, unknown>>(`/comments/${commentId}`, accessToken, {
        method: 'PATCH',
        body: JSON.stringify({ content: updates.content })
      })

      return mapApiComment(response, response.entityId as string)
    } catch {
      return null
    }
  },

  async resolveComment(accessToken: string, commentId: string): Promise<boolean> {
    try {
      await request(`/comments/${commentId}/resolve`, accessToken, { method: 'PATCH' })
      return true
    } catch {
      return false
    }
  },

  async unresolveComment(accessToken: string, commentId: string): Promise<boolean> {
    try {
      await request(`/comments/${commentId}/unresolve`, accessToken, { method: 'PATCH' })
      return true
    } catch {
      return false
    }
  },

  async deleteComment(accessToken: string, commentId: string): Promise<boolean> {
    try {
      await request(`/comments/${commentId}`, accessToken, { method: 'DELETE' })
      return true
    } catch {
      return false
    }
  },

  async replyToComment(
    accessToken: string,
    commentId: string,
    reply: string,
    userName?: string,
    userAvatar?: string
  ): Promise<Comment | null> {
    try {
      const response = await request<Record<string, unknown>>(`/comments/${commentId}/reply`, accessToken, {
        method: 'POST',
        body: JSON.stringify({
          content: reply,
          ...(userName ? { createdByName: userName } : {}),
          ...(userAvatar ? { createdByAvatar: userAvatar } : {})
        })
      })

      return mapApiComment(response, response.entityId as string)
    } catch {
      return null
    }
  }
}
