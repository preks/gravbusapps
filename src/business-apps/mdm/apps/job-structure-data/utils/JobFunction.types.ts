import { normalizeString } from '@/business-apps/mdm/utils/normalizationUtils.ts'

export interface JobFunctionRow {
  id: string
  code: string | null
  name: string | null
  nameI18n: { [key: string]: string } | null
  description: string | null
  descriptionI18n: { [key: string]: string } | null
  jobFamily: { id: string; name: string; code: string } | null
  version: number
}

export interface GetJobFunctionsResponse {
  jobFunctions: JobFunctionRow[]
  JobFunctionAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface JobFunction {
  id: string
  code: string
  name: string
  nameI18n: { [key: string]: string } | null
  description: string
  descriptionI18n: { [key: string]: string } | null
  jobFamily: { id: string; name: string; code: string } | null
  version: number
  isActive: boolean
}

export interface PartialJobFunction {
  id: string
  code: string | null
  name: string | null
  description: string | null
  jobFamily: PartialJobFamily
  version: number
  isActive: boolean
}

export interface PartialJobFamily {
  id: string
  code: string | null
  name: string | null
}

// ─── Mutation types ────────────────────────────────────────────────────────────

export interface JobFunctionMutation {
  id?: string
  code: string
  name: string
  description: string
  version?: number
  jobFamily: { id: string; name: string; code: string }
}

export interface JobFunctionMutationPayload {
  changeMode: 'INSERT'
  jobFunction: JobFunctionMutation
}

export interface JobFunctionDeletionPayload {
  changeMode: 'DELETE'
  jobFunction: {
    id: string
    version?: number
  }
}

// ─── Transform ────────────────────────────────────────────────────────────────

export const transformJobFunctionRow = (row: JobFunctionRow): JobFunction => {
  return {
    ...row,
    code: normalizeString(row.code),
    name: normalizeString(row.name),
    description: normalizeString(row.description),
    isActive: true
  }
}
