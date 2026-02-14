/**
 * useGroupCallModalRtkState - State and effects for GroupCallModalRtk (Realtime Kit group call UI).
 */

import { useState, useEffect, useMemo } from 'react'
import { useChatTranslation } from '../contexts/TranslationContext'
import { rtkDebug } from '../utils/rtkDebug'
import { getScreenShareTrack } from '../utils/groupCallModalUtils'
import { isVideoTrackScreenShare, extractTracksFromCollection } from '../utils/callUtils'
import type { GroupCallModalRtkProps } from '../components/call/groupCallModalTypes'
import { useGroupCallModalCallConversation } from './groupCallModal/useGroupCallModalCallConversation'
import { useGroupCallModalPeersAndMeeting } from './groupCallModal/useGroupCallModalPeersAndMeeting'
import { useGroupCallModalHandRaise } from './groupCallModal/useGroupCallModalHandRaise'
import { useGroupCallModalSidebarAndReactions } from './groupCallModal/useGroupCallModalSidebarAndReactions'
import { useGroupCallModalVideoRefs } from './groupCallModal/useGroupCallModalVideoRefs'
import { useGroupCallModalStreamAttachment } from './groupCallModal/useGroupCallModalStreamAttachment'
import { useGroupCallModalTrackAttachment } from './groupCallModal/useGroupCallModalTrackAttachment'
import { useGroupCallModalMuteHandlers } from './groupCallModal/useGroupCallModalMuteHandlers'
import { useGroupCallModalSpeakerAndExpanded } from './groupCallModal/useGroupCallModalSpeakerAndExpanded'
import { useGroupCallModalMinimized } from './groupCallModal/useGroupCallModalMinimized'

export function useGroupCallModalRtkState(props: GroupCallModalRtkProps) {
  const {
    callState,
    participants,
    activeSpeakerId,
    activeSpeakerHistory,
    onEndCall,
    onToggleMute,
    onToggleVideo,
    onToggleRaiseHand,
    onSendReaction,
    currentUserId,
    currentUser,
    callConversation: callConversationProp,
    activeConversation
  } = props

  const { instanceId, callConversation } = useGroupCallModalCallConversation(props)
  const {
    meeting,
    currentParticipant,
    globalMeetingId,
    effectiveLocalIsMuted,
    effectiveLocalIsVideoEnabled,
    localScreenShareTrack,
    effectiveLocalIsScreenSharing,
    stableRemotePeers
  } = useGroupCallModalPeersAndMeeting(props)

  const {
    effectiveLocalHandRaised,
    effectiveRemoteHandsRaised,
    effectiveHandRaisedOrder,
    isLocalUser,
    isParticipantHandRaised,
    getHandRaisedOrderNumber
  } = useGroupCallModalHandRaise(props, meeting, globalMeetingId)

  const sidebar = useGroupCallModalSidebarAndReactions(props, callConversation, meeting, stableRemotePeers)
  const {
    currentPage,
    setCurrentPage,
    sidebarView,
    setSidebarView,
    unreadChatCount,
    activeReactions,
    showReactionAnimation,
    handleToggleParticipants,
    handleToggleChat,
    handleToggleAudioSettings,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    canSelectAudioOutput,
    PARTICIPANTS_PER_PAGE
  } = sidebar

  const videoRefs = useGroupCallModalVideoRefs(props)
  const {
    localVideoRef,
    remoteVideoRefs,
    screenShareVideoRefs,
    speakerVolumeRef,
    selectedAudioOutputIdRef,
    applySinkIdToElement,
    videoElementsVersion,
    setLocalVideoRef,
    videoRefCallbacksRef,
    getVideoRefCallback,
    focusedScreenShareId,
    setFocusedScreenShareId,
    expandedScreenShare,
    setExpandedScreenShare
  } = videoRefs

  useGroupCallModalStreamAttachment(
    props,
    meeting,
    stableRemotePeers,
    effectiveLocalIsVideoEnabled,
    localVideoRef,
    remoteVideoRefs,
    videoElementsVersion
  )

  const t = useChatTranslation()

  rtkDebug.log('[RTK Modal] Remote peers count:', stableRemotePeers?.length || 0)
  rtkDebug.log('[RTK Modal] Button props:', {
    hasRaiseHandHandler: !!onToggleRaiseHand,
    hasReactionHandler: !!onSendReaction,
    handRaised: callState.handRaised
  })

  const { handleMuteParticipant, handleMuteAll } = useGroupCallModalMuteHandlers(
    props,
    meeting,
    currentParticipant,
    stableRemotePeers
  )

  // Debug helper: Expose call controls to window for console debugging
  useEffect(() => {
    if (typeof globalThis.window !== 'undefined') {
      ;(globalThis as any).rtkLeaveCall = () => {
        rtkDebug.log('[RTK Debug] Leaving call via console command')
        onEndCall()
      }
      ;(globalThis as any).rtkToggleMute = () => {
        rtkDebug.log('[RTK Debug] Toggling mute via console command')
        onToggleMute()
      }
      ;(globalThis as any).rtkToggleVideo = () => {
        rtkDebug.log('[RTK Debug] Toggling video via console command')
        onToggleVideo()
      }

      rtkDebug.log('[RTK Debug] Console helpers registered:', {
        rtkLeaveCall: '() => Leave call',
        rtkToggleMute: '() => Toggle mute',
        rtkToggleVideo: '() => Toggle video'
      })
    }

    return () => {
      // Clean up on unmount
      if (typeof globalThis.window !== 'undefined') {
        delete (globalThis as any).rtkLeaveCall
        delete (globalThis as any).rtkToggleMute
        delete (globalThis as any).rtkToggleVideo
      }
    }
  }, [onEndCall, onToggleMute, onToggleVideo])

  // Get ALL screen shares (not just one)
  const allScreenShares = useMemo(() => {
    const shares: Array<{
      peerId: string
      peerName: string
      screenShareTrack: MediaStreamTrack
      trackId: string
      peer: any
    }> = []

    const seenPeerIds = new Set<string>()

    // Find screen shares from remote peers
    stableRemotePeers?.forEach((peer: any) => {
      // Check multiple ways to detect screen share
      const screenShareTrack = getScreenShareTrack(peer)
      const hasScreenShareEnabled = peer.screenShareEnabled === true
      const extractedTracks = extractTracksFromCollection(peer.screenShareTracks)

      rtkDebug.log(`[RTK Modal] Checking peer ${peer.name || peer.id} for screen share:`, {
        peerId: peer.id,
        hasScreenShareTrack: !!screenShareTrack,
        screenShareEnabled: hasScreenShareEnabled,
        screenShareTracks: peer.screenShareTracks,
        extractedTracksCount: extractedTracks.length,
        extractedTracks: extractedTracks.map(t => ({
          id: t.id,
          label: t.label,
          kind: t.kind,
          readyState: t.readyState
        })),
        videoTrackLabel: peer.videoTrack?.label,
        videoTrackIsScreenShare: peer.videoTrack && isVideoTrackScreenShare(peer.videoTrack)
      })

      if (screenShareTrack) {
        // CRITICAL: Only include tracks that are still live (not ended/stopped)
        if (screenShareTrack.readyState !== 'live') {
          rtkDebug.warn(
            `[RTK Modal] ⚠️ Screen share track for peer ${peer.id} is not live (state: ${screenShareTrack.readyState}) - skipping`
          )
        } else if (seenPeerIds.has(peer.id)) {
          rtkDebug.warn(`[RTK Modal] ⚠️ Duplicate screen share for peer ${peer.id} - skipping`)
        } else {
          shares.push({
            peerId: peer.id,
            peerName: peer.name || peer.displayName || peer.customParticipantId || 'Unknown',
            screenShareTrack,
            trackId: screenShareTrack.id,
            peer
          })
          seenPeerIds.add(peer.id)
        }
      } else if (hasScreenShareEnabled) {
        // Screen share is enabled but track not found yet - might be initializing
        rtkDebug.warn(`[RTK Modal] Peer ${peer.name || peer.id} has screenShareEnabled=true but no track found`, {
          peerId: peer.id,
          screenShareEnabled: peer.screenShareEnabled,
          extractedTracksCount: extractedTracks.length,
          extractedTracksDetails: extractedTracks.map(t => ({
            id: t.id,
            kind: t.kind,
            readyState: t.readyState,
            label: t.label
          })),
          hasVideoTrack: !!peer.videoTrack,
          videoTrackIsScreenShare: peer.videoTrack && isVideoTrackScreenShare(peer.videoTrack),
          videoTrackReadyState: peer.videoTrack?.readyState
        })
      }
    })

    // Add local screen share if active (SDK truth)
    rtkDebug.log('[RTK Modal] 🔍 Local screen share check:', {
      isScreenSharing: effectiveLocalIsScreenSharing,
      hasTrack: !!localScreenShareTrack,
      trackReadyState: localScreenShareTrack?.readyState,
      trackId: localScreenShareTrack?.id
    })

    if (effectiveLocalIsScreenSharing && localScreenShareTrack) {
      // CRITICAL: Only include tracks that are still live (not ended/stopped)
      if (localScreenShareTrack.readyState === 'live') {
        const localPeerId = meeting?.self?.id || 'local' // Use actual peer ID
        if (seenPeerIds.has(localPeerId)) {
          rtkDebug.warn(`[RTK Modal] ⚠️ Duplicate screen share for local peer - skipping`)
        } else {
          shares.push({
            peerId: localPeerId,
            peerName: participants[0]?.odName || 'You',
            screenShareTrack: localScreenShareTrack,
            trackId: localScreenShareTrack.id,
            peer: null
          })
          seenPeerIds.add(localPeerId) // CRITICAL: Add the actual peerId, not 'local'
          rtkDebug.log('[RTK Modal] 🖥️ Added local screen share to allScreenShares:', {
            peerId: localPeerId,
            peerName: participants[0]?.odName || 'You',
            trackId: localScreenShareTrack.id
          })
        }
      } else {
        rtkDebug.warn(
          `[RTK Modal] ⚠️ Local screen share track is not live (state: ${localScreenShareTrack.readyState}) - skipping`
        )
      }
    }

    rtkDebug.log(
      `[RTK Modal] Found ${shares.length} screen shares:`,
      shares.map(s => ({
        peerId: s.peerId,
        peerName: s.peerName,
        trackId: s.trackId
      }))
    )

    return shares
  }, [stableRemotePeers, effectiveLocalIsScreenSharing, localScreenShareTrack, participants])

  // Get focused screen share (user-selected or first one)
  const focusedScreenShare = useMemo(() => {
    if (focusedScreenShareId) {
      return allScreenShares.find(s => s.peerId === focusedScreenShareId) || allScreenShares[0] || null
    }
    return allScreenShares[0] || null
  }, [allScreenShares, focusedScreenShareId])

  // Auto-focus first screen share when it appears
  useEffect(() => {
    if (allScreenShares.length > 0 && !focusedScreenShareId) {
      setFocusedScreenShareId(allScreenShares[0].peerId)
    } else if (allScreenShares.length === 0) {
      setFocusedScreenShareId(null)
    }
  }, [allScreenShares, focusedScreenShareId])

  // Build unified grid items: participants + screen shares
  const gridItems = useMemo(() => {
    // FIXED: Create mapping from userId to avatarUrl from CALL conversation participants
    // NOT from activeConversation (which changes as user navigates)
    const avatarUrlMap = new Map<string, string>()

    // Use callConversationProp (where the call was initiated) for participant avatars
    // This ensures avatars remain correct even when user navigates to other conversations
    const conversationForAvatars = callConversationProp || activeConversation

    if (conversationForAvatars?.participants) {
      conversationForAvatars.participants.forEach((cp: any) => {
        if (cp.user?.avatarUrl) {
          // Map by userId (the stable user ID in our system)
          avatarUrlMap.set(cp.userId, cp.user.avatarUrl)
          avatarUrlMap.set(cp.user.id, cp.user.avatarUrl)
          rtkDebug.log('[RTK Modal] 🖼️ Avatar from CALL conversation:', {
            conversationId: conversationForAvatars.id,
            conversationName: conversationForAvatars.name,
            isCallConversation: conversationForAvatars === callConversationProp,
            userId: cp.userId,
            userName: cp.user.displayName || cp.user.username,
            avatarUrl: cp.user.avatarUrl
          })
        }
      })
    }

    // Fallback: check participants array
    participants.forEach(p => {
      if (p.avatarUrl && !avatarUrlMap.has(p.id)) {
        avatarUrlMap.set(p.id, p.avatarUrl)
        avatarUrlMap.set(p.odId, p.avatarUrl)
      }
    })

    rtkDebug.log('[RTK Modal] 🖼️ Avatar map built for call conversation:', {
      callConversationId: callConversationProp?.id,
      activeConversationId: activeConversation?.id,
      usedConversationId: conversationForAvatars?.id,
      totalMappings: avatarUrlMap.size,
      keys: Array.from(avatarUrlMap.keys())
    })

    const items: Array<{
      id: string
      type: 'video' | 'screen-share' | 'avatar'
      peerId: string
      avatarUrl?: string
      peerName: string
      userId?: string // SDK userId - for checking hand-raised state
      customParticipantId?: string // Our DB user ID - for checking hand-raised state
      videoTrack?: MediaStreamTrack
      audioTrack?: MediaStreamTrack
      screenShareTrack?: MediaStreamTrack
      hasVideoTrack?: boolean // For render decision
      hasAudioTrack?: boolean // For render decision
      isLocal: boolean
      isMuted: boolean
      isVideoEnabled: boolean
      isFocusedScreenShare?: boolean
      isActiveSpeaker?: boolean // Active speaker highlighting
    }> = []
    const seenIds = new Set<string>()

    // Add focused screen share first (if exists) - will be larger in grid
    if (focusedScreenShare) {
      const itemId = `screen-share-${focusedScreenShare.peerId}`
      if (!seenIds.has(itemId)) {
        items.push({
          id: itemId,
          type: 'screen-share',
          peerId: focusedScreenShare.peerId,
          peerName: focusedScreenShare.peerName,
          screenShareTrack: focusedScreenShare.screenShareTrack,
          isLocal: isLocalUser(focusedScreenShare.peerId),
          isMuted: isLocalUser(focusedScreenShare.peerId) ? effectiveLocalIsMuted : false,
          isVideoEnabled: true,
          isFocusedScreenShare: true
        })
        seenIds.add(itemId)
        rtkDebug.log('[RTK Modal] 🖥️ [1] Added focused screen share to grid:', {
          itemId,
          peerId: focusedScreenShare.peerId,
          peerName: focusedScreenShare.peerName,
          trackId: focusedScreenShare.screenShareTrack.id
        })
      }
    }

    // Add local participant (video or avatar) - ALWAYS show, even when screen sharing
    // Screen share and camera video are separate and should both be visible
    // CRITICAL: Filter out screen share track - only use camera video track
    const localVideoTrack =
      meeting?.self?.videoTrack && !isVideoTrackScreenShare(meeting.self.videoTrack) ? meeting.self.videoTrack : null
    const localAudioTrack = meeting?.self?.audioTrack
    const localHasVideo = effectiveLocalIsVideoEnabled && !!localVideoTrack

    // Always add local participant - screen share is a separate item
    const localParticipantId = 'local-participant'
    if (!seenIds.has(localParticipantId)) {
      const localPeerId = meeting?.self?.id || 'local'
      const localUserId = meeting?.self?.userId || currentUserId
      const localCustomParticipantId = meeting?.self?.customParticipantId

      // Try to match avatar by userId first (most reliable)
      const localAvatarUrl =
        avatarUrlMap.get(localUserId || '') ||
        avatarUrlMap.get(localCustomParticipantId || '') ||
        avatarUrlMap.get(localPeerId) ||
        participants[0]?.avatarUrl ||
        meeting?.self?.picture

      // Get local participant name from currentUser, currentParticipant, or meeting.self
      // Don't use participants[0] in test mode as it would be the first test participant
      const localParticipantName =
        currentUser?.displayName ||
        currentUser?.username ||
        currentParticipant?.odName ||
        meeting?.self?.name ||
        meeting?.self?.odName ||
        'You'

      const localParticipantItem = {
        id: localParticipantId,
        type: localHasVideo ? 'video' : 'avatar',
        peerId: localPeerId, // Use actual peer ID from SDK (fallback to 'local' for safety)
        peerName: localParticipantName,
        avatarUrl: localAvatarUrl,
        userId: meeting?.self?.userId, // For checking hand-raised state
        customParticipantId: meeting?.self?.customParticipantId, // Our DB user ID - for checking reactions
        videoTrack: localVideoTrack,
        audioTrack: localAudioTrack,
        hasVideoTrack: localHasVideo, // For rendering decision
        hasAudioTrack: !!localAudioTrack, // Audio needs video element too!
        isLocal: true,
        isMuted: effectiveLocalIsMuted,
        isVideoEnabled: effectiveLocalIsVideoEnabled,
        // Don't highlight yourself as active speaker (industry standard UX)
        // You already know you're speaking - more useful to see who ELSE is speaking
        isActiveSpeaker: false // Could make this: activeSpeakerId === 'local' to show self-highlight
      } as const
      items.push(localParticipantItem)
      seenIds.add(localParticipantId)
      rtkDebug.log('[RTK Modal] 👤 Added local participant to items:', {
        id: localParticipantItem.id,
        type: localParticipantItem.type,
        peerId: localParticipantItem.peerId,
        isLocal: localParticipantItem.isLocal,
        hasVideo: localHasVideo,
        hasAudio: !!localAudioTrack,
        avatarUrl: localAvatarUrl,
        localUserId,
        localCustomParticipantId,
        fromMap_userId: avatarUrlMap.get(localUserId || ''),
        fromMap_customId: avatarUrlMap.get(localCustomParticipantId || ''),
        fromMap_peerId: avatarUrlMap.get(localPeerId),
        fromParticipants: participants[0]?.avatarUrl,
        fromSelf: meeting?.self?.picture
      })
    }

    // Add ALL non-focused screen shares (from allScreenShares array)
    // CRITICAL: Skip the focused one - it's already added above!
    allScreenShares.forEach((share, index) => {
      rtkDebug.log(`[RTK Modal] 🔍 Processing allScreenShares[${index}]:`, {
        peerId: share.peerId,
        peerName: share.peerName,
        trackId: share.trackId,
        isFocused: focusedScreenShare?.peerId === share.peerId,
        focusedPeerId: focusedScreenShare?.peerId
      })

      // Skip if this is the focused screen share (already added above)
      if (share.peerId === focusedScreenShare?.peerId) {
        rtkDebug.log('[RTK Modal] ⏭️ Skipping focused screen share (already added):', share.peerId)
        return
      }

      const shareId = `screen-share-${share.peerId}`
      rtkDebug.log('[RTK Modal] 🔍 Checking if shareId exists in seenIds:', {
        shareId,
        hasInSeenIds: seenIds.has(shareId),
        seenIdsArray: Array.from(seenIds)
      })
      if (seenIds.has(shareId)) {
        rtkDebug.warn('[RTK Modal] ⚠️ Skipping duplicate screen share:', shareId)
      } else {
        items.push({
          id: shareId,
          type: 'screen-share',
          peerId: share.peerId,
          peerName: share.peerName,
          screenShareTrack: share.screenShareTrack,
          isLocal: isLocalUser(share.peerId),
          isMuted: isLocalUser(share.peerId) ? effectiveLocalIsMuted : false,
          isVideoEnabled: true
        })
        seenIds.add(shareId)
        rtkDebug.log('[RTK Modal] 🖥️ [2] Added non-focused screen share to grid:', {
          shareId,
          peerId: share.peerId,
          peerName: share.peerName,
          trackId: share.trackId
        })
      }
    })

    // Add remote participants (videos or avatars) - always add, even if sharing screen
    stableRemotePeers?.forEach((peer: any) => {
      // Get camera track - exclude screen share track
      const cameraVideoTrack = peer.videoTrack && !isVideoTrackScreenShare(peer.videoTrack) ? peer.videoTrack : null
      const hasVideo = peer.videoEnabled && !!cameraVideoTrack

      const participantId = `participant-${peer.id}`
      if (seenIds.has(participantId)) {
        rtkDebug.warn('[RTK Modal] ⚠️ Skipping duplicate participant:', participantId)
      } else {
        // Try to match avatar by userId or customParticipantId
        const avatarUrl =
          avatarUrlMap.get(peer.userId) ||
          avatarUrlMap.get(peer.customParticipantId) ||
          avatarUrlMap.get(peer.id) ||
          peer.picture

        rtkDebug.log('[RTK Modal] 👥 Adding remote participant:', {
          peerId: peer.id,
          userId: peer.userId,
          customParticipantId: peer.customParticipantId,
          peerName: peer.name,
          avatarUrl,
          fromMap_userId: avatarUrlMap.get(peer.userId),
          fromMap_customId: avatarUrlMap.get(peer.customParticipantId),
          fromMap_peerId: avatarUrlMap.get(peer.id),
          peer_picture: peer.picture
        })
        items.push({
          id: participantId,
          type: hasVideo ? 'video' : 'avatar',
          peerId: peer.id,
          peerName: peer.name || peer.displayName || peer.odName || peer.customParticipantId || 'Unknown',
          avatarUrl: avatarUrl || peer.avatarUrl || peer.picture,
          userId: peer.userId, // SDK userId - for checking hand-raised state
          customParticipantId: peer.customParticipantId, // Our DB user ID - for checking hand-raised state
          videoTrack: cameraVideoTrack,
          audioTrack: peer.audioTrack,
          hasVideoTrack: hasVideo, // For rendering decision
          hasAudioTrack: !!peer.audioTrack, // Audio needs video element too!
          isLocal: false,
          isMuted: !peer.audioEnabled,
          isVideoEnabled: peer.videoEnabled || false,
          isActiveSpeaker: activeSpeakerId === peer.id // Check if this peer is active speaker
        })
        seenIds.add(participantId)
      }
    })

    rtkDebug.log(`[RTK Modal] 📋 Raw items before sorting:`, {
      totalItems: items.length,
      itemIds: items.map(i => i.id),
      duplicateIds: items.map(i => i.id).filter((id, index, arr) => arr.indexOf(id) !== index)
    })

    // Sort items: Active speaker first (after focused screen share), then by history
    const focusedScreenShareCount = focusedScreenShare ? 1 : 0
    // CRITICAL: Find local participant, NOT screen share (screen share is also isLocal=true)
    const localItem = items.find(i => i.isLocal && i.type !== 'screen-share')

    rtkDebug.log('[RTK Modal] 🔍 Looking for local participant in items:', {
      totalItems: items.length,
      itemsWithIsLocal: items.filter(i => i.isLocal).map(i => ({ id: i.id, type: i.type, isLocal: i.isLocal })),
      foundLocalItem: localItem ? { id: localItem.id, type: localItem.type } : null
    })

    const activeSpeakerItems = items
      .slice(focusedScreenShareCount)
      .filter(item => item.isActiveSpeaker && !item.isLocal && item.type !== 'screen-share')
    const historyItems = items
      .slice(focusedScreenShareCount)
      .filter(
        item =>
          !item.isActiveSpeaker &&
          !item.isLocal &&
          item.type !== 'screen-share' &&
          activeSpeakerHistory?.includes(item.peerId)
      )
      .sort((a, b) => {
        const aIndex = activeSpeakerHistory?.indexOf(a.peerId) ?? -1
        const bIndex = activeSpeakerHistory?.indexOf(b.peerId) ?? -1
        return aIndex - bIndex
      })
    const otherItems = items
      .slice(focusedScreenShareCount)
      .filter(
        item =>
          !item.isActiveSpeaker &&
          !item.isLocal &&
          item.type !== 'screen-share' &&
          !activeSpeakerHistory?.includes(item.peerId)
      )
    const screenShareItems = items.slice(focusedScreenShareCount).filter(i => i.type === 'screen-share')

    rtkDebug.log('[RTK Modal] 📊 Sorting groups:', {
      focusedScreenShareCount,
      focusedItems: items.slice(0, focusedScreenShareCount).map(i => ({ id: i.id, type: i.type })),
      localItem: localItem ? { id: localItem.id, type: localItem.type } : null,
      activeSpeakerItems: activeSpeakerItems.map(i => ({ id: i.id, type: i.type })),
      historyItems: historyItems.map(i => ({ id: i.id, type: i.type })),
      otherItems: otherItems.map(i => ({ id: i.id, type: i.type })),
      screenShareItems: screenShareItems.map(i => ({ id: i.id, type: i.type }))
    })

    // Reconstruct: focused screen share (if any) + local + active speaker + history + others + screen shares
    const sortedItems = [
      ...items.slice(0, focusedScreenShareCount), // Keep focused screen share first
      ...(localItem ? [localItem] : []),
      ...activeSpeakerItems,
      ...historyItems,
      ...otherItems,
      ...screenShareItems
    ]

    rtkDebug.log(`[RTK Modal] Grid items built:`, {
      totalItems: sortedItems.length,
      screenShares: sortedItems.filter(i => i.type === 'screen-share').length,
      screenShareItems: sortedItems
        .filter(i => i.type === 'screen-share')
        .map(i => ({
          id: i.id,
          peerId: i.peerId,
          peerName: i.peerName,
          isFocused: i.isFocusedScreenShare,
          isLocal: i.isLocal
        })),
      focusedScreenShare: focusedScreenShare?.peerId,
      allScreenSharesCount: allScreenShares.length,
      allScreenSharesPeerIds: allScreenShares.map(s => s.peerId),
      activeSpeakerId,
      activeSpeakerCount: activeSpeakerItems.length,
      handRaisedDeps: {
        localHandRaised: callState.handRaised,
        remoteHandsRaisedKeys: Object.keys(callState.remoteHandsRaised || {}),
        remoteHandsRaisedValues: callState.remoteHandsRaised,
        handRaisedOrderKeys: Object.keys(callState.handRaisedOrder || {}),
        handRaisedOrderValues: callState.handRaisedOrder
      },
      items: sortedItems.map(i => ({
        id: i.id,
        type: i.type,
        peerId: i.peerId,
        userId: i.userId, // SDK userId
        customParticipantId: i.customParticipantId, // Our DB user ID
        peerName: i.peerName,
        isFocused: i.isFocusedScreenShare,
        isActiveSpeaker: i.isActiveSpeaker,
        isLocal: i.isLocal
      })),
      duplicateCheck: {
        allIds: sortedItems.map(i => i.id),
        duplicates: sortedItems.map(i => i.id).filter((id, index, arr) => arr.indexOf(id) !== index)
      }
    })

    return sortedItems
  }, [
    focusedScreenShare,
    allScreenShares,
    stableRemotePeers, // Use stable version to prevent unnecessary recomputation
    callState.isVideoEnabled,
    callState.isMuted,
    callState.isScreenSharing,
    callState.handRaised, // Needed for rendering hand indicator on local tile
    callState.remoteHandsRaised, // Needed for rendering hand indicators on remote tiles
    callState.handRaisedOrder, // Needed for hand-raise order numbers
    participants,
    meeting?.self?.videoTrack?.id, // Only depend on track ID, not entire object
    meeting?.self?.audioTrack?.id, // Only depend on track ID, not entire object
    meeting?.self?.videoEnabled, // SDK local video state (source of truth)
    meeting?.self?.audioEnabled, // SDK local audio state (source of truth)
    meeting?.self?.screenShareEnabled, // SDK local screen share state (source of truth)
    localScreenShareTrack?.id, // local screen share track identity
    meeting?.self?.userId, // For hand-raised checks
    meeting?.self?.customParticipantId, // For reactions
    activeSpeakerId,
    activeSpeakerHistory,
    callConversationProp?.participants, // For avatar URLs from call conversation
    activeConversation?.participants, // Fallback for avatar URLs
    currentUserId // For local avatar lookup
  ])

  // Clean up stale video ref callbacks when participants leave
  useEffect(() => {
    const currentPeerIds = new Set(gridItems.map(item => item.peerId))
    const callbackPeerIds = Array.from(videoRefCallbacksRef.current.keys())

    callbackPeerIds.forEach(peerId => {
      if (!currentPeerIds.has(peerId)) {
        videoRefCallbacksRef.current.delete(peerId)
        rtkDebug.log(`[RTK Modal] 🧹 Cleaned up video ref callback for departed peer: ${peerId}`)
      }
    })
  }, [gridItems])

  // Paginate grid items
  const paginatedGridItems = useMemo(() => {
    const totalPages = Math.ceil(gridItems.length / PARTICIPANTS_PER_PAGE)
    const startIndex = currentPage * PARTICIPANTS_PER_PAGE
    const endIndex = startIndex + PARTICIPANTS_PER_PAGE
    const pageItems = gridItems.slice(startIndex, endIndex)

    rtkDebug.log('[RTK Modal] Pagination:', {
      totalItems: gridItems.length,
      totalPages,
      currentPage,
      startIndex,
      endIndex,
      pageItems: pageItems.length
    })

    return {
      items: pageItems,
      totalPages,
      totalItems: gridItems.length
    }
  }, [gridItems, currentPage, PARTICIPANTS_PER_PAGE])

  // Reset to first page if current page is out of bounds (participants left)
  useEffect(() => {
    const totalPages = Math.ceil(gridItems.length / PARTICIPANTS_PER_PAGE)
    if (currentPage >= totalPages && totalPages > 0) {
      setCurrentPage(totalPages - 1)
    }
  }, [gridItems.length, currentPage, PARTICIPANTS_PER_PAGE])

  // Calculate responsive values based on screen size
  const [responsiveConfig, setResponsiveConfig] = useState(() => {
    const width = globalThis.window.innerWidth
    return {
      sidebarWidth: width < 768 ? 280 : width < 1024 ? 320 : 360,
      minTileSize: width < 768 ? 150 : width < 1024 ? 180 : 250,
      minTileSizeWithSidebar: width < 768 ? 120 : width < 1024 ? 150 : 200,
      maxTileSize: width < 768 ? 9999 : width < 1024 ? 450 : width < 1440 ? 600 : width < 1920 ? 700 : 800
    }
  })

  // Update responsive config on window resize
  useEffect(() => {
    const handleResize = () => {
      const width = globalThis.window.innerWidth
      setResponsiveConfig({
        sidebarWidth: width < 768 ? 280 : width < 1024 ? 320 : 360,
        minTileSize: width < 768 ? 150 : width < 1024 ? 180 : 250,
        minTileSizeWithSidebar: width < 768 ? 120 : width < 1024 ? 150 : 200,
        maxTileSize: width < 768 ? 9999 : width < 1024 ? 450 : width < 1440 ? 600 : width < 1920 ? 700 : 800
      })
    }

    globalThis.window.addEventListener('resize', handleResize)
    return () => globalThis.window.removeEventListener('resize', handleResize)
  }, [])

  // Calculate minimum tile size for auto-fit grid based on panel state and screen size
  const minTileSize = useMemo(() => {
    return sidebarView !== 'closed' ? responsiveConfig.minTileSizeWithSidebar : responsiveConfig.minTileSize
  }, [sidebarView, responsiveConfig])

  // Create stable track IDs for dependency tracking
  const screenShareTrackIds = useMemo(() => {
    return gridItems
      .filter(item => item.type === 'screen-share' && item.screenShareTrack)
      .map(item => `${item.peerId}:${item.screenShareTrack!.id}`)
      .sort()
      .join('|')
  }, [gridItems])

  const videoTrackIds = useMemo(() => {
    return gridItems
      .filter(item => item.type === 'video' && item.videoTrack)
      .map(item => `${item.peerId}:${item.videoTrack!.id}`)
      .sort()
      .join('|')
  }, [gridItems])

  useGroupCallModalTrackAttachment(
    gridItems,
    currentPage,
    callState.isMinimized,
    screenShareTrackIds,
    videoTrackIds,
    localVideoRef,
    remoteVideoRefs,
    screenShareVideoRefs,
    applySinkIdToElement,
    selectedAudioOutputIdRef
  )

  const { handleSpeakerDeviceChange, expandedScreenShareVideoRef, pipAudioRefs } = useGroupCallModalSpeakerAndExpanded(
    props,
    remoteVideoRefs,
    expandedScreenShare,
    setExpandedScreenShare,
    applySinkIdToElement,
    selectedAudioOutputIdRef,
    gridItems
  )

  const { firstRemotePeer, buildStreamFromPeer } = useGroupCallModalMinimized(
    props,
    stableRemotePeers,
    meeting,
    activeConversation,
    callState.isMinimized,
    pipAudioRefs,
    applySinkIdToElement,
    selectedAudioOutputIdRef
  )

  const isOpen =
    callState.status === 'connected' || callState.status === 'joining' || callState.status === 'reconnecting'

  // Render minimized view - floating PiP-style window
  return {
    instanceId,
    callConversation,
    t,
    localVideoRef,
    remoteVideoRefs,
    screenShareVideoRefs,
    videoRefCallbacksRef,
    getVideoRefCallback,
    setLocalVideoRef,
    videoElementsVersion,
    applySinkIdToElement,
    selectedAudioOutputIdRef,
    speakerVolumeRef,
    focusedScreenShareId,
    setFocusedScreenShareId,
    expandedScreenShare,
    setExpandedScreenShare,
    meeting,
    currentParticipant,
    globalMeetingId,
    effectiveLocalIsMuted,
    effectiveLocalIsVideoEnabled,
    effectiveLocalHandRaised,
    effectiveRemoteHandsRaised,
    effectiveHandRaisedOrder,
    isLocalUser,
    isParticipantHandRaised,
    getHandRaisedOrderNumber,
    currentPage,
    setCurrentPage,
    sidebarView,
    setSidebarView,
    unreadChatCount,
    activeReactions,
    showReactionAnimation,
    handleToggleParticipants,
    handleToggleChat,
    handleToggleAudioSettings,
    audioInputDevices,
    audioOutputDevices,
    videoInputDevices,
    selectedAudioInputId,
    selectedAudioOutputId,
    selectedVideoInputId,
    setSelectedAudioInputId,
    setSelectedAudioOutputId,
    setSelectedVideoInputId,
    canSelectAudioOutput,
    stableRemotePeers,
    gridItems,
    paginatedGridItems,
    minTileSize,
    responsiveConfig,
    allScreenShares,
    focusedScreenShare,
    handleMuteParticipant,
    handleMuteAll,
    handleSpeakerDeviceChange,
    expandedScreenShareVideoRef,
    isOpen,
    firstRemotePeer,
    buildStreamFromPeer,
    effectiveLocalIsScreenSharing
  }
}

export type GroupCallModalRtkState = ReturnType<typeof useGroupCallModalRtkState>
