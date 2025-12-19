import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobCandidate } from './jobCandidateTypes'
import type { JobPosting } from './jobPostingTypes'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'

/**
 * JobPostingPublication reference type
 */
export interface JobPostingPublication {
  id?: string
  url?: string
  jobPostingChannelRef?: string
}

/**
 * JobApplication Type
 */
export interface JobApplication extends BaseEntity {
  id?: string
  applicationDate?: string

  // Catalog references
  jobApplicationPipelineRef?: string
  jobApplicationStageRef?: string

  // Catalog objects
  jobApplicationPipeline?: CatalogEntry
  jobApplicationStage?: CatalogEntry

  // Entity References (objects)
  jobCandidate?: JobCandidate
  jobPosting?: JobPosting
  jobPostingPublication?: JobPostingPublication
  referrerEmployee?: Employee

  // Entity Reference IDs (Id fields)
  jobCandidateId?: string
  jobPostingId?: string
  jobPostingPublicationId?: string
  referrerEmployeeId?: string
  referredBy?: string // user id of external referrer

  // Deprecated fields (for backward compatibility)
  /** @deprecated Use jobApplicationStageRef instead */
  currentStage?: string
  /** @deprecated Use jobPostingPublicationId instead */
  applicationChannelId?: string
  /** @deprecated Use referrerEmployeeId instead */
  referralId?: string
}

/**
 * JobApplication Fields
 */
export const JobApplicationFields = {
  id: 'id',
  applicationDate: 'applicationDate',

  // Catalog references
  jobApplicationPipelineRef: 'jobApplicationPipelineRef',
  jobApplicationStageRef: 'jobApplicationStageRef',

  // Catalog objects
  jobApplicationPipeline: 'jobApplicationPipeline',
  jobApplicationStage: 'jobApplicationStage',

  // Entity references
  jobCandidate: 'jobCandidate',
  jobPosting: 'jobPosting',
  jobPostingPublication: 'jobPostingPublication',
  referrerEmployee: 'referrerEmployee',

  // Entity IDs
  jobCandidateId: 'jobCandidateId',
  jobPostingId: 'jobPostingId',
  jobPostingPublicationId: 'jobPostingPublicationId',
  referrerEmployeeId: 'referrerEmployeeId',
  referredBy: 'referredBy',

  // Deprecated
  currentStage: 'currentStage',
  applicationChannelId: 'applicationChannelId',
  referralId: 'referralId'
} as const

/**
 * JobApplication Descriptors
 */
export const JOB_APPLICATION_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'applicationDate', searchPaths: ['applicationDate'], sortPath: 'applicationDate', type: 'date' },
  {
    key: 'jobApplicationPipeline',
    searchPaths: ['jobApplicationPipeline.value'],
    sortPath: 'jobApplicationPipeline.value',
    type: 'text'
  },
  {
    key: 'jobApplicationStage',
    searchPaths: ['jobApplicationStage.value'],
    sortPath: 'jobApplicationStage.value',
    type: 'text'
  },
  {
    key: 'jobCandidate',
    searchPaths: ['jobCandidate.firstName', 'jobCandidate.lastName', 'jobCandidate.displayName'],
    sortPath: 'jobCandidate.lastName',
    type: 'text'
  },
  {
    key: 'jobPosting',
    searchPaths: ['jobPosting.title'],
    sortPath: 'jobPosting.title',
    type: 'text'
  },
  {
    key: 'referrerEmployee',
    searchPaths: ['referrerEmployee.firstName', 'referrerEmployee.lastName', 'referrerEmployee.displayName'],
    sortPath: 'referrerEmployee.displayName',
    type: 'text'
  }
]
