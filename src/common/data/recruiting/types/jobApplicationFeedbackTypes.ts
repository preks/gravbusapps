import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { JobApplication } from './jobApplicationTypes'
import type { JobApplicationInterview } from './jobApplicationInterviewTypes'
import { JobApplicationRating } from './enums'

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
 * JobApplicationFeedback Type
 */
export interface JobApplicationFeedback extends BaseEntity {
  id?: string
  feedback?: string

  // Enum field
  jobApplicationRating?: JobApplicationRating

  // Entity References (objects)
  jobApplication?: JobApplication
  jobInterview?: JobApplicationInterview
  creatorEmployee?: Employee

  // Entity Reference IDs (Id fields)
  jobApplicationId?: string
  jobInterviewId?: string
  creatorEmployeeId?: string
}

/**
 * JobApplicationFeedback Fields
 */
export const JobApplicationFeedbackFields = {
  id: 'id',
  feedback: 'feedback',
  jobApplicationRating: 'jobApplicationRating',

  // Entity references
  jobApplication: 'jobApplication',
  jobInterview: 'jobInterview',
  creatorEmployee: 'creatorEmployee',

  // Entity IDs
  jobApplicationId: 'jobApplicationId',
  jobInterviewId: 'jobInterviewId',
  creatorEmployeeId: 'creatorEmployeeId'
} as const

/**
 * JobApplicationFeedback Descriptors
 */
export const JOB_APPLICATION_FEEDBACK_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'feedback', searchPaths: ['feedback'], sortPath: 'feedback', type: 'text' },
  {
    key: 'jobApplicationRating',
    searchPaths: ['jobApplicationRating'],
    sortPath: 'jobApplicationRating',
    type: 'text'
  },
  {
    key: 'creatorEmployee',
    searchPaths: ['creatorEmployee.firstName', 'creatorEmployee.lastName', 'creatorEmployee.displayName'],
    sortPath: 'creatorEmployee.displayName',
    type: 'text'
  }
]
