/**
 * Reconciliation data hook.
 *
 * Loads persisted bank statement lines from BLNK, imports new lines, and applies
 * matches server-side (which records the invoice payment and marks the line
 * matched in one idempotent backend call). Backend failures surface as errors
 * with empty data instead of falling back to bundled demo lines.
 */
import { useCallback, useEffect, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  applyBankStatementMatch,
  financeAdminEnabled,
  importBankStatement,
  listBankStatementLines,
  suggestBankStatementMatches,
  type ImportStatementLine
} from '../network/financeAdminClient'
import type { BankStatementLine, ReconciliationMatch } from '../types'

interface ReconciliationState {
  lines: BankStatementLine[]
  matches: ReconciliationMatch[]
  loading: boolean
  usingSampleData: boolean
  suggestionsAvailable: boolean
  error: string | null
}

export function useReconciliation(context: BusinessAppContextProps) {
  const [state, setState] = useState<ReconciliationState>({
    lines: [],
    matches: [],
    loading: true,
    usingSampleData: false,
    suggestionsAvailable: false,
    error: null
  })

  const load = useCallback(async () => {
    if (!context.accessToken) {
      setState({
        lines: [],
        matches: [],
        loading: false,
        usingSampleData: false,
        suggestionsAvailable: false,
        error: 'Reconciliation requires a valid access token'
      })
      return
    }
    if (!financeAdminEnabled()) {
      setState({
        lines: [],
        matches: [],
        loading: false,
        usingSampleData: false,
        suggestionsAvailable: false,
        error: 'Finance backend is not configured'
      })
      return
    }
    try {
      const lines = await listBankStatementLines(context.accessToken)
      let matches: ReconciliationMatch[] = []
      let suggestionsAvailable = false
      try {
        matches = await suggestBankStatementMatches(context.accessToken)
        suggestionsAvailable = true
      } catch {
        // Keep persisted statement lines and let the screen use local heuristics.
      }
      setState({
        lines,
        matches,
        loading: false,
        usingSampleData: false,
        suggestionsAvailable,
        error: null
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load statement lines'
      setState({
        lines: [],
        matches: [],
        loading: false,
        usingSampleData: false,
        suggestionsAvailable: false,
        error: message
      })
    }
  }, [context.accessToken])

  useEffect(() => {
    load()
  }, [load])

  const importLines = useCallback(
    async (lines: ImportStatementLine[]) => {
      if (!context.accessToken) throw new Error('Reconciliation requires a valid access token')
      await importBankStatement(context.accessToken, lines)
      await load()
    },
    [context.accessToken, load]
  )

  const applyMatch = useCallback(
    async (lineId: string, invoiceId: string, amount: number): Promise<boolean> => {
      if (!context.accessToken) throw new Error('Reconciliation requires a valid access token')
      await applyBankStatementMatch(context.accessToken, lineId, invoiceId, amount)
      await load()
      return true
    },
    [context.accessToken, load]
  )

  return { ...state, refresh: load, importLines, applyMatch }
}
