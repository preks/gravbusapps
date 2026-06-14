/**
 * Posting rules: translate invoice lifecycle events into balanced double-entry
 * ledger postings. Pure functions so they are fully testable.
 *
 * The ledger backend is never referenced directly; these builders produce a
 * NEWWORK-owned LedgerPostingRequest that the Ledger Service transports through
 * NEWWORK Connect / Anypoint / MCP.
 *
 * Posting reference / eventId are deterministic per (invoice, event) so retries
 * are idempotent and never double-post.
 */
import { DEFAULT_POSTING_ACCOUNTS, type PostingAccounts } from '../constants'
import { roundMoney } from './money'
import type { LedgerPostingEntry, LedgerPostingRequest } from '../queries/billingCoreApi'
import type { Invoice, PaymentAllocation } from '../types'

export interface PostingOptions {
  accounts?: PostingAccounts
  /** Accounting currency the postings are expressed in. Defaults to invoice value. */
  accountingCurrency?: string
  /** Rate to convert invoice amounts to accounting currency. Defaults to 1. */
  fxRate?: number
  postingDate?: string
}

/** Stable, idempotent event id used as the ledger posting reference. */
export function buildEventId(invoiceId: string, event: string, discriminator = ''): string {
  const suffix = discriminator ? `:${discriminator}` : ''
  return `nw-billing:${event}:${invoiceId}${suffix}`
}

function balanced(entries: LedgerPostingEntry[]): LedgerPostingEntry[] {
  return entries.filter(entry => (entry.debit ?? 0) !== 0 || (entry.credit ?? 0) !== 0)
}

function resolve(options?: PostingOptions): {
  accounts: PostingAccounts
  currency: (invoice: Invoice) => string
  rate: number
  date: string
} {
  return {
    accounts: options?.accounts ?? DEFAULT_POSTING_ACCOUNTS,
    currency: (invoice: Invoice) => options?.accountingCurrency ?? invoice.accountingCurrency ?? invoice.currency,
    rate: options?.fxRate ?? 1,
    date: options?.postingDate ?? new Date().toISOString()
  }
}

function invoicePostingMetaData(invoice: Invoice, extra?: Record<string, unknown>): Record<string, unknown> {
  const customerRef = invoice.crmAccountId ? `account:${invoice.crmAccountId}` : undefined

  return {
    source: 'newwork-billing',
    crmAccountId: invoice.crmAccountId ?? undefined,
    crmOpportunityId: invoice.crmOpportunityId ?? undefined,
    customerType: invoice.crmAccountId ? 'account' : undefined,
    customerRef,
    invoiceId: invoice.id,
    invoiceNumber: invoice.invoiceNumber ?? undefined,
    ...extra
  }
}

/** Issued: debit AR, credit revenue (per rate) and credit tax payable. */
export function buildIssuedPosting(invoice: Invoice, options?: PostingOptions): LedgerPostingRequest {
  const { accounts, currency, rate, date } = resolve(options)
  const acctCurrency = currency(invoice)
  const conv = (value: number) => roundMoney(value * rate, acctCurrency)

  const entries: LedgerPostingEntry[] = [
    {
      accountCode: accounts.accountsReceivable,
      debit: conv(invoice.totals.grossTotal),
      description: 'Accounts receivable'
    },
    { accountCode: accounts.revenue, credit: conv(invoice.totals.netTotal), description: 'Revenue' },
    { accountCode: accounts.taxPayable, credit: conv(invoice.totals.taxTotal), description: 'Output tax' }
  ]
  if (invoice.totals.roundingAdjustment !== 0) {
    const adj = conv(invoice.totals.roundingAdjustment)
    entries.push(
      adj > 0
        ? { accountCode: accounts.rounding, credit: adj, description: 'Rounding' }
        : { accountCode: accounts.rounding, debit: -adj, description: 'Rounding' }
    )
  }

  return {
    eventType: 'INVOICE_ISSUED',
    eventId: buildEventId(invoice.id, 'issued'),
    currency: acctCurrency,
    reference: invoice.invoiceNumber ?? invoice.id,
    postingDate: date,
    entries: balanced(entries),
    metaData: invoicePostingMetaData(invoice, { ledgerEventType: 'INVOICE_ISSUED' })
  }
}

/** Paid: debit cash/clearing, credit AR. FX difference posted separately. */
export function buildPaidPosting(
  invoice: Invoice,
  payment: PaymentAllocation,
  options?: PostingOptions
): LedgerPostingRequest {
  const { accounts, currency, rate, date } = resolve(options)
  const acctCurrency = currency(invoice)
  const amount = roundMoney(payment.amount * rate, acctCurrency)

  const entries: LedgerPostingEntry[] = [
    { accountCode: accounts.cashClearing, debit: amount, description: 'Cash/clearing' },
    { accountCode: accounts.accountsReceivable, credit: amount, description: 'Accounts receivable' }
  ]

  return {
    eventType: 'INVOICE_PAID',
    eventId: buildEventId(invoice.id, 'paid', payment.id),
    currency: acctCurrency,
    reference: payment.externalReference ?? invoice.invoiceNumber ?? invoice.id,
    postingDate: payment.paymentDate ?? date,
    entries: balanced(entries),
    metaData: invoicePostingMetaData(invoice, {
      ledgerEventType: 'INVOICE_PAID',
      paymentId: payment.id,
      paymentMethod: payment.method ?? undefined
    })
  }
}

/** Cancellation reverses the issued posting (credit AR, debit revenue + tax). */
export function buildCancelledPosting(invoice: Invoice, options?: PostingOptions): LedgerPostingRequest {
  const { accounts, currency, rate, date } = resolve(options)
  const acctCurrency = currency(invoice)
  const conv = (value: number) => roundMoney(value * rate, acctCurrency)

  const entries: LedgerPostingEntry[] = [
    { accountCode: accounts.revenue, debit: conv(invoice.totals.netTotal), description: 'Revenue reversal' },
    { accountCode: accounts.taxPayable, debit: conv(invoice.totals.taxTotal), description: 'Output tax reversal' },
    {
      accountCode: accounts.accountsReceivable,
      credit: conv(invoice.totals.grossTotal),
      description: 'Accounts receivable reversal'
    }
  ]

  return {
    eventType: 'INVOICE_CANCELLED',
    eventId: buildEventId(invoice.id, 'cancelled'),
    currency: acctCurrency,
    reference: invoice.invoiceNumber ?? invoice.id,
    postingDate: date,
    entries: balanced(entries),
    metaData: invoicePostingMetaData(invoice, { ledgerEventType: 'INVOICE_CANCELLED' })
  }
}

/** Credit note reverses revenue/tax/AR for the credited amounts. */
export function buildCreditNotePosting(
  invoice: Invoice,
  creditNet: number,
  creditTax: number,
  creditNoteId: string,
  options?: PostingOptions
): LedgerPostingRequest {
  const { accounts, currency, rate, date } = resolve(options)
  const acctCurrency = currency(invoice)
  const conv = (value: number) => roundMoney(value * rate, acctCurrency)
  const creditGross = creditNet + creditTax

  const entries: LedgerPostingEntry[] = [
    { accountCode: accounts.revenue, debit: conv(creditNet), description: 'Revenue credit' },
    { accountCode: accounts.taxPayable, debit: conv(creditTax), description: 'Output tax credit' },
    { accountCode: accounts.accountsReceivable, credit: conv(creditGross), description: 'Accounts receivable credit' }
  ]

  return {
    eventType: 'CREDIT_NOTE_ISSUED',
    eventId: buildEventId(invoice.id, 'credit', creditNoteId),
    currency: acctCurrency,
    reference: invoice.invoiceNumber ?? invoice.id,
    postingDate: date,
    entries: balanced(entries),
    metaData: invoicePostingMetaData(invoice, {
      ledgerEventType: 'CREDIT_NOTE_ISSUED',
      creditNoteId
    })
  }
}

/** Write-off: debit bad debt, credit AR for the outstanding amount. */
export function buildWriteOffPosting(
  invoice: Invoice,
  outstanding: number,
  options?: PostingOptions
): LedgerPostingRequest {
  const { accounts, currency, rate, date } = resolve(options)
  const acctCurrency = currency(invoice)
  const amount = roundMoney(outstanding * rate, acctCurrency)

  const entries: LedgerPostingEntry[] = [
    { accountCode: accounts.badDebt, debit: amount, description: 'Bad debt write-off' },
    { accountCode: accounts.accountsReceivable, credit: amount, description: 'Accounts receivable' }
  ]

  return {
    eventType: 'INVOICE_WRITTEN_OFF',
    eventId: buildEventId(invoice.id, 'writeoff'),
    currency: acctCurrency,
    reference: invoice.invoiceNumber ?? invoice.id,
    postingDate: date,
    entries: balanced(entries),
    metaData: invoicePostingMetaData(invoice, { ledgerEventType: 'INVOICE_WRITTEN_OFF' })
  }
}

/** FX gain/loss when settlement currency differs from accounting currency. */
export function buildFxDifferencePosting(
  invoice: Invoice,
  fxDelta: number,
  options?: PostingOptions
): LedgerPostingRequest | null {
  const { accounts, currency, date } = resolve(options)
  const acctCurrency = currency(invoice)
  const amount = roundMoney(fxDelta, acctCurrency)
  if (amount === 0) {
    return null
  }

  const entries: LedgerPostingEntry[] =
    amount > 0
      ? [
          { accountCode: accounts.accountsReceivable, debit: amount, description: 'FX adjustment' },
          { accountCode: accounts.fxGainLoss, credit: amount, description: 'FX gain' }
        ]
      : [
          { accountCode: accounts.fxGainLoss, debit: -amount, description: 'FX loss' },
          { accountCode: accounts.accountsReceivable, credit: -amount, description: 'FX adjustment' }
        ]

  return {
    eventType: 'FX_DIFFERENCE',
    eventId: buildEventId(invoice.id, 'fx', date),
    currency: acctCurrency,
    reference: invoice.invoiceNumber ?? invoice.id,
    postingDate: date,
    entries: balanced(entries),
    metaData: invoicePostingMetaData(invoice, { ledgerEventType: 'FX_DIFFERENCE' })
  }
}

/** Verify a posting is balanced (sum of debits equals sum of credits). */
export function isPostingBalanced(request: LedgerPostingRequest): boolean {
  const debit = request.entries.reduce((total, entry) => total + (entry.debit ?? 0), 0)
  const credit = request.entries.reduce((total, entry) => total + (entry.credit ?? 0), 0)
  return roundMoney(debit, request.currency) === roundMoney(credit, request.currency)
}
