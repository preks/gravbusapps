/**
 * SpaceTeamChatPanel - Combined team chat, calls, and messages panel
 *
 * A unified component showing:
 * - Team chat info with call buttons
 * - Recent messages from the linked group chat
 * - Open Chat action
 */

import React, { useCallback, useState, useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { Phone, VideoCamera, ChatCircle, ArrowRight, Users } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useChatClient } from '@/common/network/chat/useChatClient'
import type { LinkedConversation } from '../types/space.types'
import type { UserInfo } from '../hooks/useSpaceUserLookup'
import translations from '../_i18n'
import { formatCompactRelativeTime } from '../utils/spaceLocalization'

export interface SpaceTeamChatPanelProps {
  /** The linked group conversation */
  conversation: LinkedConversation | null
  /** Whether the conversation is loading */
  isLoading?: boolean
  /** Error message if loading failed */
  error?: string | null
  /** Callback to start audio call */
  onStartAudioCall?: () => void
  /** Callback to start video call */
  onStartVideoCall?: () => void
  /** Number of members in the space */
  memberCount?: number
  /** Access token for API calls */
  accessToken?: string
  /** Maximum number of messages to show */
  maxMessages?: number
  /** Function to get user info (avatar, name) - uses same lookup as hero */
  getUserInfo?: (userId: string) => UserInfo | undefined
  /** Callback when new user IDs need to be looked up */
  onUserIdsNeeded?: (userIds: string[]) => void
  'data-testid'?: string
}

interface ChatMessage {
  id: string
  content: string
  senderId: string
  senderName?: string
  senderAvatar?: string
  createdAt: string
  type?: 'text' | 'file' | 'system'
}

// Get initials from name (same style as chat app)
function getInitials(name: string): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase()
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const SpaceTeamChatPanel: React.FC<SpaceTeamChatPanelProps> = ({
  conversation,
  isLoading = false,
  error = null,
  onStartAudioCall,
  onStartVideoCall,
  memberCount,
  accessToken,
  maxMessages = 8,
  getUserInfo,
  onUserIdsNeeded,
  'data-testid': testId = 'space-team-chat-panel'
}) => {
  const { t, locale } = useTranslation(translations)
  const chatClient = useChatClient(accessToken)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)

  useEffect(() => {
    if (!conversation?.id || !accessToken) {
      setMessages([])
      return
    }

    let cancelled = false
    const fetchMessages = async () => {
      setMessagesLoading(true)
      try {
        const response = await chatClient.getMessages<{ data: any[] }>(conversation.id, 1, maxMessages)
        if (cancelled) return
        const rawMessages = response?.data || []

        const transformedMessages: ChatMessage[] = rawMessages
          .map((msg: any) => ({
            id: msg.id,
            content: msg.content,
            senderId: msg.senderId || msg.sender?.id || msg.metadata?.userId,
            senderName: msg.sender?.displayName || msg.sender?.firstName || msg.senderName,
            senderAvatar: msg.sender?.avatarUrl,
            createdAt: msg.createdAt,
            type: msg.type || 'text'
          }))
          .slice(0, maxMessages)

        setMessages(transformedMessages)

        if (onUserIdsNeeded) {
          const userIds = transformedMessages.filter((m: ChatMessage) => m.senderId).map((m: ChatMessage) => m.senderId)
          if (userIds.length > 0) {
            onUserIdsNeeded([...new Set(userIds)])
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[SpaceTeamChatPanel] Error fetching messages:', err)
          setMessages([])
        }
      } finally {
        if (!cancelled) setMessagesLoading(false)
      }
    }

    fetchMessages()
    return () => {
      cancelled = true
    }
  }, [conversation?.id, accessToken, maxMessages, onUserIdsNeeded, chatClient])

  // Navigate to chat
  const handleOpenChat = useCallback(() => {
    if (!conversation) return
    const isProduction = process.env.NODE_ENV === 'production'
    const chatPath = isProduction ? '/platform/chat' : '/platform/apps/chat'
    navigateTo(buildPlatformUrl(`${chatPath}?conversationId=${conversation.id}&view=chat`))
  }, [conversation])

  // Get avatar URL and name for a sender using the shared user lookup
  const getSenderInfo = useCallback(
    (message: ChatMessage): { avatar?: string; name: string } => {
      // First check if message has avatar directly
      if (message.senderAvatar) {
        return { avatar: message.senderAvatar, name: message.senderName || t('common-unknown') }
      }

      // Use the shared user lookup (same as hero)
      if (getUserInfo && message.senderId) {
        const userInfo = getUserInfo(message.senderId)
        if (userInfo) {
          return { avatar: userInfo.avatar, name: userInfo.name }
        }
      }

      return { name: message.senderName || t('common-unknown') }
    },
    [getUserInfo, t]
  )

  // Loading state
  if (isLoading) {
    return (
      <Card className="gba:border-border/50" data-testid={testId}>
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:justify-center gba:py-12">
            <Spinner size="sm" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="gba:border-border/50" data-testid={testId}>
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:py-8">
            <p className="gba:text-sm gba:text-destructive">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // No conversation state
  if (!conversation) {
    return (
      <Card className="gba:border-border/50" data-testid={testId}>
        <CardContent className="gba:p-6">
          <div className="gba:text-center gba:py-8">
            <ChatCircle className="gba:w-10 gba:h-10 gba:mx-auto gba:text-muted-foreground/50 gba:mb-3" />
            <p className="gba:text-sm gba:text-muted-foreground">{t('chat-no-linked-title')}</p>
            <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">{t('chat-no-linked-description')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="gba:border-border/50" data-testid={testId}>
      {/* Header with chat info */}
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Avatar className="gba:w-10 gba:h-10">
              <AvatarFallback className="gba:text-sm gba:font-medium gba:bg-primary/10 gba:text-primary">
                {getInitials(conversation.name)}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="gba:text-base gba:font-semibold">{conversation.name}</CardTitle>
              <p className="gba:text-xs gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
                <Users className="gba:w-3 gba:h-3" />
                {t('common-member-count', { count: memberCount || conversation.participantCount || 0 })}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleOpenChat} data-testid={`${testId}-open-chat`}>
            {t('common-open-chat')}
            <ArrowRight className="gba:w-4 gba:h-4 gba:ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="gba:pt-0 gba:space-y-4">
        {/* Call buttons */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onStartAudioCall}
            disabled={!onStartAudioCall}
            className="gba:gap-2"
            data-testid={`${testId}-audio-call`}
          >
            <Phone className="gba:w-4 gba:h-4" />
            {t('common-audio-call')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onStartVideoCall}
            disabled={!onStartVideoCall}
            className="gba:gap-2"
            data-testid={`${testId}-video-call`}
          >
            <VideoCamera className="gba:w-4 gba:h-4" />
            {t('common-video-call')}
          </Button>
        </div>

        {/* Divider */}
        <div className="gba:border-t gba:border-border/50" />

        {/* Recent Messages */}
        <div>
          <h4 className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:mb-3">
            {t('chat-recent-messages')}
          </h4>

          {messagesLoading ? (
            <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
              <Spinner size="sm" />
            </div>
          ) : messages.length === 0 ? (
            <div className="gba:text-center gba:py-4">
              <p className="gba:text-sm gba:text-muted-foreground">{t('chat-no-messages')}</p>
              <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">{t('chat-start-conversation')}</p>
            </div>
          ) : (
            <div className="gba:space-y-3">
              {messages.map(message => {
                const senderInfo = getSenderInfo(message)
                return (
                  <div
                    key={message.id}
                    className="gba:flex gba:gap-3 gba:items-start"
                    data-testid={`${testId}-message-${message.id}`}
                  >
                    <Avatar className="gba:w-8 gba:h-8 gba:flex-shrink-0">
                      {senderInfo.avatar ? <AvatarImage src={senderInfo.avatar} alt={senderInfo.name} /> : null}
                      <AvatarFallback className="gba:text-xs gba:font-medium gba:bg-primary/10 gba:text-primary">
                        {getInitials(senderInfo.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:min-w-0">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                          {senderInfo.name}
                        </span>
                        <span className="gba:text-xs gba:text-muted-foreground gba:flex-shrink-0">
                          {formatCompactRelativeTime(message.createdAt, locale, t)}
                        </span>
                      </div>
                      <p className="gba:text-sm gba:text-muted-foreground gba:mt-0.5 gba:line-clamp-2">
                        {message.type === 'file' ? t('chat-shared-file') : message.content}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default SpaceTeamChatPanel
