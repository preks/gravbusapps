import { useMemo } from 'react'
import { useCustomerAccount } from '@/common/data/customer/hooks/useCustomerAccount'
import type { Customer360Subject } from '../types'

export interface UseCustomerRootResult {
  subject: Customer360Subject | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useCustomerRoot(accessToken: string, id: string | undefined): UseCustomerRootResult {
  const accountResult = useCustomerAccount(accessToken, id)

  const subject = useMemo<Customer360Subject | null>(() => {
    const account = accountResult.account
    if (!account?.id) return null
    return {
      id: account.id,
      type: 'account',
      displayName: account.name || 'Unknown Account',
      status: account.prospective ? 'prospective' : 'active',
      ownerId: account.ownerEmployeeId,
      account
    }
  }, [accountResult.account])

  return {
    subject,
    loading: accountResult.loading,
    error: accountResult.error,
    refetch: accountResult.refetch
  }
}
