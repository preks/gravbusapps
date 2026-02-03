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
  AvatarImage,
  Spinner,
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
  /** Map of participant IDs to hand raise order */
  handRaisedOrder?: Record<string, { order: number; timestamp: number }>
  /** Local user's hand raised state */
  localHandRaised?: boolean
  /** Current user's ID */
  localUserId?: string
  /** Current active speaker ID */
  activeSpeakerId?: string | null
  /** Recent speakers for sorting */
  activeSpeakerHistory?: string[]
  /** Translation function */
  t?: (key: string) => string
  /** Active conversation for avatar URLs */
  activeConversation?: any
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
  handRaisedOrder = {},
  localHandRaised = false,
  localUserId,
  activeSpeakerId,
  activeSpeakerHistory = [],
  t = (key: string) => key,
  activeConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('')
  const [invitingParticipantIds, setInvitingParticipantIds] = useState<Set<string>>(new Set())
  const inviteTimeoutsRef = React.useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Keep a persistent record of everyone who's been in the call
  // This ensures they remain visible even after leaving
  const allSeenParticipantsRef = React.useRef<Map<string, any>>(new Map())

  // Create avatar URL map from conversation participants
  const avatarUrlMap = React.useMemo(() => {
    const map = new Map<string, string>()
    if (activeConversation?.participants) {
      activeConversation.participants.forEach((cp: any) => {
        if (cp.user?.avatarUrl) {
          map.set(cp.userId, cp.user.avatarUrl)
          map.set(cp.user.id, cp.user.avatarUrl)
        }
      })
    }
    return map
  }, [activeConversation?.participants])
  const previousPendingIdsRef = React.useRef<Set<string>>(new Set())

  // Handler for inviting a participant with loading state - supports multiple simultaneous invites
  const handleInviteClick = async (participant: CallParticipant) => {
    if (!onInviteParticipant || invitingParticipantIds.has(participant.odId)) return

    // Add to inviting set
    setInvitingParticipantIds(prev => new Set([...prev, participant.odId]))

    // Set a timeout as fallback to clear the inviting state after 30 seconds
    const existingTimeout = inviteTimeoutsRef.current.get(participant.odId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }
    const timeout = setTimeout(() => {
      setInvitingParticipantIds(prev => {
        const next = new Set(prev)
        next.delete(participant.odId)
        return next
      })
      inviteTimeoutsRef.current.delete(participant.odId)
    }, 30000) // 30 seconds
    inviteTimeoutsRef.current.set(participant.odId, timeout)

    try {
      onInviteParticipant(participant)
    } catch (error) {
      console.error('Failed to invite participant:', error)
      const timeout = inviteTimeoutsRef.current.get(participant.odId)
      if (timeout) {
        clearTimeout(timeout)
        inviteTimeoutsRef.current.delete(participant.odId)
      }
      setInvitingParticipantIds(prev => {
        const next = new Set(prev)
        next.delete(participant.odId)
        return next
      })
    }
  }

  // Track pending invites changes to detect when participants are added (success) or removed (declined)
  React.useEffect(() => {
    if (invitingParticipantIds.size === 0) return

    const currentPendingIds = pendingInvites ? new Set(Array.from(pendingInvites.keys())) : new Set<string>()

    invitingParticipantIds.forEach(participantId => {
      const wasInPrevious = previousPendingIdsRef.current.has(participantId)
      const isInCurrent = currentPendingIds.has(participantId)

      // Case 1: Participant just appeared in pending invites (invite accepted/ringing)
      if (!wasInPrevious && isInCurrent) {
        const timeout = inviteTimeoutsRef.current.get(participantId)
        if (timeout) {
          clearTimeout(timeout)
          inviteTimeoutsRef.current.delete(participantId)
        }
        setInvitingParticipantIds(prev => {
          const next = new Set(prev)
          next.delete(participantId)
          return next
        })
      }

      // Case 2: Participant was in pending but now removed (declined)
      if (wasInPrevious && !isInCurrent) {
        const timeout = inviteTimeoutsRef.current.get(participantId)
        if (timeout) {
          clearTimeout(timeout)
          inviteTimeoutsRef.current.delete(participantId)
        }
        setInvitingParticipantIds(prev => {
          const next = new Set(prev)
          next.delete(participantId)
          return next
        })
      }
    })

    // Update previous state
    previousPendingIdsRef.current = currentPendingIds
  }, [invitingParticipantIds, pendingInvites])

  // Cleanup timeouts on unmount
  React.useEffect(() => {
    return () => {
      inviteTimeoutsRef.current.forEach(timeout => clearTimeout(timeout))
      inviteTimeoutsRef.current.clear()
    }
  }, [])

  // Helper to check if a participant has their hand raised
  const isHandRaised = (participantId: string) => {
    if (participantId === localUserId) {
      return localHandRaised
    }
    return remoteHandsRaised[participantId] || false
  }

  // Helper to get hand raise order number
  const getHandRaiseOrderNumber = (participantId: string): number | undefined => {
    return handRaisedOrder[participantId]?.order
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

    // Sort: Active speaker first, then by history, then alphabetically
    const sortedParticipants = participants.slice().sort((a, b) => {
      const aId = a.id || a.participantId
      const bId = b.id || b.participantId

      // Local user always first
      if (aId === 'local' || a.userId === localUserId) return -1
      if (bId === 'local' || b.userId === localUserId) return 1

      // Active speaker second
      if (aId === activeSpeakerId) return -1
      if (bId === activeSpeakerId) return 1

      // Then by speaker history
      const aHistoryIndex = activeSpeakerHistory.indexOf(aId)
      const bHistoryIndex = activeSpeakerHistory.indexOf(bId)

      if (aHistoryIndex !== -1 && bHistoryIndex !== -1) {
        return aHistoryIndex - bHistoryIndex
      }
      if (aHistoryIndex !== -1) return -1
      if (bHistoryIndex !== -1) return 1

      // Finally alphabetically
      const aName = a.name || a.displayName || ''
      const bName = b.name || b.displayName || ''
      return aName.localeCompare(bName)
    })

    return sortedParticipants
  })

  // Update the persistent record with current active participants from SDK
  // This helps track participants who join and leave
  React.useEffect(() => {
    activeParticipants.forEach((p: any) => {
      // Use userId as the primary key for SDK participants
      const key = p.userId || p.customParticipantId || p.id
      if (key && !allSeenParticipantsRef.current.has(key)) {
        allSeenParticipantsRef.current.set(key, {
          id: p.userId || p.id,
          odId: p.userId || p.customParticipantId || p.id,
          odName: p.name || 'Unknown',
          lastSeen: Date.now()
        })
      }
    })
  }, [activeParticipants])

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

  // Build a unified participant list from multiple sources
  // Priority: Show SDK active participants + pending invites + conversation participants + previously seen participants

  // Track all IDs we've already added - initialized before creating entries
  const processedOdIds = new Set<string>()

  // Step 1: Create participant entries for everyone in the call (from SDK)
  const activeParticipantEntries = activeParticipants.map((participant: any) => {
    // Try to find matching conversation participant for additional info
    const conversationParticipant = availableParticipants.find(
      cp =>
        cp.odId === participant.userId ||
        cp.odId === participant.customParticipantId ||
        cp.id === participant.userId ||
        cp.odName?.toLowerCase() === participant.name?.toLowerCase()
    )

    const entry = {
      id: conversationParticipant?.id || participant.userId || participant.id,
      odId: conversationParticipant?.odId || participant.userId || participant.customParticipantId || participant.id,
      odName: conversationParticipant?.odName || participant.name || 'Unknown',
      status: 'in-call' as const,
      activeParticipant: participant,
      inviteDetails: null
    }

    // CRITICAL FIX: Mark ALL possible IDs as processed to prevent duplicates
    // Mark SDK participant IDs
    if (participant.userId) processedOdIds.add(participant.userId)
    if (participant.customParticipantId) processedOdIds.add(participant.customParticipantId)
    if (participant.id) processedOdIds.add(participant.id)

    // Mark conversation participant IDs if we found a match
    if (conversationParticipant) {
      if (conversationParticipant.odId) processedOdIds.add(conversationParticipant.odId)
      if (conversationParticipant.id) processedOdIds.add(conversationParticipant.id)
    }

    // Mark the entry's final IDs
    if (entry.odId) processedOdIds.add(entry.odId)
    if (entry.id) processedOdIds.add(entry.id)

    return entry
  })

  // Step 2: Add all pending invites (these MUST show up regardless of other lists)
  const pendingInviteEntries: any[] = []
  if (pendingInvites) {
    pendingInvites.forEach(invite => {
      // Skip if already in call
      if (processedOdIds.has(invite.odId) || processedOdIds.has(invite.id)) {
        return
      }

      const status =
        invite.status === 'declined' ? 'declined' : invite.status === 'not-answered' ? 'not-answered' : 'invited'

      pendingInviteEntries.push({
        id: invite.id,
        odId: invite.odId,
        odName: invite.odName,
        status,
        inviteDetails: invite,
        activeParticipant: null
      })

      processedOdIds.add(invite.odId)
      if (invite.id) processedOdIds.add(invite.id)
    })
  }

  // Step 3: Get conversation participants who are NOT already accounted for
  const remainingConversationParticipants = availableParticipants.filter(
    p => !processedOdIds.has(p.odId) && !processedOdIds.has(p.id)
  )

  // Step 4: Add remaining conversation participants as "available"
  const availableParticipantEntries = remainingConversationParticipants.map(p => {
    processedOdIds.add(p.odId)
    if (p.id) processedOdIds.add(p.id)

    return {
      ...p,
      status: 'available' as const,
      inviteDetails: null,
      activeParticipant: null
    }
  })

  // Step 5: Add any previously seen participants who aren't in any of the above lists
  // These are people who were in the call but left, and aren't in the conversation list
  // CRITICAL: Must check against ALL ID variants to prevent duplicates
  const previouslySeenEntries: any[] = []
  allSeenParticipantsRef.current.forEach((seenParticipant, seenKey) => {
    // Check if this participant is already processed under ANY ID
    const isAlreadyProcessed =
      processedOdIds.has(seenKey) ||
      processedOdIds.has(seenParticipant.odId) ||
      processedOdIds.has(seenParticipant.id) ||
      // Also check if they match any conversation participant by name (fallback)
      availableParticipants.some(
        cp =>
          cp.odId === seenParticipant.odId ||
          cp.id === seenParticipant.id ||
          (cp.odName && seenParticipant.odName && cp.odName.toLowerCase() === seenParticipant.odName.toLowerCase())
      )

    if (!isAlreadyProcessed) {
      previouslySeenEntries.push({
        ...seenParticipant,
        status: 'available' as const,
        inviteDetails: null,
        activeParticipant: null
      })
      processedOdIds.add(seenKey)
      if (seenParticipant.odId) processedOdIds.add(seenParticipant.odId)
      if (seenParticipant.id) processedOdIds.add(seenParticipant.id)
    }
  })

  // Step 6: Combine all participants
  const allParticipantsWithStatus = [
    ...activeParticipantEntries,
    ...pendingInviteEntries,
    ...availableParticipantEntries,
    ...previouslySeenEntries
  ]

  // Filter by search query
  const filteredAllParticipants = allParticipantsWithStatus.filter(p =>
    p.odName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Separate into sections for rendering
  const filteredActiveParticipants = filteredAllParticipants.filter(p => p.status === 'in-call')
  const filteredInvitedParticipants = filteredAllParticipants.filter(
    p => p.status === 'invited' || p.status === 'declined' || p.status === 'not-answered'
  )
  const filteredAvailableParticipants = filteredAllParticipants.filter(p => p.status === 'available')

  if (!isOpen) return null

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:overflow-hidden"
      data-testid={`${prefixDataTestId}-participants-panel`}
    >
      {/* Header */}
      <div className="gba:px-4 gba:pt-2.5 gba:pb-4 gba:border-b gba:flex-shrink-0">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
          <h3 className="gba:font-semibold gba:text-sm">{t('groupCall-participants')}</h3>
          <div className="gba:flex gba:items-center gba:gap-2">
            {onMuteAll && activeParticipants.length > 0 && (
              <button
                onClick={onMuteAll}
                className="gba:px-3 gba:py-1 gba:text-sm gba:bg-destructive-secondary gba:text-destructive-secondary-foreground hover:gba:bg-destructive gba:rounded gba:transition-colors"
                aria-label={t('participants-mute-all')}
                data-testid={`${prefixDataTestId}-mute-all-btn`}
              >
                <SpeakerXIcon className="gba:h-4 gba:w-4 gba:inline gba:mr-1" weight="fill" />
                {t('participants-mute-all')}
              </button>
            )}
            <button
              onClick={onClose}
              className="gba:p-1 hover:gba:bg-muted gba:rounded gba:transition-colors"
              aria-label={t('participants-close')}
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
            placeholder={t('chat-searchPeople')}
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
        {filteredAllParticipants.length === 0 ? (
          <div className="gba:p-8 gba:text-center">
            {searchQuery ? (
              // No search results
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-3">
                <MagnifyingGlassIcon className="gba:h-12 gba:w-12 gba:text-muted-foreground/50" weight="light" />
                <div>
                  <p className="gba:font-medium gba:text-foreground gba:mb-1">{t('participants-no-results-found')}</p>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mb-3">
                    {t('participants-try-different-search')}
                  </p>
                  <button
                    onClick={() => setSearchQuery('')}
                    className="gba:px-4 gba:py-2 gba:bg-secondary gba:text-secondary-foreground hover:gba:bg-secondary/80 gba:rounded gba:text-sm gba:font-medium gba:transition-colors"
                    data-testid={`${prefixDataTestId}-clear-search-btn`}
                  >
                    {t('participants-clear-search')}
                  </button>
                </div>
              </div>
            ) : filteredAvailableParticipants.length === 0 && filteredActiveParticipants.length > 0 ? (
              // All conversation members are in the call
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-3">
                <div className="gba:text-4xl">🎉</div>
                <div>
                  <p className="gba:font-medium gba:text-foreground gba:mb-1">{t('participants-everyones-here')}</p>
                  <p className="gba:text-sm gba:text-muted-foreground">{t('participants-all-members-in-call')}</p>
                </div>
              </div>
            ) : (
              // Generic no participants
              <p className="gba:text-muted-foreground">{t('groupCall-waitingForParticipants')}</p>
            )}
          </div>
        ) : (
          <>
            {/* Section 1: In Call */}
            {filteredActiveParticipants.length > 0 && (
              <div>
                <div className="gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:sticky gba:top-0">
                  {t('participants-in-call')} ({filteredActiveParticipants.length})
                </div>
                {filteredActiveParticipants.map(p => {
                  const participant = p.activeParticipant // This is the RTK SDK participant object
                  if (!participant) return null // Safety check

                  const isLocalUser = participant.id === meeting?.self?.id
                  // Don't highlight yourself as active speaker (industry standard)
                  const isActiveSpeakerNow = !isLocalUser && activeSpeakerId === participant.id
                  return (
                    <div
                      key={p.odId}
                      className={`gba:p-3 gba:flex gba:items-center gba:justify-between hover:gba:bg-muted/50 gba:border-b gba:transition-colors ${
                        isActiveSpeakerNow ? 'gba:bg-primary/10' : ''
                      }`}
                      data-testid={`${prefixDataTestId}-participant-active-${p.odId}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                        <Avatar
                          className={`gba:h-8 gba:w-8 gba:flex-shrink-0 ${
                            isActiveSpeakerNow ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2' : ''
                          }`}
                        >
                          {(avatarUrlMap.get(participant.userId) ||
                            avatarUrlMap.get(participant.customParticipantId) ||
                            avatarUrlMap.get(participant.id) ||
                            avatarUrlMap.get(p.odId)) && (
                            <AvatarImage
                              src={
                                avatarUrlMap.get(participant.userId) ||
                                avatarUrlMap.get(participant.customParticipantId) ||
                                avatarUrlMap.get(participant.id) ||
                                avatarUrlMap.get(p.odId)
                              }
                              alt={participant.name || p.odName || t('participants-unknown')}
                            />
                          )}
                          <AvatarFallback className="gba:text-xs">
                            {getInitials(participant.name || p.odName || t('participants-unknown'))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="gba:flex-1 gba:min-w-0">
                          <p className="gba:text-sm gba:font-medium gba:truncate">
                            {participant.name || p.odName || t('participants-unknown')}
                            {isLocalUser && ` (${t('participants-you')})`}
                            {isActiveSpeakerNow && (
                              <span className="gba:ml-2 gba:text-xs gba:text-primary gba:font-semibold">
                                {t('participants-speaking')}
                              </span>
                            )}
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
                              <VideoCameraSlashIcon
                                className="gba:h-3 gba:w-3 gba:text-muted-foreground"
                                weight="fill"
                              />
                            )}
                            {(isHandRaised(participant.userId) ||
                              isHandRaised(participant.customParticipantId) ||
                              isHandRaised(participant.id)) && (
                              <div className="gba:flex gba:items-center gba:gap-0.5">
                                <HandIcon
                                  className="gba:h-3 gba:w-3 gba:text-warning gba:animate-pulse"
                                  weight="fill"
                                />
                                <span className="gba:text-xs gba:font-bold gba:text-warning">
                                  {getHandRaiseOrderNumber(participant.userId) ||
                                    getHandRaiseOrderNumber(participant.customParticipantId) ||
                                    getHandRaiseOrderNumber(participant.id)}
                                </span>
                              </div>
                            )}
                            {participant.screenShareEnabled && (
                              <MonitorIcon className="gba:h-3 gba:w-3 gba:text-primary" weight="fill" />
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Show actions menu only for other participants (not yourself) */}
                      {!isLocalUser && onMuteParticipant && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="gba:p-1 hover:gba:bg-muted gba:rounded gba:flex-shrink-0 gba:transition-colors"
                              aria-label={t('participants-more-options')}
                              data-testid={`${prefixDataTestId}-participant-menu-${participant.id}`}
                            >
                              <DotsThreeVerticalIcon className="gba:h-4 gba:w-4" weight="bold" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                onMuteParticipant(participant.id, participant.name || t('participants-unknown'))
                              }
                              data-testid={`${prefixDataTestId}-participant-mute-${participant.id}`}
                            >
                              <SpeakerXIcon className="gba:h-4 gba:w-4 gba:mr-2" weight="fill" />
                              {t('participants-mute')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Section 2: Invited (Pending/Declined/Not Answered) */}
            {filteredInvitedParticipants.length > 0 && (
              <div>
                <div className="gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase">
                  {t('participants-invited')} ({filteredInvitedParticipants.length})
                </div>
                {filteredInvitedParticipants.map(p => {
                  const getStatusText = () => {
                    switch (p.status) {
                      case 'declined':
                        return t('participants-declined-invite')
                      case 'not-answered':
                        return t('participants-not-answered')
                      case 'invited':
                      default:
                        return t('participants-ringing')
                    }
                  }

                  const getStatusColor = () => {
                    switch (p.status) {
                      case 'declined':
                        return 'gba:text-destructive-secondary'
                      case 'not-answered':
                        return 'gba:text-warning'
                      case 'invited':
                      default:
                        return 'gba:text-muted-foreground'
                    }
                  }

                  const canReInvite = p.status === 'declined' || p.status === 'not-answered'

                  return (
                    <div
                      key={p.odId}
                      className="gba:p-3 gba:flex gba:items-center gba:justify-between hover:gba:bg-muted/50 gba:border-b gba:transition-colors"
                      data-testid={`${prefixDataTestId}-participant-invited-${p.odId}`}
                    >
                      <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                        <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0 gba:opacity-60">
                          {avatarUrlMap.get(p.odId) && (
                            <AvatarImage src={avatarUrlMap.get(p.odId)} alt={p.odName || t('participants-unknown')} />
                          )}
                          <AvatarFallback className="gba:text-xs">
                            {getInitials(p.odName || t('participants-unknown'))}
                          </AvatarFallback>
                        </Avatar>
                        <div className="gba:flex-1 gba:min-w-0">
                          <p className="gba:text-sm gba:font-medium gba:truncate gba:text-muted-foreground">
                            {p.odName || t('participants-unknown')}
                          </p>
                          <p className={`gba:text-xs ${getStatusColor()}`}>{getStatusText()}</p>
                        </div>
                      </div>
                      {canReInvite && onInviteParticipant && (
                        <button
                          onClick={() => handleInviteClick(p)}
                          disabled={invitingParticipantIds.has(p.odId)}
                          className="gba:px-3 gba:py-1.5 gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90 disabled:gba:bg-primary/60 disabled:gba:cursor-not-allowed gba:rounded gba:flex gba:items-center gba:gap-2 gba:text-xs gba:font-medium gba:transition-colors gba:flex-shrink-0"
                          aria-label={`${t('participants-invite')} ${p.odName}`}
                          data-testid={`${prefixDataTestId}-reinvite-btn-${p.odId}`}
                        >
                          {invitingParticipantIds.has(p.odId) ? (
                            <>
                              <Spinner className="gba:h-3 gba:w-3" />
                              {t('participants-inviting')}
                            </>
                          ) : (
                            <>
                              <PhoneIcon className="gba:h-3 gba:w-3" weight="fill" />
                              {t('participants-invite')}
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Section 3: Available (Not in Call) */}
            {filteredAvailableParticipants.length > 0 && (
              <div>
                <div className="gba:px-3 gba:py-2 gba:bg-muted/30 gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:sticky gba:top-0">
                  {t('participants-available')} ({filteredAvailableParticipants.length})
                </div>
                {filteredAvailableParticipants.map(p => (
                  <div
                    key={p.odId}
                    className="gba:p-3 gba:flex gba:items-center gba:justify-between hover:gba:bg-muted/50 gba:border-b gba:transition-colors"
                    data-testid={`${prefixDataTestId}-participant-available-${p.odId}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1 gba:min-w-0">
                      <Avatar className="gba:h-8 gba:w-8 gba:flex-shrink-0">
                        {avatarUrlMap.get(p.odId) && (
                          <AvatarImage src={avatarUrlMap.get(p.odId)} alt={p.odName || t('participants-unknown')} />
                        )}
                        <AvatarFallback className="gba:text-xs">
                          {getInitials(p.odName || t('participants-unknown'))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="gba:flex-1 gba:min-w-0">
                        <p className="gba:text-sm gba:font-medium gba:truncate">
                          {p.odName || t('participants-unknown')}
                        </p>
                        <p className="gba:text-xs gba:text-muted-foreground">{t('participants-available-to-invite')}</p>
                      </div>
                    </div>
                    {onInviteParticipant && (
                      <button
                        onClick={() => handleInviteClick(p)}
                        disabled={invitingParticipantIds.has(p.odId)}
                        className="gba:px-3 gba:py-1.5 gba:bg-primary gba:text-primary-foreground hover:gba:bg-primary/90 disabled:gba:bg-primary/60 disabled:gba:cursor-not-allowed gba:rounded gba:flex gba:items-center gba:gap-2 gba:text-xs gba:font-medium gba:transition-colors gba:flex-shrink-0"
                        aria-label={`${t('participants-invite')} ${p.odName}`}
                        data-testid={`${prefixDataTestId}-invite-btn-${p.odId}`}
                      >
                        {invitingParticipantIds.has(p.odId) ? (
                          <>
                            <Spinner className="gba:h-3 gba:w-3" />
                            {t('participants-inviting')}
                          </>
                        ) : (
                          <>
                            <PhoneIcon className="gba:h-3 gba:w-3" weight="fill" />
                            {t('participants-invite')}
                          </>
                        )}
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
