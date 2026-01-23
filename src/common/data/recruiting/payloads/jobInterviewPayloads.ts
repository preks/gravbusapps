/**
 * JobInterview Payload Builders (JobInterview)
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobInterview } from '../types/jobInterviewTypes'

export const JobInterviewFormFields = {
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

export interface JobInterviewParticipant {
  employeeId?: string
  jobCandidateId?: string
  userId?: string
}

export interface BuildJobInterviewPayloadOptions extends Partial<JobInterview> {
  jobInterviewParticipants?: JobInterviewParticipant[]
}

export const buildJobInterviewPayload = (data: BuildJobInterviewPayloadOptions) => {
  const basePayload = buildPayload(data, JobInterviewFormFields)

  const participantsPayload =
    data.jobInterviewParticipants && data.jobInterviewParticipants.length > 0
      ? {
          changeMode: 'REPLACE' as const,
          participants: data.jobInterviewParticipants.map(p => ({
            employeeId: p.employeeId,
            jobCandidateId: p.jobCandidateId,
            userId: p.userId
          }))
        }
      : undefined

  return {
    jobInterview: {
      ...basePayload,
      jobApplicationId: data.jobApplicationId || ''
    },
    jobInterviewParticipants: participantsPayload
  }
}
