/**
 * Billing data + lifecycle actions for the Finance Billing screens.
 *
 * Owns invoice and settings state, posting through the Ledger Service for
 * issued/paid/cancelled/written-off events. Invoices are persisted in the
 * native BLNK invoices domain (the only finance backend) via the invoice
 * client, so every screen shares real data. Falls back to sample data when the
 * ledger lane is unavailable so the UI stays usable in local dev.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { type BillingSettings } from '../queries/billingCoreApi'
import { SAMPLE_INVOICES, SAMPLE_SETTINGS } from '../data/sampleBillingData'
import {
  billingApiEnabled,
  cancelInvoice as apiCancelInvoice,
  createInvoice as apiCreateInvoice,
  issueInvoice as apiIssueInvoice,
  listInvoices,
  recordInvoicePayment as apiRecordInvoicePayment,
  updateInvoice as apiUpdateInvoice,
  writeOffInvoice as apiWriteOffInvoice
} from '../network/invoiceClient'
import { getFinanceSettings } from '../network/financeAdminClient'
import { useLedgerService } from './useLedgerService'
import { assertTransition, derivePaymentStatus } from '../utils/invoiceStatus'
import { calculateInvoice, calculateOutstanding } from '../utils/invoiceCalculations'
import { formatNextInvoiceNumber } from '../utils/invoiceNumbering'
import {
  buildCancelledPosting,
  buildIssuedPosting,
  buildPaidPosting,
  buildWriteOffPosting
} from '../utils/ledgerPostings'
import type { InvoiceDraftInput } from '../queries/billingCoreApi'
import type { Invoice, InvoiceNumberSequence, PaymentAllocation } from '../types'

interface BillingState {
  invoices: Invoice[]
  settings: BillingSettings
  loading: boolean
  error: string | null
  usingSampleData: boolean
}

function nowIso(): string {
  return new Date().toISOString()
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function useBillingData(context: BusinessAppContextProps) {
  const ledger = useLedgerService(context)
  const [state, setState] = useState<BillingState>({
    invoices: [],
    settings: SAMPLE_SETTINGS,
    loading: true,
    error: null,
    usingSampleData: false
  })
  // Per-legal-entity numbering sequence (server-owned in production).
  const [sequences, setSequences] = useState<Record<string, InvoiceNumberSequence>>({})

  const refresh = useCallback(async () => {
    if (!context.accessToken) {
      return
    }
    if (!billingApiEnabled()) {
      // No ledger lane on this environment: use sample data without a network call.
      setState({
        invoices: SAMPLE_INVOICES,
        settings: SAMPLE_SETTINGS,
        loading: false,
        error: null,
        usingSampleData: true
      })
      return
    }
    try {
      const invoices = await listInvoices(context.accessToken)
      // Settings come from the authoritative BLNK finance settings document.
      // Defaults are only used as initial values until the backend is seeded;
      // they are NEWWORK configuration defaults, never invoice sample data.
      let settings: BillingSettings = SAMPLE_SETTINGS
      try {
        const document = await getFinanceSettings(context.accessToken)
        if (document) settings = document
      } catch {
        // Settings document unavailable: keep config defaults for this load.
      }
      setState({ invoices, settings, loading: false, error: null, usingSampleData: false })
    } catch (err) {
      // Ledger reachable lane configured but the call failed: fall back to
      // sample data for previews, but keep the message so the UI can surface it.
      const message = err instanceof Error ? err.message : 'Unknown error reaching the ledger backend'
      setState({
        invoices: SAMPLE_INVOICES,
        settings: SAMPLE_SETTINGS,
        loading: false,
        error: message,
        usingSampleData: true
      })
    }
  }, [context.accessToken])

  useEffect(() => {
    refresh()
  }, [refresh])

  // Best-effort persistence of an invoice snapshot to the ledger document store.
  // Lifecycle/UI state is updated optimistically; a failed persist is logged but
  // never blocks the interaction (the next load reconciles from the ledger).
  const persistInvoice = useCallback(
    async (invoice: Invoice) => {
      if (!billingApiEnabled() || !context.accessToken) return
      try {
        await apiUpdateInvoice(context.accessToken, invoice)
      } catch (err) {
        console.error('Failed to persist invoice to ledger:', err instanceof Error ? err.message : 'unknown error')
      }
    },
    [context.accessToken]
  )

  const updateInvoice = useCallback((id: string, updater: (invoice: Invoice) => Invoice) => {
    setState(prev => ({
      ...prev,
      invoices: prev.invoices.map(invoice => (invoice.id === id ? updater(invoice) : invoice))
    }))
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
      const invoice = state.invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertTransition(invoice.status, 'ISSUED')

      const sequence = getSequence(invoice.legalEntityId)
      const issueDate = new Date()
      const serverMode = billingApiEnabled() && !!context.accessToken && !state.usingSampleData

      // Post the double-entry ledger transaction first (idempotent by eventId).
      const posting = buildIssuedPosting(
        { ...invoice, status: 'ISSUED', issueDate: issueDate.toISOString() },
        { fxRate: invoice.fxRate?.rate ?? 1 }
      )
      const response = await ledger.post(posting)

      // Server-owned path: BLNK assigns the authoritative, gap-free number.
      let invoiceNumber: string
      let resolvedIssueDate = issueDate.toISOString()
      if (serverMode) {
        const updated = await apiIssueInvoice(context.accessToken!, invoiceId, {
          idempotencyKey: posting.eventId,
          numberPrefix: sequence.prefix,
          numberPadding: sequence.padding,
          ledgerTransactionRef: response.ledgerTransactionRef
        })
        if (!updated?.invoiceNumber) {
          throw new Error('The backend did not return an invoice number')
        }
        invoiceNumber = updated.invoiceNumber
        resolvedIssueDate = updated.issueDate ?? resolvedIssueDate
      } else {
        // Local/sample path: client-side numbering sequence.
        const next = formatNextInvoiceNumber(sequence, issueDate)
        invoiceNumber = next.invoiceNumber
        setSequences(prev => ({ ...prev, [invoice.legalEntityId]: next.nextSequence }))
      }

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
    [state.invoices, state.usingSampleData, getSequence, ledger, updateInvoice, persistInvoice, context.accessToken]
  )

  const cancelInvoice = useCallback(
    async (invoiceId: string, reason: string) => {
      const invoice = state.invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertTransition(invoice.status, 'CANCELLED')

      const serverMode = billingApiEnabled() && !!context.accessToken && !state.usingSampleData
      let ref: string | undefined
      if (invoice.status !== 'DRAFT') {
        const posting = buildCancelledPosting(invoice, { fxRate: invoice.fxRate?.rate ?? 1 })
        const response = await ledger.post(posting)
        ref = response.ledgerTransactionRef
      }
      if (serverMode) {
        await apiCancelInvoice(context.accessToken!, invoiceId, {
          idempotencyKey: `cancel:${invoiceId}`,
          reason,
          ledgerTransactionRef: ref
        })
      }
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
    [state.invoices, state.usingSampleData, ledger, updateInvoice, persistInvoice, context.accessToken]
  )

  const recordPayment = useCallback(
    async (invoiceId: string, input: Omit<PaymentAllocation, 'id' | 'invoiceId' | 'ledgerTransactionRef'>) => {
      const invoice = state.invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')

      const serverMode = billingApiEnabled() && !!context.accessToken && !state.usingSampleData
      const payment: PaymentAllocation = { ...input, id: generateId('pay'), invoiceId }
      const posting = buildPaidPosting(invoice, payment, { fxRate: invoice.fxRate?.rate ?? 1 })
      const response = await ledger.post(posting)
      payment.ledgerTransactionRef = response.ledgerTransactionRef

      if (serverMode) {
        await apiRecordInvoicePayment(context.accessToken!, invoiceId, {
          idempotencyKey: posting.eventId,
          amount: payment.amount,
          currency: payment.currency,
          method: payment.method,
          reference: payment.externalReference ?? undefined,
          ledgerTransactionRef: response.ledgerTransactionRef,
          paidAt: payment.paymentDate
        })
      }

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
    [state.invoices, state.usingSampleData, ledger, updateInvoice, persistInvoice, context.accessToken]
  )

  const writeOffInvoice = useCallback(
    async (invoiceId: string) => {
      const invoice = state.invoices.find(item => item.id === invoiceId)
      if (!invoice) throw new Error('Invoice not found')
      assertTransition(invoice.status, 'WRITTEN_OFF')
      const serverMode = billingApiEnabled() && !!context.accessToken && !state.usingSampleData
      const outstanding = calculateOutstanding(invoice.totals.grossTotal, invoice.paidAmount)
      const posting = buildWriteOffPosting(invoice, outstanding, { fxRate: invoice.fxRate?.rate ?? 1 })
      const response = await ledger.post(posting)
      if (serverMode) {
        await apiWriteOffInvoice(context.accessToken!, invoiceId, {
          idempotencyKey: `writeoff:${invoiceId}`,
          ledgerTransactionRef: response.ledgerTransactionRef
        })
      }
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
    [state.invoices, state.usingSampleData, ledger, updateInvoice, persistInvoice, context.accessToken]
  )

  const createInvoice = useCallback(
    async (draft: InvoiceDraftInput): Promise<Invoice> => {
      const legalEntity = state.settings.legalEntities.find(entity => entity.id === draft.legalEntityId)
      const { lines, totals } = calculateInvoice(
        draft.lines.map((line, index) => ({ id: `line-${index}`, ...line })),
        { currency: draft.currency, taxCategories: state.settings.taxCategories }
      )
      const timestamp = nowIso()
      const invoice: Invoice = {
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
        dueDate: null,
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
      // Persist first so form-level errors surface; reconcile state on success.
      if (billingApiEnabled() && context.accessToken) {
        await apiCreateInvoice(context.accessToken, invoice)
      }
      setState(prev => ({ ...prev, invoices: [invoice, ...prev.invoices] }))
      return invoice
    },
    [state.settings, context.accessToken]
  )

  return useMemo(
    () => ({
      ...state,
      createInvoice,
      issueInvoice,
      cancelInvoice,
      recordPayment,
      writeOffInvoice,
      refresh
    }),
    [state, createInvoice, issueInvoice, cancelInvoice, recordPayment, writeOffInvoice, refresh]
  )
}
