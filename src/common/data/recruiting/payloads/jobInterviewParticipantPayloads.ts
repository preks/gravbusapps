/**
 * JobInterviewParticipant Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { JobInterviewResponse } from '../types/enums'

export interface JobInterviewParticipantPayload {
  id?: string
  version?: number
  jobInterviewResponse?: JobInterviewResponse
  jobInterviewId?: string
  employeeId?: string
  jobCandidateId?: string
  userId?: string
  additionalProperties?: any
}

export const JobInterviewParticipantFormFields = {
  id: 'id',
  version: 'version',
  jobInterviewResponse: 'jobInterviewResponse',
  jobInterviewId: 'jobInterview',
  employeeId: 'employee',
  jobCandidateId: 'jobCandidate',
  userId: 'userId',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobInterviewParticipantPayload = (data: any): JobInterviewParticipantPayload => {
  return buildPayload(data, JobInterviewParticipantFormFields)
}
