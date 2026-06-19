import { billingApiEnabled } from '../network/invoiceClient'
import { calculateInvoice } from '../utils/invoiceCalculations'
import type { BillingSettings, InvoiceDraftInput } from '../../queries/billingCoreApi'
import type { Invoice } from '../types'

export interface BillingState {
  invoices: Invoice[]
  settings: BillingSettings
  loading: boolean
  error: string | null
  usingSampleData: boolean
}

export function nowIso(): string {
  return new Date().toISOString()
}

export function generateId(prefix: string): string {
  if (globalThis.crypto?.randomUUID) {
    return `${prefix}-${globalThis.crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now().toString(36)}`
}

export function assertBillingBackend(accessToken: string | undefined): asserts accessToken is string {
  if (!billingApiEnabled() || !accessToken) {
    throw new Error('Billing backend is not configured')
  }
}

function resolveDraftDueDate(draft: InvoiceDraftInput, settings: BillingSettings): string {
  if (draft.dueDate) return draft.dueDate

  const paymentTerm = settings.paymentTerms.find(term => term.id === draft.paymentTermId)
  const date = draft.issueDate ? new Date(draft.issueDate) : new Date()
  date.setDate(date.getDate() + (paymentTerm?.dueDays ?? 0))
  return date.toISOString()
}

export function buildDraftInvoice(draft: InvoiceDraftInput, settings: BillingSettings): Invoice {
  const legalEntity = settings.legalEntities.find(entity => entity.id === draft.legalEntityId)
  const { lines, totals } = calculateInvoice(
    draft.lines.map((line, index) => ({ id: `line-${index}`, ...line })),
    { currency: draft.currency, taxCategories: settings.taxCategories }
  )
  const timestamp = nowIso()
  return {
    id: generateId('inv'),
    invoiceNumber: null,
    status: 'DRAFT',
    legalEntityId: draft.legalEntityId,
    billingCustomerId: draft.billingCustomerId,
    customerName: draft.customerName ?? null,
    crmAccountId: draft.crmAccountId ?? null,
    crmOpportunityId: draft.crmOpportunityId ?? null,
    currency: draft.currency,
    accountingCurrency: legalEntity?.accountingCurrency ?? draft.currency,
    fxRate: null,
    issueDate: draft.issueDate ?? null,
    dueDate: resolveDraftDueDate(draft, settings),
    paymentTermId: draft.paymentTermId ?? null,
    lines,
    totals,
    paidAmount: 0,
    notes: draft.notes ?? null,
    locale: draft.locale ?? legalEntity?.defaultLocale ?? null,
    ledgerLinks: [],
    payments: [],
    audit: [{ id: generateId('aud'), action: 'created', timestamp, details: 'draft' }],
    createdAt: timestamp,
    updatedAt: timestamp
  }
}
