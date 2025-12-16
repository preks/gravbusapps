/**
 * JobApplicationInterview Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobApplicationInterview } from '../types/jobApplicationInterviewTypes'

export interface JobApplicationInterviewPayload {
  id?: string
  version?: number
  interviewDate?: string
  scheduledDate?: string
  confirmedDate?: string
  cancelledDate?: string
  duration?: number
  participants?: any
  meetingPlace?: string
  meetingLink?: string
  typeRef?: string
  jobApplicationId: string
  employeeId?: string
  additionalProperties?: any
}

export const JobApplicationInterviewFormFields = {
  id: 'id',
  version: 'version',
  interviewDate: 'interviewDate',
  scheduledDate: 'scheduledDate',
  confirmedDate: 'confirmedDate',
  cancelledDate: 'cancelledDate',
  duration: 'duration',
  participants: 'participants',
  meetingPlace: 'meetingPlace',
  meetingLink: 'meetingLink',
  typeRef: 'typeRef',
  jobApplicationId: 'jobApplication',
  employeeId: 'employee',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobApplicationInterviewPayload = (
  data: Partial<JobApplicationInterview> & any
): JobApplicationInterviewPayload => {
  const payload = buildPayload(data, JobApplicationInterviewFormFields)
  return {
    ...payload,
    jobApplicationId: data.jobApplicationId || ''
  }
}
