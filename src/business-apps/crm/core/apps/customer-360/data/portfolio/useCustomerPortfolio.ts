/**
 * useCustomerPortfolio — builds the CRM customer account book of business with
 * per-customer attention scoring.
 *
 * This is the data layer behind the Customer360 Home product (cockpit and
 * explorer). Health summaries are provisional (derived
 * from real CRM fields) until the `customer-summary-list` backend lands; the
 * `provisional` flag is surfaced so the UI can disclose it.
 */

import { useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import { computeAttention } from './computeAttention'
import { getPrimaryEmail, getPrimaryPhone } from './communicationChannels'
import { deriveProvisionalSummary } from './deriveSummary'
import {
  ATTENTION_THRESHOLD,
  type CustomerPortfolioRow,
  type CustomerPortfolioStats,
  type UseCustomerPortfolioResult
} from './types'

/** Server page size. The hooks paginate; we auto-load every page below. */
const PORTFOLIO_PAGE_SIZE = 200

function getOwnerName(account: CustomerAccount): string | undefined {
  const owner = account.ownerEmployee
  if (!owner) return undefined
  if (owner.displayName) return owner.displayName
  const joined = [owner.firstName, owner.lastName].filter(Boolean).join(' ').trim()
  return joined || undefined
}

function toAccountRow(account: CustomerAccount): CustomerPortfolioRow | null {
  if (!account.id || account.prospective) return null
  const status = 'active'
  const summary = deriveProvisionalSummary({ ownerId: account.ownerEmployeeId })
  const { score, reasons } = computeAttention({ summary, ownerId: account.ownerEmployeeId })
  return {
    id: account.id,
    type: 'account',
    displayName: account.name || 'Unknown account',
    secondary: account.website || undefined,
    email: getPrimaryEmail(account.communicationChannels),
    phone: getPrimaryPhone(account.communicationChannels),
    ownerId: account.ownerEmployeeId,
    ownerName: getOwnerName(account),
    ownerPictureThumbnail: account.ownerEmployee?.pictureThumbnail,
    status,
    summary,
    attentionScore: score,
    attentionReasons: reasons
  }
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function buildStats(rows: CustomerPortfolioRow[], accountTotal: number): CustomerPortfolioStats {
  const csatValues = rows.map(row => row.summary.csat).filter((value): value is number => typeof value === 'number')
  const overdueTotal = rows.reduce((sum, row) => sum + (row.summary.overdueAmount ?? 0), 0)
  const openTickets = rows.reduce((sum, row) => sum + (row.summary.openTickets ?? 0), 0)
  return {
    totalCustomers: accountTotal,
    totalAccounts: accountTotal,
    needsAttention: rows.filter(row => row.attentionScore >= ATTENTION_THRESHOLD).length,
    unassigned: rows.filter(row => !row.ownerId).length,
    avgCsat: average(csatValues),
    openTickets: openTickets > 0 ? openTickets : undefined,
    overdueTotal: overdueTotal > 0 ? overdueTotal : undefined,
    currency: rows.find(row => row.summary.currency)?.summary.currency,
    provisional: rows.some(row => row.summary.provisional)
  }
}

export function useCustomerPortfolio(context: BusinessAppContextProps): UseCustomerPortfolioResult {
  const accountsResult = useCustomerAccountsList(context, { limit: PORTFOLIO_PAGE_SIZE, prospective: false })

  // Auto-load every page so the portfolio reflects the whole book of business,
  // not just the first page. The list hooks accumulate results and flip
  // `hasMore` to false once a short page is returned, so this terminates.
  const { hasMore: accountsHasMore, loading: accountsLoading, loadMore: loadMoreAccounts } = accountsResult

  useEffect(() => {
    if (accountsHasMore && !accountsLoading) loadMoreAccounts()
  }, [accountsHasMore, accountsLoading, loadMoreAccounts])

  const rows = useMemo<CustomerPortfolioRow[]>(() => {
    return accountsResult.accounts
      .map(toAccountRow)
      .filter((row): row is CustomerPortfolioRow => row !== null)
      .sort((a, b) => b.attentionScore - a.attentionScore)
  }, [accountsResult.accounts])

  const stats = useMemo<CustomerPortfolioStats>(
    () => buildStats(rows, accountsResult.total),
    [rows, accountsResult.total]
  )

  const refetch = useCallback(() => {
    void accountsResult.refetch()
  }, [accountsResult])

  return {
    rows,
    stats,
    loading: accountsResult.loading,
    error: accountsResult.error,
    refetch,
    provisional: rows.length === 0 ? true : rows.some(row => row.summary.provisional)
  }
}
