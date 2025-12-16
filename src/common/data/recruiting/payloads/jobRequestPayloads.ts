/**
 * JobRequest Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobRequest } from '../types/jobRequestTypes'

export interface JobRequestPayload {
  id?: string
  version?: number
  code?: string
  name: string
  note?: string
  headcount: number
  startDate?: string
  endDate?: string
  requisitionStatus?: string
  reasonRef?: string
  contractTypeRef?: string
  experienceLevelRef?: string
  organizationalUnitId?: string
  replacedPositionId?: string
  requesterId?: string
  jobProfileId?: string
  costCenterId?: string
  additionalProperties?: any
}

export const JobRequestFormFields = {
  id: 'id',
  version: 'version',
  code: 'code',
  name: 'name',
  note: 'note',
  headcount: 'headcount',
  startDate: 'startDate',
  endDate: 'endDate',
  requisitionStatus: 'requisitionStatus',
  reasonRef: 'reasonRef',
  contractTypeRef: 'contractTypeRef',
  experienceLevelRef: 'experienceLevelRef',
  organizationalUnitId: 'organizationalUnit',
  replacedPositionId: 'replacedPosition',
  requesterId: 'requester',
  jobProfileId: 'jobProfile',
  costCenterId: 'costCenter',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobRequestPayload = (data: Partial<JobRequest> & any): JobRequestPayload => {
  const payload = buildPayload(data, JobRequestFormFields)
  return {
    ...payload,
    name: data.name || '',
    headcount: data.headcount || 1
  }
}
