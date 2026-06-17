/**
 * Server-backed finance reports.
 *
 * AR aging, revenue, and VAT summaries are computed by BLNK across all invoices
 * so the numbers do not depend on what is currently loaded in the browser.
 */
import { useCallback, useEffect, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  fetchArAging,
  fetchRevenue,
  fetchVat,
  type ArAgingBucket,
  type ReportFilter,
  type RevenueRow,
  type VatRow
} from '../../reports/network/financeReportsClient'
import { financeAdminEnabled } from '../../network/financeHealthClient'
import type { AgingBucket, AgingBucketKey } from '../utils/arAging'

interface ReportsState {
  arAging: AgingBucket[]
  revenue: RevenueRow[]
  vat: VatRow[]
  loading: boolean
  available: boolean
  error: string | null
}

export function useBillingReports(context: BusinessAppContextProps, filter?: ReportFilter) {
  const [state, setState] = useState<ReportsState>({
    revenue: [],
    arAging: [],
    vat: [],
    loading: true,
    available: false,
    error: null
  })

  const legalEntityId = filter?.legalEntityId
  const currency = filter?.currency

  const load = useCallback(async () => {
    if (!context.accessToken || !financeAdminEnabled()) {
      setState({ arAging: [], revenue: [], vat: [], loading: false, available: false, error: null })
      return
    }
    setState(prev => ({ ...prev, loading: true }))
    try {
      const [arAgingRows, revenue, vat] = await Promise.all([
        fetchArAging(context.accessToken, { legalEntityId, currency }),
        fetchRevenue(context.accessToken, { legalEntityId, currency }),
        fetchVat(context.accessToken, { legalEntityId, currency })
      ])
      setState({
        arAging: toAgingBuckets(arAgingRows),
        revenue,
        vat,
        loading: false,
        available: true,
        error: null
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load reports'
      setState({ arAging: [], revenue: [], vat: [], loading: false, available: false, error: message })
    }
  }, [context.accessToken, legalEntityId, currency])

  useEffect(() => {
    load()
  }, [load])

  return { ...state, refresh: load }
}

const AGING_LABELS: Record<AgingBucketKey, string> = {
  current: 'Not yet due',
  days1_30: '1-30 days',
  days31_60: '31-60 days',
  days61_90: '61-90 days',
  days90Plus: '90+ days'
}

function toAgingBuckets(rows: ArAgingBucket[]): AgingBucket[] {
  const totals: Record<AgingBucketKey, number> = {
    current: 0,
    days1_30: 0,
    days31_60: 0,
    days61_90: 0,
    days90Plus: 0
  }

  rows.forEach(row => {
    totals.current += row.current
    totals.days1_30 += row.days1To30
    totals.days31_60 += row.days31To60
    totals.days61_90 += row.days61To90
    totals.days90Plus += row.days90Plus
  })

  return (Object.keys(totals) as AgingBucketKey[]).map(key => ({
    key,
    label: AGING_LABELS[key],
    amount: totals[key],
    count: 0
  }))
}
