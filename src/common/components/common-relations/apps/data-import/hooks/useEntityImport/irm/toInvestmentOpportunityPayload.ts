/**
 * IRM investment opportunity payload builder.
 */

import { buildInvestmentOpportunityPayload } from '@/common/data/investment/types/investmentOpportunityTypes'
import {
  normalizeEntityForImport,
  resolveOwnerEmployeeId,
  sanitizeAdditionalProperties,
  stripEmptyValues
} from '../shared'

export function toInvestmentOpportunityPayload(
  entity: Record<string, any>,
  ownerEmployeeId?: string
): Record<string, any> {
  const normalized = normalizeEntityForImport(entity)
  const resolvedOwnerEmployeeId = resolveOwnerEmployeeId(normalized, ownerEmployeeId)
  const additionalProperties = sanitizeAdditionalProperties(normalized.additionalProperties)

  const payloadInput = stripEmptyValues({
    ...normalized,
    ownerEmployeeId: resolvedOwnerEmployeeId
  })

  delete (payloadInput as Record<string, unknown>).ownerEmployee

  const built = buildInvestmentOpportunityPayload(payloadInput).investmentOpportunity as Record<string, any>
  if (additionalProperties) {
    built.additionalProperties = additionalProperties
  }
  return built
}
