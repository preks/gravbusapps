/**
 * JobCandidate Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobCandidate } from '../types/jobCandidateTypes'

export interface JobCandidatePayload {
  id?: string
  version?: number
  code?: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  linkedinUrl?: string
  resumeUrl?: string
  coverLetterUrl?: string
  candidateStatusRef?: string
  sourceRef?: string
  academicTitleRef?: string
  createdByEmployeeId?: string
  additionalProperties?: any
}

export const JobCandidateFormFields = {
  id: 'id',
  version: 'version',
  code: 'code',
  firstName: 'firstName',
  lastName: 'lastName',
  email: 'email',
  phone: 'phone',
  linkedinUrl: 'linkedinUrl',
  resumeUrl: 'resumeUrl',
  coverLetterUrl: 'coverLetterUrl',
  candidateStatusRef: 'candidateStatusRef',
  sourceRef: 'sourceRef',
  academicTitleRef: 'academicTitleRef',
  createdByEmployeeId: 'createdByEmployee',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobCandidatePayload = (data: Partial<JobCandidate> & any): JobCandidatePayload => {
  const payload = buildPayload(data, JobCandidateFormFields)
  return {
    ...payload,
    firstName: data.firstName || '',
    lastName: data.lastName || ''
  }
}
