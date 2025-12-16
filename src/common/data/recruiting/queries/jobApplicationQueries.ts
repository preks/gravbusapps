/**
 * JobApplication Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobApplicationFields } from '../types/jobApplicationTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export type JobApplicationQueryVariables = BaseQueryVariables

export const JOB_APPLICATION_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'applicationDate'],
  list: [
    'createdAt',
    'id',
    'applicationDate',
    'currentStage',
    'jobCandidate',
    'jobCandidateId',
    'jobPosting',
    'jobPostingId',
    'updatedAt'
  ],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'applicationDate',
    'currentStage',
    'currentStage',
    'jobCandidate',
    'jobCandidateId',
    'jobPosting',
    'jobPostingId',
    'applicationChannelId',
    'referralId',
    'applicationChannelId',
    'referralId',
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
    { key: 'applicationDate', value: JobApplicationFields.applicationDate },
    { key: 'currentStage', value: JobApplicationFields.currentStage },
    { key: 'applicationChannelId', value: JobApplicationFields.applicationChannelId },
    { key: 'referralId', value: JobApplicationFields.referralId },
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
      ${JobApplicationFields[fieldRefName as keyof typeof JobApplicationFields]}
    `
}

export const buildJobApplicationFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    ${buildEntityReferenceField(fieldSet, 'jobCandidate', 'jobCandidateId', JobApplicationFields.jobCandidate, 'id\n      code\n      firstName\n      lastName')}
    ${buildEntityReferenceField(fieldSet, 'jobPosting', 'jobPostingId', JobApplicationFields.jobPosting, 'id\n      jobTitle')}
    ${buildEntityReferenceField(fieldSet, 'jobCandidate', 'jobCandidateId', JobApplicationFields.jobCandidate, 'id\n      code\n      firstName\n      lastName')}
    ${buildEntityReferenceField(fieldSet, 'jobPosting', 'jobPostingId', JobApplicationFields.jobPosting, 'id\n      jobTitle')}
  `
}
