import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Input, Checkbox, Avatar, IconAvatar, Spinner } from '@newwork/nw-design-system'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import type { User } from '../types'
import { UserIcon } from 'lucide-react'

interface UserSelectorProps {
  selectedUserIds: string[]
  onSelectionChange: (userIds: string[]) => void
  currentUserId: string | null
  prefixDataTestId?: string
  accessToken?: string
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

  const graphqlClient = useGraphQLClient(accessToken || '')

  // Transform employee position data to User format
  const transformToUser = useCallback(
    (emp: EmployeeSearchResult): User => ({
      id: emp.employee?.userId || emp.employeeId,
      keycloakId: emp.employee?.userId,
      username: emp.employee?.displayName || `${emp.firstName} ${emp.lastName}`,
      email: '',
      firstName: emp.firstName,
      lastName: emp.lastName,
      displayName: emp.employee?.displayName,
      avatarUrl: emp.employee?.pictureThumbnail ? `data:image/png;base64,${emp.employee.pictureThumbnail}` : undefined,
      employeeId: emp.employeeId,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    []
  )

  // Search employees from active org structure
  const searchEmployees = useCallback(
    async (search: string, limit: number, offset: number) => {
      const structureId = getCurrentActiveStructureId()
      if (!structureId) {
        throw new Error('No active structure ID')
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

  // Load users on mount - only once
  useEffect(() => {
    if (hasLoadedRef.current || !accessToken) return
    hasLoadedRef.current = true

    const loadInitialUsers = async () => {
      try {
        setIsLoading(true)
        currentOffsetRef.current = 0

        const results = await searchEmployees('', LIMIT, 0)
        const fetchedUsers = results
          .map(transformToUser)
          .filter(u => u.keycloakId !== currentUserId && u.id !== currentUserId)

        setHasMore(results.length >= LIMIT)
        setUsers(fetchedUsers)
        currentOffsetRef.current = LIMIT
      } catch (err) {
        console.error('Error loading users:', err)
      } finally {
        setIsLoading(false)
      }
    }

    loadInitialUsers()
  }, [accessToken, currentUserId, searchEmployees, transformToUser])

  // Handle search with debounce
  useEffect(() => {
    if (!accessToken) return
    // Skip if same search
    if (lastSearchRef.current === searchQuery) return

    const timer = setTimeout(async () => {
      lastSearchRef.current = searchQuery

      try {
        setIsSearching(true)
        currentOffsetRef.current = 0

        const results = await searchEmployees(searchQuery.trim(), LIMIT, 0)
        const searchResults = results
          .map(transformToUser)
          .filter(u => u.keycloakId !== currentUserId && u.id !== currentUserId)

        setHasMore(results.length >= LIMIT)
        setUsers(searchResults)
        currentOffsetRef.current = LIMIT
      } catch (err) {
        console.error('Error searching users:', err)
      } finally {
        setIsSearching(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, accessToken, currentUserId, searchEmployees, transformToUser])

  // Handle scroll for infinite loading
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !accessToken) return

    const handleScroll = async () => {
      if (isLoadingMoreRef.current || !hasMore) return

      const { scrollTop, scrollHeight, clientHeight } = container
      // Load more when scrolled to 80% of the list
      if (scrollTop + clientHeight < scrollHeight * 0.8) return

      isLoadingMoreRef.current = true

      try {
        const results = await searchEmployees(searchQuery.trim(), LIMIT, currentOffsetRef.current)

        if (results.length === 0) {
          setHasMore(false)
          return
        }

        const newUsers = results
          .map(transformToUser)
          .filter(u => u.keycloakId !== currentUserId && u.id !== currentUserId)

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
  }, [accessToken, hasMore, searchQuery, currentUserId, searchEmployees, transformToUser])

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
