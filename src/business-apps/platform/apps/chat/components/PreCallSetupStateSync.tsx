/**
 * PreCallSetupStateSync - Syncs local call state to global pre-call setup manager
 *
 * This component doesn't render anything itself. It only updates the global state
 * based on local call state. The actual dialog is rendered once by GlobalPreCallSetupDialog.
 */

import { useEffect, useState } from 'react'
import { globalPreCallSetupManager } from '../services/globalPreCallSetupManager'
import { globalCallManager } from '../services/globalCallManager'
import type { GroupCallUIState, UseGroupCallReturn } from '../services/callTypes'
import type { CallParticipant } from '../services/webrtcClient'
import type { Conversation } from '../types'

interface PreCallSetupStateSyncProps {
  groupCallState: GroupCallUIState
  realtimeKitGroupCall: UseGroupCallReturn
  activeConversation: Conversation | null
  currentUser: { id: string; username?: string } | null
  currentUserAsParticipant: CallParticipant | null
  groupParticipants: any[]
  incomingGroupCallInvite: any
}

export const PreCallSetupStateSync: React.FC<PreCallSetupStateSyncProps> = ({
  groupCallState,
  realtimeKitGroupCall,
  activeConversation,
  currentUser,
  currentUserAsParticipant,
  groupParticipants,
  incomingGroupCallInvite
}) => {
  // Unique ID per mounted Chat instance to control global pre-call state ownership
  const [instanceId] = useState(() => `precall-source-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  // Sync state to global manager whenever it changes
  useEffect(() => {
    // CRITICAL: Read hasBeenMinimized from globalCallManager to persist across remounts
    const globalCallData = globalCallManager.getCallData()

    const isSetup = groupCallState.status === 'setup'
    const isJoining = groupCallState.status === 'joining'
    // Outgoing pre-call setup should only be shown for the initiator (host).
    // Joiners should use IncomingGroupCallDialog instead.
    const isOutboundHost = !!currentUser?.id && groupCallState.hostId === currentUser.id
    // CRITICAL: For RealtimeKit calls, globalCallManager is the source of truth for minimized state
    const isMinimized =
      globalCallData.callState.callImplementation === 'realtime-kit'
        ? globalCallData.callState.isMinimized
        : groupCallState.isMinimized
    const hasIncomingInvite = !!incomingGroupCallInvite
    // CallDialog (GroupCallModalRtk) only renders when globalCallManager has realtimeKitMeeting.
    // Keep PreCallSetup visible until then so there is no frame with neither UI.
    const isCallUiReady = !!globalCallData.realtimeKitMeeting

    // Show during setup/joining, or when connected but call UI not yet ready (avoids blank frame).
    // Avoid "connected but not joined" for teardown: meeting can be undefined while status is
    // still 'connected', which could incorrectly re-open the dialog after ending a call.
    const shouldShow =
      isOutboundHost &&
      (isSetup || isJoining || (groupCallState.status === 'connected' && !isCallUiReady)) &&
      !isMinimized &&
      !hasIncomingInvite

    const currentSourceOwner = globalPreCallSetupManager.getSourceOwnerId()
    const isSourceOwner = currentSourceOwner === instanceId

    // If we should show: claim SOURCE ownership (writer lock) then publish state+callbacks.
    if (shouldShow) {
      if (!isSourceOwner) {
        const claimed = globalPreCallSetupManager.claimSourceOwner(instanceId)
        if (!claimed) {
          return
        }
      }

      // Update callbacks FIRST so the subsequent state notify causes UI to read latest callbacks
      globalPreCallSetupManager.setCallbacksFrom(
        instanceId,
        preferences => {
          if (realtimeKitGroupCall.confirmStartCall) {
            realtimeKitGroupCall.confirmStartCall(preferences)
          }
        },
        () => {
          if (realtimeKitGroupCall.cancelSetup) {
            realtimeKitGroupCall.cancelSetup()
          }
        }
      )

      // FIXED: Always show the CURRENT USER's name and avatar in pre-call setup
      // The pre-call setup is for the person STARTING the call to configure their settings
      // The conversation name/title will show who they're calling
      const userName = currentUserAsParticipant?.odName

      // FIXED: Always show the CURRENT USER's avatar
      const userAvatarUrl = currentUserAsParticipant?.avatarUrl

      // Meeting chats: metadata.type === 'meeting' or metadata.meetingId → send 'meeting' so backend shows "Meeting started/ended"
      const isMeetingConversation =
        activeConversation?.metadata?.type === 'meeting' || Boolean(activeConversation?.metadata?.meetingId)
      const conversationType: 'direct' | 'group' | 'meeting' = isMeetingConversation
        ? 'meeting'
        : ((activeConversation?.type as 'direct' | 'group' | 'meeting') ?? 'group')

      globalPreCallSetupManager.setStateFrom(instanceId, {
        isOpen: true,
        callType: groupCallState.callType,
        conversationName: activeConversation?.name,
        participantCount: groupParticipants.length,
        userName,
        userAvatarUrl,
        conversationType
      })

      return
    }

    // If we shouldn't show: only SOURCE owner is allowed to close & release.
    if (isSourceOwner) {
      // Clear callbacks FIRST, then close (close notifies UI)
      globalPreCallSetupManager.setCallbacksFrom(instanceId, null, null)
      globalPreCallSetupManager.setStateFrom(instanceId, { isOpen: false })
      globalPreCallSetupManager.releaseSourceOwner(instanceId)
    }
  }, [
    instanceId,
    groupCallState.status,
    groupCallState.callType,
    groupCallState.hostId,
    groupCallState.hasBeenMinimized,
    groupCallState.isMinimized,
    realtimeKitGroupCall.meeting,
    realtimeKitGroupCall.meeting?.self?.roomState,
    realtimeKitGroupCall.confirmStartCall,
    realtimeKitGroupCall.cancelSetup,
    activeConversation,
    currentUser?.id,
    currentUserAsParticipant,
    groupParticipants.length,
    incomingGroupCallInvite
  ])

  // Cleanup: if this instance owns SOURCE ownership, close and release to avoid stale callbacks
  useEffect(() => {
    return () => {
      if (globalPreCallSetupManager.getSourceOwnerId() === instanceId) {
        globalPreCallSetupManager.setCallbacksFrom(instanceId, null, null)
        globalPreCallSetupManager.setStateFrom(instanceId, { isOpen: false })
        globalPreCallSetupManager.releaseSourceOwner(instanceId)
      }
    }
  }, [instanceId])

  // This component doesn't render anything
  return null
}
