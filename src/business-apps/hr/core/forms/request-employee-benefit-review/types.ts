import type {
  BenefitDisplayItem,
  EmployeeBenefitBaseData,
  BenefitReviewBasePayload
} from '../employee-benefit-review/types'

export type { BenefitDisplayItem }

export type EmployeeBenefitData = EmployeeBenefitBaseData

export interface BenefitReviewPayload extends BenefitReviewBasePayload {
  employeeBenefit: EmployeeBenefitData
}
