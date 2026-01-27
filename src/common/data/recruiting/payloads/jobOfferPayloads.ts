/**
 * JobOffer Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { JobOfferStatus } from '../types/enums'

export interface JobOfferPayload {
  id?: string
  version?: number
  offerDate?: string
  decisionDate?: string
  expirationDate?: string
  workingConditions?: any
  jobOfferStatus?: JobOfferStatus
  jobApplicationId?: string
  jobPositionId?: string
  contractDocumentId?: string
  additionalProperties?: any
}

export const JobOfferFormFields = {
  id: 'id',
  version: 'version',
  offerDate: 'offerDate',
  decisionDate: 'decisionDate',
  expirationDate: 'expirationDate',
  workingConditions: 'workingConditions',
  jobOfferStatus: 'jobOfferStatus',
  jobApplicationId: 'jobApplication',
  jobPositionId: 'jobPosition',
  contractDocumentId: 'contractDocument',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobOfferPayload = (data: any): JobOfferPayload => {
  return buildPayload(data, JobOfferFormFields)
}
