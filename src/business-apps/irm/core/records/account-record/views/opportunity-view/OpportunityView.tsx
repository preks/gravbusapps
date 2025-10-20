import React, { useState, useEffect } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import type { InvestmentOpportunity } from '@/common/data/investment/types'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OpportunitySection } from '@/common/components/common-relations/record-sections/opportunity-section'

interface OpportunityViewProps {
  accountId: string
  context: BusinessAppContextProps
}

type Opportunity = InvestmentOpportunity

export const OpportunityView: React.FC<OpportunityViewProps> = ({ accountId, context }) => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  const fetchOpportunities = async () => {
    if (!accountId || !context.accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await fetchInvestmentOpportunities({
        accountIds: [accountId],
        limit: 50,
        orderBy: [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }]
      })
      setOpportunities(result.InvestmentOpportunity || [])
    } catch (err) {
      console.error('Error fetching account opportunities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOpportunities()
  }, [accountId, context.accessToken, fetchInvestmentOpportunities])

  const recordUrlBuilder = (opportunityId: string) => {
    return buildPlatformUrl('/platform/irm/opportunity-record', {
      opportunityId,
      source: 'investments'
    })
  }

  return (
    <OpportunitySection
      opportunities={opportunities}
      isLoading={loading}
      error={error}
      onRetry={fetchOpportunities}
      recordUrlBuilder={recordUrlBuilder}
      data-testid="account-opportunities-card"
    />
  )
}
