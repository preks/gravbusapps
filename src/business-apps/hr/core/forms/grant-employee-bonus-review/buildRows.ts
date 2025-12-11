import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyString } from '@/common/utils/numberFormatter'
import type { EmployeeBonusData, BonusDisplayItem } from './types'

type TranslationFunction = (key: string, options?: { defaultValue?: string; [key: string]: any }) => string

interface BonusTypeCatalogEntry {
  id: string
  code: string
  value: string
  displayOrder: number | null
  translations: Array<{
    localeCode: string
    value: string
  }>
  catalog: {
    identifier: string
    version: string
    defaultLocale: string
  }
}

export interface BonusDetails {
  bonusType: string
  amount: string
  paymentDate: string
  fiscalYear: string
  description?: string
  notes?: string
}

const extractCurrencyCode = (currencyRef: string | null): string => {
  if (!currencyRef) return 'EUR'
  // Extract currency code from reference format like "Currency:v1:EUR" or just "EUR"
  const parts = currencyRef.split(':')
  return parts[parts.length - 1] || 'EUR'
}

/**
 * Extract and format bonus type display from catalog entries
 */
function extractBonusTypeDisplay(
  bonusTypeRef: string | null | undefined,
  bonusTypeEntries: BonusTypeCatalogEntry[]
): string {
  const defaultType = String(bonusTypeRef ?? '-').trim() || '-'

  if (!bonusTypeRef || bonusTypeEntries.length === 0) {
    return defaultType
  }

  // Extract code from catalog reference format: "EmployeeBonusType:v1:annual" -> "annual"
  const catalogRefParts = bonusTypeRef.split(':')
  const typeCode = catalogRefParts[catalogRefParts.length - 1]

  // Find matching catalog entry by id or code
  const typeEntry = bonusTypeEntries.find(entry => entry.id === bonusTypeRef || entry.code === typeCode)
  if (typeEntry) {
    return getCatalogValue(typeEntry) ?? typeEntry.value ?? typeCode
  }

  return defaultType
}

/**
 * Format payment date
 */
function formatPaymentDate(paymentDate: string | null | undefined): string {
  if (!paymentDate) {
    return '-'
  }
  return formatDate(paymentDate, 'date.short') ?? paymentDate
}

/**
 * Build bonus display items for the review form
 * This is NOT a comparison - just displaying the bonus being granted
 */
export function buildBonusDisplayItems(params: {
  bonusData: EmployeeBonusData
  locale: string
  bonusTypeEntries?: BonusTypeCatalogEntry[]
  t: TranslationFunction
}): BonusDisplayItem[] {
  const { bonusData, locale, bonusTypeEntries = [], t } = params
  const currencyCode = extractCurrencyCode(bonusData.currencyRef)
  const bonusTypeDisplay = extractBonusTypeDisplay(bonusData.employeeBonusTypeRef, bonusTypeEntries)

  return [
    {
      key: 'bonusType',
      label: t('grant-bonus-review-bonus-type', { defaultValue: 'Bonus Type' }),
      value: bonusTypeDisplay
    },
    {
      key: 'amount',
      label: t('grant-bonus-review-amount', { defaultValue: 'Amount' }),
      value: formatCurrencyString(bonusData.amount || 0, { currency: currencyCode, locale })
    },
    {
      key: 'paymentMonth',
      label: t('grant-bonus-review-payment-month', { defaultValue: 'Payment Month' }),
      value: formatPaymentDate(bonusData.paymentDate)
    },
    {
      key: 'fiscalYear',
      label: t('grant-bonus-review-fiscal-year', { defaultValue: 'Fiscal Year' }),
      value: bonusData.fiscalYear ? String(bonusData.fiscalYear) : '-'
    }
  ]
}

/**
 * Build bonus details including optional description/notes
 */
export function buildBonusDetails(params: {
  bonusData: EmployeeBonusData
  locale: string
  bonusTypeEntries?: BonusTypeCatalogEntry[]
  t: TranslationFunction
}): BonusDetails {
  const { bonusData, locale, bonusTypeEntries = [] } = params

  const currencyCode = extractCurrencyCode(bonusData.currencyRef)
  const bonusTypeDisplay = extractBonusTypeDisplay(bonusData.employeeBonusTypeRef, bonusTypeEntries)
  const paymentDateFormatted = formatPaymentDate(bonusData.paymentDate)

  return {
    bonusType: bonusTypeDisplay,
    amount: formatCurrencyString(bonusData.amount || 0, { currency: currencyCode, locale }),
    paymentDate: paymentDateFormatted,
    fiscalYear: bonusData.fiscalYear ? String(bonusData.fiscalYear) : '-',
    description: String(bonusData.description ?? '').trim() || undefined,
    notes: String(bonusData.notes ?? '').trim() || undefined
  }
}
