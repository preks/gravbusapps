import { useState, useEffect, useCallback } from 'react'
import { OrgDirectoryClient, OrgUser } from './OrgDirectoryClient'

interface UseOrgUsersSearchOptions {
  search?: string
  limit?: number
  offset?: number
}

interface UseOrgUsersSearchResult {
  users: OrgUser[]
  loading: boolean
  error: Error | null
  hasMore: boolean
  refetch: () => void
}

/**
 * Hook for searching users from the org directory with pagination
 *
 * @param accessToken - Access token for authorization
 * @param options - Search options including search term, limit and offset
 * @returns Object containing users data, loading state, error state, hasMore flag and refetch function
 */
export const useOrgUsersSearch = (
  accessToken: string,
  options: UseOrgUsersSearchOptions = {}
): UseOrgUsersSearchResult => {
  const { search = '', limit = 20, offset = 0 } = options
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(false)

  const fetchUsers = useCallback(async () => {
    if (!accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const client = new OrgDirectoryClient(accessToken)
      const fetchedUsers = await client.getAllUsers()

      // Filter by search term if provided
      let filteredUsers = fetchedUsers
      if (search && search.trim()) {
        const searchLower = search.toLowerCase().trim()
        filteredUsers = fetchedUsers.filter(
          user =>
            user.name?.toLowerCase().includes(searchLower) ||
            user.email?.toLowerCase().includes(searchLower) ||
            user.userId?.toLowerCase().includes(searchLower)
        )
      }

      // Apply pagination
      const paginatedUsers = filteredUsers.slice(offset, offset + limit)
      setUsers(paginatedUsers)
      setHasMore(offset + limit < filteredUsers.length)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to search users'
      setError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }, [accessToken, search, limit, offset])

  useEffect(() => {
    void fetchUsers()
  }, [fetchUsers])

  return {
    users,
    loading,
    error,
    hasMore,
    refetch: () => void fetchUsers()
  }
}
