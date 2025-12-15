import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { JobRequest } from './jobRequestTypes'

/**
 * JobPosting Type
 */
export interface JobPosting extends BaseEntity {
  id?: string
  code?: string
  title: string
  description?: string
  requirements?: string
  publishedDate?: string
  closingDate?: string
  isPublished?: boolean

  // Catalog References (objects)
  jobPostingStatus?: CatalogEntry
  jobPostingType?: CatalogEntry
  location?: CatalogEntry
  employmentType?: CatalogEntry
  contractType?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  jobPostingStatusRef?: string
  jobPostingTypeRef?: string
  locationRef?: string
  employmentTypeRef?: string
  contractTypeRef?: string

  // Entity References (objects)
  jobRequest?: JobRequest
  createdByEmployee?: Employee

  // Entity Reference IDs (Id fields)
  jobRequestId?: string
  createdByEmployeeId?: string
}

/**
 * JobPosting Fields
 */
export const JobPostingFields = {
  id: 'id',
  code: 'code',
  title: 'title',
  description: 'description',
  requirements: 'requirements',
  publishedDate: 'publishedDate',
  closingDate: 'closingDate',
  isPublished: 'isPublished',
  jobPostingStatus: 'jobPostingStatus',
  jobPostingType: 'jobPostingType',
  location: 'location',
  employmentType: 'employmentType',
  contractType: 'contractType',
  jobPostingStatusRef: 'jobPostingStatusRef',
  jobPostingTypeRef: 'jobPostingTypeRef',
  locationRef: 'locationRef',
  employmentTypeRef: 'employmentTypeRef',
  contractTypeRef: 'contractTypeRef',
  jobRequest: 'jobRequest',
  createdByEmployee: 'createdByEmployee',
  jobRequestId: 'jobRequestId',
  createdByEmployeeId: 'createdByEmployeeId'
} as const

/**
 * JobPosting Descriptors
 */
export const JOB_POSTING_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'title', searchPaths: ['title'], sortPath: 'title', type: 'text' },
  { key: 'description', searchPaths: ['description'], sortPath: 'description', type: 'text' },
  { key: 'requirements', searchPaths: ['requirements'], sortPath: 'requirements', type: 'text' },
  { key: 'publishedDate', searchPaths: ['publishedDate'], sortPath: 'publishedDate', type: 'date' },
  { key: 'closingDate', searchPaths: ['closingDate'], sortPath: 'closingDate', type: 'date' },
  { key: 'isPublished', searchPaths: ['isPublished'], sortPath: 'isPublished', type: 'boolean' },
  {
    key: 'jobPostingStatus',
    searchPaths: ['jobPostingStatus.value'],
    sortPath: 'jobPostingStatus.value',
    type: 'text'
  },
  {
    key: 'jobPostingType',
    searchPaths: ['jobPostingType.value'],
    sortPath: 'jobPostingType.value',
    type: 'text'
  },
  {
    key: 'location',
    searchPaths: ['location.value'],
    sortPath: 'location.value',
    type: 'text'
  },
  {
    key: 'employmentType',
    searchPaths: ['employmentType.value'],
    sortPath: 'employmentType.value',
    type: 'text'
  },
  {
    key: 'contractType',
    searchPaths: ['contractType.value'],
    sortPath: 'contractType.value',
    type: 'text'
  },
  {
    key: 'jobRequest',
    searchPaths: ['jobRequest.title', 'jobRequest.code'],
    sortPath: 'jobRequest.title',
    type: 'text'
  },
  {
    key: 'createdByEmployee',
    searchPaths: ['createdByEmployee.firstName', 'createdByEmployee.lastName', 'createdByEmployee.displayName'],
    sortPath: 'createdByEmployee.displayName',
    type: 'text'
  }
]
