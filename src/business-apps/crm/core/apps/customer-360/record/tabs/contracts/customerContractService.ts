import { DOCUMENT_API_URL } from '@/common/utils/serviceResolver'
import type { CustomerContract } from '../../../data/types'
import {
  mapContractAssignment,
  type Customer360ContractAssetType,
  type RawContractAssignment
} from './customerContractMapping'

export { buildOfficeAssetUrl } from './customerContractMapping'
export type { Customer360ContractAssetType } from './customerContractMapping'

export const CUSTOMER_360_CONTRACTS_CHANGED_EVENT = 'customer-360-contracts-changed'

export interface Customer360ContractSpace {
  id: string
  name?: string
}

export interface Customer360ContractCatalogs {
  statuses: string[]
  contractTypes: string[]
}

export interface Customer360ContractMetadataInput {
  contractNumber?: string
  contractType?: string
  status?: string
  effectiveDate?: string
  signedDate?: string
  expiryDate?: string
  renewalDate?: string
  reminderDeadlineDate?: string
  terminationDate?: string
  noticePeriodDays?: number
}

interface RequestOptions {
  accessToken: string
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE'
  body?: unknown
}

const ENTITY_DIMENSION = {
  system: 'crm',
  type: 'account'
} as const

export const FALLBACK_CONTRACT_CATALOGS: Customer360ContractCatalogs = {
  statuses: ['draft', 'active', 'expiring_soon', 'expired', 'renewed', 'terminated'],
  contractTypes: ['base', 'msa', 'order_form', 'sow', 'nda', 'dpa', 'amendment', 'other']
}

function buildQuery(params: Record<string, string>): string {
  return new URLSearchParams(params).toString()
}

async function requestDocumentService<T>(
  path: string,
  { accessToken, method = 'GET', body }: RequestOptions
): Promise<T> {
  if (!accessToken) throw new Error('Access token missing')

  const response = await fetch(`${DOCUMENT_API_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' })
    },
    body: body === undefined ? undefined : JSON.stringify(body)
  })

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText)
    const detail = message ? `: ${message}` : ''
    throw new Error(`Document service request failed with status ${response.status}${detail}`)
  }

  if (response.status === 204) return undefined as T
  const text = await response.text()
  return (text ? JSON.parse(text) : undefined) as T
}

function unwrapItems<T>(payload: T[] | { items?: T[]; data?: T[] }): T[] {
  if (Array.isArray(payload)) return payload
  return payload.items ?? payload.data ?? []
}

function isNotFoundError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : ''
  return message.includes('404') || message.toLowerCase().includes('not found')
}

export async function listAccountContracts(accessToken: string, accountId: string): Promise<CustomerContract[]> {
  const space = await getSpaceByAccountDimension(accessToken, accountId)
  if (!space) return []

  const query = buildQuery({ ...ENTITY_DIMENSION, id: accountId })
  try {
    const payload = await requestDocumentService<
      RawContractAssignment[] | { items?: RawContractAssignment[]; data?: RawContractAssignment[] }
    >(`/spaces/by-dimension/contracts?${query}`, { accessToken })

    return unwrapItems(payload).map(mapContractAssignment)
  } catch (error) {
    if (isNotFoundError(error)) return []
    throw error
  }
}

export async function getContractCatalogs(accessToken: string): Promise<Customer360ContractCatalogs> {
  try {
    const catalogs = await requestDocumentService<Partial<Customer360ContractCatalogs>>('/contract-catalogs', {
      accessToken
    })
    return {
      statuses: catalogs.statuses?.length ? catalogs.statuses : FALLBACK_CONTRACT_CATALOGS.statuses,
      contractTypes: catalogs.contractTypes?.length ? catalogs.contractTypes : FALLBACK_CONTRACT_CATALOGS.contractTypes
    }
  } catch (error) {
    if (isNotFoundError(error)) return FALLBACK_CONTRACT_CATALOGS
    throw error
  }
}

export async function getSpaceByAccountDimension(
  accessToken: string,
  accountId: string
): Promise<Customer360ContractSpace | null> {
  const query = buildQuery({ ...ENTITY_DIMENSION, id: accountId })
  try {
    return await requestDocumentService<Customer360ContractSpace>(`/spaces/by-dimension?${query}`, { accessToken })
  } catch (error) {
    if (isNotFoundError(error)) return null
    throw error
  }
}

export async function ensureAccountSpace(
  accessToken: string,
  accountId: string,
  accountName: string
): Promise<Customer360ContractSpace> {
  const existing = await getSpaceByAccountDimension(accessToken, accountId)
  if (existing) return existing

  return requestDocumentService<Customer360ContractSpace>('/spaces/by-dimension', {
    accessToken,
    method: 'POST',
    body: {
      ...ENTITY_DIMENSION,
      id: accountId,
      name: accountName,
      settings: { type: 'entity_document_space' }
    }
  })
}

export async function assignContractAsset(
  accessToken: string,
  params: {
    spaceId: string
    assetType: Customer360ContractAssetType
    assetId: string
  }
): Promise<{ id: string }> {
  const response = await requestDocumentService<{ assignment?: { id?: string }; id?: string }>(
    '/space-asset-assignments',
    {
      accessToken,
      method: 'POST',
      body: {
        spaceId: params.spaceId,
        assetType: params.assetType,
        assetId: params.assetId,
        role: 'contract'
      }
    }
  )

  const assignmentId = response.assignment?.id ?? response.id
  if (!assignmentId) {
    throw new Error('Document service assignment response did not include an assignment id')
  }

  return { id: assignmentId }
}

export async function upsertContractMetadata(
  accessToken: string,
  assignmentId: string,
  metadata: Customer360ContractMetadataInput
): Promise<unknown> {
  if (!assignmentId) {
    throw new Error('Assignment id missing for contract metadata request')
  }

  return requestDocumentService(`/space-asset-assignments/${assignmentId}/contract-metadata`, {
    accessToken,
    method: 'POST',
    body: metadata
  })
}

export async function updateContractMetadata(
  accessToken: string,
  assignmentId: string,
  metadata: Customer360ContractMetadataInput
): Promise<unknown> {
  if (!assignmentId) {
    throw new Error('Assignment id missing for contract metadata request')
  }

  return requestDocumentService(`/space-asset-assignments/${assignmentId}/contract-metadata`, {
    accessToken,
    method: 'PATCH',
    body: metadata
  })
}

export async function deleteContractAssignment(accessToken: string, assignmentId: string): Promise<void> {
  if (!assignmentId) {
    throw new Error('Assignment id missing for contract delete request')
  }

  await requestDocumentService<void>(`/space-asset-assignments/${assignmentId}`, {
    accessToken,
    method: 'DELETE'
  })
}

export function notifyCustomerContractsChanged(): void {
  if (globalThis.window === undefined) return
  globalThis.dispatchEvent(new CustomEvent(CUSTOMER_360_CONTRACTS_CHANGED_EVENT))
}
