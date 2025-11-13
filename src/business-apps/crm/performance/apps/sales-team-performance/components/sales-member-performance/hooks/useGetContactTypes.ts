import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ContactTypeOption {
  id: string
  name: string
}

export interface UseGetContactTypesReturn {
  contactTypeOptions: ContactTypeOption[]
  isLoading: boolean
  error: Error | null
}

const GET_CONTACT_TYPES_QUERY = `
  query GetContactTypes($search: String) {
    Contact(
      where: {
        _and: [
          { contactType: { _isNull: false } }
          { contactType: { _neq: "" } }
          { contactType: { _ilike: $search } }
        ]
      }
              distinctOn: [contactType]
      orderBy: [{ contactType: ASC_NULLS_LAST }]
      limit: 100
    ) {
      contactType
    }
  }
`

export const useGetContactTypes = (context: BusinessAppContextProps, search: string = ''): UseGetContactTypesReturn => {
  const [contactTypeOptions, setContactTypeOptions] = useState<ContactTypeOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchContactTypes = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const searchPattern = search ? `%${search}%` : '%'
      const result = await graphqlClient.request(GET_CONTACT_TYPES_QUERY, {
        search: searchPattern
      })

      if (result?.Contact) {
        const options = result.Contact.filter((contact: any) => contact.contactType)
          .map((contact: any, index: number) => ({
            id: `contact-type-${contact.contactType}-${index}`,
            name: contact.contactType
          }))
          .sort((a: ContactTypeOption, b: ContactTypeOption) => a.name.localeCompare(b.name))
        setContactTypeOptions(options)
      } else {
        setContactTypeOptions([])
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch contact types'))
      console.error('Error fetching contact types:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, search, graphqlClient])

  useEffect(() => {
    fetchContactTypes()
  }, [fetchContactTypes])

  return {
    contactTypeOptions,
    isLoading,
    error
  }
}
