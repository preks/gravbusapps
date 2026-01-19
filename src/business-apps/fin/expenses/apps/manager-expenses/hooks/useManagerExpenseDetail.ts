import { useCallback, useEffect, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { MANAGER_EXPENSE_DETAIL } from '../queries/ManagerExpenseDetail'

export interface UseManagerExpenseDetailParams {
  requestId?: string | null
  planId?: string | null
  advancePaymentId?: string | null
}

export const useManagerExpenseDetail = (context: BusinessAppContextProps, params: UseManagerExpenseDetailParams) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<any>(null)
  const lastSignatureRef = useRef<string | null>(null)

  const run = useCallback(
    async (force = false) => {
      // Skip execution if no parameters are provided
      if (!params.requestId && !params.planId && !params.advancePaymentId) {
        setData(null)
        setIsLoading(false)
        setError(null)
        return
      }

      const signature = JSON.stringify(params)
      if (!force && lastSignatureRef.current === signature) return
      lastSignatureRef.current = signature

      setIsLoading(true)
      setError(null)
      try {
        const result = await graphqlClient.request(MANAGER_EXPENSE_DETAIL, {
          requestId: params.requestId || undefined,
          planId: params.planId || undefined,
          advancePaymentId: params.advancePaymentId || undefined,
          skipRequest: !params.requestId,
          skipPlan: !params.planId,
          skipPayment: !params.advancePaymentId
        })
        setData(result)
      } catch (e: any) {
        setError(e?.message || 'Failed to load expense detail')
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient, params]
  )

  useEffect(() => {
    void run()
  }, [run])

  return { data, isLoading, error, refetch: run }
}
