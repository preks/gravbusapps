/**
 * CRM account payload builder. Takes a flat converted entity and produces the
 * exact shape expected by `customer-relations/createAccounts`.
 */

import { buildCustomerAccountPayload } from '@/common/data/customer/types/customerAccountTypes'
import {
  normalizeEntityForImport,
  sanitizeAdditionalProperties,
  sanitizeCommunicationChannels,
  resolveOwnerEmployeeId,
  stripEmptyValues
} from '../shared'

export function toCustomerAccountPayload(entity: Record<string, any>, ownerEmployeeId?: string): Record<string, any> {
  const normalized = normalizeEntityForImport(entity)
  const resolvedOwnerEmployeeId = resolveOwnerEmployeeId(normalized, ownerEmployeeId)
  const sanitizedChannels = sanitizeCommunicationChannels(normalized.communicationChannels)
  const additionalProperties = sanitizeAdditionalProperties(normalized.additionalProperties)

  const payloadInput = stripEmptyValues({
    ...normalized,
    ownerEmployeeId: resolvedOwnerEmployeeId,
    communicationChannels: sanitizedChannels,
    additionalProperties
  })

  delete (payloadInput as Record<string, unknown>).ownerEmployee

  return buildCustomerAccountPayload(payloadInput as any).account
}
