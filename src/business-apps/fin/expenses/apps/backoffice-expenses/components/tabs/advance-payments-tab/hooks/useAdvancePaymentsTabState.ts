import { useMemo } from 'react'
import { useAdvancePayments } from '../../../../hooks/useAdvancePayment'

interface UseAdvancePaymentsTabStateParams {
  accessToken: string
  isActive: boolean
}

export function useAdvancePaymentsTabState({ accessToken, isActive }: UseAdvancePaymentsTabStateParams) {
  const contextProps = useMemo(
    () => ({
      accessToken,
      isActive
    }),
    [accessToken, isActive]
  )

  return useAdvancePayments(contextProps)
}
