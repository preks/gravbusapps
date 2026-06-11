import { JobFunction } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types.ts'
import { normalizeString } from '@/business-apps/mdm/utils/normalizationUtils.ts'

// ─── Row shape returned by Hasura ────────────────────────────────────────────
// TODO: Check using Partial<entity> instead of declaring the fields
export interface JobProfileSkillRow {
  requiredLevel: number | null
  skill: {
    id: string
    name: string
  } | null
}

export interface JobProfileAdditionalProperties {
  promotionCriteria?: string[]
}

export interface JobProfileRow {
  id: string
  code: string
  name: string
  description: string | null
  jobFunction: JobFunction | null
  jobLevel: { id: string; name: string; code: string; hierarchyOrder: number } | null
  version: number | null
  jobProfileSkills: JobProfileSkillRow[]
  additionalProperties?: JobProfileAdditionalProperties | null
}

// ─── Simplified domain type ───────────────────────────────────────────────────

export interface JobProfileSkill {
  requiredLevel: number | null
  skill: {
    id: string
    name: string
  } | null
}

export interface JobProfile {
  id: string
  code: string
  name: string
  title?: string
  description: string
  jobFunction: JobFunction | null
  jobLevel: { id: string; name: string; code: string; hierarchyOrder: number } | null
  isActive: boolean
  version: number | null
  jobProfileSkills: JobProfileSkill[]
  additionalProperties?: JobProfileAdditionalProperties | null
}

// ─── Mutation types ────────────────────────────────────────────────────────────

export interface JobProfileSkillMutation {
  skillId: string
  skillName: string | null
  requiredLevel: number | null
}

export interface JobProfileMutation {
  id?: string
  code: string
  name: string
  description?: string
  jobFunction?: string | null
  jobLevel?: string | null
  version?: number | null
  jobDescriptionFileId?: string | null
  skills?: JobProfileSkillMutation[]
  additionalProperties?: JobProfileAdditionalProperties | null
}

export interface JobProfileMutationPayload {
  changeMode: 'INSERT'
  jobProfile: JobProfileMutation
}

export interface JobProfileDeletionPayload {
  changeMode: 'DELETE'
  jobProfile: {
    id: string
    version?: number | null
  }
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface GetJobProfilesResponse {
  jobProfiles: JobProfileRow[]
  JobProfileAggregate: {
    aggregate: {
      count: number
    }
  }
}

// ─── Transform ────────────────────────────────────────────────────────────────

export const transformJobProfileRow = (row: JobProfileRow): JobProfile => {
  return {
    ...row,
    description: normalizeString(row.description),
    isActive: true,
    jobProfileSkills: (row.jobProfileSkills || []).map(skillRow => ({
      requiredLevel: skillRow.requiredLevel,
      skill: skillRow.skill
    }))
  }
}
