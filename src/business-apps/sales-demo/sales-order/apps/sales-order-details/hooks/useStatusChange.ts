import { useState } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { UPDATE_SALES_ORDER_STATUS, UPDATE_LINE_ITEM_STATUS } from '../queries/salesOrderStatusMutation'

interface UseStatusChangeProps {
  accessToken: string
  type: 'order' | 'lineItem'
  orderId: string
  lineItemId?: string
  onSuccess?: () => void
}

interface UseStatusChangeReturn {
  updateStatus: (newStatus: string) => Promise<void>
  loading: boolean
  error: Error | null
}

export const useStatusChange = ({
  accessToken,
  type,
  orderId,
  lineItemId,
  onSuccess
}: UseStatusChangeProps): UseStatusChangeReturn => {
  const graphqlClient = useGraphqlClient(accessToken)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const updateStatus = async (newStatus: string) => {
    setLoading(true)
    setError(null)

    try {
      if (type === 'lineItem') {
        if (!lineItemId) {
          throw new Error('Line item ID is required for line item status updates')
        }
        await graphqlClient.request(UPDATE_LINE_ITEM_STATUS, {
          lineItemId,
          statusCode: newStatus
        })
      } else {
        await graphqlClient.request(UPDATE_SALES_ORDER_STATUS, {
          orderId,
          statusCode: newStatus
        })
      }

      if (onSuccess) {
        onSuccess()
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to update status')
      setError(error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    updateStatus,
    loading,
    error
  }
}
