import { normalizeString } from '@/business-apps/mdm/utils/normalizationUtils.ts'

// ─── Row shape returned by Hasura ────────────────────────────────────────────

export interface JobLevelRow {
  id: string
  code: string
  name: string
  description: string | null
  hierarchyOrder: number
  version: number | null
}

// ─── Simplified domain type ───────────────────────────────────────────────────

export interface JobLevel {
  id: string
  code: string
  name: string
  description: string
  hierarchyOrder: number
  isActive: boolean
  version: number | null
}

// ─── Mutation types ────────────────────────────────────────────────────────────

export interface JobLevelMutation {
  id?: string
  code: string
  name: string
  description?: string
  hierarchyOrder: number
  version?: number | null
}

export interface JobLevelMutationPayload {
  changeMode: 'INSERT' | 'DELETE'
  jobLevel: JobLevelMutation
}

export interface JobLevelDeletionPayload {
  changeMode: 'DELETE'
  jobLevel: {
    id: string
    version?: number | null
  }
}

// ─── Response types ───────────────────────────────────────────────────────────

export interface GetJobLevelsResponse {
  jobLevels: JobLevelRow[]
  JobLevelAggregate: {
    aggregate: {
      count: number
    }
  }
}

// ─── Transform ────────────────────────────────────────────────────────────────

export const transformJobLevelRow = (row: JobLevelRow): JobLevel => {
  return {
    ...row,
    description: normalizeString(row.description),
    isActive: true
  }
}
