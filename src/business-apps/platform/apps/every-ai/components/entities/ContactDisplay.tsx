import React, { useState, useEffect } from 'react'
import { EntityCard } from './EntityCard'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { getOperationBadge } from './utils/displayUtils'

interface ContactDisplayProps {
  contactId: string
  accessToken: string
  operation?: 'create' | 'update' | 'delete' | 'read'
}

interface Contact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  jobTitle?: string
  account?: { name: string }
}

export const ContactDisplay: React.FC<ContactDisplayProps> = ({ contactId, accessToken, operation }) => {
  const [contact, setContact] = useState<Contact | null>(null)
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

    const fetchContact = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const query = `
          query GetContact($id: uuid!) {
            customerContacts_by_pk(id: $id) {
              id
              firstName
              lastName
              email
              phone
              jobTitle
              account {
                name
              }
            }
          }
        `

        const result = await graphqlClient.request<{ customerContacts_by_pk: Contact }>(query, { id: contactId })

        if (result.customerContacts_by_pk) {
          setContact(result.customerContacts_by_pk)
        } else {
          setError('Contact not found')
        }
      } catch (err) {
        console.error('Error fetching contact:', err)
        setError('Failed to load contact')
      } finally {
        setIsLoading(false)
      }
    }

    if (contactId && accessToken) {
      fetchContact()
    }
  }, [contactId, accessToken, graphqlClient, operation])

  const operationBadge = getOperationBadge(operation)

  const handleClick = () => {
    if (contactId) {
      const url = buildPlatformUrl('/platform/crm/contact-record', {
        contactId: contactId,
        source: 'every-ai'
      })
      navigateTo(url)
    }
  }

  const icon = (
    <div className="gba:h-12 gba:w-12 gba:rounded-full gba:bg-success-secondary gba:flex gba:items-center gba:justify-center">
      <svg className="gba:h-6 gba:w-6 gba:text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
        />
      </svg>
    </div>
  )

  return (
    <EntityCard
      title={contact ? `${contact.firstName} ${contact.lastName}` : 'Contact'}
      subtitle={contact?.jobTitle || contact?.account?.name}
      icon={icon}
      status={operationBadge?.text}
      statusVariant={operationBadge?.variant}
      fields={
        contact
          ? [
              { label: 'Email', value: contact.email },
              { label: 'Phone', value: contact.phone },
              { label: 'Company', value: contact.account?.name }
            ]
          : undefined
      }
      isLoading={isLoading}
      error={error || undefined}
      onClick={handleClick}
    />
  )
}

export default ContactDisplay
