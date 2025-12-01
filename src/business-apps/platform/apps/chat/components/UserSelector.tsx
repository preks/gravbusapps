import React, { useState, useEffect, useRef } from 'react'
import { Input, Checkbox, Avatar, IconAvatar, Spinner } from '@newwork/nw-design-system'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useUserManagementClient } from '../hooks/useUserManagementClient'
import { useEmployeeAvatars } from '../hooks/useEmployeeAvatars'
import type { User } from '../types'
import { UserIcon } from 'lucide-react'

interface UserSelectorProps {
  selectedUserIds: string[]
  onSelectionChange: (userIds: string[]) => void
  currentUserId: string | null
  prefixDataTestId?: string
  accessToken?: string
}

export const UserSelector: React.FC<UserSelectorProps> = ({
  selectedUserIds,
  onSelectionChange,
  currentUserId,
  prefixDataTestId = 'user-selector',
  accessToken
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const currentOffsetRef = useRef(0)
  const isLoadingMoreRef = useRef(false)
  const hasLoadedRef = useRef(false)
  const lastSearchRef = useRef('')

  const LIMIT = 30

  // Use the user management client for fetching all employees
  const userManagementClient = useUserManagementClient(accessToken || '')
  const employeeAvatarsClient = useEmployeeAvatars(accessToken || '')

  // Load users on mount - only once
  useEffect(() => {
    if (hasLoadedRef.current || !userManagementClient) return
    hasLoadedRef.current = true

    const loadInitialUsers = async () => {
      try {
        setIsLoading(true)
        currentOffsetRef.current = 0

        // Use User Management to get ALL employees
        const results = await userManagementClient.searchUsers(undefined, LIMIT, 0)
        let fetchedUsers: User[] = results
          .filter(u => u.keycloakId !== currentUserId)
          .map(u => ({
            id: u.keycloakId,
            keycloakId: u.keycloakId,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            avatarUrl: u.avatarUrl,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))

        setHasMore(results.length >= LIMIT)

        // Fetch avatars if we have accessToken
        if (accessToken && fetchedUsers.length > 0) {
          const userIds = fetchedUsers.map(u => u.keycloakId || u.id)
          const avatarMap = await employeeAvatarsClient.fetchAvatars(userIds)
          fetchedUsers = fetchedUsers.map(user => ({
            ...user,
            avatarUrl: avatarMap.get(user.keycloakId || user.id) || user.avatarUrl
          }))
        }

        setUsers(fetchedUsers)
        currentOffsetRef.current = LIMIT
      } catch (err) {
        console.error('Error loading users:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialUsers()
  }, [userManagementClient, currentUserId])

  // Handle search with debounce
  useEffect(() => {
    if (!userManagementClient) return
    // Skip if same search
    if (lastSearchRef.current === searchQuery) return

    const timer = setTimeout(async () => {
      lastSearchRef.current = searchQuery

      try {
        setIsSearching(true)
        currentOffsetRef.current = 0

        // Use User Management to search ALL employees
        const results = await userManagementClient.searchUsers(searchQuery.trim() || undefined, LIMIT, 0)
        let searchResults: User[] = results
          .filter(u => u.keycloakId !== currentUserId)
          .map(u => ({
            id: u.keycloakId,
            keycloakId: u.keycloakId,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            avatarUrl: u.avatarUrl,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))

        setHasMore(results.length >= LIMIT)

        // Fetch avatars if we have accessToken
        if (accessToken && searchResults.length > 0) {
          const userIds = searchResults.map(u => u.keycloakId || u.id)
          const avatarMap = await employeeAvatarsClient.fetchAvatars(userIds)
          searchResults = searchResults.map(user => ({
            ...user,
            avatarUrl: avatarMap.get(user.keycloakId || user.id) || user.avatarUrl
          }))
        }

        setUsers(searchResults)
        currentOffsetRef.current = LIMIT
      } catch (err) {
        console.error('Error searching users:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, userManagementClient])

  // Handle scroll for infinite loading
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !userManagementClient) return

    const handleScroll = async () => {
      if (isLoadingMoreRef.current || !hasMore) return

      const { scrollTop, scrollHeight, clientHeight } = container
      // Load more when scrolled to 80% of the list
      if (scrollTop + clientHeight < scrollHeight * 0.8) return

      isLoadingMoreRef.current = true

      try {
        const results = await userManagementClient.searchUsers(
          searchQuery.trim() || undefined,
          LIMIT,
          currentOffsetRef.current
        )

        if (results.length === 0) {
          setHasMore(false)
          return
        }

        let newUsers: User[] = results
          .filter(u => u.keycloakId !== currentUserId)
          .map(u => ({
            id: u.keycloakId,
            keycloakId: u.keycloakId,
            username: u.username,
            firstName: u.firstName,
            lastName: u.lastName,
            email: u.email,
            avatarUrl: u.avatarUrl,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))

        // Fetch avatars
        if (accessToken && newUsers.length > 0) {
          const userIds = newUsers.map(u => u.keycloakId || u.id)
          const avatarMap = await employeeAvatarsClient.fetchAvatars(userIds)
          newUsers = newUsers.map(user => ({
            ...user,
            avatarUrl: avatarMap.get(user.keycloakId || user.id) || user.avatarUrl
          }))
        }

        setUsers(prev => [...prev, ...newUsers])
        currentOffsetRef.current += LIMIT
        setHasMore(results.length >= LIMIT)
      } catch (err) {
        console.error('Error loading more users:', err)
      } finally {
        isLoadingMoreRef.current = false
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [userManagementClient, hasMore, searchQuery])

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
    return user.username || 'Unknown'
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={prefixDataTestId}>
      {/* Search input */}
      <div className="gba:mb-3">
        <div className="gba:relative">
          <MagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
          <Input
            placeholder="Search users..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:!pl-10"
            data-testid={`${prefixDataTestId}-search`}
          />
        </div>
      </div>

      {/* User list */}
      <div
        ref={scrollContainerRef}
        className="gba:flex-1 gba:overflow-y-auto gba:border gba:border-border/50 gba:rounded-lg gba:bg-muted/20"
      >
        {isLoading ? (
          <div
            className="gba:flex gba:items-center gba:justify-center gba:p-8"
            data-testid={`${prefixDataTestId}-loading`}
          >
            <Spinner size="sm" />
          </div>
        ) : users.length === 0 ? (
          <div
            className="gba:p-8 gba:text-center gba:text-sm gba:text-muted-foreground"
            data-testid={`${prefixDataTestId}-empty`}
          >
            {searchQuery ? 'No users found' : 'No users available'}
          </div>
        ) : (
          <div data-testid={`${prefixDataTestId}-list`}>
            {users.map(user => {
              const userId = user.id || user.keycloakId
              const isSelected = selectedUserIds.includes(userId)

              return (
                <label
                  key={userId}
                  className={`gba:flex gba:items-center gba:gap-3 gba:p-3 gba:cursor-pointer gba:transition-colors gba:border-b gba:border-border/30 last:gba:border-b-0 ${
                    isSelected ? 'gba:bg-primary/5' : 'gba:hover:bg-muted/50'
                  }`}
                  data-testid={`${prefixDataTestId}-user-${userId}`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleUser(userId)}
                    data-testid={`${prefixDataTestId}-checkbox-${userId}`}
                  />

                  {user.avatarUrl ? (
                    <Avatar className="gba:w-9 gba:h-9 gba:flex-shrink-0">
                      <img
                        src={user.avatarUrl}
                        alt={getDisplayName(user)}
                        className="gba:w-full gba:h-full gba:object-cover gba:rounded-full"
                      />
                    </Avatar>
                  ) : (
                    <IconAvatar
                      className="gba:w-9 gba:h-9 gba:flex-shrink-0"
                      label={getDisplayName(user)}
                      icon={UserIcon}
                    />
                  )}

                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:text-sm gba:font-medium gba:truncate gba:text-foreground">
                      {getDisplayName(user)}
                    </div>
                    {user.email && (
                      <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{user.email}</div>
                    )}
                  </div>

                  {isSelected && <div className="gba:w-2 gba:h-2 gba:rounded-full gba:bg-primary gba:flex-shrink-0" />}
                </label>
              )
            })}

            {isSearching && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-3">
                <Spinner size="sm" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected count */}
      {selectedUserIds.length > 0 && (
        <div
          className="gba:mt-3 gba:text-xs gba:text-primary gba:font-medium"
          data-testid={`${prefixDataTestId}-count`}
        >
          {selectedUserIds.length} user{selectedUserIds.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}
