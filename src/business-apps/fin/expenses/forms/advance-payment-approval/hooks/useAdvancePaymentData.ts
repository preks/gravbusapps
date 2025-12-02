import { useState, useEffect, useCallback, useRef } from 'react'
import { useGetAdvancePaymentForApproval } from '../queries'
import { AdvancePaymentData } from '../types'

interface UseAdvancePaymentDataProps {
  paymentId: string | null
  accessToken: string
}

export const useAdvancePaymentData = ({ paymentId, accessToken }: UseAdvancePaymentDataProps) => {
  const [advancePayment, setAdvancePayment] = useState<AdvancePaymentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchAdvancePaymentData } = useGetAdvancePaymentForApproval(accessToken)
  // Use ref to avoid endless loop - fetchAdvancePaymentData changes reference on every render
  const fetchAdvancePaymentDataRef = useRef(fetchAdvancePaymentData)
  fetchAdvancePaymentDataRef.current = fetchAdvancePaymentData

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

      const data = await fetchAdvancePaymentDataRef.current(paymentId)

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
  }, [paymentId, accessToken])

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
