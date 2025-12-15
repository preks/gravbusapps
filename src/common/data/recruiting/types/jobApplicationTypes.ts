import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobCandidate } from './jobCandidateTypes'
import type { JobPosting } from './jobPostingTypes'

/**
 * JobApplication Type
 */
export interface JobApplication extends BaseEntity {
  id?: string
  applicationDate?: string
  currentStage?: string

  // Entity References (objects)
  jobCandidate?: JobCandidate
  jobPosting?: JobPosting

  // Entity Reference IDs (Id fields)
  jobCandidateId?: string
  jobPostingId?: string
  applicationChannelId?: string
  referralId?: string
}

/**
 * JobApplication Fields
 */
export const JobApplicationFields = {
  id: 'id',
  applicationDate: 'applicationDate',
  currentStage: 'currentStage',
  jobCandidate: 'jobCandidate',
  jobPosting: 'jobPosting',
  jobCandidateId: 'jobCandidateId',
  jobPostingId: 'jobPostingId',
  applicationChannelId: 'applicationChannelId',
  referralId: 'referralId'
} as const

/**
 * JobApplication Descriptors
 */
export const JOB_APPLICATION_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'applicationDate', searchPaths: ['applicationDate'], sortPath: 'applicationDate', type: 'date' },
  { key: 'currentStage', searchPaths: ['currentStage'], sortPath: 'currentStage', type: 'text' },
  {
    key: 'jobCandidate',
    searchPaths: ['jobCandidate.firstName', 'jobCandidate.lastName'],
    sortPath: 'jobCandidate.lastName',
    type: 'text'
  },
  {
    key: 'jobPosting',
    searchPaths: ['jobPosting.jobTitle'],
    sortPath: 'jobPosting.jobTitle',
    type: 'text'
  }
]
