import { z } from 'zod'
import type { JobFamily } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFamily.types'
import type { JobFunction } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types'
import type { JobLevel } from '@/business-apps/mdm/apps/job-structure-data/utils/JobLevel.types'
import type { JobProfile } from '@/business-apps/mdm/apps/job-structure-data/utils/JobProfile.types'
import { transformJobFamilyRow } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFamily.types'
import { transformJobFunctionRow } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types'
import { transformJobLevelRow } from '@/business-apps/mdm/apps/job-structure-data/utils/JobLevel.types'
import { transformJobProfileRow } from '@/business-apps/mdm/apps/job-structure-data/utils/JobProfile.types'

// ─── Form Validation Schema ─────────────────────────────────────────────────

export const jobPositionFormSchema = z.object({
  name: z.string().min(1, 'Position name is required'),
  siteLocation: z
    .object({
      id: z.string(),
      code: z.string().optional(),
      name: z.string()
    })
    .nullable(),
  department: z
    .object({
      id: z.string(),
      code: z.string().optional().nullable(),
      name: z.string()
    })
    .nullable(),
  // .refine(val => val !== null, 'Department is required'),
  jobFamily: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string()
    })
    .refine(val => val !== null, 'Job family is required')
    .nullable()
    .optional(),
  jobFunction: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string()
    })
    .nullable()
    .optional(),
  // .refine(val => val !== null, 'Job function is required'),
  jobLevel: z
    .object({
      id: z.string(),
      code: z.string(),
      name: z.string(),
      hierarchyOrder: z.number()
    })
    .nullable()
    .optional(),
  // .refine(val => val !== null, 'Job level is required'),
  jobProfile: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string()
    })
    .nullable()
    .optional()
})

export type JobPositionFormValues = z.infer<typeof jobPositionFormSchema>

// ─── Base Types ──────────────────────────────────────────────────────────────

export interface SiteLocation {
  id: string
  name: string
  code?: string
}

export interface Department {
  id: string
  name: string
  code?: string
}

export interface JobPosition {
  id: string
  name: string
  siteLocationId: string
  siteLocation: SiteLocation | null
  departmentId: string
  department: Department | null
  jobFamilyId: string
  jobFamily: JobFamily | null
  jobFunctionId: string
  jobFunction: JobFunction | null
  jobLevelId: string
  jobLevel: JobLevel | null
  jobProfileId?: string | null
  jobProfile?: JobProfile | null
  isActive: boolean
  version: number
  createdAt?: string
  updatedAt?: string
}

// ─── Mutation Types ──────────────────────────────────────────────────────────

export interface JobPositionMutation {
  id?: string
  name: string
  jobFunction: string
  jobLevel: string
  jobProfile: string
  version?: number | null
}

export interface OrganizationalRelationship {
  structureId: string
  organizationalUnitId: string
  siteLocationId?: string
}

export interface JobPositionMutationPayload {
  changeMode: 'INSERT' | 'UPDATE'
  jobPosition: JobPositionMutation
  jobPositionOrgUnit: OrganizationalRelationship
}

export interface JobPositionDeletionPayload {
  changeMode: 'DELETE'
  jobPosition: {
    id: string
    version?: number | null
  }
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface GetJobPositionsResponse {
  jobPositions: JobPosition[]
  JobPositionAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface GetSiteLocationsResponse {
  siteLocations: SiteLocation[]
  SiteLocationAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface GetDepartmentsResponse {
  departments: Department[]
  DepartmentAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface GetJobFamiliesResponse {
  jobFamilies: JobFamily[]
  JobFamilyAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface GetJobFunctionsResponse {
  jobFunctions: JobFunction[]
  JobFunctionAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface GetJobLevelsResponse {
  jobLevels: JobLevel[]
  JobLevelAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface GetJobProfilesResponse {
  jobProfiles: JobProfile[]
  JobProfileAggregate: {
    aggregate: {
      count: number
    }
  }
}

// ─── Filter Types ────────────────────────────────────────────────────────────

export interface JobPositionFilters {
  siteLocationId?: string
  departmentId?: string
  jobFamilyId?: string
  jobFunctionId?: string
  jobLevelId?: string
  search?: string
}

export interface SiteLocationFilters {
  search?: string
}

export interface JobFunctionFilters {
  jobFamilyId?: string
  search?: string
}

export interface JobProfileFilters {
  jobFamilyId?: string
  jobFunctionId?: string
  jobLevelId?: string
  search?: string
}

// ─── Transform Functions ─────────────────────────────────────────────────────
export const transformJobProfileForForm = (profile: JobProfile) => ({
  id: profile.id,
  name: profile.name,
  title: profile.title,
  code: profile.code || undefined
})

export const transformJobPositionRow = (row: any): JobPosition => ({
  ...row,
  siteLocation: row.siteLocation
    ? {
        id: row.siteLocation.id,
        name: row.siteLocation.name,
        code: row.siteLocation.code || undefined
      }
    : null,
  department: row.department
    ? {
        id: row.department.id,
        name: row.department.name,
        code: row.department.code || undefined
      }
    : null,
  jobFamily: row.jobFamily ? transformJobFamilyRow(row.jobFamily) : null,
  jobFunction: row.jobFunction ? transformJobFunctionRow(row.jobFunction) : null,
  jobLevel: row.jobLevel ? transformJobLevelRow(row.jobLevel) : null,
  jobProfile: row.jobProfile ? transformJobProfileRow(row.jobProfile) : null,
  isActive: true
})
