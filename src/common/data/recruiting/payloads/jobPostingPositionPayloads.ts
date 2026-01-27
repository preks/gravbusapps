/**
 * JobPostingPosition Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface JobPostingPositionPayload {
  id?: string
  version?: number
  jobPostingId?: string
  jobPositionId?: string
  additionalProperties?: any
}

export const JobPostingPositionFormFields = {
  id: 'id',
  version: 'version',
  jobPostingId: 'jobPosting',
  jobPositionId: 'jobPosition',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobPostingPositionPayload = (data: any): JobPostingPositionPayload => {
  return buildPayload(data, JobPostingPositionFormFields)
}
