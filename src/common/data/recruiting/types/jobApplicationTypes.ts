import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { JobCandidate } from './jobCandidateTypes'
import type { JobPosting } from './jobPostingTypes'

/**
 * JobApplication Type
 */
export interface JobApplication extends BaseEntity {
  id?: string
  code?: string
  applicationDate?: string
  status?: string
  notes?: string

  // Catalog References (objects)
  applicationStatus?: CatalogEntry
  applicationStage?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  applicationStatusRef?: string
  applicationStageRef?: string

  // Entity References (objects)
  jobCandidate?: JobCandidate
  jobPosting?: JobPosting
  reviewedByEmployee?: Employee

  // Entity Reference IDs (Id fields)
  jobCandidateId?: string
  jobPostingId?: string
  reviewedByEmployeeId?: string
}

/**
 * JobApplication Fields
 */
export const JobApplicationFields = {
  id: 'id',
  code: 'code',
  applicationDate: 'applicationDate',
  status: 'status',
  notes: 'notes',
  applicationStatus: 'applicationStatus',
  applicationStage: 'applicationStage',
  applicationStatusRef: 'applicationStatusRef',
  applicationStageRef: 'applicationStageRef',
  jobCandidate: 'jobCandidate',
  jobPosting: 'jobPosting',
  reviewedByEmployee: 'reviewedByEmployee',
  jobCandidateId: 'jobCandidateId',
  jobPostingId: 'jobPostingId',
  reviewedByEmployeeId: 'reviewedByEmployeeId'
} as const

/**
 * JobApplication Descriptors
 */
export const JOB_APPLICATION_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'applicationDate', searchPaths: ['applicationDate'], sortPath: 'applicationDate', type: 'date' },
  { key: 'status', searchPaths: ['status'], sortPath: 'status', type: 'text' },
  { key: 'notes', searchPaths: ['notes'], sortPath: 'notes', type: 'text' },
  {
    key: 'applicationStatus',
    searchPaths: ['applicationStatus.value'],
    sortPath: 'applicationStatus.value',
    type: 'text'
  },
  {
    key: 'applicationStage',
    searchPaths: ['applicationStage.value'],
    sortPath: 'applicationStage.value',
    type: 'text'
  },
  {
    key: 'jobCandidate',
    searchPaths: ['jobCandidate.firstName', 'jobCandidate.lastName', 'jobCandidate.email'],
    sortPath: 'jobCandidate.lastName',
    type: 'text'
  },
  {
    key: 'jobPosting',
    searchPaths: ['jobPosting.title', 'jobPosting.code'],
    sortPath: 'jobPosting.title',
    type: 'text'
  },
  {
    key: 'reviewedByEmployee',
    searchPaths: ['reviewedByEmployee.firstName', 'reviewedByEmployee.lastName', 'reviewedByEmployee.displayName'],
    sortPath: 'reviewedByEmployee.displayName',
    type: 'text'
  }
]
