/**
 * GroupCallModalRtk - Modal for Realtime Kit group video/audio calls
 *
 * This component uses Cloudflare Realtime Kit SDK to render remote participants
 * and handle media streaming through SFU infrastructure.
 *
 * Phase 2: Full SDK integration with remote video/audio rendering
 */

import React from 'react'
import { createPortal } from 'react-dom'
import { MinimizedCallView } from './call'
import { useGroupCallModalRtkState } from '../hooks/useGroupCallModalRtkState'
import { NOOP } from '../utils/groupCallModalUtils'
import type { RealtimeKitPeer, GroupCallModalRtkProps } from './call/groupCallModalTypes'
import { GroupCallModalRtkFullView } from './call/GroupCallModalRtkFullView'

export type { GroupCallModalRtkProps } from './call/groupCallModalTypes'

const GroupCallModalRtkComponent: React.FC<GroupCallModalRtkProps> = props => {
  const state = useGroupCallModalRtkState(props)
  const {
    viewMode,
    callState,
    onEndCall,
    onToggleMute,
    onToggleVideo,
    onToggleMinimize,
    prefixDataTestId = 'rtk-group-call',
    hideReactionsAndHandRaise = false
  } = props

  if (state.isOpen && viewMode === 'minimized') {
    const rtkFirstPeer = state.firstRemotePeer as RealtimeKitPeer | null
    const firstRemoteStream = rtkFirstPeer ? state.buildStreamFromPeer(rtkFirstPeer) : null

    const isFirstPeerHandRaised = rtkFirstPeer
      ? state.isParticipantHandRaised(rtkFirstPeer.id, rtkFirstPeer.userId, rtkFirstPeer.customParticipantId)
      : false

    const isFirstPeerMuted = rtkFirstPeer ? !rtkFirstPeer.audioEnabled : false

    const firstPeerReactions = rtkFirstPeer
      ? state.activeReactions.filter(
          r => r.participantId === rtkFirstPeer.customParticipantId || r.participantId === rtkFirstPeer.id
        )
      : []

    // Render minimized view as portal to a dedicated container
    // Use unique instance ID to prevent conflicts when multiple chat modules are loaded
    const portalContainerId = `rtk-group-call-minimized-portal-${state.instanceId}`
    let portalContainer = document.getElementById(portalContainerId)
    if (!portalContainer) {
      portalContainer = document.createElement('div')
      portalContainer.id = portalContainerId
      portalContainer.style.cssText = 'position: fixed; z-index: 9999;'
      document.body.appendChild(portalContainer)
    }

    const firstPeerHandRaisedOrderNumber = rtkFirstPeer
      ? state.getHandRaisedOrderNumber(rtkFirstPeer.id, rtkFirstPeer.userId, rtkFirstPeer.customParticipantId)
      : undefined

    // Use a unique key based on call start time to force React to properly unmount/remount
    // when call restarts, preventing duplicate portals from multiple renders
    const portalKey = `minimized-${callState.status}-${callState.startTime || Date.now()}`

    return createPortal(
      <div key={portalKey} data-view-mode="minimized">
        <MinimizedCallView
          firstRemotePeer={rtkFirstPeer}
          firstRemoteStream={firstRemoteStream}
          remotePeerCount={state.stableRemotePeers.length}
          callStartTime={callState.startTime}
          callType={callState.callType}
          isMuted={state.effectiveLocalIsMuted}
          isVideoEnabled={state.effectiveLocalIsVideoEnabled}
          isHandRaised={hideReactionsAndHandRaise ? false : isFirstPeerHandRaised}
          handRaisedOrderNumber={hideReactionsAndHandRaise ? undefined : firstPeerHandRaisedOrderNumber}
          isRemotePeerMuted={isFirstPeerMuted}
          reactions={hideReactionsAndHandRaise ? [] : firstPeerReactions}
          onToggleMute={onToggleMute}
          onToggleVideo={onToggleVideo}
          onExpand={onToggleMinimize || NOOP}
          onEndCall={onEndCall}
          prefixDataTestId={prefixDataTestId}
          t={state.t}
        />
      </div>,
      portalContainer
    )
  }

  // Don't render if not open or minimized
  if (!state.isOpen) {
    return null
  }

  return <GroupCallModalRtkFullView props={props} state={state} />
}

// Wrap in React.memo with custom comparison to prevent re-renders when only duration changes
// Duration updates every second but doesn't affect video stream attachment
export const GroupCallModalRtk = React.memo(GroupCallModalRtkComponent, (prevProps, nextProps) => {
  // Add diagnostic logging to identify what's triggering re-renders
  const changedProps: string[] = []

  if (prevProps.localStream !== nextProps.localStream) changedProps.push('localStream')
  if (prevProps.remoteStreams !== nextProps.remoteStreams) changedProps.push('remoteStreams')
  if (prevProps.participants !== nextProps.participants) changedProps.push('participants')
  if (prevProps.pendingInvites !== nextProps.pendingInvites) changedProps.push('pendingInvites')
  if (prevProps.activeSpeakerId !== nextProps.activeSpeakerId) changedProps.push('activeSpeakerId')
  if (prevProps.activeSpeakerHistory !== nextProps.activeSpeakerHistory) changedProps.push('activeSpeakerHistory')
  if (prevProps.onEndCall !== nextProps.onEndCall) changedProps.push('onEndCall')
  if (prevProps.onToggleMute !== nextProps.onToggleMute) changedProps.push('onToggleMute')
  if (prevProps.onToggleVideo !== nextProps.onToggleVideo) changedProps.push('onToggleVideo')
  if (prevProps.onToggleScreenShare !== nextProps.onToggleScreenShare) changedProps.push('onToggleScreenShare')
  if (prevProps.onSetVideoQuality !== nextProps.onSetVideoQuality) changedProps.push('onSetVideoQuality')
  if (prevProps.onToggleMinimize !== nextProps.onToggleMinimize) changedProps.push('onToggleMinimize')
  if (prevProps.onToggleBackground !== nextProps.onToggleBackground) changedProps.push('onToggleBackground')
  if (prevProps.onToggleRnnoise !== nextProps.onToggleRnnoise) changedProps.push('onToggleRnnoise')
  if (prevProps.onToggleRaiseHand !== nextProps.onToggleRaiseHand) changedProps.push('onToggleRaiseHand')
  if (prevProps.onSendReaction !== nextProps.onSendReaction) changedProps.push('onSendReaction')
  if (prevProps.backgroundEnabled !== nextProps.backgroundEnabled) changedProps.push('backgroundEnabled')
  if (prevProps.rnnoiseEnabled !== nextProps.rnnoiseEnabled) changedProps.push('rnnoiseEnabled')
  if (prevProps.prefixDataTestId !== nextProps.prefixDataTestId) changedProps.push('prefixDataTestId')
  if (prevProps.availableParticipants !== nextProps.availableParticipants) changedProps.push('availableParticipants')
  if (prevProps.onInviteParticipant !== nextProps.onInviteParticipant) changedProps.push('onInviteParticipant')
  if (prevProps.onReconnectParticipant !== nextProps.onReconnectParticipant) changedProps.push('onReconnectParticipant')
  if (prevProps.getConnectionDiagnostics !== nextProps.getConnectionDiagnostics)
    changedProps.push('getConnectionDiagnostics')
  if (prevProps.accessToken !== nextProps.accessToken) changedProps.push('accessToken')
  if (prevProps.currentUserId !== nextProps.currentUserId) changedProps.push('currentUserId')
  if (prevProps.conversationName !== nextProps.conversationName) changedProps.push('conversationName')
  if (prevProps.wsClient !== nextProps.wsClient) changedProps.push('wsClient')

  // Check callState properties except duration
  const prevState = prevProps.callState
  const nextState = nextProps.callState

  const changedStateProps: string[] = []
  if (prevState.status !== nextState.status) changedStateProps.push('status')
  if (prevState.roomId !== nextState.roomId) changedStateProps.push('roomId')
  if (prevState.isMuted !== nextState.isMuted) changedStateProps.push('isMuted')
  if (prevState.isVideoEnabled !== nextState.isVideoEnabled) changedStateProps.push('isVideoEnabled')
  if (prevState.isScreenSharing !== nextState.isScreenSharing) changedStateProps.push('isScreenSharing')
  if (prevState.isMinimized !== nextState.isMinimized) changedStateProps.push('isMinimized')
  if (prevState.videoQuality !== nextState.videoQuality) changedStateProps.push('videoQuality')
  if (prevState.backgroundEnabled !== nextState.backgroundEnabled) changedStateProps.push('backgroundEnabled')
  if (prevState.handRaised !== nextState.handRaised) changedStateProps.push('handRaised')
  if (prevState.remoteHandsRaised !== nextState.remoteHandsRaised) changedStateProps.push('remoteHandsRaised')
  if (prevState.handRaisedOrder !== nextState.handRaisedOrder) changedStateProps.push('handRaisedOrder')
  if (prevState.participants.length !== nextState.participants.length) changedStateProps.push('participants.length')
  if (prevState.callType !== nextState.callType) changedStateProps.push('callType')
  if (prevState.callImplementation !== nextState.callImplementation) changedStateProps.push('callImplementation')

  if (changedProps.length > 0 || changedStateProps.length > 0) {
    return false // Props changed, re-render
  }

  return true // No significant changes, skip re-render
})
