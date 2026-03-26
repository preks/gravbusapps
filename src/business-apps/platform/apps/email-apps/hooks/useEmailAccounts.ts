import { useState, useEffect, useCallback } from 'react'
import { useOfficeClient } from '@/common/network/office/useOfficeClient'
import type { EmailAccount, CreateEmailAccountRequest } from '../types'

export interface UseEmailAccountsOptions {
  /** Translation function for user-facing error messages */
  t?: (key: string, vars?: Record<string, string | number>) => string
}

export function useEmailAccounts(accessToken: string, options: UseEmailAccountsOptions = {}) {
  const { t } = options
  const officeClient = useOfficeClient(accessToken)
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await officeClient.emails.getAccounts<EmailAccount[]>()
      setAccounts(data)
    } catch (err) {
      setError(t ? t('account-load-failed') : err instanceof Error ? err.message : String(err))
    } finally {
      setIsLoading(false)
    }
  }, [t, officeClient])

  useEffect(() => {
    if (accessToken) loadAccounts()
  }, [accessToken, loadAccounts])

  const createAccount = useCallback(
    async (data: CreateEmailAccountRequest) => {
      const account = await officeClient.emails.createAccount<EmailAccount>(data)
      setAccounts(prev => [...prev, account])
      return account
    },
    [officeClient]
  )

  const deleteAccount = useCallback(
    async (id: string) => {
      await officeClient.emails.deleteAccount(id)
      setAccounts(prev => prev.filter(a => a.id !== id))
    },
    [officeClient]
  )

  const syncAccount = useCallback(
    async (id: string) => {
      await officeClient.emails.syncAccount(id)
      await loadAccounts()
    },
    [loadAccounts, officeClient]
  )

  const defaultAccount = accounts.find(a => a.isDefault) || accounts[0]

  return {
    accounts,
    defaultAccount,
    isLoading,
    error,
    createAccount,
    deleteAccount,
    syncAccount,
    refreshAccounts: loadAccounts
  }
}
