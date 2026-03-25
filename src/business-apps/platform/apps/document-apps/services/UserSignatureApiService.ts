/**
 * UserSignatureApiService
 *
 * Connects to the document-service signatures API for the current user's signature library.
 */

import { getDocumentServiceApiUrl } from '@/business-apps/platform/apps/shared/utils/documentServiceUrl'

const API_URL = getDocumentServiceApiUrl()

let currentAccessToken: string | null = null

export type SignatureKind = 'typed' | 'drawn' | 'uploaded'

export interface UserSignatureDto {
  id: string
  userId: string
  name: string
  kind: SignatureKind
  isDefault: boolean
  sourceData?: Record<string, unknown>
  snapshotSvg: string
  initialsSnapshotSvg?: string | null
  previewSvg?: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateSignatureDto {
  name: string
  kind: SignatureKind
  isDefault?: boolean
  sourceData?: Record<string, unknown>
  snapshotSvg: string
  initialsSnapshotSvg?: string | null
  previewSvg?: string | null
}

export interface UpdateSignatureDto {
  name?: string
  isDefault?: boolean
  sourceData?: Record<string, unknown>
  snapshotSvg?: string
  initialsSnapshotSvg?: string | null
  previewSvg?: string | null
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  accessTokenOverride?: string | null
): Promise<T> {
  const token = accessTokenOverride ?? currentAccessToken
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  }
  const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers })
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error((error as { message?: string }).message || `API Error: ${response.status}`)
  }
  const text = await response.text()
  return (text ? JSON.parse(text) : null) as T
}

export const UserSignatureApiService = {
  setAccessToken(token: string | null) {
    currentAccessToken = token
  },

  async list(accessToken?: string | null): Promise<UserSignatureDto[]> {
    return apiRequest<UserSignatureDto[]>('/signatures', { method: 'GET' }, accessToken)
  },

  async get(id: string, accessToken?: string | null): Promise<UserSignatureDto> {
    return apiRequest<UserSignatureDto>(`/signatures/${id}`, { method: 'GET' }, accessToken)
  },

  async create(body: CreateSignatureDto, accessToken?: string | null): Promise<UserSignatureDto> {
    return apiRequest<UserSignatureDto>(
      '/signatures',
      {
        method: 'POST',
        body: JSON.stringify(body)
      },
      accessToken
    )
  },

  async update(id: string, body: UpdateSignatureDto, accessToken?: string | null): Promise<UserSignatureDto> {
    return apiRequest<UserSignatureDto>(
      `/signatures/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(body)
      },
      accessToken
    )
  },

  async remove(id: string, accessToken?: string | null): Promise<void> {
    await apiRequest(`/signatures/${id}`, { method: 'DELETE' }, accessToken)
  },

  async setDefault(id: string, accessToken?: string | null): Promise<UserSignatureDto> {
    return apiRequest<UserSignatureDto>(
      `/signatures/${id}/default`,
      {
        method: 'POST'
      },
      accessToken
    )
  }
}
