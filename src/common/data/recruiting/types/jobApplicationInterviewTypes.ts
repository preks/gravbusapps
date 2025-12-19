import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobApplication } from './jobApplicationTypes'
import { JobInterviewStatus } from './enums'

/**
 * Employee reference (minimal)
 */
export interface Employee {
  id?: string
  firstName?: string
  lastName?: string
  displayName?: string
}

/**
 * JobApplicationInterview Type (also known as JobInterview)
 * Note: Backend table is job_interview, but GraphQL might still use JobApplicationInterview
 */
export interface JobApplicationInterview extends BaseEntity {
  id?: string
  scheduledAt?: string // Timestamp - renamed from scheduledDate
  duration?: number
  location?: string // renamed from meetingPlace
  meetingLink?: string

  // Enum field
  jobInterviewStatus?: JobInterviewStatus

  // Entity References (objects)
  jobApplication?: JobApplication

  // Entity Reference IDs (Id fields)
  jobApplicationId?: string

  // Deprecated fields (for backward compatibility)
  /** @deprecated Use scheduledAt instead */
  scheduledDate?: string
  /** @deprecated Use location instead */
  meetingPlace?: string
  /** @deprecated Removed - interview type not needed currently */
  typeRef?: string
  /** @deprecated Removed - interview type not needed currently */
  type?: CatalogEntry
  /** @deprecated Removed - use audit fields instead */
  interviewDate?: string
  /** @deprecated Removed - use audit fields instead */
  confirmedDate?: string
  /** @deprecated Removed - use audit fields instead */
  cancelledDate?: string
  /** @deprecated Moved to separate job_interview_participant table */
  participants?: any
  /** @deprecated Removed - not relevant */
  employeeId?: string
  /** @deprecated Removed - not relevant */
  employee?: Employee
}

/**
 * JobApplicationInterview Fields
 * Note: Backend still uses OLD field names
 */
export const JobApplicationInterviewFields = {
  id: 'id',
  scheduledAt: 'scheduledDate', // Backend still uses 'scheduledDate'
  duration: 'duration',
  location: 'meetingPlace', // Backend still uses 'meetingPlace'
  meetingLink: 'meetingLink',
  jobInterviewStatus: 'jobInterviewStatus',

  // Entity References (objects)
  jobApplication: 'jobApplication',

  // Entity Reference IDs (Id fields)
  jobApplicationId: 'jobApplicationId',

  // Deprecated
  scheduledDate: 'scheduledDate',
  meetingPlace: 'meetingPlace',
  interviewDate: 'interviewDate',
  confirmedDate: 'confirmedDate',
  cancelledDate: 'cancelledDate',
  participants: 'participants',
  typeRef: 'typeRef',
  type: 'type',
  employeeId: 'employeeId',
  employee: 'employee'
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
