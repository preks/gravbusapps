/**
 * JobPostingPosition Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobPostingPositionFields } from '../types/jobPostingPositionTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobPostingPositionQueryVariables extends BaseQueryVariables {
  jobPostingId?: string
  jobPositionId?: string
}

export const JOB_POSTING_POSITION_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id'],
  list: ['createdAt', 'id', 'jobPosting', 'jobPostingId', 'jobPosition', 'jobPositionId', 'updatedAt'],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'jobPosting',
    'jobPostingId',
    'jobPosition',
    'jobPositionId',
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
    { key: 'jobPostingId', value: JobPostingPositionFields.jobPostingId },
    { key: 'jobPositionId', value: JobPostingPositionFields.jobPositionId },
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
      ${JobPostingPositionFields[fieldRefName as keyof typeof JobPostingPositionFields]}
    `
}

export const buildJobPostingPositionFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildEntityReferenceField(fieldSet, 'jobPosting', 'jobPostingId', JobPostingPositionFields.jobPosting, 'id\n      jobTitle')}
    
    ${buildEntityReferenceField(fieldSet, 'jobPosition', 'jobPositionId', JobPostingPositionFields.jobPosition, 'id\n      name')}
  `
}
