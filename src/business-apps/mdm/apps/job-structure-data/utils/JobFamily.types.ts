import { normalizeString } from '@/business-apps/mdm/utils/normalizationUtils.ts'

// ─── Row shape returned by Hasura ────────────────────────────────────────────

export interface JobFamilyRow {
  id: string
  code: string | null
  name: string | null
  description: string | null
  version: number | null
}

// ─── Base Types ──────────────────────────────────────────────────────────────

export interface JobFamily {
  id: string
  code: string
  name: string
  description: string
  isActive: boolean
  version: number | null
}

// ─── Mutation Types ──────────────────────────────────────────────────────────

export interface JobFamilyMutation {
  code: string
  name: string
  description: string
  id?: string
  version?: number | null
}

export interface JobFamilyMutationPayload {
  jobFamily: JobFamilyMutation
}

export interface JobFamilyDeletionPayload {
  jobFamily: {
    id: string
    version?: number | null
  }
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface GetJobFamiliesResponse {
  jobFamilies: JobFamily[]
  JobFamilyAggregate: {
    aggregate: {
      count: number
    }
  }
}

// ─── Transform ────────────────────────────────────────────────────────────────

export const transformJobFamilyRow = (row: JobFamilyRow): JobFamily => {
  return {
    ...row,
    code: normalizeString(row.code),
    name: normalizeString(row.name),
    description: normalizeString(row.description),
    isActive: true
  }
}
