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

export interface JobInterviewParticipant {
  employeeId?: string
  jobCandidateId?: string
  userId?: string
}

export interface BuildJobApplicationInterviewPayloadOptions extends Partial<JobApplicationInterview> {
  jobInterviewParticipants?: JobInterviewParticipant[]
}

export const buildJobApplicationInterviewPayload = (data: BuildJobApplicationInterviewPayloadOptions) => {
  const basePayload = buildPayload(data, JobApplicationInterviewFormFields)

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
    jobApplicationInterview: {
      ...basePayload,
      jobApplicationId: data.jobApplicationId || ''
    },
    jobInterviewParticipants: participantsPayload
  }
}
