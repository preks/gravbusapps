import * as windowUtils from '@/common/utils/windowUtils'
import { formatCurrencyString, parseLocalizedNumber } from '@/common/utils/numberFormatter'
import type { BenefitDisplayItem, EmployeeBenefitBaseData } from '../types'
import { translatePeriod, type TranslationFunction } from '@/business-apps/hr/core/utils/benefitExtractionUtils'

export type { TranslationFunction } from '@/business-apps/hr/core/utils/benefitExtractionUtils'

export interface CatalogEntry {
  id: string
  code: string
  value: string
  displayOrder?: number | null
  objectValue?: unknown
  translations?: Array<{
    localeCode: string
    value: string
    objectValue?: unknown
  }>
  catalog?: {
    identifier: string
    version: string
    defaultLocale: string
  }
}

/**
 * Extract the last part from a reference string (e.g., "Currency:v1:EUR" -> "EUR")
 */
export function extractLastPartFromRef(ref: string, fallback: string = '-'): string {
  const parts = ref.split(':')
  return parts[parts.length - 1] || fallback
}

/**
 * Extract currency code from reference format
 */
export function extractCurrencyCode(currencyRef: string | null): string {
  if (!currencyRef) return 'EUR'
  return extractLastPartFromRef(currencyRef, 'EUR')
}

/**
 * Extract and format catalog entry display value with fallback
 */
export function extractCatalogDisplay(
  catalogRef: string | null | undefined,
  catalogEntry: CatalogEntry | null
): string {
  if (!catalogRef) return '-'

  if (catalogEntry) {
    return windowUtils.getCatalogValue(catalogEntry) ?? catalogEntry.value ?? '-'
  }

  // Fallback: extract code from catalog reference format
  return extractLastPartFromRef(catalogRef)
}

/**
 * Format date to numeric format (DD.MM.YYYY) - language agnostic
 */
export function formatDateValue(date: string | null | undefined): string {
  if (!date) {
    return '-'
  }

  try {
    const d = new Date(date)
    if (Number.isNaN(d.getTime())) {
      return date // Return original if invalid
    }

    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()

    return `${day}.${month}.${year}`
  } catch {
    return date
  }
}

/**
 * Parse benefit objectValue JSON structure
 * Expected format: { value: "50", period: "monthly", groups: [...] }
 */
export function parseBenefitObjectValue(rawValue: unknown): { value?: string | number; period?: string } | null {
  if (rawValue == null) return null

  try {
    const parsed = typeof rawValue === 'string' ? JSON.parse(rawValue) : rawValue
    if (typeof parsed === 'object' && parsed !== null) {
      return {
        value: parsed.value,
        period: parsed.period
      }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Extract benefit value and period from catalog entry objectValue
 * Checks both entry.objectValue and translations[locale].objectValue
 */
export function extractBenefitValueFromCatalog(
  catalogEntry: CatalogEntry | null,
  locale: string
): { value: string; period: string } | null {
  if (!catalogEntry) return null

  // Try to get objectValue from translation first (locale-specific)
  // but only if it has actual properties (not an empty object)
  const translation = catalogEntry.translations?.find(t => t.localeCode === locale)
  let objectValue = catalogEntry.objectValue

  if (
    translation?.objectValue &&
    typeof translation.objectValue === 'object' &&
    !Array.isArray(translation.objectValue)
  ) {
    const translationObjValue = translation.objectValue as Record<string, unknown>
    // Only use translation objectValue if it has properties
    if (Object.keys(translationObjValue).length > 0) {
      objectValue = translation.objectValue
    }
  }

  const parsed = parseBenefitObjectValue(objectValue)
  if (!parsed) return null

  // Extract value - handle both string (with currency) and number formats
  let valueStr: string | null = null
  if (parsed.value != null && parsed.value !== '') {
    const parsedNum = parseLocalizedNumber(parsed.value)
    if (!Number.isNaN(parsedNum)) {
      valueStr = String(parsedNum)
    }
  }

  // Extract period - always extract it if it exists in the parsed object
  let period: string | null = null
  if (parsed.period != null && parsed.period !== '') {
    period = String(parsed.period).trim()
  }

  // Return null only if both value and period are missing
  if (valueStr == null && period == null) return null

  return {
    value: valueStr || '0',
    period: period || '-'
  }
}

/**
 * Build benefit display items for review forms (configurable with translation prefix)
 */
export function buildBenefitDisplayItems(params: {
  benefitData: EmployeeBenefitBaseData
  locale: string
  translationPrefix: string
  benefitTypeEntry?: CatalogEntry | null
  providerEntry?: CatalogEntry | null
  t: TranslationFunction
}): BenefitDisplayItem[] {
  const { benefitData, locale, translationPrefix, benefitTypeEntry = null, providerEntry = null, t } = params
  const currencyCode = extractCurrencyCode(benefitData.currencyRef)
  const benefitTypeDisplay = extractCatalogDisplay(benefitData.benefitTypeRef, benefitTypeEntry)
  const providerDisplay = extractCatalogDisplay(benefitData.benefitProviderRef, providerEntry)

  // Extract value and period from catalog entry objectValue
  const catalogValue = extractBenefitValueFromCatalog(benefitTypeEntry, locale)

  // Extract numeric value - handle currency symbols in the value string
  let valueAmount = 0
  if (catalogValue?.value) {
    const numericValue = parseLocalizedNumber(catalogValue.value)
    valueAmount = Number.isNaN(numericValue) ? 0 : numericValue
  } else {
    valueAmount = benefitData.yearlyAmount || benefitData.monthlyAmount || 0
  }

  // Extract period - prioritize catalog value, then fallback to benefitData
  const rawPeriod =
    catalogValue?.period && catalogValue.period !== '-' ? catalogValue.period : benefitData.period || null

  // Translate the period value
  const valuePeriod = translatePeriod(rawPeriod, t)

  const items: BenefitDisplayItem[] = [
    {
      key: 'benefitType',
      label: t(`${translationPrefix}-benefit-type`, { defaultValue: 'Benefit Type' }),
      value: benefitTypeDisplay
    },
    {
      key: 'provider',
      label: t(`${translationPrefix}-provider`, { defaultValue: 'Provider' }),
      value: providerDisplay
    },
    {
      key: 'value',
      label: t(`${translationPrefix}-value`, { defaultValue: 'Value' }),
      value: formatCurrencyString(valueAmount, { currency: currencyCode, locale })
    },
    {
      key: 'period',
      label: t(`${translationPrefix}-period`, { defaultValue: 'Period' }),
      value: valuePeriod || '-'
    }
  ]

  // Add start date
  items.push({
    key: 'startDate',
    label: t(`${translationPrefix}-start-date`, {
      defaultValue: translationPrefix.includes('request') ? 'Preferred Start Date' : 'Start Date'
    }),
    value: formatDateValue(benefitData.startDate)
  })

  // Add employee contributions if available
  if (benefitData.employeeYearlyContribution && benefitData.employeeYearlyContribution > 0) {
    items.push({
      key: 'employeeYearlyContribution',
      label: t(`${translationPrefix}-employee-yearly-contribution`, {
        defaultValue: 'Employee Yearly Contribution'
      }),
      value: formatCurrencyString(benefitData.employeeYearlyContribution, { currency: currencyCode, locale })
    })
  }

  if (benefitData.employeeMonthlyContribution && benefitData.employeeMonthlyContribution > 0) {
    items.push({
      key: 'employeeMonthlyContribution',
      label: t(`${translationPrefix}-employee-monthly-contribution`, {
        defaultValue: 'Employee Monthly Contribution'
      }),
      value: formatCurrencyString(benefitData.employeeMonthlyContribution, { currency: currencyCode, locale })
    })
  }

  return items
}
