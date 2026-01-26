/**
 * ParticipantsPanel Component
 *
 * Sidebar panel showing:
 * - Active participants in the call
 * - Pending invites
 * - Available participants to invite
 * - Search functionality
 * - Participant status indicators (muted, video, hand raised, screen share)
 */

import React, { useState } from 'react'
import {
  XIcon,
  MagnifyingGlassIcon,
  MicrophoneIcon,
  MicrophoneSlashIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  HandIcon,
  MonitorIcon,
  PhoneIcon,
  DotsThreeVerticalIcon,
  SpeakerXIcon
} from '@phosphor-icons/react'
import {
  Avatar,
  AvatarFallback,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@newwork/nw-design-system'
import { useRealtimeKitSelector } from '@cloudflare/realtimekit-react'
import { getInitials } from '../../utils/callUtils'
import type { PendingInvite } from '../../hooks/useGroupCall'

export interface AvailableParticipant {
  id: string
  odId: string
  odName: string
}

export interface CallParticipant {
  id: string
  odId: string
  odName: string
}

export interface ParticipantsPanelProps {
  /** RealtimeKit meeting instance */
  meeting: any
  /** Whether the panel is open */
  isOpen: boolean
  /** Callback when panel is closed */
  onClose: () => void
  /** Data test ID prefix */
  prefixDataTestId?: string
  /** Available participants to invite */
  availableParticipants?: AvailableParticipant[]
  /** Pending invites map */
  pendingInvites?: Map<string, PendingInvite>
  /** Callback to invite a participant */
  onInviteParticipant?: (participant: CallParticipant) => void
  /** Callback to mute a specific participant */
  onMuteParticipant?: (participantId: string, participantName: string) => void
  /** Callback to mute all participants */
  onMuteAll?: () => void
  /** Map of remote participant IDs to hand raised state */
  remoteHandsRaised?: Record<string, boolean>
  /** Local user's hand raised state */
  localHandRaised?: boolean
  /** Current user's ID */
  localUserId?: string
  /** Translation function */
  t?: (key: string) => string
}

export const ParticipantsPanel: React.FC<ParticipantsPanelProps> = ({
  meeting,
  isOpen,
  onClose,
  prefixDataTestId = 'rtk-group-call',
  availableParticipants = [],
  pendingInvites,
  onInviteParticipant,
  onMuteParticipant,
  onMuteAll,
  remoteHandsRaised = {},
  localHandRaised = false,
  localUserId,
  t = (key: string) => key
}) => {
  const [searchQuery, setSearchQuery] = useState('')

  // Helper to check if a participant has their hand raised
  const isHandRaised = (participantId: string) => {
    if (participantId === localUserId) {
      return localHandRaised
    }
    return remoteHandsRaised[participantId] || false
  }

  // Get active call participants from SDK
  const activeParticipants = useRealtimeKitSelector((m: any) => {
    const participants: any[] = []

    // Add local user first
    if (m?.self) {
      participants.push(m.self)
    }

    // Add remote participants
    if (m?.participants?.joined) {
      try {
        const remote = Array.from(m.participants.joined.values())
        participants.push(...remote)
      } catch {
        // Ignore
      }
    }

    return participants
  })

  // Get IDs of participants currently in call
  const activeParticipantIds = new Set<string>()
  const activeParticipantNames = new Set<string>()

  activeParticipants.forEach((p: any) => {
    if (p.id) activeParticipantIds.add(p.id)
    if (p.participantId) activeParticipantIds.add(p.participantId)
    if (p.odId) activeParticipantIds.add(p.odId)
    if (p.userId) activeParticipantIds.add(p.userId)
    if (p.name) activeParticipantNames.add(p.name.toLowerCase())
  })

  // Get pending invite IDs
  const pendingInviteIds = new Set(pendingInvites ? Array.from(pendingInvites.keys()) : [])

  // Filter not-in-call participants
  const notInCallParticipants = availableParticipants.filter(p => {
    const isInCall =
      activeParticipantIds.has(p.odId) ||
      activeParticipantIds.has(p.id) ||
      activeParticipantNames.has(p.odName.toLowerCase())

    const isPending = pendingInviteIds.has(p.odId) || pendingInviteIds.has(p.id)

    return !isInCall && !isPending
  })

  // Filter by search query
  const filteredActiveParticipants = activeParticipants.filter((p: any) =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredNotInCallParticipants = notInCallParticipants.filter(p =>
    p.odName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredPendingInvites = pendingInvites
    ? Array.from(pendingInvites.values()).filter(invite =>
        invite.odName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : []

  const totalCount = activeParticipants.length + notInCallParticipants.length + (pendingInvites?.size || 0)

  if (!isOpen) return null

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden"
      data-testid={`${prefixDataTestId}-participants-panel`}
    >
      {/* Header */}
      <div className="gba:p-4 gba:border-b gba:flex-shrink-0">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <h3 className="gba:font-semibold gba:text-lg">Participants ({totalCount})</h3>
          <div className="gba:flex gba:items-center gba:gap-2">
            {onMuteAll && activeParticipants.length > 0 && (
              <button
                onClick={onMuteAll}
                className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive-secondary gba:text-destructive-secondary-foreground hover:gba:bg-destructive gba:rounded gba:transition-colors"
                aria-label="Mute all participants"
                data-testid={`${prefixDataTestId}-mute-all-btn`}
              >
                <SpeakerXIcon className="gba:h-4 gba:w-4 gba:inline gba:mr-1" weight="fill" />
                Mute All
              </button>
            )}
            <button
              onClick={onClose}
              className="gba:p-1 hover:gba:bg-muted gba:rounded gba:transition-colors"
              aria-label="Close"
              data-testid={`${prefixDataTestId}-participants-panel-close`}
            >
              <XIcon className="gba:h-5 gba:w-5" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="gba:relative">
          <MagnifyingGlassIcon
            className="gba:absolute gba:left-3 gba:top-2.5 gba:h-4 gba:w-4 gba:text-muted-foreground"
            weight="bold"
          />
          <input
            type="text"
            placeholder="Search participants..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="gba:w-full gba:pl-10 gba:pr-3 gba:py-2 gba:rounded gba:border gba:bg-background"
            data-testid={`${prefixDataTestId}-participants-search`}
          />
        </div>
      </div>

      {/* Participants List */}
      <div className="gba:overflow-y-auto gba:flex-1 gba:min-h-0">
        {/* No Results */}
        {filteredActiveParticipants.length === 0 &&
        filteredPendingInvites.length === 0 &&
        filteredNotInCallParticipants.length === 0 ? (
          <div className="gba:p-4 gba:text-center gba:text-muted-foreground">
            {searchQuery ? 'No participants found' : t('groupCall-noParticipants') || 'No participants'}
          </div>
        ) : (
          <>
            {/* Section 1: In Call */}
            {filteredActiveParticipants.length > 0 && (
              <div>
                <div className="gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:sticky gba:top-0">
                  In Call ({filteredActiveParticipants.length})
                </div>
                {filteredActiveParticipants.map((participant: any) => (
                  <div
                    key={participant.id}
                    className="gba:p-3 gba:flex gba:items-center gba:justify-between hover:gba:bg-muted/50 gba:border-b gba:transition-colors"
                    data-testid={`${prefixDataTestId}-participant-active-${participant.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                      <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                        <AvatarFallback className="gba:text-xs">
                          {getInitials(participant.name || 'Unknown')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:truncate">
                          {participant.name || 'Unknown'}
                          {participant.id === meeting?.self?.id && ' (You)'}
                        </p>
                        <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs">
                          {participant.audioEnabled ? (
                            <MicrophoneIcon className="gba:h-3 gba:w-3 gba:text-success" weight="fill" />
                          ) : (
                            <MicrophoneSlashIcon className="gba:h-3 gba:w-3 gba:text-destructive" weight="fill" />
                          )}
                          {participant.videoEnabled ? (
                            <VideoCameraIcon className="gba:h-3 gba:w-3 gba:text-success" weight="fill" />
                          ) : (
                            <VideoCameraSlashIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground" weight="fill" />
                          )}
                          {(isHandRaised(participant.userId) ||
                            isHandRaised(participant.customParticipantId) ||
                            isHandRaised(participant.id)) && (
                            <HandIcon className="gba:h-3 gba:w-3 gba:text-warning gba:animate-pulse" weight="fill" />
                          )}
                          {participant.screenShareEnabled && (
                            <MonitorIcon className="gba:h-3 gba:w-3 gba:text-primary" weight="fill" />
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Show actions menu only for other participants (not yourself) */}
                    {participant.id !== meeting?.self?.id && onMuteParticipant && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="gba:p-1 hover:gba:bg-muted gba:rounded gba:flex-shrink-0 gba:transition-colors"
                            aria-label="More actions"
                            data-testid={`${prefixDataTestId}-participant-menu-${participant.id}`}
                          >
                            <DotsThreeVerticalIcon className="gba:h-4 gba:w-4" weight="bold" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => onMuteParticipant(participant.id, participant.name || 'Unknown')}
                            data-testid={`${prefixDataTestId}-participant-mute-${participant.id}`}
                          >
                            <SpeakerXIcon className="gba:h-4 gba:w-4 gba:mr-2" weight="fill" />
                            Mute participant
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Section 2: Invited (Pending) */}
            {filteredPendingInvites.length > 0 && (
              <div>
                <div className="gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase">
                  Invited ({filteredPendingInvites.length})
                </div>
                {filteredPendingInvites.map((invite: PendingInvite) => (
                  <div
                    key={invite.odId}
                    className="gba:p-3 gba:flex gba:items-center gba:gap-3 hover:gba:bg-muted/50 gba:border-b gba:transition-colors"
                    data-testid={`${prefixDataTestId}-participant-invited-${invite.odId}`}
                  >
                    <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0 gba:opacity-60">
                      <AvatarFallback className="gba:text-xs">{getInitials(invite.odName || 'Unknown')}</AvatarFallback>
                    </Avatar>
                    <div className="gba:flex-1 gba:min-w-0">
                      <p className="gba:text-sm gba:font-medium gba:truncate gba:text-muted-foreground">
                        {invite.odName || 'Unknown'}
                      </p>
                      <p className="gba:text-xs gba:text-muted-foreground">Ringing...</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Section 3: Available (Not in Call) */}
            {filteredNotInCallParticipants.length > 0 && (
              <div>
                <div className="gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase">
                  Available ({filteredNotInCallParticipants.length})
                </div>
                {filteredNotInCallParticipants.map(participant => (
                  <div
                    key={participant.odId}
                    className="gba:p-3 gba:flex gba:items-center gba:justify-between hover:gba:bg-muted/50 gba:border-b gba:transition-colors"
                    data-testid={`${prefixDataTestId}-participant-available-${participant.odId}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                      <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                        <AvatarFallback className="gba:text-xs">
                          {getInitials(participant.odName || 'Unknown')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:truncate">{participant.odName || 'Unknown'}</p>
                        <p className="gba:text-xs gba:text-muted-foreground">Not in call</p>
                      </div>
                    </div>
                    {onInviteParticipant && (
                      <button
                        onClick={() => onInviteParticipant(participant)}
                        className="gba:px-3 gba:py-1.5 gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90 gba:rounded gba:flex gba:items-center gba:gap-2 gba:text-xs gba:font-medium gba:transition-colors gba:flex-shrink-0"
                        aria-label={`Invite ${participant.odName}`}
                        data-testid={`${prefixDataTestId}-invite-btn-${participant.odId}`}
                      >
                        <PhoneIcon className="gba:h-3 gba:w-3" weight="fill" />
                        Invite
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
