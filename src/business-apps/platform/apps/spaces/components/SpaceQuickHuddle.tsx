/**
 * SpaceQuickHuddle - One-click team huddle button
 *
 * Starts an instant video call with the team without navigating away from the Space.
 * Falls back to navigation if the chat app isn't available to handle the event.
 */

import React, { useCallback, useState } from 'react'
import { Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { VideoCamera } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { LinkedConversation } from '../types/space.types'
import type { SpaceMember } from '../types/space.types'
import translations from '../_i18n'

export interface SpaceQuickHuddleProps {
  /** The linked group conversation */
  conversation: LinkedConversation | null
  /** Space members to include in the call */
  members: SpaceMember[]
  /** Current user ID to exclude from participants */
  currentUserId?: string
  /** Whether the huddle can be started */
  disabled?: boolean
  'data-testid'?: string
}

export const SpaceQuickHuddle: React.FC<SpaceQuickHuddleProps> = ({
  conversation,
  members,
  currentUserId,
  disabled = false,
  'data-testid': testId = 'space-quick-huddle'
}) => {
  const { t } = useTranslation(translations)
  const [isStarting, setIsStarting] = useState(false)

  const handleStartHuddle = useCallback(() => {
    if (!conversation || isStarting) return

    setIsStarting(true)

    // Build participants list (exclude current user)
    const participants = members
      .filter(m => m.userId !== currentUserId)
      .map(m => ({
        id: m.userId,
        odId: m.userId,
        odName: m.userName || t('common-team-member'),
        avatarUrl: m.userAvatar
      }))

    // Try to dispatch event to chat app (if running in sidebar)
    const callStartedPromise = new Promise<boolean>(resolve => {
      const timeout = setTimeout(() => {
        // No response from chat app - fall back to navigation
        resolve(false)
      }, 500)

      const handleCallStarted = () => {
        clearTimeout(timeout)
        window.removeEventListener('chat:group-call-started', handleCallStarted)
        resolve(true)
      }

      window.addEventListener('chat:group-call-started', handleCallStarted)

      // Dispatch the event
      window.dispatchEvent(
        new CustomEvent('chat:start-group-call', {
          detail: {
            conversationId: conversation.id,
            callType: 'video',
            participants,
            conversationName: conversation.name
          }
        })
      )
    })

    callStartedPromise.then(callStarted => {
      setIsStarting(false)

      if (!callStarted) {
        // Fall back to navigation - open chat and start call
        const isProduction = process.env.NODE_ENV === 'production'
        const chatPath = isProduction ? '/platform/chat' : '/platform/apps/chat'

        const params = new URLSearchParams({
          conversationId: conversation.id,
          action: 'startCall',
          callType: 'video',
          view: 'chat'
        })

        navigateTo(buildPlatformUrl(`${chatPath}?${params.toString()}`))
      }
    })
  }, [conversation, currentUserId, isStarting, members, t])

  const canStartHuddle = !!conversation && members.length > 0 && !disabled

  return (
    <Button
      variant="default"
      size="sm"
      onClick={handleStartHuddle}
      disabled={!canStartHuddle || isStarting}
      className="gba:gap-2"
      data-testid={testId}
    >
      {isStarting ? <Spinner size="sm" /> : <VideoCamera className="gba:w-4 gba:h-4" weight="fill" />}
      {t('quick-huddle')}
    </Button>
  )
}

export default SpaceQuickHuddle
