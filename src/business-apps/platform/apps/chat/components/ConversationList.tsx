import React, { useState, useEffect, useRef, useMemo } from 'react'
import { Button, Input, Spinner, Popover, PopoverContent, PopoverTrigger, Badge } from '@newwork/nw-design-system'
import { PlusIcon, MagnifyingGlassIcon, UserIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { PhoneMissedIcon } from 'lucide-react'
import { ConversationItem } from './ConversationItem'
import { UserSearch } from './UserSearch'
import { UserStatusDropdown } from './UserStatusDropdown'
import type { Conversation } from '../types'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import type { PresenceData } from '../hooks/usePresence'
import type { ConversationFilterKind } from '../hooks/useConversations'
import { sortConversationsPinThenTime } from '../utils/conversationSort'
import { useChatTranslation } from '../contexts/TranslationContext'

interface ConversationListProps {
  conversations: Conversation[]
  activeConversationId: string | null
  onConversationSelect: (conversation: Conversation) => void
  onRemoveConversation?: (conversationId: string) => void
  onPinChange?: (conversationId: string, isPinned: boolean) => void
  onMuteChange?: (conversationId: string, isMuted: boolean) => void
  onNudge?: (conversationId: string, toUserId: string) => void
  onStartAudioCall?: (conversation: Conversation) => void
  onStartVideoCall?: (conversation: Conversation) => void
  isCallEnabled?: boolean
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
  onOpenCallHistory?: () => void
  missedCallsCount?: number
  onMarkAsUnread?: (conversationId: string) => void
  markedAsUnreadConversationIds?: Set<string>
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
  onPinChange,
  onMuteChange,
  onNudge,
  onStartAudioCall,
  onStartVideoCall,
  isCallEnabled = false,
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
  onUnreadOnlyChange,
  onOpenCallHistory,
  missedCallsCount = 0,
  onMarkAsUnread,
  markedAsUnreadConversationIds
}) => {
  const t = useChatTranslation()
  // Force re-render when presenceVersion changes
  void presenceVersion

  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showNewChatMenu, setShowNewChatMenu] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Deduplicate and sort: pinned first (by pinnedOrder), then unpinned by lastMessageAt
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

    return [...filtered].sort(sortConversationsPinThenTime)
  }, [conversations])

  // When Unread filter is on, show conversations with unread messages or marked-as-unread (dot)
  const displayedConversations = useMemo(() => {
    if (!unreadOnly) return uniqueConversations
    const marked = markedAsUnreadConversationIds ?? new Set<string>()
    return uniqueConversations.filter(c => (c.unreadCount ?? 0) > 0 || marked.has(c.id))
  }, [unreadOnly, uniqueConversations, markedAsUnreadConversationIds])

  const hasActiveFilters = (search?.trim()?.length ?? 0) > 0 || filterKind !== 'all' || unreadOnly

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

  const renderFilterChips = () => (
    <div
      className="gba:flex gba:items-center gba:gap-1.5 gba:overflow-x-auto gba:flex-nowrap gba:w-full gba:min-w-0"
      data-testid="conversation-filters"
    >
      <Button
        variant={unreadOnly ? 'default' : 'outline'}
        size="sm"
        className="gba:h-7 gba:text-xs gba:flex-shrink-0"
        onClick={() => onUnreadOnlyChange?.(!unreadOnly)}
        data-testid="conversation-filter-unread"
      >
        {t('chat-filterUnreadOnly')}
      </Button>
      <Button
        variant={filterKind === 'direct' ? 'default' : 'outline'}
        size="sm"
        className="gba:h-7 gba:text-xs gba:flex-shrink-0"
        onClick={() => handleKindChipClick('direct')}
        data-testid="conversation-filter-direct"
      >
        {t('chat-filterDirect')}
      </Button>
      <Button
        variant={filterKind === 'group' ? 'default' : 'outline'}
        size="sm"
        className="gba:h-7 gba:text-xs gba:flex-shrink-0"
        onClick={() => handleKindChipClick('group')}
        data-testid="conversation-filter-group"
      >
        {t('chat-filterGroup')}
      </Button>
      <Button
        variant={filterKind === 'meeting' ? 'default' : 'outline'}
        size="sm"
        className="gba:h-7 gba:text-xs gba:flex-shrink-0"
        onClick={() => handleKindChipClick('meeting')}
        data-testid="conversation-filter-meeting"
      >
        {t('chat-filterMeetingChats')}
      </Button>
    </div>
  )

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

        {onOpenCallHistory && (
          <div className="gba:relative gba:flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="gba:h-8 gba:w-8"
              onClick={onOpenCallHistory}
              aria-label={t('chat-callHistory')}
              data-testid="chat-openCallHistory"
            >
              <PhoneMissedIcon className="gba:w-4 gba:h-4" />
            </Button>
            {missedCallsCount > 0 && (
              <Badge
                variant="destructive"
                className="gba:absolute gba:-top-1 gba:-right-1 gba:min-w-[1.25rem] gba:h-5 gba:px-1 gba:text-xs gba:flex gba:items-center gba:justify-center"
                data-testid="chat-missedCallsBadge"
              >
                {missedCallsCount > 99 ? '99+' : missedCallsCount}
              </Badge>
            )}
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

      {/* Filters: single scrollable row */}
      <div
        className={`gba:flex gba:items-center gba:border-b gba:border-border/50 gba:min-h-0 gba:min-w-0 ${compact ? 'gba:px-3 gba:py-2' : 'gba:px-3 gba:pb-2'}`}
      >
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

          if (displayedConversations.length === 0) {
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
                {displayedConversations.map(conversation => {
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
                      onPinChange={onPinChange}
                      onMuteChange={onMuteChange}
                      onNudge={onNudge}
                      onStartAudioCall={onStartAudioCall}
                      onStartVideoCall={onStartVideoCall}
                      isCallEnabled={isCallEnabled}
                      onMarkAsUnread={onMarkAsUnread}
                      isMarkedAsUnread={markedAsUnreadConversationIds?.has(conversation.id)}
                      isActive={conversation.id === activeConversationId}
                      currentUserId={currentUserId}
                      compact={compact}
                      otherUserPresence={otherUserPresence}
                      activeExpertCount={activeExpertCount}
                      isPinned={conversation.isPinned}
                      isMuted={conversation.isMuted}
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
