import React, { useState, useEffect, useCallback } from 'react'
import { Input, IconAvatar, Spinner, Button, Avatar, useTranslation } from '@newwork/nw-design-system'
import { ArrowLeft, MagnifyingGlass } from '@phosphor-icons/react'
import { useDebounce } from '@/common/hooks/useDebounce'
import type { User } from '../types'
import { UserIcon } from 'lucide-react'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import translations from '../_i18n'

interface UserSearchProps {
  accessToken: string
  currentUserId: string | null
  onUserSelect: (user: User) => void
  onClose?: () => void
}

interface EmployeeSearchResult {
  employeeId: string
  firstName: string
  lastName: string
  employee: {
    id: string
    displayName: string
    pictureThumbnail?: string
    userId: string
  }
  jobPosition?: {
    name: string
  }
  organizationalUnit?: {
    name: string
  }
}

export const UserSearch: React.FC<UserSearchProps> = ({ accessToken, currentUserId, onUserSelect, onClose }) => {
  const { t } = useTranslation(translations)
  const [searchQuery, setSearchQuery] = useState('')
  const [users, setUsers] = useState<User[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const debouncedQuery = useDebounce(searchQuery, 300)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const isLoadingMoreRef = React.useRef(false)
  const currentOffsetRef = React.useRef(0)

  const graphqlClient = useGraphQLClient(accessToken)
  const LIMIT = 20

  // Transform employee position data to User format
  const transformToUser = useCallback(
    (emp: EmployeeSearchResult): User => ({
      id: emp.employee?.userId || emp.employeeId,
      keycloakId: emp.employee?.userId,
      username: emp.employee?.displayName || `${emp.firstName} ${emp.lastName}`,
      email: '', // Not available from EmployeePosition
      firstName: emp.firstName,
      lastName: emp.lastName,
      displayName: emp.employee?.displayName,
      avatarUrl: emp.employee?.pictureThumbnail ? `data:image/png;base64,${emp.employee.pictureThumbnail}` : undefined,
      employeeId: emp.employeeId,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }),
    []
  )

  // Search employees from active org structure
  const searchEmployees = useCallback(
    async (search: string, limit: number, offset: number) => {
      const structureId = getCurrentActiveStructureId()
      if (!structureId) {
        console.error('[UserSearch] No active structure ID available from platform context')
        throw new Error('No active structure ID available. Please refresh the page or contact support.')
      }

      const searchPattern = search ? `%${search}%` : '%'

      const query = `
      query SearchStructureEmployees($structureId: uuid!, $search: String!, $limit: Int!, $offset: Int!) {
        EmployeePosition(
          where: {
            structureId: { _eq: $structureId },
            employee: { isDeleted: { _eq: false } },
            _or: [
              { firstName: { _ilike: $search } },
              { lastName: { _ilike: $search } },
              { employee: { displayName: { _ilike: $search } } }
            ]
          },
          limit: $limit,
          offset: $offset,
          orderBy: { firstName: ASC, lastName: ASC }
        ) {
          employeeId
          firstName
          lastName
          employee {
            id
            displayName
            pictureThumbnail
            userId
          }
          jobPosition {
            name
          }
          organizationalUnit {
            name
          }
        }
      }
    `

      const result = await graphqlClient.request<{ EmployeePosition: EmployeeSearchResult[] }>(query, {
        structureId,
        search: searchPattern,
        limit,
        offset
      })

      return result.EmployeePosition || []
    },
    [graphqlClient]
  )

  // Handle search query changes (includes initial load)
  useEffect(() => {
    let cancelled = false

    const handleSearch = async () => {
      if (!accessToken) return

      setIsLoading(true)

      try {
        const results = await searchEmployees(debouncedQuery.trim(), LIMIT, 0)

        if (cancelled) return

        // Transform and filter out current user
        const transformedUsers = results
          .map(transformToUser)
          .filter(user => user.keycloakId !== currentUserId && user.id !== currentUserId)

        setUsers(transformedUsers)
        setHasMore(results.length >= LIMIT)
        currentOffsetRef.current = LIMIT
      } catch (error) {
        if (!cancelled) {
          console.error('Error searching employees:', error)
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
  }, [debouncedQuery, accessToken, currentUserId, searchEmployees, transformToUser])

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
          const results = await searchEmployees(debouncedQuery.trim(), LIMIT, currentOffsetRef.current)

          // Transform and filter out current user
          const transformedUsers = results
            .map(transformToUser)
            .filter(user => user.keycloakId !== currentUserId && user.id !== currentUserId)

          setUsers(prev => [...prev, ...transformedUsers])
          setHasMore(results.length >= LIMIT)
          currentOffsetRef.current = currentOffsetRef.current + LIMIT
        } catch (error) {
          console.error('Error loading more employees:', error)
          setHasMore(false)
        } finally {
          setIsLoadingMore(false)
          isLoadingMoreRef.current = false
        }
      }
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoading, debouncedQuery, currentUserId, searchEmployees, transformToUser])

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
            placeholder={t('chat-searchForUsers')}
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
              {debouncedQuery.trim() ? t('chat-noUsersFound') : t('chat-noUsersAvailable')}
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
