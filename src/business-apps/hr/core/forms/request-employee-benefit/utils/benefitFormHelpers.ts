import { BENEFIT_FORM_VALIDATION } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/constants/benefitFormValidation'
import type { BenefitCatalogItem } from '@/business-apps/hr/core/apps/employee-record/components/tabs/compensation/types/benefitCatalogTypes'

type TranslateFn = (key: string, params?: any) => string

export interface DerivedValues {
  includedValueDisplay: string
  resolvedPeriodDisplay: string
  derivedAmountNumber?: number
  employeeYearlyContribution?: number
  employeeMonthlyContribution?: number
}

interface BenefitObjectValue {
  displayValue?: string | number
  value?: string | number
  amount?: string | number
  yearlyAmount?: string | number
  monthlyAmount?: string | number
  unit?: string
  currency?: string
  currencyCode?: string
  unitLabel?: string
  period?: string | number
  periodicity?: string | number
  frequency?: string | number
  interval?: string | number
  employeeYearlyContribution?: string | number
  yearlyContribution?: string | number
  employeeMonthlyContribution?: string | number
  monthlyContribution?: string | number
}

export const computeDerivedValues = (selectedBenefit: BenefitCatalogItem | null): DerivedValues => {
  const objectValue = parseBenefitObjectValue(selectedBenefit?.catalogEntry?.objectValue)

  if (!objectValue) {
    return {
      includedValueDisplay: '-',
      resolvedPeriodDisplay: '',
      derivedAmountNumber: undefined,
      employeeYearlyContribution: undefined,
      employeeMonthlyContribution: undefined
    }
  }

  return {
    includedValueDisplay: extractDisplayValue(objectValue),
    resolvedPeriodDisplay: extractPeriod(objectValue),
    derivedAmountNumber: extractAmount(objectValue),
    employeeYearlyContribution: extractYearlyContribution(objectValue),
    employeeMonthlyContribution: extractMonthlyContribution(objectValue)
  }
}

function parseBenefitObjectValue(rawValue: unknown): BenefitObjectValue | null {
  if (rawValue == null) return null

  try {
    return typeof rawValue === 'string' ? JSON.parse(rawValue) : (rawValue as BenefitObjectValue)
  } catch {
    return null
  }
}

function extractDisplayValue(ov: BenefitObjectValue): string {
  const amount = ov.displayValue ?? ov.value ?? ov.amount ?? ov.yearlyAmount ?? ov.monthlyAmount
  if (amount == null) return '-'

  const unit = ov.unit ?? ov.currency ?? ov.currencyCode ?? ov.unitLabel
  const unitSuffix = unit ? ` ${unit}` : ''
  return `${amount}${unitSuffix}`
}

function extractPeriod(ov: BenefitObjectValue): string {
  const period = ov.period ?? ov.periodicity ?? ov.frequency ?? ov.interval
  if (period == null) {
    return ''
  }
  return String(period)
}

function extractAmount(ov: BenefitObjectValue): number | undefined {
  const amount = ov.displayValue ?? ov.value ?? ov.amount ?? ov.yearlyAmount ?? ov.monthlyAmount
  if (amount == null) return undefined

  const parsed = typeof amount === 'number' ? amount : Number.parseFloat(String(amount).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

function extractYearlyContribution(ov: BenefitObjectValue): number | undefined {
  const value = ov.employeeYearlyContribution ?? ov.yearlyContribution
  if (value == null) return undefined

  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

function extractMonthlyContribution(ov: BenefitObjectValue): number | undefined {
  const value = ov.employeeMonthlyContribution ?? ov.monthlyContribution
  if (value == null) return undefined

  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : undefined
}

export const composeValueWithCurrency = (base: string, currencyCode: string): string => {
  if (!base || base === '-') return '-'
  if (currencyCode) {
    const upper = base.toUpperCase()
    const hasAlready = upper.endsWith(` ${currencyCode}`) || upper.includes(` ${currencyCode} `)
    return hasAlready ? base : `${base} ${currencyCode}`
  }
  return base
}

export const validateBenefitForm = ({
  startDate,
  justification,
  t
}: {
  startDate: string
  justification: string
  t: TranslateFn
}): string[] | null => {
  const errors: string[] = []

  if (!startDate || startDate.length === 0) {
    errors.push(t('error-start-date-required'))
  } else {
    const selectedDate = new Date(startDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (selectedDate < today) {
      errors.push(t('error-start-date-future'))
    }
  }

  const trimmedJustification = justification.trim()
  if (trimmedJustification.length < BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH) {
    errors.push(
      t('error-justification-min-length', {
        min: BENEFIT_FORM_VALIDATION.MIN_TEXT_LENGTH
      })
    )
  }
  if (trimmedJustification.length > BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH) {
    errors.push(
      t('error-justification-max-length', {
        max: BENEFIT_FORM_VALIDATION.MAX_TEXT_LENGTH
      })
    )
  }

  return errors.length > 0 ? errors : null
}

export const buildBenefitSubmitPayload = ({
  employeeId,
  selectedBenefit,
  provider,
  derivedAmountNumber,
  period,
  resolvedPeriodDisplay,
  countryCurrencyRef,
  startDate,
  justification,
  employeeYearlyContribution,
  employeeMonthlyContribution,
  markAsSubmitted
}: {
  employeeId: string
  selectedBenefit: BenefitCatalogItem | null
  provider: string
  derivedAmountNumber?: number
  period: string
  resolvedPeriodDisplay: string
  countryCurrencyRef: string | null
  startDate: string
  justification: string
  employeeYearlyContribution?: number
  employeeMonthlyContribution?: number
  markAsSubmitted: () => void
}) => {
  markAsSubmitted()
  const yearlyAmountValue = derivedAmountNumber || 0
  const monthlyAmountValue = yearlyAmountValue > 0 ? Math.round((yearlyAmountValue / 12) * 100) / 100 : 0
  const periodValue = period || resolvedPeriodDisplay || null
  const currencyRef = countryCurrencyRef || BENEFIT_FORM_VALIDATION.DEFAULT_CURRENCY_REF

  const payload: any = {
    employeeBenefit: {
      employee: employeeId,
      benefitTypeRef: selectedBenefit?.catalogId || '',
      benefitProviderRef: provider || null,
      yearlyAmount: yearlyAmountValue,
      monthlyAmount: monthlyAmountValue,
      period: periodValue,
      currencyRef: currencyRef,
      startDate: new Date(startDate).toISOString(),
      notes: justification.trim(),
      status: 'PENDING_COMPENSATION'
    }
  }

  // Add optional contribution fields if available
  if (employeeYearlyContribution != null && employeeYearlyContribution > 0) {
    payload.employeeBenefit.employeeYearlyContribution = employeeYearlyContribution
  }
  if (employeeMonthlyContribution != null && employeeMonthlyContribution > 0) {
    payload.employeeBenefit.employeeMonthlyContribution = employeeMonthlyContribution
  }

  return payload
}
