/**
 * JobPosting Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobPostingFields } from '../types/jobPostingTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobPostingQueryVariables extends BaseQueryVariables {
  jobRequestId?: string
}

export const JOB_POSTING_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'title'],
  list: ['createdAt', 'id', 'title', 'content', 'jobRequest', 'jobRequestId', 'updatedAt'],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'title',
    'titleI18n',
    'content',
    'contentI18n',
    'fileInfo',
    'jobRequest',
    'jobRequestId',
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
    { key: 'title', value: JobPostingFields.title },
    { key: 'titleI18n', value: JobPostingFields.titleI18n },
    { key: 'content', value: JobPostingFields.content },
    { key: 'contentI18n', value: JobPostingFields.contentI18n },
    { key: 'fileInfo', value: JobPostingFields.fileInfo },
    { key: 'jobRequestId', value: JobPostingFields.jobRequestId },
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
    { key: 'jobTitle', value: JobPostingFields.jobTitle },
    { key: 'department', value: JobPostingFields.department },
    { key: 'location', value: JobPostingFields.location },
    { key: 'contractType', value: JobPostingFields.contractType },
    { key: 'remote', value: JobPostingFields.remote }
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
      ${JobPostingFields[fieldRefName as keyof typeof JobPostingFields]}
    `
}

export const buildJobPostingFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildEntityReferenceField(fieldSet, 'jobRequest', 'jobRequestId', JobPostingFields.jobRequest, 'id\n      name')}
  `
}
