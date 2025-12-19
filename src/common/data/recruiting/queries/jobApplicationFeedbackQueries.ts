/**
 * JobApplicationFeedback Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobApplicationFeedbackFields } from '../types/jobApplicationFeedbackTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobApplicationFeedbackQueryVariables extends BaseQueryVariables {
  jobApplicationId?: string
  jobInterviewId?: string
  creatorEmployeeId?: string
  jobApplicationRating?: string
}

export const JOB_APPLICATION_FEEDBACK_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'jobApplicationRating'],
  list: [
    'createdAt',
    'id',
    'feedback',
    'jobApplicationRating',
    'jobApplication',
    'jobApplicationId',
    'jobInterview',
    'jobInterviewId',
    'creatorEmployee',
    'creatorEmployeeId',
    'updatedAt'
  ],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'feedback',
    'jobApplicationRating',
    'jobApplication',
    'jobApplicationId',
    'jobInterview',
    'jobInterviewId',
    'creatorEmployee',
    'creatorEmployeeId',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties'
  ]
}

const buildScalarFields = (fieldSet: Set<string>): string => {
  const auditFields = new Set([
    'createdAt',
    'createdBy',
    'updatedAt',
    'updatedBy',
    'isDeleted',
    'recordState',
    'activeFrom',
    'activeTo',
    'version'
  ])

  const scalarFields = [
    { key: 'id', value: 'id' },
    { key: 'version', value: 'version' },
    { key: 'feedback', value: JobApplicationFeedbackFields.feedback },
    { key: 'jobApplicationRating', value: JobApplicationFeedbackFields.jobApplicationRating },
    { key: 'jobApplicationId', value: JobApplicationFeedbackFields.jobApplicationId },
    { key: 'jobInterviewId', value: JobApplicationFeedbackFields.jobInterviewId },
    { key: 'creatorEmployeeId', value: JobApplicationFeedbackFields.creatorEmployeeId },
    { key: 'createdAt', value: 'createdAt' },
    { key: 'createdBy', value: 'createdBy' },
    { key: 'updatedAt', value: 'updatedAt' },
    { key: 'updatedBy', value: 'updatedBy' },
    { key: 'isDeleted', value: 'isDeleted' },
    { key: 'recordState', value: 'recordState' },
    { key: 'activeFrom', value: 'activeFrom' },
    { key: 'activeTo', value: 'activeTo' },
    { key: 'additionalProperties', value: 'additionalProperties' }
  ]

  return scalarFields
    .filter(field => fieldSet.has(field.key) && !auditFields.has(field.key))
    .map(field => field.value)
    .join('\n    ')
}

const buildEntityReferenceField = (
  fieldSet: Set<string>,
  fieldName: string,
  fieldRefName: string,
  fieldKey: string,
  refFragment: string
): string => {
  if (!fieldSet.has(fieldName) && !fieldSet.has(fieldRefName)) return ''
  const hasObject = fieldSet.has(fieldName)
  return `
      ${hasObject ? `${fieldKey} { ${refFragment} }` : ''}
      ${JobApplicationFeedbackFields[fieldRefName as keyof typeof JobApplicationFeedbackFields]}
    `
}

export const buildJobApplicationFeedbackFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildEntityReferenceField(fieldSet, 'jobApplication', 'jobApplicationId', JobApplicationFeedbackFields.jobApplication, 'id\n      applicationDate')}
    
    ${buildEntityReferenceField(fieldSet, 'jobInterview', 'jobInterviewId', JobApplicationFeedbackFields.jobInterview, 'id\n      scheduledAt')}
    
    ${buildEntityReferenceField(fieldSet, 'creatorEmployee', 'creatorEmployeeId', JobApplicationFeedbackFields.creatorEmployee, 'id\n      firstName\n      lastName\n      displayName')}
  `
}
