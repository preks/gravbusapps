import React, { useState, useEffect, useCallback } from 'react'
import { Input, Checkbox, Avatar, Spinner } from '@newwork/nw-design-system'
import { ChatApiClient } from '../services/chatApiClient'
import type { User } from '../types'

interface UserSelectorProps {
  apiClient: ChatApiClient | null
  selectedUserIds: string[]
  onSelectionChange: (userIds: string[]) => void
  currentUserId: string | null
  prefixDataTestId?: string
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  apiClient,
  selectedUserIds,
  onSelectionChange,
  currentUserId,
  prefixDataTestId = 'user-selector'
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  // Load recent users on mount
  useEffect(() => {
    if (apiClient) {
      loadRecentUsers()
    }
  }, [apiClient])

  const loadRecentUsers = async () => {
    if (!apiClient) return

    try {
      setIsLoading(true)
      const recentUsers = await apiClient.getRecentlyActiveUsers(20)
      // Filter out current user
      const filteredUsers = recentUsers.filter(u => u.id !== currentUserId)
      setUsers(filteredUsers)
    } catch (err) {
      console.error('Error loading recent users:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = useCallback(
    async (query: string) => {
      if (!apiClient || !query.trim()) {
        loadRecentUsers()
        return
      }

      try {
        setIsSearching(true)
        const searchResults = await apiClient.searchUsers(query, 20)
        // Filter out current user
        const filteredUsers = searchResults.filter(u => u.id !== currentUserId)
        setUsers(filteredUsers)
      } catch (err) {
        console.error('Error searching users:', err)
      } finally {
        setIsSearching(false)
      }
    },
    [apiClient, currentUserId]
  )

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, handleSearch])

  const toggleUser = (userId: string) => {
    if (selectedUserIds.includes(userId)) {
      onSelectionChange(selectedUserIds.filter(id => id !== userId))
    } else {
      onSelectionChange([...selectedUserIds, userId])
    }
  }

  const getDisplayName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim()
    }
    return user.username
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={prefixDataTestId}>
      {/* Search input */}
      <div className="gba:mb-4">
        <Input
          placeholder="Search users..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          data-testid={`${prefixDataTestId}-search`}
        />
      </div>

      {/* User list */}
      <div className="gba:flex-1 gba:overflow-y-auto gba:border gba:border-border gba:rounded-md">
        {isLoading || isSearching ? (
          <div
            className="gba:flex gba:items-center gba:justify-center gba:p-8"
            data-testid={`${prefixDataTestId}-loading`}
          >
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <div className="gba:p-8 gba:text-center gba:text-muted-foreground" data-testid={`${prefixDataTestId}-empty`}>
            {searchQuery ? 'No users found' : 'No recent users'}
          </div>
        ) : (
          <div className="gba:divide-y" data-testid={`${prefixDataTestId}-list`}>
            {users.map(user => (
              <label
                key={user.id}
                className="gba:flex gba:items-center gba:p-3 gba:cursor-pointer gba:hover:bg-accent gba:transition-colors"
                data-testid={`${prefixDataTestId}-user-${user.id}`}
              >
                <Checkbox
                  checked={selectedUserIds.includes(user.id)}
                  onCheckedChange={() => toggleUser(user.id)}
                  className="gba:mr-3"
                  data-testid={`${prefixDataTestId}-checkbox-${user.id}`}
                />
                <Avatar
                  /* src={user.avatarUrl}
                  fallback={user.username.charAt(0).toUpperCase()} */
                  className="gba:mr-3"
                />
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:font-medium gba:truncate">{getDisplayName(user)}</div>
                  {user.email && <div className="gba:text-sm gba:text-muted-foreground gba:truncate">{user.email}</div>}
                </div>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Selected count */}
      {selectedUserIds.length > 0 && (
        <div className="gba:mt-4 gba:text-sm gba:text-muted-foreground" data-testid={`${prefixDataTestId}-count`}>
          {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}
