import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobApplication } from './jobApplicationTypes'
import { JobInterviewStatus } from './enums'

/**
 * JobApplicationInterview Type (also known as JobInterview)
 */
export interface JobApplicationInterview extends BaseEntity {
  id?: string
  scheduledAt?: string
  duration?: number
  location?: string
  meetingLink?: string

  // Enum field
  jobInterviewStatus?: JobInterviewStatus

  // Entity References (objects)
  jobApplication?: JobApplication

  // Entity Reference IDs (Id fields)
  jobApplicationId?: string
}

/**
 * JobApplicationInterview Fields
 */
export const JobApplicationInterviewFields = {
  id: 'id',
  scheduledAt: 'scheduledAt',
  duration: 'duration',
  location: 'location',
  meetingLink: 'meetingLink',
  jobInterviewStatus: 'jobInterviewStatus',

  // Entity References (objects)
  jobApplication: 'jobApplication',

  // Entity Reference IDs (Id fields)
  jobApplicationId: 'jobApplicationId'
} as const

/**
 * JobApplicationInterview Descriptors
 */
export const JOB_APPLICATION_INTERVIEW_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'scheduledAt', searchPaths: ['scheduledAt'], sortPath: 'scheduledAt', type: 'date' },
  { key: 'duration', searchPaths: ['duration'], sortPath: 'duration', type: 'number' },
  { key: 'location', searchPaths: ['location'], sortPath: 'location', type: 'text' },
  { key: 'meetingLink', searchPaths: ['meetingLink'], sortPath: 'meetingLink', type: 'text' },
  { key: 'jobInterviewStatus', searchPaths: ['jobInterviewStatus'], sortPath: 'jobInterviewStatus', type: 'text' }
]
