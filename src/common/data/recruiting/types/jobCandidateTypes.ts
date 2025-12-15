import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * JobCandidate Type
 */
export interface JobCandidate extends BaseEntity {
  id?: string
  code?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  linkedinUrl?: string
  resumeUrl?: string
  coverLetterUrl?: string

  // Catalog References (objects)
  candidateStatus?: CatalogEntry
  source?: CatalogEntry
  academicTitle?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  candidateStatusRef?: string
  sourceRef?: string
  academicTitleRef?: string

  // Entity References (objects)
  createdByEmployee?: Employee

  // Entity Reference IDs (Id fields)
  createdByEmployeeId?: string
}

/**
 * JobCandidate Fields
 */
export const JobCandidateFields = {
  id: 'id',
  code: 'code',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  linkedinUrl: 'linkedinUrl',
  resumeUrl: 'resumeUrl',
  coverLetterUrl: 'coverLetterUrl',
  candidateStatus: 'candidateStatus',
  source: 'source',
  academicTitle: 'academicTitle',
  candidateStatusRef: 'candidateStatusRef',
  sourceRef: 'sourceRef',
  academicTitleRef: 'academicTitleRef',
  createdByEmployee: 'createdByEmployee',
  createdByEmployeeId: 'createdByEmployeeId'
} as const

/**
 * JobCandidate Descriptors
 */
export const JOB_CANDIDATE_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'code', searchPaths: ['code'], sortPath: 'code', type: 'text' },
  { key: 'firstName', searchPaths: ['firstName'], sortPath: 'firstName', type: 'text' },
  { key: 'lastName', searchPaths: ['lastName'], sortPath: 'lastName', type: 'text' },
  { key: 'email', searchPaths: ['email'], sortPath: 'email', type: 'text' },
  { key: 'phone', searchPaths: ['phone'], sortPath: 'phone', type: 'text' },
  { key: 'linkedinUrl', searchPaths: ['linkedinUrl'], sortPath: 'linkedinUrl', type: 'text' },
  { key: 'resumeUrl', searchPaths: ['resumeUrl'], sortPath: 'resumeUrl', type: 'text' },
  { key: 'coverLetterUrl', searchPaths: ['coverLetterUrl'], sortPath: 'coverLetterUrl', type: 'text' },
  {
    key: 'candidateStatus',
    searchPaths: ['candidateStatus.value'],
    sortPath: 'candidateStatus.value',
    type: 'text'
  },
  {
    key: 'source',
    searchPaths: ['source.value'],
    sortPath: 'source.value',
    type: 'text'
  },
  {
    key: 'academicTitle',
    searchPaths: ['academicTitle.value'],
    sortPath: 'academicTitle.value',
    type: 'text'
  },
  {
    key: 'createdByEmployee',
    searchPaths: ['createdByEmployee.firstName', 'createdByEmployee.lastName', 'createdByEmployee.displayName'],
    sortPath: 'createdByEmployee.displayName',
    type: 'text'
  }
]
