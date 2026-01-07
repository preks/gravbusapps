import type { EmployeeBenefitBaseData, BenefitReviewBasePayload } from '../employee-benefit-review/types'

export type { BenefitDisplayItem } from '../employee-benefit-review/types'

export type EmployeeBenefitData = EmployeeBenefitBaseData

export interface BenefitReviewPayload extends BenefitReviewBasePayload {
  employeeBenefit: EmployeeBenefitData
}
