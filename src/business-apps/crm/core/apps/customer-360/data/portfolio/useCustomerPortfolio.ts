/**
 * useCustomerPortfolio — unifies CRM Accounts + Contacts into a single
 * book-of-business view with per-customer attention scoring.
 *
 * This is the data layer behind the Customer360 Home product (cockpit,
 * attention worklist, explorer). Health summaries are provisional (derived
 * from real CRM fields) until the `customer-summary-list` backend lands; the
 * `provisional` flag is surfaced so the UI can disclose it.
 */

import { useCallback, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerAccountsList } from '@/common/data/customer/hooks/useCustomerAccounts'
import { useCustomerContactsList } from '@/common/data/customer/hooks/useCustomerContacts'
import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import { computeAttention } from './computeAttention'
import { getPrimaryEmail, getPrimaryPhone } from './contactChannels'
import { deriveProvisionalSummary } from './deriveSummary'
import {
  ATTENTION_THRESHOLD,
  type CustomerPortfolioRow,
  type CustomerPortfolioStats,
  type UseCustomerPortfolioResult
} from './types'

/** Server page size. The hooks paginate; we auto-load every page below. */
const PORTFOLIO_PAGE_SIZE = 200

function buildContactName(contact: CustomerContact): string {
  if (contact.fullName) return contact.fullName
  const joined = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim()
  return joined || 'Unknown contact'
}

function toAccountRow(account: CustomerAccount): CustomerPortfolioRow | null {
  if (!account.id) return null
  const status = account.prospective ? 'prospective' : 'active'
  const summary = deriveProvisionalSummary({ ownerId: account.ownerEmployeeId, prospective: account.prospective })
  const { score, reasons } = computeAttention({ summary, ownerId: account.ownerEmployeeId, status })
  return {
    id: account.id,
    type: 'account',
    displayName: account.name || 'Unknown account',
    secondary: account.website || undefined,
    email: getPrimaryEmail(account.communicationChannels),
    phone: getPrimaryPhone(account.communicationChannels),
    ownerId: account.ownerEmployeeId,
    status,
    summary,
    attentionScore: score,
    attentionReasons: reasons
  }
}

function toContactRow(contact: CustomerContact): CustomerPortfolioRow | null {
  if (!contact.id) return null
  const summary = deriveProvisionalSummary({ ownerId: contact.ownerEmployeeId })
  const { score, reasons } = computeAttention({ summary, ownerId: contact.ownerEmployeeId, status: 'active' })
  return {
    id: contact.id,
    type: 'contact',
    displayName: buildContactName(contact),
    secondary: contact.jobPosition || undefined,
    email: getPrimaryEmail(contact.communicationChannels),
    phone: getPrimaryPhone(contact.communicationChannels),
    ownerId: contact.ownerEmployeeId,
    status: 'active',
    summary,
    attentionScore: score,
    attentionReasons: reasons
  }
}

function average(values: number[]): number | undefined {
  if (values.length === 0) return undefined
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function buildStats(rows: CustomerPortfolioRow[], accountTotal: number, contactTotal: number): CustomerPortfolioStats {
  const csatValues = rows.map(row => row.summary.csat).filter((value): value is number => typeof value === 'number')
  const overdueTotal = rows.reduce((sum, row) => sum + (row.summary.overdueAmount ?? 0), 0)
  const openTickets = rows.reduce((sum, row) => sum + (row.summary.openTickets ?? 0), 0)
  return {
    totalCustomers: accountTotal + contactTotal,
    totalAccounts: accountTotal,
    totalContacts: contactTotal,
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
  const accountsResult = useCustomerAccountsList(context, { limit: PORTFOLIO_PAGE_SIZE })
  const contactsResult = useCustomerContactsList(context, { limit: PORTFOLIO_PAGE_SIZE })

  // Auto-load every page so the portfolio reflects the whole book of business,
  // not just the first page. The list hooks accumulate results and flip
  // `hasMore` to false once a short page is returned, so this terminates.
  const { hasMore: accountsHasMore, loading: accountsLoading, loadMore: loadMoreAccounts } = accountsResult
  const { hasMore: contactsHasMore, loading: contactsLoading, loadMore: loadMoreContacts } = contactsResult

  useEffect(() => {
    if (accountsHasMore && !accountsLoading) loadMoreAccounts()
  }, [accountsHasMore, accountsLoading, loadMoreAccounts])

  useEffect(() => {
    if (contactsHasMore && !contactsLoading) loadMoreContacts()
  }, [contactsHasMore, contactsLoading, loadMoreContacts])

  const rows = useMemo<CustomerPortfolioRow[]>(() => {
    const accountRows = accountsResult.accounts
      .map(toAccountRow)
      .filter((row): row is CustomerPortfolioRow => row !== null)
    const contactRows = contactsResult.contacts
      .map(toContactRow)
      .filter((row): row is CustomerPortfolioRow => row !== null)
    return [...accountRows, ...contactRows].sort((a, b) => b.attentionScore - a.attentionScore)
  }, [accountsResult.accounts, contactsResult.contacts])

  const stats = useMemo<CustomerPortfolioStats>(
    () => buildStats(rows, accountsResult.total, contactsResult.total),
    [rows, accountsResult.total, contactsResult.total]
  )

  const refetch = useCallback(() => {
    void accountsResult.refetch()
    void contactsResult.refetch()
  }, [accountsResult, contactsResult])

  return {
    rows,
    stats,
    loading: accountsResult.loading || contactsResult.loading,
    error: accountsResult.error || contactsResult.error,
    refetch,
    provisional: rows.length === 0 ? true : rows.some(row => row.summary.provisional)
  }
}
