import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { AccountOption } from '../types'

interface UseAccountsListReturn {
  accounts: AccountOption[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  searchAccounts: (searchTerm: string) => void
  loadMoreAccounts: () => void
}

const ACCOUNTS_QUERY = (search: string, offset: number, limit: number) => `
  query GetAccounts {
    Account(
      where: {
        isDeleted: { _eq: false }
        ${
          search
            ? `_or: [
          { name: { _ilike: "%${search}%" } }
          { code: { _ilike: "%${search}%" } }
          { email: { _ilike: "%${search}%" } }
        ]`
            : ''
        }
      }
      limit: ${limit}
      offset: ${offset}
      orderBy: [{ name: ASC }]
    ) {
      id
      name
      code
      email
      website
      ownerEmployeeId
    }
    AccountAggregate(
      where: {
        isDeleted: { _eq: false }
        ${
          search
            ? `_or: [
          { name: { _ilike: "%${search}%" } }
          { code: { _ilike: "%${search}%" } }
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

export const useAccountsList = (accessToken: string): UseAccountsListReturn => {
  const graphqlClient = useGraphQLClient(accessToken)
  const [accounts, setAccounts] = useState<AccountOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [offset, setOffset] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const limit = 20

  const fetchAccounts = useCallback(
    async (search: string, currentOffset: number, append: boolean = false) => {
      if (!accessToken) return

      setIsLoading(true)
      setError(null)

      try {
        const query = ACCOUNTS_QUERY(search, currentOffset, limit)
        const result = await graphqlClient.request<{
          Account: any[]
          AccountAggregate: { aggregate: { count: number } }
        }>(query)

        const mappedAccounts: AccountOption[] = result.Account.map((account: any) => ({
          id: account.id,
          value: account.id,
          label: account.name || account.code || 'Unnamed Account',
          name: account.name || account.code || 'Unnamed Account',
          email: account.email,
          website: account.website,
          ownerEmployeeId: account.ownerEmployeeId // REQUIRED for convert lead payload
        }))

        setAccounts(prev => (append ? [...prev, ...mappedAccounts] : mappedAccounts))
        setTotalCount(result.AccountAggregate.aggregate.count)
      } catch (err) {
        console.error('Error fetching accounts:', err)
        setError('Failed to load accounts')
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  // Initial load
  useEffect(() => {
    fetchAccounts('', 0, false)
  }, [fetchAccounts])

  const searchAccounts = useCallback(
    (search: string) => {
      setSearchTerm(search)
      setOffset(0)
      fetchAccounts(search, 0, false)
    },
    [fetchAccounts]
  )

  const loadMoreAccounts = useCallback(() => {
    const newOffset = offset + limit
    setOffset(newOffset)
    fetchAccounts(searchTerm, newOffset, true)
  }, [offset, searchTerm, fetchAccounts])

  const hasMore = accounts.length < totalCount

  return {
    accounts,
    isLoading,
    error,
    hasMore,
    searchAccounts,
    loadMoreAccounts
  }
}
