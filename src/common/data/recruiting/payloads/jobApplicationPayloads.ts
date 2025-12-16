/**
 * JobApplication Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface JobApplicationPayload {
  id?: string
  version?: number
  code?: string
  applicationDate?: string
  status?: string
  notes?: string
  applicationStatusRef?: string
  applicationStageRef?: string
  jobCandidateId?: string
  jobPostingId?: string
  reviewedByEmployeeId?: string
  additionalProperties?: any
}

export const JobApplicationFormFields = {
  id: 'id',
  version: 'version',
  code: 'code',
  applicationDate: 'applicationDate',
  status: 'status',
  notes: 'notes',
  applicationStatusRef: 'applicationStatusRef',
  applicationStageRef: 'applicationStageRef',
  jobCandidateId: 'jobCandidate',
  jobPostingId: 'jobPosting',
  reviewedByEmployeeId: 'reviewedByEmployee',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobApplicationPayload = (data: any): JobApplicationPayload => {
  return buildPayload(data, JobApplicationFormFields)
}
