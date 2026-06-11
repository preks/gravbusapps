/**
 * Ledger Admin data + actions for the Ledger Admin screen.
 *
 * Loads ledgers, accounts, and transactions from the real ledger backend
 * through the NEWWORK Connect lane. Falls back to sample data when the lane is
 * not configured or unreachable, so the UI stays usable in local dev.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  createAccount,
  createLedger,
  createTransaction,
  ledgerAdminEnabled,
  listAccounts,
  listLedgers,
  listTransactions,
  type CreateAccountInput,
  type CreateLedgerInput,
  type CreateTransactionInput,
  type Ledger,
  type LedgerAccount,
  type LedgerTransaction
} from '../network/ledgerAdminClient'
import { SAMPLE_ACCOUNTS, SAMPLE_LEDGERS, SAMPLE_LEDGER_TRANSACTIONS } from '../data/sampleLedgerData'
import { getAccountNameOverrides, setAccountNameOverride } from '../utils/accountNameStore'

/** Merge local display-name overrides into freshly loaded accounts. */
function applyNameOverrides(accounts: LedgerAccount[]): LedgerAccount[] {
  const overrides = getAccountNameOverrides()
  if (Object.keys(overrides).length === 0) return accounts
  return accounts.map(account =>
    overrides[account.balanceId] ? { ...account, name: overrides[account.balanceId] } : account
  )
}

interface LedgerAdminState {
  ledgers: Ledger[]
  accounts: LedgerAccount[]
  transactions: LedgerTransaction[]
  loading: boolean
  error: string | null
  usingSampleData: boolean
}

const SAMPLE_STATE: Omit<LedgerAdminState, 'loading'> = {
  ledgers: SAMPLE_LEDGERS,
  accounts: SAMPLE_ACCOUNTS,
  transactions: SAMPLE_LEDGER_TRANSACTIONS,
  error: null,
  usingSampleData: true
}

export function useLedgerAdmin(context: Pick<BusinessAppContextProps, 'accessToken'>) {
  const accessToken = context.accessToken
  const [state, setState] = useState<LedgerAdminState>({
    ledgers: [],
    accounts: [],
    transactions: [],
    loading: true,
    error: null,
    usingSampleData: false
  })

  const load = useCallback(async () => {
    if (!accessToken || !ledgerAdminEnabled()) {
      setState({ ...SAMPLE_STATE, accounts: applyNameOverrides(SAMPLE_ACCOUNTS), loading: false })
      return
    }
    setState(prev => ({ ...prev, loading: true }))
    try {
      const [ledgers, accounts, transactions] = await Promise.all([
        listLedgers(accessToken),
        listAccounts(accessToken),
        listTransactions(accessToken)
      ])
      setState({
        ledgers,
        accounts: applyNameOverrides(accounts),
        transactions,
        loading: false,
        error: null,
        usingSampleData: false
      })
    } catch (err) {
      // Lane configured but unreachable: keep the UI usable with samples, but
      // surface the real failure (status + path) so the connector route can be
      // confirmed/corrected without opening devtools.
      const message = err instanceof Error ? err.message : 'Unknown error reaching the ledger backend'
      setState({ ...SAMPLE_STATE, accounts: applyNameOverrides(SAMPLE_ACCOUNTS), loading: false, error: message })
    }
  }, [accessToken])

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (cancelled) return
      await load()
    }
    run()
    return () => {
      cancelled = true
    }
  }, [load])

  const addLedger = useCallback(
    async (input: CreateLedgerInput) => {
      if (!accessToken) throw new Error('Ledger Admin requires a valid access token')
      const ledger = await createLedger(accessToken, input)
      setState(prev => ({ ...prev, ledgers: [ledger, ...prev.ledgers] }))
      return ledger
    },
    [accessToken]
  )

  const addAccount = useCallback(
    async (input: CreateAccountInput) => {
      if (!accessToken) throw new Error('Ledger Admin requires a valid access token')
      const account = await createAccount(accessToken, input)
      setState(prev => ({ ...prev, accounts: [account, ...prev.accounts] }))
      return account
    },
    [accessToken]
  )

  const addTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      if (!accessToken) throw new Error('Ledger Admin requires a valid access token')
      const transaction = await createTransaction(accessToken, input)
      setState(prev => ({ ...prev, transactions: [transaction, ...prev.transactions] }))
      return transaction
    },
    [accessToken]
  )

  const renameAccount = useCallback((balanceId: string, name: string) => {
    setAccountNameOverride(balanceId, name)
    const trimmed = name.trim()
    setState(prev => ({
      ...prev,
      accounts: prev.accounts.map(account =>
        account.balanceId === balanceId ? { ...account, name: trimmed || account.balanceId } : account
      )
    }))
  }, [])

  return useMemo(
    () => ({ ...state, reload: load, addLedger, addAccount, addTransaction, renameAccount }),
    [state, load, addLedger, addAccount, addTransaction, renameAccount]
  )
}
