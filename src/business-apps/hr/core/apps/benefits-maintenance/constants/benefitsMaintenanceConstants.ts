export const BENEFIT_TYPE_CATALOG = 'BenefitType'
export const BENEFIT_TYPE_VERSION = 'v1'

export const BENEFIT_PROVIDER_CATALOG = 'BenefitProvider'
export const BENEFIT_PROVIDER_VERSION = 'v1'

export const BENEFIT_PERIODS = ['monthly', 'yearly'] as const
export type BenefitPeriod = (typeof BENEFIT_PERIODS)[number]

export const ELIGIBILITY_GROUPS = ['all-employees', 'all-hr-backoffice'] as const
export type EligibilityGroup = (typeof ELIGIBILITY_GROUPS)[number]

export const ENTRIES_PAGE_SIZE = 50
