/**
 * AddParticipantDropdown - Search and add participants to a call
 *
 * Allows searching for any user in the organization, not just conversation members.
 * Shows conversation participants as quick options, with a search for everyone else.
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { Avatar, AvatarImage, AvatarFallback, Input, Spinner } from '@newwork/nw-design-system'
import { UserPlus, Search, Users } from 'lucide-react'
import { useDebounce } from '@/common/hooks/useDebounce'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { CallParticipant } from '../services/webrtcClient'

interface AvailableParticipant {
  id: string
  odId: string
  odName: string
  avatarUrl?: string
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

interface AddParticipantDropdownProps {
  accessToken: string
  currentUserId: string | null
  /** Participants already in the call (to exclude from search) */
  participantsInCall: { id: string }[]
  /** Quick-access participants from conversation (shown at top) */
  conversationParticipants?: AvailableParticipant[]
  /** Called when a participant is selected */
  onAddParticipant: (participant: CallParticipant) => void
  prefixDataTestId?: string
  /** Button size variant */
  size?: 'default' | 'small'
}

const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

export const AddParticipantDropdown: React.FC<AddParticipantDropdownProps> = ({
  accessToken,
  currentUserId,
  participantsInCall,
  conversationParticipants = [],
  onAddParticipant,
  prefixDataTestId = 'add-participant',
  size = 'default'
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<AvailableParticipant[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const debouncedQuery = useDebounce(searchQuery, 300)
  const inputRef = useRef<HTMLInputElement>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  // Memoize the IDs of participants already in the call to prevent infinite loops
  const inCallIdsList = useMemo(() => participantsInCall.map(p => p.id), [participantsInCall])
  const inCallIds = useMemo(() => new Set(inCallIdsList), [inCallIdsList])

  // Conversation participants not in the call
  const availableConversationParticipants = useMemo(
    () => conversationParticipants.filter(p => !inCallIds.has(p.id) && p.id !== currentUserId),
    [conversationParticipants, inCallIds, currentUserId]
  )

  // Transform employee to participant format
  const transformToParticipant = useCallback((emp: EmployeeSearchResult): AvailableParticipant | null => {
    const userId = emp.employee?.userId
    if (!userId) return null

    return {
      id: userId,
      odId: userId,
      odName: emp.employee?.displayName || `${emp.firstName} ${emp.lastName}`.trim(),
      avatarUrl: emp.employee?.pictureThumbnail ? `data:image/png;base64,${emp.employee.pictureThumbnail}` : undefined
    }
  }, [])

  // Search employees via GraphQL
  const searchEmployees = useCallback(
    async (search: string): Promise<AvailableParticipant[]> => {
      const structureId = getCurrentActiveStructureId()
      if (!structureId) {
        console.warn('No active structure ID for employee search')
        return []
      }

      const searchPattern = `%${search}%`

      const query = `
        query SearchStructureEmployees($structureId: uuid!, $search: String!, $limit: Int!) {
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
        limit: 20
      })

      return (result.EmployeePosition || [])
        .map(transformToParticipant)
        .filter((p): p is AvailableParticipant => p !== null)
    },
    [graphqlClient, transformToParticipant]
  )

  // Use ref to access current inCallIds without triggering re-renders
  const inCallIdsRef = useRef(inCallIds)
  inCallIdsRef.current = inCallIds

  const currentUserIdRef = useRef(currentUserId)
  currentUserIdRef.current = currentUserId

  // Search when query changes
  useEffect(() => {
    if (!debouncedQuery.trim() || debouncedQuery.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    let cancelled = false

    const doSearch = async () => {
      setIsSearching(true)
      try {
        const results = await searchEmployees(debouncedQuery.trim())
        if (!cancelled) {
          // Filter out current user and those already in call (use refs to get current values)
          const filtered = results.filter(p => p.id !== currentUserIdRef.current && !inCallIdsRef.current.has(p.id))
          setSearchResults(filtered)
        }
      } catch (error) {
        console.error('Error searching employees:', error)
        if (!cancelled) {
          setSearchResults([])
        }
      } finally {
        if (!cancelled) {
          setIsSearching(false)
        }
      }
    }

    doSearch()

    return () => {
      cancelled = true
    }
  }, [debouncedQuery, searchEmployees])

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
    } else {
      setSearchQuery('')
      setSearchResults([])
    }
  }, [isOpen])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    // Use setTimeout to avoid closing immediately after opening
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
    }, 0)

    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Close on escape key
  useEffect(() => {
    if (!isOpen) return

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // Container ref for click-outside handling
  const containerRef = useRef<HTMLDivElement>(null)

  const handleSelect = (participant: AvailableParticipant) => {
    onAddParticipant({
      id: participant.id,
      odId: participant.odId,
      odName: participant.odName,
      avatarUrl: participant.avatarUrl
    })
    setIsOpen(false)
    setSearchQuery('')
    setSearchResults([])
  }

  const totalAvailable = availableConversationParticipants.length

  // Participants to show (search results or conversation participants)
  const showSearchResults = searchQuery.trim().length >= 2
  const displayParticipants = showSearchResults ? searchResults : availableConversationParticipants

  return (
    <div ref={containerRef} className="gba:relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`gba:rounded-full gba:bg-gray-700 hover:gba:bg-gray-600 gba:text-white gba:transition-all gba:relative ${
          size === 'small' ? 'gba:p-3' : 'gba:p-4'
        }`}
        title={getTranslationFromI18nKeyAndLabel('chat.addParticipant', 'Add participant')}
        data-testid={`${prefixDataTestId}-btn`}
      >
        <UserPlus className={size === 'small' ? 'gba:w-5 gba:h-5' : 'gba:w-6 gba:h-6'} />
        {totalAvailable > 0 && (
          <span className="gba:absolute gba:-top-1 gba:-right-1 gba:bg-primary gba:text-white gba:text-xs gba:rounded-full gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center">
            {totalAvailable > 9 ? '9+' : totalAvailable}
          </span>
        )}
      </button>

      {/* Dropdown panel - positioned inline, not as a portal */}
      {isOpen && (
        <div className="gba:absolute gba:bottom-full gba:left-1/2 gba:-translate-x-1/2 gba:mb-2 gba:w-80 gba:bg-popover gba:border gba:border-border gba:rounded-lg gba:shadow-lg gba:z-50 gba:max-h-[400px] gba:flex gba:flex-col gba:overflow-hidden">
          {/* Search Input */}
          <div className="gba:p-3 gba:border-b gba:border-border">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={getTranslationFromI18nKeyAndLabel('chat.searchPeople', 'Search people...')}
                className="gba:pl-9 gba:h-9"
                data-testid={`${prefixDataTestId}-search-input`}
              />
            </div>
          </div>

          {/* Results List */}
          <div className="gba:flex-1 gba:overflow-y-auto gba:max-h-[300px]">
            {isSearching ? (
              <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                <Spinner size="sm" />
              </div>
            ) : displayParticipants.length === 0 ? (
              <div className="gba:py-8 gba:text-center gba:text-muted-foreground gba:text-sm">
                {showSearchResults ? (
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
                    <Search className="gba:w-8 gba:h-8 gba:opacity-50" />
                    <span>{getTranslationFromI18nKeyAndLabel('chat.noUsersFound', 'No users found')}</span>
                  </div>
                ) : (
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-2 gba:px-4">
                    <Users className="gba:w-8 gba:h-8 gba:opacity-50" />
                    <span>
                      {getTranslationFromI18nKeyAndLabel('chat.searchToAddPeople', 'Search to add people to the call')}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="gba:py-1">
                {/* Section header */}
                {!showSearchResults && availableConversationParticipants.length > 0 && (
                  <div className="gba:px-3 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                    {getTranslationFromI18nKeyAndLabel('chat.fromConversation', 'From this conversation')}
                  </div>
                )}
                {showSearchResults && searchResults.length > 0 && (
                  <div className="gba:px-3 gba:py-2 gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wider">
                    {getTranslationFromI18nKeyAndLabel('chat.searchResults', 'Search results')}
                  </div>
                )}

                {/* Participant list */}
                {displayParticipants.map(participant => (
                  <button
                    key={participant.id}
                    onClick={() => handleSelect(participant)}
                    className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:text-left hover:gba:bg-muted gba:transition-colors"
                    data-testid={`${prefixDataTestId}-item-${participant.id}`}
                  >
                    <Avatar className="gba:h-9 gba:w-9 gba:flex-shrink-0">
                      {participant.avatarUrl ? (
                        <AvatarImage src={participant.avatarUrl} alt={participant.odName} />
                      ) : null}
                      <AvatarFallback className="gba:text-sm">{getInitials(participant.odName)}</AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:text-sm gba:font-medium gba:truncate">{participant.odName}</div>
                    </div>
                    <UserPlus className="gba:w-4 gba:h-4 gba:text-muted-foreground gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer hint */}
          <div className="gba:px-3 gba:py-2 gba:border-t gba:border-border gba:text-xs gba:text-muted-foreground gba:bg-muted/30">
            💡{' '}
            {getTranslationFromI18nKeyAndLabel('chat.searchHint', 'Type at least 2 characters to search all employees')}
          </div>
        </div>
      )}
    </div>
  )
}
