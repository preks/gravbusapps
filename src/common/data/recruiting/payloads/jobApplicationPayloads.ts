/**
 * JobApplication Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobApplication } from '../types/jobApplicationTypes'

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

export const buildJobApplicationPayload = (data: Partial<JobApplication>) => {
  const basePayload = buildPayload(data, JobApplicationFormFields)

  return {
    jobApplication: basePayload
  }
}
