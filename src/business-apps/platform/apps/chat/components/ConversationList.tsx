import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Button, Input, Spinner, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import {
  PlusIcon,
  MagnifyingGlassIcon,
  UserIcon,
  UsersThreeIcon,
  CaretDownIcon,
  CaretUpIcon
} from '@phosphor-icons/react'
import { ConversationItem } from './ConversationItem'
import { UserSearch } from './UserSearch'
import { UserStatusDropdown } from './UserStatusDropdown'
import type { Conversation } from '../types'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import type { PresenceData } from '../hooks/usePresence'
import type { ConversationFilterKind } from '../hooks/useConversations'
import { useChatTranslation } from '../contexts/TranslationContext'

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onConversationSelect: (conversation: Conversation) => void
  onRemoveConversation?: (conversationId: string) => void
  onCreateConversation?: (user: any) => void
  onCreateGroup?: () => void
  isLoading?: boolean
  isLoadingMore?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  currentUserId?: string | null
  accessToken: string
  compact?: boolean
  presenceMap: ReadonlyMap<string, PresenceData>
  presenceVersion: number
  conversationExpertCounts?: Map<string, number>
  wsClient?: ChatWebSocketClient | null
  isConnected?: boolean
  search?: string
  filterKind?: ConversationFilterKind
  unreadOnly?: boolean
  onSearchChange?: (value: string) => void
  onFilterKindChange?: (kind: ConversationFilterKind) => void
  onUnreadOnlyChange?: (value: boolean) => void
}

// Helper to get the other participant's user ID from a direct conversation
const getOtherParticipantUserId = (conversation: Conversation, currentUserId?: string | null): string | null => {
  if (conversation.type !== 'direct' || !conversation.participants) {
    return null
  }
  const otherParticipant = conversation.participants.find(
    p => p.userId !== currentUserId && p.user?.id !== currentUserId
  )
  return otherParticipant?.userId || otherParticipant?.user?.id || null
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations,
  activeConversationId,
  onConversationSelect,
  onRemoveConversation,
  onCreateConversation,
  onCreateGroup,
  isLoading = false,
  isLoadingMore = false,
  hasMore = false,
  onLoadMore,
  currentUserId = null,
  accessToken,
  compact = false,
  presenceMap,
  presenceVersion,
  conversationExpertCounts,
  wsClient = null,
  isConnected = false,
  search = '',
  filterKind = 'all',
  unreadOnly = false,
  onSearchChange,
  onFilterKindChange,
  onUnreadOnlyChange
}) => {
  const t = useChatTranslation()
  // Force re-render when presenceVersion changes
  void presenceVersion

  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showNewChatMenu, setShowNewChatMenu] = useState(false)
  const [filtersNeedFolding, setFiltersNeedFolding] = useState(false)
  const [chipsThatFitInOneLine, setChipsThatFitInOneLine] = useState(4)
  const [filtersExpanded, setFiltersExpanded] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const filterContainerRef = useRef<HTMLDivElement>(null)
  const filterMeasureRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = filterContainerRef.current
    const measure = filterMeasureRef.current
    if (!container || !measure) return
    const gap = 6
    const chevronSpace = 28
    const check = () => {
      const containerWidth = container.clientWidth
      const available = containerWidth - chevronSpace
      const children = measure.children
      let width = 0
      let fitCount = 0
      for (let i = 0; i < children.length; i++) {
        const w = (children[i] as HTMLElement).offsetWidth + (i > 0 ? gap : 0)
        if (width + w <= available) {
          width += w
          fitCount = i + 1
        } else break
      }
      const needFolding = fitCount < 4
      setFiltersNeedFolding(needFolding)
      setChipsThatFitInOneLine(Math.max(1, fitCount))
    }
    check()
    const ro = new ResizeObserver(check)
    ro.observe(container)
    return () => ro.disconnect()
  }, [])

  // Deduplicate conversations by ID (defensive programming - duplicates should be rare after fixes)
  // List is backend-filtered; no client-side search/filter
  const uniqueConversations = useMemo(() => {
    const seen = new Set<string>()
    const duplicates: string[] = []

    const filtered = conversations.filter(conv => {
      if (seen.has(conv.id)) {
        duplicates.push(conv.id)
        return false
      }
      seen.add(conv.id)
      return true
    })

    if (duplicates.length > 0 && process.env.NODE_ENV === 'development') {
      console.debug('[ConversationList] Filtered out duplicate conversations:', duplicates)
    }

    return filtered
  }, [conversations])

  const hasActiveFilters = (search?.trim()?.length ?? 0) > 0 || filterKind !== 'all' || unreadOnly

  /** Line 1 order: Unread always, then selected kind (if any), then unselected in order Direct, Group, Meeting */
  const filterChipOrder = useMemo(() => {
    const kinds = ['direct', 'group', 'meeting'] as const
    const selected = filterKind !== 'all' ? filterKind : null
    const unselected = kinds.filter(k => k !== filterKind)
    return ['unread', ...(selected ? [selected] : []), ...unselected] as const
  }, [filterKind])

  const handleKindChipClick = (kind: 'direct' | 'group' | 'meeting') => {
    if (!onFilterKindChange) return
    if (filterKind === kind) {
      onFilterKindChange('all')
    } else {
      onFilterKindChange(kind)
    }
  }

  const handleUserSelect = async (user: any) => {
    if (onCreateConversation) {
      await onCreateConversation(user)
    }
    setShowUserSearch(false)
  }

  const renderFilterChipRow = () => (
    <>
      <Button
        variant={unreadOnly ? 'default' : 'outline'}
        size="sm"
        className="gba:h-7 gba:text-xs"
        onClick={() => onUnreadOnlyChange?.(!unreadOnly)}
        data-testid="conversation-filter-unread"
      >
        {t('chat-filterUnreadOnly')}
      </Button>
      <Button
        variant={filterKind === 'direct' ? 'default' : 'outline'}
        size="sm"
        className="gba:h-7 gba:text-xs"
        onClick={() => handleKindChipClick('direct')}
        data-testid="conversation-filter-direct"
      >
        {t('chat-filterDirect')}
      </Button>
      <Button
        variant={filterKind === 'group' ? 'default' : 'outline'}
        size="sm"
        className="gba:h-7 gba:text-xs"
        onClick={() => handleKindChipClick('group')}
        data-testid="conversation-filter-group"
      >
        {t('chat-filterGroup')}
      </Button>
      <Button
        variant={filterKind === 'meeting' ? 'default' : 'outline'}
        size="sm"
        className="gba:h-7 gba:text-xs"
        onClick={() => handleKindChipClick('meeting')}
        data-testid="conversation-filter-meeting"
      >
        {t('chat-filterMeetingChats')}
      </Button>
    </>
  )

  const renderFilterChips = () => {
    if (filtersNeedFolding) {
      if (filtersExpanded) {
        return (
          <>
            {renderFilterChipRow()}
            <button
              type="button"
              onClick={() => setFiltersExpanded(false)}
              className="gba:flex-shrink-0 gba:p-1 gba:rounded gba:hover:bg-accent/50 gba:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-primary"
              aria-label={t('chat-filtersCollapse')}
              data-testid="conversation-filters-collapse"
            >
              <CaretUpIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" aria-hidden />
            </button>
          </>
        )
      }
      const onLine1 = filterChipOrder.slice(0, chipsThatFitInOneLine)
      const onLine2 = filterChipOrder.slice(chipsThatFitInOneLine)
      const renderChip = (key: 'unread' | 'direct' | 'group' | 'meeting') => {
        if (key === 'unread') {
          return (
            <Button
              key="unread"
              variant={unreadOnly ? 'default' : 'outline'}
              size="sm"
              className="gba:h-7 gba:text-xs"
              onClick={() => onUnreadOnlyChange?.(!unreadOnly)}
              data-testid="conversation-filter-unread"
            >
              {t('chat-filterUnreadOnly')}
            </Button>
          )
        }
        const variant = filterKind === key ? 'default' : 'outline'
        const onClick = () => (filterKind === key ? handleKindChipClick(key) : onFilterKindChange?.(key))
        const labels = {
          direct: t('chat-filterDirect'),
          group: t('chat-filterGroup'),
          meeting: t('chat-filterMeetingChats')
        }
        const testIds = {
          direct: 'conversation-filter-direct',
          group: 'conversation-filter-group',
          meeting: 'conversation-filter-meeting'
        }
        return (
          <Button
            key={key}
            variant={variant}
            size="sm"
            className="gba:h-7 gba:text-xs"
            onClick={onClick}
            data-testid={testIds[key]}
          >
            {labels[key]}
          </Button>
        )
      }
      return (
        <div className="gba:flex gba:flex-col gba:gap-1.5 gba:w-full">
          <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-nowrap">
            {onLine1.map(k => renderChip(k))}
            <button
              type="button"
              onClick={() => setFiltersExpanded(!filtersExpanded)}
              className="gba:flex-shrink-0 gba:p-1 gba:rounded gba:hover:bg-accent/50 gba:outline-none gba:focus-visible:ring-2 gba:focus-visible:ring-primary"
              aria-label={filtersExpanded ? t('chat-filtersCollapse') : t('chat-filtersExpand')}
              data-testid={filtersExpanded ? 'conversation-filters-collapse' : 'conversation-filters-expand'}
            >
              {filtersExpanded ? (
                <CaretUpIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" aria-hidden />
              ) : (
                <CaretDownIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" aria-hidden />
              )}
            </button>
          </div>
          {filtersExpanded && onLine2.length > 0 && (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">{onLine2.map(k => renderChip(k))}</div>
          )}
        </div>
      )
    }
    return renderFilterChipRow()
  }

  // Handle scroll to load more conversations
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !onLoadMore) return

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container
      // Load more when scrolled to 80% of the content
      if (scrollHeight - scrollTop <= clientHeight * 1.2 && hasMore && !isLoadingMore) {
        onLoadMore()
      }
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [hasMore, isLoadingMore, onLoadMore])

  if (showUserSearch) {
    return (
      <UserSearch
        accessToken={accessToken}
        currentUserId={currentUserId}
        onUserSelect={handleUserSelect}
        onClose={() => setShowUserSearch(false)}
      />
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:min-h-0" data-testid="conversation-list">
      {/* Header */}
      <div
        className={`gba:flex gba:items-center gba:gap-2 gba:border-b gba:border-border/50 gba:bg-background/50 gba:backdrop-blur-sm gba:sticky gba:top-0 gba:z-10 ${compact ? 'gba:px-3 gba:py-2' : 'gba:p-4'}`}
      >
        <h1 className={`gba:font-semibold gba:text-foreground ${compact ? 'gba:text-base' : 'gba:text-lg'}`}>
          {t('chat-appHeader')}
        </h1>

        {/* User Status Dropdown - Compact inline version */}
        {wsClient && (
          <div className="gba:relative gba:flex-1 gba:min-w-0">
            <UserStatusDropdown client={wsClient} isConnected={isConnected} currentUserId={currentUserId} />
          </div>
        )}

        <Popover open={showNewChatMenu} onOpenChange={setShowNewChatMenu}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8 gba:flex-shrink-0"
              data-testid="new-conversation-button"
            >
              <PlusIcon className="gba:w-4 gba:h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="gba:w-52 gba:p-1">
            <button
              onClick={() => {
                setShowNewChatMenu(false)
                setShowUserSearch(true)
              }}
              className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-md gba:text-left hover:gba:bg-accent gba:transition-colors"
              data-testid="new-direct-message-option"
            >
              <div className="gba:p-1.5 gba:rounded-md gba:bg-primary/10">
                <UserIcon className="gba:w-4 gba:h-4 gba:text-primary" weight="fill" />
              </div>
              <span className="gba:text-sm gba:font-medium">{t('chat-directMessage')}</span>
            </button>

            {onCreateGroup && (
              <button
                onClick={() => {
                  setShowNewChatMenu(false)
                  onCreateGroup()
                }}
                className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2.5 gba:rounded-md gba:text-left hover:gba:bg-accent gba:transition-colors"
                data-testid="new-group-chat-option"
              >
                <div className="gba:p-1.5 gba:rounded-md gba:bg-muted">
                  <UsersThreeIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" weight="fill" />
                </div>
                <span className="gba:text-sm gba:font-medium">{t('chat-groupChat')}</span>
              </button>
            )}
          </PopoverContent>
        </Popover>
      </div>

      {/* Search */}
      <div className={`gba:border-b gba:border-border/50 ${compact ? 'gba:px-3 gba:py-2' : 'gba:p-3'}`}>
        <div className="gba:relative">
          <MagnifyingGlassIcon className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
          <Input
            value={search}
            onChange={e => onSearchChange?.(e.target.value)}
            placeholder={t('chat-searchConversations')}
            className="gba:h-8 gba:text-sm gba:!pl-10 gba:bg-background/50"
            data-testid="conversation-search-input"
          />
        </div>
      </div>

      {/* Filters: always visible. Fold (show selected + chevron) only when chips don't fit in one line. */}
      <div
        ref={filterContainerRef}
        className={`gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap gba:border-b gba:border-border/50 gba:min-h-0 ${compact ? 'gba:px-3 gba:py-2' : 'gba:px-3 gba:pb-2'}`}
      >
        {/* Hidden row used to measure if all chips fit in one line (order: Unread, Direct, Group, Meeting) */}
        <div
          ref={filterMeasureRef}
          className="gba:absolute gba:left-[-9999px] gba:top-0 gba:flex gba:gap-1.5 gba:flex-nowrap gba:pointer-events-none gba:invisible"
          aria-hidden
        >
          <Button variant="outline" size="sm" className="gba:h-7 gba:text-xs">
            {t('chat-filterUnreadOnly')}
          </Button>
          <Button variant="outline" size="sm" className="gba:h-7 gba:text-xs">
            {t('chat-filterDirect')}
          </Button>
          <Button variant="outline" size="sm" className="gba:h-7 gba:text-xs">
            {t('chat-filterGroup')}
          </Button>
          <Button variant="outline" size="sm" className="gba:h-7 gba:text-xs">
            {t('chat-filterMeetingChats')}
          </Button>
        </div>

        {renderFilterChips()}
      </div>

      {/* Conversations */}
      <div ref={scrollContainerRef} className="gba:flex-1 gba:overflow-y-auto gba:min-h-0">
        {(() => {
          if (isLoading) {
            return (
              <div className="gba:flex gba:items-center gba:justify-center gba:p-6">
                <Spinner size="sm" />
              </div>
            )
          }

          if (uniqueConversations.length === 0) {
            return (
              <div className="gba:p-6 gba:text-center">
                <p className="gba:text-sm gba:text-muted-foreground">
                  {hasActiveFilters ? t('chat-noConversationsFound') : t('chat-noConversationsYet')}
                </p>
              </div>
            )
          }

          return (
            <>
              <div className="gba:py-1">
                {uniqueConversations.map(conversation => {
                  const otherUserId = getOtherParticipantUserId(conversation, currentUserId)
                  // GOLD STANDARD: Direct map lookup - zero function calls, maximum performance ✅
                  const otherUserPresence = otherUserId ? presenceMap.get(otherUserId) : undefined
                  const activeExpertCount = conversationExpertCounts?.get(conversation.id) || 0

                  return (
                    <ConversationItem
                      key={conversation.id}
                      conversation={conversation}
                      onClick={() => onConversationSelect(conversation)}
                      onRemove={onRemoveConversation}
                      isActive={conversation.id === activeConversationId}
                      currentUserId={currentUserId}
                      compact={compact}
                      otherUserPresence={otherUserPresence}
                      activeExpertCount={activeExpertCount}
                      t={t}
                    />
                  )
                })}
              </div>

              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className="gba:flex gba:items-center gba:justify-center gba:py-3">
                  <Spinner size="sm" />
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}
