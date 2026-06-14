import { useCallback, useEffect, useState } from 'react'
import type { Customer360Subject, CustomerContract, DomainHookResult } from '../../types'
import {
  CUSTOMER_360_CONTRACTS_CHANGED_EVENT,
  listAccountContracts
} from '../../../record/tabs/contracts/customerContractService'

export interface CustomerContractsResult extends DomainHookResult<CustomerContract[]> {
  refetch: () => Promise<void>
}

export function useCustomerContracts(accessToken: string, subject: Customer360Subject | null): CustomerContractsResult {
  const [data, setData] = useState<CustomerContract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const subjectId = subject?.id

  const loadContracts = useCallback(async () => {
    if (!subjectId || !accessToken) {
      setData([])
      return
    }

    setLoading(true)
    setError(null)
    try {
      const contracts = await listAccountContracts(accessToken, subjectId)
      setData(contracts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load contracts')
      setData([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, subjectId])

  useEffect(() => {
    loadContracts().catch(() => undefined)
  }, [loadContracts])

  useEffect(() => {
    if (globalThis.window === undefined) return
    const handleContractsChanged = () => {
      loadContracts().catch(() => undefined)
    }
    globalThis.window.addEventListener(CUSTOMER_360_CONTRACTS_CHANGED_EVENT, handleContractsChanged)
    return () => globalThis.window.removeEventListener(CUSTOMER_360_CONTRACTS_CHANGED_EVENT, handleContractsChanged)
  }, [loadContracts])

  return { data, loading, error, refetch: loadContracts }
}
