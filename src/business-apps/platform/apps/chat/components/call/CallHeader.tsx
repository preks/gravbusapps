/**
 * CallHeader Component
 *
 * Top header bar for the group call modal displaying:
 * - Call title/conversation name
 * - Call duration
 * - Participant count
 * - Call type indicator (audio/video)
 * - Action buttons (participants panel, minimize, close)
 */

import React, { useState, useEffect } from 'react'
import { Users, Minimize2, MessageSquare, LayoutGrid } from 'lucide-react'
import { formatDuration } from '../../utils/callUtils'

export interface CallHeaderProps {
  /** Call title or conversation name */
  conversationName?: string
  /** Call start timestamp (Unix ms) - used to calculate live duration */
  callStartTime: number | null
  /** Number of participants in the call */
  participantCount: number
  /** Number of available participants that can be added */
  availableParticipantsCount?: number
  /** Type of call (audio or video) */
  callType: 'audio' | 'video'
  /** Type of conversation (direct, group, meeting) - used to determine title */
  conversationType?: 'direct' | 'group' | 'meeting'
  /** Whether participants panel is shown */
  showParticipantsPanel?: boolean
  /** Whether chat panel is shown */
  showChatPanel?: boolean
  /** Number of unread chat messages */
  unreadChatCount?: number
  /** Callback to toggle participants panel */
  onToggleParticipantsPanel?: () => void
  /** Callback to toggle chat panel */
  onToggleChat?: () => void
  /** Callback to minimize the call */
  onToggleMinimize?: () => void
  /** Callback to close/end the call */
  onClose?: () => void
  /** Show Large gallery toggle (e.g. when participant count > 10) */
  showLargeGalleryControl?: boolean
  /** Current gallery size mode */
  gallerySize?: 'default' | 'large'
  /** Callback to toggle gallery size */
  onToggleGallerySize?: () => void
  /** Data test ID prefix */
  prefixDataTestId?: string
  /** Translation function */
  t?: (key: string) => string
}

export const CallHeader: React.FC<CallHeaderProps> = ({
  conversationName,
  callStartTime,
  participantCount,
  callType,
  conversationType = 'group', // Default to group for backward compatibility
  showParticipantsPanel = false,
  showChatPanel = false,
  unreadChatCount = 0,
  onToggleParticipantsPanel,
  onToggleChat,
  onToggleMinimize,
  showLargeGalleryControl = false,
  gallerySize = 'default',
  onToggleGallerySize,
  prefixDataTestId = 'rtk-group-call',
  t = (key: string) => key
}) => {
  // Calculate live duration independently to avoid parent re-renders
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    if (!callStartTime) {
      setDuration(0)
      return
    }

    // Calculate initial duration
    const calculateDuration = () => Math.floor((Date.now() - callStartTime) / 1000)
    setDuration(calculateDuration())

    // Update every second
    const timer = setInterval(() => {
      setDuration(calculateDuration())
    }, 1000)

    return () => clearInterval(timer)
  }, [callStartTime])

  // Use backend-generated call name when provided; otherwise fallback by conversation type
  const getCallTitle = (): string => {
    if (conversationName && conversationName.trim()) {
      return conversationName
    }
    switch (conversationType) {
      case 'direct':
        return t('chat-directCall') || 'Call'
      case 'meeting':
        return t('chat-meeting') || 'Meeting'
      case 'group':
      default:
        return t('groupCall-title') || 'Group Call'
    }
  }

  const callTitle = getCallTitle()

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2.5 gba:flex-shrink-0">
      {/* Left side - Title and info */}
      <div className="gba:flex gba:items-center gba:gap-3">
        <h3 className="gba:font-semibold gba:text-sm">{callTitle}</h3>
        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
          {/* Duration - updates independently */}
          <span className="gba:font-mono gba:font-medium">{formatDuration(duration)}</span>
          {/* Audio-only indicator */}
          {callType === 'audio' && (
            <>
              <span>•</span>
              <span className="gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-muted gba:text-[10px]">
                {t('groupCall-audioOnly')}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Right side - Action buttons */}
      <div className="gba:flex gba:items-center gba:gap-1.5">
        {/* Chat panel toggle */}
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`gba:relative gba:p-1.5 gba:rounded gba:transition-all ${
              showChatPanel ? 'gba:bg-accent gba:shadow-inner' : 'hover:gba:bg-accent'
            }`}
            data-testid={`${prefixDataTestId}-chat-btn`}
            aria-label={t('groupCall-chat')}
            title={t('groupCall-chat')}
          >
            <MessageSquare
              className={`gba:w-4 gba:h-4 ${unreadChatCount > 0 && !showChatPanel ? 'gba:text-primary' : ''}`}
            />
            {/* Unread badge */}
            {unreadChatCount > 0 && !showChatPanel && (
              <>
                <span className="gba:absolute gba:-top-1 gba:-right-1 gba:min-w-[16px] gba:h-[16px] gba:px-1 gba:flex gba:items-center gba:justify-center gba:text-[9px] gba:font-bold gba:rounded-full gba:bg-primary gba:text-primary-foreground gba:shadow-md gba:border gba:border-background gba:animate-in gba:fade-in gba:zoom-in gba:duration-200">
                  {unreadChatCount > 99 ? '99+' : unreadChatCount}
                </span>
                {/* Pulse effect for emphasis */}
                <span className="gba:absolute gba:-top-1 gba:-right-1 gba:w-[16px] gba:h-[16px] gba:rounded-full gba:bg-primary gba:animate-ping gba:opacity-75" />
              </>
            )}
          </button>
        )}

        {/* Large gallery toggle - only when many participants */}
        {showLargeGalleryControl && onToggleGallerySize && (
          <button
            onClick={onToggleGallerySize}
            className={`gba:relative gba:p-1.5 gba:rounded gba:transition-colors ${
              gallerySize === 'large' ? 'gba:bg-accent' : 'hover:gba:bg-accent'
            }`}
            data-testid={`${prefixDataTestId}-large-gallery-btn`}
            aria-label={t('groupCall-largeGallery') || 'Large gallery'}
            title={t('groupCall-largeGallery') || 'Large gallery'}
          >
            <LayoutGrid className="gba:w-4 gba:h-4" />
          </button>
        )}

        {/* Participants panel toggle */}
        {onToggleParticipantsPanel && (
          <button
            onClick={onToggleParticipantsPanel}
            className={`gba:relative gba:p-1.5 gba:rounded gba:transition-colors ${
              showParticipantsPanel ? 'gba:bg-accent' : 'hover:gba:bg-accent'
            }`}
            data-testid={`${prefixDataTestId}-participants-btn`}
            aria-label={t('groupCall-participants')}
            title={t('groupCall-participants')}
          >
            <Users className="gba:w-4 gba:h-4" />
            {/* Participant count badge */}
            <span className="gba:absolute gba:-top-1 gba:-right-1 gba:min-w-[18px] gba:h-[18px] gba:px-1 gba:flex gba:items-center gba:justify-center gba:text-[10px] gba:font-semibold gba:rounded-full gba:bg-primary gba:text-primary-foreground">
              {participantCount}
            </span>
          </button>
        )}

        {/* Minimize button */}
        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="gba:p-1.5 gba:rounded hover:gba:bg-accent gba:transition-colors"
            data-testid={`${prefixDataTestId}-minimize-btn`}
            aria-label={t('groupCall-minimize')}
            title={t('groupCall-minimize')}
          >
            <Minimize2 className="gba:w-4 gba:h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
