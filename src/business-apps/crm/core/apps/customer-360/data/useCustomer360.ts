/**
 * useCustomer360 — orchestrates all per-domain hooks into one normalized
 * `Customer360Snapshot`. The composed snapshot shape is also what the agent's
 * future `getCustomer360` provider tool will expose, so it must match exactly
 * what the UI reads.
 */
import { useMemo } from 'react'
import type { Customer360Snapshot, Customer360Subject, CustomerCase, CustomerReclamation } from './types'
import { useCustomerContracts } from './hooks/useCustomerContracts'
import { useCustomerTickets } from './hooks/useCustomerTickets'
import { useCustomerCases } from './hooks/useCustomerCases'
import { useCustomerInvoices } from './hooks/useCustomerInvoices'
import { useCustomerTransactions } from './hooks/useCustomerTransactions'
import { useCustomerSatisfaction } from './hooks/useCustomerSatisfaction'
import { useCustomerJournal } from './hooks/useCustomerJournal'
import { useCustomerScores } from './hooks/useCustomerScores'
import { deriveBalance } from './deriveBalance'

export interface UseCustomer360Result {
  snapshot: Customer360Snapshot
  loading: boolean
  error: string | null
}

export function useCustomer360(accessToken: string, subject: Customer360Subject | null): UseCustomer360Result {
  const scores = useCustomerScores(accessToken, subject)
  const satisfaction = useCustomerSatisfaction(accessToken, subject)
  const contracts = useCustomerContracts(accessToken, subject)
  const tickets = useCustomerTickets(accessToken, subject)
  const cases = useCustomerCases(accessToken, subject)
  const invoices = useCustomerInvoices(accessToken, subject)
  const transactions = useCustomerTransactions(accessToken, subject)
  const journal = useCustomerJournal(accessToken, subject)

  const snapshot = useMemo<Customer360Snapshot>(() => {
    const reclamations: CustomerReclamation[] = cases.data
      .filter(customerCase => customerCase.type === 'reclamation')
      .map(customerCase => ({
        id: customerCase.id,
        title: customerCase.title,
        status: customerCase.status,
        createdAt: customerCase.createdAt
      }))
    const regularCases: CustomerCase[] = cases.data.filter(customerCase => customerCase.type !== 'reclamation')

    return {
      scores: scores.data,
      satisfaction: satisfaction.data,
      contracts: contracts.data,
      tickets: tickets.data,
      cases: regularCases,
      reclamations,
      invoices: invoices.data,
      balance: deriveBalance(invoices.data),
      transactions: transactions.data,
      journal: journal.data
    }
  }, [
    scores.data,
    satisfaction.data,
    contracts.data,
    tickets.data,
    cases.data,
    invoices.data,
    transactions.data,
    journal.data
  ])

  const sources = [scores, satisfaction, contracts, tickets, cases, invoices, transactions, journal]
  const loading = sources.some(source => source.loading)
  const error = sources.map(source => source.error).find(Boolean) ?? null

  return { snapshot, loading, error }
}
