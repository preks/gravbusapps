import { useCallback, useMemo } from 'react'
import {
  cancelInvoice as apiCancelInvoice,
  createInvoice as apiCreateInvoice,
  issueInvoice as apiIssueInvoice,
  recordInvoicePayment as apiRecordInvoicePayment,
  writeOffInvoice as apiWriteOffInvoice
} from '../network/invoiceClient'
import { assertTransition, derivePaymentStatus } from '../utils/invoiceStatus'
import { buildEventId } from '../../ledger/utils/ledgerPostings'
import type { BillingSettings, InvoiceDraftInput } from '../../queries/billingCoreApi'
import type { Invoice, InvoiceNumberSequence, PaymentAllocation, RecordPaymentInput } from '../types'
import { assertBillingBackend, buildDraftInvoice, generateId, nowIso } from './invoiceDataHelpers'

interface UseInvoiceLifecycleActionsParams {
  accessToken?: string
  actorId?: string
  invoices: Invoice[]
  settings: BillingSettings
  sequences: Record<string, InvoiceNumberSequence>
  persistInvoice: (invoice: Invoice) => Promise<void>
  updateInvoice: (id: string, updater: (invoice: Invoice) => Invoice) => void
  addInvoice: (invoice: Invoice) => void
}

interface CancelInvoiceInput {
  reason: string
  idempotencyKey?: string
  ledgerTransactionRef?: string
}

interface WriteOffInvoiceInput {
  reason: string
  idempotencyKey?: string
  ledgerTransactionRef?: string
}

export function useInvoiceLifecycleActions({
  accessToken,
  actorId,
  invoices,
  settings,
  sequences,
  persistInvoice,
  updateInvoice,
  addInvoice
}: UseInvoiceLifecycleActionsParams) {
  const buildPaymentIdempotencyKey = useCallback((invoiceId: string, payment: RecordPaymentInput): string => {
    if (payment.ledgerTransactionRef) return `invoice-payment-${invoiceId}-${payment.ledgerTransactionRef}`
    if (payment.externalReference) return `invoice-payment-${invoiceId}-${payment.externalReference}`
    return `invoice-payment-${invoiceId}-${payment.paymentDate}-${payment.amount}-${payment.method}`
  }, [])

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
      const isCreditNote = invoice.documentType === 'CREDIT_NOTE'
      const issueDate = new Date()
      const idempotencyKey = isCreditNote ? `issue-credit-note-${invoice.id}` : buildEventId(invoice.id, 'issued')

      let resolvedIssueDate = issueDate.toISOString()
      const updated = await apiIssueInvoice(accessToken, invoiceId, {
        idempotencyKey,
        actorId,
        numberPrefix: isCreditNote ? 'CN' : sequence.prefix,
        numberPadding: sequence.padding
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
        ledgerLinks: updated.ledgerLinks ?? invoice.ledgerLinks,
        audit: [
          ...invoice.audit,
          { id: generateId('aud'), action: 'issued', timestamp: nowIso(), details: invoiceNumber }
        ]
      }
      updateInvoice(invoiceId, () => final)
      await persistInvoice(final)
      return invoiceNumber
    },
    [invoices, getSequence, updateInvoice, persistInvoice, accessToken, actorId]
  )

  const cancelInvoice = useCallback(
    async (invoiceId: string, input: string | CancelInvoiceInput) => {
      const invoice = invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertTransition(invoice.status, 'CANCELLED')
      assertBillingBackend(accessToken)

      const cancellation = typeof input === 'string' ? { reason: input } : input
      const updated = await apiCancelInvoice(accessToken, invoiceId, {
        idempotencyKey: cancellation.idempotencyKey ?? `cancel-${invoiceId}`,
        actorId,
        reason: cancellation.reason,
        ...(cancellation.ledgerTransactionRef ? { ledgerTransactionRef: cancellation.ledgerTransactionRef } : {})
      })

      if (updated) {
        updateInvoice(invoiceId, () => updated)
        return
      }

      const final: Invoice = {
        ...invoice,
        status: 'CANCELLED',
        updatedAt: nowIso(),
        audit: [
          ...invoice.audit,
          { id: generateId('aud'), action: 'cancelled', timestamp: nowIso(), details: cancellation.reason }
        ]
      }
      updateInvoice(invoiceId, () => final)
      await persistInvoice(final)
    },
    [invoices, updateInvoice, persistInvoice, accessToken, actorId]
  )

  const recordPayment = useCallback(
    async (invoiceId: string, input: RecordPaymentInput) => {
      const invoice = invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertBillingBackend(accessToken)

      const payment: PaymentAllocation = { ...input, id: generateId('pay'), invoiceId }
      const idempotencyKey = buildPaymentIdempotencyKey(invoice.id, input)

      const updated = await apiRecordInvoicePayment(accessToken, invoiceId, {
        idempotencyKey,
        actorId,
        amount: payment.amount,
        currency: payment.currency,
        method: payment.method,
        reference: payment.externalReference ?? undefined,
        ledgerTransactionRef: payment.ledgerTransactionRef ?? undefined,
        paidAt: payment.paymentDate
      })

      if (updated) {
        updateInvoice(invoiceId, () => updated)
        return payment
      }

      const paidAmount = invoice.paidAmount + payment.amount
      const withPayment: Invoice = {
        ...invoice,
        paidAmount,
        payments: [...invoice.payments, payment],
        ledgerLinks: payment.ledgerTransactionRef
          ? [
              ...invoice.ledgerLinks,
              {
                eventType: 'INVOICE_PAID',
                eventId: idempotencyKey,
                ledgerTransactionRef: payment.ledgerTransactionRef,
                postedAt: payment.paymentDate
              }
            ]
          : invoice.ledgerLinks,
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
    [invoices, updateInvoice, persistInvoice, accessToken, actorId, buildPaymentIdempotencyKey]
  )

  const writeOffInvoice = useCallback(
    async (invoiceId: string, input?: WriteOffInvoiceInput) => {
      const invoice = invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertTransition(invoice.status, 'WRITTEN_OFF')
      assertBillingBackend(accessToken)

      const updated = await apiWriteOffInvoice(accessToken, invoiceId, {
        idempotencyKey: input?.idempotencyKey ?? `writeoff-${invoiceId}`,
        actorId,
        reason: input?.reason,
        ...(input?.ledgerTransactionRef ? { ledgerTransactionRef: input.ledgerTransactionRef } : {})
      })

      if (updated) {
        updateInvoice(invoiceId, () => updated)
        return
      }

      const final: Invoice = {
        ...invoice,
        status: 'WRITTEN_OFF',
        updatedAt: nowIso(),
        audit: [
          ...invoice.audit,
          { id: generateId('aud'), action: 'written_off', timestamp: nowIso(), details: input?.reason }
        ]
      }
      updateInvoice(invoiceId, () => final)
      await persistInvoice(final)
    },
    [invoices, updateInvoice, persistInvoice, accessToken, actorId]
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
