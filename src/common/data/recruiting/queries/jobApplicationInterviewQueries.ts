/**
 * JobApplicationInterview Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobApplicationInterviewFields } from '../types/jobApplicationInterviewTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export type JobApplicationInterviewQueryVariables = BaseQueryVariables

export const JOB_APPLICATION_INTERVIEW_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'interviewDate', 'scheduledDate'],
  list: [
    'createdAt',
    'id',
    'interviewDate',
    'duration',
    'scheduledDate',
    'confirmedDate',
    'cancelledDate',
    'type',
    'typeRef',
    'employee',
    'employeeId',
    'jobApplication',
    'jobApplicationId',
    'meetingPlace',
    'meetingLink',
    'updatedAt'
  ],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'interviewDate',
    'duration',
    'scheduledDate',
    'confirmedDate',
    'cancelledDate',
    'participants',
    'type',
    'typeRef',
    'employee',
    'employeeId',
    'jobApplication',
    'jobApplicationId',
    'meetingPlace',
    'meetingLink',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties'
  ]
}

const buildScalarFields = (fieldSet: Set<string>): string => {
  const scalarFields = [
    { key: 'id', value: 'id' },
    { key: 'version', value: 'version' },
    { key: 'interviewDate', value: JobApplicationInterviewFields.interviewDate },
    { key: 'duration', value: JobApplicationInterviewFields.duration },
    { key: 'scheduledDate', value: JobApplicationInterviewFields.scheduledDate },
    { key: 'confirmedDate', value: JobApplicationInterviewFields.confirmedDate },
    { key: 'cancelledDate', value: JobApplicationInterviewFields.cancelledDate },
    { key: 'participants', value: JobApplicationInterviewFields.participants },
    { key: 'meetingPlace', value: JobApplicationInterviewFields.meetingPlace },
    { key: 'meetingLink', value: JobApplicationInterviewFields.meetingLink },
    { key: 'jobApplicationId', value: JobApplicationInterviewFields.jobApplicationId },
    { key: 'employeeId', value: JobApplicationInterviewFields.employeeId },
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
    .filter(field => fieldSet.has(field.key))
    .map(field => field.value)
    .join('\n    ')
}

const buildCatalogReferenceField = (
  fieldSet: Set<string>,
  fieldName: string,
  fieldRefName: string,
  fieldKey: string
): string => {
  if (!fieldSet.has(fieldName) && !fieldSet.has(fieldRefName)) return ''
  const hasObject = fieldSet.has(fieldName)
  return `
    ${hasObject ? `${fieldKey} { id\n      value }` : ''}
    ${JobApplicationInterviewFields[fieldRefName as keyof typeof JobApplicationInterviewFields]}
  `
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
    ${buildCatalogReferenceField(fieldSet, 'type', 'typeRef', JobApplicationInterviewFields.type)}
    ${buildEntityReferenceField(fieldSet, 'employee', 'employeeId', JobApplicationInterviewFields.employee, 'id\n      firstName\n      lastName\n      displayName')}
    ${buildEntityReferenceField(fieldSet, 'jobApplication', 'jobApplicationId', JobApplicationInterviewFields.jobApplication, 'id\n      applicationDate\n      currentStage')}
  `
}
