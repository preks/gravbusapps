import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCustomerOpportunities } from '@/common/data/customer/hooks/useCustomerOpportunities'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'

export type RecordType = 'account' | 'contact'
export type ContextType = 'customer' | 'investment'
export type OpportunityType = CustomerOpportunity | InvestmentOpportunity

export interface UseRecordOpportunitiesConfig {
  recordId: string
  recordType: RecordType
  contextType: ContextType
  context: BusinessAppContextProps
}

export interface UseRecordOpportunitiesResult {
  opportunities: OpportunityType[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useRecordOpportunities = ({
  recordId,
  recordType,
  contextType,
  context
}: UseRecordOpportunitiesConfig): UseRecordOpportunitiesResult => {
  const [opportunities, setOpportunities] = useState<OpportunityType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchCustomerOpportunities } = useCustomerOpportunities(context)
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  const fetchOpportunities = useCallback(async () => {
    if (!recordId || !context.accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      if (contextType === 'customer') {
        const filterKey = recordType === 'account' ? 'accountIds' : 'contactIds'
        const result = await fetchCustomerOpportunities({
          [filterKey]: [recordId],
          limit: 100,
          orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
        })
        setOpportunities(result.opportunities || [])
      } else {
        const filterKey = recordType === 'account' ? 'accountIds' : 'contactIds'
        const result = await fetchInvestmentOpportunities({
          [filterKey]: [recordId],
          limit: 100,
          orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
        })
        setOpportunities(result.InvestmentOpportunity || [])
      }
    } catch (err) {
      console.error(`Error fetching ${recordType} opportunities:`, err)
      setError(err instanceof Error ? err.message : 'Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }, [recordId, recordType, contextType, context.accessToken, fetchCustomerOpportunities, fetchInvestmentOpportunities])

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
