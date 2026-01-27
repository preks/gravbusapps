/**
 * JobRequest Payload Builders
 */
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'
import type { JobRequest } from '../types/jobRequestTypes'

export const JobRequestFormFields = {
  id: 'id',
  version: 'version',
  code: 'code',
  name: 'name',
  description: 'description',
  plannedHireDate: 'plannedHireDate',
  plannedExitDate: 'plannedExitDate',
  amount: 'amount',
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

export const buildJobRequestPayload = (data: Partial<JobRequest>) => {
  const basePayload = buildPayload(data, JobRequestFormFields)

  return {
    jobRequest: {
      ...basePayload,
      name: data.name || ''
    }
  }
}
