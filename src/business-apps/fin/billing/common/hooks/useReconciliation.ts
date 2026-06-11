/**
 * Reconciliation data hook.
 *
 * Loads persisted bank statement lines from BLNK, imports new lines, and applies
 * matches server-side (which records the invoice payment and marks the line
 * matched in one idempotent backend call). Falls back to sample lines when the
 * finance backend lane is unavailable so the screen stays usable in local dev.
 */
import { useCallback, useEffect, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  applyBankStatementMatch,
  financeAdminEnabled,
  importBankStatement,
  listBankStatementLines,
  type ImportStatementLine
} from '../network/financeAdminClient'
import { SAMPLE_BANK_STATEMENT_LINES } from '../data/sampleBillingData'
import type { BankStatementLine } from '../types'

interface ReconciliationState {
  lines: BankStatementLine[]
  loading: boolean
  usingSampleData: boolean
  error: string | null
}

export function useReconciliation(context: BusinessAppContextProps) {
  const [state, setState] = useState<ReconciliationState>({
    lines: [],
    loading: true,
    usingSampleData: false,
    error: null
  })

  const load = useCallback(async () => {
    if (!context.accessToken) return
    if (!financeAdminEnabled()) {
      setState({ lines: SAMPLE_BANK_STATEMENT_LINES, loading: false, usingSampleData: true, error: null })
      return
    }
    try {
      const lines = await listBankStatementLines(context.accessToken)
      setState({ lines, loading: false, usingSampleData: false, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load statement lines'
      setState({ lines: SAMPLE_BANK_STATEMENT_LINES, loading: false, usingSampleData: true, error: message })
    }
  }, [context.accessToken])

  useEffect(() => {
    load()
  }, [load])

  const importLines = useCallback(
    async (lines: ImportStatementLine[]) => {
      if (!context.accessToken || state.usingSampleData) {
        // Sample/local mode: show imported lines without persisting.
        setState(prev => ({
          ...prev,
          lines: lines.map((line, index) => ({
            id: `local-${Date.now()}-${index}`,
            bookingDate: line.bookingDate ?? '',
            amount: line.amount,
            currency: line.currency,
            counterparty: line.counterparty ?? null,
            reference: line.reference ?? null,
            matchedInvoiceId: null
          }))
        }))
        return
      }
      await importBankStatement(context.accessToken, lines)
      await load()
    },
    [context.accessToken, state.usingSampleData, load]
  )

  const applyMatch = useCallback(
    async (lineId: string, invoiceId: string, amount: number): Promise<boolean> => {
      if (!context.accessToken || state.usingSampleData) {
        // Sample mode: just mark it locally; the caller handles local payment.
        setState(prev => ({
          ...prev,
          lines: prev.lines.map(line => (line.id === lineId ? { ...line, matchedInvoiceId: invoiceId } : line))
        }))
        return false
      }
      await applyBankStatementMatch(context.accessToken, lineId, invoiceId, amount)
      await load()
      return true
    },
    [context.accessToken, state.usingSampleData, load]
  )

  return { ...state, refresh: load, importLines, applyMatch }
}
