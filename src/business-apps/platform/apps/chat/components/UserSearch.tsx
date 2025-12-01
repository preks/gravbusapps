import React, { useState, useEffect } from 'react'
import { Input, IconAvatar, Spinner, Button, Avatar } from '@newwork/nw-design-system'
import { ArrowLeft, MagnifyingGlass } from '@phosphor-icons/react'
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
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid="user-search">
      {/* Header with back button and search */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:border-b gba:border-border/50 gba:bg-background/50 gba:backdrop-blur-sm">
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="gba:h-8 gba:w-8 gba:flex-shrink-0"
            data-testid="user-search-back-button"
          >
            <ArrowLeft className="gba:w-4 gba:h-4" />
          </Button>
        )}
        <div className="gba:relative gba:flex-1">
          <MagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={getTranslationFromI18nKeyAndLabel('chat.searchForUsers', 'Search for users...')}
            className="gba:h-8 gba:text-sm gba:!pl-10 gba:bg-background/50"
            data-testid="user-search-input"
            autoFocus
          />
        </div>
      </div>

      <div ref={scrollContainerRef} className="gba:flex-1 gba:overflow-y-auto gba:min-h-0">
        {isLoading && users.length === 0 ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:p-6">
            <Spinner size="sm" />
          </div>
        ) : users.length === 0 ? (
          <div className="gba:p-6 gba:text-center">
            <p className="gba:text-sm gba:text-muted-foreground">
              {debouncedQuery.trim()
                ? getTranslationFromI18nKeyAndLabel('chat.noUsersFound', 'No users found')
                : getTranslationFromI18nKeyAndLabel('chat.noUsersAvailable', 'No users available')}
            </p>
          </div>
        ) : (
          <>
            <div className="gba:py-1">
              {users.map(user => (
                <button
                  key={user.id}
                  onClick={() => handleUserClick(user)}
                  className="gba:w-full gba:flex gba:items-center gba:gap-2.5 gba:px-3 gba:py-2 gba:mx-1 gba:text-left gba:hover:bg-muted/80 gba:transition-colors gba:rounded-lg"
                  style={{ width: 'calc(100% - 8px)' }}
                  data-testid={`user-search-item-${user.id}`}
                >
                  {user.avatarUrl ? (
                    <Avatar className="gba:w-9 gba:h-9 gba:flex-shrink-0 gba:ring-2 gba:ring-background">
                      <img
                        src={user.avatarUrl}
                        alt={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
                        className="gba:w-full gba:h-full gba:object-cover gba:rounded-full"
                      />
                    </Avatar>
                  ) : (
                    <IconAvatar
                      className="gba:w-9 gba:h-9 gba:flex-shrink-0"
                      label={`${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username}
                      icon={UserIcon}
                    />
                  )}
                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:text-sm gba:font-medium gba:truncate gba:text-foreground">
                      {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.username}
                    </div>
                    <div className="gba:text-xs gba:text-muted-foreground gba:truncate">{user.email}</div>
                  </div>
                </button>
              ))}
            </div>

            {/* Loading more indicator */}
            {isLoadingMore && (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-3">
                <Spinner size="sm" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
