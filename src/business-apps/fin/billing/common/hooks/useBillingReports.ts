/**
 * Server-backed finance reports (revenue + VAT).
 *
 * AR aging is still derived client-side from the (server-sourced) invoice list,
 * but revenue and VAT summaries are computed by BLNK across all invoices so the
 * numbers do not depend on what is currently loaded in the browser.
 */
import { useCallback, useEffect, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  fetchRevenue,
  fetchVat,
  financeAdminEnabled,
  type ReportFilter,
  type RevenueRow,
  type VatRow
} from '../network/financeAdminClient'

interface ReportsState {
  revenue: RevenueRow[]
  vat: VatRow[]
  loading: boolean
  available: boolean
  error: string | null
}

export function useBillingReports(context: BusinessAppContextProps, filter?: ReportFilter) {
  const [state, setState] = useState<ReportsState>({
    revenue: [],
    vat: [],
    loading: true,
    available: false,
    error: null
  })

  const legalEntityId = filter?.legalEntityId
  const currency = filter?.currency

  const load = useCallback(async () => {
    if (!context.accessToken || !financeAdminEnabled()) {
      setState({ revenue: [], vat: [], loading: false, available: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true }))
    try {
      const [revenue, vat] = await Promise.all([
        fetchRevenue(context.accessToken, { legalEntityId, currency }),
        fetchVat(context.accessToken, { legalEntityId, currency })
      ])
      setState({ revenue, vat, loading: false, available: true, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reports'
      setState({ revenue: [], vat: [], loading: false, available: false, error: message })
    }
  }, [context.accessToken, legalEntityId, currency])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refresh: load }
}
