import { useCallback, useMemo } from 'react'
import {
  cancelInvoice as apiCancelInvoice,
  createInvoice as apiCreateInvoice,
  issueInvoice as apiIssueInvoice,
  recordInvoicePayment as apiRecordInvoicePayment,
  writeOffInvoice as apiWriteOffInvoice
} from '../network/invoiceClient'
import { assertTransition, derivePaymentStatus } from '../utils/invoiceStatus'
import { calculateOutstanding } from '../utils/invoiceCalculations'
import {
  buildCancelledPosting,
  buildIssuedPosting,
  buildPaidPosting,
  buildWriteOffPosting
} from '../../ledger/utils/ledgerPostings'
import type { BillingSettings, InvoiceDraftInput, LedgerService } from '../../queries/billingCoreApi'
import type { Invoice, InvoiceNumberSequence, PaymentAllocation } from '../types'
import { assertBillingBackend, buildDraftInvoice, generateId, nowIso } from './invoiceDataHelpers'

interface UseInvoiceLifecycleActionsParams {
  accessToken?: string
  invoices: Invoice[]
  settings: BillingSettings
  sequences: Record<string, InvoiceNumberSequence>
  ledger: LedgerService
  persistInvoice: (invoice: Invoice) => Promise<void>
  updateInvoice: (id: string, updater: (invoice: Invoice) => Invoice) => void
  addInvoice: (invoice: Invoice) => void
}

export function useInvoiceLifecycleActions({
  accessToken,
  invoices,
  settings,
  sequences,
  ledger,
  persistInvoice,
  updateInvoice,
  addInvoice
}: UseInvoiceLifecycleActionsParams) {
  const getSequence = useCallback(
    (legalEntityId: string): InvoiceNumberSequence => {
      return (
        sequences[legalEntityId] ?? {
          id: `seq-${legalEntityId}`,
          legalEntityId,
          prefix: 'INV',
          period: 'YEARLY',
          padding: 4,
          nextNumber: 1
        }
      )
    },
    [sequences]
  )

  const issueInvoice = useCallback(
    async (invoiceId: string) => {
      const invoice = invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertTransition(invoice.status, 'ISSUED')
      assertBillingBackend(accessToken)

      const sequence = getSequence(invoice.legalEntityId)
      const issueDate = new Date()
      const posting = buildIssuedPosting(
        { ...invoice, status: 'ISSUED', issueDate: issueDate.toISOString() },
        { fxRate: invoice.fxRate?.rate ?? 1 }
      )
      const response = await ledger.post(posting)

      let resolvedIssueDate = issueDate.toISOString()
      const updated = await apiIssueInvoice(accessToken, invoiceId, {
        idempotencyKey: posting.eventId,
        numberPrefix: sequence.prefix,
        numberPadding: sequence.padding,
        ledgerTransactionRef: response.ledgerTransactionRef
      })
      if (!updated?.invoiceNumber) {
        throw new Error('The backend did not return an invoice number')
      }
      const invoiceNumber = updated.invoiceNumber
      resolvedIssueDate = updated.issueDate ?? resolvedIssueDate

      const final: Invoice = {
        ...invoice,
        status: 'ISSUED',
        invoiceNumber,
        issueDate: resolvedIssueDate,
        updatedAt: nowIso(),
        ledgerLinks: [
          ...invoice.ledgerLinks,
          {
            eventType: 'INVOICE_ISSUED',
            eventId: posting.eventId,
            ledgerTransactionRef: response.ledgerTransactionRef,
            postedAt: response.postedAt
          }
        ],
        audit: [
          ...invoice.audit,
          { id: generateId('aud'), action: 'issued', timestamp: nowIso(), details: invoiceNumber }
        ]
      }
      updateInvoice(invoiceId, () => final)
      await persistInvoice(final)
      return invoiceNumber
    },
    [invoices, getSequence, ledger, updateInvoice, persistInvoice, accessToken]
  )

  const cancelInvoice = useCallback(
    async (invoiceId: string, reason: string) => {
      const invoice = invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertTransition(invoice.status, 'CANCELLED')
      assertBillingBackend(accessToken)

      let ref: string | undefined
      if (invoice.status !== 'DRAFT') {
        const posting = buildCancelledPosting(invoice, { fxRate: invoice.fxRate?.rate ?? 1 })
        const response = await ledger.post(posting)
        ref = response.ledgerTransactionRef
      }
      await apiCancelInvoice(accessToken, invoiceId, {
        idempotencyKey: `cancel:${invoiceId}`,
        reason,
        ledgerTransactionRef: ref
      })
      const final: Invoice = {
        ...invoice,
        status: 'CANCELLED',
        updatedAt: nowIso(),
        ledgerLinks: ref
          ? [
              ...invoice.ledgerLinks,
              {
                eventType: 'INVOICE_CANCELLED',
                eventId: `nw-billing:cancelled:${invoiceId}`,
                ledgerTransactionRef: ref,
                postedAt: nowIso()
              }
            ]
          : invoice.ledgerLinks,
        audit: [...invoice.audit, { id: generateId('aud'), action: 'cancelled', timestamp: nowIso(), details: reason }]
      }
      updateInvoice(invoiceId, () => final)
      await persistInvoice(final)
    },
    [invoices, ledger, updateInvoice, persistInvoice, accessToken]
  )

  const recordPayment = useCallback(
    async (invoiceId: string, input: Omit<PaymentAllocation, 'id' | 'invoiceId' | 'ledgerTransactionRef'>) => {
      const invoice = invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertBillingBackend(accessToken)

      const payment: PaymentAllocation = { ...input, id: generateId('pay'), invoiceId }
      const posting = buildPaidPosting(invoice, payment, { fxRate: invoice.fxRate?.rate ?? 1 })
      const response = await ledger.post(posting)
      payment.ledgerTransactionRef = response.ledgerTransactionRef

      await apiRecordInvoicePayment(accessToken, invoiceId, {
        idempotencyKey: posting.eventId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        reference: payment.externalReference ?? undefined,
        ledgerTransactionRef: response.ledgerTransactionRef,
        paidAt: payment.paymentDate
      })

      const paidAmount = invoice.paidAmount + payment.amount
      const withPayment: Invoice = {
        ...invoice,
        paidAmount,
        payments: [...invoice.payments, payment],
        ledgerLinks: [
          ...invoice.ledgerLinks,
          {
            eventType: 'INVOICE_PAID',
            eventId: posting.eventId,
            ledgerTransactionRef: response.ledgerTransactionRef,
            postedAt: response.postedAt
          }
        ],
        audit: [
          ...invoice.audit,
          {
            id: generateId('aud'),
            action: 'payment',
            timestamp: nowIso(),
            details: `${payment.amount} ${payment.currency}`
          }
        ],
        updatedAt: nowIso()
      }
      const final: Invoice = { ...withPayment, status: derivePaymentStatus(withPayment) }
      updateInvoice(invoiceId, () => final)
      await persistInvoice(final)
      return payment
    },
    [invoices, ledger, updateInvoice, persistInvoice, accessToken]
  )

  const writeOffInvoice = useCallback(
    async (invoiceId: string) => {
      const invoice = invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertTransition(invoice.status, 'WRITTEN_OFF')
      assertBillingBackend(accessToken)
      const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)
      const posting = buildWriteOffPosting(invoice, outstanding, { fxRate: invoice.fxRate?.rate ?? 1 })
      const response = await ledger.post(posting)
      await apiWriteOffInvoice(accessToken, invoiceId, {
        idempotencyKey: `writeoff:${invoiceId}`,
        ledgerTransactionRef: response.ledgerTransactionRef
      })
      const final: Invoice = {
        ...invoice,
        status: 'WRITTEN_OFF',
        updatedAt: nowIso(),
        ledgerLinks: [
          ...invoice.ledgerLinks,
          {
            eventType: 'INVOICE_WRITTEN_OFF',
            eventId: posting.eventId,
            ledgerTransactionRef: response.ledgerTransactionRef,
            postedAt: response.postedAt
          }
        ],
        audit: [...invoice.audit, { id: generateId('aud'), action: 'written_off', timestamp: nowIso() }]
      }
      updateInvoice(invoiceId, () => final)
      await persistInvoice(final)
    },
    [invoices, ledger, updateInvoice, persistInvoice, accessToken]
  )

  const createInvoice = useCallback(
    async (draft: InvoiceDraftInput): Promise<Invoice> => {
      assertBillingBackend(accessToken)
      const invoice = buildDraftInvoice(draft, settings)
      await apiCreateInvoice(accessToken, invoice)
      addInvoice(invoice)
      return invoice
    },
    [settings, accessToken, addInvoice]
  )

  return useMemo(
    () => ({
      createInvoice,
      issueInvoice,
      cancelInvoice,
      recordPayment,
      writeOffInvoice
    }),
    [createInvoice, issueInvoice, cancelInvoice, recordPayment, writeOffInvoice]
  )
}
