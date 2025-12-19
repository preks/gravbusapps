/**
 * JobApplicationInterview Payload Builders (JobInterview)
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { JobInterviewStatus } from '../types/enums'

export interface JobApplicationInterviewPayload {
  id?: string
  version?: number
  scheduledAt?: string
  duration?: number
  location?: string
  meetingLink?: string
  jobInterviewStatus?: JobInterviewStatus
  jobApplicationId: string
  additionalProperties?: any
}

export const JobApplicationInterviewFormFields = {
  id: 'id',
  version: 'version',
  scheduledAt: 'scheduledAt',
  duration: 'duration',
  location: 'location',
  meetingLink: 'meetingLink',
  jobInterviewStatus: 'jobInterviewStatus',
  jobApplicationId: 'jobApplication',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobApplicationInterviewPayload = (data: any): JobApplicationInterviewPayload => {
  const payload = buildPayload(data, JobApplicationInterviewFormFields)
  return {
    ...payload,
    jobApplicationId: data.jobApplicationId || ''
  }
}
