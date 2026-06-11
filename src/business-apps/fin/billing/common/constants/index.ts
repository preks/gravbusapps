/**
 * NEWWORK Billing & Invoicing - constants and enterprise defaults.
 *
 * Geography defaults target EU / Germany VAT but everything is configurable
 * per tenant via Finance Settings. Currency support is multi-currency from MVP.
 */
import type { CurrencySettings, InvoiceStatus, PaymentTerm, RoundingMode, TaxCategory } from '../types'

export const MODULE_DOMAIN = 'billing'

/** Default accounting/display currency when a tenant has not configured one. */
export const DEFAULT_CURRENCY = 'EUR'

/** Minor-unit precision per currency (fallbacks to 2). */
export const CURRENCY_PRECISION: Record<string, number> = {
  EUR: 2,
  USD: 2,
  GBP: 2,
  CHF: 2,
  JPY: 0
}

export const DEFAULT_ROUNDING_MODE: RoundingMode = 'HALF_UP'

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  enabledCurrencies: ['EUR', 'USD', 'GBP', 'CHF'],
  precisionByCurrency: CURRENCY_PRECISION,
  roundingMode: DEFAULT_ROUNDING_MODE
}

/** EU/DE-flavoured default tax categories; tenants override in settings. */
export const DEFAULT_TAX_CATEGORIES: TaxCategory[] = [
  {
    id: 'tax-standard-de',
    code: 'DE_STD',
    name: 'Standard rate (19%)',
    treatment: 'STANDARD',
    rates: [
      {
        id: 'rate-de-19',
        taxCategoryId: 'tax-standard-de',
        ratePercent: 19,
        validFrom: '2021-01-01',
        countryCode: 'DE',
        reportingCode: 'UST19'
      }
    ]
  },
  {
    id: 'tax-reduced-de',
    code: 'DE_RED',
    name: 'Reduced rate (7%)',
    treatment: 'REDUCED',
    rates: [
      {
        id: 'rate-de-7',
        taxCategoryId: 'tax-reduced-de',
        ratePercent: 7,
        validFrom: '2021-01-01',
        countryCode: 'DE',
        reportingCode: 'UST7'
      }
    ]
  },
  {
    id: 'tax-intra-eu',
    code: 'EU_RC',
    name: 'Intra-EU reverse charge (0%)',
    treatment: 'REVERSE_CHARGE',
    rates: [
      {
        id: 'rate-eu-0',
        taxCategoryId: 'tax-intra-eu',
        ratePercent: 0,
        validFrom: '2021-01-01',
        reportingCode: 'EU_RC'
      }
    ]
  },
  {
    id: 'tax-exempt',
    code: 'EXEMPT',
    name: 'Tax exempt (0%)',
    treatment: 'EXEMPT',
    rates: [
      {
        id: 'rate-exempt-0',
        taxCategoryId: 'tax-exempt',
        ratePercent: 0,
        validFrom: '2021-01-01',
        reportingCode: 'EXEMPT'
      }
    ]
  }
]

export const DEFAULT_PAYMENT_TERMS: PaymentTerm[] = [
  { id: 'term-net-14', code: 'NET14', name: 'Net 14 days', dueDays: 14 },
  { id: 'term-net-30', code: 'NET30', name: 'Net 30 days', dueDays: 30 },
  { id: 'term-net-60', code: 'NET60', name: 'Net 60 days', dueDays: 60 },
  {
    id: 'term-2-10-net-30',
    code: '2_10_NET30',
    name: '2% 10 days, net 30',
    dueDays: 30,
    earlyPaymentDiscountPercent: 2,
    earlyPaymentDiscountDays: 10
  }
]

/**
 * Default chart-of-accounts mapping used to build ledger postings.
 * These are NEWWORK-owned posting rule defaults, overridable per legal entity.
 */
export const DEFAULT_POSTING_ACCOUNTS = {
  accountsReceivable: '1400',
  revenue: '8000',
  taxPayable: '3806',
  cashClearing: '1800',
  rounding: '6999',
  fxGainLoss: '6960',
  badDebt: '6920'
} as const

export type PostingAccounts = typeof DEFAULT_POSTING_ACCOUNTS

/** Statuses that represent a finalized (immutable) invoice. */
export const FINALIZED_STATUSES: InvoiceStatus[] = [
  'ISSUED',
  'SENT',
  'PARTIALLY_PAID',
  'PAID',
  'OVERDUE',
  'WRITTEN_OFF'
]

/** Statuses that can still be freely edited. */
export const EDITABLE_STATUSES: InvoiceStatus[] = ['DRAFT']

/** Permissions gating billing actions (mapped to platform roles upstream). */
export const BILLING_PERMISSIONS = {
  CREATE_DRAFT: 'billing.invoice.create',
  ISSUE: 'billing.invoice.issue',
  CANCEL: 'billing.invoice.cancel',
  CREATE_CREDIT_NOTE: 'billing.creditNote.create',
  MARK_PAID: 'billing.payment.allocate',
  EDIT_SETTINGS: 'billing.settings.edit',
  EXPORT: 'billing.report.export'
} as const

export type BillingPermission = (typeof BILLING_PERMISSIONS)[keyof typeof BILLING_PERMISSIONS]

/** Module color variant aligned with the FIN module (see common/constants/ui.ts). */
export const BILLING_MODULE_VARIANT = 'ext3'
