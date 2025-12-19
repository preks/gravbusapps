/**
 * JobApplication Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface JobApplicationPayload {
  id?: string
  version?: number
  applicationDate?: string
  jobApplicationPipelineRef?: string
  jobApplicationStageRef?: string
  jobCandidateId?: string
  jobPostingId?: string
  jobPostingPublicationId?: string
  referrerEmployeeId?: string
  referredBy?: string
  additionalProperties?: any
}

export const JobApplicationFormFields = {
  id: 'id',
  version: 'version',
  applicationDate: 'applicationDate',
  jobApplicationPipelineRef: 'jobApplicationPipelineRef',
  jobApplicationStageRef: 'jobApplicationStageRef',
  jobCandidateId: 'jobCandidate',
  jobPostingId: 'jobPosting',
  jobPostingPublicationId: 'jobPostingPublication',
  referrerEmployeeId: 'referrerEmployee',
  referredBy: 'referredBy',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobApplicationPayload = (data: any): JobApplicationPayload => {
  return buildPayload(data, JobApplicationFormFields)
}
