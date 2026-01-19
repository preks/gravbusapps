import { useState, useEffect } from 'react'
import { OrgDirectoryClient, OrgUser } from './OrgDirectoryClient'

interface UseEmployeeDirectoryResult {
  users: OrgUser[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Hook for fetching all users from the employee directory via GraphQL
 * Uses the same queries as custom-flow-engine for consistency
 *
 * @param accessToken - Access token for authorization
 * @returns Object containing users data, loading state, error state, and refetch function
 */
export const useEmployeeDirectory = (accessToken: string): UseEmployeeDirectoryResult => {
  const [users, setUsers] = useState<OrgUser[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUsers = async () => {
    if (!accessToken) {
      console.log('useEmployeeDirectory: No access token, skipping fetch')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      console.log('useEmployeeDirectory: Fetching users from GraphQL...')
      const client = new OrgDirectoryClient(accessToken)
      const fetchedUsers = await client.getAllUsers()
      console.log('useEmployeeDirectory: Successfully fetched', fetchedUsers.length, 'users')
      setUsers(fetchedUsers)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users from employee directory'
      console.error('useEmployeeDirectory: Error fetching users:', errorMessage)
      setError(err instanceof Error ? err : new Error(errorMessage))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchUsers()
  }, [accessToken])

  return {
    users,
    loading,
    error,
    refetch: () => void fetchUsers()
  }
}
