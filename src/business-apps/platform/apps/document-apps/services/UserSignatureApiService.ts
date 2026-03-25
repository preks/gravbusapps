/**
 * UserSignatureApiService
 *
 * Connects to the document-service signatures API for the current user's signature library.
 */

import { officeClient } from '@/common/network/office/OfficeClient'

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

function getOfficeClient(accessTokenOverride?: string | null) {
  const token = accessTokenOverride ?? currentAccessToken
  if (token) {
    officeClient.setAccessToken(token)
  }
  return officeClient
}

export const UserSignatureApiService = {
  setAccessToken(token: string | null) {
    currentAccessToken = token
    if (token) {
      officeClient.setAccessToken(token)
    }
  },

  async list(accessToken?: string | null): Promise<UserSignatureDto[]> {
    return getOfficeClient(accessToken).documents.listSignatures<UserSignatureDto[]>()
  },

  async get(id: string, accessToken?: string | null): Promise<UserSignatureDto> {
    return getOfficeClient(accessToken).documents.getSignature<UserSignatureDto>(id)
  },

  async create(body: CreateSignatureDto, accessToken?: string | null): Promise<UserSignatureDto> {
    return getOfficeClient(accessToken).documents.createSignature<UserSignatureDto>(body)
  },

  async update(id: string, body: UpdateSignatureDto, accessToken?: string | null): Promise<UserSignatureDto> {
    return getOfficeClient(accessToken).documents.updateSignature<UserSignatureDto>(id, body)
  },

  async remove(id: string, accessToken?: string | null): Promise<void> {
    await getOfficeClient(accessToken).documents.deleteSignature(id)
  },

  async setDefault(id: string, accessToken?: string | null): Promise<UserSignatureDto> {
    return getOfficeClient(accessToken).documents.setDefaultSignature<UserSignatureDto>(id)
  }
}
