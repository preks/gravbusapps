/**
 * JobRequest Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import { JobRequestType, JobRequestStatus } from '../types/enums'

export interface JobRequestPayload {
  id?: string
  version?: number
  code?: string
  name: string
  description?: string
  plannedHireDate?: string
  plannedExitDate?: string
  jobRequestType?: JobRequestType
  jobRequestStatus?: JobRequestStatus
  contractTypeRef?: string
  employmentTypeRef?: string
  jobExperienceLevelRef?: string
  organizationalUnitId?: string
  companyId?: string
  costCenterId?: string
  siteLocationId?: string
  jobProfileId?: string
  jobPositionId?: string
  requesterEmployeeId?: string
  additionalProperties?: any
}

export const JobRequestFormFields = {
  id: 'id',
  version: 'version',
  code: 'code',
  name: 'name',
  description: 'description',
  plannedHireDate: 'plannedHireDate',
  plannedExitDate: 'plannedExitDate',
  jobRequestType: 'jobRequestType',
  jobRequestStatus: 'jobRequestStatus',
  contractTypeRef: 'contractTypeRef',
  employmentTypeRef: 'employmentTypeRef',
  jobExperienceLevelRef: 'jobExperienceLevelRef',
  organizationalUnitId: 'organizationalUnit',
  companyId: 'company',
  costCenterId: 'costCenter',
  siteLocationId: 'siteLocation',
  jobProfileId: 'jobProfile',
  jobPositionId: 'jobPosition',
  requesterEmployeeId: 'requesterEmployee',
  additionalProperties: 'additionalProperties'
} as const

export const buildJobRequestPayload = (data: any): JobRequestPayload => {
  const payload = buildPayload(data, JobRequestFormFields)
  return {
    ...payload,
    name: data.name || ''
  }
}
