import React, { useState, useEffect, useRef } from 'react'
import {
  Button,
  Input,
  Spinner,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { Plus, MagnifyingGlass, Users, User } from '@phosphor-icons/react'
import { ConversationItem } from './ConversationItem'
import { UserSearch } from './UserSearch'
import type { Conversation } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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
  accessToken
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [showUserSearch, setShowUserSearch] = useState(false)
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
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="conversation-list">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border-b">
        <h1 className="gba:text-lg gba:font-semibold">{getTranslationFromI18nKeyAndLabel('chat.appHeader', 'Chat')}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" data-testid="new-conversation-button">
              <Plus className="gba:w-5 gba:h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setShowUserSearch(true)} data-testid="new-direct-message-option">
              <User className="gba:w-4 gba:h-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('chat.newDirectMessage', 'New Direct Message')}
            </DropdownMenuItem>
            {onCreateGroup && (
              <DropdownMenuItem onClick={onCreateGroup} data-testid="new-group-chat-option">
                <Users className="gba:w-4 gba:h-4 gba:mr-2" />
                {getTranslationFromI18nKeyAndLabel('chat.newGroupChat', 'New Group Chat')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Search */}
      <div className="gba:p-4 gba:border-b">
        <div className="gba:relative">
          <div className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:pointer-events-none gba:flex gba:items-center gba:z-10">
            <MagnifyingGlass className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
          </div>
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={getTranslationFromI18nKeyAndLabel('chat.searchConversations', 'Search conversations...')}
            style={{ paddingLeft: '2.5rem' }}
            data-testid="conversation-search-input"
          />
        </div>
      </div>

      {/* Conversations */}
      <div ref={scrollContainerRef} className="gba:flex-1 gba:overflow-y-auto">
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:p-8">
            <Spinner />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="gba:p-8 gba:text-center gba:text-muted-foreground">
            {searchQuery.trim()
              ? getTranslationFromI18nKeyAndLabel('chat.noConversationsFound', 'No conversations found')
              : getTranslationFromI18nKeyAndLabel('chat.noConversationsYet', 'No conversations yet')}
          </div>
        ) : (
          <>
            <div className="gba:divide-y">
              {filteredConversations.map(conversation => (
                <ConversationItem
                  key={conversation.id}
                  conversation={conversation}
                  onClick={() => onConversationSelect(conversation)}
                  onRemove={onRemoveConversation}
                  isActive={conversation.id === activeConversationId}
                  currentUserId={currentUserId}
                />
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
