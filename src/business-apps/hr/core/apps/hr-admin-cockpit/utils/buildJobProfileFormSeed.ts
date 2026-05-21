import type { JobLevel } from '@/business-apps/mdm/apps/job-structure-data/utils/JobLevel.types'
import type { JobFunction } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types'
import type { JobProfile } from '@/business-apps/mdm/apps/job-structure-data/utils/JobProfile.types'
import type { JobArchitectureListItem } from '../types/dataQuality.types'

function normalizeMatchValue(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase()
}

function resolveByCodeOrName<T extends { name?: string | null; code?: string | null }>(
  input: { name?: string | null; code?: string | null } | null | undefined,
  options: readonly T[]
): T | null {
  if (!input) return null

  const codeKey = normalizeMatchValue(input.code)
  if (codeKey) {
    const byCode = options.find(o => normalizeMatchValue(o.code) === codeKey)
    if (byCode) return byCode
  }

  const nameKey = normalizeMatchValue(input.name)
  if (nameKey) {
    const byName = options.find(o => normalizeMatchValue(o.name) === nameKey)
    if (byName) return byName
  }

  return null
}

export function buildJobProfileFormSeed(
  item: JobArchitectureListItem,
  refs: { jobFunctions: readonly JobFunction[]; jobLevels: readonly JobLevel[] }
): Partial<JobProfile> {
  const d = item.profileDetail

  const resolvedJobFunction = resolveByCodeOrName(d?.jobFunction, refs.jobFunctions)
  const resolvedJobLevel = resolveByCodeOrName(d?.jobLevel, refs.jobLevels)

  return {
    id: item.id,
    code: d?.code ?? '',
    name: item.name,
    description: d?.description ?? '',
    jobFunction: resolvedJobFunction,
    jobLevel: resolvedJobLevel
      ? {
          id: resolvedJobLevel.id,
          name: resolvedJobLevel.name,
          code: resolvedJobLevel.code,
          hierarchyOrder: resolvedJobLevel.hierarchyOrder
        }
      : null,
    isActive: true,
    version: null,
    jobProfileSkills: (d?.skills ?? []).map(s => ({
      requiredLevel: s.requiredLevel ?? null,
      skill: { id: '', name: s.name }
    }))
  }
}
