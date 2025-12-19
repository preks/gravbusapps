import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobApplicationInterview } from './jobApplicationInterviewTypes'
import type { JobCandidate } from './jobCandidateTypes'
import { JobInterviewResponse } from './enums'

/**
 * Employee reference type
 */
export interface Employee {
  id?: string
  firstName?: string
  lastName?: string
  displayName?: string
}

/**
 * JobInterviewParticipant Type
 */
export interface JobInterviewParticipant extends BaseEntity {
  id?: string

  // Enum field
  jobInterviewResponse?: JobInterviewResponse

  // Entity References (objects)
  jobInterview?: JobApplicationInterview
  employee?: Employee
  jobCandidate?: JobCandidate

  // Entity Reference IDs (Id fields)
  jobInterviewId?: string
  employeeId?: string
  jobCandidateId?: string
  userId?: string // external participant
}

/**
 * JobInterviewParticipant Fields
 */
export const JobInterviewParticipantFields = {
  id: 'id',
  jobInterviewResponse: 'jobInterviewResponse',

  // Entity references
  jobInterview: 'jobInterview',
  employee: 'employee',
  jobCandidate: 'jobCandidate',

  // Entity IDs
  jobInterviewId: 'jobInterviewId',
  employeeId: 'employeeId',
  jobCandidateId: 'jobCandidateId',
  userId: 'userId'
} as const

/**
 * JobInterviewParticipant Descriptors
 */
export const JOB_INTERVIEW_PARTICIPANT_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  {
    key: 'jobInterviewResponse',
    searchPaths: ['jobInterviewResponse'],
    sortPath: 'jobInterviewResponse',
    type: 'text'
  },
  {
    key: 'employee',
    searchPaths: ['employee.firstName', 'employee.lastName', 'employee.displayName'],
    sortPath: 'employee.displayName',
    type: 'text'
  },
  {
    key: 'jobCandidate',
    searchPaths: ['jobCandidate.firstName', 'jobCandidate.lastName', 'jobCandidate.displayName'],
    sortPath: 'jobCandidate.displayName',
    type: 'text'
  }
]
