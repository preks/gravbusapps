/**
 * Ledger Admin data + actions for the Ledger Admin screen.
 *
 * Loads ledgers, accounts, and transactions from the real ledger backend
 * through the NEWWORK Connect lane. Backend failures surface as errors with
 * empty data instead of falling back to bundled demo records.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  createBalance,
  createLedger,
  createTransaction,
  ledgerAdminEnabled,
  listBalances,
  listLedgers,
  listTransactions,
  updateInflightTransaction,
  type CreateBalanceInput,
  type CreateLedgerInput,
  type CreateTransactionInput,
  type Ledger,
  type LedgerBalance,
  type LedgerTransaction,
  type UpdateInflightTransactionInput
} from '../network/ledgerAdminClient'
import { setAccountNameOverride, upsertStoredLedgerBalance } from '../utils/accountNameStore'
import {
  mergeBalances,
  resolveBalancesForTransactions,
  storedBalances,
  transactionMetaBalances
} from './ledgerBalanceResolution'
import { mergeTransactionSnapshot } from './ledgerTransactionSnapshots'
import { groupTransactionsForDisplay } from '../utils/ledgerTransactionGroups'

interface LedgerAdminState {
  ledgers: Ledger[]
  balances: LedgerBalance[]
  transactions: LedgerTransaction[]
  loading: boolean
  error: string | null
  usingSampleData: boolean
}

function stringMetaValue(value: unknown, fallback: string): string {
  return typeof value === 'string' && value ? value : fallback
}

export function useLedgerAdmin(context: Pick<BusinessAppContextProps, 'accessToken'>) {
  const accessToken = context.accessToken
  const [state, setState] = useState<LedgerAdminState>({
    ledgers: [],
    balances: [],
    transactions: [],
    loading: true,
    error: null,
    usingSampleData: false
  })

  const load = useCallback(async () => {
    if (accessToken && ledgerAdminEnabled()) {
      setState(prev => ({ ...prev, loading: true }))
      try {
        const [ledgers, remoteBalances, transactions] = await Promise.all([
          listLedgers(accessToken),
          listBalances(accessToken),
          listTransactions(accessToken)
        ])
        const balances = mergeBalances(remoteBalances, storedBalances(), transactionMetaBalances(transactions))
        const resolvedBalances = await resolveBalancesForTransactions(accessToken, balances, transactions)
        setState({
          ledgers,
          balances: resolvedBalances,
          transactions: groupTransactionsForDisplay(transactions),
          loading: false,
          error: null,
          usingSampleData: false
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error reaching the ledger backend'
        setState({
          ledgers: [],
          balances: [],
          transactions: [],
          loading: false,
          error: message,
          usingSampleData: false
        })
      }
      return
    }

    const error = accessToken ? 'Ledger backend is not configured' : 'Ledger Admin requires a valid access token'
    setState({
      ledgers: [],
      balances: [],
      transactions: [],
      loading: false,
      error,
      usingSampleData: false
    })
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
    async (input: CreateBalanceInput) => {
      if (!accessToken) throw new Error('Ledger Admin requires a valid access token')
      const balance = await createBalance(accessToken, input)
      upsertStoredLedgerBalance({
        balanceId: balance.balanceId,
        ledgerId: balance.ledgerId || input.ledgerId,
        label: balance.name || input.name,
        currency: balance.currency || input.currency,
        type: stringMetaValue(input.metaData?.account_type, 'customer')
      })
      setState(prev => ({ ...prev, balances: [balance, ...prev.balances] }))
      return balance
    },
    [accessToken]
  )

  const addTransaction = useCallback(
    async (input: CreateTransactionInput) => {
      if (!accessToken) throw new Error('Ledger Admin requires a valid access token')
      const transaction = await createTransaction(accessToken, input)
      let balances: LedgerBalance[] | null = null
      try {
        const remoteBalances = await listBalances(accessToken)
        balances = await resolveBalancesForTransactions(
          accessToken,
          mergeBalances(remoteBalances, storedBalances(), transactionMetaBalances([transaction])),
          [transaction]
        )
      } catch {
        balances = null
      }
      setState(prev => ({
        ...prev,
        balances: balances ?? prev.balances,
        transactions: groupTransactionsForDisplay([transaction, ...prev.transactions])
      }))
      return transaction
    },
    [accessToken]
  )

  const updateInflight = useCallback(
    async (input: UpdateInflightTransactionInput) => {
      if (!accessToken) throw new Error('Ledger Admin requires a valid access token')
      const transaction = await updateInflightTransaction(accessToken, input)
      try {
        const [remoteBalances, transactions] = await Promise.all([
          listBalances(accessToken),
          listTransactions(accessToken)
        ])
        const transactionsWithUpdate = mergeTransactionSnapshot(transactions, transaction)
        const balances = await resolveBalancesForTransactions(
          accessToken,
          mergeBalances(remoteBalances, storedBalances(), transactionMetaBalances(transactionsWithUpdate)),
          transactionsWithUpdate
        )
        setState(prev => ({
          ...prev,
          balances,
          transactions: groupTransactionsForDisplay(transactionsWithUpdate)
        }))
      } catch {
        if (transaction) {
          setState(prev => ({
            ...prev,
            transactions: groupTransactionsForDisplay([transaction, ...prev.transactions])
          }))
        }
      }
      return transaction
    },
    [accessToken]
  )

  const renameAccount = useCallback((balanceId: string, name: string) => {
    setAccountNameOverride(balanceId, name)
    const trimmed = name.trim()
    setState(prev => ({
      ...prev,
      balances: prev.balances.map(balance =>
        balance.balanceId === balanceId ? { ...balance, name: trimmed || balance.balanceId } : balance
      )
    }))
  }, [])

  return useMemo(
    () => ({
      ...state,
      accounts: state.balances,
      reload: load,
      addLedger,
      addAccount,
      addTransaction,
      updateInflight,
      renameAccount
    }),
    [state, load, addLedger, addAccount, addTransaction, updateInflight, renameAccount]
  )
}
