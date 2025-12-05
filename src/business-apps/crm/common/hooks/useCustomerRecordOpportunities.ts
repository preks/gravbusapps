import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'

export type RecordType = 'account' | 'contact'

export interface UseCustomerRecordOpportunitiesConfig {
  recordId: string
  recordType: RecordType
  context: BusinessAppContextProps
}

export interface UseCustomerRecordOpportunitiesResult {
  opportunities: CustomerOpportunity[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * CRM-specific hook for fetching opportunities related to a customer record (account or contact)
 * This follows the exit-opportunities pattern of using domain-specific hooks directly
 */
export const useCustomerRecordOpportunities = ({
  recordId,
  recordType,
  context
}: UseCustomerRecordOpportunitiesConfig): UseCustomerRecordOpportunitiesResult => {
  const [opportunities, setOpportunities] = useState<CustomerOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)

  const fetchOpportunities = useCallback(async () => {
    if (!recordId || !context.accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const filterKey = recordType === 'account' ? 'accountIds' : 'contactIds'
      const result = await fetchCustomerOpportunities({
        [filterKey]: [recordId],
        limit: 100,
        orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
      })
      setOpportunities(result.opportunities || [])
    } catch (err) {
      console.error(`Error fetching ${recordType} customer opportunities:`, err)
      setError(err instanceof Error ? err.message : 'Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }, [recordId, recordType, context.accessToken, fetchCustomerOpportunities])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  return {
    opportunities,
    loading,
    error,
    refetch: fetchOpportunities
  }
}
