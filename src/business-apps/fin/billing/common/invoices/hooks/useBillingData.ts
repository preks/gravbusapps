/**
 * Billing data + lifecycle actions for the Finance Billing screens.
 *
 * Owns invoice and settings state, posting through the Ledger Service for
 * issued/paid/cancelled/written-off events. Invoices are persisted in the
 * native BLNK invoices domain (the only finance backend) via the invoice
 * client, so every screen shares real data. Backend failures surface as errors
 * with empty data instead of falling back to demo records.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { type BillingSettings } from '../../queries/billingCoreApi'
import { SAMPLE_SETTINGS } from '../../data/sampleBillingData'
import { billingApiEnabled, listInvoices, updateInvoice as apiUpdateInvoice } from '../network/invoiceClient'
import { getFinanceSettings } from '../../settings/network/financeSettingsClient'
import type { Invoice, InvoiceNumberSequence } from '../types'
import { type BillingState } from './invoiceDataHelpers'
import { useInvoiceLifecycleActions } from './useInvoiceLifecycleActions'

export function useBillingData(context: BusinessAppContextProps) {
  const [state, setState] = useState<BillingState>({
    invoices: [],
    settings: SAMPLE_SETTINGS,
    loading: true,
    error: null,
    usingSampleData: false
  })
  // Per-legal-entity numbering sequence (server-owned in production).
  const [sequences] = useState<Record<string, InvoiceNumberSequence>>({})

  const refresh = useCallback(async () => {
    if (!context.accessToken) {
      setState({
        invoices: [],
        settings: SAMPLE_SETTINGS,
        loading: false,
        error: 'Billing backend requires a valid access token',
        usingSampleData: false
      })
      return
    }
    if (!billingApiEnabled()) {
      setState({
        invoices: [],
        settings: SAMPLE_SETTINGS,
        loading: false,
        error: 'Billing backend is not configured',
        usingSampleData: false
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
      const message = err instanceof Error ? err.message : 'Unknown error reaching the ledger backend'
      setState({
        invoices: [],
        settings: SAMPLE_SETTINGS,
        loading: false,
        error: message,
        usingSampleData: false
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

  const addInvoice = useCallback((invoice: Invoice) => {
    setState(prev => ({ ...prev, invoices: [invoice, ...prev.invoices] }))
  }, [])

  const { createInvoice, issueInvoice, cancelInvoice, recordPayment, writeOffInvoice } = useInvoiceLifecycleActions({
    accessToken: context.accessToken,
    actorId: context.userInfo?.id,
    invoices: state.invoices,
    settings: state.settings,
    sequences,
    persistInvoice,
    updateInvoice,
    addInvoice
  })

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
