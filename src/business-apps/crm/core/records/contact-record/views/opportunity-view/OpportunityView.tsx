import { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { OpportunitySection } from '@/common/components/common-relations/record-sections/opportunity-section'
import type { GenericOpportunity } from '@/common/components/common-relations/record-sections/opportunity-section'

interface OpportunityViewProps extends BusinessAppContextProps {
  contactId: string
}

interface CRMOpportunity {
  id: string
  name: string
  estimatedAmount?: number
  stage?: string
  status?: string
  closeDate?: string
  createdAt?: string
  currency?: {
    id: string
    code: string
    value: string
  }
  ownerEmployee?: {
    firstName: string
    lastName: string
  }
  salesPipelineStage?: {
    value: string
    code?: string
  }
}

export const OpportunityView: React.FC<OpportunityViewProps> = ({ contactId, ...context }) => {
  const [opportunities, setOpportunities] = useState<CRMOpportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphQLClient = useGraphQLClient(context.accessToken)

  const fetchOpportunities = async () => {
    if (!contactId || !context.accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const GET_CONTACT_OPPORTUNITIES = `
        query GetContactOpportunities($contactId: uuid!) {
          OpportunityContact(
            where: { 
              contactId: { _eq: $contactId }
              isDeleted: { _eq: false }
              opportunity: { isDeleted: { _eq: false } }
            }
          ) {
            opportunity {
              id
              name
              estimatedAmount
              stage
              status
              closeDate
              createdAt
              currency {
                id
                code
                value
              }
              ownerEmployee {
                firstName
                lastName
              }
              salesPipelineStage {
                value
                code
              }
            }
          }
        }
      `

      const result = await graphQLClient.request<{
        OpportunityContact: Array<{ opportunity: CRMOpportunity }>
      }>(GET_CONTACT_OPPORTUNITIES, { contactId })

      const filteredOpportunities = (result.OpportunityContact || [])
        .map(oc => oc.opportunity)
        .filter(opp => opp !== null && opp !== undefined)

      setOpportunities(filteredOpportunities)
    } catch (err) {
      console.error('Error fetching contact opportunities:', err)
      setError(err instanceof Error ? err.message : 'Failed to load opportunities')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOpportunities()
  }, [contactId, context.accessToken])

  const recordUrlBuilder = (opportunityId: string) => {
    return buildPlatformUrl('/platform/crm/opportunity-record', {
      opportunityId,
      source: 'customer-relations'
    })
  }

  // Map CRM opportunities to generic opportunity format
  const mappedOpportunities: GenericOpportunity[] = useMemo(() => {
    return opportunities.map(opp => ({
      id: opp.id,
      name: opp.name,
      code: undefined,
      estimatedAmount: opp.estimatedAmount,
      closeDate: opp.closeDate,
      currency: opp.currency,
      opportunityPipelineStage: opp.salesPipelineStage
        ? {
            id: '',
            code: opp.salesPipelineStage.code || '',
            value: opp.salesPipelineStage.value
          }
        : undefined,
      opportunityStatus: opp.status ? { id: '', code: opp.status, value: opp.status } : undefined,
      ownerEmployee: opp.ownerEmployee,
      createdAt: opp.createdAt
    }))
  }, [opportunities])

  return (
    <OpportunitySection
      opportunities={mappedOpportunities}
      isLoading={loading}
      error={error}
      onRetry={fetchOpportunities}
      recordUrlBuilder={recordUrlBuilder}
      data-testid="contact-opportunities-section"
    />
  )
}
