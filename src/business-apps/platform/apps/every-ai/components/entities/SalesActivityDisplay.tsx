import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'

interface SalesActivityDisplayProps {
  activityId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface SalesActivity {
  id: string
  title: string
  description?: string
  occurredAt?: string
  completedAt?: string
  activityType?: { value: string }
  account?: {
    id: string
    name: string
  }
  lead?: {
    id: string
    firstName: string
    lastName: string
    companyName?: string
  }
  contact?: {
    id: string
    firstName: string
    lastName: string
  }
  opportunity?: {
    id: string
    name: string
  }
  ownerEmployee?: {
    id: string
    firstName: string
    lastName: string
  }
}

export const SalesActivityDisplay: React.FC<SalesActivityDisplayProps> = ({ activityId, accessToken, operation }) => {
  const [activity, setActivity] = useState<SalesActivity | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const fetchActivity = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetSalesActivity($id: uuid!) {
            SalesActivity(where: { id: { _eq: $id } }) {
              id
              title
              description
              occurredAt
              completedAt
              activityType {
                value
              }
              account {
                id
                name
              }
              lead {
                id
                firstName
                lastName
                companyName
              }
              contact {
                id
                firstName
                lastName
              }
              opportunity {
                id
                name
              }
              ownerEmployee {
                id
                firstName
                lastName
              }
            }
          }
        `

        const result = await graphqlClient.request<{ SalesActivity: SalesActivity[] }>(query, {
          id: activityId
        })

        if (result.SalesActivity && result.SalesActivity.length > 0) {
          setActivity(result.SalesActivity[0])
        } else {
          setError('Sales activity not found')
        }
      } catch (err) {
        console.error('Error fetching sales activity:', err)
        setError('Failed to load sales activity')
      } finally {
        setIsLoading(false)
      }
    }

    if (activityId && accessToken) {
      fetchActivity()
    }
  }, [activityId, accessToken, graphqlClient])

  const operationBadge = getOperationBadge(operation)

  // Determine where to navigate based on the associated entity
  const handleClick = () => {
    if (!activity) return

    // Navigate to the associated entity (prioritize: account > opportunity > lead > contact)
    if (activity.account?.id) {
      const url = buildPlatformUrl('/platform/crm/account-record', {
        accountId: activity.account.id,
        source: 'every-ai'
      })
      navigateTo(url)
    } else if (activity.opportunity?.id) {
      const url = buildPlatformUrl('/platform/crm/opportunity-record', {
        opportunityId: activity.opportunity.id,
        source: 'every-ai'
      })
      navigateTo(url)
    } else if (activity.lead?.id) {
      const url = buildPlatformUrl('/platform/crm/lead-record', {
        leadId: activity.lead.id,
        source: 'every-ai'
      })
      navigateTo(url)
    } else if (activity.contact?.id) {
      const url = buildPlatformUrl('/platform/crm/contact-record', {
        contactId: activity.contact.id,
        source: 'every-ai'
      })
      navigateTo(url)
    }
  }

  // Get the associated entity name for display
  const getAssociatedEntityName = (): string | undefined => {
    if (activity?.account?.name) return activity.account.name
    if (activity?.opportunity?.name) return activity.opportunity.name
    if (activity?.lead) {
      const leadName = `${activity.lead.firstName} ${activity.lead.lastName}`.trim()
      return activity.lead.companyName ? `${leadName} (${activity.lead.companyName})` : leadName
    }
    if (activity?.contact) {
      return `${activity.contact.firstName} ${activity.contact.lastName}`.trim()
    }
    return undefined
  }

  // Get the entity type for the subtitle
  const getEntityType = (): string | undefined => {
    if (activity?.account) return 'Account'
    if (activity?.opportunity) return 'Opportunity'
    if (activity?.lead) return 'Lead'
    if (activity?.contact) return 'Contact'
    return undefined
  }

  // Format date for display
  const formatDate = (dateString?: string): string | undefined => {
    if (!dateString) return undefined
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return dateString
    }
  }

  // Activity icon (calendar/task style)
  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-success-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      </svg>
    </div>
  )

  const associatedEntity = getAssociatedEntityName()
  const entityType = getEntityType()

  // Build fields array
  const fields = activity
    ? ([
        associatedEntity && entityType && { label: entityType, value: associatedEntity },
        activity.activityType?.value && { label: 'Type', value: activity.activityType.value },
        activity.occurredAt && { label: 'Date', value: formatDate(activity.occurredAt) },
        activity.ownerEmployee && {
          label: 'Owner',
          value: `${activity.ownerEmployee.firstName} ${activity.ownerEmployee.lastName}`
        },
        activity.description && { label: 'Description', value: activity.description }
      ].filter(Boolean) as { label: string; value: string | undefined }[])
    : undefined

  return (
    <EntityCard
      title={activity?.title || 'Sales Activity'}
      subtitle={associatedEntity ? `${entityType}: ${associatedEntity}` : undefined}
      icon={icon}
      status={operationBadge?.text || activity?.activityType?.value}
      statusVariant={operationBadge?.variant}
      fields={fields}
      isLoading={isLoading}
      error={error || undefined}
      onClick={handleClick}
    />
  )
}

export default SalesActivityDisplay
