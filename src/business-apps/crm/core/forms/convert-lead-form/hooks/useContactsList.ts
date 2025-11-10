import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ContactOption } from '../types'

interface UseContactsListReturn {
  contacts: ContactOption[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  searchContacts: (searchTerm: string) => void
  loadMoreContacts: () => void
}

const CONTACTS_QUERY = (search: string, offset: number, limit: number) => `
  query GetContacts {
    Contact(
      where: {
        isDeleted: { _eq: false }
        ${
          search
            ? `_or: [
          { firstName: { _ilike: "%${search}%" } }
          { lastName: { _ilike: "%${search}%" } }
          { email: { _ilike: "%${search}%" } }
        ]`
            : ''
        }
      }
      limit: ${limit}
      offset: ${offset}
      orderBy: [{ firstName: ASC }, { lastName: ASC }]
    ) {
      id
      firstName
      lastName
      email
      jobTitle
    }
    ContactAggregate(
      where: {
        isDeleted: { _eq: false }
        ${
          search
            ? `_or: [
          { firstName: { _ilike: "%${search}%" } }
          { lastName: { _ilike: "%${search}%" } }
          { email: { _ilike: "%${search}%" } }
        ]`
            : ''
        }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

export const useContactsList = (accessToken: string): UseContactsListReturn => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [contacts, setContacts] = useState<ContactOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 20

  const fetchContacts = useCallback(
    async (search: string, currentOffset: number, append: boolean = false) => {
      if (!accessToken) return

      setIsLoading(true)
      setError(null)

      try {
        const query = CONTACTS_QUERY(search, currentOffset, limit)
        const result = await graphqlClient.request<{
          Contact: any[]
          ContactAggregate: { aggregate: { count: number } }
        }>(query)

        const mappedContacts: ContactOption[] = result.Contact.map((contact: any) => ({
          id: contact.id,
          value: contact.id,
          label: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact',
          name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim() || 'Unnamed Contact',
          email: contact.email,
          jobPosition: contact.jobTitle
        }))

        setContacts(prev => (append ? [...prev, ...mappedContacts] : mappedContacts))
        setTotalCount(result.ContactAggregate.aggregate.count)
      } catch (err) {
        console.error('Error fetching contacts:', err)
        setError('Failed to load contacts')
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  // Initial load
  useEffect(() => {
    fetchContacts('', 0, false)
  }, [fetchContacts])

  const searchContacts = useCallback(
    (search: string) => {
      setSearchTerm(search)
      setOffset(0)
      fetchContacts(search, 0, false)
    },
    [fetchContacts]
  )

  const loadMoreContacts = useCallback(() => {
    const newOffset = offset + limit
    setOffset(newOffset)
    fetchContacts(searchTerm, newOffset, true)
  }, [offset, searchTerm, fetchContacts])

  const hasMore = contacts.length < totalCount

  return {
    contacts,
    isLoading,
    error,
    hasMore,
    searchContacts,
    loadMoreContacts
  }
}
