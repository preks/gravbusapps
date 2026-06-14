import { useMemo } from 'react'
import type { Customer360Snapshot, Customer360Subject } from '../types'
import { deriveBalance } from './deriveBalance'
import { useCustomerCases } from './hooks/useCustomerCases'
import { useCustomerContracts } from './hooks/useCustomerContracts'
import { useCustomerInvoices } from './hooks/useCustomerInvoices'
import { useCustomerJournal } from './hooks/useCustomerJournal'
import { useCustomerReclamations } from './hooks/useCustomerReclamations'
import { useCustomerSatisfaction } from './hooks/useCustomerSatisfaction'
import { useCustomerScores } from './hooks/useCustomerScores'
import { useCustomerTickets } from './hooks/useCustomerTickets'
import { useCustomerTransactions } from './hooks/useCustomerTransactions'

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
  const reclamations = useCustomerReclamations(accessToken, subject)
  const invoices = useCustomerInvoices(accessToken, subject)
  const transactions = useCustomerTransactions(accessToken, subject)
  const journal = useCustomerJournal(accessToken, subject)

  const snapshot = useMemo<Customer360Snapshot>(() => {
    return {
      scores: scores.data,
      satisfaction: satisfaction.data,
      contracts: contracts.data,
      tickets: tickets.data,
      cases: cases.data,
      reclamations: reclamations.data,
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
    reclamations.data,
    invoices.data,
    transactions.data,
    journal.data
  ])

  const sources = [scores, satisfaction, contracts, tickets, cases, reclamations, invoices, transactions, journal]
  const loading = sources.some(source => source.loading)
  const error = sources.map(source => source.error).find(Boolean) ?? null

  return { snapshot, loading, error }
}
