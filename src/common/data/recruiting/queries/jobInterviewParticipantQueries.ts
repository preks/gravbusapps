/**
 * JobInterviewParticipant Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobInterviewParticipantFields } from '../types/jobInterviewParticipantTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobInterviewParticipantQueryVariables extends BaseQueryVariables {
  jobInterviewId?: string
  employeeId?: string
  jobCandidateId?: string
  jobInterviewResponse?: string
}

export const JOB_INTERVIEW_PARTICIPANT_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'jobInterviewResponse'],
  list: [
    'createdAt',
    'id',
    'jobInterviewResponse',
    'jobInterview',
    'jobInterviewId',
    'employee',
    'employeeId',
    'jobCandidate',
    'jobCandidateId',
    'userId',
    'updatedAt'
  ],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'jobInterviewResponse',
    'jobInterview',
    'jobInterviewId',
    'employee',
    'employeeId',
    'jobCandidate',
    'jobCandidateId',
    'userId',
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
    { key: 'jobInterviewResponse', value: JobInterviewParticipantFields.jobInterviewResponse },
    { key: 'jobInterviewId', value: JobInterviewParticipantFields.jobInterviewId },
    { key: 'employeeId', value: JobInterviewParticipantFields.employeeId },
    { key: 'jobCandidateId', value: JobInterviewParticipantFields.jobCandidateId },
    { key: 'userId', value: JobInterviewParticipantFields.userId },
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
      ${JobInterviewParticipantFields[fieldRefName as keyof typeof JobInterviewParticipantFields]}
    `
}

export const buildJobInterviewParticipantFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildEntityReferenceField(fieldSet, 'jobInterview', 'jobInterviewId', JobInterviewParticipantFields.jobInterview, 'id\n      scheduledAt')}
    
    ${buildEntityReferenceField(fieldSet, 'employee', 'employeeId', JobInterviewParticipantFields.employee, 'id\n      firstName\n      lastName\n      displayName')}
    
    ${buildEntityReferenceField(fieldSet, 'jobCandidate', 'jobCandidateId', JobInterviewParticipantFields.jobCandidate, 'id\n      firstName\n      lastName\n      displayName')}
  `
}
