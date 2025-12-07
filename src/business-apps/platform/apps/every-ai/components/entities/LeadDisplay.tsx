import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'

interface LeadDisplayProps {
  leadId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface Lead {
  id: string
  firstName: string
  lastName: string
  company?: string
  leadStatus?: { value: string }
  email?: string
}

export const LeadDisplay: React.FC<LeadDisplayProps> = ({ leadId, accessToken, operation }) => {
  const [lead, setLead] = useState<Lead | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    // For delete operations, skip GraphQL query since entity is already deleted
    if (operation === 'delete') {
      setIsLoading(false)
      setError(null)
      return
    }

    const fetchLead = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetLead($id: uuid!) {
            customerLeads_by_pk(id: $id) {
              id
              firstName
              lastName
              company
              email
              leadStatus {
                value
              }
            }
          }
        `

        const result = await graphqlClient.request<{ customerLeads_by_pk: Lead }>(query, { id: leadId })

        if (result.customerLeads_by_pk) {
          setLead(result.customerLeads_by_pk)
        } else {
          setError('Lead not found')
        }
      } catch (err) {
        console.error('Error fetching lead:', err)
        setError('Failed to load lead')
      } finally {
        setIsLoading(false)
      }
    }

    if (leadId && accessToken) {
      fetchLead()
    }
  }, [leadId, accessToken, graphqlClient, operation])

  const operationBadge = getOperationBadge(operation)

  const handleClick = () => {
    if (leadId) {
      const url = buildPlatformUrl('/platform/crm/lead-record', {
        leadId: leadId,
        source: 'every-ai'
      })
      navigateTo(url)
    }
  }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-info-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-info" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
  )

  return (
    <EntityCard
      title={lead ? `${lead.firstName} ${lead.lastName}` : 'Lead'}
      subtitle={lead?.company}
      icon={icon}
      status={operationBadge?.text || lead?.leadStatus?.value}
      statusVariant={operationBadge?.variant}
      fields={
        lead
          ? [
              { label: 'Email', value: lead.email },
              { label: 'Status', value: lead.leadStatus?.value }
            ]
          : undefined
      }
      isLoading={isLoading}
      error={error || undefined}
      onClick={handleClick}
    />
  )
}

export default LeadDisplay
