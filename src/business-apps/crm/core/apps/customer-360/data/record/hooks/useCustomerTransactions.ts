import { useEffect, useState } from 'react'
import {
  ledgerAdminEnabled,
  listTransactions,
  type LedgerTransaction
} from '@/business-apps/fin/billing/common/network/ledgerAdminClient'
import type { Customer360Subject, CustomerTransaction, DomainHookResult } from '../../types'

function metadataValue(metadata: Record<string, unknown>, key: string): string | undefined {
  const value = metadata[key]
  return typeof value === 'string' ? value : undefined
}

function matchesAccount(transaction: LedgerTransaction, accountId: string): boolean {
  const metadata = transaction.metaData ?? {}
  const accountRefs = [
    metadataValue(metadata, 'crmAccountId'),
    metadataValue(metadata, 'invoiceAccountId'),
    metadataValue(metadata, 'accountId')
  ]
  return accountRefs.includes(accountId) || metadata.customerRef === `account:${accountId}`
}

function transactionDirection(transaction: LedgerTransaction): CustomerTransaction['direction'] {
  if (
    transaction.metaData?.externalTransactionType === 'payment' ||
    transaction.metaData?.ledgerEventType === 'INVOICE_PAID'
  ) {
    return 'credit'
  }
  return 'debit'
}

function toCustomerTransaction(transaction: LedgerTransaction): CustomerTransaction {
  return {
    id: transaction.transactionId,
    description: transaction.description ?? transaction.reference,
    amount: transaction.amount,
    currency: transaction.currency,
    date: transaction.createdAt,
    direction: transactionDirection(transaction)
  }
}

export function useCustomerTransactions(
  accessToken: string,
  subject: Customer360Subject | null
): DomainHookResult<CustomerTransaction[]> {
  const [data, setData] = useState<CustomerTransaction[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id

  useEffect(() => {
    if (!subjectId || !accessToken || !ledgerAdminEnabled()) {
      setData([])
      return
    }

    let cancelled = false
    const loadTransactions = async () => {
      setLoading(true)
      setError(null)
      try {
        const transactions = await listTransactions(accessToken)
        const customerTransactions = transactions.filter(transaction => matchesAccount(transaction, subjectId))
        if (!cancelled) setData(customerTransactions.map(toCustomerTransaction))
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Failed to load transactions')
        setData([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadTransactions()
    return () => {
      cancelled = true
    }
  }, [accessToken, subjectId])

  return { data, loading, error }
}
