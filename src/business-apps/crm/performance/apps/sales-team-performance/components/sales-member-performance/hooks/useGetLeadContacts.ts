import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface LeadContact {
  id: string
  name: string
  firstName: string
  lastName: string
  email?: string
}

const GET_LEAD_CONTACTS_QUERY = `
  query GetLeadContacts($where: LeadBoolExp, $limit: Int, $offset: Int) {
    Lead(
      where: $where,
      limit: $limit,
      offset: $offset
    ) {
      contactId
      contact {
        id
        firstName
        lastName
        email
      }
    }
  }
`

export const useGetLeadContacts = (context: BusinessAppContextProps, search: string = '', offset: number = 0) => {
  const [leadContacts, setLeadContacts] = useState<LeadContact[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchLeadContacts = useCallback(async () => {
    if (!context.accessToken) {
      console.log('No access token available for lead contacts')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build where condition with contact search
      const whereCondition = {
        isDeleted: { _eq: false },
        contact: {
          _and: [
            { id: { _isNull: false } },
            ...(search.trim()
              ? [
                  {
                    _or: [
                      { firstName: { _ilike: `%${search}%` } },
                      { lastName: { _ilike: `%${search}%` } },
                      { email: { _ilike: `%${search}%` } }
                    ]
                  }
                ]
              : [])
          ]
        }
      }

      const variables = {
        where: whereCondition,
        limit: 50, // Increased limit to show more contacts
        offset
      }

      const result = await graphqlClient.request(GET_LEAD_CONTACTS_QUERY, variables)

      if (result?.Lead) {
        // Process and deduplicate contacts
        const contactMap = new Map<string, any>()

        result.Lead.forEach((lead: any) => {
          if (lead.contact && lead.contact.id) {
            const contactName = `${lead.contact.firstName || ''} ${lead.contact.lastName || ''}`.trim()

            // Use contact ID as key for deduplication (keep original ID for contact filtering)
            if (!contactMap.has(lead.contact.id) && contactName) {
              contactMap.set(lead.contact.id, {
                id: lead.contact.id, // Keep contact ID for proper filtering
                name: contactName,
                firstName: lead.contact.firstName,
                lastName: lead.contact.lastName,
                email: lead.contact.email
              })
            }
          }
        })

        // Convert map to array and sort alphabetically
        const contacts = Array.from(contactMap.values())
          .sort((a, b) => a.name.localeCompare(b.name))
          .slice(0, 20) // Reasonable limit for dropdown performance

        setLeadContacts(contacts)
      } else {
        setLeadContacts([])
      }
    } catch (err) {
      console.error('Error fetching lead contacts:', err)
      setError(err)
      setLeadContacts([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, search, offset]) // Removed graphqlClient from dependencies

  useEffect(() => {
    fetchLeadContacts()
  }, [fetchLeadContacts])

  return {
    leadContacts,
    isLoading,
    error,
    refetch: fetchLeadContacts
  }
}
