import { useState, useEffect, useCallback } from 'react'
import { EmailApiService } from '../services/EmailApiService'
import type { EmailAccount, CreateEmailAccountRequest } from '../types'

export function useEmailAccounts(accessToken: string) {
  const [accounts, setAccounts] = useState<EmailAccount[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    EmailApiService.setAccessToken(accessToken)
  }, [accessToken])

  const loadAccounts = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await EmailApiService.listAccounts()
      setAccounts(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load accounts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (accessToken) loadAccounts()
  }, [accessToken, loadAccounts])

  const createAccount = useCallback(async (data: CreateEmailAccountRequest) => {
    const account = await EmailApiService.createAccount(data)
    setAccounts(prev => [...prev, account])
    return account
  }, [])

  const deleteAccount = useCallback(async (id: string) => {
    await EmailApiService.deleteAccount(id)
    setAccounts(prev => prev.filter(a => a.id !== id))
  }, [])

  const syncAccount = useCallback(
    async (id: string) => {
      await EmailApiService.syncAccount(id)
      // Refresh accounts to get updated sync status
      await loadAccounts()
    },
    [loadAccounts]
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
