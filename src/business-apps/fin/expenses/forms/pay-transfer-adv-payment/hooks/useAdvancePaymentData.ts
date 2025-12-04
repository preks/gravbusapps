import { useState, useEffect, useCallback } from 'react'
import { useGetAdvancePaymentForTransfer } from '../queries'
import { AdvancePaymentData } from '../types'

interface UseAdvancePaymentDataProps {
  paymentId: string | null
  accessToken: string
}

export const useAdvancePaymentData = ({ paymentId, accessToken }: UseAdvancePaymentDataProps) => {
  const [advancePayment, setAdvancePayment] = useState<AdvancePaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchAdvancePaymentData } = useGetAdvancePaymentForTransfer(accessToken)

  const fetchPayment = useCallback(async () => {
    if (!paymentId) {
      setError('No advance payment ID provided. Please provide a valid payment ID.')
      setLoading(false)
      return
    }

    if (!accessToken) {
      setError('No access token available. Please ensure you are authenticated.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const data = await fetchAdvancePaymentData(paymentId)

      if (!data) {
        setError(`No advance payment found with ID: ${paymentId}`)
        setLoading(false)
        return
      }

      setAdvancePayment(data)
    } catch (err) {
      console.error('Error fetching advance payment:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch advance payment data')
    } finally {
      setLoading(false)
    }
  }, [paymentId, accessToken, fetchAdvancePaymentData])

  useEffect(() => {
    fetchPayment()
  }, [fetchPayment])

  return {
    advancePayment,
    loading,
    error,
    refetch: fetchPayment
  }
}
