/**
 * JobPosting Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobPosting } from '../types/jobPostingTypes'

export const JobPostingFormFields = {
  id: 'id',
  version: 'version',
  title: 'title',
  titleI18n: 'titleI18n',
  content: 'content',
  contentI18n: 'contentI18n',
  fileInfo: 'fileInfo',
  jobRequestId: 'jobRequest',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobPostingPayload = (data: Partial<JobPosting>) => {
  const basePayload = buildPayload(data, JobPostingFormFields)

  return {
    jobPosting: {
      ...basePayload,
      title: data.title || ''
    }
  }
}
