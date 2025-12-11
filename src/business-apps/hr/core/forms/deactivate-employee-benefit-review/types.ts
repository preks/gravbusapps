import type {
  BenefitDisplayItem,
  EmployeeBenefitBaseData,
  BenefitReviewBasePayload
} from '../employee-benefit-review/types'

export type { BenefitDisplayItem }

export interface EmployeeBenefitDeactivationData extends EmployeeBenefitBaseData {
  id: string
  endDate: string
  notes: string
}

export interface DeactivateBenefitReviewPayload extends BenefitReviewBasePayload {
  employeeBenefit: EmployeeBenefitDeactivationData
}

export interface DeactivationDetails {
  requestedEndDate: string
  deactivationReason: string
}
