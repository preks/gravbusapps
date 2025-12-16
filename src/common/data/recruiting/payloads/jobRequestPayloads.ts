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

export const buildJobRequestPayload = (data: Partial<JobRequest>): JobRequestPayload => {
  return buildPayload<JobRequestPayload>({
    id: data.id,
    version: data.version,
    code: data.code,
    name: data.name || '',
    note: data.note,
    headcount: data.headcount || 1,
    startDate: data.startDate,
    endDate: data.endDate,
    requisitionStatus: data.requisitionStatus,
    reasonRef: data.reasonRef,
    contractTypeRef: data.contractTypeRef,
    experienceLevelRef: data.experienceLevelRef,
    organizationalUnitId: data.organizationalUnitId,
    replacedPositionId: data.replacedPositionId,
    requesterId: data.requesterId,
    jobProfileId: data.jobProfileId,
    costCenterId: data.costCenterId,
    additionalProperties: data.additionalProperties
  })
}
