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

export const computeDerivedValues = (selectedBenefit: BenefitCatalogItem | null): DerivedValues => {
  const rawObjectValue = selectedBenefit?.catalogEntry?.objectValue
  let ov: any = null
  if (rawObjectValue != null) {
    try {
      ov = typeof rawObjectValue === 'string' ? JSON.parse(rawObjectValue as string) : rawObjectValue
    } catch {
      ov = null
    }
  }

  let displayFromOV = undefined as string | undefined
  let periodFromOV = undefined as string | undefined
  let amountNumberFromOV = undefined as number | undefined
  let employeeYearlyContribution = undefined as number | undefined
  let employeeMonthlyContribution = undefined as number | undefined

  if (ov) {
    const amount =
      (ov as any)?.displayValue ??
      (ov as any)?.value ??
      (ov as any)?.amount ??
      (ov as any)?.yearlyAmount ??
      (ov as any)?.monthlyAmount

    const unit = (ov as any)?.unit ?? (ov as any)?.currency ?? (ov as any)?.currencyCode ?? (ov as any)?.unitLabel

    if (amount != null) {
      displayFromOV = `${amount}${unit ? ` ${unit}` : ''}`
      const parsedAmount = typeof amount === 'number' ? amount : Number.parseFloat(String(amount).replace(',', '.'))
      if (Number.isFinite(parsedAmount)) {
        amountNumberFromOV = parsedAmount
      }
    }
    const periodCandidate =
      (ov as any)?.period ?? (ov as any)?.periodicity ?? (ov as any)?.frequency ?? (ov as any)?.interval
    if (periodCandidate != null) {
      periodFromOV = String(periodCandidate)
    }

    // Extract contribution values if available
    const yearlyContrib = (ov as any)?.employeeYearlyContribution ?? (ov as any)?.yearlyContribution
    if (yearlyContrib != null) {
      const parsed =
        typeof yearlyContrib === 'number' ? yearlyContrib : Number.parseFloat(String(yearlyContrib).replace(',', '.'))
      if (Number.isFinite(parsed)) {
        employeeYearlyContribution = parsed
      }
    }

    const monthlyContrib = (ov as any)?.employeeMonthlyContribution ?? (ov as any)?.monthlyContribution
    if (monthlyContrib != null) {
      const parsed =
        typeof monthlyContrib === 'number'
          ? monthlyContrib
          : Number.parseFloat(String(monthlyContrib).replace(',', '.'))
      if (Number.isFinite(parsed)) {
        employeeMonthlyContribution = parsed
      }
    }
  }

  return {
    includedValueDisplay: displayFromOV ?? '-',
    resolvedPeriodDisplay: periodFromOV || '',
    derivedAmountNumber: amountNumberFromOV,
    employeeYearlyContribution,
    employeeMonthlyContribution
  }
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
