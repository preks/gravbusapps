import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ContactOwner {
  id: string
  name: string
  displayName?: string
  firstName?: string
  lastName?: string
}

const GET_CONTACT_OWNERS_QUERY = `
  query GetContactOwners($where: ContactBoolExp, $limit: Int, $offset: Int) {
    Contact(
      where: $where
      limit: $limit
      offset: $offset
      distinctOn: [ownerEmployeeId]
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
    }
  }
`

export const useGetContactOwners = (context: BusinessAppContextProps, search: string = '', offset: number = 0) => {
  const [contactOwners, setContactOwners] = useState<ContactOwner[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<any>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchContactOwners = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Build where condition with employee search
      const whereCondition = {
        isDeleted: { _eq: false },
        ownerEmployee: {
          _and: [
            { id: { _isNull: false } },
            ...(search.trim()
              ? [
                  {
                    _or: [
                      { firstName: { _ilike: `%${search}%` } },
                      { lastName: { _ilike: `%${search}%` } },
                      { displayName: { _ilike: `%${search}%` } }
                    ]
                  }
                ]
              : [])
          ]
        }
      }

      const variables = {
        where: whereCondition,
        limit: 20,
        offset
      }

      const result = await graphqlClient.request(GET_CONTACT_OWNERS_QUERY, variables)

      if (result?.Contact) {
        const owners = result.Contact.filter((contact: any) => contact.ownerEmployee) // Ensure ownerEmployee exists
          .map((contact: any) => ({
            id: contact.ownerEmployee.id,
            name:
              contact.ownerEmployee.displayName ||
              `${contact.ownerEmployee.firstName || ''} ${contact.ownerEmployee.lastName || ''}`.trim() ||
              'Unknown Owner',
            displayName: contact.ownerEmployee.displayName,
            firstName: contact.ownerEmployee.firstName,
            lastName: contact.ownerEmployee.lastName
          }))
          .filter((owner: ContactOwner, index: number, self: ContactOwner[]) => {
            // Remove duplicates by owner ID
            return self.findIndex(o => o.id === owner.id) === index
          })
          .slice(0, 20) // Frontend enforcement of limit

        setContactOwners(owners)
      } else {
        setContactOwners([])
      }
    } catch (err) {
      console.error('Error fetching contact owners:', err)
      setError(err)
      setContactOwners([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, search, offset, graphqlClient])

  useEffect(() => {
    fetchContactOwners()
  }, [fetchContactOwners])

  return {
    contactOwners,
    isLoading,
    error
  }
}
