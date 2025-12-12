import { useState, useEffect, useCallback, useRef } from 'react'
import { useUserManagementClient } from '@/common/network/users'
import type { User } from '@/common/network/users'

type UserSelectOption = User

interface UseUserSelectProps {
  value?: string | null
  onValueChange?: (value: string | null) => void
  onUserChange?: (user: UserSelectOption | null) => void
  accessToken?: string
  initialUser?: UserSelectOption | null
  activeOnly?: boolean
}

interface UseUserSelectReturn {
  users: UserSelectOption[]
  loading: boolean
  hasMore: boolean
  onSearch: (query: string) => void
  onLoadMore: () => void
  handleValueChange: (newValue: string | null) => void
}

/**
 * Transform User Management API user to UserSelectOption
 */
const transformUser = (user: User): UserSelectOption => {
  return user
}

export const useUserSelect = ({
  onValueChange,
  onUserChange,
  accessToken,
  initialUser,
  activeOnly = true
}: UseUserSelectProps): UseUserSelectReturn => {
  const [users, setUsers] = useState<UserSelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const currentOffsetRef = useRef(0)
  const hasInitialLoadRef = useRef(false)
  const userClient = useUserManagementClient(accessToken || '')

  const LIMIT = 20

  // Fetch users from API
  const fetchUsers = useCallback(
    async (query: string, offset: number, append: boolean = false) => {
      if (!accessToken) {
        return
      }

      setLoading(true)

      try {
        const response = await userClient.getUsers({
          searchParam: query.trim() || undefined,
          limit: LIMIT,
          offset
        })

        // Filter active users if needed
        let filteredUsers = response.data.map(transformUser)
        if (activeOnly) {
          filteredUsers = filteredUsers.filter(u => u.active)
        }

        if (append) {
          setUsers(prev => [...prev, ...filteredUsers])
        } else {
          setUsers(filteredUsers)
        }

        // Use actual filtered results length for hasMore calculation
        setHasMore(response.paging.offset + filteredUsers.length < response.paging.totalRecords)
        currentOffsetRef.current = offset + LIMIT
      } catch (error) {
        console.error('Error fetching users:', error)
        setUsers([])
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, userClient, activeOnly]
  )

  // Handle search
  const onSearch = useCallback(
    (query: string) => {
      setSearchQuery(query)
      currentOffsetRef.current = 0
      fetchUsers(query, 0, false)
    },
    [fetchUsers]
  )

  // Handle load more (infinite scroll)
  const onLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchUsers(searchQuery, currentOffsetRef.current, true)
    }
  }, [loading, hasMore, searchQuery, fetchUsers])

  // Handle value change
  const handleValueChange = useCallback(
    (newValue: string | null) => {
      onValueChange?.(newValue)

      // Also trigger onUserChange with user object
      if (onUserChange) {
        const selectedUser = users.find(u => u.id === newValue)
        onUserChange(selectedUser || null)
      }
    },
    [onValueChange, onUserChange, users]
  )

  // Initial load (empty search) - only runs once when accessToken is available
  useEffect(() => {
    if (accessToken && !loading && !hasInitialLoadRef.current) {
      hasInitialLoadRef.current = true
      fetchUsers('', 0, false)
    }
  }, [accessToken])

  // Include initial user in the list if provided and not already present
  const usersWithInitial = useCallback(() => {
    if (!initialUser) return users

    const hasInitialUser = users.some(u => u.id === initialUser.id)
    if (hasInitialUser) return users

    return [initialUser, ...users]
  }, [users, initialUser])

  return {
    users: usersWithInitial(),
    loading,
    hasMore,
    onSearch,
    onLoadMore,
    handleValueChange
  }
}
