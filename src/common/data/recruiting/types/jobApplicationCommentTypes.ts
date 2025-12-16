import { type BaseEntity, BASE_ENTITY_DESCRIPTORS } from '@/common/network/graphql/commonTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { Employee } from '@/common/data/employee/types/employeeBaseTypes'
import type { JobApplication } from './jobApplicationTypes'

/**
 * JobApplicationComment Type
 */
export interface JobApplicationComment extends BaseEntity {
  id?: string
  comment: string
  commentDate?: string

  // Entity References (objects)
  jobApplication?: JobApplication
  createdByEmployee?: Employee

  // Entity Reference IDs (Id fields)
  jobApplicationId?: string
  createdByEmployeeId?: string
}

/**
 * JobApplicationComment Fields
 */
export const JobApplicationCommentFields = {
  id: 'id',
  comment: 'comment',
  commentDate: 'commentDate',
  jobApplication: 'jobApplication',
  createdByEmployee: 'createdByEmployee',
  jobApplicationId: 'jobApplicationId',
  createdByEmployeeId: 'createdByEmployeeId'
} as const

/**
 * JobApplicationComment Descriptors
 */
export const JOB_APPLICATION_COMMENT_DESCRIPTORS: Descriptor[] = [
  ...BASE_ENTITY_DESCRIPTORS,
  { key: 'comment', searchPaths: ['comment'], sortPath: 'comment', type: 'text' },
  { key: 'commentDate', searchPaths: ['commentDate'], sortPath: 'commentDate', type: 'date' },
  {
    key: 'jobApplication',
    searchPaths: ['jobApplication.code'],
    sortPath: 'jobApplication.code',
    type: 'text'
  },
  {
    key: 'createdByEmployee',
    searchPaths: ['createdByEmployee.firstName', 'createdByEmployee.lastName', 'createdByEmployee.displayName'],
    sortPath: 'createdByEmployee.displayName',
    type: 'text'
  }
]
