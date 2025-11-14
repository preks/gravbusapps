import React, { useState, useEffect } from 'react'
import { Input, IconAvatar, Spinner, Button, Avatar } from '@newwork/nw-design-system'
import { ArrowLeft } from '@phosphor-icons/react'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { User } from '../types'
import { UserIcon } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useUserManagementClient } from '../hooks/useUserManagementClient'
import { useEmployeeAvatars } from '../hooks/useEmployeeAvatars'

interface UserSearchProps {
  accessToken: string
  currentUserId: string | null
  onUserSelect: (user: User) => void
  onClose?: () => void
}

export const UserSearch: React.FC<UserSearchProps> = ({ accessToken, currentUserId, onUserSelect, onClose }) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const debouncedQuery = useDebounce(searchQuery, 300)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = React.useRef(false)
  const currentOffsetRef = React.useRef(0)

  // Get the client functions - don't add to effect dependencies as they change on every render
  const userManagementClient = useUserManagementClient(accessToken)
  const employeeAvatarsClient = useEmployeeAvatars(accessToken)

  const LIMIT = 20

  // Handle search query changes (includes initial load)
  useEffect(() => {
    let cancelled = false

    const handleSearch = async () => {
      if (!accessToken) return

      setIsLoading(true)

      try {
        const query = debouncedQuery.trim() || undefined

        // Fetch users from user management service
        const results = await userManagementClient.searchUsers(query, LIMIT, 0)

        if (cancelled) return

        // Filter out current user
        const filteredResults = results.filter(user => user.keycloakId !== currentUserId)

        // Check if there might be more results (check AFTER filtering)
        const moreAvailable = filteredResults.length >= LIMIT - 1

        // Fetch avatars for all users
        const userIds = filteredResults.map(u => u.keycloakId)
        const avatarMap = await employeeAvatarsClient.fetchAvatars(userIds)

        if (cancelled) return

        // Merge avatar data into user objects
        const usersWithAvatars = filteredResults.map(user => ({
          ...user,
          avatarUrl: avatarMap.get(user.keycloakId) || user.avatarUrl
        }))

        setUsers(usersWithAvatars)
        setHasMore(moreAvailable)
        currentOffsetRef.current = LIMIT
      } catch (error) {
        if (!cancelled) {
          console.error('Error searching users:', error)
          setUsers([])
          setHasMore(false)
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false)
        }
      }
    }

    handleSearch()

    return () => {
      cancelled = true
    }
    // Only re-run when query, token, or currentUserId changes - not when client functions change
  }, [debouncedQuery, accessToken, currentUserId])

  // Handle scroll to load more
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = async () => {
      if (!hasMore || isLoadingMoreRef.current || isLoading) return

      const { scrollTop, scrollHeight, clientHeight } = container
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight

      // Load more when within 100px of bottom
      if (distanceFromBottom < 100) {
        isLoadingMoreRef.current = true
        setIsLoadingMore(true)

        try {
          const query = debouncedQuery.trim() || undefined

          // Fetch more users from user management service
          const results = await userManagementClient.searchUsers(query, LIMIT, currentOffsetRef.current)

          // Filter out current user
          const filteredResults = results.filter(user => user.keycloakId !== currentUserId)

          // Check if there might be more results (check AFTER filtering)
          const moreAvailable = filteredResults.length >= LIMIT - 1

          // Fetch avatars for new users
          const userIds = filteredResults.map(u => u.keycloakId)
          const avatarMap = await employeeAvatarsClient.fetchAvatars(userIds)

          // Merge avatar data
          const usersWithAvatars = filteredResults.map(user => ({
            ...user,
            avatarUrl: avatarMap.get(user.keycloakId) || user.avatarUrl
          }))

          setUsers(prev => [...prev, ...usersWithAvatars])
          setHasMore(moreAvailable)
          currentOffsetRef.current = currentOffsetRef.current + LIMIT
        } catch (error) {
          console.error('Error loading more users:', error)
          setHasMore(false)
        } finally {
          setIsLoadingMore(false)
          isLoadingMoreRef.current = false
        }
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
    // Only re-run when these values change - not when client functions change
  }, [hasMore, isLoading, debouncedQuery, currentUserId])

  const handleUserClick = (user: User) => {
    onUserSelect(user)
    setSearchQuery('')
    setUsers([])
    onClose?.()
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="user-search">
      {/* Header with back button */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:border-b">
        {onClose && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="gba:flex-shrink-0"
            data-testid="user-search-back-button"
          >
            <ArrowLeft className="gba:w-5 gba:h-5" />
          </Button>
        )}
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder={getTranslationFromI18nKeyAndLabel('chat.searchForUsers', 'Search for users...')}
          className="gba:flex-1"
          data-testid="user-search-input"
        />
      </div>

      <div ref={scrollContainerRef} className="gba:flex-1 gba:overflow-y-auto">
        {isLoading && users.length === 0 ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:p-8">
            <Spinner />
          </div>
        ) : users.length === 0 ? (
          <div className="gba:p-8 gba:text-center gba:text-muted-foreground">
            {debouncedQuery.trim()
              ? getTranslationFromI18nKeyAndLabel('chat.noUsersFound', 'No users found')
              : getTranslationFromI18nKeyAndLabel('chat.noUsersAvailable', 'No users available')}
          </div>
        ) : (
          <>
            <div className="gba:divide-y">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-4 gba:min-h-[48px] gba:text-left gba:hover:bg-muted gba:transition-colors"
                  data-testid={`user-search-item-${user.id}`}
                >
                  {user.avatarUrl ? (
                    <Avatar className="gba:w-10 gba:h-10 gba:flex-shrink-0">
                      <img
                        src={user.avatarUrl}
                        alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
                        className="gba:w-full gba:h-full gba:object-cover"
                      />
                    </Avatar>
                  ) : (
                    <IconAvatar
                      className="gba:w-10 gba:h-10 gba:flex-shrink-0"
                      label={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
                      icon={UserIcon}
                    />
                  )}
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:font-medium gba:truncate">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                    </div>
                    <div className="gba:text-sm gba:text-muted-foreground gba:truncate">{user.email}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="gba:flex gba:items-center gba:justify-center gba:p-4">
                <Spinner size="sm" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
