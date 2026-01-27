/**
 * JobInterview Queries (JobInterview)
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobInterviewFields } from '../types/jobInterviewTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'
import {
  buildJobInterviewParticipantFragment,
  JOB_INTERVIEW_PARTICIPANT_QUERY_CONFIGS
} from './jobInterviewParticipantQueries'

export interface JobInterviewQueryVariables extends BaseQueryVariables {
  jobApplicationId?: string
  jobInterviewStatus?: string
}

export const JOB_INTERVIEW_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'scheduledAt'],
  list: ['createdAt', 'id', 'scheduledAt', 'duration', 'location', 'jobApplication', 'jobApplicationId', 'updatedAt'],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'scheduledAt',
    'duration',
    'location',
    'jobApplication',
    'jobApplicationId',
    'updatedAt',
    'updatedBy',
    'version',
    'additionalProperties',
    'jobInterviewParticipants'
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
    { key: 'scheduledAt', value: JobInterviewFields.scheduledAt },
    { key: 'duration', value: JobInterviewFields.duration },
    { key: 'location', value: JobInterviewFields.location },
    { key: 'meetingLink', value: JobInterviewFields.meetingLink },
    { key: 'jobInterviewStatus', value: JobInterviewFields.jobInterviewStatus },
    { key: 'jobApplicationId', value: JobInterviewFields.jobApplicationId },
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
    ${JobInterviewFields[fieldRefName as keyof typeof JobInterviewFields]}
  `
}

const buildArrayRelationField = (fieldSet: Set<string>, fieldName: string, relationFragment: string): string => {
  if (!fieldSet.has(fieldName)) {
    return ''
  }
  return `
    ${fieldName}(where: {isDeleted: {_eq: false}}, orderBy: {createdAt: DESC_NULLS_LAST}) {
      ${relationFragment}
    }
  `
}

export const buildJobInterviewFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  const participantFragment = buildJobInterviewParticipantFragment(JOB_INTERVIEW_PARTICIPANT_QUERY_CONFIGS.list)

  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildEntityReferenceField(fieldSet, 'jobApplication', 'jobApplicationId', JobInterviewFields.jobApplication, 'id\n      applicationDate\n      jobCandidate {\n        id\n        firstName\n        lastName\n      }')}
    
    ${buildArrayRelationField(fieldSet, 'jobInterviewParticipants', participantFragment)}
  `
}
