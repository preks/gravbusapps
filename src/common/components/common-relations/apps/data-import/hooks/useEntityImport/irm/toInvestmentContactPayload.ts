/**
 * IRM investment contact payload builder. Keeps the submit payload
 * deterministic by forwarding only fields confirmed by successful Java
 * process calls, and falls back to email/phone values extracted from the
 * communication-channels array when not present at the root.
 */

import { buildInvestmentContactPayload } from '@/common/data/investment/types/investmentContactTypes'
import {
  normalizeEntityForImport,
  resolveContactValueByChannelCode,
  resolveOwnerEmployeeId,
  sanitizeCommunicationChannels,
  stripEmptyValues
} from '../shared'

export function toInvestmentContactPayload(entity: Record<string, any>, ownerEmployeeId?: string): Record<string, any> {
  const normalized = normalizeEntityForImport(entity)
  const resolvedOwnerEmployeeId = resolveOwnerEmployeeId(normalized, ownerEmployeeId)
  const sanitizedChannels = sanitizeCommunicationChannels(normalized.communicationChannels)
  const emailFromChannels = sanitizedChannels
    ? resolveContactValueByChannelCode(sanitizedChannels, 'CommunicationChannel:v1:e-mail')
    : undefined
  const phoneFromChannels = sanitizedChannels
    ? resolveContactValueByChannelCode(sanitizedChannels, 'CommunicationChannel:v1:Phone') ||
      resolveContactValueByChannelCode(sanitizedChannels, 'CommunicationChannel:v1:Mobile')
    : undefined

  const payloadInput = stripEmptyValues({
    firstName: typeof normalized.firstName === 'string' ? normalized.firstName : undefined,
    lastName: typeof normalized.lastName === 'string' ? normalized.lastName : undefined,
    jobPosition: typeof normalized.jobPosition === 'string' ? normalized.jobPosition : undefined,
    description: typeof normalized.description === 'string' ? normalized.description : undefined,
    email: typeof normalized.email === 'string' ? normalized.email : emailFromChannels,
    phone: typeof normalized.phone === 'string' ? normalized.phone : phoneFromChannels,
    userId: typeof normalized.userId === 'string' ? normalized.userId : undefined,
    ownerEmployeeId: resolvedOwnerEmployeeId,
    communicationChannels: sanitizedChannels
  })

  return buildInvestmentContactPayload(payloadInput as any).investmentContact
}
