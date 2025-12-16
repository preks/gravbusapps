import dayjs from 'dayjs'
import { BenefitCatalogItem } from '../types/benefitCatalogTypes'

/**
 * Format a date string to localized display format
 */
export const formatDate = (dateStr: string | undefined, locale: string): string => {
  if (!dateStr) return '-'
  return dayjs(dateStr).locale(locale).format('MMM D, YYYY')
}

/**
 * Parse benefit objectValue JSON to extract benefit details
 */
export const parseBenefitObjectValue = (
  objectValue: unknown
): { value?: string; period?: string; groups?: string[]; currency?: string } => {
  if (!objectValue) return {}

  try {
    // objectValue might be a string or already parsed object
    const parsed = typeof objectValue === 'string' ? JSON.parse(objectValue) : objectValue
    return {
      value: parsed?.value,
      period: parsed?.period,
      groups: parsed?.groups,
      currency: parsed?.currency
    }
  } catch {
    // Silently handle parsing errors and return empty object
    return {}
  }
}

/**
 * Get period suffix for value display
 */
export const getPeriodSuffix = (period?: string): string => {
  if (period === 'yearly') return '/yr'
  if (period === 'monthly') return '/mo'
  return ''
}

/**
 * Get benefit value display from catalog objectValue
 * Returns the catalog's defined value with proper period label
 */
export const getCatalogValueDisplay = (
  benefit: BenefitCatalogItem,
  benefitDetails: { value?: string; period?: string; groups?: string[]; currency?: string },
  t: (key: string, params?: any) => string
): { amount: number; periodLabel: string } | null => {
  // Use catalog value as source of truth
  if (benefitDetails.value && benefitDetails.value !== 'none') {
    const amount = Number.parseFloat(benefitDetails.value)

    // Validate that the parsed amount is a valid number
    if (!Number.isFinite(amount)) {
      return null
    }

    const period = benefitDetails.period || 'yearly'
    const periodLabel = period === 'monthly' ? t('benefit-details-monthly-value') : t('benefit-details-yearly-value')

    return { amount, periodLabel }
  }

  // Fallback to employee benefit data if catalog value not available
  if (benefit.yearlyAmount) {
    return { amount: benefit.yearlyAmount, periodLabel: t('benefit-details-yearly-value') }
  }

  if (benefit.monthlyAmount) {
    return { amount: benefit.monthlyAmount, periodLabel: t('benefit-details-monthly-value') }
  }

  return null
}
