/**
 * JobRequest Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobRequest } from '../types/jobRequestTypes'

export interface JobRequestPayload {
  id?: string
  version?: number
  code?: string
  title: string
  description?: string
  requestDate?: string
  requiredStartDate?: string
  status?: string
  jobRequestStatusRef?: string
  jobRequestTypeRef?: string
  priorityRef?: string
  departmentRef?: string
  requestedByEmployeeId?: string
  jobPositionId?: string
  approvedByEmployeeId?: string
  additionalProperties?: any
}

export const buildJobRequestPayload = (data: Partial<JobRequest>): JobRequestPayload => {
  return buildPayload<JobRequestPayload>({
    id: data.id,
    version: data.version,
    code: data.code,
    title: data.title || '',
    description: data.description,
    requestDate: data.requestDate,
    requiredStartDate: data.requiredStartDate,
    status: data.status,
    jobRequestStatusRef: data.jobRequestStatusRef,
    jobRequestTypeRef: data.jobRequestTypeRef,
    priorityRef: data.priorityRef,
    departmentRef: data.departmentRef,
    requestedByEmployeeId: data.requestedByEmployeeId,
    jobPositionId: data.jobPositionId,
    approvedByEmployeeId: data.approvedByEmployeeId,
    additionalProperties: data.additionalProperties
  })
}
