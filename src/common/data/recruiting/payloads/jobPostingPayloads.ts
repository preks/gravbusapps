/**
 * JobPosting Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface JobPostingPayload {
  id?: string
  version?: number
  code?: string
  title: string
  description?: string
  requirements?: string
  publishedDate?: string
  closingDate?: string
  isPublished?: boolean
  jobPostingStatusRef?: string
  jobPostingTypeRef?: string
  locationRef?: string
  employmentTypeRef?: string
  contractTypeRef?: string
  jobRequestId?: string
  createdByEmployeeId?: string
  additionalProperties?: any
}

export const JobPostingFormFields = {
  id: 'id',
  version: 'version',
  code: 'code',
  title: 'title',
  description: 'description',
  requirements: 'requirements',
  publishedDate: 'publishedDate',
  closingDate: 'closingDate',
  isPublished: 'isPublished',
  jobPostingStatusRef: 'jobPostingStatusRef',
  jobPostingTypeRef: 'jobPostingTypeRef',
  locationRef: 'locationRef',
  employmentTypeRef: 'employmentTypeRef',
  contractTypeRef: 'contractTypeRef',
  jobRequestId: 'jobRequest',
  createdByEmployeeId: 'createdByEmployee',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobPostingPayload = (data: any): JobPostingPayload => {
  const payload = buildPayload(data, JobPostingFormFields)
  return {
    ...payload,
    title: data.title || ''
  }
}
