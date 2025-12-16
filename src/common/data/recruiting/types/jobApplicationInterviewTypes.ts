import { type BaseEntity, type CatalogEntry, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobApplication } from './jobApplicationTypes'

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
 * JobApplicationInterview Type
 */
export interface JobApplicationInterview extends BaseEntity {
  id?: string
  interviewDate?: string
  duration?: number
  scheduledDate?: string
  confirmedDate?: string
  cancelledDate?: string
  participants?: any // JSONB
  meetingPlace?: string
  meetingLink?: string

  // Catalog References (objects)
  type?: CatalogEntry

  // Catalog Reference IDs (Ref fields)
  typeRef?: string

  // Entity References (objects)
  jobApplication?: JobApplication
  employee?: Employee

  // Entity Reference IDs (Id fields)
  jobApplicationId?: string
  employeeId?: string
}

/**
 * JobApplicationInterview Fields
 */
export const JobApplicationInterviewFields = {
  id: 'id',
  interviewDate: 'interviewDate',
  duration: 'duration',
  scheduledDate: 'scheduledDate',
  confirmedDate: 'confirmedDate',
  cancelledDate: 'cancelledDate',
  participants: 'participants',
  meetingPlace: 'meetingPlace',
  meetingLink: 'meetingLink',

  // Catalog References (objects)
  type: 'type',

  // Catalog Reference IDs (Ref fields)
  typeRef: 'typeRef',

  // Entity References (objects)
  jobApplication: 'jobApplication',
  employee: 'employee',

  // Entity Reference IDs (Id fields)
  jobApplicationId: 'jobApplicationId',
  employeeId: 'employeeId'
} as const

/**
 * JobApplicationInterview Descriptors
 */
export const JOB_APPLICATION_INTERVIEW_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'interviewDate', searchPaths: ['interviewDate'], sortPath: 'interviewDate', type: 'date' },
  { key: 'duration', searchPaths: ['duration'], sortPath: 'duration', type: 'number' },
  { key: 'scheduledDate', searchPaths: ['scheduledDate'], sortPath: 'scheduledDate', type: 'date' },
  { key: 'confirmedDate', searchPaths: ['confirmedDate'], sortPath: 'confirmedDate', type: 'date' },
  { key: 'cancelledDate', searchPaths: ['cancelledDate'], sortPath: 'cancelledDate', type: 'date' },
  { key: 'meetingPlace', searchPaths: ['meetingPlace'], sortPath: 'meetingPlace', type: 'text' },
  { key: 'meetingLink', searchPaths: ['meetingLink'], sortPath: 'meetingLink', type: 'text' },
  {
    key: 'type',
    searchPaths: ['type.value'],
    sortPath: 'type.value',
    type: 'text'
  },
  {
    key: 'employee',
    searchPaths: ['employee.firstName', 'employee.lastName', 'employee.displayName'],
    sortPath: 'employee.lastName',
    type: 'text'
  }
]
