/**
 * Compensation data transformation utilities
 * Centralized exports for all transformation functions
 */

export {
  normalizeCurrency,
  transformCompensationBand,
  transformEmployeeSalaryToCompensation,
  transformEmployeeSalaryToHistory,
  transformBonus,
  transformBenefit,
  transformPayslip
} from './compensationTransformers'

export {
  getTranslatedBenefitType,
  getTranslatedProviderValue,
  getTranslatedCatalogEntryValue
} from './benefitTranslationUtils'

export {
  normalizeSalaryData,
  hasAnySalaryData,
  calculateYearlyFromMonthly,
  calculateMonthlyFromYearly,
  type NormalizedSalaryData
} from './salaryCalculations'
