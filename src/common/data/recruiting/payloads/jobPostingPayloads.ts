/**
 * JobPosting Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface JobPostingPayload {
  id?: string
  version?: number
  title: string
  titleI18n?: any
  content?: string
  contentI18n?: any
  fileInfo?: any
  jobRequestId?: string
  additionalProperties?: any
}

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

export const buildJobPostingPayload = (data: any): JobPostingPayload => {
  const payload = buildPayload(data, JobPostingFormFields)
  return {
    ...payload,
    title: data.title || ''
  }
}
