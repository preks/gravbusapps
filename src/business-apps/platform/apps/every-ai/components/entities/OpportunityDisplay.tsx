import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'

interface OpportunityDisplayProps {
  opportunityId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface Opportunity {
  id: string
  name: string
  amount?: number
  closeDate?: string
  stage?: { value: string }
  account?: { name: string }
}

export const OpportunityDisplay: React.FC<OpportunityDisplayProps> = ({ opportunityId, accessToken, operation }) => {
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchOpportunity = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetOpportunity($id: uuid!) {
            customerOpportunities_by_pk(id: $id) {
              id
              name
              amount
              closeDate
              stage {
                value
              }
              account {
                name
              }
            }
          }
        `

        const result = await graphqlClient.request<{ customerOpportunities_by_pk: Opportunity }>(query, {
          id: opportunityId
        })

        if (result.customerOpportunities_by_pk) {
          setOpportunity(result.customerOpportunities_by_pk)
        } else {
          setError('Opportunity not found')
        }
      } catch (err) {
        console.error('Error fetching opportunity:', err)
        setError('Failed to load opportunity')
      } finally {
        setIsLoading(false)
      }
    }

    if (opportunityId && accessToken) {
      fetchOpportunity()
    }
  }, [opportunityId, accessToken, graphqlClient])

  const operationBadge = getOperationBadge(operation)

  const handleClick = () => {
    if (opportunityId) {
      const url = buildPlatformUrl('/platform/crm/opportunity-record', {
        opportunityId: opportunityId,
        source: 'every-ai'
      })
      navigateTo(url)
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return '-'
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-ai-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-ai" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    </div>
  )

  return (
    <EntityCard
      title={opportunity?.name || 'Opportunity'}
      subtitle={opportunity?.account?.name}
      icon={icon}
      status={operationBadge?.text || opportunity?.stage?.value}
      statusVariant={operationBadge?.variant}
      fields={
        opportunity
          ? [
              { label: 'Amount', value: formatCurrency(opportunity.amount) },
              { label: 'Close Date', value: opportunity.closeDate }
            ]
          : undefined
      }
      isLoading={isLoading}
      error={error || undefined}
      onClick={handleClick}
    />
  )
}

export default OpportunityDisplay
