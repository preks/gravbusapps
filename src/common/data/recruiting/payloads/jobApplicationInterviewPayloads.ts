/**
 * JobApplicationInterview Payload Builders (JobInterview)
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobApplicationInterview } from '../types/jobApplicationInterviewTypes'

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

export const buildJobApplicationInterviewPayload = (data: Partial<JobApplicationInterview>) => {
  const basePayload = buildPayload(data, JobApplicationInterviewFormFields)

  return {
    jobApplicationInterview: {
      ...basePayload,
      jobApplicationId: data.jobApplicationId || ''
    }
  }
}
