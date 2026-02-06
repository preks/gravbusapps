/**
 * SpaceMessagePreview - Shows recent messages from the team chat
 *
 * Displays the last few messages from the linked group chat inline in the Space.
 */

import React, { useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner
} from '@newwork/nw-design-system'
import { ChatCircle, ArrowRight } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { useSpaceMessages, type ChatMessage } from '../hooks/useSpaceMessages'

export interface SpaceMessagePreviewProps {
  /** Conversation ID to fetch messages from */
  conversationId: string | undefined
  /** Access token for API calls */
  accessToken: string | undefined
  /** Maximum number of messages to show */
  maxMessages?: number
  'data-testid'?: string
}

export const SpaceMessagePreview: React.FC<SpaceMessagePreviewProps> = ({
  conversationId,
  accessToken,
  maxMessages = 5,
  'data-testid': testId = 'space-message-preview'
}) => {
  const { messages, isLoading, error } = useSpaceMessages(conversationId, accessToken, maxMessages)

  // Navigate to the chat
  const handleViewAll = useCallback(() => {
    if (!conversationId) return

    const isProduction = process.env.NODE_ENV === 'production'
    const chatPath = isProduction ? '/platform/chat' : '/platform/apps/chat'
    navigateTo(buildPlatformUrl(`${chatPath}?conversationId=${conversationId}&view=chat`))
  }, [conversationId])

  // Format relative time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Get initials for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  // Truncate message content
  const truncateMessage = (content: string, maxLength: number = 100) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength).trim() + '...'
  }

  if (!conversationId) {
    return null
  }

  return (
    <Card className="gba:border-border/50" data-testid={testId}>
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-base gba:font-medium gba:flex gba:items-center gba:gap-2">
            <ChatCircle className="gba:w-4 gba:h-4" />
            Recent Messages
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleViewAll} data-testid={`${testId}-view-all`}>
            View All
            <ArrowRight className="gba:w-4 gba:h-4 gba:ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="gba:pt-0">
        {isLoading ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:py-6">
            <Spinner size="sm" />
          </div>
        ) : error ? (
          <div className="gba:text-center gba:py-4 gba:text-sm gba:text-muted-foreground">{error}</div>
        ) : messages.length === 0 ? (
          <div className="gba:text-center gba:py-6">
            <p className="gba:text-sm gba:text-muted-foreground">No messages yet</p>
            <p className="gba:text-xs gba:text-muted-foreground/70 gba:mt-1">Start the conversation!</p>
          </div>
        ) : (
          <div className="gba:space-y-3">
            {messages.map((message: ChatMessage) => (
              <div
                key={message.id}
                className="gba:flex gba:gap-3 gba:items-start"
                data-testid={`${testId}-message-${message.id}`}
              >
                <Avatar className="gba:w-8 gba:h-8 gba:flex-shrink-0">
                  {message.senderAvatar ? (
                    <AvatarImage src={message.senderAvatar} alt={message.senderName || 'User'} />
                  ) : null}
                  <AvatarFallback className="gba:text-xs">{getInitials(message.senderName)}</AvatarFallback>
                </Avatar>
                <div className="gba:flex-1 gba:min-w-0">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
                      {message.senderName || 'Unknown'}
                    </span>
                    <span className="gba:text-xs gba:text-muted-foreground gba:flex-shrink-0">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-0.5 gba:line-clamp-2">
                    {message.type === 'file' ? '📎 Shared a file' : truncateMessage(message.content)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SpaceMessagePreview
