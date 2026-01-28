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
import { Users, Minimize2 } from 'lucide-react'
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
  /** Whether participants panel is shown */
  showParticipantsPanel?: boolean
  /** Callback to toggle participants panel */
  onToggleParticipantsPanel?: () => void
  /** Callback to minimize the call */
  onToggleMinimize?: () => void
  /** Callback to close/end the call */
  onClose?: () => void
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
  showParticipantsPanel = false,
  onToggleParticipantsPanel,
  onToggleMinimize,
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

  return (
    <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b gba:bg-muted/30 gba:flex-shrink-0">
      {/* Left side - Title and info */}
      <div className="gba:flex gba:items-center gba:gap-4">
        <div className="gba:p-2 gba:rounded-lg gba:bg-primary/10">
          <Users className="gba:w-5 gba:h-5 gba:text-primary" />
        </div>
        <div>
          <h3 className="gba:font-semibold gba:text-lg">{conversationName || t('groupCall-title') || 'Group Call'}</h3>
          <div className="gba:flex gba:items-center gba:gap-3 gba:text-sm gba:text-muted-foreground">
            {/* Duration - updates independently */}
            <span className="gba:flex gba:items-center gba:gap-1">
              <span className="gba:font-mono gba:font-medium">{formatDuration(duration)}</span>
            </span>
            {/* Audio-only indicator */}
            {callType === 'audio' && (
              <>
                <span>•</span>
                <span className="gba:text-xs gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted">
                  {t('groupCall-audioOnly')}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right side - Action buttons */}
      <div className="gba:flex gba:items-center gba:gap-2">
        {/* Participants panel toggle */}
        {onToggleParticipantsPanel && (
          <button
            onClick={onToggleParticipantsPanel}
            className={`gba:relative gba:p-2 gba:rounded-lg gba:transition-colors ${
              showParticipantsPanel ? 'gba:bg-accent' : 'hover:gba:bg-accent'
            }`}
            data-testid={`${prefixDataTestId}-participants-btn`}
            aria-label="Participants"
            title="Participants"
          >
            <Users className="gba:w-5 gba:h-5" />
            {/* Participant count badge */}
            <span className="gba:absolute gba:-top-1 gba:-right-1 gba:min-w-[20px] gba:h-5 gba:px-1 gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-semibold gba:rounded-full gba:bg-primary gba:text-primary-foreground">
              {participantCount}
            </span>
          </button>
        )}

        {/* Minimize button */}
        {onToggleMinimize && (
          <button
            onClick={onToggleMinimize}
            className="gba:p-2 gba:rounded-lg hover:gba:bg-accent gba:transition-colors"
            data-testid={`${prefixDataTestId}-minimize-btn`}
            aria-label="Minimize"
            title="Minimize"
          >
            <Minimize2 className="gba:w-5 gba:h-5" />
          </button>
        )}
      </div>
    </div>
  )
}
