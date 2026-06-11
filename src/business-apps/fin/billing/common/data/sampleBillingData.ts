/**
 * Sample billing data for local development and previews.
 *
 * Used as a graceful fallback when the Billing Core backend is not reachable
 * (e.g. local dev). Production data always comes from the API.
 */
import { DEFAULT_CURRENCY_SETTINGS, DEFAULT_PAYMENT_TERMS, DEFAULT_TAX_CATEGORIES } from '../constants'
import { calculateInvoice } from '../utils/invoiceCalculations'
import type { BillingSettings } from '../queries/billingCoreApi'
import type { BankStatementLine, BillingCustomer, Invoice, LegalEntity } from '../types'

export const SAMPLE_LEGAL_ENTITY: LegalEntity = {
  id: 'le-newwork-gmbh',
  name: 'NEWWORK GmbH',
  addressLines: ['Friedrichstraße 1', '10117 Berlin'],
  countryCode: 'DE',
  taxId: 'DE-1234567',
  vatId: 'DE123456789',
  accountingCurrency: 'EUR',
  defaultCurrency: 'EUR',
  bankAccounts: [
    { id: 'ba-1', label: 'Main account', iban: 'DE89370400440532013000', bic: 'COBADEFFXXX', currency: 'EUR' }
  ],
  invoiceFooter: 'Thank you for your business.',
  defaultLocale: 'de-DE'
}

export const SAMPLE_BILLING_CUSTOMERS: BillingCustomer[] = [
  {
    id: 'bc-acme',
    crmAccountId: 'acc-acme',
    name: 'Acme Corporation',
    billingAddressLines: ['1 Market St', 'San Francisco, CA 94105'],
    countryCode: 'US',
    vatId: null,
    taxExempt: false,
    defaultPaymentTermId: 'term-net-30',
    defaultCurrency: 'USD',
    preferredLocale: 'en-US'
  },
  {
    id: 'bc-globex',
    crmAccountId: 'acc-globex',
    name: 'Globex SE',
    billingAddressLines: ['Hauptstraße 5', '60311 Frankfurt'],
    countryCode: 'DE',
    vatId: 'DE987654321',
    taxExempt: false,
    defaultPaymentTermId: 'term-net-14',
    defaultCurrency: 'EUR',
    preferredLocale: 'de-DE'
  }
]

export const SAMPLE_SETTINGS: BillingSettings = {
  legalEntities: [SAMPLE_LEGAL_ENTITY],
  taxCategories: DEFAULT_TAX_CATEGORIES,
  currencies: DEFAULT_CURRENCY_SETTINGS,
  paymentTerms: DEFAULT_PAYMENT_TERMS
}

function makeInvoice(params: {
  id: string
  number: string | null
  status: Invoice['status']
  customer: BillingCustomer
  currency: string
  issueDate: string | null
  dueDate: string | null
  paidAmount: number
  lines: Array<{ description: string; quantity: number; unitPrice: number; taxCategoryId: string }>
}): Invoice {
  const { lines, totals } = calculateInvoice(
    params.lines.map((line, index) => ({ id: `${params.id}-l${index}`, ...line })),
    { currency: params.currency, taxCategories: DEFAULT_TAX_CATEGORIES }
  )
  const now = '2026-05-01T10:00:00.000Z'
  return {
    id: params.id,
    invoiceNumber: params.number,
    status: params.status,
    legalEntityId: SAMPLE_LEGAL_ENTITY.id,
    billingCustomerId: params.customer.id,
    crmAccountId: params.customer.crmAccountId,
    crmOpportunityId: null,
    currency: params.currency,
    accountingCurrency: 'EUR',
    fxRate:
      params.currency === 'EUR'
        ? null
        : { fromCurrency: params.currency, toCurrency: 'EUR', rate: 0.92, rateDate: now, source: 'ECB' },
    issueDate: params.issueDate,
    dueDate: params.dueDate,
    paymentTermId: params.customer.defaultPaymentTermId ?? null,
    lines,
    totals,
    paidAmount: params.paidAmount,
    notes: null,
    locale: params.customer.preferredLocale,
    ledgerLinks: params.number
      ? [
          {
            eventType: 'INVOICE_ISSUED',
            eventId: `nw-billing:issued:${params.id}`,
            ledgerTransactionRef: `LX-${params.id}`,
            postedAt: now
          }
        ]
      : [],
    payments: [],
    audit: [{ id: `${params.id}-a0`, action: 'created', timestamp: now }],
    createdAt: now,
    updatedAt: now
  }
}

export const SAMPLE_INVOICES: Invoice[] = [
  makeInvoice({
    id: 'inv-1001',
    number: 'INV-2026-0001',
    status: 'PAID',
    customer: SAMPLE_BILLING_CUSTOMERS[1],
    currency: 'EUR',
    issueDate: '2026-04-01T00:00:00.000Z',
    dueDate: '2026-04-15T00:00:00.000Z',
    paidAmount: 11900,
    lines: [
      { description: 'Platform subscription (Q2)', quantity: 1, unitPrice: 10000, taxCategoryId: 'tax-standard-de' }
    ]
  }),
  makeInvoice({
    id: 'inv-1002',
    number: 'INV-2026-0002',
    status: 'OVERDUE',
    customer: SAMPLE_BILLING_CUSTOMERS[1],
    currency: 'EUR',
    issueDate: '2026-03-01T00:00:00.000Z',
    dueDate: '2026-03-15T00:00:00.000Z',
    paidAmount: 0,
    lines: [
      { description: 'Implementation services', quantity: 20, unitPrice: 150, taxCategoryId: 'tax-standard-de' },
      { description: 'Training (reduced rate)', quantity: 2, unitPrice: 500, taxCategoryId: 'tax-reduced-de' }
    ]
  }),
  makeInvoice({
    id: 'inv-1003',
    number: 'INV-2026-0003',
    status: 'SENT',
    customer: SAMPLE_BILLING_CUSTOMERS[0],
    currency: 'USD',
    issueDate: '2026-04-20T00:00:00.000Z',
    dueDate: '2026-05-20T00:00:00.000Z',
    paidAmount: 0,
    lines: [{ description: 'Enterprise license', quantity: 1, unitPrice: 25000, taxCategoryId: 'tax-intra-eu' }]
  }),
  makeInvoice({
    id: 'inv-1004',
    number: null,
    status: 'DRAFT',
    customer: SAMPLE_BILLING_CUSTOMERS[0],
    currency: 'USD',
    issueDate: null,
    dueDate: null,
    paidAmount: 0,
    lines: [{ description: 'Add-on module', quantity: 3, unitPrice: 1200, taxCategoryId: 'tax-intra-eu' }]
  })
]

export const SAMPLE_BANK_STATEMENT_LINES: BankStatementLine[] = [
  {
    id: 'bsl-1',
    bookingDate: '2026-04-16T00:00:00.000Z',
    amount: 11900,
    currency: 'EUR',
    counterparty: 'Globex SE',
    reference: 'INV-2026-0001'
  },
  {
    id: 'bsl-2',
    bookingDate: '2026-04-22T00:00:00.000Z',
    amount: 5000,
    currency: 'EUR',
    counterparty: 'Globex SE',
    reference: 'partial 0002'
  },
  {
    id: 'bsl-3',
    bookingDate: '2026-04-25T00:00:00.000Z',
    amount: 999,
    currency: 'EUR',
    counterparty: 'Unknown',
    reference: 'misc'
  }
]
