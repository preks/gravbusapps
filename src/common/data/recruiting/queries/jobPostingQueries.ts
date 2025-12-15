/**
 * JobPosting Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobPostingFields } from '../types/jobPostingTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobPostingQueryVariables extends BaseQueryVariables {
  department?: string
  location?: string
  contractType?: string
  remote?: string
}

export const JOB_POSTING_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'jobTitle'],
  list: ['createdAt', 'id', 'jobTitle', 'department', 'location', 'contractType', 'remote', 'updatedAt'],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'jobTitle',
    'department',
    'location',
    'contractType',
    'remote',
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
    { key: 'jobTitle', value: JobPostingFields.jobTitle },
    { key: 'department', value: JobPostingFields.department },
    { key: 'location', value: JobPostingFields.location },
    { key: 'contractType', value: JobPostingFields.contractType },
    { key: 'remote', value: JobPostingFields.remote },
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

export const buildJobPostingFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
  `
}
