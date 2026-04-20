/**
 * JobOffer Queries
 */
import { AUDIT_FIELDS } from '@/common/network/graphql/commonFragments'
import { JobOfferFields } from '../types/jobOfferTypes'
import type { BaseQueryVariables } from '@/common/network/graphql/commonTypes'

export interface JobOfferQueryVariables extends BaseQueryVariables {
  jobApplicationId?: string
  jobPositionId?: string
  jobOfferStatus?: string
}

export const JOB_OFFER_QUERY_CONFIGS: Record<string, string[]> = {
  minimal: ['createdAt', 'id', 'offerDate', 'jobOfferStatus'],
  list: [
    'createdAt',
    'id',
    'offerDate',
    'expirationDate',
    'jobOfferStatus',
    'jobApplication',
    'jobApplicationId',
    'jobPosition',
    'jobPositionId',
    'updatedAt'
  ],
  record: [
    'createdAt',
    'createdBy',
    'id',
    'offerDate',
    'decisionDate',
    'expirationDate',
    'workingConditions',
    'jobOfferStatus',
    'jobApplication',
    'jobApplicationId',
    'jobPosition',
    'jobPositionId',
    'contractDocument',
    'contractDocumentId',
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
    { key: 'offerDate', value: JobOfferFields.offerDate },
    { key: 'decisionDate', value: JobOfferFields.decisionDate },
    { key: 'expirationDate', value: JobOfferFields.expirationDate },
    { key: 'workingConditions', value: JobOfferFields.workingConditions },
    { key: 'jobOfferStatus', value: JobOfferFields.jobOfferStatus },
    { key: 'jobApplicationId', value: JobOfferFields.jobApplicationId },
    { key: 'jobPositionId', value: JobOfferFields.jobPositionId },
    { key: 'contractDocumentId', value: JobOfferFields.contractDocumentId },
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
      ${JobOfferFields[fieldRefName as keyof typeof JobOfferFields]}
    `
}

export const buildJobOfferFragment = (fields: string[]): string => {
  const fieldSet = new Set(fields)
  return `
    ${AUDIT_FIELDS}
    ${buildScalarFields(fieldSet)}
    
    ${buildEntityReferenceField(fieldSet, 'jobApplication', 'jobApplicationId', JobOfferFields.jobApplication, 'id\n      applicationDate')}
    
    ${buildEntityReferenceField(fieldSet, 'jobPosition', 'jobPositionId', JobOfferFields.jobPosition, 'id\n      name')}
    
    ${buildEntityReferenceField(fieldSet, 'contractDocument', 'contractDocumentId', JobOfferFields.contractDocument, 'id\n      name')}
  `
}
