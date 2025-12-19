/**
 * JobApplicationInterview Queries (JobInterview)
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobApplicationInterviewFields } from '../types/jobApplicationInterviewTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobApplicationInterviewQueryVariables extends BaseQueryVariables {
  jobApplicationId?: string
  jobInterviewStatus?: string
}

export const JOB_APPLICATION_INTERVIEW_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'scheduledAt'],
  list: [
    'createdAt',
    'id',
    'scheduledAt',
    'duration',
    'location',
    'meetingLink',
    'jobInterviewStatus',
    'jobApplication',
    'jobApplicationId',
    'updatedAt'
  ],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'scheduledAt',
    'duration',
    'location',
    'meetingLink',
    'jobInterviewStatus',
    'jobApplication',
    'jobApplicationId',
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
    { key: 'scheduledAt', value: JobApplicationInterviewFields.scheduledAt },
    { key: 'duration', value: JobApplicationInterviewFields.duration },
    { key: 'location', value: JobApplicationInterviewFields.location },
    { key: 'meetingLink', value: JobApplicationInterviewFields.meetingLink },
    { key: 'jobInterviewStatus', value: JobApplicationInterviewFields.jobInterviewStatus },
    { key: 'jobApplicationId', value: JobApplicationInterviewFields.jobApplicationId },
    { key: 'createdAt', value: 'createdAt' },
    { key: 'createdBy', value: 'createdBy' },
    { key: 'updatedAt', value: 'updatedAt' },
    { key: 'updatedBy', value: 'updatedBy' },
    { key: 'isDeleted', value: 'isDeleted' },
    { key: 'recordState', value: 'recordState' },
    { key: 'activeFrom', value: 'activeFrom' },
    { key: 'activeTo', value: 'activeTo' },
    { key: 'additionalProperties', value: 'additionalProperties' },
    // Deprecated
    { key: 'scheduledDate', value: JobApplicationInterviewFields.scheduledDate },
    { key: 'meetingPlace', value: JobApplicationInterviewFields.meetingPlace },
    { key: 'interviewDate', value: JobApplicationInterviewFields.interviewDate },
    { key: 'confirmedDate', value: JobApplicationInterviewFields.confirmedDate },
    { key: 'cancelledDate', value: JobApplicationInterviewFields.cancelledDate },
    { key: 'participants', value: JobApplicationInterviewFields.participants },
    { key: 'employeeId', value: JobApplicationInterviewFields.employeeId }
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
    ${JobApplicationInterviewFields[fieldRefName as keyof typeof JobApplicationInterviewFields]}
  `
}

export const buildJobApplicationInterviewFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildEntityReferenceField(fieldSet, 'jobApplication', 'jobApplicationId', JobApplicationInterviewFields.jobApplication, 'id\n      applicationDate')}
  `
}
