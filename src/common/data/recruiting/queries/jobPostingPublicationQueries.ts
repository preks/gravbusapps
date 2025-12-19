/**
 * JobPostingPublication Queries
 */
import { AUDIT_FIELDS, CATALOG_ENTRY } from '@/common/network/graphql/commonFragments'
import { JobPostingPublicationFields } from '../types/jobPostingPublicationTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobPostingPublicationQueryVariables extends BaseQueryVariables {
  jobPostingId?: string
  jobPostingChannelRef?: string
}

export const JOB_POSTING_PUBLICATION_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'url'],
  list: [
    'createdAt',
    'id',
    'url',
    'jobPostingChannel',
    'jobPostingChannelRef',
    'jobPosting',
    'jobPostingId',
    'updatedAt'
  ],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'url',
    'jobPostingChannel',
    'jobPostingChannelRef',
    'jobPosting',
    'jobPostingId',
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
    { key: 'url', value: JobPostingPublicationFields.url },
    { key: 'jobPostingChannelRef', value: JobPostingPublicationFields.jobPostingChannelRef },
    { key: 'jobPostingId', value: JobPostingPublicationFields.jobPostingId },
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

const buildCatalogReferenceField = (
  fieldSet: Set<string>,
  fieldName: string,
  fieldRefName: string,
  fieldKey: string
): string => {
  if (!fieldSet.has(fieldName) && !fieldSet.has(fieldRefName)) {
    return ''
  }
  const hasObject = fieldSet.has(fieldName)
  return `
      ${hasObject ? `${fieldKey} { ${CATALOG_ENTRY} }` : ''}
      ${JobPostingPublicationFields[fieldRefName as keyof typeof JobPostingPublicationFields]}
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
      ${JobPostingPublicationFields[fieldRefName as keyof typeof JobPostingPublicationFields]}
    `
}

export const buildJobPostingPublicationFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildCatalogReferenceField(fieldSet, 'jobPostingChannel', 'jobPostingChannelRef', JobPostingPublicationFields.jobPostingChannel)}
    
    ${buildEntityReferenceField(fieldSet, 'jobPosting', 'jobPostingId', JobPostingPublicationFields.jobPosting, 'id\n      title')}
  `
}
