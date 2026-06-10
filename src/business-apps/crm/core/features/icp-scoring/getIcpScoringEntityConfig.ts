import type { IcpScoringEntityConfig, IcpScoringEntityType } from '@/common/components/icp-scoring'
import { createLeadIcpScoringEntityConfig } from './adapters/createLeadIcpScoringEntityConfig'
import { createOpportunityIcpScoringEntityConfig } from './adapters/createOpportunityIcpScoringEntityConfig'

type TranslateFn = (key: string, params?: Record<string, string | number>) => string

const SUPPORTED_ENTITY_TYPES = new Set<IcpScoringEntityType>(['lead', 'opportunity'])

export function isIcpScoringEntityType(entityType: string): entityType is IcpScoringEntityType {
  return SUPPORTED_ENTITY_TYPES.has(entityType as IcpScoringEntityType)
}

export function getIcpScoringEntityConfig(entityType: string, t: TranslateFn): IcpScoringEntityConfig | null {
  if (entityType === 'lead') {
    return createLeadIcpScoringEntityConfig(t)
  }

  if (entityType === 'opportunity') {
    return createOpportunityIcpScoringEntityConfig(t)
  }

  return null
}
