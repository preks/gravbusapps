/**
 * SpaceTeamChat - Displays linked group chat for dimension-based spaces
 *
 * Shows the team's group chat with quick actions for chat and calls
 */

import React, { useCallback } from 'react'
import { Button, Card, CardContent, Badge, Spinner } from '@newwork/nw-design-system'
import { ChatCircle, Phone, VideoCamera, ArrowRight, UsersThree } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { LinkedConversation } from '../types/space.types'

export interface SpaceTeamChatProps {
  /** The linked group conversation, if found */
  conversation: LinkedConversation | null
  /** Whether the conversation is being loaded */
  isLoading: boolean
  /** Error message if loading failed */
  error: string | null
  /** Callback to start an audio call */
  onStartAudioCall?: () => void
  /** Callback to start a video call */
  onStartVideoCall?: () => void
  /** Number of participants in the space */
  memberCount?: number
  'data-testid'?: string
}

export const SpaceTeamChat: React.FC<SpaceTeamChatProps> = ({
  conversation,
  isLoading,
  error,
  onStartAudioCall,
  onStartVideoCall,
  memberCount,
  'data-testid': testId = 'space-team-chat'
}) => {
  // Navigate to chat with the conversation selected
  const handleOpenChat = useCallback(() => {
    if (!conversation) return

    const isProduction = process.env.NODE_ENV === 'production'
    const chatPath = isProduction ? '/platform/chat' : '/platform/apps/chat'
    navigateTo(buildPlatformUrl(`${chatPath}?conversationId=${conversation.id}&view=chat`))
  }, [conversation])

  // Loading state
  if (isLoading) {
    return (
      <Card className="gba:border-border/50" data-testid={testId}>
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
            <Spinner size="sm" />
          </div>
        </CardContent>
      </Card>
    )
  }

  // No linked chat - show create prompt
  if (!conversation) {
    return (
      <Card className="gba:border-border/50" data-testid={testId}>
        <CardContent className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:w-12 gba:h-12 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
              <ChatCircle className="gba:w-6 gba:h-6 gba:text-muted-foreground" />
            </div>
            <div className="gba:flex-1">
              <h3 className="gba:font-medium gba:text-foreground">Team Chat</h3>
              <p className="gba:text-sm gba:text-muted-foreground gba:mt-1">
                {error || 'No group chat linked to this space yet'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Format last message time
  const formatLastActivity = (dateString?: string) => {
    if (!dateString) return 'No recent activity'
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffHours < 1) return 'Active just now'
    if (diffHours < 24) return `Active ${diffHours}h ago`
    if (diffDays === 1) return 'Active yesterday'
    if (diffDays < 7) return `Active ${diffDays} days ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className="gba:border-border/50 gba:overflow-hidden" data-testid={testId}>
      <CardContent className="gba:p-0">
        {/* Header */}
        <div className="gba:p-4 gba:border-b gba:border-border/50">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
                <UsersThree className="gba:w-5 gba:h-5 gba:text-primary" weight="fill" />
              </div>
              <div>
                <h3 className="gba:font-medium gba:text-foreground">{conversation.name || 'Team Chat'}</h3>
                <p className="gba:text-xs gba:text-muted-foreground">
                  {formatLastActivity(conversation.lastMessageAt)}
                </p>
              </div>
            </div>
            {memberCount && (
              <Badge variant="secondary" className="gba:text-xs">
                {memberCount} members
              </Badge>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="gba:p-4 gba:space-y-3">
          {/* Call Actions */}
          <div className="gba:flex gba:gap-2">
            <Button
              variant="secondary"
              size="sm"
              className="gba:flex-1 gba:gap-2"
              onClick={onStartAudioCall}
              disabled={!onStartAudioCall}
              data-testid={`${testId}-audio-call`}
            >
              <Phone className="gba:w-4 gba:h-4" />
              Audio Call
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="gba:flex-1 gba:gap-2"
              onClick={onStartVideoCall}
              disabled={!onStartVideoCall}
              data-testid={`${testId}-video-call`}
            >
              <VideoCamera className="gba:w-4 gba:h-4" />
              Video Call
            </Button>
          </div>

          {/* Open Chat Button */}
          <Button
            variant="outline"
            className="gba:w-full gba:gap-2 gba:justify-between"
            onClick={handleOpenChat}
            data-testid={`${testId}-open-chat`}
          >
            <div className="gba:flex gba:items-center gba:gap-2">
              <ChatCircle className="gba:w-4 gba:h-4" />
              Open Chat
            </div>
            <ArrowRight className="gba:w-4 gba:h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export default SpaceTeamChat
