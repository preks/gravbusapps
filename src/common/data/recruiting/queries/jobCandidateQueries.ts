/**
 * JobCandidate Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobCandidateFields } from '../types/jobCandidateTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export type JobCandidateQueryVariables = BaseQueryVariables

export const JOB_CANDIDATE_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['code', 'createdAt', 'id', 'firstName', 'lastName'],
  list: ['code', 'createdAt', 'id', 'firstName', 'lastName', 'updatedAt'],
  record: [
    'code',
    'createdAt',
    'createdBy',
    'id',
    'firstName',
    'lastName',
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
    { key: 'code', value: JobCandidateFields.code },
    { key: 'firstName', value: JobCandidateFields.firstName },
    { key: 'lastName', value: JobCandidateFields.lastName },
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

export const buildJobCandidateFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
  `
}
