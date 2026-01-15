import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, Spinner, Popover, PopoverContent, PopoverTrigger } from '@newwork/nw-design-system'
import { Plus, MagnifyingGlass, User, UsersThree } from '@phosphor-icons/react'
import { ConversationItem } from './ConversationItem'
import { UserSearch } from './UserSearch'
import type { Conversation } from '../types'
import type { UserPresence } from '../hooks/usePresence'
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
  getUserPresence?: (userId: string) => UserPresence
  presenceVersion?: number // Version number that changes when any presence updates
  // Map of conversation IDs to active expert counts
  conversationExpertCounts?: Map<string, number>
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
  getUserPresence,
  presenceVersion, // Triggers re-render when presence changes (without passing entire map)
  conversationExpertCounts
}) => {
  const t = useChatTranslation()
  // Force re-render when presenceVersion changes
  void presenceVersion

  const [searchQuery, setSearchQuery] = useState('')
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showNewChatMenu, setShowNewChatMenu] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery.trim()) return true

    const query = searchQuery.toLowerCase()

    // Search in conversation name (for group chats)
    if (conv.name?.toLowerCase().includes(query)) {
      return true
    }

    // Search in participant names (for direct chats)
    const participantMatch = conv.participants?.some(p => {
      if (!p.user) return false

      const firstName = p.user.firstName?.toLowerCase() || ''
      const lastName = p.user.lastName?.toLowerCase() || ''
      const username = p.user.username?.toLowerCase() || ''
      const email = p.user.email?.toLowerCase() || ''

      return firstName.includes(query) || lastName.includes(query) || username.includes(query) || email.includes(query)
    })

    if (participantMatch) {
      return true
    }

    // Search in last message content
    if (conv.lastMessage?.content.toLowerCase().includes(query)) {
      return true
    }

    return false
  })

  const handleUserSelect = async (user: any) => {
    if (onCreateConversation) {
      await onCreateConversation(user)
    }
    setShowUserSearch(false)
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
        className={`gba:flex gba:items-center gba:justify-between gba:border-b gba:border-border/50 gba:bg-background/50 gba:backdrop-blur-sm gba:sticky gba:top-0 gba:z-10 ${compact ? 'gba:px-3 gba:py-2' : 'gba:p-4'}`}
      >
        <h1 className={`gba:font-semibold gba:text-foreground ${compact ? 'gba:text-base' : 'gba:text-lg'}`}>
          {t('chat-appHeader')}
        </h1>
        <Popover open={showNewChatMenu} onOpenChange={setShowNewChatMenu}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="gba:h-8 gba:w-8" data-testid="new-conversation-button">
              <Plus className="gba:w-4 gba:h-4" />
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
                <User className="gba:w-4 gba:h-4 gba:text-primary" weight="fill" />
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
                  <UsersThree className="gba:w-4 gba:h-4 gba:text-muted-foreground" weight="fill" />
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
          <MagnifyingGlass className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground gba:pointer-events-none gba:z-10" />
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={t('chat-searchConversations')}
            className="gba:h-8 gba:text-sm gba:!pl-10 gba:bg-background/50"
            data-testid="conversation-search-input"
          />
        </div>
      </div>

      {/* Conversations */}
      <div ref={scrollContainerRef} className="gba:flex-1 gba:overflow-y-auto gba:min-h-0">
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:p-6">
            <Spinner size="sm" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="gba:p-6 gba:text-center">
            <p className="gba:text-sm gba:text-muted-foreground">
              {searchQuery.trim() ? t('chat-noConversationsFound') : t('chat-noConversationsYet')}
            </p>
          </div>
        ) : (
          <>
            <div className="gba:py-1">
              {filteredConversations.map(conversation => {
                const otherUserId = getOtherParticipantUserId(conversation, currentUserId)
                const otherUserPresence = otherUserId && getUserPresence ? getUserPresence(otherUserId) : undefined
                const activeExpertCount = conversationExpertCounts?.get(conversation.id) || 0

                // TRACK: Log presence data being passed to ConversationItem
                if (otherUserId && conversation.type === 'direct') {
                  console.log('[ConversationList] 📋 Passing presence to item:', {
                    conversationId: conversation.id,
                    otherUserId,
                    presenceData: otherUserPresence
                  })
                }

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
        )}
      </div>
    </div>
  )
}
